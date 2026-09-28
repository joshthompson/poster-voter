# Poster Voter

Two posters fly out, you pick your favourite, and then you see how everyone else voted on that pair. Every vote updates an Elo rating, and `/results` shows the live rankings.

- **Frontend:** SvelteKit (Svelte 5), static build for GitHub Pages
- **Backend:** Convex (`convex/`)

## Setup

```sh
pnpm install
pnpm dev            # first run: log in and create a Convex project; fills in .env.local
pnpm posters:sync   # optimise ./posters images and register them in Convex (run in a second terminal)
```

Then open the URL Vite prints.

## Credentials

| File              | Used by                        | Contents                                                        |
| ----------------- | ------------------------------ | --------------------------------------------------------------- |
| `.env.local`      | `pnpm dev`, `pnpm posters:sync` | `CONVEX_DEPLOYMENT`, `PUBLIC_CONVEX_URL` (dev deployment)      |
| `.env.production` | `deploy:*`, `ship`, `posters:sync:prod` | `CONVEX_DEPLOY_KEY` (prod), `BASE_PATH` (GitHub Pages path) |

See `.env.example`. Both files are gitignored.

## Posters

Put images (JPEG, PNG, WebP, or HEIC on macOS) in `posters/`, then run `pnpm posters:sync`. The script:

1. converts and resizes each image into `static/posters/` using macOS `sips`
2. upserts each poster in Convex, keyed by filename; posters whose files have been removed are deactivated, and their votes are kept

Titles default to the filename (`001.jpg` becomes "No. 1"). To set your own, add them to `posters/titles.json`:

```json
{ "001.jpg": "Bo Kaspers Orkester" }
```

`posters/` holds the originals and is gitignored. Commit `static/posters/`, which holds the optimised copies.

## Scripts

| Script                   | What it does                                                                  |
| ------------------------ | ----------------------------------------------------------------------------- |
| `pnpm dev`               | Convex dev and Vite dev server together                                        |
| `pnpm build`             | Optimise posters and build the static site into `build/`                       |
| `pnpm preview`           | Serve the production build locally                                             |
| `pnpm check`             | Typecheck                                                                      |
| `pnpm posters:sync`      | Sync posters to the dev deployment                                             |
| `pnpm posters:sync:prod` | Sync posters to the prod deployment                                            |
| `pnpm deploy:convex`     | Deploy Convex functions to prod                                                |
| `pnpm deploy:web`        | Deploy Convex, build against the prod URL, and push `build/` to the `gh-pages` branch |
| `pnpm ship`              | `deploy:web` and then `posters:sync:prod`                                       |

Note: `pnpm deploy` is a built-in pnpm command, so the full release script is called `ship`.

## Deploying to GitHub Pages

1. Create the GitHub repo and push: `git remote add origin … && git push -u origin main`
2. In `.env.production`, set `CONVEX_DEPLOY_KEY` (Convex dashboard → Settings → Deploy keys) and `BASE_PATH=/<repo-name>`. Leave `BASE_PATH` empty for a custom domain or a `<user>.github.io` repo.
3. Run `pnpm ship`
4. In the repo settings, go to Pages and set the source to "Deploy from a branch", branch **`gh-pages`**, folder `/ (root)`.

`404.html` is the SPA fallback, so deep links like `/results` work on GitHub Pages.
