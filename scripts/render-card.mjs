#!/usr/bin/env node
// Renders the printable business card (media/hello/print/card.html) to
// print-ready files next to it:
//
//   card.pdf                          front + back, 2 pages, vector text
//   card-front.pdf, card-back.pdf     one side each
//   card-front.png, card-back.png     300 dpi (675 × 1125 px)
//
// All sizes include 0.125 in bleed (2.25 × 3.75 in; trims to 2 × 3.5 in).
// Needs Playwright with a Chromium build:
//   npx -y -p playwright node scripts/render-card.mjs

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../media/hello/print/", import.meta.url));
const SOURCE = new URL("../media/hello/print/card.html", import.meta.url).href;

const PAGE = { width: "2.25in", height: "3.75in" };
const DPI = 300;
const CSS_DPI = 96;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 2.25 * CSS_DPI, height: 3.75 * CSS_DPI },
  deviceScaleFactor: DPI / CSS_DPI,
});

await page.goto(SOURCE, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const pdf = (path, ranges) =>
  page.pdf({ path: DIR + path, ...PAGE, printBackground: true, pageRanges: ranges });

await pdf("card.pdf");
await pdf("card-front.pdf", "1");
await pdf("card-back.pdf", "2");

for (const side of ["front", "back"]) {
  await page.locator(`.page.${side}`).screenshot({ path: DIR + `card-${side}.png` });
}

await browser.close();
console.log("Wrote card PDFs and PNGs to", DIR);
