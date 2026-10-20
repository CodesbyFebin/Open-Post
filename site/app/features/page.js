import { asset } from '../../lib';
export const metadata = { title: 'Features', description: 'Scheduling, autopilot, real channel drivers, LLM providers, sandbox mode and a REST API in one small self-hosted app.' };

const GROUPS = [
  ['Scheduling', ['Compose once, override per platform (X, LinkedIn, Reddit title/body, Bluesky)', 'Live character counters: 280 for X, 300 for Bluesky, 3000 for LinkedIn', 'X threads: split with a line containing ---, posted as a reply chain', 'Drafts, scheduled, published, partial and failed states', 'Automatic retries with exponential backoff (1, 2, 4 minutes), configurable attempts', 'Per-channel delivery log with remote IDs and post URLs', 'Month calendar: click a day to schedule'], 'compose'],
  ['Autopilot', ['Cadence slots such as 09:00, 13:00, 17:30 in server time (set TZ)', 'Plans 1 to 14 days ahead and never double-books a slot', 'Topic queue with content pillars', 'Evergreen topics are recycled when the queue runs dry', 'Five personas: Thought Leader, Indie Hacker, Technical Architect, Contrarian Analyst, Viral Storyteller', 'Each generated post records which engine wrote it and why it fell back'], 'autopilot'],
  ['Channels', ['X API v2: OAuth 1.0a user context or OAuth 2.0 user token', 'LinkedIn: UGC Posts API for members or organizations', 'Reddit: script-app password grant or access token, self posts to any subreddit', 'Bluesky: AT Protocol session, with link and hashtag facets', 'Webhooks: JSON payload signed with HMAC-SHA256', 'Sandbox: an explicit channel type, or SANDBOX_MODE=true for everything', 'Multiple accounts per network via env prefixes (X_BRAND2_API_KEY …)'], 'channels'],
];

export default function Features() {
  return (
    <div className="page wrap">
      <h1>Features</h1>
      <p className="lead">Everything below is implemented and covered by the test suite in the repository. The list doesn't include anything that's only planned.</p>
      {GROUPS.map(([t, items, shot]) => (
        <section key={t} className="grid2">
          <div><h2>{t}</h2><ul>{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
          <img className="shot" src={asset(`/screenshots/${shot}.png`)} alt={`${t} screen`} />
        </section>
      ))}
      <section>
        <h2>AI providers</h2>
        <table><thead><tr><th>Provider</th><th>Env vars</th><th>Notes</th></tr></thead><tbody>
          <tr><td>Heuristic (default)</td><td>none</td><td>Offline and deterministic templates. Works without any key.</td></tr>
          <tr><td>OpenAI</td><td><code>OPENAI_API_KEY</code>, <code>OPENAI_BASE_URL</code></td><td>Chat Completions in JSON mode. Any OpenAI-compatible endpoint works.</td></tr>
          <tr><td>Anthropic</td><td><code>ANTHROPIC_API_KEY</code></td><td>Messages API</td></tr>
          <tr><td>Google Gemini</td><td><code>GEMINI_API_KEY</code></td><td>generateContent with a JSON response type</td></tr>
          <tr><td>Ollama</td><td><code>OLLAMA_URL</code></td><td>Local models, so nothing leaves your network</td></tr>
        </tbody></table>
        <p className="muted">If a provider errors, Open Post falls back to the heuristic engine and stores the reason with the post.</p>
      </section>
      <section>
        <h2>Operations</h2>
        <ul>
          <li>Storage: built-in <code>node:sqlite</code> (Node 22+), <code>better-sqlite3</code>, or an atomic JSON file</li>
          <li>Optional bearer-token protection with <code>API_TOKEN</code></li>
          <li>Docker image runs as a non-root user and includes a healthcheck</li>
          <li><code>node cli.js tick</code> runs one scheduler pass, for cron or systemd timers</li>
          <li>Measured idle memory on Node 20 is about 70 MB RSS</li>
        </ul>
      </section>
    </div>
  );
}
