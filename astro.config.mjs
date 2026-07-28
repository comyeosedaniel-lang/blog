// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';

import mdx from '@astrojs/mdx';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.mylineal.com',
  output: 'server',
  integrations: [mdx()],

  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },

  // Sharp (Astro's default image service) needs native Node addons that
  // don't run in the Workers runtime — images are pre-optimized at upload
  // time instead (see src/lib/images.ts), so no on-request processing here.
  image: {
    service: passthroughImageService(),
  },

  adapter: cloudflare(),
});