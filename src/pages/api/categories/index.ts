import { createCategory, categoryIdExists, type CategoryInput } from '../../../lib/categories';
import type { APIRoute } from 'astro';

export const prerender = false;

function validate(body: any): body is CategoryInput {
  return (
    typeof body.id === 'string' &&
    /^[a-z0-9-]+$/.test(body.id) &&
    typeof body.ko === 'string' &&
    body.ko.trim().length > 0 &&
    typeof body.en === 'string' &&
    body.en.trim().length > 0
  );
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!validate(body)) {
    return new Response(JSON.stringify({ error: 'invalid category data' }), { status: 400 });
  }

  if (await categoryIdExists(body.id)) {
    return new Response(JSON.stringify({ error: 'id already in use' }), { status: 409 });
  }

  await createCategory({ id: body.id, ko: body.ko.trim(), en: body.en.trim() });

  return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'content-type': 'application/json' } });
};
