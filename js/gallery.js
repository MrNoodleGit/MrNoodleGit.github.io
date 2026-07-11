/* Ra Mour — gallery: auto-discovers images in media/art-gallery/,
   interspersed with quotes from quotes.md */

const DIR = "media/art-gallery";
const REPO = "MrNoodleGit/MrNoodleGit.github.io";
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- discovery ---------- */

// Local http-server serves an HTML auto-index for the directory;
// on GitHub Pages there is no listing, so ask the GitHub API instead.
async function listImages() {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);

  if (local) {
    const res = await fetch(`/${DIR}/`);
    if (!res.ok) throw new Error(`dir listing ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return [...doc.querySelectorAll("a[href]")]
      .map((a) => decodeURIComponent(a.getAttribute("href").split("/").pop()))
      .filter((name) => IMAGE_EXT.test(name));
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${DIR}`);
  if (!res.ok) throw new Error(`github api ${res.status}`);
  const files = await res.json();
  return files.map((f) => f.name).filter((name) => IMAGE_EXT.test(name));
}

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

/* ---------- filename → alt text ---------- */

function altFrom(name) {
  const base = name.replace(/\.[^.]+$/, "").split("--")[0];
  const clean = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/* ---------- lightbox ---------- */

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");
let lastFocus = null;

function openLightbox(src, alt) {
  lastFocus = document.activeElement;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = "";
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (!e.target.closest(".lightbox__figure")) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

/* ---------- render ---------- */

function imageTile(name) {
  const alt = altFrom(name);
  const src = `${DIR}/${encodeURIComponent(name)}`;

  const item = document.createElement("button");
  item.type = "button";
  item.className = "wall__item reveal";
  item.setAttribute("aria-label", `View ${alt}`);

  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  img.decoding = "async";

  item.appendChild(img);
  item.addEventListener("click", () => openLightbox(src, alt));
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

function render(names, quotes) {
  const wall = document.getElementById("wall");

  // spread quotes evenly through the image sequence
  const gap = quotes.length ? Math.ceil(names.length / (quotes.length + 1)) : Infinity;
  let quoteIndex = 0;

  names.forEach((name, i) => {
    wall.appendChild(imageTile(name));
    if (quoteIndex < quotes.length && (i + 1) % gap === 0) {
      wall.appendChild(quoteTile(quotes[quoteIndex++]));
    }
  });
  while (quoteIndex < quotes.length) {
    wall.appendChild(quoteTile(quotes[quoteIndex++]));
  }

  // same reveal-on-scroll pattern as js/main.js (.reveal styles live in style.css)
  if ("IntersectionObserver" in window && !reducedMotion) {
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
      { threshold: 0.1 }
    );
    wall.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  }
}

Promise.all([listImages(), listQuotes()])
  .then(([names, quotes]) => {
    names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    render(names, quotes);
  })
  .catch(() => {
    document.getElementById("wall").innerHTML =
      '<p class="wall__error">The gallery couldn’t be loaded right now. <a href="index.html">Back home</a>.</p>';
  });
