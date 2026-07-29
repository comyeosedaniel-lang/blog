// Edit these freely — they feed page titles, meta tags, and the footer.
export const SITE = {
  title: '나의 삶, 이야기 그리고 커리어',
  description: {
    ko: '생각과 기록을 남기는 공간.',
    en: 'Notes and ideas, written down.',
  },
  url: 'https://blog.mylineal.com',
  author: 'mylineal',
  github: 'https://github.com/comyeosedaniel-lang',
} as const;

// Categories are managed from /admin/categories (stored in D1), not here —
// see src/lib/categories.ts.

// Paste the verification codes Google Search Console / Naver Search Advisor
// give you when you add this site as a property. Leave blank to omit the tag.
export const SEO_VERIFICATION = {
  google: '',
  naver: '',
} as const;

// Self-hosted comments (Cloudflare Worker + D1). The Turnstile site key is
// public by design; the matching secret key lives only as a Worker secret.
export const COMMENTS = {
  apiUrl: 'https://mylineal-comments.comyeosedaniel.workers.dev',
  turnstileSiteKey: '0x4AAAAAAD9lIIkdkIoee_6_',
} as const;

// Same Turnstile widget reused for the newsletter signup form.
export const NEWSLETTER = {
  apiUrl: 'https://mylineal-newsletter.comyeosedaniel.workers.dev',
  turnstileSiteKey: '0x4AAAAAAD9lIIkdkIoee_6_',
} as const;

// Visitor-country lookup (Cloudflare's edge geo data), served by the same
// comments worker. Used to default non-Korean visitors to the English site.
export const GEO = {
  apiUrl: 'https://mylineal-comments.comyeosedaniel.workers.dev/geo',
} as const;

// R2 bucket's public URL, for images uploaded from the /admin editor.
export const UPLOADS_PUBLIC_URL = 'https://pub-f306afc3320d4b0fa973d58344df9d4a.r2.dev';
