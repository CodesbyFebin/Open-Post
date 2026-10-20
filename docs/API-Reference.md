# API Reference

The base URL is `http://localhost:3000` (the variable `$B` below). All requests and responses are JSON. The machine-readable spec is [`openapi.yaml`](https://github.com/CodesbyFebin/Open-Post/blob/main/openapi.yaml).

```bash
B=http://localhost:3000
# if API_TOKEN is set on the server:
AUTH=(-H "Authorization: Bearer $API_TOKEN")
```

**Auth:** when `API_TOKEN` is set, every `/api/*` route except `/api/health` needs `Authorization: Bearer <token>`. Otherwise it returns `401 {"error":"Unauthorized: …"}`.

**Errors:** every error has the shape `{"error":"message"}`.

| Status | When |
| --- | --- |
| 400 | Validation failed, or the JSON is malformed |
| 401 | Missing or wrong token |
| 404 | Unknown ID or unknown `/api` route |
| 409 | The post is being published right now |
| 500 | Unexpected error. With `NODE_ENV=production` the message is just `Internal error` |

---

## System

### `GET /api/health`

Requires no auth.

```bash
curl -s $B/api/health
```

```json
{ "status": "ok", "app": "open-post", "version": "1.1.0", "store": "node:sqlite", "sandboxMode": false, "uptimeSeconds": 42 }
```

### `GET /api/config`

```bash
curl -s "${AUTH[@]}" $B/api/config
```

Returns `version`, `store`, `sandboxMode`, `aiProvider`, `channelTypes` (`["x","linkedin","reddit","bluesky","webhook","sandbox"]`), `defaultEnvPrefix`, `personas` (key → `{ name, instruction }`) and `authRequired`.

---

## Channels

### `GET /api/channels`

```bash
curl -s "${AUTH[@]}" $B/api/channels
```

```json
[{
  "id": "ch_ca52a945ed564c33", "type": "bluesky", "name": "My Bluesky", "handle": "me.bsky.social",
  "envPrefix": "BLUESKY", "config": {}, "enabled": true,
  "createdAt": "2026-10-20T20:02:28.286Z", "updatedAt": "2026-10-20T20:02:28.286Z",
  "credentials": { "ready": false, "prefix": "BLUESKY", "missing": ["BLUESKY_IDENTIFIER", "BLUESKY_APP_PASSWORD"] }
}]
```

### `POST /api/channels` → 201

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | ✓ | `x` (or `twitter`), `linkedin`, `reddit`, `bluesky`, `webhook`, `sandbox` |
| `name` | string | ✓ | |
| `handle` | string | | Display only |
| `envPrefix` | string | | `^[A-Z][A-Z0-9_]*$`. Defaults to the type's prefix |
| `config` | object | | `{ "subreddit": "r/test" }` or `{ "url": "https://…" }` |
| `enabled` | boolean | | Default `true` |
| `credentials` | — | ✗ | **Rejected with 400.** Use env vars |

```bash
curl -s "${AUTH[@]}" -X POST $B/api/channels -H 'Content-Type: application/json' \
  -d '{"type":"reddit","name":"r/test","config":{"subreddit":"r/test"}}'
```

### `GET /api/channels/:id`

```bash
curl -s "${AUTH[@]}" $B/api/channels/ch_123
```

### `PUT /api/channels/:id`

Updatable fields: `name`, `handle`, `envPrefix`, `config`, `enabled`.

```bash
curl -s "${AUTH[@]}" -X PUT $B/api/channels/ch_123 -H 'Content-Type: application/json' -d '{"enabled":false}'
```

### `DELETE /api/channels/:id`

```bash
curl -s "${AUTH[@]}" -X DELETE $B/api/channels/ch_123
# {"deleted":"ch_123"}
```

---

## Posts

### Post object

| Field | Notes |
| --- | --- |
| `id` | `post_…` |
| `content` | Core text (required, non-empty) |
| `platformOverrides` | `{ x: { content, thread[] }, linkedin: { content }, reddit: { title, content }, bluesky: { content } }` (`twitter` is accepted as an alias for `x`) |
| `channelIds` | Array of channel IDs (`targetChannelIds` is accepted on create) |
| `scheduledFor` | ISO date. Defaults to now |
| `status` | `draft`, `scheduled`, `publishing`, `published`, `partial`, `failed` |
| `tags`, `evergreen` | |
| `source` | `manual` or `autopilot` |
| `attempts`, `deliveries[]`, `lastError` | Publishing state |
| `meta` | For autopilot posts: `{ topicId, topic, generatedBy, fallbackReason }` |
| `createdAt`, `updatedAt`, `publishedAt` | |

### `GET /api/posts`

Query parameters: `status`, `channelId`, `from`, `to` (compared with `scheduledFor`). Results are sorted by `scheduledFor`.

```bash
curl -s "${AUTH[@]}" "$B/api/posts?status=scheduled&from=2026-11-01T00:00:00Z"
```

### `POST /api/posts` → 201

```bash
curl -s "${AUTH[@]}" -X POST $B/api/posts -H 'Content-Type: application/json' -d '{
  "content": "Open Post 1.1 is out",
  "platformOverrides": {
    "x": { "thread": ["Open Post 1.1 is out 🚀", "Real drivers, SQLite and autopilot."] },
    "reddit": { "title": "Open Post 1.1: tiny self-hosted scheduler" }
  },
  "channelIds": ["ch_x", "ch_reddit"],
  "scheduledFor": "2026-11-01T09:00:00+05:30",
  "status": "scheduled",
  "tags": ["release"]
}'
```

Validation: the content must not be empty, the channels must exist, and the status must be valid. A `scheduled` post needs at least one channel and a valid date.

### `GET /api/posts/:id`

```bash
curl -s "${AUTH[@]}" $B/api/posts/post_123
```

### `PUT /api/posts/:id`

Updatable fields: `content`, `platformOverrides`, `channelIds`, `status`, `tags`, `evergreen`, `scheduledFor`. Setting `status: "scheduled"` resets `attempts` and `lastError`. Returns 409 while the post is publishing.

```bash
curl -s "${AUTH[@]}" -X PUT $B/api/posts/post_123 -H 'Content-Type: application/json' \
  -d '{"scheduledFor":"2026-11-02T09:00:00Z","status":"scheduled"}'
```

### `DELETE /api/posts/:id`

```bash
curl -s "${AUTH[@]}" -X DELETE $B/api/posts/post_123
# {"deleted":"post_123"}
```

### `POST /api/posts/:id/publish-now`

Publishes to every target channel that hasn't already succeeded. It works for any status, and returns 409 if a publish is already running.

```bash
curl -s "${AUTH[@]}" -X POST $B/api/posts/post_123/publish-now
```

```json
{
  "post": { "id": "post_123", "status": "published", "attempts": 1, "deliveries": [ … ] },
  "results": [
    { "channelId": "ch_x", "channelType": "x", "ok": true, "sandbox": false, "remoteId": "1850…", "url": "https://x.com/i/status/1850…", "at": "…" },
    { "channelId": "ch_reddit", "channelType": "reddit", "ok": false, "error": "Channel \"r/test\" is missing env vars: REDDIT_ACCESS_TOKEN", "at": "…" }
  ]
}
```

If any channel failed and attempts remain, the post goes back to `scheduled` with backoff (see [Architecture](Architecture)).

---

## Autopilot

### `GET /api/autopilot`

```bash
curl -s "${AUTH[@]}" $B/api/autopilot
```

```json
{ "id": "autopilot", "enabled": false, "persona": "indie_hacker", "provider": null,
  "cadence": ["09:00","13:00","17:30"], "horizonDays": 2, "channelIds": [], "topics": [], "recycleEvergreen": true }
```

### `PUT /api/autopilot`

This is a partial update. Fields: `enabled`, `persona`, `provider` (`null` means the server default), `cadence` (`HH:MM` strings), `horizonDays` (clamped to 1–14), `channelIds`, `recycleEvergreen` and `topics`. Topics may be strings or `{ title, pillar, evergreen }` objects. Sending `topics` **replaces** the whole list, so keep each topic's `id` and `usedCount` if you want to preserve them.

```bash
curl -s "${AUTH[@]}" -X PUT $B/api/autopilot -H 'Content-Type: application/json' -d '{
  "enabled": true, "persona": "technical_architect", "cadence": ["09:00","18:00"], "horizonDays": 7,
  "channelIds": ["ch_bsky"],
  "topics": [{"title":"Lessons from self-hosting","pillar":"Engineering","evergreen":true}, "Why small tools win"]
}'
```

### `POST /api/autopilot/generate-now` → 201

Body (optional): `{ "topicId": "topic_…", "scheduledFor": "ISO" }`. The default time is 30 minutes from now. Returns 400 if no topic is eligible or there are no target channels.

```bash
curl -s "${AUTH[@]}" -X POST $B/api/autopilot/generate-now -H 'Content-Type: application/json' -d '{}'
# {"post":{ … "source":"autopilot","meta":{"topic":"…","generatedBy":"heuristic","fallbackReason":null} }}
```

### `POST /api/autopilot/fill`

Fills every empty cadence slot within the horizon. This works even when `enabled` is false.

```bash
curl -s "${AUTH[@]}" -X POST $B/api/autopilot/fill
# {"created":[ …posts… ]}
```

---

## Generation

### `POST /api/generate`

Drafts content **without saving it**. Body: `{ topic (required), pillar?, persona?, provider? }`.

```bash
curl -s "${AUTH[@]}" -X POST $B/api/generate -H 'Content-Type: application/json' \
  -d '{"topic":"Shipping small","persona":"indie_hacker","provider":"ollama"}'
```

```json
{ "content": "…", "platformOverrides": { "x": {…}, "linkedin": {…}, "reddit": {…}, "bluesky": {…} },
  "tags": ["General","Autopilot"], "generatedBy": "heuristic", "persona": "Indie Hacker / Builder in Public",
  "fallbackReason": "ollama: fetch failed" }
```

---

## Analytics

### `GET /api/analytics`

```bash
curl -s "${AUTH[@]}" $B/api/analytics
```

```json
{ "totalPosts": 2,
  "byStatus": { "draft": 0, "scheduled": 1, "publishing": 0, "published": 1, "partial": 0, "failed": 0 },
  "byChannel": { "ch_bsky": { "ok": 1, "failed": 0, "sandbox": 1 } },
  "deliveriesPerDay": { "2026-10-20": 1 },
  "autopilotPosts": 1 }
```

Everything is computed from the local database. Open Post doesn't fetch engagement data from the networks.
