/* Ra Mour Radio — Cloudflare Worker.
 *
 * Holds the Spotify credentials (which can never live in the static site) and
 * hands the browser one small, normalised JSON answer.
 *
 * Secrets, set with `npx wrangler secret put <NAME>`:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN     (minted once by scripts/spotify-auth.mjs)
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
        headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS" },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

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
