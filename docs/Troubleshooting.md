# Troubleshooting

## Start with the health check

```bash
curl -s localhost:3000/api/health
```

It shows the version, the storage engine, and whether sandbox mode is on. Then check the server log (`docker compose logs -f`, `journalctl -u open-post -f`, or the terminal). Scheduler lines look like `[scheduler] post_… -> published (1/1 ok)`.

## Common problems

| Symptom | Cause / fix |
| --- | --- |
| Channel card says **missing: X_API_KEY, …** | The server process doesn't see those env vars. Make sure `.env` is in the working directory (or passed to Docker via `env_file`) and restart. With a custom `envPrefix`, the names change to `<PREFIX>_…` |
| Posts stay `scheduled` and never publish | Is the scheduler disabled (`SCHEDULER_DISABLED=true`)? Is the host sleeping the process? Is the time in the past *in UTC*? The dashboard converts your local time to UTC |
| Autopilot creates nothing | It needs: enabled (or **Fill slots now**), at least one target channel, at least one *eligible* topic (unused, or evergreen with recycling on), and future slots within `horizonDays`. Remember slots use the **server** time zone (`TZ`) |
| Autopilot slots land at the wrong hour | Set `TZ` on the server, e.g. `TZ=Asia/Kolkata`, and restart |
| `X API HTTP 403` | The app needs *Read and write* permission, and tokens must be regenerated after changing it. Your API plan must allow posting |
| `X post exceeds 280 characters` | Shorten it, or split it with a `---` line |
| `LinkedIn API HTTP 401` | Token expired (they last about 60 days). Generate a new one |
| `LinkedIn API HTTP 403` | Missing `w_member_social` / `w_organization_social`, or the author URN doesn't match the token's user or page |
| `Reddit OAuth failed` | Wrong client ID or secret, wrong username or password, or 2FA on the account (use `REDDIT_ACCESS_TOKEN`) |
| `Reddit rejected post: [...]` | Subreddit rules, karma or age limits, a required flair, or a rate limit |
| `Bluesky auth HTTP 401` | Wrong identifier, or you used your main password. Use an App Password |
| `Webhook HTTP 4xx/5xx` | The receiver rejected it. For n8n, make sure you used the **Production** URL and the workflow is active |
| Draft with AI says `fallback: openai: … 401` | Wrong or missing key. The fallback reason contains the provider's message |
| `fallback: ollama: fetch failed` | Ollama isn't reachable. In Docker, use `host.docker.internal` (see [Tutorial: LLM Providers](Tutorial-LLM-Providers)) |
| `fallback: …: LLM returned no JSON object` | Try a stronger model, or a different `AI_MODEL` |
| Dashboard keeps asking for a token | The token doesn't match `API_TOKEN`. Close the tab to clear `sessionStorage` and try again |
| `Corrupt JSON store at …` on boot | `data/open-post.json` was edited by hand or damaged. Restore it from a backup. Open Post refuses to overwrite it |
| `STORE_DRIVER=sqlite but neither node:sqlite nor better-sqlite3 is available` | Use Node 22+, or `npm install` with build tools so `better-sqlite3` compiles, or use `STORE_DRIVER=auto` |
| `409 Post is already publishing` | Wait a moment. A publish for that post is in progress |
| Post shows `partial` | Some channels succeeded and others ran out of retries. Fix the failing channel, then **Publish now**: only the failed channels are retried |

## Still stuck?

Open an issue with the bug template. Include `/api/health` output and the delivery error, and **remove any secrets** first.
