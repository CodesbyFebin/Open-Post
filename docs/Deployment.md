# Deployment

## Checklist for a public server

- [ ] Set `API_TOKEN` to a long random value (`openssl rand -hex 32`)
- [ ] Bind to `127.0.0.1` (`HOST=127.0.0.1`) and put a reverse proxy with HTTPS in front
- [ ] Set `TZ` so cadence slots match your audience
- [ ] Back up `DATA_DIR`
- [ ] Keep `.env` readable only by the service user (`chmod 600 .env`)

## Caddy

```caddyfile
post.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

## Nginx

```nginx
server {
  server_name post.example.com;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
  listen 443 ssl; # certbot-managed
}
```

## Backups

SQLite (WAL mode):

```bash
sqlite3 data/open-post.db ".backup 'backup-$(date +%F).db'"
```

JSON store: copy `data/open-post.json`.

## Upgrading

```bash
git pull
docker compose up -d --build     # or: npm install && restart the service
```

The document schema is forward-compatible: new fields get defaults when they're read.

## Only one instance

The scheduler runs in-process with an in-memory lock, so run **one** instance per data directory. For high availability, run a single instance under a supervisor (Docker `restart: unless-stopped`, systemd `Restart=on-failure`).

## Platforms that sleep

Free tiers that stop idle containers will also stop the scheduler. Use an always-on host, or run `node cli.js tick` from an external cron.
