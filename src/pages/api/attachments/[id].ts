import { deleteAttachment, getAttachmentById, renameAttachmentLabel, replaceAttachmentFile } from '../../../lib/attachments';
import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_BYTES = 100 * 1024 * 1024; // 100MB

export const PUT: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  const existing = await getAttachmentById(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const label = form.get('label');

  if (typeof label === 'string' && label.trim()) {
    await renameAttachmentLabel(id, label.trim());
  }

  if (file instanceof File) {
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'file too large' }), { status: 413 });
    }
    await replaceAttachmentFile(id, file);
  }

  const updated = await getAttachmentById(id);
  return new Response(JSON.stringify(updated), { headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  const ok = await deleteAttachment(id);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
