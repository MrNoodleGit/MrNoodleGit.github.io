/* Waking Up — Spanish translations: custom audio player */

const COLLECTIONS = {
  meditations: {
    cover: "media/waking-up/meditations-cover.png",
    tracks: Array.from({ length: 14 }, (_, i) => {
      const n = i + 1;
      const durs = [542, 674, 640, 648, 614, 628, 616, 591, 643, 762, 801, 985, 696, 669];
      return {
        es: `Día ${n}`,
        en: `Day ${n}`,
        file: `media/waking-up/meditations/dia-${n}.mp3`,
        dur: durs[i],
      };
    }),
  },
  lessons: {
    cover: "media/waking-up/lessons-cover.jpg",
    tracks: [
      ["Empieza aquí", "Start Here", 309],
      ["La lógica de la práctica", "The Logic of Practice", 441],
      ["Entrenamiento mental", "Mental Training", 396],
      ["Comienza de nuevo", "Begin Again", 224],
      ["¿Qué es la atención plena? — Fundamentos", "What Is Mindfulness — Fundamentals", 974],
      ["No medites porque te hace bien", "Don't Meditate Because It's Good for You", 433],
      ["¿Qué es el progreso en la meditación?", "What Is Progress in Meditation", 329],
      ["La cura para el aburrimiento", "The Cure for Boredom", 372],
      ["La última vez", "The Last Time", 288],
      ["Gratitud, mente y emoción", "Gratitude, Mind and Emotion", 212],
      ["El arte de no hacer nada", "The Art of Doing Nothing", 619],
      ["Atención plena y sentido", "Mindfulness and Meaning", 784],
      ["Materialismo espiritual", "Spiritual Materialism", 284],
      ["No puedes llegar allí desde aquí", "You Can't Get There From Here", 441],
    ].map(([es, en, dur], i) => ({
      es,
      en,
      dur,
      file: `media/waking-up/lessons/leccion-${i + 1}.mp3`,
    })),
  },
};

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>';
const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>';

const fmt = (s) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec === 60 ? 0 : sec).padStart(2, "0")}`;
};

const audio = document.getElementById("audio");
const player = document.getElementById("player");
const playBtn = document.getElementById("playpause");
const seek = document.getElementById("seek");
const curEl = document.getElementById("cur");
const durEl = document.getElementById("dur");
const pCover = document.getElementById("player-cover");
const pTitle = document.getElementById("player-title");
const pSub = document.getElementById("player-sub");

const flat = []; // { es, en, file, cover, btn }
let current = -1;

function buildList(key) {
  const col = COLLECTIONS[key];
  const ol = document.getElementById(key + "-list");
  col.tracks.forEach((t, i) => {
    const idx = flat.length;
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "track";
    btn.type = "button";
    btn.innerHTML =
      `<span class="track__n">${i + 1}</span>` +
      `<span class="track__title"><span class="track__es">${t.es}</span>` +
      `<span class="track__en">${t.en}</span></span>` +
      `<span class="track__dur">${fmt(t.dur)}</span>` +
      `<span class="track__icon">${PLAY_ICON}</span>`;
    btn.addEventListener("click", () => {
      if (idx === current) togglePlay();
      else play(idx);
    });
    li.appendChild(btn);
    ol.appendChild(li);
    flat.push({ es: t.es, en: t.en, file: t.file, cover: col.cover, btn });
  });
}

function play(idx) {
  const t = flat[idx];
  if (!t) return;
  if (idx !== current) {
    current = idx;
    audio.src = t.file;
    pCover.src = t.cover;
    pTitle.textContent = t.es;
    pSub.textContent = t.en;
    player.hidden = false;
    flat.forEach((f) => f.btn.classList.remove("is-current"));
    t.btn.classList.add("is-current");
  }
  audio.play().catch(() => {});
}

function togglePlay() {
  if (current < 0) return play(0);
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

playBtn.addEventListener("click", togglePlay);
document.getElementById("prev").addEventListener("click", () => play(Math.max(0, current - 1)));
document
  .getElementById("next")
  .addEventListener("click", () => play(Math.min(flat.length - 1, current + 1)));

audio.addEventListener("play", () => {
  playBtn.innerHTML = PAUSE_ICON;
  playBtn.setAttribute("aria-label", "Pause");
  if (flat[current]) flat[current].btn.classList.add("is-playing");
});
audio.addEventListener("pause", () => {
  playBtn.innerHTML = PLAY_ICON;
  playBtn.setAttribute("aria-label", "Play");
  if (flat[current]) flat[current].btn.classList.remove("is-playing");
});
audio.addEventListener("loadedmetadata", () => {
  durEl.textContent = fmt(audio.duration);
  seek.max = Math.floor(audio.duration);
});
audio.addEventListener("timeupdate", () => {
  curEl.textContent = fmt(audio.currentTime);
  if (!seek.matches(":active")) seek.value = Math.floor(audio.currentTime);
});
audio.addEventListener("ended", () => {
  if (current < flat.length - 1) play(current + 1);
});
seek.addEventListener("input", () => {
  audio.currentTime = seek.value;
});

buildList("meditations");
buildList("lessons");
