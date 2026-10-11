# TODO

Open work for ramour.org. Tick items off (or delete them) when done, and add new ones here. Standards for all of it are in `CLAUDE.md`; run its review checklist after anything major.

## Needs the site owner

- [ ] Redeploy the radio Worker so the larger album art is sharp: `cd worker && npx wrangler deploy`. (The Worker now sends Spotify's 640px cover.)
- [ ] Open the Music page with the browser console open and check for any "Content Security Policy" error (Spotify embeds, album art, radio). Report what it says so the policy can be fixed.
- [ ] Try the homepage on a phone and say whether scrolling is still jumpy. If it is: which phone and browser, and what you see (nav bar appearing and disappearing, content shifting, or choppy scrolling).
- [ ] After the first image is added to `media/art-gallery/`, check that its "Build altar gallery" run succeeds. If it can't push, set Settings → Actions → General → Workflow permissions to "Read and write".
- [ ] Review the first Dependabot pull requests when they appear (weekly).

## Move hosting to Cloudflare (decision first)

Config is ready (`wrangler.jsonc`, `_headers`, `.assetsignore`, `404.html`) but not in use; the site is still on GitHub Pages. Benefits: real security headers (frame blocking, HSTS), longer caching, and a preview link for every branch.

- [ ] Decide whether to move.
- [ ] Add ramour.org to Cloudflare (this means changing the nameservers at the domain registrar).
- [ ] Connect this repo under Workers & Pages. No build command; deploy command `npx wrangler deploy`.
- [ ] Test on the temporary `*.workers.dev` address: headers, every page, radio, Spotify embeds.
- [ ] Add ramour.org as the custom domain. Only after that, turn off GitHub Pages and delete `CNAME`, so the domain never points at GitHub while Pages is off.
- [ ] Optional: Cloudflare Web Analytics (cookie-free). Needs a CSP update on every page and in `_headers`.
- [ ] Optional: serve the radio API from `ramour.org/api/…` and update `js/radio.js` and the CSP.

## Next up

- [ ] Altar on iPhones: all 69 images are decoded at once (about 100 million pixels at 3× density), which risks blank images or tab reloads. Load images only near the screen and release them when far away.
- [ ] Turn the Substack sync back on: its schedule is commented out in `.github/workflows/sync-substack.yml`, so new essays only appear when it's run by hand.
- [ ] Link previews: add Open Graph tags (`og:title`, `og:description`, `og:image`) to every page except `hello_world.html`, which has them.
- [ ] Shorten the Altar's 0.8 s image fade-in; it delays the first image to about 3.2 s in Lighthouse.
- [ ] Remove root files no page uses: `ra-mour-sun.jpeg` (identical copy in `media/art-gallery/`), `ramour_soul_pictures.jpg`, and the `eudaimonia-machine/` folder. Keep `soul-city-art.png`; it's the source for the portrait WebPs.

## Later

- [ ] Add a build step (Eleventy is the closest fit): content already in the HTML instead of built in the browser, fingerprinted file names for year-long caching, one image pipeline. Best done after the Cloudflare move.
- [ ] Move the media (about 300 MB, mostly Waking Up audio) to Cloudflare R2, served from `media.ramour.org`. Git LFS doesn't work with GitHub Pages.

## Ideas

- [ ] Waking Up player: lock-screen and headphone controls (Media Session API) and remembering where each session stopped.
- [ ] A line on each Altar piece saying why it's there, shown in the lightbox.
- [ ] Smooth page-to-page transitions (cross-document view transitions; Firefox just navigates normally).
- [ ] Swipe left and right on the Life carousel.
- [ ] A small "listening to…" line on the homepage from the radio Worker.
- [ ] A random Altar quote in the footer or hero.
- [ ] Start loading the Altar page when someone hovers its link.

## Decided against

- Patch shield outlines are repeated in each patch on purpose: reusing one definition showed white patches on Safari (commit `35dc6f2`).
