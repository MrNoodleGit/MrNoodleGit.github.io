#!/usr/bin/env node
// Builds the altar's image list and resized copies from media/art-gallery/:
//
//   media/art-gallery.json          manifest read by js/gallery-discovery.js
//   media/art-gallery-thumbs/*.webp 800px wide — wall tiles, homepage collage
//   media/art-gallery-large/*.webp  ≤2000px — lightbox, featured collage tile
//
// Run on every push that touches media/art-gallery/ by
// .github/workflows/build-gallery.yml, or locally after adding images:
//   npm install --no-save --no-package-lock sharp@0.35.5
//   node scripts/build-gallery.mjs
//
// Only new or changed images are re-encoded (tracked by content hash), and
// copies of images that were removed from the folder are deleted.

import { createHash } from "node:crypto";
import { access, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SOURCE_DIR = "media/art-gallery";
const MANIFEST = "media/art-gallery.json";
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

const VARIANTS = [
  { key: "thumb", dir: "media/art-gallery-thumbs", resize: { width: 800 }, quality: 78 },
  { key: "large", dir: "media/art-gallery-large", resize: { width: 2000, height: 2000, fit: "inside" }, quality: 82 },
];

async function readManifest() {
  try {
    return JSON.parse(await readFile(ROOT + MANIFEST, "utf8"));
  } catch {
    return [];
  }
}

async function exists(path) {
  try {
    await access(ROOT + path);
    return true;
  } catch {
    return false;
  }
}

const previous = new Map((await readManifest()).map((entry) => [entry.file, entry]));

const names = (await readdir(ROOT + SOURCE_DIR))
  .filter((name) => IMAGE_EXT.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const { dir } of VARIANTS) await mkdir(ROOT + dir, { recursive: true });

const manifest = [];
let built = 0;

for (const name of names) {
  const file = `${SOURCE_DIR}/${name}`;
  const source = await readFile(ROOT + file);
  const hash = createHash("sha1").update(source).digest("hex").slice(0, 12);

  // the full filename is kept in the copy's name ("x.png.webp") so
  // "x.png" and "x.jpg" can never overwrite each other
  const entry = { file, thumb: "", large: "", width: 0, height: 0, hash };
  for (const { key, dir } of VARIANTS) entry[key] = `${dir}/${name}.webp`;

  const old = previous.get(file);
  const copiesExist = (await Promise.all(VARIANTS.map(({ key }) => exists(entry[key])))).every(Boolean);

  if (old?.hash === hash && copiesExist) {
    entry.width = old.width;
    entry.height = old.height;
  } else {
    // .rotate() applies the EXIF orientation so phone photos stand upright
    const image = sharp(source).rotate();
    for (const { key, resize, quality } of VARIANTS) {
      const info = await image
        .clone()
        .resize({ ...resize, withoutEnlargement: true })
        .webp({ quality })
        .toFile(ROOT + entry[key]);
      // pages only need the aspect ratio (to reserve space before load),
      // so the large copy's size stands in for the original's
      if (key === "large") {
        entry.width = info.width;
        entry.height = info.height;
      }
    }
    built++;
  }

  manifest.push(entry);
}

let removed = 0;
const keep = new Set(names.map((name) => `${name}.webp`));
for (const { dir } of VARIANTS) {
  for (const name of await readdir(ROOT + dir)) {
    if (!keep.has(name)) {
      await rm(`${ROOT}${dir}/${name}`);
      removed++;
    }
  }
}

await writeFile(ROOT + MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${names.length} images · ${built} built · ${removed} stale copies removed`);
