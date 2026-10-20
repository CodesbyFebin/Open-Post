# Setup: Bluesky

Open Post logs in with `com.atproto.server.createSession` and posts with `com.atproto.repo.createRecord` (`app.bsky.feed.post`).

## 1. Create an App Password

Bluesky → **Settings → Privacy and security → App passwords → Add App Password**. Never use your main password.

## 2. Configure

```env
BLUESKY_IDENTIFIER=yourname.bsky.social   # or your custom-domain handle, or email
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
# BLUESKY_SERVICE=https://bsky.social     # change if you run your own PDS
```

Restart, then add a channel of type `bluesky`.

## Notes

- The limit is **300 characters** (counted by code points). Longer posts are rejected.
- URLs (`https://…`) and `#hashtags` are turned into rich-text **facets** with correct byte offsets, so they're clickable.
- The delivery links to `https://bsky.app/profile/<handle>/post/<rkey>`.
- A new session is created for each publish, so there are no tokens to refresh.
