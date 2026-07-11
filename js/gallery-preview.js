/* Ra Mour — homepage gallery preview: a random collage from
   media/art-gallery/ on every visit (discovery in js/gallery-discovery.js) */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function collageItem(name, featured) {
  const a = document.createElement("a");
  a.className = featured
    ? "gallery-preview__item gallery-preview__item--featured"
    : "gallery-preview__item";
  a.href = "gallery.html";
  a.setAttribute("aria-label", "View the full gallery");

  const img = document.createElement("img");
  img.src = gallerySrc(name);
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";

  a.appendChild(img);
  return a;
}

discoverGalleryImages()
  .then((names) => {
    const section = document.getElementById("gallery-preview");
    const collage = document.getElementById("gallery-preview-collage");
    if (!names.length) {
      section.hidden = true;
      return;
    }
    shuffle(names)
      .slice(0, 5)
      .forEach((name, i) => collage.appendChild(collageItem(name, i === 0)));
  })
  .catch(() => {
    document.getElementById("gallery-preview").hidden = true;
  });
