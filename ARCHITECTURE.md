# ramour.org — architecture, technology and features

**Last updated:** 2026-10-11 · **Status:** live on GitHub Pages; Cloudflare move prepared but not started

> Keep this file current. Change it in the same commit as the change it describes (rules at the end). Open work lives in `TODO.md`; standards and the review checklist live in `CLAUDE.md`.

---

## 1. Summary for product managers

### What it is
ramour.org is Ra Mour's personal site: a portfolio and creative home that presents who they are, what they write, listen to, love and collect, and gives people a way to follow their work. It is a small, fast, mostly static site with one live feature (a "radio" showing the song Ra is listening to right now).

### Who it's for
People who arrive from a link, a social profile, or the QR code on Ra's business card: friends, collaborators, readers, and potential clients or partners.

### What a visitor can do

| Page | What it offers |
| --- | --- |
| **Home** | A full-screen intro, a portrait and four experience "patches" (tap one to see the role and organization), the latest essays, a feature card for the Spanish Waking Up translations, a three-scene video reel (dancing, martial arts, meditation), a random preview of the Altar, and contact/social links |
| **Altar** | A gallery wall of 69 pieces of art, film posters, book covers and photos, mixed with 20 quotes. Tap a piece to enlarge it and step through with buttons, arrow keys or swipes |
| **Writing** | The full list of essays, which link out to Substack |
| **Music** | A live "On air / Last played" band showing what Ra is listening to on Spotify, a 1:45 preview of a Waking Up piece, and a curated list of recommended tracks and playlists with built-in players |
| **Waking Up · en español** | 14 days of Spanish guided meditations and lessons (28 audio sessions) with a built-in player |
| **Rare Retreats** | A "coming soon" page with an email sign-up (a Substack form) |
| **Hello** | A one-screen contact card with social links and a QR code, the page the business card points to |

### How the owner updates it without a developer

| To… | Do this | Takes effect |
| --- | --- | --- |
| Add or remove an Altar image | Add or delete the file in `media/art-gallery/` and push | About a minute (an automated job makes the resized copies) |
| Add a quote to the Altar | Edit `quotes.md` | On the next deploy (a few minutes) |
| Add a music recommendation | Edit `music.md` (paste a Spotify link and a note) | On the next deploy |
| Publish an essay | Publish on Substack, then run the "Sync Substack essays" job by hand | On the next deploy (the daily schedule is switched off, see `TODO.md`) |
| Change the radio | Edit `worker/now-playing.js`, then redeploy the Worker from a computer | Immediately after the redeploy |

### What is automated
- **Deploys:** every push to `main` is published by GitHub Pages in a few minutes.
- **Gallery images:** resized copies and the image list are rebuilt on every change to the Altar folder.
- **Quality checks:** a speed/accessibility/best-practice test (Lighthouse) runs on every push and fails if limits are broken.
- **Updates:** Dependabot opens a weekly pull request when a tool or GitHub Action has a new version.
- **Radio history:** a once-a-minute job records what was playing (kept private).

### Where it stands (2026-10-11)
- **Speed:** the homepage scores 100 in all four Lighthouse categories and downloads about 220 KB (the Altar scores 93–94 on speed, 100 elsewhere). On a phone, scrolling through the whole Altar downloads about 10 MB instead of the 66 MB it used to.
- **Security:** every page carries a strict Content Security Policy; fonts and code are self-hosted (no tracking or ad services); dependencies and GitHub Actions are version-locked; the only secret (Spotify access) lives in the Worker and never in the site.
- **Known gaps:**
  1. GitHub Pages can't send custom security headers, which limits the policy; moving to Cloudflare would fix this.
  2. The Altar shows all its images at once on phones, which risks blank images on older iPhones.
  3. Essays only sync when someone runs the job, and the radio Worker needs a manual redeploy after any change.
  4. About 300 MB of media (mostly audio) is stored in the code repository.
  5. A few unused files remain.

  Details and owners are in `TODO.md`.
- **Next candidates:** move hosting to Cloudflare, add a build step, move audio to cheaper storage, and add features such as lock-screen controls for the audio player and link-preview images for social sharing.

---

## 2. At a glance (technical)

