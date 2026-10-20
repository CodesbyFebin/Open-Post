import { REPO } from '../../lib';
export const metadata = { title: 'About & community', description: 'Who builds Open Post, how to contribute, and where to get help.' };
export default function Community() {
  return (
    <div className="page wrap">
      <h1>About & community</h1>
      <p className="lead">Open Post is an independent open-source project started by <a href="https://github.com/CodesbyFebin">@CodesbyFebin</a>. It's young, and contributions of every size are welcome.</p>
      <div className="grid">
        <div className="card"><h3>Get help</h3><p className="muted">Ask questions in <a href={`${REPO}/discussions`}>Discussions</a> or open an <a href={`${REPO}/issues/new/choose`}>issue</a>.</p></div>
        <div className="card"><h3>Contribute</h3><p className="muted">Read <a href={`${REPO}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>. Good first areas: new drivers (Mastodon, Threads), media uploads, i18n.</p></div>
        <div className="card"><h3>Security</h3><p className="muted">Report vulnerabilities privately, as described in <a href={`${REPO}/blob/main/SECURITY.md`}>SECURITY.md</a>.</p></div>
      </div>
      <section><h2>Principles</h2><ul><li>Small and readable beats clever.</li><li>Secrets never touch the database.</li><li>No fake numbers: every metric in the app comes from your own data.</li><li>Free forever under MIT.</li></ul></section>
      <section><h2>Code of conduct</h2><p>Everyone who takes part follows the <a href={`${REPO}/blob/main/CODE_OF_CONDUCT.md`}>Contributor Covenant</a>.</p></section>
    </div>
  );
}
