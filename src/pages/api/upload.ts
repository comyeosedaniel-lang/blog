import { env } from 'cloudflare:workers';
import { UPLOADS_PUBLIC_URL } from '../../site.config';
import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB, generous given client-side resizing already happened

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'missing file' }), { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'file too large' }), { status: 413 });
  }
  if (!file.type.startsWith('image/')) {
    return new Response(JSON.stringify({ error: 'not an image' }), { status: 400 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  await env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return new Response(JSON.stringify({ url: `${UPLOADS_PUBLIC_URL}/${key}` }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
};
