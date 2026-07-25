const ALLOWED_ORIGIN = 'https://blog.mylineal.com';
const SITE_TITLE = '나의 삶, 이야기 그리고 커리어';
const FROM_ADDRESS = `${SITE_TITLE} <newsletter@mylineal.com>`;

const STRINGS = {
  ko: {
    pageTitle: SITE_TITLE,
    confirmSubject: `[${SITE_TITLE}] 구독을 확인해주세요`,
    confirmBody: (confirmUrl) => `
      <p>안녕하세요, ${SITE_TITLE} 구독을 신청해주셔서 감사합니다.</p>
      <p>아래 버튼을 눌러 구독을 확인해주세요.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:0.6em 1.2em;background:#af4c26;color:#fff;text-decoration:none;border-radius:6px;">구독 확인하기</a></p>
      <p>본인이 신청하지 않으셨다면 이 메일은 무시하셔도 됩니다.</p>
    `,
    confirmedPage:
      '<h1>구독이 확인됐어요</h1><p>새 글이 올라오면 이메일로 알려드릴게요.</p><p><a href="https://blog.mylineal.com/">블로그로 돌아가기</a></p>',
    invalidLinkPage: '<h1>유효하지 않은 링크예요</h1><p><a href="https://blog.mylineal.com/">홈으로 돌아가기</a></p>',
    unsubscribedPage:
      '<h1>구독이 취소됐어요</h1><p>다시 구독하고 싶으시면 언제든 블로그에서 신청해주세요.</p>',
    newPostIntro: '새 글이 올라왔어요.',
    readMore: '읽으러 가기',
    unsubscribeLink: '구독 취소',
  },
  en: {
    pageTitle: SITE_TITLE,
    confirmSubject: `[${SITE_TITLE}] Please confirm your subscription`,
    confirmBody: (confirmUrl) => `
      <p>Hi, thanks for subscribing to ${SITE_TITLE}.</p>
      <p>Click the button below to confirm your subscription.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:0.6em 1.2em;background:#af4c26;color:#fff;text-decoration:none;border-radius:6px;">Confirm subscription</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    confirmedPage:
      "<h1>Subscription confirmed</h1><p>We'll email you when a new post goes up.</p><p><a href=\"https://blog.mylineal.com/en/\">Back to the blog</a></p>",
    invalidLinkPage: '<h1>Invalid link</h1><p><a href="https://blog.mylineal.com/en/">Back home</a></p>',
    unsubscribedPage: "<h1>You've been unsubscribed</h1><p>You can resubscribe anytime from the blog.</p>",
    newPostIntro: 'A new post is up.',
    readMore: 'Read it',
    unsubscribeLink: 'Unsubscribe',
  },
};

function t(lang) {
  return STRINGS[lang] ?? STRINGS.ko;
}

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

function html(body, lang, status = 200) {
  return new Response(
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${t(lang).pageTitle}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;line-height:1.7;color:#1c1b18}a{color:#af4c26}</style>
    </head><body>${body}</body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

function randomToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeLang(lang) {
  return lang === 'en' ? 'en' : 'ko';
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

async function sendEmail(env, { to, subject, htmlBody }) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html: htmlBody }),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid json' }, 400, origin);
      }

      const { email, turnstileToken, website } = body;
      const lang = normalizeLang(body.lang);
      if (website) return json({ ok: true }, 200, origin);
      if (!isValidEmail(email)) return json({ error: 'invalid email' }, 400, origin);

      const ip = request.headers.get('CF-Connecting-IP');
      const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
      if (!verified) return json({ error: 'turnstile verification failed' }, 403, origin);

      const existing = await env.DB.prepare('SELECT id, confirmed FROM subscribers WHERE email = ?1')
        .bind(email)
        .first();

      if (existing?.confirmed) {
        return json({ ok: true, alreadySubscribed: true }, 200, origin);
      }

      const confirmToken = randomToken();
      const unsubscribeToken = randomToken();

      if (existing) {
        await env.DB.prepare('UPDATE subscribers SET confirm_token = ?1, lang = ?2 WHERE id = ?3')
          .bind(confirmToken, lang, existing.id)
          .run();
      } else {
        await env.DB.prepare(
          'INSERT INTO subscribers (email, confirm_token, unsubscribe_token, lang) VALUES (?1, ?2, ?3, ?4)',
        )
          .bind(email, confirmToken, unsubscribeToken, lang)
          .run();
      }

      const confirmUrl = `${url.origin}/confirm?token=${confirmToken}`;
      await sendEmail(env, {
        to: email,
        subject: t(lang).confirmSubject,
        htmlBody: t(lang).confirmBody(confirmUrl),
      });

      return json({ ok: true }, 200, origin);
    }

    if (url.pathname === '/confirm' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      const row = token
        ? await env.DB.prepare('SELECT id, lang FROM subscribers WHERE confirm_token = ?1').bind(token).first()
        : null;

      if (!row) {
        return html(t('ko').invalidLinkPage, 'ko', 400);
      }

      await env.DB.prepare("UPDATE subscribers SET confirmed = 1, confirmed_at = datetime('now') WHERE id = ?1")
        .bind(row.id)
        .run();

      const lang = normalizeLang(row.lang);
      return html(t(lang).confirmedPage, lang);
    }

    if (url.pathname === '/unsubscribe' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      let lang = 'ko';
      if (token) {
        const row = await env.DB.prepare('SELECT lang FROM subscribers WHERE unsubscribe_token = ?1')
          .bind(token)
          .first();
        lang = normalizeLang(row?.lang);
        await env.DB.prepare('DELETE FROM subscribers WHERE unsubscribe_token = ?1').bind(token).run();
      }
      return html(t(lang).unsubscribedPage, lang);
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'invalid json' }, 400, origin);
      }

      if (body.adminKey !== env.ADMIN_KEY) {
        return json({ error: 'unauthorized' }, 401, origin);
      }

      const { title, postUrl, excerpt } = body;
      const lang = normalizeLang(body.lang);
      if (!title || !postUrl) return json({ error: 'missing title or postUrl' }, 400, origin);

      const strings = t(lang);
      const { results } = await env.DB.prepare(
        'SELECT email, unsubscribe_token FROM subscribers WHERE confirmed = 1',
      ).all();

      let sent = 0;
      for (const sub of results) {
        const unsubscribeUrl = `${url.origin}/unsubscribe?token=${sub.unsubscribe_token}`;
        await sendEmail(env, {
          to: sub.email,
          subject: `[${SITE_TITLE}] ${title}`,
          htmlBody: `
            <p>${strings.newPostIntro}</p>
            <h2>${title}</h2>
            ${excerpt ? `<p>${excerpt}</p>` : ''}
            <p><a href="${postUrl}" style="display:inline-block;padding:0.6em 1.2em;background:#af4c26;color:#fff;text-decoration:none;border-radius:6px;">${strings.readMore}</a></p>
            <hr style="margin:2em 0;border:none;border-top:1px solid #eee;">
            <p style="font-size:0.85em;color:#888;"><a href="${unsubscribeUrl}">${strings.unsubscribeLink}</a></p>
          `,
        });
        sent += 1;
      }

      return json({ sent }, 200, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  },
};
