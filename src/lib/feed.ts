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

// Only these four topics — everything else (deals, general software reviews,
// unrelated business news, etc.) gets filtered out before it's ever stored.
const TOPIC_KEYWORDS = [
  // 컴퓨터 부품 (computer parts/hardware)
  'cpu', 'gpu', 'ram', 'ddr', 'ssd', 'hdd', 'nas', 'motherboard', 'mainboard', 'psu',
  'cooler', 'cooling', 'graphics card', 'processor', 'chipset', 'ryzen', 'radeon',
  'geforce', 'rtx', 'nvme', 'intel', 'amd', 'nvidia', '메인보드', '그래픽카드', '파워',
  '쿨러', '조립', '부품', '프로세서', '반도체', '저장장치', '그래픽카드',

  // AI 코딩 관련 (AI coding)
  'copilot', 'claude', 'chatgpt', 'gpt-', 'cursor', 'llm', 'coding assistant',
  'ai coding', 'ai code', 'code generation', 'vibe coding', 'developer ai', 'ai agent',
  '코딩 ai', '개발자 ai', '바이브 코딩', '생성형 ai', 'ai 코딩', 'ai 어시스턴트',

  // 컴퓨터 트랜드 (computer trends)
  'ces', 'benchmark', 'roadmap', '벤치마크', '로드맵', '신제품', '트렌드',

  // 데스크탑용 프로그램 (desktop software)
  'windows 10', 'windows 11', 'macos', 'desktop app', '데스크탑', '데스크톱', '윈도우', '맥os', '유틸리티',
];

// Short ASCII keywords (cpu, ram, intel, amd, ...) risk false substring hits
// inside unrelated words ("NASA" contains "nas", "intelligence" contains
// "intel", "program" contains "ram") — word-boundary regex avoids that.
// Korean has no such collision risk here, so those stay plain substrings.
const KOREAN_RE = /[ㄱ-힝]/;
const topicMatchers = TOPIC_KEYWORDS.map((kw) =>
  KOREAN_RE.test(kw)
    ? { kw, test: (haystack: string) => haystack.includes(kw) }
    : { kw, test: (haystack: string) => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack) },
);

function matchesTopic(item: FeedItem): boolean {
  // Title only, not the summary — matching against the longer summary text
  // pulled in too many incidental mentions (a government-AI-policy story that
  // just happens to say "AI" once in the body, etc).
  const haystack = item.title.toLowerCase();
  return topicMatchers.some(({ test }) => test(haystack));
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
    .filter((x): x is FeedItem => x !== null)
    .filter(matchesTopic);
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
