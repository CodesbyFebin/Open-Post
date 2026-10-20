import './globals.css';
import Shell from '../components/Shell';
import { SITE, asset } from '../lib';

export const metadata = {
  metadataBase: new URL(`${SITE}/`),
  title: { default: 'Open Post — free, self-hosted social media scheduler & AI autopilot', template: '%s · Open Post' },
  description: 'Schedule and auto-publish to X, LinkedIn, Reddit, Bluesky and webhooks from one small Node process with SQLite. No Redis, no Temporal, MIT licensed.',
  keywords: ['social media scheduler', 'self-hosted', 'Postiz alternative', 'Buffer alternative', 'open source', 'autopilot', 'Bluesky', 'X API', 'LinkedIn', 'Reddit', 'Ollama'],
  openGraph: { type: 'website', siteName: 'Open Post', url: `${SITE}/`, images: [{ url: `${SITE}/social-preview.png`, width: 1280, height: 640 }] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: asset('/logo.svg') },
  alternates: { canonical: './' },
};

const jsonLd = {
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Open Post', applicationCategory: 'BusinessApplication',
  operatingSystem: 'Linux, macOS, Windows (Node.js 20+ or Docker)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/licenses/MIT', codeRepository: 'https://github.com/CodesbyFebin/Open-Post', url: `${SITE}/`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
