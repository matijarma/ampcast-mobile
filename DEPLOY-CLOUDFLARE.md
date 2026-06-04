# Deploying ampcast to Cloudflare Pages (via GitHub)

This fork is set up so the **whole repository** deploys to Cloudflare Pages with a
Git connection. The webpack `pwa` build produces a fully static app; an optional
Pages Function provides the `/proxy-login` endpoint.

## One-time setup

1. **Push this repository to GitHub** (the whole repo — `src/` alone cannot build).

2. **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**, pick the repo.

3. **Build settings**:

   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build:pwa` |
   | Build output directory | `app/www` |

   The output directory is also declared in [`wrangler.jsonc`](./wrangler.jsonc)
   (`pages_build_output_dir`). Node 24 is selected automatically via
   [`.node-version`](./.node-version).

4. **Environment variables** (Settings → Environment variables) — all optional.
   These are **baked into the bundle at build time** (the `pwa` build target), so
   changing them requires a redeploy (Deployments → Retry / new commit):

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

   See [`.env.example`](./.env.example) for details. Personal media servers
   (Jellyfin/Navidrome/…) need **no** configuration here — users connect to their
   server from the app UI, exactly like the desktop build.

5. **Deploy.** Every push to the production branch rebuilds and deploys.
   `https://<project>.pages.dev` (add a custom domain in the dashboard if wanted).

## What's wired up in this repo

| File | Role |
|---|---|
| `wrangler.jsonc` | Pages project config (`pages_build_output_dir: app/www`) |
| `.node-version` | Pins the Pages build image to Node 24 (`engines` requires ≥24) |
| `app/www/_headers` | Caching: immutable for versioned `/v*` assets; no-cache for `index.html`, `manifest.json` and the service workers (so updates propagate) |
| `app/www/404.html` | Served automatically by Pages for unknown routes |
| `functions/proxy-login.js` | Pages Function port of the Node `proxy-login.js` (see below) |
| `.gitignore` | Build artifacts (`app/www/v*/`, generated `index.html`, service workers) are not committed — Pages builds them from source |

## How this differs from the Node server (`server.js`)

`server.js` has three jobs; here is where each one went:

1. **Static file serving** → Cloudflare Pages CDN (native).
2. **Serve-time `%KEY%` substitution in `bundle.js`** → not needed: the `pwa`
   build target bakes the env vars in at **build time** (the placeholders only
   exist in `dev`/`docker` builds).
3. **`/proxy-login`** (automated login for *pre-configured* personal media
   servers) → `functions/proxy-login.js`. Caveats:
   - Pre-configuring servers via `JELLYFIN_HOST` etc. is a serve-time feature of
     the `docker` target and is **not available** in this static deployment, so
     the stock client never calls `/proxy-login`. The Function is included for
     parity/future use; set `<SERVER>_USER` / `<SERVER>_PASSWORD` as **secrets**
     if you ever enable that flow.
   - Running on Cloudflare's edge, it can only reach media servers that are
     **publicly reachable** (not `localhost`/LAN).

## Notes & gotchas

- **PWA/service worker**: production builds register `service-worker-v2.js`;
  `_headers` keeps it `no-cache` so new versions are picked up promptly. Users
  may still need one extra reload to activate an update (standard SW behavior).
- **CORS**: the app talks to media servers directly from the browser. Your
  Jellyfin/Navidrome must be reachable over **HTTPS** from wherever the app is
  served (same as today).
- **OAuth redirect URLs**: if you configure Spotify/Google/etc. client IDs,
  register the deployed origin (e.g. `https://<project>.pages.dev` or your
  custom domain) in each provider's allowed redirect/origin settings. The static
  callback pages live under `app/www/auth/`.
- **Local preview of the production build**:

  ```bash
  npm run build:pwa
  npx wrangler pages dev app/www
  ```

  (Serves the static output + the `/proxy-login` Function on `localhost:8788`.)
