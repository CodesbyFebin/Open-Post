# Setup: LinkedIn

Open Post uses the **UGC Posts API** (`POST https://api.linkedin.com/v2/ugcPosts`) to publish text posts with public visibility.

## 1. Create an app

1. Go to the LinkedIn Developer portal and create an app. It must be linked to a LinkedIn Page, which you can create if you don't have one.
2. Under **Products**, request:
   - **Share on LinkedIn** to post as yourself (scope `w_member_social`), and **Sign In with LinkedIn using OpenID Connect** to look up your member ID
   - or the **Community Management API** to post as an organization page (scope `w_organization_social`). This needs LinkedIn's approval.

## 2. Get an access token

Use LinkedIn's OAuth 2.0 authorization code flow. The developer portal's **OAuth token tools** can generate a token for testing. Request `w_member_social` (and `openid profile` if you need your ID).

## 3. Find your author URN

- **Member:** call `GET https://api.linkedin.com/v2/userinfo` with the token. The `sub` field is your ID, so the author is `urn:li:person:<sub>`.
- **Organization:** `urn:li:organization:<numeric id>` (the number in your company admin URL).

## 4. Configure

```env
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_AUTHOR_URN=urn:li:person:abc123
```

Restart, then add a channel of type `linkedin`.

## Notes

- The limit is **3000 characters**. Longer posts are rejected.
- The post ID comes from the response body or the `x-restli-id` header, and the link is `https://www.linkedin.com/feed/update/<id>`.
- LinkedIn access tokens expire (typically after 60 days). When publishing starts failing with `HTTP 401`, generate a new token, update `.env` and restart.
- Posting as an organization requires the token's user to be an admin of that page.
