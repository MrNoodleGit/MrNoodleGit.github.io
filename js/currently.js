/* Ra Mour — "Currently:" line in the hero.
   Picks today's activity from js/currently-data.js and "breaks the cipher":
   yesterday's activity is encrypted into shifting glyphs, the rotors churn,
   and today's letters lock in one by one in random order. */

(function () {
  const line = document.getElementById("currently");
  if (!line || typeof CURRENTLY === "undefined" || !CURRENTLY.length) return;

  const trigger = line.querySelector(".currently__activity");
  const textEl = line.querySelector(".currently__text");
  const titleEl = document.getElementById("currently-modal-title");
  const aboutEl = document.getElementById("currently-modal-about");
  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Greek, Latin capitals, digits, and a few alchemical marks — all present in
  // the site fonts or common system fonts, so no tofu boxes mid-animation
  const GLYPHS = "ΑΒΓΔΘΛΞΠΣΦΨΩABCDEFGHKMNRSTVXZ0123456789∴∵†‡§¶✦☉☽⊕⊗";
  const DAY = 86400000;

  function dayNumber(date) {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
  }

  const [sy, sm, sd] = CURRENTLY_START.split("-").map(Number);
  const startDay = dayNumber(new Date(sy, sm - 1, sd));

  function activityFor(date) {
    const n = CURRENTLY.length;
    const i = (((dayNumber(date) - startDay) % n) + n) % n;
    return CURRENTLY[i];
  }

  function glyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  function escape(ch) {
    return ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch;
  }

  function setActivity(activity) {
    trigger.setAttribute("aria-label", `${activity.title} — read more`);
    titleEl.textContent = activity.title;
    aboutEl.textContent = activity.about;
  }

  // encrypt `from` left-to-right, churn, then decrypt into `to` in random order
  function breakCipher(from, to, done) {
    const len = Math.max(from.length, to.length);
    const ENCRYPT = 900;      // wave of encryption across the old text
    const HOLD = 500;         // every rotor spinning
    const DECRYPT = 1700;     // letters of the new text lock in
    const FLASH = 380;        // glow on a freshly broken letter
    const TICK = 55;          // glyph change rate

    const slots = [];
    for (let i = 0; i < len; i++) {
      const encryptAt = (i / len) * ENCRYPT + Math.random() * 160;
      slots.push({
        from: from[i] || "",
        to: to[i] || "",
        encryptAt,
        decryptAt: ENCRYPT + HOLD + Math.random() * DECRYPT,
        glyph: glyph(),
        hot: Math.random() < 0.18,
      });
    }

    const total = ENCRYPT + HOLD + DECRYPT + FLASH;
    let start = null;
    let lastTick = 0;
    line.classList.add("is-deciphering");

    function frame(now) {
      if (start === null) start = now;
      const t = now - start;
      const reroll = now - lastTick > TICK;
      if (reroll) lastTick = now;

      let html = "";
      for (const s of slots) {
        if (t < s.encryptAt) {
          html += escape(s.from);
        } else if (t < s.decryptAt) {
          if (reroll && Math.random() < 0.7) s.glyph = glyph();
          // keep the new text's word breaks, like a cryptogram
          html +=
            s.to === " " || s.to === ""
              ? s.to
              : `<span class="cipher${s.hot ? " cipher--hot" : ""}">${s.glyph}</span>`;
        } else if (t < s.decryptAt + FLASH) {
          html += `<span class="cipher-lock">${escape(s.to)}</span>`;
        } else {
          html += escape(s.to);
        }
      }
      textEl.innerHTML = `<span aria-hidden="true">${html}</span>`;

      if (t < total) {
        requestAnimationFrame(frame);
      } else {
        textEl.textContent = to;
        line.classList.remove("is-deciphering");
        if (done) done();
      }
    }

    requestAnimationFrame(frame);
  }

  function show(today, yesterday) {
    setActivity(today);
    if (!motionOK) {
      textEl.textContent = today.title;
      return;
    }
    // yesterday's activity sits there briefly, then gets broken into today's
    textEl.textContent = yesterday.title;
    const begin = () => setTimeout(() => breakCipher(yesterday.title, today.title), 700);
    // wait for the display font so the old text doesn't reflow mid-animation
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(begin);
    else begin();
  }

  // re-run at local midnight for anyone who leaves the page open
  function scheduleMidnight() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    setTimeout(() => {
      const prev = textEl.textContent;
      const today = activityFor(new Date());
      setActivity(today);
      if (motionOK) breakCipher(prev, today.title);
      else textEl.textContent = today.title;
      scheduleMidnight();
    }, next - now);
  }

  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  show(activityFor(now), activityFor(yesterday));
  scheduleMidnight();
})();
