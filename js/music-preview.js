// Waking Up preview player on music.html. The audio file is already trimmed to
// 1:45, but LIMIT is enforced here too so a longer file can't leak past it.
(function () {
  const root = document.getElementById("wu-preview");
  if (!root) return;

  const LIMIT = 105; // seconds
  const audio = root.querySelector("audio");
  const vol = root.querySelector(".wu-preview__vol");
  const bar = root.querySelector(".wu-preview__bar");
  const play = root.querySelector(".wu-preview__play");
  const elapsed = root.querySelector(".wu-preview__elapsed");
  const remain = root.querySelector(".wu-preview__remain");

  const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };

  const fill = (el, pct) => el.style.setProperty("--fill", pct + "%");

  function render() {
    const t = Math.min(audio.currentTime, LIMIT);
    bar.value = t;
    fill(bar, (t / LIMIT) * 100);
    elapsed.textContent = fmt(t);
    remain.textContent = "- " + fmt(LIMIT - t);
  }

  function seek(t) {
    audio.currentTime = Math.min(Math.max(t, 0), LIMIT);
    render();
  }

  function toggle() {
    if (audio.paused) {
      if (audio.currentTime >= LIMIT) audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function finish() {
    audio.pause();
    audio.currentTime = LIMIT;
    render();
  }

  // Load the small clip into memory and play from a blob: URL. Seeking
  // (scrub, ±15s) then works on any server, even ones without byte-range support.
  fetch(audio.src)
    .then((r) => r.blob())
    .then((b) => {
      const t = audio.currentTime, was = !audio.paused;
      audio.src = URL.createObjectURL(b);
      audio.currentTime = t;
      if (was) audio.play().catch(() => {});
    })
    .catch(() => {});

  vol.addEventListener("input", () => {
    audio.volume = Number(vol.value);
    fill(vol, vol.value * 100);
  });
  fill(vol, 100);

  bar.max = LIMIT;
  render();

  play.addEventListener("click", toggle);
  root.querySelector(".wu-preview__back").addEventListener("click", () => seek(audio.currentTime - 15));
  root.querySelector(".wu-preview__fwd").addEventListener("click", () => seek(audio.currentTime + 15));
  bar.addEventListener("input", () => seek(Number(bar.value)));

  audio.addEventListener("play", () => { play.innerHTML = PAUSE; play.setAttribute("aria-label", "Pause preview"); });
  audio.addEventListener("pause", () => { play.innerHTML = PLAY; play.setAttribute("aria-label", "Play preview"); });
  audio.addEventListener("timeupdate", () => {
    if (audio.currentTime >= LIMIT) finish();
    else render();
  });
  audio.addEventListener("ended", finish);
})();
