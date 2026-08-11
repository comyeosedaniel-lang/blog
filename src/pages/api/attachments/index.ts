import { createAttachment, sanitizeSlug, slugExists } from '../../../lib/attachments';
import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_BYTES = 100 * 1024 * 1024; // 100MB

async function uniqueSlug(base: string): Promise<string> {
  if (!(await slugExists(base))) return base;

  const dotIndex = base.lastIndexOf('.');
  const stem = dotIndex > 0 ? base.slice(0, dotIndex) : base;
  const ext = dotIndex > 0 ? base.slice(dotIndex) : '';

  for (let n = 2; n < 1000; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!(await slugExists(candidate))) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('file');
  const label = String(form.get('label') ?? '').trim();
  const customSlug = String(form.get('slug') ?? '').trim();
  const postIdRaw = form.get('postId');
  const postId = postIdRaw ? Number(postIdRaw) : null;

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'missing file' }), { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'file too large' }), { status: 413 });
  }

  const baseSlug = sanitizeSlug(customSlug || file.name);
  if (!baseSlug) {
    return new Response(JSON.stringify({ error: 'invalid slug' }), { status: 400 });
  }
  const slug = await uniqueSlug(baseSlug);

  const attachment = await createAttachment(slug, label || file.name, file, Number.isInteger(postId) ? postId : null);

  return new Response(JSON.stringify(attachment), { status: 201, headers: { 'content-type': 'application/json' } });
};
