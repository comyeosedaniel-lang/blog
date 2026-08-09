import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as any;
  const text = typeof body?.text === 'string' ? body.text : '';
  if (!text) {
    return new Response(JSON.stringify({ error: 'missing text' }), { status: 400 });
  }

  try {
    const result = await env.AI.run('@cf/meta/m2m100-1.2b', {
      text,
      source_lang: 'en',
      target_lang: 'ko',
    });
    return new Response(JSON.stringify({ translated: (result as any).translated_text ?? '' }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '번역에 실패했어요.' }), { status: 502 });
  }
};
