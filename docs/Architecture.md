# Architecture

Open Post is one Node.js process with four layers.

```
HTTP ──► src/app.js (Express routes, auth, static dashboard)
              │
              ▼
         src/service.js  class OpenPost
         ├─ channels CRUD + credential status
         ├─ posts CRUD + validation
         ├─ publishPost()  → src/drivers  (x, linkedin, reddit, bluesky, webhook, sandbox)
         ├─ dispatchDue()
         ├─ autopilot: getAutopilot / updateAutopilot / nextTopic / generateNow / fillSlots
         │                    → src/llm (openai, anthropic, gemini, ollama, heuristic)
         └─ analytics()
              │
              ▼
         src/store.js  document store: node:sqlite | better-sqlite3 | json

src/scheduler.js  setInterval(tick, SCHEDULER_INTERVAL_MS)
                  tick = (autopilot enabled && 5 min since last fill ? fillSlots() : skip) → dispatchDue()
```

## Storage

Every record is a JSON document in one table:

```sql
CREATE TABLE docs (collection TEXT, id TEXT, data TEXT, updated_at TEXT, PRIMARY KEY (collection, id));
```

There are three collections: `channels`, `posts` and `settings` (the autopilot document has `id = "autopilot"`). The JSON backend keeps the same shape in `open-post.json` and writes it via a temporary file plus `rename`, so a crash can't leave a half-written file. SQLite runs in WAL mode.

The store interface is `all(collection)`, `get(collection, id)`, `put(collection, doc)`, `del(collection, id)`, `close()` and `kind`.

## Publishing

`publishPost(id)`:

1. Rejects the call if the post is already in flight (an in-memory `Set`), returning HTTP 409.
2. Sets status `publishing` and increments `attempts`.
3. For each channel without an earlier successful delivery, calls `drivers.publish(channel, post, { env, fetch, sandbox })` and appends `{ channelId, ok, sandbox, remoteId, url | error, at }` to `deliveries`.
4. If every channel succeeded, the status becomes `published`. If not, and `attempts < MAX_PUBLISH_ATTEMPTS`, it becomes `scheduled` again at `now + 2^(attempts-1)` minutes. Otherwise it becomes `partial` (some channels succeeded) or `failed`.

`dispatchDue()` runs `publishPost` for every `scheduled` post whose `scheduledFor <= now`, one at a time.

## Scheduler

`startScheduler()` uses a single `setInterval` (which doesn't keep the process alive on its own) and a `running` flag, so ticks never overlap. Its first tick runs immediately at boot. `cli.js tick` performs the same work once and exits.

**Single instance:** locks are in memory, so don't run two servers against the same `DATA_DIR`.

## Autopilot slot filling

`upcomingSlots()` builds a `Date` for each `cadence` HH:MM on each of the next `horizonDays` days, in server local time, and keeps only future ones. `fillSlots()` skips slots that already have an autopilot post with exactly that `scheduledFor`, then calls `generateNow({ scheduledFor: slot })` until `nextTopic()` returns nothing.

## Secrets

Drivers resolve credentials with `envFor(channel)` → `process.env[PREFIX + '_' + KEY]`. `credentialStatus()` returns `{ ready, prefix, missing[] }`, which contains names only. `createChannel` and `updateChannel` reject any `credentials` field.

## Dependencies

Runtime: `express`. Optional: `better-sqlite3`. Everything else (HTTP clients, crypto, OAuth 1.0a signing, SQLite on Node 22+) uses Node built-ins, with global `fetch`.
