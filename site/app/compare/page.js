export const metadata = { title: 'Open Post vs Postiz', description: 'An honest comparison of Open Post and Postiz for self-hosting.' };
const ROWS = [
  ['License', 'MIT', 'AGPL-3.0'],
  ['Required services', 'None. One Node process and a SQLite file', 'PostgreSQL 14+, Redis 6+, Temporal (since v2.12.0)'],
  ['Documented hardware', 'Measured ~70 MB RSS idle', '2 GB RAM floor, 8 GB recommended (Postiz docs)'],
  ['Platforms', 'X, LinkedIn, Reddit, Bluesky, webhooks', 'Many more (Instagram, Facebook, TikTok, YouTube, Threads, Mastodon and others)'],
  ['Multi-user teams', 'No. Single-tenant, optional API token', 'Yes, with organizations and users'],
  ['Media uploads', 'Not yet (text posts)', 'Yes'],
  ['AI', 'OpenAI, Anthropic, Gemini, Ollama, offline heuristic', 'Built-in AI features. See Postiz docs'],
  ['Hosted cloud', 'No, self-host only', 'Yes, Postiz Cloud'],
];
export default function Compare() {
  return (
    <div className="page wrap">
      <h1>Open Post vs Postiz</h1>
      <p className="lead">Postiz is a mature, full-featured product. Open Post is smaller on purpose: one process, a few networks, easy to read and run. Pick the one that fits.</p>
      <table><thead><tr><th></th><th>Open Post</th><th>Postiz</th></tr></thead><tbody>{ROWS.map(([k, a, b]) => <tr key={k}><td><b>{k}</b></td><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
      <p className="muted">The Postiz column comes from its self-hosting docs (docs.postiz.com, System Requirements and Configuration Reference), checked October 2026. If something has changed, please open an issue.</p>
      <div className="grid2">
        <div className="card"><h3>Choose Open Post if…</h3><ul><li>you post to X, LinkedIn, Reddit or Bluesky as one person or a small team</li><li>you want to run on tiny hardware or next to other apps</li><li>you want to read the whole codebase in an afternoon</li></ul></div>
        <div className="card"><h3>Choose Postiz if…</h3><ul><li>you need Instagram, TikTok, YouTube or Facebook</li><li>you need teams, approvals and media</li><li>you'd rather pay for a hosted service</li></ul></div>
      </div>
    </div>
  );
}
