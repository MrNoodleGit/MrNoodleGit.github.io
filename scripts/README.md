# scripts/

Small Node scripts run by GitHub Actions to keep parts of the site in sync.
No dependencies, no build step — just `node <script>.mjs` on Node 20.

- **sync-substack.mjs** — regenerates `writing.md` from the Substack RSS
  feed. Run by `.github/workflows/sync-substack.yml`.
- **post-instagram.mjs** — posts one image+caption pair to Instagram,
  picked from `quotes.md` entries tagged with an `image:` line. Triggered
  manually by `.github/workflows/post-instagram.yml` — tag a quote,
  push, then run the workflow from the Actions tab when you're ready to
  post. See that file's header comment for how the posting queue and
  token renewal work.
- **refresh-ig-token.mjs** — manual helper to refresh the long-lived
  Instagram access token before it expires (~every 60 days).

## post-instagram.mjs — one-time setup (manual, cannot be automated)

The workflow can't run successfully until these are done by hand:

- [ ] Convert the target Instagram account to a Business or Creator account
- [ ] Link that Instagram account to a Facebook Page you control
- [ ] Create a Meta developer app (developers.facebook.com) with
      Instagram Graph API access, added to that Page
- [ ] Generate a long-lived access token with `instagram_basic` and
      `instagram_content_publish` permissions
- [ ] Find the Instagram Business Account's numeric user ID (Graph API
      Explorer: `GET /me/accounts`, then the linked Page's
      `instagram_business_account.id`)
- [ ] Add two repo secrets under Settings → Secrets and variables →
      Actions:
      - `IG_ACCESS_TOKEN` — the long-lived token above
      - `IG_USER_ID` — the numeric ID above
- [ ] Tag at least one `quotes.md` entry with an `image:` line pointing
      at a JPG/PNG file already in `media/art-gallery/` (see the
      template at the top of `quotes.md`)

Once all boxes are checked: tag a `quotes.md` entry with `image:`, push
to `main`, then trigger `.github/workflows/post-instagram.yml` yourself
from the Actions tab → "Post to Instagram" → Run workflow — it's manual
only, there's no automatic schedule. Use `node scripts/post-instagram.mjs
--dry-run` locally first to confirm an image URL and token work without
actually publishing — Instagram has no separate sandbox/test-post mode.

Tokens expire after ~60 days — see `post-instagram.mjs`'s header comment
and `refresh-ig-token.mjs` for renewal.