| | |
| --- | --- |
| **Type** | Static multi-page website, no framework and no build step for the site itself |
| **Languages** | HTML, CSS, vanilla JavaScript (plain scripts in the global scope, no bundler or modules in the browser) |
| **Hosting** | GitHub Pages, custom domain ramour.org (`CNAME`). Cloudflare config is ready (`wrangler.jsonc`, `_headers`, `.assetsignore`) but not in use |
| **Back end** | One Cloudflare Worker (`worker/`) for the Spotify "radio", with a KV store and a 1-minute cron |
| **Content** | Markdown files read by the browser (`writing.md`, `music.md`, `quotes.md`) plus a generated image list (`media/art-gallery.json`) |
| **Automation** | GitHub Actions: gallery build, Lighthouse CI, Substack sync (manual), Dependabot |
| **Tooling** | Node 22; `sharp` (image resizing), Lighthouse CI, Playwright (business-card render only), Wrangler (Worker deploy) |
| **Browsers** | Targets current Chrome, Safari, Firefox and Edge. Automated tests run in Chromium (desktop and an emulated iPhone); iPhone Safari quirks are handled from known issues and reports (they drive several decisions below); Firefox is not routinely tested |

### System diagram

```
                       ┌────────────────────────────────────────────┐
  Visitor's browser ◄──┤ GitHub Pages (static files, ramour.org)    │
        │              │  HTML · CSS · JS · fonts · images · audio  │
        │              │  · video · *.md content · art-gallery.json │
        │              └───────────────▲────────────────────────────┘
        │                              │ deploy on every push to main
        │              ┌───────────────┴────────────────┐
        │              │ GitHub repo + Actions          │
        │              │  build-gallery · lighthouse ·  │
        │              │  sync-substack · dependabot    │
        │              └───────────────▲────────────────┘
        │                              │ essays (RSS)
        │                       ┌──────┴──────┐
        ├── embeds ───────────► │  Substack   │ ◄── "Rare Retreats" sign-up form
        │                       └─────────────┘
        ├── embeds ───────────► Spotify players (Music page)
        │
        └── JSON every 25 s ──► Cloudflare Worker "ra-mour-radio"
                                 │  edge cache 20 s · KV history · cron 1 min
                                 └──► Spotify Web API (read-only)
```

---

## 3. Repository layout

```
/                      HTML pages (index, gallery, writing, music, waking-up,
                       rare-retreats, hello_world, 404)
CLAUDE.md              standards and review checklist for AI-assisted work
TODO.md                open work
ARCHITECTURE.md        this file
writing.md             essays list (auto-generated from Substack)
music.md               Spotify recommendations (hand-edited)
quotes.md              Altar quotes (hand-edited)
CNAME                  custom domain for GitHub Pages
_headers               HTTP headers + caching (Cloudflare only; ignored by Pages)
wrangler.jsonc         Cloudflare static-site config (not in use yet)
.assetsignore          repo files Cloudflare must not publish
css/                   style.css (shared base + home), one file per page, fonts.css
js/                    one file per feature (see §5)
fonts/                 self-hosted Marcellus and EB Garamond (WOFF2 + licences)
media/
  art-gallery/         Altar originals (the only part you edit)
  art-gallery-thumbs/  800 px WebP copies   ┐ generated by
  art-gallery-large/   ≤2000 px WebP copies │ scripts/build-gallery.mjs
  art-gallery.json     image list + sizes   ┘ (never edit by hand)
  dancing|martial-arts|meditation  .mp4 (1080p) · -720.mp4 (phones) · .webp poster
  soul-city-art-portrait*.webp     homepage portrait, three sizes
  waking-up/           covers, 14 meditations + 14 lessons (MP3), 1:45 preview
  hello/               business-card page assets and print files
  logos/               organization logos (only wakingup.png is used; the rest belonged to the removed Work section)
scripts/               build-gallery, sync-substack, render-card, spotify-auth,
                       lighthouserc.json, package.json + lockfile
worker/                Cloudflare Worker for the radio (+ README with setup)
.github/               workflows (build-gallery, lighthouse, sync-substack)
                       and dependabot.yml
```

---

## 4. Design system

- **Palette (CSS variables in `css/style.css`):** ink `#020202` (page), abyss `#061719` (alternate sections), teal `#14636F` (borders), zima `#5BC2E7` (accent and links), crimson `#AE0E36` (patches, "on air" dot), text `#E8F0F0`, muted `#7FA8AD`.
- **Type:** Marcellus (headings, nav, labels) and EB Garamond (body), self-hosted and split into Latin and Latin Extended so the second file only downloads when needed. Root size is 112.5% (18 px).
- **Layout:** content width `--measure` 64rem; side padding `--pad` = `clamp(1.25rem, 5vw, 4rem)`. Phone layout below 40rem; the Altar wall steps 3 → 2 → 1 columns at 64rem and 40rem.
- **Altar theme:** a warmer "dim gallery" (`--g-bg #151210`, amber `#d9a441`) defined in `css/gallery.css`.
- **Motion:** scroll fade-ins, drifting light rays and bubbles in the hero, a pulsing play hint. Everything respects `prefers-reduced-motion`; on touch screens fade-ins don't slide.

