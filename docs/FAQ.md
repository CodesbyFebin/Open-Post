# FAQ

**Is it really free?**
Yes. It's MIT licensed, with no paid tier, telemetry or license key. You pay for your own hosting, and for any paid platform APIs or LLMs you choose to use.

**Why do I have to paste tokens into env vars instead of clicking "Connect"?**
OAuth "connect" flows need a registered app per network and a public callback URL. Env vars work everywhere, keep secrets out of the database, and are easy to rotate. Built-in OAuth flows are on the roadmap.

**My post shows "missing env vars".**
The channel card lists the exact variable names. Add them to `.env`, then restart.

**My X post failed with 401 or 403.**
Make sure the app has *Read and write* permission and that you regenerated the access token after changing it. An app-only Bearer token can't post.

**Does it post images?**
Not yet. Text posts only. Media upload is the top roadmap item.

**Will autopilot post nonsense?**
Autopilot only writes about topics you add. Generated posts are ordinary scheduled posts, so you can review or edit them before they're due. For manual approval, keep autopilot disabled and use "Fill slots now".

**Can I use a local model?**
Yes. Set `AI_PROVIDER=ollama`, run Ollama, and pull a model (`ollama pull llama3.1`).

**How do I test without posting?**
Set `SANDBOX_MODE=true`, or use a `sandbox` channel.

**How is this different from Postiz?**
Postiz supports many more networks, teams and media, but needs PostgreSQL, Redis and Temporal. Open Post is a single small process for a few networks. See the [comparison page](https://codesbyfebin.github.io/Open-Post/compare/).

**What time zone are cadence slots in?**
The server's local time. Set `TZ` (e.g. `TZ=Asia/Kolkata`).

**Where's my data?**
In `DATA_DIR`: `open-post.db` (SQLite) or `open-post.json`.
