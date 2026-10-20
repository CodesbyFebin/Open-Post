import { REPO, WIKI } from '../../lib';
export const metadata = { title: 'Quickstart', description: 'Install Open Post with Docker or Node.js, connect channels with env vars, and schedule your first post.' };
export default function Docs() {
  return (
    <div className="page wrap">
      <h1>Quickstart</h1>
      <p className="lead">This takes about five minutes from clone to your first sandboxed post. Full docs are in the <a href={WIKI}>wiki</a>.</p>
      <h2>1. Install</h2>
      <h3>Docker</h3>
      <pre><code>{`git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
cp .env.example .env          # set SANDBOX_MODE=true for a first run
docker compose up -d --build`}</code></pre>
      <h3>Node.js 20.12+</h3>
      <pre><code>{`git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post
npm install
cp .env.example .env
npm start                     # http://localhost:3000`}</code></pre>
      <h2>2. Add a channel</h2>
      <p>Open the dashboard and go to <b>Channels</b>. Pick a type and name it. The channel card lists the env vars it still needs. Set them in <code>.env</code> and restart:</p>
      <table><thead><tr><th>Type</th><th>Env vars (default prefix)</th></tr></thead><tbody>
        <tr><td>x</td><td><code>X_API_KEY X_API_SECRET X_ACCESS_TOKEN X_ACCESS_SECRET</code> or <code>X_OAUTH2_USER_TOKEN</code></td></tr>
        <tr><td>linkedin</td><td><code>LINKEDIN_ACCESS_TOKEN LINKEDIN_AUTHOR_URN</code></td></tr>
        <tr><td>reddit</td><td><code>REDDIT_CLIENT_ID REDDIT_CLIENT_SECRET REDDIT_USERNAME REDDIT_PASSWORD</code> (+ subreddit on the channel)</td></tr>
        <tr><td>bluesky</td><td><code>BLUESKY_IDENTIFIER BLUESKY_APP_PASSWORD</code></td></tr>
        <tr><td>webhook</td><td>URL on the channel or <code>WEBHOOK_URL</code>; optional <code>WEBHOOK_SECRET</code></td></tr>
        <tr><td>sandbox</td><td>none</td></tr>
      </tbody></table>
      <h2>3. Schedule via the API</h2>
      <pre><code>{`curl -X POST localhost:3000/api/channels -H 'Content-Type: application/json' \\
  -d '{"type":"sandbox","name":"Try it"}'

curl -X POST localhost:3000/api/posts -H 'Content-Type: application/json' \\
  -d '{"content":"Hello from Open Post","channelIds":["<id>"],"scheduledFor":"2026-11-01T09:00:00Z"}'`}</code></pre>
      <p>The scheduler checks every 30 seconds and publishes posts that are due. See the <a href={`${REPO}/blob/main/openapi.yaml`}>OpenAPI spec</a> for every endpoint.</p>
      <h2>4. Turn on autopilot</h2>
      <p>Under <b>Autopilot</b>, add topics, pick a persona and target channels, set cadence slots, and enable it. To use an LLM, set <code>AI_PROVIDER</code> to <code>openai</code>, <code>anthropic</code>, <code>gemini</code> or <code>ollama</code>, plus that provider's key.</p>
      <h2>Next steps</h2>
      <ul><li><a href={`${WIKI}/Configuration`}>Configuration reference</a></li><li><a href={`${WIKI}/Channels`}>Getting API credentials for each network</a></li><li><a href={`${WIKI}/Deployment`}>Deploying behind a reverse proxy</a></li></ul>
    </div>
  );
}
