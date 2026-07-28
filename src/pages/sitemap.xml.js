import { listPosts } from '../lib/posts';
import { CATEGORIES, SITE } from '../site.config';

function urlEntry(loc, lastmod) {
  return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
}

export async function GET() {
  const [koPosts, enPosts] = await Promise.all([listPosts({ lang: 'ko' }), listPosts({ lang: 'en' })]);

  const staticPaths = [
    '/',
    '/en/',
    '/about/',
    '/en/about/',
    ...CATEGORIES.map((c) => `/category/${c.id}/`),
    ...CATEGORIES.map((c) => `/en/category/${c.id}/`),
  ];

  const urls = [
    ...staticPaths.map((path) => urlEntry(`${SITE.url}${path}`)),
    ...koPosts.map((p) =>
      urlEntry(`${SITE.url}/blog/${p.slug}/`, (p.data.updatedDate ?? p.data.pubDate).toISOString()),
    ),
    ...enPosts.map((p) =>
      urlEntry(`${SITE.url}/en/blog/${p.slug}/`, (p.data.updatedDate ?? p.data.pubDate).toISOString()),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
