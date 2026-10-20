/** Static export for GitHub Pages at https://codesbyfebin.github.io/Open-Post/ */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/Open-Post';
export default {
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
