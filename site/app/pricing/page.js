import { REPO } from '../../lib';
export const metadata = { title: 'Pricing: free', description: 'Open Post is free and MIT licensed. No tiers, no seats, no feature gates.' };
export default function Pricing() {
  return (
    <div className="page wrap">
      <h1>Pricing</h1>
      <p className="lead">There is one plan. It's free.</p>
      <div className="grid2">
        <div className="card">
          <div className="price">$0</div><p className="muted">forever, MIT license</p>
          <ul><li>Unlimited channels, posts and schedules</li><li>Every feature, including autopilot and every driver</li><li>Commercial use allowed</li><li>No telemetry, no account, no license key</li></ul>
          <a className="btn" href={REPO}>Get the code</a>
        </div>
        <div className="card">
          <h3>What you do pay for</h3>
          <ul>
            <li><b>Hosting</b>: any machine that runs Node 20+ or Docker.</li>
            <li><b>Platform APIs</b>: some networks charge for API access. X's API tiers are the main example. Check each platform's current terms.</li>
            <li><b>LLM usage</b>: only if you pick a paid provider. Ollama and the built-in heuristic engine cost nothing.</li>
          </ul>
          <h3>Supporting the project</h3>
          <p className="muted">Star the repo, report bugs, send pull requests, or sponsor through the FUNDING links on GitHub.</p>
        </div>
      </div>
    </div>
  );
}
