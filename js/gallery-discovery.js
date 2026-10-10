/* Ra Mour — shared list of images in media/art-gallery/, used by both
   the gallery page and the homepage preview collage.

   media/art-gallery.json and the resized copies it points to are built by
   scripts/build-gallery.mjs (run automatically on push by
   .github/workflows/build-gallery.yml). */

// "a b/c#d.png" → "a%20b/c%23d.png" (each path segment encoded)
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

// "whirlwind-of-lovers--william-blake.jpg" → "Whirlwind of lovers"
function galleryAltFrom(file) {
  const base = file.split("/").pop().replace(/\.[^.]+$/, "").split("--")[0];
  const clean = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

async function loadGallery() {
  const res = await fetch("media/art-gallery.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`gallery manifest ${res.status}`);
  const entries = await res.json();
  return entries.map(({ file, thumb, large, width, height }) => ({
    alt: galleryAltFrom(file),
    thumb: encodePath(thumb),
    large: encodePath(large),
    width,
    height,
  }));
}

// Images get their src only as they near the screen. Native
// loading="lazy" left the tiles blank on iPhone (WebKit), so this uses
// the same IntersectionObserver approach as js/reveal.js, which works there.
const pendingImages = new WeakMap();
const imageObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            imageObserver.unobserve(entry.target);
            pendingImages.get(entry.target)();
            pendingImages.delete(entry.target);
          }
        },
        { rootMargin: "800px 0px" }
      )
    : null;

// one <img> showing the 800px copy, with the large one offered to wide or
// high-density screens; width/height reserve its space before it loads
function galleryImg({ thumb, large, width, height }, sizes) {
  const img = document.createElement("img");
  img.decoding = "async";
  img.width = width;
  img.height = height;
  img.alt = "";

  const load = () => {
    // images narrower than 800px have no bigger copy to offer
    if (width > 800) {
      img.sizes = sizes;
      img.srcset = `${thumb} 800w, ${large} ${width}w`;
    }
    img.src = thumb;
  };

  if (imageObserver) {
    pendingImages.set(img, load);
    imageObserver.observe(img);
  } else {
    load();
  }
  return img;
}
