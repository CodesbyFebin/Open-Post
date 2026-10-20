# Open Post Wiki

Open Post is a free, MIT-licensed, self-hosted social media scheduler and AI autopilot. One Node.js process serves the dashboard, the REST API and the scheduler, and stores data in SQLite.

## Pages

- [[Installation]]: Docker, Node.js, systemd, Raspberry Pi
- [[Configuration]]: every environment variable
- [[Channels]]: getting credentials for X, LinkedIn, Reddit, Bluesky and webhooks
- [[Autopilot]]: cadence, topics, personas, AI providers
- [[API]]: REST endpoints with curl examples
- [[Deployment]]: reverse proxy, HTTPS, backups, upgrades
- [[FAQ]]

## Five-minute start

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post && cp .env.example .env
echo "SANDBOX_MODE=true" >> .env
docker compose up -d --build
# open http://localhost:3000
```

These pages are also versioned in the repository under [`docs/`](https://github.com/CodesbyFebin/Open-Post/tree/main/docs).
