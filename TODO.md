# TODO

Open work for ramour.org. Tick items off (or delete them) when done, and add new ones here. Standards for all of it are in `CLAUDE.md`; run its review checklist after anything major.

## Needs the site owner

- [ ] **Redesign: choose the public email address.** Replace `REPLACE-ME@ramour.org` in the Contact section of `index.html` (three places on two lines: the link, the text, the copy button). The "Site check" fails until it's done, so it can't slip out by accident.
- [ ] **Redesign: review it before it goes live.** Look at the screenshots attached to the "Site check" run of the redesign pull request, or the preview link (next item), on a phone and a computer. Read the new wording (intro, tiles, Rare Retreats page) and change anything that doesn't sound like you. Then merge the pull request.
- [ ] **One-time: turn on preview links** so every branch gets its own test address (steps in `ARCHITECTURE.md` §9, "Testing changes before they go live"). Then redeploy the radio Worker once (`cd worker && npx wrangler deploy --config wrangler.toml`) so the radio also plays on those addresses.
- [ ] Optional: turn the `classic-2026-10` branch (the pre-redesign site) into a tag or GitHub Release, so it can't be deleted by accident with other old branches.
- [ ] Redeploy the radio Worker so the larger album art is sharp: pull the latest `main`, then `cd worker && npx wrangler deploy --config wrangler.toml` (the flag matters: without it Wrangler deploys the website as `ramour-site` instead of the radio). (The Worker sends Spotify's 640px cover. A first redeploy still showed the old 300px cover for songs saved as "last played" before it; the fix is in `saveLastLive`.) After redeploying, play any song for a minute so the once-a-minute job refreshes the saved cover, then check the Music page.
- [ ] Open the Music page with the browser console open and check for any "Content Security Policy" error (Spotify embeds, album art, radio). Report what it says so the policy can be fixed.
- [ ] Try the homepage on a phone and say whether scrolling is still jumpy. If it is: which phone and browser, and what you see (nav bar appearing and disappearing, content shifting, or choppy scrolling).
- [ ] After the first image is added to `media/art-gallery/`, check that its "Build altar gallery" run succeeds. If it can't push, set Settings → Actions → General → Workflow permissions to "Read and write".
- [ ] Review the first Dependabot pull requests when they appear (weekly).

## Security patches

Dependabot alerts #1–#5 and #7 (Oct 2026) all come from the dev-only Lighthouse CI tool (`@lhci/cli` in `scripts/`). None reaches the live site, and the gallery build skips dev packages. Nothing is urgent.

- [x] Force patched `tmp` (0.2.7) and `uuid` (11.1.1) through `overrides` in `scripts/package.json`; clears #1, #2 and #3, and Lighthouse CI still passes. Once pushed, those alerts close on their own. Drop the overrides when `@lhci/cli` ships with patched versions.
- [ ] Dismiss #4, #5 (`extract-zip`) and #7 (`sprintf-js`) in GitHub as "no fix available / not used", since neither has a patched release. Re-check when `@lhci/cli` or `lighthouse` publishes an update that drops them.
- Don't run `npm audit fix --force`: it would downgrade `@lhci/cli` to 0.1.0.

## Move hosting to Cloudflare (decision first)

Config is ready (`wrangler.jsonc`, `_headers`, `.assetsignore`, `404.html`) but not in use; the site is still on GitHub Pages. Benefits: real security headers (frame blocking, HSTS), longer caching, and a preview link for every branch.

- [ ] Decide whether to move.
- [ ] Add ramour.org to Cloudflare (this means changing the nameservers at the domain registrar).
- [ ] Connect this repo under Workers & Pages. No build command; deploy command `npx wrangler deploy`.
- [ ] Test on the temporary `*.workers.dev` address: headers, every page, Spotify embeds. The radio will be blocked there until that address is added to `ALLOWED_ORIGINS` in `worker/now-playing.js` (redeploy the Worker) and to `connect-src` in the page policy; skip it or add both.
- [ ] Add ramour.org as the custom domain. Only after that, turn off GitHub Pages and delete `CNAME`, so the domain never points at GitHub while Pages is off.
- [ ] Optional: Cloudflare Web Analytics (cookie-free). Needs a CSP update on every page and in `_headers`.
- [ ] Optional: serve the radio API from `ramour.org/api/…` and update `js/radio.js` and the CSP.
- [ ] Restrict the Music page to approved people with Cloudflare Access (after the move; the page is public until then). Check Access's current free-tier limits first. Plan:
  - In Zero Trust, add a self-hosted application for `ramour.org/music*`, with an Allow policy listing the approved email addresses (visitors sign in with a one-time code sent by email).
  - Cover everything the page uses, not just `music.html`: `music.md`, `media/waking-up/*`, and the radio API. That means serving the radio from `ramour.org/api/…` (item above) and putting it behind the same policy.
  - Add `noindex` to `music.html`, and test with an approved and a non-approved email, including the Spotify embeds and radio.
  - The page would also need a way back home for people who aren't approved; decide what they see.

## Next up

- [x] The homepage links to Writing again, through the header and a Writing tile (the redesign). The latest-essays list stays off the homepage.
- [ ] Delete `js/writing-home.js` (nothing loads it since the latest-essays list left the homepage), unless the list is coming back.
- [ ] Altar on iPhones: all 69 images are decoded at once (about 100 million pixels at 3× density), which risks blank images or tab reloads. Load images only near the screen and release them when far away.
- [ ] Turn the Substack sync back on: its schedule is commented out in `.github/workflows/sync-substack.yml`, so new essays only appear when it's run by hand.
- [ ] Link previews: add Open Graph tags (`og:title`, `og:description`, `og:image`) to every page except `hello_world.html`, which has them.
- [x] Shorten the Altar's 0.8 s image fade-in (now 0.3 s).
- [ ] Remove files no page uses: in the repo root `ra-mour-sun.jpeg` (identical copy in `media/art-gallery/`), `ramour_soul_pictures.jpg` and the `eudaimonia-machine/` folder; in `media/` the `gallery-archive/` folder (16 MB), `the-whirlwind-of-lovers-blake.jpg`, `hello/qr.png` (the page uses `qr.svg`) and the eight organization logos other than `logos/wakingup.png` (they belonged to the removed Work section; keep them if it's coming back). Keep `soul-city-art.png` (source for the portrait WebPs) and the three `media/*.jpg` video posters if you want sources for the WebP posters.
- [x] Rare Retreats loads the resized WebP copies of the Tower of Babel instead of the 3 MB original (the redesign).
- [ ] Once Rare Retreats has a date, a place or a price, put it on the Rare Retreats page and tile: specific facts convert better than "coming soon".
- [ ] Consider showing the live "On air" song on the homepage Music tile (the radio Worker already allows it; the CSP too).

## Later

- [ ] Add a build step (Eleventy is the closest fit): content already in the HTML instead of built in the browser, fingerprinted file names for year-long caching, one image pipeline. Best done after the Cloudflare move.
- [ ] Move the media (about 300 MB, mostly Waking Up audio) to Cloudflare R2, served from `media.ramour.org`. Git LFS doesn't work with GitHub Pages.

## Ideas

- [ ] Waking Up player: lock-screen and headphone controls (Media Session API) and remembering where each session stopped.
- [ ] A line on each Altar piece saying why it's there, shown in the lightbox.
- [ ] Smooth page-to-page transitions (cross-document view transitions; Firefox just navigates normally).
- [ ] Swipe left and right on the Life carousel.
- [ ] A random Altar quote in the footer or hero.
- [ ] Start loading the Altar page when someone hovers its link.

## Decided against

- Patch shield outlines are repeated in each patch on purpose: reusing one definition showed white patches on Safari (commit `35dc6f2`).
