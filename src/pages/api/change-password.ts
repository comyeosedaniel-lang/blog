import { hashPassword, verifyPassword } from '../../lib/auth';
import { getAdminPasswordHash, setAdminPasswordHash } from '../../lib/admin';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (newPassword.length < 8) {
    return new Response(JSON.stringify({ error: '새 비밀번호는 8자 이상이어야 해요.' }), { status: 400 });
  }

  const storedHash = await getAdminPasswordHash();
  const valid = storedHash ? await verifyPassword(currentPassword, storedHash) : false;
  if (!valid) {
    return new Response(JSON.stringify({ error: '현재 비밀번호가 일치하지 않아요.' }), { status: 403 });
  }

  await setAdminPasswordHash(await hashPassword(newPassword));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};
