#!/usr/bin/env node
// One-off manual helper: exchanges a still-valid long-lived Instagram
// access token for a fresh ~60-day one. Run this every ~45 days (well
// before the 60-day expiry) rather than waiting for it to break, then
// paste the printed token into the IG_ACCESS_TOKEN GitHub Actions secret
// by hand — this script does NOT write secrets itself.
//
// Usage:
//   IG_ACCESS_TOKEN=<current token> node scripts/refresh-ig-token.mjs
//
// Which endpoint applies depends on how the token was originally issued
// (a one-time thing to check while doing the setup checklist in
// scripts/README.md):
//   - Instagram Login token -> graph.instagram.com/refresh_access_token
//     (used below)
//   - Facebook Login / Business token -> graph.facebook.com's
//     fb_exchange_token flow instead, which needs the app ID and app
//     secret rather than just the current token:
//       GET https://graph.facebook.com/v19.0/oauth/access_token
//         ?grant_type=fb_exchange_token&client_id=<APP_ID>
//         &client_secret=<APP_SECRET>&fb_exchange_token=<CURRENT_TOKEN>

const token = process.env.IG_ACCESS_TOKEN;
if (!token) {
  console.error("Set IG_ACCESS_TOKEN in the environment.");
  process.exit(1);
}

const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
const res = await fetch(url);
const body = await res.json();

if (!res.ok) {
  console.error("Refresh failed:", body.error?.message ?? JSON.stringify(body));
  process.exit(1);
}

console.log("New long-lived token (copy into the IG_ACCESS_TOKEN secret):");
console.log(body.access_token);
console.log(`Expires in ~${Math.round((body.expires_in ?? 0) / 86400)} days.`);
