# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.1.x | ✅ |
| 1.0.x | ❌ (prototype with simulated publishing; please upgrade) |

## Reporting a vulnerability

**Don't open a public issue.** Use GitHub's private vulnerability reporting: go to **Security → Report a vulnerability** on this repository. Include steps to reproduce, the affected version, and the impact.

We aim to acknowledge reports within 72 hours and to ship a fix or mitigation within 30 days for confirmed issues. With your permission, we'll credit you in the changelog.

## Security model

- Open Post is **single-tenant**. Anyone who can reach the API can schedule posts to every connected channel. On any network you don't fully trust, set `API_TOKEN` and put the server behind HTTPS.
- **Secrets are read only from environment variables.** The API rejects any channel payload that contains `credentials`, and it never returns secret values. It only reports which variable names are present or missing.
- Webhooks can be signed with `WEBHOOK_SECRET` (`X-Open-Post-Signature: sha256=<hex hmac of body>`). Verify that header on the receiving side.
- The SQLite or JSON file in `DATA_DIR` holds post content and channel metadata. Protect it like any other application data.
- The Docker image runs as the unprivileged `node` user.
