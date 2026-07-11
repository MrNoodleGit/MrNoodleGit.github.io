/* Ra Mour — shared discovery of images in media/art-gallery/,
   used by both the gallery page and the homepage preview collage */

const GALLERY_DIR = "media/art-gallery";
const GALLERY_REPO = "MrNoodleGit/MrNoodleGit.github.io";
const GALLERY_IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

// Local http-server serves an HTML auto-index for the directory;
// on GitHub Pages there is no listing, so ask the GitHub API instead.
async function discoverGalleryImages() {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);

  if (local) {
    const res = await fetch(`/${GALLERY_DIR}/`);
    if (!res.ok) throw new Error(`dir listing ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return [...doc.querySelectorAll("a[href]")]
      .map((a) => decodeURIComponent(a.getAttribute("href").split("/").pop()))
      .filter((name) => GALLERY_IMAGE_EXT.test(name));
  }

  const res = await fetch(`https://api.github.com/repos/${GALLERY_REPO}/contents/${GALLERY_DIR}`);
  if (!res.ok) throw new Error(`github api ${res.status}`);
  const files = await res.json();
  return files.map((f) => f.name).filter((name) => GALLERY_IMAGE_EXT.test(name));
}

function gallerySrc(name) {
  return `${GALLERY_DIR}/${encodeURIComponent(name)}`;
}

// "whirlwind-of-lovers--william-blake.jpg" → "Whirlwind of lovers"
function galleryAltFrom(name) {
  const base = name.replace(/\.[^.]+$/, "").split("--")[0];
  const clean = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