---

## 5. Pages and features in detail

### Home — `index.html`
CSS: `style.css`. JS: `reveal.js`, `main.js`, `lifeframe.js`, `gallery-discovery.js`, `gallery-preview.js`, `writing-data.js`, `writing-home.js`.

- **Navigation (fixed top bar):** About, Mind, Life, Altar, Contact; a "Rare Retreats" button; icons for Substack, Instagram, LinkedIn, YouTube and X. On phones it wraps to three rows.
  - *Scroll spy:* the link for the section in view is highlighted (IntersectionObserver band in the middle of the screen; the last link is forced active at the bottom of the page). The Altar link is tied to the homepage preview section.
  - *Hide on scroll:* the bar slides away on steady downward scrolling (24 px) and returns on upward scrolling (12 px), is always shown near the top, ignores iOS rubber-band overscroll, and returns when a link inside it gets keyboard focus.
  - One shared, passive scroll listener runs at most once per frame (`onScrollFrame` in `main.js`).
- **Hero:** name and tagline over five blurred light rays and 15 randomly generated bubbles. The animations pause once the hero scrolls out of view.
- **About:** portrait (WebP in 480/640/960 px) and four experience patches drawn as inline SVG. Hover or tap a patch to show role and organization in a live region; tapping pins it. The patch shield outlines are deliberately repeated inline (a shared `<use>` showed white patches on Safari).
- **Mind:** the three latest essays (from `writing.md`), a link to Writing, and a feature card for the Waking Up translations.
- **Life:** a full-screen carousel of three muted, looping videos (arrows, dots, tap to play or pause). Phones get 720p files via a `media` query on the `<source>`. Videos use `preload="none"`, begin buffering about a screen before the section, play only while at least 35% is visible, and pause when you switch scenes. A play hint shows if autoplay is blocked. Slide titles and text exist in the markup but are hidden.
- **Altar preview:** five random images from the gallery on every visit, the first shown large, linking to the Altar.
- **Contact:** text links to the Altar, Substack, YouTube, Instagram, LinkedIn and X.
- **Fade-in on scroll:** elements with class `reveal` fade in shortly before reaching the screen (`reveal.js`, loaded in `<head>` so the hidden state exists before the first paint).

### Altar — `gallery.html`
CSS: `style.css`, `gallery.css`. JS: `reveal.js`, `gallery-discovery.js`, `gallery.js`.

- Reads `media/art-gallery.json` (preloaded) and `quotes.md`; shows a masonry wall with a quote after every few images.
- Each tile reserves its exact shape before the image loads (aspect ratio from the manifest) and shimmers until loaded; the 800 px copy is used, with the larger copy offered to high-density screens through `srcset`.
- Images get their `src` only as they come within 800 px of the screen, using an IntersectionObserver. Native `loading="lazy"` left tiles blank on iPhone, so it is not used.
- **Lightbox:** opens the large (≤2000 px) copy; previous/next buttons, left/right arrow keys, swipe, Escape, click outside; focus is trapped inside and returned on close; the next image is preloaded.
- Alt text is derived from the file name (`galleryAltFrom`), e.g. `the-fountainhead.jpg` → "The fountainhead". A `--` in a file name starts a suffix that is dropped from the alt text (handy for credits).

### Writing — `writing.html`
CSS: `style.css`, `writing.css`. JS: `reveal.js`, `writing-data.js`, `writing-archive.js`.
Lists every essay from `writing.md` (title, date, excerpt, link to Substack). `writing-data.js` is shared with the homepage: it parses the file and builds each list item. Space is reserved while the file loads to avoid layout shift.

### Music — `music.html`
CSS: `style.css`, `music.css`, `radio.css`, `music-preview.css`. JS: `reveal.js`, `radio.js`, `music.js`, `music-preview.js`.

