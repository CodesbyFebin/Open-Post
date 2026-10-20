import Link from 'next/link';
import { REPO, asset } from '../lib';

const FEATURES = [
  ['One process', 'API, dashboard and scheduler run in a single Node.js process. Data lives in one SQLite file (JSON fallback).'],
  ['Real publishing', 'Native drivers for X API v2 (with threads), LinkedIn UGC, Reddit, Bluesky AT Protocol and signed webhooks.'],
  ['Autopilot', 'Cadence slots plus a topic queue. Open Post drafts posts and fills empty slots, then recycles evergreen topics.'],
  ['Bring your own AI', 'OpenAI, Anthropic, Gemini or a local Ollama model, with an offline heuristic fallback that needs no key.'],
  ['Sandbox mode', 'Run the whole pipeline with SANDBOX_MODE=true. Nothing leaves your machine, and results say so.'],
  ['Secrets stay in env', 'Credentials are read from environment variables only. The database never stores tokens.'],
];

export default function Home() {
  return (
    <>
      <div className="hero wrap">
        <h1>Run your social media on <span className="grad">autopilot</span>, on your own server.</h1>
        <p className="muted">Open Post is a free, MIT-licensed scheduler and AI autopilot for X, LinkedIn, Reddit, Bluesky and webhooks. It runs as one small Node.js process with SQLite. No Redis, no Temporal, no paid tier.</p>
        <div className="ctas"><Link className="btn" href="/docs/">Quickstart</Link><a className="btn ghost" href={REPO}>View on GitHub</a></div>
      </div>
      <section className="wrap"><img className="shot" src={asset('/screenshots/queue.png')} alt="Open Post dashboard queue view" /></section>
      <section className="wrap">
        <h2>What you get</h2>
        <div className="grid">{FEATURES.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p className="muted">{d}</p></div>)}</div>
      </section>
      <section className="wrap">
        <h2>Up in one command</h2>
        <pre><code>{`git clone https://github.com/CodesbyFebin/Open-Post.git
cd Open-Post && cp .env.example .env
docker compose up -d        # or: npm install && npm start
open http://localhost:3000`}</code></pre>
        <p className="muted">Set <code>SANDBOX_MODE=true</code> for a dry run, then add real credentials when you're ready.</p>
      </section>
      <section className="wrap grid2">
        <div className="card"><h3>Self-hosters and indie builders</h3><p className="muted">Schedule a week of posts from a $5 VPS, a Raspberry Pi or your laptop, and own the data file.</p></div>
        <div className="card"><h3>Developers and automators</h3><p className="muted">A small REST API with an <a href={`${REPO}/blob/main/openapi.yaml`}>OpenAPI spec</a>, and webhooks for n8n, Make or Zapier.</p></div>
      </section>
    </>
  );
}
