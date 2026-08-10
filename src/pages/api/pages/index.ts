import { createPage, pageSlugExists, type PageInput } from '../../../lib/pages';
import type { APIRoute } from 'astro';

export const prerender = false;

function validate(body: any): body is PageInput {
  return (
    typeof body.slug === 'string' &&
    /^[a-z0-9-]+$/.test(body.slug) &&
    (body.lang === 'ko' || body.lang === 'en') &&
    typeof body.title === 'string' &&
    body.title.trim().length > 0 &&
    typeof body.contentHtml === 'string' &&
    typeof body.contentJson === 'string' &&
    (body.navLabel === null || typeof body.navLabel === 'string') &&
    typeof body.navOrder === 'number' &&
    typeof body.published === 'boolean'
  );
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!validate(body)) {
    return new Response(JSON.stringify({ error: 'invalid page data' }), { status: 400 });
  }

  if (await pageSlugExists(body.lang, body.slug)) {
    return new Response(JSON.stringify({ error: 'slug already in use' }), { status: 409 });
  }

  const id = await createPage(body);

  return new Response(JSON.stringify({ id }), { status: 201, headers: { 'content-type': 'application/json' } });
};
