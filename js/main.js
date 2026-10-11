/* Ra Mour — portfolio interactions */

observeReveals();

/* ---------- scroll work, once per frame ---------- */

// Everything that reads the scroll position hangs off one passive listener
// that runs at most once per frame, so a fast flick never queues up
// layout reads or class changes faster than the screen can draw them.
const onScrollFrame = [];
let scrollQueued = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      onScrollFrame.forEach((fn) => fn());
    });
  },
  { passive: true }
);

/* ---------- hide nav while scrolling down ---------- */

const nav = document.querySelector(".nav");

if (nav) {
  const HIDE_AFTER = 24; // px of steady downward travel before the nav slides away
  const SHOW_AFTER = 12; // px of upward travel before it comes back
  let lastY = window.scrollY;
  let travel = 0; // signed px scrolled in the current direction
  let hidden = false;

  // only touch the DOM when the state really changes, not on every frame
  const setHidden = (value) => {
    if (value === hidden) return;
    hidden = value;
    nav.classList.toggle("is-hidden", value);
  };

  onScrollFrame.push(() => {
    const y = window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;

    // iOS rubber-bands past both ends of the page; those positions bounce
    // back the other way, which would flick the nav in and out
    if (y < 0 || y > maxY) {
      lastY = Math.min(Math.max(y, 0), maxY);
      travel = 0;
      return;
    }

    const delta = y - lastY;
    lastY = y;
    if (delta === 0) return;

    // the count restarts whenever the direction flips, so a finger's
    // small wobble can't toggle the nav; only a real change of direction does
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;

    if (y <= nav.offsetHeight) setHidden(false); // near the top: always shown
    else if (travel > HIDE_AFTER) setHidden(true);
    else if (travel < -SHOW_AFTER) setHidden(false);
  });

  // tabbing into the nav brings it back
  nav.addEventListener("focusin", () => setHidden(false));
}

/* ---------- active nav link ---------- */

const navLinks = document.querySelectorAll(".nav__links a");
// most links point to an in-page "#id"; a link can override with
// data-scrollspy="id" when its href goes elsewhere (e.g. Gallery links
// to gallery.html but should still light up over its homepage preview)
const navSections = [...navLinks]
  .map((link) => {
    const id = link.dataset.scrollspy || link.getAttribute("href").replace(/^#/, "");
    return { link, section: document.getElementById(id) };
  })
  .filter((entry) => entry.section);

function setActiveLink(activeLink) {
  navLinks.forEach((link) => link.classList.toggle("is-active", link === activeLink));
}

if ("IntersectionObserver" in window && navSections.length) {
  // track every section currently in the band, not just the last entry
  // reported — two adjacent sections can straddle the band at once, and
  // reacting only to isIntersecting:true (ignoring :false) can leave a
  // stale link active after the real answer changes
  const intersecting = new Set();

  const navObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) intersecting.add(entry.target);
        else intersecting.delete(entry.target);
      }
      // when more than one section is in the band, prefer the lowest
      // (furthest down the page) — it's the one being scrolled into
      for (let i = navSections.length - 1; i >= 0; i--) {
        if (intersecting.has(navSections[i].section)) {
          setActiveLink(navSections[i].link);
          break;
        }
      }
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );

  navSections.forEach(({ section }) => navObserver.observe(section));

  // the last section can never scroll into the band above (there's no
  // page left below it to push it there), so force it active once the
  // user reaches the bottom of the page
  const last = navSections[navSections.length - 1];
  const atBottom = () =>
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  const checkBottom = () => {
    if (atBottom()) setActiveLink(last.link);
  };
  onScrollFrame.push(checkBottom);
  window.addEventListener("resize", checkBottom);
  checkBottom();
}

/* ---------- rising bubbles in the hero ---------- */

const bubbleHost = document.querySelector(".hero__bubbles");

if (bubbleHost && !prefersReducedMotion) {
  const BUBBLE_COUNT = 15;

  for (let i = 0; i < BUBBLE_COUNT; i++) {
    const bubble = document.createElement("span");
    bubble.className = "bubble";

    const size = 2 + Math.random() * 5;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDuration = `${14 + Math.random() * 18}s`;
    bubble.style.animationDelay = `${-Math.random() * 30}s`;

    bubbleHost.appendChild(bubble);
  }
}

/* ---------- pause the hero's animations once it's off screen ---------- */

const hero = document.querySelector(".hero");

if (hero && "IntersectionObserver" in window) {
  // the rays and bubbles never stop drifting; once the hero has scrolled
  // away there's nothing to see, so stop paying for them (see .is-offscreen)
  new IntersectionObserver(([entry]) => {
    hero.classList.toggle("is-offscreen", !entry.isIntersecting);
  }).observe(hero);
}

/* ---------- experience patches ---------- */

const patches = document.querySelectorAll(".patch");
const patchCaption = document.querySelector(".patches__caption");

function showPatch(patch) {
  patchCaption.replaceChildren();
  if (!patch) return;
  const role = document.createElement("span");
  const org = document.createElement("span");
  role.className = "patches__role";
  org.className = "patches__org";
  role.textContent = patch.dataset.role;
  org.textContent = patch.dataset.org;
  patchCaption.append(role, org);
}

const pressedPatch = () => document.querySelector('.patch[aria-pressed="true"]');

patches.forEach((patch) => {
  patch.setAttribute("aria-pressed", "false");
  // a tap pins the caption open; tapping the same patch again closes it
  patch.addEventListener("click", () => {
    const wasPressed = patch.getAttribute("aria-pressed") === "true";
    patches.forEach((p) => p.setAttribute("aria-pressed", "false"));
    if (!wasPressed) patch.setAttribute("aria-pressed", "true");
    showPatch(pressedPatch());
  });
  patch.addEventListener("mouseenter", () => showPatch(patch));
  patch.addEventListener("mouseleave", () => showPatch(pressedPatch()));
});
