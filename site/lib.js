export const SITE = 'https://codesbyfebin.github.io/Open-Post';
export const REPO = 'https://github.com/CodesbyFebin/Open-Post';
export const WIKI = `${REPO}/wiki`;
export const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const asset = (p) => `${base}${p}`;
