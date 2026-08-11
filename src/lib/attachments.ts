import { env } from 'cloudflare:workers';
import { UPLOADS_PUBLIC_URL } from '../site.config';

export interface Attachment {
  id: number;
  slug: string;
  label: string;
  size: number;
  contentType: string | null;
  uploadedAt: Date;
  url: string;
}

interface AttachmentRow {
  id: number;
  slug: string;
  label: string;
  size: number;
  content_type: string | null;
  uploaded_at: string;
}

const R2_PREFIX = 'attachments/';

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    size: row.size,
    contentType: row.content_type,
    uploadedAt: new Date(row.uploaded_at),
    url: `${UPLOADS_PUBLIC_URL}/${R2_PREFIX}${row.slug}`,
  };
}

export async function listAttachments(): Promise<Attachment[]> {
  const { results } = await env.DB.prepare('SELECT * FROM attachments ORDER BY uploaded_at DESC').all<AttachmentRow>();
  return results.map(toAttachment);
}

export async function getAttachmentById(id: number): Promise<Attachment | null> {
  const row = await env.DB.prepare('SELECT * FROM attachments WHERE id = ?1').bind(id).first<AttachmentRow>();
  return row ? toAttachment(row) : null;
}

export async function slugExists(slug: string, excludeId?: number): Promise<boolean> {
  const row = excludeId
    ? await env.DB.prepare('SELECT id FROM attachments WHERE slug = ?1 AND id != ?2').bind(slug, excludeId).first()
    : await env.DB.prepare('SELECT id FROM attachments WHERE slug = ?1').bind(slug).first();
  return row !== null;
}

export function sanitizeSlug(filename: string): string {
  return filename.trim().replace(/[^\p{L}\p{N}._-]+/gu, '-');
}

export async function createAttachment(
  slug: string,
  label: string,
  file: File,
): Promise<Attachment> {
  await env.UPLOADS.put(`${R2_PREFIX}${slug}`, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const row = await env.DB.prepare(
    `INSERT INTO attachments (slug, label, size, content_type, uploaded_at)
     VALUES (?1, ?2, ?3, ?4, datetime('now')) RETURNING *`,
  )
    .bind(slug, label, file.size, file.type || null)
    .first<AttachmentRow>();

  return toAttachment(row!);
}

export async function replaceAttachmentFile(id: number, file: File): Promise<Attachment | null> {
  const existing = await getAttachmentById(id);
  if (!existing) return null;

  await env.UPLOADS.put(`${R2_PREFIX}${existing.slug}`, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const row = await env.DB.prepare(
    `UPDATE attachments SET size = ?1, content_type = ?2, uploaded_at = datetime('now') WHERE id = ?3 RETURNING *`,
  )
    .bind(file.size, file.type || null, id)
    .first<AttachmentRow>();

  return row ? toAttachment(row) : null;
}

export async function renameAttachmentLabel(id: number, label: string): Promise<void> {
  await env.DB.prepare('UPDATE attachments SET label = ?1 WHERE id = ?2').bind(label, id).run();
}

export async function deleteAttachment(id: number): Promise<boolean> {
  const existing = await getAttachmentById(id);
  if (!existing) return false;

  await env.UPLOADS.delete(`${R2_PREFIX}${existing.slug}`);
  await env.DB.prepare('DELETE FROM attachments WHERE id = ?1').bind(id).run();
  return true;
}
