/* Ra Mour — shared on every page with the site header: one scroll
   listener, and the header that steps aside while you read */

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

/* ---------- hide the header while scrolling down ---------- */

const siteHeader = document.querySelector(".site-header");

if (siteHeader) {
  const HIDE_AFTER = 24; // px of steady downward travel before the header slides away
  const SHOW_AFTER = 12; // px of upward travel before it comes back
  // measured once (and on resize), never inside the scroll handler
  let headerHeight = siteHeader.offsetHeight;
  let maxY = document.documentElement.scrollHeight - window.innerHeight;
  let lastY = window.scrollY;
  let travel = 0; // signed px scrolled in the current direction
  let hidden = false;

  const measure = () => {
    headerHeight = siteHeader.offsetHeight;
    maxY = document.documentElement.scrollHeight - window.innerHeight;
  };
  window.addEventListener("resize", measure);
  // pages that fill in later (Altar, Music) grow after the first measure
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);
  else window.addEventListener("load", measure);

  // only touch the DOM when the state really changes, not on every frame
  const setHidden = (value) => {
    if (value === hidden) return;
    hidden = value;
    siteHeader.classList.toggle("is-hidden", value);
  };

  onScrollFrame.push(() => {
    const y = window.scrollY;

    // iOS rubber-bands past both ends of the page; those positions bounce
    // back the other way, which would flick the header in and out
    if (y < 0 || y > maxY) {
      lastY = Math.min(Math.max(y, 0), Math.max(maxY, 0));
      travel = 0;
      return;
    }

    const delta = y - lastY;
    lastY = y;
    if (delta === 0) return;

    // the count restarts whenever the direction flips, so a finger's
    // small wobble can't toggle the header; only a real change of direction does
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;

    if (y <= headerHeight) setHidden(false); // near the top: always shown
    else if (travel > HIDE_AFTER) setHidden(true);
    else if (travel < -SHOW_AFTER) setHidden(false);
  });

  // tabbing into the header brings it back
  siteHeader.addEventListener("focusin", () => setHidden(false));
}
