import { createAttachment, sanitizeSlug, slugExists } from '../../../lib/attachments';
import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_BYTES = 100 * 1024 * 1024; // 100MB

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('file');
  const label = String(form.get('label') ?? '').trim();
  const customSlug = String(form.get('slug') ?? '').trim();

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'missing file' }), { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'file too large' }), { status: 413 });
  }

  const slug = sanitizeSlug(customSlug || file.name);
  if (!slug) {
    return new Response(JSON.stringify({ error: 'invalid slug' }), { status: 400 });
  }
  if (await slugExists(slug)) {
    return new Response(JSON.stringify({ error: 'slug already in use — rename it or replace the existing file instead' }), {
      status: 409,
    });
  }

  const attachment = await createAttachment(slug, label || file.name, file);

  return new Response(JSON.stringify(attachment), { status: 201, headers: { 'content-type': 'application/json' } });
};
