/* Ra Mour Radio — Cloudflare Worker.
 *
 * Holds the Spotify credentials (which can never live in the static site) and
 * hands the browser one small, normalised JSON answer.
 *
 * Secrets, set with `npx wrangler secret put <NAME>`:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN     (minted once by scripts/spotify-auth.mjs)
 *   HISTORY_TOKEN             (any random string of your choosing; guards
 *                              the private /history endpoint below)
 *   MOMENTS_TOKEN             (any random string of your choosing; guards
 *                              uploading a moment from the private studio)
 *
 * Also needs:
 *   - a KV namespace bound as HISTORY (see wrangler.toml) — every distinct
 *     track we see gets appended there, privately, as a listen-history log.
 *     Nothing about it is exposed on the public /now-playing response.
 *   - a KV namespace bound as MOMENTS and an R2 bucket bound as
 *     MOMENTS_AUDIO — voice recordings anchored to a track, recorded from
 *     the private studio page and shown publicly alongside that track.
 *
 * Songs only: a podcast episode is reported by Spotify as
 * currently_playing_type "episode" with a null item, so it falls through to
 * the last played *track* on its own. Paused counts as "last played" too —
 * more current than recently-played, which only logs a track once it ends.
 */

const ALLOWED_ORIGINS = new Set([
  "https://ramour.org",
  "https://www.ramour.org",
  "https://mrnoodlegit.github.io",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "http://127.0.0.1:8123",
  "http://localhost:8123",
]);

// How long the edge holds an answer. The page polls every 25s; this keeps a
// burst of visitors from turning into a burst of Spotify calls.
const EDGE_TTL = 20;

// Best-effort access-token reuse within a warm isolate. Spotify tokens last an
// hour; we retire them a minute early to stay clear of the boundary.
let cachedToken = null; // { value, expiresAt }

