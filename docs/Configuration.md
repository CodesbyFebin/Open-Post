# Configuration

Everything is configured with environment variables, usually through `.env`. See [`.env.example`](https://github.com/CodesbyFebin/Open-Post/blob/main/.env.example).

## Server

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address. Use `127.0.0.1` behind a reverse proxy |
| `DATA_DIR` | `./data` | Where `open-post.db` / `open-post.json` live |
| `STORE_DRIVER` | `auto` | `auto`, `sqlite` or `json` |
| `TZ` | system | Time zone used for cadence slots, e.g. `Asia/Kolkata` |
| `API_TOKEN` | — | If set, `/api/*` (except `/api/health`) requires `Authorization: Bearer <token>`. The dashboard asks for it. |
| `CORS_ORIGIN` | — | Allow one browser origin to call the API |
| `NODE_ENV` | — | `production` hides internal error messages |

## Publishing

| Variable | Default | Description |
| --- | --- | --- |
| `SANDBOX_MODE` | `false` | `true` sends every channel to the sandbox driver. Nothing leaves the machine. |
| `SCHEDULER_INTERVAL_MS` | `30000` | How often due posts are checked |
| `SCHEDULER_DISABLED` | `false` | Turn off the in-process scheduler (use `cli.js tick` instead) |
| `MAX_PUBLISH_ATTEMPTS` | `3` | Attempts before a post becomes `failed` / `partial`. Backoff is 1, 2, 4 … minutes |

## AI

| Variable | Description |
| --- | --- |
| `AI_PROVIDER` | `heuristic` (default), `openai`, `anthropic`, `gemini`, `ollama` |
| `AI_MODEL` | Override the model. Defaults: `gpt-4o-mini`, `claude-3-5-haiku-latest`, `gemini-1.5-flash`, `llama3.1` |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL` | OpenAI or any compatible endpoint (e.g. a local gateway) |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GEMINI_API_KEY` | Google AI Studio key |
| `OLLAMA_URL` | Default `http://localhost:11434` |
| `AI_API_KEY` | Generic fallback key used by whichever provider is selected |

## Channel credentials

Each channel has an **env prefix** (default `X`, `LINKEDIN`, `REDDIT`, `BLUESKY`, `WEBHOOK`). The driver reads `<PREFIX>_<KEY>`. To run a second X account, create a channel with prefix `X_BRAND2` and set `X_BRAND2_API_KEY`, `X_BRAND2_API_SECRET` and so on. See [Channels](Channels) for each network's keys.
