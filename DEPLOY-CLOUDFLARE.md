# Deploying ampcast to Cloudflare (Workers Builds, via GitHub)

This fork deploys to Cloudflare as a **Worker with static assets** — the model used by
Cloudflare's Git integration ("Import a repository"). The webpack `pwa` build produces
a fully static app served from the edge; a tiny Worker (`worker/index.js`) handles the
one dynamic endpoint (`/proxy-login`).

## One-time setup

1. **Push this repository to GitHub** (the whole repo — `src/` alone cannot build).

2. **Cloudflare Dashboard → Workers & Pages → Create → import your Git repository.**

3. **Build configuration** (Settings → Build, or during creation):

   | Setting | Value |
   |---|---|
   | Build command | `npm run build:pwa` |
   | Deploy command | `npx wrangler deploy` |

   Everything else comes from [`wrangler.jsonc`](./wrangler.jsonc): the Worker entry
   (`worker/index.js`) and the static assets directory (`app/www`). Node 24 is picked
   up from [`.node-version`](./.node-version).

   > ⚠️ The **build command must run before deploy** — `wrangler deploy` uploads
   > whatever is in `app/www`, and the versioned bundles only exist after
   > `npm run build:pwa`.

4. **Build-time environment variables** (Settings → Build → Variables) — all optional.
   These are **baked into the bundle at build time** (the `pwa` build target), so
   changing them requires a redeploy:

   | Variable | Purpose |
   |---|---|
   | `APPLE_MUSIC_DEV_TOKEN` | Apple Music |
   | `GOOGLE_CLIENT_ID` | YouTube |
   | `IBROADCAST_CLIENT_ID` | iBroadcast |
   | `LASTFM_API_KEY` / `LASTFM_API_SECRET` | last.fm scrobbling |
   | `SPOTIFY_CLIENT_ID` | Spotify |
   | `TIDAL_CLIENT_ID` | TIDAL |
   | `ENABLED_SERVICES` | Comma-separated service allow-list (blank = all) |
   | `STARTUP_SERVICES` | Initially visible services (blank = startup wizard) |

   See [`.env.example`](./.env.example). Personal media servers (Jellyfin/Navidrome/…)
   need **no** configuration here — users connect from the app UI, like the desktop build.

5. **Deploy.** Every push to the production branch rebuilds and deploys to
   `https://ampcast.<your-subdomain>.workers.dev` (add a custom domain in the
   dashboard if wanted).

## What's wired up in this repo

| File | Role |
|---|---|
| `wrangler.jsonc` | Worker config: `main: worker/index.js`, static `assets.directory: app/www`, `not_found_handling: 404-page` |
| `worker/index.js` | Serves `/proxy-login`; everything else falls through to static assets |
| `.node-version` | Pins the build image to Node 24 (`engines` requires ≥24) |
| `app/www/_headers` | Caching: immutable for versioned `/v*` assets; no-cache for `index.html`, `manifest.json` and the service workers (so updates propagate) |
| `app/www/404.html` | Used by `not_found_handling: "404-page"` |
| `.gitignore` | Build artifacts (`app/www/v*/`, generated `index.html`, service workers) are not committed — Cloudflare builds them from source |

## How this differs from the Node server (`server.js`)

`server.js` has three jobs; here is where each one went:

1. **Static file serving** → Workers static assets (requests matching a file never
   invoke the Worker, and are free).
2. **Serve-time `%KEY%` substitution in `bundle.js`** → not needed: the `pwa` build
   target bakes the env vars in at **build time** (placeholders only exist in
   `dev`/`docker` builds).
3. **`/proxy-login`** (automated login for *pre-configured* personal media servers) →
   `worker/index.js`. Caveats:
   - Pre-configuring servers via `JELLYFIN_HOST` etc. is a serve-time feature of the
     `docker` target and is **not available** in this static deployment, so the stock
     client never calls `/proxy-login`. It's included for parity/future use; set
     `<SERVER>_USER` / `<SERVER>_PASSWORD` as **Worker secrets** if you enable that flow.
   - Running on Cloudflare's edge, it can only reach media servers that are
     **publicly reachable** (not `localhost`/LAN).

## Notes & gotchas

- **PWA/service worker**: production builds register `service-worker-v2.js`, which
  precaches the app shell — so the installed app also **launches offline**;
  `_headers` keeps it `no-cache` so new versions are picked up promptly.
- **CORS**: the app talks to media servers directly from the browser. Your
  Jellyfin/Navidrome must be reachable over **HTTPS** from wherever the app is served.
- **OAuth redirect URLs**: if you configure Spotify/Google/etc. client IDs, register
  the deployed origin in each provider's allowed redirect/origin settings. The static
  callback pages live under `app/www/auth/`.
- **Local preview of the production build**:

  ```bash
  npm run build:pwa
  npx wrangler dev
  ```

  (Serves the static output + the `/proxy-login` Worker on `localhost:8787`.)