async function getAccessToken(env) {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

function api(path, token) {
  return fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Spotify track URLs are https://open.spotify.com/track/<id>[?...] — the id
// is the stable anchor a voice moment attaches to (titles can retag, ids don't).
function trackIdFromUrl(url) {
  const match = /\/track\/([a-zA-Z0-9]+)/.exec(url || "");
  return match ? match[1] : null;
}

// Spotify's track object -> the only fields the page actually draws.
function shapeTrack(track) {
  const covers = track.album?.images ?? [];
  // images come widest-first; the second is ~300px, plenty for a 212px block
  const image = covers[1]?.url ?? covers[0]?.url ?? null;
  const url = track.external_urls?.spotify ?? null;

  return {
    title: track.name,
    artist: (track.artists ?? []).map((a) => a.name).join(", "),
    album: track.album?.name ?? "",
    url,
    trackId: trackIdFromUrl(url),
    image,
    durationMs: track.duration_ms ?? null,
  };
}

async function lastPlayedTrack(token) {
  const res = await api("/me/player/recently-played?limit=1", token);
  if (!res.ok) return { status: "silent" };

  const data = await res.json();
  const item = data.items?.[0];
  if (!item?.track) return { status: "silent" };

  return {
    status: "recent",
    ...shapeTrack(item.track),
    progressMs: null,
    playedAt: item.played_at ?? null,
  };
}

async function nowPlaying(env) {
  const token = await getAccessToken(env);
  const res = await api("/me/player/currently-playing", token);

  // 204: nothing on any device. 202: player warming up.
  if (res.status === 204 || res.status === 202) return lastPlayedTrack(token);
  if (!res.ok) throw new Error(`currently-playing failed: ${res.status}`);

  const data = await res.json();
  const item = data.item;

  // No item, or an item that isn't a song (podcast episode, local file with no
  // track object) — fall through to the last real song.
  if (!item || item.type !== "track") return lastPlayedTrack(token);

  // Paused: still the truest answer to "what was he listening to", and fresher
  // than recently-played, which hasn't logged this track yet.
  if (!data.is_playing) {
    return { status: "recent", ...shapeTrack(item), progressMs: null, playedAt: null };
  }

  return {
    status: "playing",
    ...shapeTrack(item),
    progressMs: data.progress_ms ?? 0,
    playedAt: null,
  };
}

/* ---------- private listen history (Cloudflare KV) ---------- */

// One key per calendar day keeps any single key well under KV's size limit
// and makes "what did I listen to on X" a single get instead of a scan.
function historyDayKey(date) {
  return `history:${date.toISOString().slice(0, 10)}`;
}

function trackSignature(track) {
  return `${track.title}::${track.artist}::${track.album}`;
}

// Appends a play to today's log, but only when the track actually changed —
// otherwise every 25s poll from every open tab would log the same song over
// and over. "Last logged" is tracked in KV (not memory) since Workers
// isolates are short-lived and shouldn't be trusted to remember anything.
async function logHistory(env, track, playedAt) {
  if (!env.HISTORY) return;

  const signature = trackSignature(track);
  const last = await env.HISTORY.get("history:last");
  if (last === signature) return;

  const entry = {
    title: track.title,
    artist: track.artist,
    album: track.album,
    url: track.url,
    at: playedAt || new Date().toISOString(),
  };

  const dayKey = historyDayKey(new Date());
  const existingRaw = await env.HISTORY.get(dayKey);
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  existing.push(entry);

  await Promise.all([
    env.HISTORY.put(dayKey, JSON.stringify(existing)),
    env.HISTORY.put("history:last", signature),
  ]);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

// Not a public API: reachable only to whoever holds HISTORY_TOKEN, which
// lives solely as a Worker secret. Lists every day-log in the KV namespace.
async function handleHistory(request, env) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!env.HISTORY_TOKEN || !timingSafeEqual(token, env.HISTORY_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }

  const days = {};
  let cursor;
  do {
    const page = await env.HISTORY.list({ prefix: "history:20", cursor });
    for (const key of page.keys) {
      days[key.name] = JSON.parse((await env.HISTORY.get(key.name)) || "[]");
    }
    cursor = page.cursor;
  } while (cursor);

  return new Response(JSON.stringify(days, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ---------- moments: short voice recordings anchored to a track ---------- */
//
// Not synced to what a visitor hears — the site can't broadcast Spotify's
// audio — so a moment is stored against the track's id, not a point in time.
// It surfaces later, on the band, wherever that track comes back around.

function momentsListKey(trackId) {
  return `track:${trackId}`;
}

async function getMomentsList(env, trackId) {
  const raw = await env.MOMENTS.get(momentsListKey(trackId));
  return raw ? JSON.parse(raw) : [];
}

async function handleMomentsGet(request, env, cors) {
  if (!env.MOMENTS) {
    return new Response(JSON.stringify({ moments: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const trackId = new URL(request.url).searchParams.get("track") || "";
  const stored = trackId ? await getMomentsList(env, trackId) : [];

  const moments = stored
    .map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      durationSec: m.durationSec ?? null,
      caption: m.caption || "",
      audioUrl: `/moment-audio/${m.id}`,
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return new Response(JSON.stringify({ moments }), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=20" },
  });
}

// Not a public API: reachable only to whoever holds MOMENTS_TOKEN, entered
// once in the private studio page and sent as a bearer token.
function checkMomentsAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return Boolean(env.MOMENTS_TOKEN) && timingSafeEqual(token, env.MOMENTS_TOKEN);
}

async function handleMomentsPost(request, env, cors) {
  if (!checkMomentsAuth(request, env)) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }
  if (!env.MOMENTS || !env.MOMENTS_AUDIO) {
    return new Response("Not configured", { status: 501, headers: cors });
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const trackId = String(form.get("trackId") || "").trim();
  if (!(audio instanceof File) || !trackId) {
    return new Response("Missing audio or trackId", { status: 400, headers: cors });
  }

  const id = crypto.randomUUID();
  const contentType = audio.type || "application/octet-stream";
  await env.MOMENTS_AUDIO.put(id, await audio.arrayBuffer(), { httpMetadata: { contentType } });

  const entry = {
    id,
    createdAt: new Date().toISOString(),
    durationSec: Number(form.get("durationSec")) || null,
    caption: String(form.get("caption") || "").slice(0, 500),
    title: String(form.get("title") || "").slice(0, 200),
    artist: String(form.get("artist") || "").slice(0, 200),
    album: String(form.get("album") || "").slice(0, 200),
  };

  const list = await getMomentsList(env, trackId);
  list.push(entry);
  await env.MOMENTS.put(momentsListKey(trackId), JSON.stringify(list));

  return new Response(JSON.stringify({ id, audioUrl: `/moment-audio/${id}` }), {
    status: 201,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function handleMomentAudio(id, env, cors) {
  if (!env.MOMENTS_AUDIO) return new Response("Not found", { status: 404, headers: cors });

  const object = await env.MOMENTS_AUDIO.get(id);
  if (!object) return new Response("Not found", { status: 404, headers: cors });

  return new Response(object.body, {
    headers: {
      ...cors,
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      // recordings are immutable once saved — safe to cache forever
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function corsHeaders(origin) {
  const headers = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/moments") {
      if (request.method === "GET") return handleMomentsGet(request, env, cors);
      if (request.method === "POST") return handleMomentsPost(request, env, cors);
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    if (url.pathname.startsWith("/moment-audio/")) {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });
      return handleMomentAudio(url.pathname.slice("/moment-audio/".length), env, cors);
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    if (url.pathname === "/history") return handleHistory(request, env);

    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });

    const hit = await cache.match(cacheKey);
    if (hit) {
      const res = new Response(hit.body, hit);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    }

    let payload;
    try {
      payload = await nowPlaying(env);
    } catch (err) {
      // Spotify is down, or the refresh token was revoked. The page treats any
      // non-200 as "no signal" and hides itself, which is the right silence.
      return new Response(JSON.stringify({ status: "error" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (payload.status === "playing" || payload.status === "recent") {
      ctx.waitUntil(logHistory(env, payload, payload.playedAt));
    }

    const body = JSON.stringify(payload);
    const cacheable = new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${EDGE_TTL}`,
      },
    });

    ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));

    const res = new Response(body, cacheable);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};
