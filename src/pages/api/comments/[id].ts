import { deleteComment } from '../../../lib/comments';
import type { APIRoute } from 'astro';

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  const ok = await deleteComment(id);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'delete failed' }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
