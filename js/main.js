/* Ra Mour — homepage interactions (the shared header lives in js/site.js) */

observeReveals();

/* ---------- rising bubbles in the intro ---------- */

const bubbleHost = document.querySelector(".intro__bubbles");

if (bubbleHost && !prefersReducedMotion) {
  const BUBBLE_COUNT = 12;

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

/* ---------- pause the intro's animations once it's off screen ---------- */

const intro = document.querySelector(".intro");

if (intro && "IntersectionObserver" in window) {
  // the rays and bubbles never stop drifting; once the intro has scrolled
  // away there's nothing to see, so stop paying for them (see .is-offscreen)
  new IntersectionObserver(([entry]) => {
    intro.classList.toggle("is-offscreen", !entry.isIntersecting);
  }).observe(intro);
}

/* ---------- copy the email address ---------- */

const copyButton = document.querySelector("[data-copy]");

// shown only where the browser allows copying (it needs a secure page)
if (copyButton && navigator.clipboard && window.isSecureContext) {
  const label = copyButton.textContent;
  let reset;
  copyButton.hidden = false;
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copy);
      copyButton.textContent = "Copied";
    } catch {
      copyButton.textContent = "Couldn't copy";
    }
    clearTimeout(reset);
    reset = setTimeout(() => (copyButton.textContent = label), 2000);
  });
}
