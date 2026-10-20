# Contributing to Open Post

Thanks for helping. Open Post is meant to stay small and readable, so focused changes with tests are the easiest to merge.

## Development setup

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
npm install
cp .env.example .env      # SANDBOX_MODE=true is a good default while developing
npm run dev               # restarts on file changes
npm test                  # node --test
npm run lint              # eslint
```

The landing site lives in `site/` (Next.js, static export):

```bash
cd site && npm install && NEXT_PUBLIC_BASE_PATH= npx next dev
```

## Project layout

| Path | What it does |
| --- | --- |
| `server.js` | Entrypoint: loads `.env`, opens the store, starts HTTP and the scheduler |
| `cli.js` | One-shot `tick`, for cron or systemd timers |
| `src/app.js` | Express routes and auth |
| `src/service.js` | Domain logic: channels, posts, publishing, retries, autopilot |
| `src/drivers/` | One function per network; secrets come from env vars |
| `src/llm/` | AI providers and the heuristic generator |
| `src/store.js` | SQLite (`node:sqlite` / `better-sqlite3`) or JSON persistence |
| `public/` | Dashboard (vanilla JS, no build step) |
| `test/` | `node --test` suites; network calls are faked at the `fetch` boundary |
| `docs/` | Source of the GitHub Wiki pages |
| `site/` | Landing site |

## Guidelines

- **No new runtime dependencies** unless they clearly pay their way. Express is currently the only one.
- **Never store secrets** in the database or return them from the API.
- **No fake data**: no seeded demo posts, no invented metrics, no placeholder URLs presented as real.
- **Add a test** for every driver change or bug fix. Fake the HTTP layer by injecting `fetch` (see `test/helpers.js`). Don't call real networks in CI.
- Keep functions small and error messages actionable. Tell the user which env var is missing.
- Use [Conventional Commits](https://www.conventionalcommits.org/) style messages where you can (`feat:`, `fix:`, `docs:`).

## Adding a channel driver

1. Add `publishFoo(channel, post, { fetch, env })` in `src/drivers/index.js`. It should return `{ remoteId, url }` or throw.
2. Register it in `DRIVERS`, `DEFAULT_PREFIX` and `REQUIRED`.
3. Add its env vars to `.env.example` and `docs/Channels.md`.
4. Add a test in `test/drivers.test.js` that checks the exact request it sends.

## Pull requests

- Fill in the PR template, link the issue, and include screenshots for UI changes.
- CI must pass: lint, tests on Node 20, 22 and 24, the Docker build and the site build.
- By contributing you agree your work is released under the MIT License.
