# Channels

A **channel** is one account on one network. Open Post never stores secrets in its database. Each channel has an **env prefix**, and the driver reads `<PREFIX>_<KEY>` from the environment. The Channels screen and `GET /api/channels` show `credentials.ready` and the list of `missing` variable *names*, never their values.

| Type | Default prefix | Setup guide |
| --- | --- | --- |
| `x` (alias `twitter`) | `X` | [Setup: X (Twitter)](Setup-X) |
| `linkedin` | `LINKEDIN` | [Setup: LinkedIn](Setup-LinkedIn) |
| `reddit` | `REDDIT` | [Setup: Reddit](Setup-Reddit) |
| `bluesky` | `BLUESKY` | [Setup: Bluesky](Setup-Bluesky) |
| `webhook` | `WEBHOOK` | [Setup: Webhooks (n8n, Make, Zapier)](Setup-Webhooks) |
| `sandbox` | — | No setup. Records a delivery without any network call |

## Multiple accounts on one network

Create the channel with a custom prefix (uppercase letters, digits and underscores, starting with a letter):

```bash
curl -X POST localhost:3000/api/channels -H 'Content-Type: application/json' \
  -d '{"type":"x","name":"Brand 2 on X","envPrefix":"X_BRAND2"}'
```

Then set `X_BRAND2_API_KEY`, `X_BRAND2_API_SECRET`, `X_BRAND2_ACCESS_TOKEN` and `X_BRAND2_ACCESS_SECRET`, and restart.

## Disabling a channel

**Disable** on the channel card (`PUT /api/channels/:id {"enabled":false}`) keeps the channel but makes deliveries to it fail with "Channel is disabled". Deleting a channel doesn't delete posts; deliveries to it fail with "Channel was deleted".

## Sandbox

- A `sandbox` **channel** always records `{ ok: true, sandbox: true, url: null }`.
- `SANDBOX_MODE=true` routes **every** channel to the sandbox, whatever its type, without checking credentials.
