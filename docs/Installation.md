# Installation

## Requirements

- **Node.js 20.12 or newer** (22 LTS recommended: it ships `node:sqlite`, so no native module is needed), **or** Docker
- About 100 MB of RAM and a few MB of disk

## Docker Compose (recommended)

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
cp .env.example .env     # edit it
docker compose up -d --build
docker compose logs -f
```

Data is stored in `./data` on the host. The container runs as the unprivileged `node` user and has a healthcheck on `/api/health`.

## Node.js

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
npm install
cp .env.example .env
npm start
```

`server.js` loads `.env` from the working directory automatically on Node ≥ 20.12.

### Which storage engine will I get?

`GET /api/health` reports `store`:

| Value | When |
| --- | --- |
| `node:sqlite` | Node 22.5+ (no flag needed on 22.13+) |
| `better-sqlite3` | Older Node with the optional dependency built |
| `json` | Neither is available, or `STORE_DRIVER=json` |

All three use the same API. To force SQLite and fail if it's missing, set `STORE_DRIVER=sqlite`.

## systemd

```ini
# /etc/systemd/system/open-post.service
[Unit]
Description=Open Post
After=network-online.target

[Service]
WorkingDirectory=/opt/open-post
EnvironmentFile=/opt/open-post/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
User=openpost

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now open-post
```

## Cron-only mode

If you don't want a long-running scheduler, set `SCHEDULER_DISABLED=true` on the server (or don't run it at all) and call:

```cron
* * * * * cd /opt/open-post && /usr/bin/node cli.js tick >> tick.log 2>&1
```

## Raspberry Pi

Use Node 22 (arm64) and the Node.js instructions above. The built-in `node:sqlite` means nothing has to be compiled.
