/* Ra Mour Studio — private page for recording a "moment": a short voice
   clip anchored to a track, not to a point in time (the site can't
   broadcast the Spotify audio, so nothing here is ever in sync with what a
   visitor hears — this attaches instead to *which track*, permanently).

   Talks to the same Worker as js/radio.js, plus two endpoints only this
   page uses: POST /moments (guarded by a token) and its GET/list sibling. */

(() => {
  const ENDPOINT = "https://ra-mour-radio.ronald1andres2.workers.dev";
  const TOKEN_KEY = "ra-mour-studio-token";

  const els = {
    gate: document.getElementById("studio-gate"),
    gateNote: document.getElementById("studio-gate-note"),
    tokenInput: document.getElementById("studio-token-input"),
    unlock: document.getElementById("studio-unlock"),

    main: document.getElementById("studio-main"),
    title: document.getElementById("studio-title"),
    artist: document.getElementById("studio-artist"),
    album: document.getElementById("studio-album"),
    trackUrl: document.getElementById("studio-track-url"),
    refresh: document.getElementById("studio-refresh"),
    anchorStatus: document.getElementById("studio-anchor-status"),

    record: document.getElementById("studio-record"),
    timer: document.getElementById("studio-timer"),
    preview: document.getElementById("studio-preview"),
    audio: document.getElementById("studio-audio"),
    caption: document.getElementById("studio-caption"),
    save: document.getElementById("studio-save"),
    discard: document.getElementById("studio-discard"),
    recordStatus: document.getElementById("studio-record-status"),

    momentsList: document.getElementById("studio-moments"),
    momentsEmpty: document.getElementById("studio-moments-empty"),
  };

  let token = localStorage.getItem(TOKEN_KEY) || "";

  let mediaStream = null;
  let recorder = null;
  let chunks = [];
  let recordedBlob = null;
  let startedAt = 0;
  let timerId = null;

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  function slugify(s) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function trackIdFromUrl(url) {
    const match = /\/track\/([a-zA-Z0-9]+)/.exec(url || "");
    return match ? match[1] : null;
  }

  // The Spotify id is the real anchor when we have it; otherwise fall back
  // to a stable slug of title+artist so a hand-entered track still anchors
  // consistently across separate recordings.
  function currentAnchorId() {
    const fromUrl = trackIdFromUrl(els.trackUrl.value);
    if (fromUrl) return fromUrl;

    const t = els.title.value.trim();
    const a = els.artist.value.trim();
    return t ? `manual:${slugify(`${t}-${a}`)}` : "";
  }

  /* ---------- gate ---------- */

  function showGate(message) {
    els.gate.hidden = false;
    els.main.hidden = true;
    els.gateNote.textContent = message || "";
  }

  function showMain() {
    els.gate.hidden = true;
    els.main.hidden = false;
  }

  els.unlock.addEventListener("click", () => {
    const value = els.tokenInput.value.trim();
    if (!value) return;
    token = value;
    localStorage.setItem(TOKEN_KEY, token);
    showMain();
    loadNowPlaying();
  });

  els.tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.unlock.click();
  });

  /* ---------- anchor: prefill from what's currently on the band ---------- */

  async function loadNowPlaying() {
    els.anchorStatus.textContent = "Loading now playing…";
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      const data = await res.json();
      if (data.status !== "playing" && data.status !== "recent") {
        els.anchorStatus.textContent = "Nothing playing — fill in the track by hand.";
        return;
      }

      els.title.value = data.title || "";
      els.artist.value = data.artist || "";
      els.album.value = data.album || "";
      els.trackUrl.value = data.url || "";
      els.anchorStatus.textContent =
        data.status === "playing" ? "Loaded from what's on air now." : "Loaded from the last played track.";
      loadExistingMoments();
    } catch {
      els.anchorStatus.textContent = "Couldn't reach the radio — fill in the track by hand.";
    }
  }

  els.refresh.addEventListener("click", loadNowPlaying);
  [els.title, els.artist, els.trackUrl].forEach((el) =>
    el.addEventListener("change", loadExistingMoments)
  );

  /* ---------- existing moments for whatever's currently anchored ---------- */

  async function loadExistingMoments() {
    const trackId = currentAnchorId();
    els.momentsList.textContent = "";
    els.momentsEmpty.hidden = true;

    if (!trackId) return;

    try {
      const res = await fetch(`${ENDPOINT}/moments?track=${encodeURIComponent(trackId)}`);
      const data = await res.json();
      const moments = data.moments || [];

      if (!moments.length) {
        els.momentsEmpty.hidden = false;
        return;
      }

      for (const m of moments) {
        const li = document.createElement("li");

        const meta = document.createElement("p");
        meta.className = "studio-moments__meta";
        const when = new Date(m.createdAt).toLocaleString();
        meta.textContent = m.durationSec ? `${when} · ${fmt(m.durationSec)}` : when;
        li.appendChild(meta);

        if (m.caption) {
          const cap = document.createElement("p");
          cap.textContent = m.caption;
          li.appendChild(cap);
        }

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = `${ENDPOINT}${m.audioUrl}`;
        li.appendChild(audio);

        els.momentsList.appendChild(li);
      }
    } catch {
      // Not worth surfacing — the recorder above still works either way.
    }
  }

  /* ---------- recording ---------- */

  function pickMimeType() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
  }

  function updateTimer() {
    els.timer.textContent = fmt(Math.floor((Date.now() - startedAt) / 1000));
  }

  async function startRecording() {
    els.recordStatus.textContent = "";
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      els.recordStatus.textContent = "Microphone access denied or unavailable.";
      return;
    }

    const mimeType = pickMimeType();
    recorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
    chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      recordedBlob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      els.audio.src = URL.createObjectURL(recordedBlob);
      els.preview.hidden = false;
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    };

    recorder.start();
    startedAt = Date.now();
    timerId = setInterval(updateTimer, 500);
    updateTimer();

    els.record.textContent = "Stop";
    els.record.classList.add("is-recording");
    els.preview.hidden = true;
  }

  function stopRecording() {
    clearInterval(timerId);
    recorder?.stop();
    els.record.textContent = "Record";
    els.record.classList.remove("is-recording");
  }

  els.record.addEventListener("click", () => {
    if (recorder && recorder.state === "recording") stopRecording();
    else startRecording();
  });

  els.discard.addEventListener("click", () => {
    recordedBlob = null;
    els.audio.removeAttribute("src");
    els.caption.value = "";
    els.preview.hidden = true;
    els.timer.textContent = "0:00";
  });

  els.save.addEventListener("click", async () => {
    const trackId = currentAnchorId();
    if (!trackId) {
      els.recordStatus.textContent = "Fill in a title (or a Spotify link) before saving.";
      return;
    }
    if (!recordedBlob) return;

    els.save.disabled = true;
    els.recordStatus.textContent = "Saving…";

    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    const form = new FormData();
    form.append("audio", recordedBlob, "moment");
    form.append("trackId", trackId);
    form.append("title", els.title.value.trim());
    form.append("artist", els.artist.value.trim());
    form.append("album", els.album.value.trim());
    form.append("caption", els.caption.value.trim());
    form.append("durationSec", String(durationSec));

    try {
      const res = await fetch(`${ENDPOINT}/moments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        showGate("That token was rejected — try again.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));

      els.recordStatus.textContent = "Saved.";
      els.discard.click();
      loadExistingMoments();
    } catch {
      els.recordStatus.textContent = "Couldn't save — check your connection and try again.";
    } finally {
      els.save.disabled = false;
    }
  });

  /* ---------- boot ---------- */

  if (token) {
    showMain();
    loadNowPlaying();
  } else {
    showGate();
  }
})();
