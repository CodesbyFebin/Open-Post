# Channels

Secrets are **never** stored in the database. When you create a channel you choose a type, a name and an optional env prefix. The dashboard then lists any variables that are still missing.

## X (Twitter), API v2

**Option A, OAuth 1.0a user context (simplest for your own account):**

1. Create a project and app at the X developer portal.
2. Under *User authentication settings*, enable **Read and write**.
3. Generate the **API Key and Secret** and the **Access Token and Secret** (regenerate the tokens after changing permissions).

```env
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_SECRET=...
```

**Option B, OAuth 2.0 user token** with the `tweet.write tweet.read users.read` scopes:

```env
X_OAUTH2_USER_TOKEN=...
```

An app-only Bearer token **can't** post. Threads: put a line containing only `---` between parts, or send `platformOverrides.x.thread` as an array. Each part must be 280 characters or fewer. X's API access tiers and pricing change, so check your plan's write limits.

## LinkedIn (UGC Posts API)

1. Create an app at the LinkedIn developer portal and add the *Share on LinkedIn* product (members) or *Community Management API* (organization pages).
2. Get a 3-legged OAuth access token with `w_member_social` (or `w_organization_social`).
3. Find your author URN: `urn:li:person:<id>` (from `/v2/userinfo` `sub`) or `urn:li:organization:<id>`.

```env
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_AUTHOR_URN=urn:li:person:abc123
```

LinkedIn tokens expire (usually after 60 days), so refresh them when publishing starts failing with 401.

## Reddit

1. Go to <https://www.reddit.com/prefs/apps> and create a **script** app.
2. Set the subreddit on the channel (`r/yoursub`), or use `REDDIT_SUBREDDIT`.

```env
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=...
REDDIT_PASSWORD=...
REDDIT_USER_AGENT=open-post/1.1 (by u/yourname)
# or instead of the four above:
REDDIT_ACCESS_TOKEN=...
```

Posts are self (text) posts. The title comes from `platformOverrides.reddit.title`, falling back to the first line of the content. Reddit's own errors (rate limits, subreddit rules) are shown in the delivery log.

## Bluesky (AT Protocol)

Create an **App Password** under Settings → Privacy and security → App passwords.

```env
BLUESKY_IDENTIFIER=you.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
# BLUESKY_SERVICE=https://bsky.social   # or your own PDS
```

Links and hashtags are turned into rich-text facets automatically. The limit is 300 characters.

## Webhook

Set the URL on the channel (`config.url`) or in `WEBHOOK_URL`. Open Post sends:

```http
POST <url>
Content-Type: application/json
X-Open-Post-Event: post.publish
X-Open-Post-Signature: sha256=<hex HMAC-SHA256 of the raw body using WEBHOOK_SECRET>

{"event":"post.publish","channel":{...},"post":{"id":"...","content":"...","platformOverrides":{...},"tags":[...],"scheduledFor":"..."},"sentAt":"..."}
```

Any 2xx response counts as success. If the response JSON has `id` or `remoteId`, it's recorded. To verify the signature in Node:

```js
const expected = 'sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(rawBody).digest('hex');
```

## Sandbox

The `sandbox` type needs nothing. It records a successful delivery with `sandbox: true` and no URL. To route **every** channel to the sandbox, set `SANDBOX_MODE=true`.
