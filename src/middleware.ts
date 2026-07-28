import { defineMiddleware } from 'astro:middleware';

const PROTECTED_PAGE_PREFIXES = ['/write'];
const PROTECTED_API_PREFIXES = ['/api/posts', '/api/upload'];
const PUBLIC_PATHS = new Set(['/write/login', '/api/login', '/api/logout']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (PUBLIC_PATHS.has(pathname)) {
    return next();
  }

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) {
    return next();
  }

  const authed = await context.session?.get('authed');

  if (!authed) {
    if (isProtectedApi) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return context.redirect('/write/login');
  }

  return next();
});
