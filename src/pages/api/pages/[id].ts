import { deletePage, getPageById, pageSlugExists, updatePage, type PageInput } from '../../../lib/pages';
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

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  const existing = await getPageById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!validate(body)) {
    return new Response(JSON.stringify({ error: 'invalid page data' }), { status: 400 });
  }

  if (await pageSlugExists(body.lang, body.slug, id)) {
    return new Response(JSON.stringify({ error: 'slug already in use' }), { status: 409 });
  }

  await updatePage(id, body);

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  await deletePage(id);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
