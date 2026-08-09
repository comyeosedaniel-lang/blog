import { env } from 'cloudflare:workers';
import { XMLParser } from 'fast-xml-parser';

export interface FeedSource {
  name: string;
  url: string;
}

export const FEED_SOURCES: FeedSource[] = [
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds.xml' },
  { name: 'TechSpot', url: 'https://www.techspot.com/backend.xml' },
  { name: 'ServeTheHome', url: 'https://www.servethehome.com/feed/' },
  { name: 'ZDNet Korea', url: 'https://feeds.feedburner.com/zdkorea' },
];

export interface FeedItem {
  source: string;
  title: string;
  link: string;
  summary: string | null;
  publishedAt: string | null;
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseFeedXml(xml: string, sourceName: string): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xml);

  const rssItems = doc?.rss?.channel?.item;
  const atomEntries = doc?.feed?.entry;
  const rawItems: any[] = Array.isArray(rssItems) ? rssItems : rssItems ? [rssItems] : Array.isArray(atomEntries) ? atomEntries : atomEntries ? [atomEntries] : [];

  return rawItems
    .map((item): FeedItem | null => {
      const title = typeof item.title === 'string' ? item.title : (item.title?.['#text'] ?? '');
      let link = '';
      if (typeof item.link === 'string') link = item.link;
      else if (item.link?.['@_href']) link = item.link['@_href'];
      else if (Array.isArray(item.link)) link = item.link[0]?.['@_href'] ?? item.link[0] ?? '';

      if (!title || !link) return null;

      const summaryRaw = item.description ?? item.summary ?? item['content:encoded'] ?? '';
      const summary = typeof summaryRaw === 'string' ? stripHtml(summaryRaw).slice(0, 400) : null;

      return {
        source: sourceName,
        title: stripHtml(String(title)),
        link: String(link).trim(),
        summary: summary || null,
        publishedAt: toIsoDate(item.pubDate ?? item.published ?? item.updated),
      };
    })
    .filter((x): x is FeedItem => x !== null);
}

export async function fetchAllFeeds(): Promise<{ source: string; items: FeedItem[]; error?: string }[]> {
  return Promise.all(
    FEED_SOURCES.map(async (source) => {
      try {
        const res = await fetch(source.url, { headers: { 'user-agent': 'mylineal-blog-feed-bot/1.0' } });
        if (!res.ok) return { source: source.name, items: [], error: `HTTP ${res.status}` };
        const xml = await res.text();
        return { source: source.name, items: parseFeedXml(xml, source.name) };
      } catch (err) {
        return { source: source.name, items: [], error: String(err) };
      }
    }),
  );
}

export async function storeNewFeedItems(items: FeedItem[]): Promise<number> {
  let inserted = 0;
  for (const item of items) {
    const result = await env.DB.prepare(
      'INSERT INTO feed_items (source, title, link, summary, published_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(link) DO NOTHING',
    )
      .bind(item.source, item.title, item.link, item.summary, item.publishedAt)
      .run();
    if (result.meta.changes > 0) inserted += 1;
  }
  return inserted;
}
