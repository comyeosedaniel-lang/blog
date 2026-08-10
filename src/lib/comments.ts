import { env } from 'cloudflare:workers';
import { COMMENTS } from '../site.config';

export interface AdminComment {
  id: number;
  post_id: string;
  name: string;
  message: string;
  created_at: string;
}

export async function listRecentComments(limit = 50): Promise<AdminComment[]> {
  if (!env.COMMENTS_ADMIN_KEY) return [];

  const res = await fetch(
    `${COMMENTS.apiUrl}/comments/recent?adminKey=${encodeURIComponent(env.COMMENTS_ADMIN_KEY)}&limit=${limit}`,
  );
  if (!res.ok) return [];

  const data = (await res.json()) as { comments?: AdminComment[] };
  return data.comments ?? [];
}

export async function deleteComment(id: number): Promise<boolean> {
  if (!env.COMMENTS_ADMIN_KEY) return false;

  const res = await fetch(`${COMMENTS.apiUrl}/comments/${id}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ adminKey: env.COMMENTS_ADMIN_KEY }),
  });

  return res.ok;
}
