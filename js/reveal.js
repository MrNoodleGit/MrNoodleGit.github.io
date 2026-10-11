/* Ra Mour — shared fade-in on scroll for .reveal elements
   (styles in style.css). Pages call observeReveals() once for static
   content and again for each batch of elements they add later.

   Loaded in <head> on purpose: it must add the "js" class before the first
   paint. Added later, content would flash on screen and then fade out
   again, because the hidden state only applies once the class is there. */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealsEnabled = "IntersectionObserver" in window && !prefersReducedMotion;

// tagging <html> activates the hidden initial state in CSS; without JS,
// IntersectionObserver, or with reduced motion, everything stays visible
if (revealsEnabled) document.documentElement.classList.add("js");

const revealObserver = revealsEnabled
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        }
      },
      // start fading in a little before an element reaches the screen, so a
      // quick flick never shows an empty gap that fills in after the fact
      { rootMargin: "0px 0px 10% 0px" }
    )
  : null;

function observeReveals(root = document) {
  if (revealObserver) root.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
}
