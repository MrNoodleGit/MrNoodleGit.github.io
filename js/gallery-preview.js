/* Ra Mour — homepage gallery preview: a random collage from
   media/art-gallery/ on every visit (list in js/gallery-discovery.js) */

// rendered widths of the collage tiles, for picking which copy to load
const COLLAGE_SIZES = {
  featured: "(max-width: 40rem) 100vw, min(50vw, 576px)",
  regular: "(max-width: 40rem) 50vw, min(25vw, 288px)",
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function collageItem(image, featured) {
  const a = document.createElement("a");
  a.className = featured
    ? "gallery-preview__item gallery-preview__item--featured"
    : "gallery-preview__item";
  a.href = "gallery.html";
  a.setAttribute("aria-label", "View the full altar");
  a.appendChild(galleryImg(image, featured ? COLLAGE_SIZES.featured : COLLAGE_SIZES.regular));
  return a;
}

const galleryPreview = document.getElementById("gallery-preview");

loadGallery()
  .then((images) => {
    if (!images.length) {
      galleryPreview.hidden = true;
      return;
    }
    const collage = document.getElementById("gallery-preview-collage");
    shuffle(images)
      .slice(0, 5)
      .forEach((image, i) => collage.appendChild(collageItem(image, i === 0)));
  })
  .catch(() => {
    galleryPreview.hidden = true;
  });
