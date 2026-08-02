// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// The GitHub Actions Pages workflow sets GITHUB_PAGES=true when building for
// deploy. Local dev and `npm run build` otherwise stay at the site root —
// only the published GitHub Pages build needs the /storefront-project prefix.
const isGhPagesBuild = process.env.GITHUB_PAGES === 'true';

// https://astro.build/config
export default defineConfig({
  site: 'https://2525jk.github.io',
  base: isGhPagesBuild ? '/storefront-project/' : '/',
  integrations: [react()]
});