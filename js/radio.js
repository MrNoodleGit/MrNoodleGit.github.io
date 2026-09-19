/* Ra Mour Radio — live "what I'm listening to" band on the Music page.
   Reads the Worker in worker/now-playing.js, which holds the Spotify
   credentials the static site can't. Songs only; when nothing is playing it
   shows the last played track instead.

   Wrapped in an IIFE so nothing here collides with js/music.js, which shares
   the same global scope on this page. */

(() => {
  // Set this to your deployed Worker URL, e.g.
  // "https://ra-mour-radio.ramour.workers.dev". Until it's set the radio
  // stays hidden and the page looks exactly as it did before.
  const ENDPOINT = "https://ra-mour-radio.ronald1andres2.workers.dev";

  const POLL_MS = 25000; // how often we ask the Worker
  const TICK_MS = 500; // how often the local clock advances the bar
  const BAR_COUNT = 40;
  const CACHE_KEY = "ra-mour-radio-last-track";

  // Remembers the last song we successfully drew, across page loads, so a
  // visitor who lands while the Worker/Spotify is down still sees something
  // instead of a blank spot.
  function saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Private browsing, storage full, etc. — not worth failing over.
    }
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const section = document.getElementById("radio");
  if (!section || ENDPOINT.startsWith("REPLACE_")) return;

  const els = {
    backdrop: document.getElementById("radio-backdrop"),
    art: document.getElementById("radio-art"),
    status: document.getElementById("radio-status"),
    title: document.getElementById("radio-title"),
    artist: document.getElementById("radio-artist"),
    album: document.getElementById("radio-album"),
    wave: document.getElementById("radio-wave"),
    time: document.getElementById("radio-time"),
    link: document.getElementById("radio-link"),
  };

  let bars = [];
  let currentUrl = null; // the track we're drawing, so we know when it changes
  let shown = false; // once real data has landed, never yank it away
  let pollTimer = null;
  let tickTimer = null;
  let inFlight = false;
  let lastEndRefresh = 0; // rate-limits the "track should be over" refetch

  const state = { playing: false, durationMs: 0, progressMs: 0, fetchedAt: 0 };

  /* ---------- small helpers ---------- */

  const fmt = (ms) => {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };

  // "about 3 hours ago" — deliberately vague; the exact second isn't the point
  function relTime(iso) {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return "";

    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 2) return "a moment ago";
    if (mins < 60) return `${mins} minutes ago`;

    const hours = Math.round(mins / 60);
    if (hours < 24) return hours === 1 ? "about an hour ago" : `about ${hours} hours ago`;

    const days = Math.round(hours / 24);
    return days === 1 ? "yesterday" : `${days} days ago`;
  }

  // Each song gets its own waveform, derived from its URL so it's stable
  // across polls and reloads instead of reshuffling under you.
  function seededHeights(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    let seed = h >>> 0;

    const next = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return Array.from({ length: BAR_COUNT }, () => 6 + Math.round(next() * 34));
  }

  function buildWave(key) {
    els.wave.textContent = "";
    bars = seededHeights(key).map((height) => {
      const bar = document.createElement("span");
      bar.className = "radio__bar";
      bar.style.height = `${height}px`;
      els.wave.appendChild(bar);
      return bar;
    });
  }

  function litBars(fraction) {
    const lit = Math.round(fraction * bars.length);
    bars.forEach((bar, i) => bar.classList.toggle("is-lit", i < lit));
  }

  /* ---------- the running clock between polls ---------- */

  function elapsed() {
    return state.progressMs + (Date.now() - state.fetchedAt);
  }

  function tick() {
    if (!state.playing || !state.durationMs) return;

    const at = elapsed();

    // The track should be over — ask the Worker what's on now rather than
    // sitting on a bar pinned at 100%. Rate-limited, so a track that reports
    // itself stuck at its own duration can't turn this into a 2/second poll.
    if (at >= state.durationMs) {
      litBars(1);
      els.time.textContent = `${fmt(state.durationMs)} / ${fmt(state.durationMs)}`;
      if (Date.now() - lastEndRefresh > 5000) {
        lastEndRefresh = Date.now();
        refresh();
      }
      return;
    }

    litBars(at / state.durationMs);
    els.time.textContent = `${fmt(at)} / ${fmt(state.durationMs)}`;
  }

  /* ---------- drawing ---------- */

  function render(data) {
    const live = data.status === "playing";

    if (data.url !== currentUrl) {
      currentUrl = data.url;
      buildWave(data.url || data.title || "radio");

      if (data.image) {
        els.art.src = data.image;
        els.art.alt = data.album ? `${data.album} cover art` : "Album cover art";
        els.backdrop.src = data.image;
      }
    }

    els.title.textContent = data.title;
    els.artist.textContent = data.artist;
    els.album.textContent = data.album || "";
    els.status.textContent = live ? "On air" : "Last played";

    if (data.url) {
      els.link.href = data.url;
      els.link.hidden = false;
      els.link.textContent = live ? "Listen along" : "Open in Spotify";
    } else {
      els.link.hidden = true;
    }

    section.classList.toggle("is-playing", live);
    section.classList.toggle("is-recent", !live);

    state.playing = live;
    state.durationMs = data.durationMs || 0;
    state.progressMs = data.progressMs || 0;
    state.fetchedAt = Date.now();

    if (live) {
      tick();
    } else {
      litBars(0);
      els.time.textContent = "";
    }

    section.hidden = false;
    shown = true;
    saveCache(data);
  }

  // A cached track is always stale by definition — show it as "last played"
  // and skip the live progress bar, whatever status it was saved under.
  function renderFromCache() {
    const cached = loadCache();
    if (!cached) return false;
    render({ ...cached, status: "recent" });
    return true;
  }

  /* ---------- talking to the Worker ---------- */

  async function refresh() {
    if (inFlight || document.hidden) return;
    inFlight = true;

    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));

      const data = await res.json();
      if (data.status === "playing" || data.status === "recent") render(data);
      else if (!shown && !renderFromCache()) section.hidden = true;
    } catch {
      // Spotify unreachable, Worker down, endpoint wrong. If the band was
      // never shown, fall back to the last cached track rather than stay
      // silent; if it was already shown, leave the last good song up rather
      // than blinking out under someone reading it.
      if (!shown && !renderFromCache()) section.hidden = true;
    } finally {
      inFlight = false;
    }
  }

  function start() {
    stop();
    pollTimer = setInterval(refresh, POLL_MS);
    tickTimer = setInterval(tick, TICK_MS);
  }

  function stop() {
    clearInterval(pollTimer);
    clearInterval(tickTimer);
  }

  // A backgrounded tab shouldn't keep polling; coming back should be instant.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      refresh();
      start();
    }
  });

  refresh();
  start();
})();
