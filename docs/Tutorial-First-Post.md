# Tutorial: Your First Real Post

This walk-through publishes one post to **Bluesky**, which is the quickest network to set up. The same steps work for any channel.

## 1. Create a Bluesky App Password

In Bluesky, go to **Settings → Privacy and security → App passwords → Add App Password**. Name it "Open Post" and copy the password (format `xxxx-xxxx-xxxx-xxxx`).

## 2. Add credentials to `.env`

```env
BLUESKY_IDENTIFIER=yourname.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SANDBOX_MODE=false
```

Restart: `docker compose up -d`, or stop `npm start` and run it again.

## 3. Add the channel

**Channels** → type `bluesky`, name "My Bluesky", handle (optional) → **Add channel**. The card should show **● credentials found**. If it says **missing: BLUESKY_…**, the server didn't see your env vars. Check that `.env` is in the folder you started from, and restart.

<img src="https://raw.githubusercontent.com/CodesbyFebin/Open-Post/main/assets/screenshots/channels.png" alt="Channels screen with credential status" width="100%">

## 4. Compose

**Compose** → write the core content, for example:

```
Trying out Open Post, a tiny self-hosted scheduler. https://github.com/CodesbyFebin/Open-Post #opensource
```

- Tick **My Bluesky**. The **Preview** panel shows the Bluesky version.
- The Bluesky counter shows `n/300`, and turns red over the limit. Posts over the limit are rejected at publish time, never cut short.
- Optionally fill in the **Bluesky** box to post different text there than on other channels.

<img src="https://raw.githubusercontent.com/CodesbyFebin/Open-Post/main/assets/screenshots/compose.png" alt="Composer" width="100%">

## 5. Publish

- **Publish now** saves the post and dispatches it immediately. A toast shows the result for each channel.
- **Schedule** queues it for the **Publish at** time.
- **Save draft** stores it without scheduling.

## 6. Check the result

In **Queue**, the post is `published`, and the delivery line links to `https://bsky.app/profile/<handle>/post/<id>`. Links and `#hashtags` are clickable on Bluesky, because Open Post adds rich-text facets.

If it failed, the delivery line shows the network's error message. The post goes back to `scheduled` and retries in 1, then 2 minutes. After `MAX_PUBLISH_ATTEMPTS` (default 3) it becomes `failed`. See [Troubleshooting](Troubleshooting).

## Doing the same with curl

```bash
B=http://localhost:3000
CH=$(curl -s -X POST $B/api/channels -H 'Content-Type: application/json' \
  -d '{"type":"bluesky","name":"My Bluesky"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
P=$(curl -s -X POST $B/api/posts -H 'Content-Type: application/json' \
  -d "{\"content\":\"Hello from the Open Post API\",\"channelIds\":[\"$CH\"],\"status\":\"draft\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -X POST $B/api/posts/$P/publish-now
```
