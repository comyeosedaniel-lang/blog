export type Lang = 'ko' | 'en';

export const defaultLang: Lang = 'ko';

export const ui = {
  ko: {
    'nav.home': '홈',
    'nav.about': '소개',
    'nav.lang': 'English',
    'home.recent': '최근 글',
    'home.empty': '아직 작성된 글이 없어요.',
    'category.all': '전체',
    'post.readingTime': '분 읽기',
    'post.updated': '수정됨',
    'post.back': '목록으로',
    'footer.rss': 'RSS',
    'footer.source': '소스코드',
    '404.title': '페이지를 찾을 수 없어요',
    '404.body': '주소를 다시 확인해 주세요.',
    '404.home': '홈으로 돌아가기',
    'theme.toggle': '테마 전환',
  },
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.lang': '한국어',
    'home.recent': 'Recent posts',
    'home.empty': 'No posts yet.',
    'category.all': 'All',
    'post.readingTime': 'min read',
    'post.updated': 'Updated',
    'post.back': 'Back to posts',
    'footer.rss': 'RSS',
    'footer.source': 'Source',
    '404.title': 'Page not found',
    '404.body': 'Double-check the address and try again.',
    '404.home': 'Back home',
    'theme.toggle': 'Toggle theme',
  },
} as const;

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)['ko']): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
