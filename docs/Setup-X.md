# Setup: X (Twitter)

Open Post posts through **X API v2 `POST https://api.twitter.com/2/tweets`**. Posting needs **user-context** auth. An app-only Bearer token can't create posts.

> X's API access levels and pricing change from time to time. Check that your plan allows writing posts.

## Option A: OAuth 1.0a user context (recommended for your own account)

1. In the X Developer Portal, create a Project and an App.
2. Open the app's **User authentication settings** and set **App permissions** to **Read and write**. Save. (A callback URL is required by the form; any valid URL works for this flow.)
3. Under **Keys and tokens**:
   - copy the **API Key** and **API Key Secret** (the consumer keys)
   - generate the **Access Token** and **Access Token Secret**. If you changed permissions, regenerate them afterwards, so the tokens carry write access.
4. Add them to `.env`:

```env
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_SECRET=...
```

Open Post signs each request with HMAC-SHA1, following the OAuth 1.0a spec.

## Option B: OAuth 2.0 user token

If you already have an OAuth 2.0 user access token with the `tweet.read tweet.write users.read` scopes:

```env
X_OAUTH2_USER_TOKEN=...
```

When it's set, it takes precedence over the OAuth 1.0a keys. These tokens expire, and Open Post doesn't refresh them.

## Add the channel

**Channels** → type `x` → name → **Add channel**. The card should say **credentials found**.

## Writing for X

- Each post (or thread part) must be **280 characters or fewer**. Longer text is rejected with an error, never cut short. Counting is by Unicode code points, so X's weighted count for some characters and URLs may differ slightly.
- **Threads:** in the X box (or the core content), separate parts with a line containing only `---`:

```
First post of the thread
---
Second post, sent as a reply to the first
```

Through the API you can also send `platformOverrides.x.thread: ["part 1", "part 2"]`.
- The delivery records every post ID (`remoteIds`) and a link to the first post: `https://x.com/i/status/<id>`.

## Errors you may see

| Error | Meaning |
| --- | --- |
| `X API HTTP 401` | Wrong keys or token, or a mismatched consumer/access pair |
| `X API HTTP 403` | App lacks *Read and write*, tokens not regenerated, or your plan doesn't allow posting |
| `X API HTTP 429` | Rate limited. Open Post retries with backoff |
| `X post exceeds 280 characters` | Shorten it or split it into a thread |
