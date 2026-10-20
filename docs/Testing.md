# Testing

```bash
npm test          # node --test test/*.test.js
npm run lint      # eslint (flat config in eslint.config.js)
```

CI (`.github/workflows/ci.yml`) runs lint and the tests on Node 20, 22 and 24. It also boots the server in sandbox mode and requests `/api/health` and `/`, builds and health-checks the Docker image, and builds the site.

## Suites

| File | Covers |
| --- | --- |
| `test/api.test.js` | Full REST flow on both the `auto` (SQLite) and `json` stores. Checks the empty initial state (no seed data), validation, that stored secrets are rejected, webhook delivery to a **real local HTTP server** with HMAC verification, retry and backoff state, filters, analytics, and that the dashboard is served. Also checks `API_TOKEN` auth and that `SANDBOX_MODE` never touches the network |
| `test/drivers.test.js` | OAuth 1.0a header format and determinism, X threads as a reply chain plus the 280 limit, LinkedIn UGC body, the Reddit token exchange and submit form, Bluesky session/record/facet byte offsets, and that `credentialStatus` never leaks values |
| `test/autopilot.test.js` | Heuristic determinism and limits; OpenAI, Anthropic, Gemini and Ollama parsing; provider failure falling back with a reason; generate-now, slot filling, no double booking, evergreen recycling and scheduler dispatch |

## Helpers (`test/helpers.js`)

- `startApp({ env, driver, fetch })` starts the real Express app on a random port with a temporary data directory, and returns `{ api(method, url, body, headers), svc, close }`.
- `fakeFetch({ 'url-substring': [status, json] | fn })` records every call in `.calls`.
- `webhookReceiver()` is a real `http` server that records requests.

## Writing tests

- Never call real social or LLM APIs. Inject `fetch`.
- Pass `env` explicitly instead of mutating `process.env`.
- Run a single file with `node --test test/drivers.test.js`.
