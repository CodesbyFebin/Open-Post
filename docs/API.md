# REST API

The full machine-readable spec is in [`openapi.yaml`](https://github.com/CodesbyFebin/Open-Post/blob/main/openapi.yaml). All bodies are JSON. If `API_TOKEN` is set, add `-H "Authorization: Bearer $API_TOKEN"` to each request.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness, version, store engine, sandbox flag |
| GET | `/api/config` | Channel types, personas, AI provider |
| GET/POST | `/api/channels` | List / create channels |
| GET/PUT/DELETE | `/api/channels/:id` | Read / update / delete one |
| GET/POST | `/api/posts` | List (`?status=&channelId=&from=&to=`) / create |
| GET/PUT/DELETE | `/api/posts/:id` | Read / update / delete one |
| POST | `/api/posts/:id/publish-now` | Publish immediately |
| GET/PUT | `/api/autopilot` | Read / update autopilot settings |
| POST | `/api/autopilot/generate-now` | Generate and schedule one post (`{topicId?, scheduledFor?}`) |
| POST | `/api/autopilot/fill` | Fill all empty cadence slots |
| POST | `/api/generate` | Draft content without saving (`{topic, persona?, provider?}`) |
| GET | `/api/analytics` | Counts from your database |

## Examples

```bash
B=http://localhost:3000

# create a Bluesky channel (needs BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD in env)
curl -s -X POST $B/api/channels -H 'Content-Type: application/json' \
  -d '{"type":"bluesky","name":"My Bluesky","handle":"me.bsky.social"}'

# schedule a post
curl -s -X POST $B/api/posts -H 'Content-Type: application/json' -d '{
  "content": "Shipping v1.1 today",
  "platformOverrides": { "x": { "content": "Shipping v1.1 today\n---\nWhat changed: ..." } },
  "channelIds": ["ch_..."],
  "scheduledFor": "2026-11-01T09:00:00+05:30"
}'

# publish right now
curl -s -X POST $B/api/posts/post_.../publish-now

# configure autopilot
curl -s -X PUT $B/api/autopilot -H 'Content-Type: application/json' -d '{
  "enabled": true, "channelIds": ["ch_..."], "cadence": ["09:00","18:00"],
  "topics": [{ "title": "Lessons from self-hosting", "pillar": "Engineering", "evergreen": true }]
}'
```

## Post lifecycle

`draft` → `scheduled` → `publishing` → `published`. If some channels fail, the post goes back to `scheduled` with backoff and retries only the failed channels. After `MAX_PUBLISH_ATTEMPTS` it ends as `partial` (some channels succeeded) or `failed`. Every attempt is appended to `deliveries[]`.

## Errors

Errors return `{ "error": "message" }` with status 400 (validation), 401 (token), 404 (not found), 409 (already publishing) or 500.
