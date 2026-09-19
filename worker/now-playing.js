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
 *
 * Also needs a KV namespace bound as HISTORY (see wrangler.toml) — every
 * distinct track we see gets appended there, privately, as a listen-history
 * log. Nothing about it is exposed on the public /now-playing response. The
 * same namespace holds a `last-live` key: the last track actually seen
 * playing, kept fresh by a 1-minute cron (see `scheduled` below) so "last
 * played" can't go stale for hours between visits.
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

// Spotify's track object -> the only fields the page actually draws.
function shapeTrack(track) {
  const covers = track.album?.images ?? [];
  // images come widest-first; the second is ~300px, plenty for a 212px block
  const image = covers[1]?.url ?? covers[0]?.url ?? null;

  return {
    title: track.name,
    artist: (track.artists ?? []).map((a) => a.name).join(", "),
    album: track.album?.name ?? "",
    url: track.external_urls?.spotify ?? null,
    image,
    durationMs: track.duration_ms ?? null,
  };
}

// The last track we actually saw playing live, remembered in KV. Preferred
// over Spotify's recently-played, which skips short plays, hides private
// sessions and can lag by hours — so it can keep naming an old song.
const LAST_LIVE_KEY = "last-live";

async function readLastLive(env) {
  if (!env.HISTORY) return null;
  try {
    return await env.HISTORY.get(LAST_LIVE_KEY, "json");
  } catch {
    return null;
  }
}

// Only writes when the track changed: KV writes are limited (~1,000/day on
// the free plan), and every poll from every open tab, plus the cron, lands
// here while a song plays.
async function saveLastLive(env, track) {
  if (!env.HISTORY) return;

  const last = await readLastLive(env);
  if (last && trackSignature(last) === trackSignature(track)) return;

  const { title, artist, album, url, image, durationMs } = track;
  await env.HISTORY.put(LAST_LIVE_KEY, JSON.stringify({ title, artist, album, url, image, durationMs }));
}

// Shared by the web path (which already has the currently-playing response)
// and the 1-minute cron (which has to fetch it itself). Fetches
// currently-playing and remembers it in `last-live` if a real song is
// actively playing and it differs from what's already stored. Silent no-op
// when paused, on a podcast, or when nothing is playing.
async function captureLive(env) {
  if (!env.HISTORY) return;

  try {
    const token = await getAccessToken(env);
    const res = await api("/me/player/currently-playing", token);
    if (res.status === 204 || res.status === 202 || !res.ok) return;

    const data = await res.json();
    const item = data.item;
    if (!item || item.type !== "track" || !data.is_playing) return;

    await saveLastLive(env, shapeTrack(item));
  } catch {
    // Best effort — the next cron tick or page poll tries again.
  }
}

async function lastPlayedTrack(env, token) {
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

// Nothing is actively playing (silent, a podcast, or paused): the last track
// actually seen live is a truer answer than Spotify's recently-played, which
// only logs a track once it ends and can lag by hours. Fall back to
// recently-played only when we've never captured a live track.
async function recentOrLastPlayed(env, token) {
  const live = await readLastLive(env);
  if (live) return { status: "recent", ...live, progressMs: null };
  return lastPlayedTrack(env, token);
}

async function nowPlaying(env) {
  const token = await getAccessToken(env);
  const res = await api("/me/player/currently-playing", token);

  // 204: nothing on any device. 202: player warming up.
  if (res.status === 204 || res.status === 202) return recentOrLastPlayed(env, token);
  if (!res.ok) throw new Error(`currently-playing failed: ${res.status}`);

  const data = await res.json();
  const item = data.item;

  // No item, an item that isn't a song (podcast episode, local file with no
  // track object), or paused — fall through to the last live/recent song.
  if (!item || item.type !== "track" || !data.is_playing) {
    return recentOrLastPlayed(env, token);
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

function corsHeaders(origin) {
  const headers = { Vary: "Origin" };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export default {
  // Runs every minute (see [triggers] in wrangler.toml) so `last-live` stays
  // fresh even when nobody's polling the Music page.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(captureLive(env));
  },

  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS" },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const url = new URL(request.url);
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
    if (payload.status === "playing") ctx.waitUntil(saveLastLive(env, payload));

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
