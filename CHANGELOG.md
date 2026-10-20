# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-21

### Added
- SQLite persistence (built-in `node:sqlite` or `better-sqlite3`) with an atomic JSON-file fallback (`STORE_DRIVER`).
- Real channel drivers: X API v2 with OAuth 1.0a signing or an OAuth 2.0 user token, and threads as reply chains; LinkedIn UGC; Reddit password-grant or token auth; Bluesky AT Protocol with link and hashtag facets; HMAC-signed webhooks.
- Explicit `sandbox` channel type and a global `SANDBOX_MODE`. Sandbox results are labelled and never include fake URLs.
- AI providers: OpenAI (and compatible endpoints), Anthropic, Google Gemini and Ollama, with a deterministic offline heuristic fallback that records why it was used.
- In-process scheduler with per-channel delivery logs, retries with exponential backoff, and partial/failed states.
- Autopilot cadence slot filling over a 1 to 14 day horizon, plus evergreen topic recycling.
- New dashboard served by the API: overview, composer with per-platform overrides and counters, queue, calendar, channels and autopilot.
- Optional `API_TOKEN` bearer auth, `cli.js tick` for cron, and a Docker healthcheck with a non-root user.
- Test suite (`node --test`), ESLint, CI on Node 20, 22 and 24, Docker build check, Dependabot.
- Next.js landing site on GitHub Pages, wiki docs, OpenAPI spec, llms.txt, CITATION.cff and community files.

### Removed
- All seeded demo channels, posts and topics, and the hard-coded analytics (`totalPublished: 142` and others). See [AUDIT.md](AUDIT.md).
- `credentials` stored in the database.
- The localStorage-only `open_post.html`, replaced by the API-backed dashboard in `public/`.
- `node-cron`, `cors` and `dotenv` dependencies.

## [1.0.0] - 2026-10-20

- Initial prototype: Express server, autopilot templates, channel adapters and a standalone HTML app. Publishing was simulated by default.

[1.1.0]: https://github.com/CodesbyFebin/Open-Post/compare/6dceaef...v1.1.0
[1.0.0]: https://github.com/CodesbyFebin/Open-Post/commit/6dceaef
