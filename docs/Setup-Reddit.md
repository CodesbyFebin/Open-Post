# Setup: Reddit

Open Post submits **self (text) posts** via `POST https://oauth.reddit.com/api/submit`.

## 1. Create a script app

1. While logged into the account that will post, open <https://www.reddit.com/prefs/apps> → **create another app…**
2. Choose **script**, give it a name, and set the redirect URI to `http://localhost` (it isn't used).
3. Note the **client ID** (shown under the app name) and the **secret**.

## 2. Configure

```env
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
REDDIT_USER_AGENT=open-post/1.1 (by u/your_username)
# Optional default subreddit if the channel doesn't set one
REDDIT_SUBREDDIT=test
```

For each post, Open Post exchanges these for a token using the password grant (`https://www.reddit.com/api/v1/access_token`). If you'd rather manage tokens yourself, set `REDDIT_ACCESS_TOKEN` instead of the four credentials.

> The password grant may fail on accounts with two-factor authentication. If it does, use `REDDIT_ACCESS_TOKEN`.

## 3. Add the channel

**Channels** → type `reddit` → enter the subreddit in the extra field (`r/test` or `test`) → **Add channel**.

## Writing for Reddit

- **Title**: the *Reddit title* box. If it's empty, Open Post uses the first line of the content (max 300 characters).
- **Body**: the *Reddit body* box, or the core content.
- Reddit's own rejections (subreddit rules, rate limits, missing flair) appear as `Reddit rejected post: [...]` in the delivery log.
- Follow each subreddit's self-promotion rules. Automating posts doesn't exempt you from them.
