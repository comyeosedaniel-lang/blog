import { verifyPassword } from '../../lib/auth';
import { getAdminPasswordHash } from '../../lib/admin';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, session, redirect }) => {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');

  const storedHash = await getAdminPasswordHash();
  const valid = storedHash ? await verifyPassword(password, storedHash) : false;

  if (!valid) {
    return redirect('/admin/login?error=1');
  }

  session?.set('authed', true);
  await session?.regenerate();

  return redirect('/admin');
};
