import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../../site.config';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ id, data }) => id.startsWith('en/') && !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: SITE.title,
    description: SITE.description.en,
    site: context.site,
    items: posts.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/en/blog/${entry.id.replace(/^en\//, '')}/`,
    })),
    customData: '<language>en</language>',
  });
}
