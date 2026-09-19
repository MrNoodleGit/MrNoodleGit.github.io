/* Ra Mour Moment Player — a small audio player styled like the band's own
   waveform, standing in everywhere a moment gets played back (the studio's
   preview, its "already recorded" list, and the public band) instead of
   the browser's default <audio> chrome, which doesn't match the room.

   Shared by js/radio.js and js/studio.js, both plain scripts with no
   bundler, hence the single global rather than an ES module. Named apart
   from js/player.js, which is an unrelated player for the Waking Up page. */

window.RaMourPlayer = (() => {
  const BAR_COUNT = 28;

  // Same tiny seeded PRNG as js/radio.js's waveform, so a player's bars are
  // stable across renders instead of reshuffling — not a real waveform,
  // just a consistent decoration keyed to whatever it's playing.
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

    return Array.from({ length: BAR_COUNT }, () => 4 + Math.round(next() * 20));
  }

  const fmt = (sec) => {
    const total = Math.max(0, Math.round(sec || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };

  // container gets exactly one player appended to it; call this again on a
  // fresh container (or clear it first) to swap what's playing.
  function create(container, src, seedKey) {
    const audio = new Audio(src);
    audio.preload = "metadata";

    const el = document.createElement("div");
    el.className = "player";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "player__btn";
    btn.textContent = "▶";
    btn.setAttribute("aria-label", "Play");

    const wave = document.createElement("div");
    wave.className = "player__wave";
    const bars = seededHeights(seedKey || src).map((height) => {
      const bar = document.createElement("span");
      bar.className = "player__bar";
      bar.style.height = `${height}px`;
      wave.appendChild(bar);
      return bar;
    });

    const time = document.createElement("span");
    time.className = "player__time";
    time.textContent = "0:00";

    el.append(btn, wave, time);
    container.appendChild(el);

    function litBars(fraction) {
      const lit = Math.round(fraction * bars.length);
      bars.forEach((bar, i) => bar.classList.toggle("is-lit", i < lit));
    }

    function updateTime() {
      const dur = audio.duration;
      const known = Number.isFinite(dur) && dur > 0;
      time.textContent = known ? `${fmt(audio.currentTime)} / ${fmt(dur)}` : fmt(audio.currentTime);
      litBars(known ? audio.currentTime / dur : 0);
    }

    btn.addEventListener("click", () => {
      if (audio.paused) audio.play();
      else audio.pause();
    });

    audio.addEventListener("play", () => {
      btn.textContent = "⏸";
      btn.setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", () => {
      btn.textContent = "▶";
      btn.setAttribute("aria-label", "Play");
    });
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateTime);
    audio.addEventListener("ended", () => litBars(0));

    wave.addEventListener("click", (e) => {
      if (!Number.isFinite(audio.duration)) return;
      const rect = wave.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      audio.currentTime = fraction * audio.duration;
    });

    return { audio, element: el };
  }

  return { create };
})();
