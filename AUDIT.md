# Mock / Stub Audit (v1.0.0 → v1.1.0)

This file lists everything in the v1.0.0 import (commit `6dceaef`) that was mocked, simulated, hard-coded, stubbed or overstated, and how v1.1.0 fixes it. It's here so users can trust that nothing in the current app is faked.

**Rule going forward:** no seeded demo data, no invented numbers, no fake URLs. A test (`test/api.test.js`) asserts that a fresh install has zero channels and zero posts.

## Server (`server.js`)

| # | What was mocked / stubbed | Fix in v1.1.0 |
| - | --- | --- |
| S1 | First boot seeded four fake channels (`@openpost_app`, `Open Post Inc`, `u/openpost_bot`, `openpost.bsky.social`), each with `credentials: { mock: true }` and `connected: true`. | Removed. A fresh database starts empty, and channels only exist once you create them. |
| S2 | A seeded "launch" post and four seeded topics making unverified claims ("saves $2,000/yr", "3GB to 45MB"). | Removed. The topic queue starts empty. |
| S3 | `analytics` was hard-coded to `totalPublished: 142, totalEngagements: 18450, averageReach: 4210, topPlatform: 'X (Twitter)'`. | `GET /api/analytics` is computed from real posts and delivery logs. Engagement and reach aren't collected, so they aren't shown. |
| S4 | `POST /api/channels` defaulted `credentials` to `{ mock: true }`, so every new channel silently simulated publishing. | There's no implicit mock. Real channel types need real env vars, and sandboxing is opt-in only (`type: "sandbox"` or `SANDBOX_MODE=true`). |
| S5 | Channel secrets were stored in plaintext in the JSON database and returned by `GET /api/channels`. | Secrets come **only from env vars** (`<PREFIX>_<KEY>`). The API rejects `credentials` in payloads, and responses only list which variable *names* are present or missing. |
| S6 | Claimed "SQLite", but actually read and rewrote one JSON file on every request. A corrupt file silently returned a blank schema, so the next save wiped the data. | `src/store.js` uses `node:sqlite` (Node 22+) or `better-sqlite3`, with an atomic-rename JSON fallback. A corrupt JSON store now fails loudly instead of being overwritten. |
| S7 | `generate-now` hard-coded `targetChannels: ['twitter','linkedin']` and fallback channel IDs `['ch_x','ch_li']`. | Uses the autopilot's configured `channelIds`, and returns 400 if none are set. |
| S8 | No validation: posts could be created with unknown channels, empty content or invalid dates. `PUT` merged any field, including `id`. | Validation on create and update (content, channels, status and dates). Only whitelisted fields can be updated. |
| S9 | The scheduler marked a post `published` if *any* channel succeeded. It had no retries and no in-flight lock, so overlapping cron runs could double-post. | Per-channel delivery log; only failed channels are retried, with backoff of 1, 2 and 4 minutes; states are `published`, `partial` and `failed`; an in-flight lock and a single-tick guard prevent overlaps. |
| S10 | `express.static('public')` pointed at a folder that didn't exist, so there was no dashboard. | `public/` now holds the real dashboard, served by the same process. |
| S11 | `npm run seed` pointed to a missing `seed.js`. `npm run autopilot` passed a `--run-once` flag nothing implemented. | Removed. `npm run tick` (`cli.js tick`) actually runs one autopilot and dispatch pass. |
| S12 | `cors()` was open to every origin, with no auth. | CORS is off unless `CORS_ORIGIN` is set. An optional `API_TOKEN` bearer token uses a constant-time comparison. |

## Channel drivers (`channels.js` → `src/drivers/index.js`)