- **Radio band (`radio.js`):** asks the Worker every 25 s (not while the tab is hidden). Shows "On air" with a crimson pulsing dot and a waveform that fills as the song plays, or "Last played" when paused/idle; cover art (also blurred as the band's backdrop), title, artist, album, time, and a link to Spotify. Between polls a local clock advances the bar; when a song should have ended it asks again (rate-limited). If the Worker is missing or errors before anything was shown, the whole band stays hidden; if it fails later, the last good song stays up.
- **Waking Up preview (`music-preview.js`):** a custom player for a pre-trimmed 1:45 audio clip: play/pause, seek, ±15 s, volume. The clip is downloaded into memory and played from a blob URL so seeking works on any server; a 105 s limit is enforced in code too. Includes a "3 months free" gift link.
- **Recommendations (`music.js`):** each entry in `music.md` (`track:`, `playlist:` or `album:` plus a Spotify link or ID and a note) becomes a Spotify embed with the note above it.

### Waking Up · en español — `waking-up.html`
CSS: `style.css`, `waking-up.css`. JS: `player.js`.
Builds 14 "days" in the browser, each with a meditation and a lesson (28 MP3s: 109 MB + 70 MB). Track titles, English subtitles and durations are listed in `player.js`. A fixed bottom player appears on first play: play/pause, previous/next, seek, time, cover art; sessions play one after another. The page is the Spanish-language companion to the Waking Up app (links to the app).

### Rare Retreats — `rare-retreats.html`
CSS: `style.css`, `rare-retreats.css`. A framed painting with a glowing halo and a "Coming soon" label, and Substack's embedded sign-up form. No JavaScript.

### Hello — `hello_world.html`
CSS: `hello.css`. A single card: portrait, name, title, five social links, and a QR code that points back to the page. The physical business card is designed in `media/hello/print/card.html` and rendered to PDF/PNG by `scripts/render-card.mjs` (Playwright, run by hand).

### 404 — `404.html`
A branded not-found page. Used by GitHub Pages now and by Cloudflare later (`not_found_handling: 404-page`).

---

## 6. JavaScript modules

All scripts are plain files that share the global scope, so **load order matters** and names must not collide.

| File | Used on | Role |
| --- | --- | --- |
| `reveal.js` | Home, Altar, Writing, Music | In `<head>`. Adds the `js` class and exposes `observeReveals(root)` for fade-ins |
| `main.js` | Home | Shared scroll handler, nav hide/show, scroll spy, hero bubbles, hero pause, patch captions |
| `lifeframe.js` | Home | Video carousel |
| `gallery-discovery.js` | Home, Altar | Loads `art-gallery.json`; `galleryImg()` builds responsive, lazily loaded `<img>`s |
| `gallery-preview.js` | Home | Random five-image collage |
| `gallery.js` | Altar | Wall, quotes, lightbox |
| `writing-data.js` | Home, Writing | Parses `writing.md`; builds essay list items |
| `writing-home.js` / `writing-archive.js` | Home / Writing | Fill the essay lists |
| `radio.js` | Music | Radio band (wrapped in an IIFE) |
| `music.js` | Music | Parses `music.md`; Spotify embeds |
| `music-preview.js` | Music | Waking Up preview player (IIFE) |
| `player.js` | Waking Up | Day list and audio player |

---

## 7. Data and content flows

| Data | Source | Reaches the page by |
| --- | --- | --- |
| Essays | Substack RSS → `scripts/sync-substack.mjs` → `writing.md` (committed) | Browser fetches and parses `writing.md` |
| Altar images | Files in `media/art-gallery/` | Action runs `scripts/build-gallery.mjs` → `art-gallery.json` + WebP copies, committed back to `main` |
| Quotes, music picks | `quotes.md`, `music.md` (hand-edited) | Browser fetches and parses them. All three `.md` formats are separator-based (`---`) with a template comment inside each file |
| Now playing | Spotify Web API | Worker → JSON → `radio.js` (below) |
| Subscriptions | Substack embed | Handled entirely by Substack |

**Radio data flow.** Browser → Worker every 25 s → the Worker's edge cache (20 s) answers if fresh → otherwise it exchanges its stored refresh token for a short-lived access token, asks Spotify what is playing, and returns one small normalized JSON object (`status` playing/recent, title, artist, album, url, 640 px cover, duration, progress). Songs only: podcasts fall through to the last played song. A 1-minute cron keeps a `last-live` KV key fresh so "Last played" doesn't go stale; every distinct track is also appended to a private per-day KV history, readable only with a secret token at `/history`.

---

## 8. The radio Worker — `worker/`

- **Runtime:** Cloudflare Worker (`now-playing.js`), config in `wrangler.toml`; deployed by hand with `cd worker && npx wrangler deploy` (a change there is not live until redeployed).
- **Secrets (names only; set with `wrangler secret put`):** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, `HISTORY_TOKEN`. One-time token minting: `scripts/spotify-auth.mjs`. Spotify scopes are read-only (currently playing, recently played).
- **Storage:** one KV namespace (`HISTORY`) holding the daily history and `last-live`.
- **Access control:** answers only GET/OPTIONS; CORS allowlist `ALLOWED_ORIGINS` (ramour.org, www, the GitHub Pages address, and two localhost ports). **Any new site address, including a Cloudflare test address, must be added there and redeployed, and added to `connect-src` in the page CSP, or the radio will be blocked.** `/history` returns a plain 404 without the token (constant-time comparison).
- **Failure behavior:** Spotify errors return 502 and the page simply hides the band.
- Full setup and privacy notes: `worker/README.md`.

---

## 9. Build, deployment and automation

- **Deploy:** push to `main` → GitHub Pages "pages build and deployment" (about 1–2 minutes). There is no build step; the repository root is the site. Browsers may keep old files up to about 10 minutes (Pages' default caching), and file names carry no version numbers.
- **Local preview:** any static file server from the repo root, for example `python3 -m http.server 8080`. The radio only works from `localhost:8080`/`8123` (Worker allowlist).
- **Workflows (`.github/workflows/`, all actions pinned to commit IDs):**
  - `build-gallery.yml`: on pushes touching `media/art-gallery/**`, the build script or the lockfile. Installs with `npm ci`, runs the build, commits changes as `github-actions[bot]`. Needs "Read and write" workflow permission.
  - `lighthouse.yml`: every push and pull request. Serves the repo statically, runs Lighthouse 3× on Home, Altar, Writing and Waking Up, asserts on the median, uploads reports as an artifact.
  - `sync-substack.yml`: manual only (the daily schedule is commented out). Runs `scripts/sync-substack.mjs` and commits `writing.md` if it changed.
  - `dependabot.yml`: weekly grouped updates for GitHub Actions and `scripts/` npm packages.
- **Scripts (`scripts/`, locked by `package-lock.json`):** `build-gallery.mjs` (sharp; hash-based so only new or changed images are re-encoded; stale copies deleted), `sync-substack.mjs` (no dependencies), `render-card.mjs` (Playwright, installed on demand), `spotify-auth.mjs`.
- **Prepared Cloudflare hosting:** `wrangler.jsonc` serves the repo folder as static assets, `_headers` adds security headers and caching rules, `.assetsignore` keeps tooling files out, `404.html` is the not-found page. Not deployed.

---

## 10. Performance design

- Self-hosted fonts split by character range; the hero font is preloaded; no third-party requests on page load except the Spotify and Substack embeds where they appear.
- WebP everywhere for photos; responsive `srcset`/`sizes`; 800 px tiles with 2000 px copies only for the lightbox; explicit `width`/`height` so nothing shifts.
- Nothing heavy loads early: videos use `preload="none"` and start near the screen; Altar images load as they approach; the Waking Up audio only on tap.
- Phones get 720p video and smaller image copies.
- Layout-shift guards: reserved heights for lists filled by JavaScript, tile shapes from the manifest, `min-height` on the empty Altar wall.
- Scroll cost: one throttled scroll listener, no layout reads in it, animations paused off screen, no animated `box-shadow`, no blend modes on animated layers.
- Caching: GitHub Pages defaults today; on Cloudflare, fonts cached for a year and media for a day with background refresh.
- **Gates (Lighthouse CI, `scripts/lighthouserc.json`):** accessibility, best practices and SEO ≥ 95 (errors); performance ≥ 90 (warning only, it varies between runs); largest contentful paint ≤ 4 s; layout shift ≤ 0.1; blocking time ≤ 600 ms.

---

## 11. Security design

- **Content Security Policy** on every page as a `<meta>` tag, identical everywhere and mirrored in `_headers`:

  | Directive | Allows |
  | --- | --- |
  | `default-src` (covers scripts and styles) | `'self'` only; no inline scripts or styles |
  | `img-src` | `'self'`, `https://i.scdn.co` (Spotify album art) |
  | `media-src` | `'self'`, `blob:` (the preview player) |
  | `connect-src` | `'self'`, the radio Worker's address |
  | `frame-src` | `https://open.spotify.com`, `https://ramour.substack.com` |
  | `object-src`, `base-uri`, `form-action` | none / `'self'` / `'self'` |
  | `upgrade-insecure-requests` | on |
  | `frame-ancestors 'none'` | header only (a meta tag can't enforce it), so it takes effect after the Cloudflare move |

- **No third-party scripts, trackers, fonts or CDNs of its own.** The only outside content is the Spotify and Substack embeds and Spotify album art.
- **Secrets** exist only as Worker secrets, never in the repository or the site. Spotify access is read-only.
- **Supply chain:** npm dependencies locked with integrity hashes and installed with `npm ci`; GitHub Actions pinned to commit IDs; Dependabot proposes updates; `npx --no-install` so a package can never be fetched by name.
- **Untrusted text** (markdown files, Spotify data) is inserted with `textContent`, not as HTML. `innerHTML` is used only with fixed strings from the site's own code (for example the Waking Up track list in `player.js`, and error messages).
- **Worker:** CORS allowlist, GET-only, token-guarded private route, edge caching so visitors can't drive Spotify call volume.
- **Limits of GitHub Pages:** no custom response headers (so no `frame-ancestors`, HSTS control or custom caching); this is the main reason to move to Cloudflare.

---

## 12. Accessibility and compatibility

- Semantic landmarks, one `<h1>` per page, ordered headings, labelled controls, and 24 px tap targets for the slide dots. Keyboard focus is visible (custom styles on the patches and Altar tiles, the browser's default elsewhere).
- The carousel and lightbox expose roles and labels; patch captions use a live region; the lightbox traps focus and restores it on close.
- `prefers-reduced-motion` disables the decorative motion. Without JavaScript the static content still shows, and pages built by script (Altar, Writing, Music, Waking Up) show an "Enable JavaScript" note.
- **Safari/iPhone lessons:** native `loading="lazy"` left images blank; a shared `<use>` for the patch outlines rendered white; `svh` units keep the hero stable when the toolbar collapses (with a `vh` fallback).

---

## 13. Third-party services

| Service | Used for | Notes |
| --- | --- | --- |
| GitHub Pages / Actions / Dependabot | Hosting, automation, update PRs | Free for public repos |
| Cloudflare Workers + KV | Radio back end | Cron every minute; Wrangler for deploys |
| Spotify | Web API (read-only) for the radio; embedded players; album art | |
| Substack | Essay feed (RSS), sign-up embed, profile links | |
| Waking Up | Outbound links and a gift-redemption link | |

---

## 14. Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10 | Altar reads a generated `art-gallery.json` instead of calling the GitHub API | The API allows only 60 requests an hour per visitor address, so the Altar failed for some visitors |
| 2026-10 | Resized WebP copies built by an Action, originals kept untouched | Phones were downloading 66 MB for the Altar |
| 2026-10 | Nav hides on scroll, with travel thresholds and overscroll guard | Free up phone screen space; first version flickered on jittery scrolling |
| 2026-10 | Removed `?v=` cache-busting numbers | They had drifted apart between pages |
| 2026-10 | Self-hosted fonts | Fewer connections and no visitor IPs sent to Google |
| 2026-10 | CSP via `<meta>` on every page, no inline code | Best available on GitHub Pages; stricter header version prepared |
| 2026-10 | Altar images loaded by IntersectionObserver, not `loading="lazy"` | Blank tiles in WebKit browsers |
| 2026-10 | Patch outlines kept inline per patch | White patches on Safari with a shared `<use>` |
| 2026-10 | Hero rays: removed blend mode, keep blur | Visually identical, cheaper to composite |
| 2026-10 | Prepared, but did not start, a Cloudflare move | Real headers and caching; waits on an owner decision |
| 2026-10 | Radio sends Spotify's 640 px cover; the saved "last played" entry is rewritten when its cover changes | Larger cover art stays sharp. The first version kept serving the old 300 px cover for a saved song until a different song played (needs a Worker redeploy) |

---

## 15. How to keep this file current

Update it in the same commit when you change any of:

1. **A page or feature** → §1 table, §5, and §6 if scripts change.
2. **Content or data flow** (new file format, source, job) → §7 and the "update without a developer" table.
3. **The Worker** (routes, secrets, storage, allowlist) → §8.
4. **Workflows, scripts, hosting or dependencies** → §2, §9 and §13.
5. **The CSP or any security control** → §11 (and keep `_headers` and every page in step).
6. **Performance limits or techniques** → §10.
7. **Design tokens** → §4.
8. **A notable decision** → add a row to §14 (date, decision, why).

Also refresh the **status line at the top**, and the **"Where it stands" numbers in §1** after any review. Keep §1 free of jargon: a product manager should be able to read it alone.
