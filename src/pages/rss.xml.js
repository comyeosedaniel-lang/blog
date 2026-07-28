import rss from '@astrojs/rss';
import { listPosts } from '../lib/posts';
import { SITE } from '../site.config';

export async function GET(context) {
  const posts = await listPosts({ lang: 'ko' });

  return rss({
    title: SITE.title,
    description: SITE.description.ko,
    site: context.site,
    items: posts.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/blog/${entry.slug}/`,
    })),
    customData: '<language>ko</language>',
  });
}
