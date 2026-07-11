/* Ra Mour — portfolio interactions */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- scroll reveals ---------- */

if ("IntersectionObserver" in window && !reducedMotion) {
  // tagging <html> activates the hidden initial state in CSS
  document.documentElement.classList.add("js");

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
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
  window.addEventListener("scroll", checkBottom, { passive: true });
  window.addEventListener("resize", checkBottom);
  checkBottom();
}

/* ---------- rising bubbles in the hero ---------- */

const bubbleHost = document.querySelector(".hero__bubbles");

if (bubbleHost && !reducedMotion) {
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
