/* Ra Mour — gallery: every image in media/art-gallery/ (listed by
   js/gallery-discovery.js), interspersed with quotes from quotes.md */

/* ---------- quotes.md ---------- */

// Blocks separated by "---" lines; "> " lines are the quote (line breaks
// kept); a line starting with "—" or "--" is the attribution. Comments
// and "#" headings are ignored. See the template inside quotes.md.
function parseQuotes(md) {
  const quotes = [];
  const blocks = md.replace(/<!--[\s\S]*?-->/g, "").split(/\n\s*---+\s*\n/);
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.replace(/^\s*>\s?/, "").trim())
      .filter((l) => l && !l.startsWith("#"));
    const textLines = [];
    const attribution = [];
    for (const line of lines) {
      if (/^(—|–|--)/.test(line)) attribution.push(line.replace(/^(—|–|--)\s*/, ""));
      else textLines.push(line);
    }
    if (textLines.length) {
      quotes.push({ text: textLines.join("\n"), attribution: attribution.join(", ") });
    }
  }
  return quotes;
}

async function listQuotes() {
  try {
    const res = await fetch("quotes.md");
    if (!res.ok) return [];
    return parseQuotes(await res.text());
  } catch {
    return [];
  }
}

/* ---------- lightbox ---------- */

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxButtons = [...lightbox.querySelectorAll("button")];
let lastFocus = null;

// every image in wall order, so the lightbox can step through them
// regardless of the quote tiles interspersed
let lightboxImages = [];
let lightboxIndex = -1;

function showLightboxImage(index) {
  lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
  const { large, alt } = lightboxImages[lightboxIndex];
  lightboxImg.src = large;
  lightboxImg.alt = alt;
  // warm the cache for the next image so stepping forward feels instant
  const next = lightboxImages[(lightboxIndex + 1) % lightboxImages.length];
  new Image().src = next.large;
}

function openLightbox(index) {
  lastFocus = document.activeElement;
  showLightboxImage(index);
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute("src");
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => showLightboxImage(lightboxIndex + Number(button.dataset.step)));
});
lightbox.addEventListener("click", (e) => {
  if (!e.target.closest(".lightbox__figure, button")) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") showLightboxImage(lightboxIndex - 1);
  else if (e.key === "ArrowRight") showLightboxImage(lightboxIndex + 1);
  else if (e.key === "Tab") {
    // keep focus on the lightbox's own buttons while it's open
    const first = lightboxButtons[0];
    const last = lightboxButtons[lightboxButtons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!lightbox.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  }
});

// swipe left/right to step through images on touch screens
let touchStart = null;
lightbox.addEventListener(
  "touchstart",
  (e) => {
    touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  },
  { passive: true }
);
lightbox.addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    showLightboxImage(lightboxIndex + (dx < 0 ? 1 : -1));
  }
});

/* ---------- render ---------- */

// the wall is 3 columns, then 2 under 64rem, then 1 under 40rem
const WALL_SIZES = "(max-width: 40rem) 100vw, (max-width: 64rem) 50vw, min(33vw, 560px)";

function imageTile(image, index) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "wall__item reveal";
  item.setAttribute("aria-label", `View ${image.alt}`);
  // the placeholder takes the image's shape, so nothing jumps on load
  item.style.setProperty("--ratio", `${image.width} / ${image.height}`);

  const img = galleryImg(image, WALL_SIZES);
  img.alt = image.alt;

  // tile shimmers as a placeholder until its image is ready, then the
  // image fades in (styles in gallery.css); errors too, so none stick
  const markLoaded = () => item.classList.add("is-loaded");
  img.addEventListener("load", markLoaded);
  img.addEventListener("error", markLoaded);
  if (img.complete && img.naturalWidth) markLoaded();

  item.appendChild(img);
  item.addEventListener("click", () => openLightbox(index));
  return item;
}

function quoteTile({ text, attribution }) {
  const quote = document.createElement("blockquote");
  quote.className = "wall-quote reveal";

  const textEl = document.createElement("p");
  textEl.className = "wall-quote__text";
  textEl.textContent = text;
  quote.appendChild(textEl);

  if (attribution) {
    const attrEl = document.createElement("footer");
    attrEl.className = "wall-quote__attr";
    attrEl.textContent = attribution;
    quote.appendChild(attrEl);
  }
  return quote;
}

function render(images, quotes) {
  const wall = document.getElementById("wall");
  lightboxImages = images;

  // spread quotes evenly through the image sequence
  const gap = quotes.length ? Math.ceil(images.length / (quotes.length + 1)) : Infinity;
  let quoteIndex = 0;

  images.forEach((image, i) => {
    wall.appendChild(imageTile(image, i));
    if (quoteIndex < quotes.length && (i + 1) % gap === 0) {
      wall.appendChild(quoteTile(quotes[quoteIndex++]));
    }
  });
  while (quoteIndex < quotes.length) {
    wall.appendChild(quoteTile(quotes[quoteIndex++]));
  }

  observeReveals(wall);
}

// the manifest is already sorted by filename (scripts/build-gallery.mjs)
Promise.all([loadGallery(), listQuotes()])
  .then(([images, quotes]) => render(images, quotes))
  .catch(() => {
    document.getElementById("wall").innerHTML =
      '<p class="wall__error">The altar couldn’t be loaded right now. <a href="index.html">Back home</a>.</p>';
  });
