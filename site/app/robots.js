import { SITE } from '../lib';
export const dynamic = 'force-static';
export default function robots() { return { rules: [{ userAgent: '*', allow: '/' }], sitemap: `${SITE}/sitemap.xml`, host: SITE }; }
