import type { Lang } from '../i18n/ui';

// Korean is estimated by character count (no reliable word boundaries),
// English by word count — rough reading-speed averages for each.
export function estimateReadingTime(raw: string, lang: Lang): number {
  const text = raw.replace(/```[\s\S]*?```/g, '').trim();

  if (lang === 'ko') {
    const chars = text.replace(/\s+/g, '').length;
    return Math.max(1, Math.round(chars / 500));
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