| # | Issue | Fix |
| - | --- | --- |
| C1 | `simulatePublish()` returned invented post IDs and URLs (`https://twitter.com/post/mock_twitter_…`) and reported success. It ran whenever `DRY_RUN` was set or `credentials.mock` was present, which was the default. | Replaced by an explicit sandbox driver. It returns `sandbox: true`, `url: null` and `remoteId: null`, and the UI shows "sandbox (not sent)". |
| C2 | X posted with an app-only Bearer token. X API v2 `POST /2/tweets` requires user context, so this could never work. | Real OAuth 1.0a HMAC-SHA1 request signing (`X_API_KEY/SECRET`, `X_ACCESS_TOKEN/SECRET`) or an OAuth 2.0 user token (`X_OAUTH2_USER_TOKEN`). |
| C3 | X silently truncated text to 280 characters, and "thread support" was claimed but not implemented. | Over-length posts are rejected with a clear error. Threads (split by `---` or `platformOverrides.x.thread`) are posted as a reply chain. |
| C4 | LinkedIn read the post ID only from the body. The UGC API returns it in the `x-restli-id` header. | Reads the body first, then the header. Content over 3000 characters is rejected. |
| C5 | Reddit had no way to get a token, defaulted the subreddit to `test`, and ignored `json.errors`, so rejected posts were reported as successes. | Password-grant token exchange for script apps (or `REDDIT_ACCESS_TOKEN`). A subreddit is required, and Reddit's `errors` array is surfaced as a failure. |
| C6 | Bluesky truncated to 300 characters, had no rich-text facets (links and hashtags weren't clickable), and asked for the account's main password. | Rejects over-length posts, builds byte-accurate link and hashtag facets, and uses `BLUESKY_APP_PASSWORD`. |
| C7 | The webhook sent its secret in plaintext in the `X-Open-Post-Secret` header and returned an invented `webhook_<timestamp>` ID. | HMAC-SHA256 body signature in `X-Open-Post-Signature`. `remoteId` is only set if the receiver returns one. |

## Autopilot / AI (`autopilot.js` → `src/llm/`, `src/service.js`)

| # | Issue | Fix |
| - | --- | --- |
| A1 | `generateWithAnthropic()` was called but never defined, so selecting Anthropic crashed. | Implemented with the Messages API. |
| A2 | Gemini was advertised but not implemented. | Implemented with `generateContent` and a JSON response type. |
| A3 | OpenAI and Ollama had no error handling. A bad key threw an unhelpful `Cannot read properties of undefined`. | HTTP errors are checked and JSON is extracted defensively. On failure the app falls back to the heuristic engine and stores `fallbackReason` with the post. |
| A4 | The heuristic templates used `Math.random()` and contained fabricated claims ("Stop paying AWS $400/month", "I analyzed 500+ top-performing posts"). | Deterministic template choice and neutral wording with no invented statistics. LLM prompts also tell the model not to invent statistics or testimonials. |
| A5 | Cadence slots were stored but never used. `planAutopilotBatch()` was dead code, and nothing filled slots automatically. | `fillSlots()` plans 1 to 14 days ahead, never double-books a slot, and runs from the scheduler every 5 minutes when autopilot is enabled. |
| A6 | "Evergreen recycling" was advertised but not implemented. | Topics track `usedCount`. One-off topics are used once, and evergreen topics are recycled when `recycleEvergreen` is on. |

## Standalone web app (`open_post.html`)

| # | Issue | Fix |
| - | --- | --- |
| H1 | All state lived in `localStorage`, so nothing reached the server and nothing was ever published. | Replaced by `public/index.html` and `public/app.js`, which use only the REST API. The browser keeps only the optional API token, in `sessionStorage`. |
| H2 | It seeded fake channels marked `connected: true` and three fake posts, including a fabricated milestone ("500+ developers tested Open Post…"). | Removed. Empty states guide you to create real data. |
| H3 | "Total published" showed `142 + publishedCount`. Charts used hard-coded arrays (`[3,4,3,5,4,3,3]`, `[8.2, 11.4, …]`, `[45,30,15,10]`). | Counts and the 14-day delivery chart come from `/api/analytics`. |
| H4 | "Connecting" a channel just set `connected: true`. The AI API key was kept in `localStorage`. | Channels show real credential readiness, meaning which env vars are missing. AI keys are server-side env vars only. |
| H5 | The UI text said "Channels run in safe mock mode by default." | Sandbox is explicit, and the header shows `SANDBOX MODE` when it's on. |

## Docs and claims (`README.md`, Docker)

| # | Issue | Fix |
| - | --- | --- |
| D1 | Claimed "< 45 MB RAM" and a "zero-dependency runtime". | Replaced with a measured figure (~70 MB RSS idle on Node 20) and an honest dependency list (Express, plus optional `better-sqlite3`). |
| D2 | Claimed Mastodon support. | Removed. Mastodon is listed as a wanted contribution instead. |
| D3 | Postiz comparison numbers ("2.5–4 GB") weren't sourced. | The comparison now cites the Postiz self-hosting docs (2 GB floor, 8 GB recommended; PostgreSQL, Redis and Temporal required) and says where Postiz is stronger. |
| D4 | The quickstart cloned `github.com/openpost/open-post`, which isn't this repo. | Now points to `CodesbyFebin/Open-Post`. |
| D5 | The Dockerfile ran as root, copied the whole repo, and had no healthcheck. `DRY_RUN` and `AI_API_KEY` were documented but meant something else. | Node 22 Alpine, non-root user, minimal copy, healthcheck. Env vars are documented in `.env.example`. |

## Still not implemented (stated honestly, not mocked)

- Media and image uploads (text posts only)
- Engagement and reach analytics pulled from the networks
- OAuth "connect" buttons (you paste tokens into env vars)
- Multi-user accounts and teams
