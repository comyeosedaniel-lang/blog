import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

export const PATCH: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }
  await env.DB.prepare('UPDATE feed_items SET reviewed = 1 WHERE id = ?1').bind(id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }
  await env.DB.prepare('DELETE FROM feed_items WHERE id = ?1').bind(id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
