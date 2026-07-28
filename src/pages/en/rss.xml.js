import rss from '@astrojs/rss';
import { listPosts } from '../../lib/posts';
import { SITE } from '../../site.config';

export async function GET(context) {
  const posts = await listPosts({ lang: 'en' });

  return rss({
    title: SITE.title,
    description: SITE.description.en,
    site: context.site,
    items: posts.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/en/blog/${entry.slug}/`,
    })),
    customData: '<language>en</language>',
  });
}
