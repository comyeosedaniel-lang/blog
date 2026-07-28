import { env } from 'cloudflare:workers';
import { verifyPassword } from '../../lib/auth';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, session, redirect }) => {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');

  const valid = env.ADMIN_PASSWORD_HASH ? await verifyPassword(password, env.ADMIN_PASSWORD_HASH) : false;

  if (!valid) {
    return redirect('/write/login?error=1');
  }

  session?.set('authed', true);
  await session?.regenerate();

  return redirect('/write');
};
