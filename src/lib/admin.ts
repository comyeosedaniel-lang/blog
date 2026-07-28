import { env } from 'cloudflare:workers';

export async function getAdminPasswordHash(): Promise<string | null> {
  const row = await env.DB.prepare('SELECT password_hash FROM admin WHERE id = 1').first<{
    password_hash: string;
  }>();
  return row?.password_hash ?? null;
}

export async function setAdminPasswordHash(hash: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO admin (id, password_hash) VALUES (1, ?1) ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash',
  )
    .bind(hash)
    .run();
}
