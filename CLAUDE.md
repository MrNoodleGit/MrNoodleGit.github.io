# ramour.org

Keep this site at top performance, code quality, and security. Do reviews after major changes.

Open work is in `TODO.md`. Keep it current: tick items off when done and add new ones as they come up.

The software architecture, technology and feature outline is in `ARCHITECTURE.md`, starting with a summary a product manager can read. Update it in the same commit as any change it describes (the rules are at the end of that file).

## What a review means here

"Major" = a new page or feature, a change to scripts, the CSP, workflows, the radio Worker or hosting, or a dependency update. After one:

1. Run the code-review and security-review skills on the change.
2. Run Lighthouse CI (limits in `scripts/lighthouserc.json`, also runs on every push):
   `npm ci --prefix scripts` then `npx --no-install --prefix scripts lhci autorun --config=scripts/lighthouserc.json`
3. Load every page in a browser at phone width and desktop width. There must be no console errors and no Content Security Policy violations.
4. Check that no layout shifts or scroll jumps were introduced (iPhone Safari is the browser most likely to show them).

## How the site works

- Plain HTML, CSS and JS. There is no build step for the site itself. Hosted on GitHub Pages at ramour.org; `wrangler.jsonc`, `_headers` and `.assetsignore` are prepared for a move to Cloudflare but are not in use yet.
- Content comes from `writing.md`, `music.md` and `quotes.md`, which the pages read in the browser.
- `media/art-gallery/` holds the Altar images. The "Build altar gallery" Action makes `media/art-gallery.json` and the resized copies in `media/art-gallery-thumbs/` and `media/art-gallery-large/`. Never edit those by hand.
- `scripts/` holds tools (gallery build, Substack sync, card render, Spotify auth) and their locked dependencies. `worker/` is the radio Cloudflare Worker; it is deployed by hand with `cd worker && npx wrangler deploy`, so a change there needs the owner to redeploy.

## Rules that keep it fast, clean and safe

- **CSP:** every page has the same Content Security Policy in a `<meta>` tag, mirrored in `_headers`. No inline scripts or styles; put them in the `.js` and `.css` files. Adding an outside service means updating the policy in every page and in `_headers`.
- **No new third-party code, fonts, trackers or CDNs** without a clear reason. Fonts are self-hosted (`fonts/`, `css/fonts.css`).
- **Images and video:** use WebP, give images `width` and `height`, size them for what is shown, and keep the 720p copies of the Life videos in step with the originals. Nothing should load until it is near the screen.
- **No `?v=` cache-busting numbers** on files.
- **Dependencies:** keep them locked; install with `npm ci`. GitHub Actions are pinned to exact commit IDs (Dependabot proposes updates). Run npx with `--no-install` so it can never download a package by name.
- **Performance budget:** Lighthouse accessibility, best practices and SEO at 95 or more; layout shift 0.1 or less; largest paint 4 s or less.
- **Scroll handlers:** use one passive listener that works at most once per frame, and don't read layout inside scroll events. Animations must pause when off screen and respect `prefers-reduced-motion`.
- **Safari/iPhone:** native `loading="lazy"` left images blank there; the Altar loads images with an IntersectionObserver instead.
