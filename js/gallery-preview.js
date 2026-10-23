/* Ra Mour — homepage Altar collage: a random justified-row collage from
   media/art-gallery/ on every visit (list in js/gallery-discovery.js) */

const ROWS = 2; // the collage is this many rows tall
const COUNT = 14; // images drawn at random; the rows use as many as they need
const WIDE = 4; // of those, how many to take from the landscape images, so rows aren't all portraits

// Row targets: the sum of the images' width/height ratios in a row. A row's
// height is (width of the collage) / (that sum), so a low target makes a tall
// row and a high one a short row. One target per row.
const ROW_TARGETS = {
  wide: [3.4, 4.4], // about 4–6 images a row
  narrow: [2.2, 2.8], // about 3–4 images a row, for phones
};
const phone = window.matchMedia("(max-width: 40rem)");

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ratioOf = (image) => image.width / image.height;

// random pick of COUNT images, including some landscape ones
function pick(images) {
  const shuffled = shuffle(images);
  const wide = shuffled.filter((i) => ratioOf(i) > 1.1).slice(0, WIDE);
  const rest = shuffled.filter((i) => !wide.includes(i)).slice(0, COUNT - wide.length);
  return shuffle([...wide, ...rest]);
}

// split into ROWS rows: each image joins the row if that brings the row's
// ratio sum closer to its target. Spare images are left out. If there are too
// few images to fill every row, a short last row is folded into the one above
// (or dropped, so a lone straggler never becomes a huge or tiny tile).
function toRows(images, targets, minPerRow, maxPerRow) {
  const rows = [];
  let row = [];
  let sum = 0;
  for (const image of images) {
    const target = targets[rows.length];
    const r = ratioOf(image);
    const closer = Math.abs(sum + r - target) < Math.abs(sum - target);
    if (row.length >= maxPerRow || (row.length >= minPerRow && !closer)) {
      rows.push(row);
      if (rows.length === ROWS) return rows;
      row = [];
      sum = 0;
    }
    row.push(image);
    sum += r;
  }
  const lastTarget = targets[rows.length];
  if (rows.length && sum < lastTarget * 0.6) {
    const prev = rows[rows.length - 1];
    if (prev.length + row.length <= maxPerRow) prev.push(...row); // else drop the stragglers
  } else if (row.length) rows.push(row);
  return rows;
}

// the whole collage is one link to the Altar, so the images are decoration
// inside it (the "Altar" name below them says where it goes)
function collageItem(image, share) {
  const item = document.createElement("span");
  item.className = "collage__item";
  item.style.setProperty("--grow", Math.round(ratioOf(image) * 1000)); // see the CSS
  // the share of the collage this image fills, so the right copy is loaded;
  // the collage spans the content column, at most 64rem (1152px) wide
  const pct = Math.round(share * 100);
  const sizes = `(max-width: 64rem) ${pct}vw, ${Math.round(share * 1152)}px`;
  item.appendChild(galleryImg(image, sizes));
  return item;
}

function render(collage, images) {
  const narrow = phone.matches;
  const rows = narrow
    ? toRows(images, ROW_TARGETS.narrow, 2, 4)
    : toRows(images, ROW_TARGETS.wide, 3, 8);
  const frag = document.createDocumentFragment();
  for (const images of rows) {
    const row = document.createElement("div");
    row.className = "collage__row";
    const total = images.reduce((n, image) => n + ratioOf(image), 0);
    for (const image of images) row.appendChild(collageItem(image, ratioOf(image) / total));
    frag.appendChild(row);
  }
  forgetGalleryImgs(collage);
  collage.replaceChildren(frag);
}

const collage = document.getElementById("altar-collage");

// wait until the page has loaded, so the collage's images never compete
// with the portrait (the first thing anyone sees) for a phone's bandwidth
const pageLoaded =
  document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));

pageLoaded
  .then(loadGallery)
  .then((images) => {
    if (!images.length) {
      collage.hidden = true;
      return;
    }
    const chosen = pick(images);
    render(collage, chosen);
    // re-pack the same images if the screen crosses the phone breakpoint
    const repack = () => render(collage, chosen);
    if (phone.addEventListener) phone.addEventListener("change", repack);
    else phone.addListener(repack); // Safari before 14
  })
  .catch(() => {
    collage.hidden = true;
  });
