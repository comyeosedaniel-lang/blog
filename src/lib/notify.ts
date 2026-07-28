import { env } from 'cloudflare:workers';
import { SITE, NEWSLETTER } from '../site.config';

const BROADCAST_URL = `${NEWSLETTER.apiUrl}/broadcast`;

interface NotifyInput {
  lang: 'ko' | 'en';
  slug: string;
  title: string;
  excerpt: string;
}

// Fire-and-forget-ish: logs but doesn't throw, so a broadcast hiccup never
// blocks the actual publish action.
export async function notifySubscribers({ lang, slug, title, excerpt }: NotifyInput): Promise<void> {
  if (!env.NEWSLETTER_ADMIN_KEY) return;

  const postUrl = lang === 'en' ? `${SITE.url}/en/blog/${slug}/` : `${SITE.url}/blog/${slug}/`;

  try {
    await fetch(BROADCAST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ adminKey: env.NEWSLETTER_ADMIN_KEY, title, postUrl, excerpt }),
    });
  } catch (err) {
    console.error('notifySubscribers failed', err);
  }
}
