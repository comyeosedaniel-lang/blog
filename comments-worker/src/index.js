const ALLOWED_ORIGIN = 'https://blog.mylineal.com';
const MAX_NAME_LEN = 60;
const MAX_MESSAGE_LEN = 2000;

function corsHeaders(origin) {
  const allow = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

async function verifyTurnstile(token, secret, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = await res.json();
  return data.success === true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === '/geo' && request.method === 'GET') {
      return json({ country: request.cf?.country ?? null }, 200, origin);
    }

    if (url.pathname === '/comments' && request.method === 'GET') {
      const postId = url.searchParams.get('post');
      if (!postId) return json({ error: 'missing post' }, 400, origin);

      const { results } = await env.DB.prepare(
        'SELECT id, name, message, created_at FROM comments WHERE post_id = ?1 ORDER BY created_at ASC',
      )
        .bind(postId)
        .all();

      return json({ comments: results }, 200, origin);
    }

    if (url.pathname === '/comments' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid json' }, 400, origin);
      }

      const { postId, name, message, turnstileToken, website } = body;

      // Honeypot: real users never fill this hidden field.
      if (website) {
        return json({ ok: true }, 200, origin);
      }

      if (!postId || typeof postId !== 'string') {
        return json({ error: 'missing postId' }, 400, origin);
      }
      if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LEN) {
        return json({ error: 'invalid name' }, 400, origin);
      }
      if (
        !message ||
        typeof message !== 'string' ||
        message.trim().length === 0 ||
        message.length > MAX_MESSAGE_LEN
      ) {
        return json({ error: 'invalid message' }, 400, origin);
      }

      const ip = request.headers.get('CF-Connecting-IP');
      const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
      if (!verified) {
        return json({ error: 'turnstile verification failed' }, 403, origin);
      }

      const result = await env.DB.prepare(
        "INSERT INTO comments (post_id, name, message) VALUES (?1, ?2, ?3) RETURNING id, name, message, created_at",
      )
        .bind(postId, name.trim(), message.trim())
        .first();

      return json({ comment: result }, 201, origin);
    }

    if (url.pathname === '/comments/recent' && request.method === 'GET') {
      if (url.searchParams.get('adminKey') !== env.ADMIN_KEY) {
        return json({ error: 'unauthorized' }, 401, origin);
      }

      const limit = Math.min(200, Number(url.searchParams.get('limit') ?? '50') || 50);
      const { results } = await env.DB.prepare(
        'SELECT id, post_id, name, message, created_at FROM comments ORDER BY created_at DESC LIMIT ?1',
      )
        .bind(limit)
        .all();

      return json({ comments: results }, 200, origin);
    }

    const deleteMatch = url.pathname.match(/^\/comments\/(\d+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      let body;
      try {
        body = await request.json();
      } catch {
        body = {};
      }

      if (body.adminKey !== env.ADMIN_KEY) {
        return json({ error: 'unauthorized' }, 401, origin);
      }

      await env.DB.prepare('DELETE FROM comments WHERE id = ?1').bind(Number(deleteMatch[1])).run();
      return json({ ok: true }, 200, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  },
};
