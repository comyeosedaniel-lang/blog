// Astro's Cloudflare adapter only emits a `fetch` handler in dist/server/entry.mjs
// (Cron Triggers need a `scheduled` export too, which the adapter doesn't support
// natively). This runs after `astro build` to wrap the generated entry with one.
import fs from 'node:fs';
import path from 'node:path';

const serverDir = path.resolve('dist/server');
const entryPath = path.join(serverDir, 'entry.mjs');
const astroEntryPath = path.join(serverDir, 'entry-astro.mjs');

if (!fs.existsSync(entryPath)) {
  console.error('patch-worker-entry: dist/server/entry.mjs not found, skipping');
  process.exit(0);
}

fs.copyFileSync(entryPath, astroEntryPath);

const wrapper = `import astroHandler from './entry-astro.mjs';

const SITE_ORIGIN = 'https://blog.mylineal.com';

export default {
  fetch: astroHandler.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      fetch(\`\${SITE_ORIGIN}/api/cron/feed-fetch\`, {
        method: 'POST',
        headers: { 'x-cron-secret': env.CRON_SECRET ?? '', Origin: SITE_ORIGIN },
      }).catch((err) => console.error('scheduled feed-fetch failed', err)),
    );
  },
};
`;

fs.writeFileSync(entryPath, wrapper);
console.log('patch-worker-entry: added scheduled() handler to dist/server/entry.mjs');
