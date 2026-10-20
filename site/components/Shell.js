import Link from 'next/link';
import { REPO, WIKI, asset } from '../lib';

const NAV = [['/features/', 'Features'], ['/docs/', 'Quickstart'], ['/compare/', 'Compare'], ['/pricing/', 'Pricing'], ['/community/', 'Community']];

export default function Shell({ children }) {
  return (
    <>
      <header className="nav">
        <div className="wrap navin">
          <Link href="/" className="brand"><img src={asset('/logo.svg')} alt="" width="28" height="28" /> Open Post</Link>
          <nav>{NAV.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}<a href={REPO} className="btn sm">GitHub</a></nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <div className="wrap fgrid">
          <div><b>Open Post</b><p className="muted">Free, self-hosted social media scheduling and autopilot. MIT licensed.</p></div>
          <div><b>Project</b><a href={REPO}>Source code</a><a href={`${REPO}/releases`}>Releases</a><a href={`${REPO}/blob/main/CHANGELOG.md`}>Changelog</a></div>
          <div><b>Docs</b><a href={WIKI}>Wiki</a><a href={`${REPO}/blob/main/openapi.yaml`}>OpenAPI spec</a><a href={`${REPO}/blob/main/SECURITY.md`}>Security</a></div>
          <div><b>Community</b><a href={`${REPO}/issues`}>Issues</a><a href={`${REPO}/discussions`}>Discussions</a><a href={`${REPO}/blob/main/CONTRIBUTING.md`}>Contributing</a></div>
        </div>
      </footer>
    </>
  );
}
