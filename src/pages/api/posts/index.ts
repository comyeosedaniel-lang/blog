import { createPost, slugExists, type PostInput } from '../../../lib/posts';
import { CATEGORIES } from '../../../site.config';
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
    CATEGORIES.some((c) => c.id === body.category) &&
    Array.isArray(body.tags) &&
    typeof body.contentHtml === 'string' &&
    typeof body.contentJson === 'string'
  );
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  if (!validate(body)) {
    return new Response(JSON.stringify({ error: 'invalid post data' }), { status: 400 });
  }

  if (await slugExists(body.lang, body.slug)) {
    return new Response(JSON.stringify({ error: 'slug already in use' }), { status: 409 });
  }

  const id = await createPost({
    ...body,
    heroImageUrl: body.heroImageUrl ?? null,
    draft: Boolean(body.draft),
  });

  if (!body.draft) {
    await notifySubscribers({ lang: body.lang, slug: body.slug, title: body.title, excerpt: body.description });
  }

  return new Response(JSON.stringify({ id }), { status: 201, headers: { 'content-type': 'application/json' } });
};
