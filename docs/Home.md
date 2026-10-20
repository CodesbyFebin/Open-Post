<img src="https://raw.githubusercontent.com/CodesbyFebin/Open-Post/main/assets/banner.png" alt="Open Post banner: Social media on autopilot. On your server." width="100%">

# Open Post documentation

Open Post is a free, MIT-licensed, self-hosted social media scheduler and AI autopilot. A single Node.js process serves the dashboard, the REST API and the scheduler, and keeps its data in one SQLite file (or a JSON file as a fallback). It publishes to **X, LinkedIn, Reddit, Bluesky and webhooks**, and it can draft posts with **OpenAI, Anthropic, Gemini, Ollama** or an offline template engine.

## Start here

| If you want to… | Read |
| --- | --- |
| Try it in five minutes | [Getting Started](Getting-Started) |
| Install it on Docker, Node, a VPS or a Raspberry Pi | [Installation](Installation) |
| See every setting | [Configuration](Configuration) |
| Publish your first real post | [Tutorial: First Post](Tutorial-First-Post) |
| Connect X, LinkedIn, Reddit, Bluesky or a webhook | [Channels](Channels) |
| Let it post for you | [Tutorial: Autopilot Setup](Tutorial-Autopilot-Setup) |
| Learn the dashboard | [Dashboard Guide](Dashboard-Guide) |
| Script it | [API Reference](API-Reference) |
| Run it in production | [Deployment](Deployment) |
| Fix a problem | [Troubleshooting](Troubleshooting) · [FAQ](FAQ) |
| Hack on it | [Architecture](Architecture) · [Contributing](Contributing) |

## What's in v1.1

- Composer with per-platform versions, live character limits and X threads
- Queue, calendar, retries with backoff, and a delivery log for every channel
- Drivers for X API v2, LinkedIn UGC, Reddit, Bluesky AT Protocol, signed webhooks, and a sandbox
- Autopilot: cadence slots, a topic queue, personas and evergreen recycling
- Secrets come only from environment variables
- Optional API token, Docker image, and a `cli.js tick` command for cron

**Not in v1.1** (planned): media uploads, OAuth connect buttons, Mastodon and Threads, engagement analytics, multi-user teams.

<img src="https://raw.githubusercontent.com/CodesbyFebin/Open-Post/main/assets/screenshots/queue.png" alt="Open Post dashboard: queue view" width="100%">

> These pages are mirrored from [`docs/`](https://github.com/CodesbyFebin/Open-Post/tree/main/docs) in the repository. Edit them there and open a pull request.
