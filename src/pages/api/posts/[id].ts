import { deletePost, getPostById, slugExists, updatePost, type PostInput } from '../../../lib/posts';
import { categoryIdExists } from '../../../lib/categories';
import { notifySubscribers } from '../../../lib/notify';
import type { APIRoute } from 'astro';

export const prerender = false;

function validate(body: any): body is PostInput {
  return (
    typeof body.slug === 'string' &&
    /^[a-z0-9-]+$/.test(body.slug) &&
    (body.lang === 'ko' || body.lang === 'en') &&
    typeof body.title === 'string' &&
    body.title.trim().length > 0 &&
    typeof body.description === 'string' &&
    typeof body.category === 'string' &&
    body.category.length > 0 &&
    Array.isArray(body.tags) &&
    typeof body.contentHtml === 'string' &&
    typeof body.contentJson === 'string'
  );
}

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  const existing = await getPostById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const body = await request.json();
  if (!validate(body)) {
    return new Response(JSON.stringify({ error: 'invalid post data' }), { status: 400 });
  }

  if (!(await categoryIdExists(body.category))) {
    return new Response(JSON.stringify({ error: 'unknown category' }), { status: 400 });
  }

  if (await slugExists(body.lang, body.slug, id)) {
    return new Response(JSON.stringify({ error: 'slug already in use' }), { status: 409 });
  }

  await updatePost(id, {
    ...body,
    heroImageUrl: body.heroImageUrl ?? null,
    draft: Boolean(body.draft),
  });

  const wasPublishedJustNow = existing.draft && !body.draft;
  if (wasPublishedJustNow) {
    await notifySubscribers({ lang: body.lang, slug: body.slug, title: body.title, excerpt: body.description });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  await deletePost(id);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
