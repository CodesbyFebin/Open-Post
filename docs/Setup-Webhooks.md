# Setup: Webhooks (n8n, Make, Zapier)

A `webhook` channel sends each post as JSON to a URL you choose. Use it to reach networks Open Post doesn't support yet, to send to Slack or Discord through an automation tool, or to log posts anywhere.

## The request

```http
POST <your URL>
Content-Type: application/json
User-Agent: open-post-webhook/1.0
X-Open-Post-Event: post.publish
X-Open-Post-Signature: sha256=<hex>     (only when WEBHOOK_SECRET is set)
```

```json
{
  "event": "post.publish",
  "channel": { "id": "ch_…", "name": "n8n", "type": "webhook" },
  "post": {
    "id": "post_…",
    "content": "core text",
    "platformOverrides": { "x": { "content": "…" } },
    "tags": ["release"],
    "scheduledFor": "2026-11-01T03:30:00.000Z"
  },
  "sentAt": "2026-11-01T03:30:02.120Z"
}
```

- Any **2xx** response counts as success, and anything else as failure, which is retried.
- If the response is JSON with `id` or `remoteId`, that value is stored as the delivery's remote ID.

## Configure

Put the URL on the channel (the extra field in **Channels**, or `config.url` in the API), or set `WEBHOOK_URL` for the default prefix. Optionally:

```env
WEBHOOK_SECRET=a-long-random-string
```

## Verify the signature

The signature is HMAC-SHA256 of the **raw request body**, computed with the secret:

```js
// Node / Express
const crypto = require('crypto');
app.post('/hook', express.raw({ type: 'application/json' }), (req, res) => {
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(req.body).digest('hex');
  const got = req.get('X-Open-Post-Signature') || '';
  if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return res.sendStatus(401);
  const event = JSON.parse(req.body);
  res.json({ id: 'my-' + event.post.id });
});
```

## n8n

1. Add a **Webhook** node. Set the method to **POST**, pick a path, and set *Respond* to "Immediately" (or use a *Respond to Webhook* node).
2. Copy the **Production URL** into the Open Post channel and activate the workflow. The Test URL only works while you're listening in the editor.
3. Read fields such as `{{$json.body.post.content}}` in later nodes.
4. Optional signature check: a **Crypto** node (HMAC, SHA256, hex) over the raw body, followed by an **IF** node comparing it with the header. Enable the Webhook node's raw body option, so the bytes match exactly.

## Make (Integromat)

1. Create a scenario that starts with **Webhooks → Custom webhook**, then copy its URL.
2. Put the URL on the channel. Click **Publish now** on a test post, so Make can learn the data structure.
3. Map `post.content`, `post.platformOverrides`, etc. into the following modules.

## Zapier

1. Create a Zap with the trigger **Webhooks by Zapier → Catch Hook**. (Webhooks by Zapier requires a paid Zapier plan.)
2. Copy the hook URL into the channel and send a test post.
3. Use `post__content` and the other fields in your actions.

Make and Zapier can't easily verify HMAC signatures. Treat their URLs as secrets, and don't share them.
