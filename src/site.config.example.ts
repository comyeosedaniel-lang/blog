// Template starting point — copy this file to `site.config.ts` and fill in
// your own values. See SETUP.md for the full deployment walkthrough.
export const SITE = {
  title: 'My Blog',
  description: {
    ko: '생각과 기록을 남기는 공간.',
    en: 'Notes and ideas, written down.',
  },
  // Your domain, once DNS/Custom Domain is set up (see SETUP.md).
  url: 'https://your-domain.example.com',
  author: 'Your Name',
  github: 'https://github.com/your-username',
} as const;

// Categories are managed from /admin/categories (stored in D1), not here —
// see src/lib/categories.ts. schema.sql seeds four defaults on first setup;
// rename/delete them from the admin UI after deploying.

// Paste the verification codes Google Search Console / Naver Search Advisor
// give you when you add this site as a property. Leave blank to omit the tag.
export const SEO_VERIFICATION = {
  google: '',
  naver: '',
} as const;

// Self-hosted comments (Cloudflare Worker + D1), deployed separately from
// comments-worker/. Fill in its URL after deploying it (see SETUP.md).
// The Turnstile site key is public by design; create your own widget at
// https://dash.cloudflare.com/?to=/:account/turnstile and paste the site key
// here — the matching secret key goes to comments-worker as a Worker secret.
export const COMMENTS = {
  apiUrl: 'https://your-comments-worker.your-subdomain.workers.dev',
  turnstileSiteKey: 'YOUR_TURNSTILE_SITE_KEY',
} as const;

// Same Turnstile widget reused for the newsletter signup form. Fill in the
// newsletter-worker URL after deploying it (see SETUP.md).
export const NEWSLETTER = {
  apiUrl: 'https://your-newsletter-worker.your-subdomain.workers.dev',
  turnstileSiteKey: 'YOUR_TURNSTILE_SITE_KEY',
} as const;

// Visitor-country lookup (Cloudflare's edge geo data), served by the same
// comments worker. Used to default non-Korean visitors to the English site.
export const GEO = {
  apiUrl: 'https://your-comments-worker.your-subdomain.workers.dev/geo',
} as const;

// R2 bucket's public URL, for images uploaded from the /admin editor.
// Printed by `wrangler r2 bucket dev-url enable <bucket-name>` (see SETUP.md).
export const UPLOADS_PUBLIC_URL = 'https://your-bucket-public-url.r2.dev';
