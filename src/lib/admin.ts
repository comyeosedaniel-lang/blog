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

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;

export async function isLoginLocked(ip: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 FROM login_attempts
     WHERE ip = ?1 AND count >= ?2 AND datetime(updated_at, '+${LOGIN_LOCKOUT_SECONDS} seconds') > datetime('now')`,
  )
    .bind(ip, LOGIN_MAX_ATTEMPTS)
    .first();
  return row !== null;
}

export async function recordLoginFailure(ip: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO login_attempts (ip, count, updated_at) VALUES (?1, 1, datetime('now'))
     ON CONFLICT(ip) DO UPDATE SET
       count = CASE
         WHEN datetime(login_attempts.updated_at, '+${LOGIN_LOCKOUT_SECONDS} seconds') > datetime('now')
         THEN login_attempts.count + 1
         ELSE 1
       END,
       updated_at = datetime('now')`,
  )
    .bind(ip)
    .run();
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?1').bind(ip).run();
}
