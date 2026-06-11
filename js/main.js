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
const sections = [...navLinks]
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          navLinks.forEach((link) =>
            link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`)
          );
        }
      }
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );

  sections.forEach((section) => navObserver.observe(section));
}

/* ---------- full-bleed scene videos ---------- */

document.querySelectorAll(".scene").forEach((scene) => {
  const video = scene.querySelector(".scene__video");
  if (!video) return;

  const fail = () => scene.classList.add("scene--novideo");
  video.addEventListener("error", fail);
  const lastSource = video.querySelector("source:last-of-type");
  if (lastSource) lastSource.addEventListener("error", fail);
  // networkState is unreliable mid-parse; check once everything has settled
  window.addEventListener("load", () => {
    if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();
  });

  if (reducedMotion) return;

  video.addEventListener("canplay", () => {
    scene.classList.remove("scene--novideo");
    scene.classList.add("scene--ready");
  });

  if ("IntersectionObserver" in window) {
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.35 }
    );
    sceneObserver.observe(scene);
  } else {
    video.autoplay = true;
  }
});

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
