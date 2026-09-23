# Ra Mour Radio — setup

The site is static, so it can't hold Spotify credentials: anything in the page
is readable by anyone who views source. This Worker holds them instead and
hands the browser one small JSON answer.

Roughly ten minutes, once. Until it's done the radio band stays hidden and the
Music page looks exactly as it did before — nothing here breaks the live site.

## 1. Register the Spotify app

1. Go to <https://developer.spotify.com/dashboard> and **Create app**.
2. Name it anything (`Ra Mour Radio`).
3. Add **Redirect URI**: `http://127.0.0.1:8888/callback`
   — the literal loopback IP, not `localhost`; Spotify rejects `localhost`.
4. Select the **Web API** checkbox and save.
5. Copy the **Client ID** and **Client Secret** from Settings.

The app stays in development mode. That's fine — you are its only user.

## 2. Mint a refresh token

```sh
node scripts/spotify-auth.mjs <client-id> <client-secret>
```

Or, if you'd rather not put credentials on the command line (they land in
shell history), put them in a `.env` file — either at the repo root or
`worker/.env`, both git-ignored — and run the script with no arguments:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

```sh
node scripts/spotify-auth.mjs
```

Either way, it prints an authorization URL. Open it, approve, and the script
prints a refresh token. That token doesn't expire; the Worker trades it for a
fresh hour-long access token whenever it needs one.

The scopes requested are `user-read-currently-playing` and
`user-read-recently-played` — read-only, no playback control, no library
access.

## 3. Deploy the Worker

```sh
cd worker
npx wrangler login
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
npx wrangler secret put SPOTIFY_REFRESH_TOKEN

# Private listen-history log — create the KV namespace, paste the id it
# prints into wrangler.toml, then pick any random string as your token:
npx wrangler kv namespace create HISTORY
npx wrangler secret put HISTORY_TOKEN

npx wrangler deploy
```

Wrangler prints the deployed URL, something like
`https://ra-mour-radio.<your-subdomain>.workers.dev`.

Check it:

```sh
curl https://ra-mour-radio.<your-subdomain>.workers.dev
```

## 4. Point the site at it

In `js/radio.js`, replace the placeholder on line 13:

```js
const ENDPOINT = "https://ra-mour-radio.<your-subdomain>.workers.dev";
```

Commit and push. Done.

## What the page shows

| Spotify says | The band shows |
| --- | --- |
| a song playing | **On air**, crimson dot, waveform filling in real time |
| a song paused | **Last played**, that song |
| a podcast episode | **Last played**, the last actual *song* — episodes never appear |
| nothing playing | **Last played**, from recently-played, with "about 3 hours ago" |
| nothing at all, or an error | the band hides itself; the page reads as if it were never there |

## Listen history

Every distinct track the Worker sees (playing or last-played) gets appended to
a private Cloudflare KV log, grouped by day, deduplicated so repeated polls of
the same song don't create repeat entries. It's never included in the public
JSON the page reads.

A 1-minute cron (`[triggers]` in `wrangler.toml`, running `scheduled()`)
independently asks Spotify what's live and, when a real song is actively
playing and it's changed, saves it to the `last-live` KV key. `now-playing`
reads that key whenever nothing is actively playing (paused, a podcast, or
silent) so "Last played" stays current between page visits, instead of
drifting for hours on Spotify's `recently-played`, which is only used as a
last resort when `last-live` is still empty.

To read it back yourself:

```sh
curl "https://ra-mour-radio.<your-subdomain>.workers.dev/history?token=<HISTORY_TOKEN>"
```

Returns `{"history:2026-09-19": [{title, artist, album, url, at}, ...], ...}`
for every day logged so far. Anyone without the token gets a plain 404, same
as a route that doesn't exist.

## Notes

- **The Worker's allowlist.** `ALLOWED_ORIGINS` in `now-playing.js` lists the
  origins allowed to read it. If the site moves domains, add it there and
  redeploy, or the browser will block the response.
- **Load.** Answers are edge-cached for 20s and the page polls every 25s, so
  visitor count barely affects how often Spotify is called. A backgrounded tab
  stops polling entirely.
- **Privacy.** This publishes your listening to anyone who opens the Music
  page, live. To go dark, delete the `SPOTIFY_REFRESH_TOKEN` secret (or revoke
  the app at <https://www.spotify.com/account/apps/>) — the Worker starts
  failing, and the band hides itself.
