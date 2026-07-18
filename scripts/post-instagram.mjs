#!/usr/bin/env node
// Posts one image+caption pair to Instagram via the raw Graph API.
// Run weekly by .github/workflows/post-instagram.yml, or manually with:
//   node scripts/post-instagram.mjs [--dry-run]
//
// Source content: quotes.md entries that have an "image:" line (see the
// template at the top of that file) pointing at a JPG/PNG file in
// media/art-gallery/. Quotes without an "image:" line are gallery-only
// and ignored here. The filename is each entry's stable tracking ID.
//
// Queue state lives in scripts/instagram-state.json (machine-owned, do
// not hand-edit) — a shuffled order of not-yet-posted image filenames,
// reshuffled from scratch whenever it's empty or out of sync with the
// current set of image-tagged quotes. State only advances after a
// successful publish, so a failed run retries the same item next time
// instead of silently skipping it.
//
// Requires env vars (see .github/workflows/post-instagram.yml secrets):
//   IG_ACCESS_TOKEN — long-lived Instagram Graph API access token
//   IG_USER_ID      — the Instagram Business/Creator account's numeric ID
//
// --- Token renewal (manual, ~every 60 days) ---
// Long-lived tokens expire after ~60 days. To refresh:
//   1. Run scripts/refresh-ig-token.mjs (see that file for details), or
//      call Meta's refresh endpoint directly.
//   2. Copy the returned access_token into the IG_ACCESS_TOKEN GitHub
//      Actions secret (repo Settings → Secrets and variables → Actions).
//   3. Suggested cadence: refresh every ~45 days so it never lapses.
//      There's no automated refresh CI job by design — that would
//      require storing a secret capable of writing repo secrets, which
//      is a needless blast-radius increase for a personal posting bot.
// See scripts/README.md for the full one-time setup checklist.

import { readFile, writeFile, access } from "node:fs/promises";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const SITE_BASE = "https://ramour.org";
const IMAGE_DIR = "media/art-gallery";
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

const QUOTES_PATH = fileURLToPath(new URL("../quotes.md", import.meta.url));
const STATE_PATH = fileURLToPath(new URL("./instagram-state.json", import.meta.url));
const IMAGE_DIR_PATH = fileURLToPath(new URL(`../${IMAGE_DIR}/`, import.meta.url));

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15; // ~30s bounded wait

const DRY_RUN = process.argv.includes("--dry-run");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extname(filename) {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

// Same block-splitting approach as parseQuotes in js/gallery.js, plus
// requiring an "image:" line. Kept as a separate implementation since
// one runs in the browser and one in Node.
async function parseTaggedEntries() {
  const md = await readFile(QUOTES_PATH, "utf8");
  const blocks = md.replace(/<!--[\s\S]*?-->/g, "").split(/\n\s*---+\s*\n/);

  const entries = [];
  for (const block of blocks) {
    const rawLines = block.split("\n").map((l) => l.trim());
    const imageLine = rawLines.find((l) => /^image:\s*/i.test(l));
    if (!imageLine) continue; // gallery-only quote, not for Instagram

    const filename = imageLine.replace(/^image:\s*/i, "").trim();
    const ext = extname(filename);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      console.warn(`Skipping "${filename}": unsupported extension for the Graph API (need .jpg/.jpeg/.png)`);
      continue;
    }

    try {
      await access(IMAGE_DIR_PATH + filename);
    } catch {
      console.warn(`Skipping "${filename}": not found in ${IMAGE_DIR}/`);
      continue;
    }

    const lines = rawLines
      .map((l) => l.replace(/^\s*>\s?/, "").trim())
      .filter((l) => l && !l.startsWith("#") && !/^image:\s*/i.test(l));

    const textLines = [];
    const attribution = [];
    for (const line of lines) {
      if (/^(—|–|--)/.test(line)) attribution.push(line.replace(/^(—|–|--)\s*/, ""));
      else textLines.push(line);
    }
    if (!textLines.length) continue;

    const caption = attribution.length
      ? `${textLines.join("\n")}\n— ${attribution.join(", ")}`
      : textLines.join("\n");

    entries.push({ id: filename, imagePath: `${IMAGE_DIR}/${filename}`, caption });
  }
  return entries;
}

async function loadState() {
  const empty = { version: 1, queue: [], posted: {}, lastPostedId: null, lastRunAt: null };
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function reshuffleIfStale(state, allIds) {
  const queueSet = new Set(state.queue);
  const allIdsSet = new Set(allIds);
  const stale =
    state.queue.length === 0 ||
    state.queue.some((id) => !allIdsSet.has(id)) ||
    allIds.some((id) => !queueSet.has(id));

  if (!stale) return;

  let queue = shuffle(allIds);
  // Avoid an immediate repeat of the last posted item where trivially possible.
  if (queue.length > 1 && queue[0] === state.lastPostedId) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  state.queue = queue;
}

async function graphRequest(url, { method = "GET", body } = {}) {
  const res = await fetch(url, { method, body });
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message ?? JSON.stringify(json);
    throw new Error(`Graph API request failed: ${message}`);
  }
  return json;
}

async function run() {
  const entries = await parseTaggedEntries();
  if (!entries.length) {
    throw new Error(`No quotes.md entries have a usable "image:" tag — nothing to post.`);
  }

  const state = await loadState();
  reshuffleIfStale(state, entries.map((e) => e.id));

  const nextId = state.queue[0];
  const entry = entries.find((e) => e.id === nextId);
  if (!entry) {
    throw new Error(`Queue points at "${nextId}", which has no matching quotes.md entry.`);
  }

  const accessToken = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!accessToken || !igUserId) {
    throw new Error("IG_ACCESS_TOKEN and IG_USER_ID must both be set in the environment.");
  }

  const imageUrl = `${SITE_BASE}/${IMAGE_DIR}/${encodeURIComponent(entry.id)}`;
  console.log(`Posting "${entry.id}" — ${imageUrl}`);

  const createParams = new URLSearchParams({
    image_url: imageUrl,
    caption: entry.caption,
    access_token: accessToken,
  });
  const { id: creationId } = await graphRequest(`${GRAPH_BASE}/${igUserId}/media`, {
    method: "POST",
    body: createParams,
  });
  console.log(`Created container ${creationId}, waiting for processing...`);

  let status = "IN_PROGRESS";
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS && status !== "FINISHED"; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    const statusParams = new URLSearchParams({ fields: "status_code", access_token: accessToken });
    const statusRes = await graphRequest(`${GRAPH_BASE}/${creationId}?${statusParams}`);
    status = statusRes.status_code;
    if (status === "ERROR") {
      throw new Error(`Container ${creationId} failed processing: ${JSON.stringify(statusRes)}`);
    }
  }
  if (status !== "FINISHED") {
    throw new Error(`Container ${creationId} did not finish processing within the poll window.`);
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Container ${creationId} reached FINISHED — skipping media_publish and state write.`);
    return;
  }

  const publishParams = new URLSearchParams({ creation_id: creationId, access_token: accessToken });
  const { id: mediaId } = await graphRequest(`${GRAPH_BASE}/${igUserId}/media_publish`, {
    method: "POST",
    body: publishParams,
  });

  state.queue.shift();
  state.posted[entry.id] = { postedAt: new Date().toISOString(), igMediaId: mediaId };
  state.lastPostedId = entry.id;
  state.lastRunAt = new Date().toISOString();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n");

  console.log(`Published "${entry.id}" as media ${mediaId}. ${state.queue.length} remaining in queue.`);
}

try {
  await run();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
