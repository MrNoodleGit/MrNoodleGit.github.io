#!/usr/bin/env node
// Opens every page of the site in Chromium at phone and desktop width, the
// way the review checklist in CLAUDE.md asks, and fails if any page:
//
//   - logs a JavaScript error or throws one (from the site's own files),
//   - breaks the Content Security Policy,
//   - fails to load one of the site's own files, or
//   - still shows the REPLACE-ME placeholder email address.
//
// Also saves a full-page screenshot of each page at each width into
// site-check/ (uploaded by .github/workflows/site-check.yml, so a pull
// request can be looked at without running it).
//
//   npm ci --prefix scripts
//   npx --no-install --prefix scripts playwright install chromium
//   node scripts/check-site.mjs            # or: node scripts/check-site.mjs --no-shots
//
// Outside services (Spotify, Substack, the radio) may be unreachable where
// this runs; their failures are ignored, only the site's own are counted.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "site-check");
const PORT = 8080; // the radio Worker accepts this localhost port
const SHOTS = !process.argv.includes("--no-shots");

const PAGES = [
  "index.html",
  "gallery.html",
  "writing.html",
  "music.html",
  "waking-up.html",
  "rare-retreats.html",
  "hello_world.html",
  "404.html",
];

// one width with motion on and one with it reduced, so both code paths run
// (several scripts skip their animation work under reduced motion)
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: "no-preference" },
  desktop: { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" },
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
};

// a plain static server for the repo folder, like GitHub Pages
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(ROOT, path.endsWith("/") ? path + "index.html" : path);
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(await readFile(join(ROOT, "404.html")));
  }
});
await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
const BASE = `http://localhost:${PORT}/`;
const own = (url) => url.startsWith(BASE);

if (SHOTS) await mkdir(OUT, { recursive: true });
// CHROMIUM_PATH: use an already-installed Chromium instead of Playwright's own
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];

for (const [size, options] of Object.entries(SIZES)) {
  const context = await browser.newContext(options);
  // report CSP violations as console errors tagged "CSP", so they're caught below
  await context.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      console.error(`CSP: ${e.violatedDirective} blocked ${e.blockedURI || "inline code"}`)
    );
  });

  for (const name of PAGES) {
    const page = await context.newPage();
    const found = new Set();
    page.on("pageerror", (err) => found.add(`script error: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      const from = msg.location().url || "";
      // Chromium's own "Refused to…" and "Failed to load resource" lines
      // repeat what the CSP listener and the response check below report
      if (text.startsWith("Refused to") || text.startsWith("Failed to load resource")) return;
      if (text.startsWith("CSP:") || own(from)) found.add(text);
    });
    page.on("response", (res) => {
      if (own(res.url()) && res.status() >= 400) found.add(`${res.status()} for ${res.url().slice(BASE.length)}`);
    });

    await page.goto(BASE + name, { waitUntil: "load" });
    // scroll down step by step so lazy images and fade-ins all run
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    // what a visitor can see or click, not comments in the source
    const placeholder = await page.evaluate(
      () =>
        document.body.innerText.includes("REPLACE-ME") ||
        !!document.querySelector('[href*="REPLACE-ME"], [data-copy*="REPLACE-ME"]')
    );
    if (placeholder) found.add("the placeholder email address REPLACE-ME is still on the page");
    const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (scrollX > 1) found.add(`the page scrolls sideways by ${scrollX}px`);

    if (SHOTS) await page.screenshot({ path: join(OUT, `${size}-${name.replace(".html", "")}.png`), fullPage: true });

    for (const f of found) problems.push(`${name} (${size}): ${f}`);
    console.log(`${found.size ? "✗" : "✓"} ${name} (${size})`);
    await page.close();
  }
  await context.close();
}

await browser.close();
server.close();

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll pages load cleanly.");
