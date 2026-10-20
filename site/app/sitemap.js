import { SITE } from '../lib';
export const dynamic = 'force-static';
const PAGES = ['', 'features/', 'docs/', 'compare/', 'pricing/', 'community/'];
export default function sitemap() { return PAGES.map((p) => ({ url: `${SITE}/${p}`, changeFrequency: 'weekly', priority: p ? 0.7 : 1 })); }
