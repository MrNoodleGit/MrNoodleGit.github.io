#!/usr/bin/env node
/* One-time helper: mints the Spotify refresh token the Worker needs.
 *
 *   node scripts/spotify-auth.mjs <client-id> <client-secret>
 *
 * Register http://127.0.0.1:8888/callback as a Redirect URI on the app first
 * (Spotify's dashboard rejects "localhost" — it wants the loopback IP).
 *
 * Nothing here is stored: the refresh token is printed once, and you paste it
 * into `npx wrangler secret put SPOTIFY_REFRESH_TOKEN`.
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-recently-played";

const [clientId, clientSecret] = process.argv.slice(2);

if (!clientId || !clientSecret) {
  console.error("Usage: node scripts/spotify-auth.mjs <client-id> <client-secret>");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");

const authorizeUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });

async function exchange(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || JSON.stringify(data));
  return data.refresh_token;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Spotify said: ${error}`);
    console.error(`\nAuthorization denied: ${error}`);
    server.close();
    process.exitCode = 1;
    return;
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end("State mismatch.");
    console.error("\nState mismatch — ignoring this callback.");
    return;
  }

  try {
    const refreshToken = await exchange(url.searchParams.get("code"));
    res.writeHead(200, { "Content-Type": "text/plain" }).end(
      "Done. Refresh token printed in your terminal — you can close this tab."
    );
    console.log("\nRefresh token:\n");
    console.log(refreshToken);
    console.log("\nNow run:  npx wrangler secret put SPOTIFY_REFRESH_TOKEN\n");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end(String(err.message));
    console.error(`\nToken exchange failed: ${err.message}`);
    process.exitCode = 1;
  }

  server.close();
});

server.listen(8888, "127.0.0.1", () => {
  console.log("Open this in your browser and approve:\n");
  console.log(authorizeUrl + "\n");
  console.log("Waiting on http://127.0.0.1:8888/callback …");
});
