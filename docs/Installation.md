# Installation

## Requirements

| | Minimum | Notes |
| --- | --- | --- |
| Node.js | 20.12 | 22 LTS or newer is recommended: it has a built-in `node:sqlite`, so nothing needs compiling |
| Or Docker | Compose v2.24+ | The image is `node:26-alpine` |
| RAM | ~100 MB | About 70 MB RSS measured at idle on Node 20 |
| Disk | a few MB | Plus your database |

Open Post needs outbound HTTPS to the networks you use (`api.twitter.com`, `api.linkedin.com`, `www.reddit.com` / `oauth.reddit.com`, `bsky.social` or your PDS) and to your AI provider, if any.

## Docker Compose

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
cp .env.example .env        # edit it: see Configuration
docker compose up -d --build
docker compose logs -f open-post
```

- Data is stored in `./data` on the host, mounted at `/app/data`.
- The container runs as the unprivileged `node` user.
- A healthcheck calls `/api/health` every 30 seconds.
- To upgrade: `git pull && docker compose up -d --build`.

## Node.js

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
npm install            # Express, plus optional better-sqlite3
cp .env.example .env
npm start              # or: npm run dev (auto-restart)
```

`server.js` loads `.env` from the current directory (Node 20.12+ `process.loadEnvFile`).

### Storage engine selection

When `STORE_DRIVER=auto` (the default), the engine is chosen in this order:

1. `node:sqlite`, available on Node 22.5+
2. `better-sqlite3`, if the optional dependency installed and built
3. `json`: `data/open-post.json`, written atomically

`/api/health` reports which one is in use. To refuse to start without SQLite, set `STORE_DRIVER=sqlite`.

## VPS (Ubuntu/Debian) with systemd

```bash
# as root
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git
useradd --system --create-home --home-dir /opt/open-post openpost
sudo -u openpost git clone https://github.com/CodesbyFebin/Open-Post.git /opt/open-post/app
cd /opt/open-post/app && sudo -u openpost npm install --omit=dev
sudo -u openpost cp .env.example .env && chmod 600 .env   # then edit it
```

`/etc/systemd/system/open-post.service`:

```ini
[Unit]
Description=Open Post
After=network-online.target
Wants=network-online.target

[Service]
User=openpost
WorkingDirectory=/opt/open-post/app
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now open-post
journalctl -u open-post -f
```

Then put HTTPS in front of it: see [Deployment](Deployment).

## Raspberry Pi

Use 64-bit Raspberry Pi OS with Node 22 (arm64) and follow the VPS steps. Because `node:sqlite` is built in, nothing native has to compile on the Pi. Docker works too.

## Cron-only mode (no long-running scheduler)

Run the server with `SCHEDULER_DISABLED=true`, or don't run it at all, and trigger one pass per minute:

```cron
* * * * * cd /opt/open-post/app && /usr/bin/node cli.js tick >> /var/log/open-post-tick.log 2>&1
```

`cli.js tick` fills autopilot slots (if autopilot is enabled) and publishes every post that's due.
