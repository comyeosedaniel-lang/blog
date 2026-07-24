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

export const CATEGORIES = [
  { id: 'dev', ko: '개발 이야기', en: 'Dev Stories' },
  { id: 'book', ko: '책 이야기', en: 'Book Stories' },
  { id: 'life', ko: '나의 이야기', en: 'My Story' },
  { id: 'us', ko: '우리의 이야기', en: 'Our Story' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

// Paste the verification codes Google Search Console / Naver Search Advisor
// give you when you add this site as a property. Leave blank to omit the tag.
export const SEO_VERIFICATION = {
  google: '',
  naver: '',
} as const;
