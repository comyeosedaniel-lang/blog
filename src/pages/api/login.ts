import { verifyPassword } from '../../lib/auth';
import { getAdminPasswordHash, isLoginLocked, recordLoginFailure, clearLoginFailures } from '../../lib/admin';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, session, redirect }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  if (await isLoginLocked(ip)) {
    return redirect('/admin/login?error=locked');
  }

  const form = await request.formData();
  const password = String(form.get('password') ?? '');

  const storedHash = await getAdminPasswordHash();
  const valid = storedHash ? await verifyPassword(password, storedHash) : false;

  if (!valid) {
    await recordLoginFailure(ip);
    return redirect('/admin/login?error=1');
  }

  await clearLoginFailures(ip);

  session?.set('authed', true);
  await session?.regenerate();

  return redirect('/admin');
};
