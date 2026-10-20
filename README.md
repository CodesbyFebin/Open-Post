# 🚀 Open Post

> **Run your social media on autopilot with Open Post.**  
> Completely free, zero-bloat, standalone open-source social media scheduling and autonomous AI agent platform.

Reverse engineered from the capabilities of [Postiz](https://github.com/gitroomhq/postiz-app) utilizing the [morluto/rea](https://github.com/morluto/rea) (Reverse Engineer Anything) methodology to eliminate enterprise lock-in, heavy distributed orchestration clusters, and cloud paywalls.

---

## ⚡ Why Open Post?

[Postiz](https://github.com/gitroomhq/postiz-app) introduced great social media scheduling features, but self-hosting it poses major hurdles for indie builders, creators, and lean teams:
- Requires **Temporal Orchestration Cluster** (which alone requires dedicated Postgres, Elasticsearch, and multiple internal worker nodes).
- Requires a separate **Redis BullMQ** instance.
- Requires **PostgreSQL** with complex Prisma migrations.
- Consumes **>2.5 GB to 4 GB RAM** just to schedule a few daily posts.
- Features are entangled with cloud billing checks and SaaS tiers.

**Open Post** reverse-engineers the essential domain logic into a **single standalone repository and zero-dependency runtime**:

| Feature / Metric | Postiz (`postiz-app`) | Open Post (`open-post`) |
| :--- | :--- | :--- |
| **Architecture** | Monorepo + 4 microservices | **Single standalone app & repo** |
| **Workflow Engine** | Temporal Cluster (Heavy Java/Go) | **Lightweight Event-Loop Scheduler** |
| **Queue Manager** | Redis + BullMQ | **Embedded In-Process / SQLite Queue** |
| **Database** | PostgreSQL + Prisma migrations | **Zero-config SQLite / JSON Store** |
| **RAM Footprint** | ~2,500 MB – 4,000 MB | **< 45 MB** (Runs on $3/mo VPS or Pi) |
| **Pricing / Cloud Gate** | Freemium / Enterprise billing hooks | **100% Free & Open-Source (MIT)** |
| **Autopilot Agent** | Cloud agent or CLI wrapper | **Native Built-in Autopilot Engine** |
| **Local LLM Support** | Limited | **Ollama, OpenAI, Claude, Heuristics** |
| **Setup Time** | 30–60 minutes | **Instant (1 command)** |

---

## 🤖 Autopilot Capabilities

Open Post runs your social media presence on autopilot with intelligent autonomous features:
1. **Cadence Engine**: Define daily posting slots (e.g. 09:00, 13:30, 18:00) per channel.
2. **Topic & Pillar Queues**: Keep a bank of strategic ideas (e.g., Engineering, Growth, Contrarian, Memes).
3. **Multi-Persona AI Content Generator**:
   - *Thought Leader*
   - *Indie Hacker / Builder in Public*
   - *Technical Architect*
   - *Contrarian Analyst*
   - *Viral Storyteller*
4. **Cross-Platform Tailoring**: Automatically takes one core insight and generates:
   - Punchy 280-character X/Twitter posts or thread hooks
   - Professional LinkedIn posts with whitespace and hashtags
   - Engaging Reddit discussion posts with subreddit formatting
   - Bluesky / Mastodon skeets
5. **Evergreen Recycling**: Automatically recycles top-performing evergreen insights.

---

## 🔌 Supported Platforms & Channels

- **X (Twitter)**: Direct API v2 tweet publishing and thread support.
- **LinkedIn**: Personal profiles and company page updates via LinkedIn UGC API.
- **Reddit**: Post submissions to subreddits with title and selftext.
- **Bluesky**: AT Protocol integration for modern decentralized social publishing.
- **Webhooks**: Outbound HTTP webhooks to integrate with n8n, Make.com, Zapier, or custom microservices.
- **Simulation / Sandbox Mode**: Safely test your full autopilot pipeline without posting to live feeds.

---

## 🚀 Quickstart

### Option 1: Run with Docker Compose
```bash
git clone https://github.com/openpost/open-post.git
cd open-post
docker-compose up -d
```
Access the dashboard at `http://localhost:3000`.

### Option 2: Run with Node.js
```bash
git clone https://github.com/openpost/open-post.git
cd open-post
npm install
npm start
```

### Option 3: Standalone Single-File Web App
Open `open_post.html` directly in any web browser. It runs 100% client-side with persistent `localStorage`, full visual calendar, live composer, autopilot generation, and direct webhook dispatch!

---

## 🛠 API Reference

- `GET /api/posts`: List all drafts, scheduled, and published posts.
- `POST /api/posts`: Create and schedule a new post.
- `POST /api/posts/:id/publish-now`: Trigger immediate dispatch across assigned channels.
- `GET /api/channels`: List connected social media channels.
- `POST /api/channels`: Add or connect a channel.
- `GET /api/autopilot`: Retrieve autopilot queue and cadence settings.
- `PUT /api/autopilot`: Update topic queue, personas, and timing.
- `POST /api/autopilot/generate-now`: Trigger autonomous post creation and scheduling.

---

## 📜 License

MIT License. Free forever for personal, team, and commercial use.
