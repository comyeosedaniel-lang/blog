import { env } from 'cloudflare:workers';
import { fetchAllFeeds, storeNewFeedItems } from '../../../lib/feed';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const key = request.headers.get('x-cron-secret');
  if (!env.CRON_SECRET || key !== env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const results = await fetchAllFeeds();
  let totalInserted = 0;
  const summary: Record<string, { fetched: number; inserted: number; error?: string }> = {};

  for (const result of results) {
    const inserted = await storeNewFeedItems(result.items);
    totalInserted += inserted;
    summary[result.source] = { fetched: result.items.length, inserted, error: result.error };
  }

  return new Response(JSON.stringify({ ok: true, totalInserted, summary }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
