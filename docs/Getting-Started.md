# Getting Started

This guide takes about five minutes. You'll run Open Post in **sandbox mode**, so nothing is sent to any social network.

## 1. Run it

**With Docker:**

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
cp .env.example .env
sed -i 's/^SANDBOX_MODE=false/SANDBOX_MODE=true/' .env
docker compose up -d --build
```

**With Node.js 20.12+ (22 LTS recommended):**

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
npm install
cp .env.example .env
sed -i 's/^SANDBOX_MODE=false/SANDBOX_MODE=true/' .env
npm start
```

## 2. Check it

```bash
curl http://localhost:3000/api/health
```

```json
{"status":"ok","app":"open-post","version":"1.1.0","store":"node:sqlite","sandboxMode":true,"uptimeSeconds":3}
```

Open **http://localhost:3000**. The header badge reads `SANDBOX MODE · <store> · ai: heuristic`.

## 3. Add a channel

Go to **Channels**, choose type `sandbox`, enter a name such as "Test", and click **Add channel**.

## 4. Schedule a post

Go to **Compose**, type a message and tick your channel. Set **Publish at** to a minute from now, then click **Schedule**.

## 5. Watch it publish

The scheduler checks every 30 seconds (`SCHEDULER_INTERVAL_MS`). In **Queue**, the post changes from `scheduled` to `published`, and its delivery log line reads `sandbox (not sent)`.

## Next

- Connect a real network: [Channels](Channels)
- Let Open Post fill your calendar: [Tutorial: Autopilot Setup](Tutorial-Autopilot-Setup)
- Learn every screen: [Dashboard Guide](Dashboard-Guide)
