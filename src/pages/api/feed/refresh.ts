import { fetchAllFeeds, storeNewFeedItems } from '../../../lib/feed';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async () => {
  const results = await fetchAllFeeds();
  let totalInserted = 0;
  for (const result of results) {
    totalInserted += await storeNewFeedItems(result.items);
  }
  return new Response(JSON.stringify({ ok: true, totalInserted }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
