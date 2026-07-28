import { env } from 'cloudflare:workers';
import type { CategoryId } from '../site.config';
import type { Lang } from '../i18n/ui';

export interface PostEntry {
  id: string; // `${lang}/${slug}`, matches the comments/newsletter postId format
  slug: string;
  data: {
    title: string;
    description: string;
    category: CategoryId;
    tags: string[];
    draft: boolean;
    pubDate: Date;
    updatedDate?: Date;
    heroImage?: string;
  };
  body: string; // content_html, used for rendering and reading-time estimation
}

interface PostRow {
  id: number;
  slug: string;
  lang: string;
  title: string;
  description: string;
  category: string;
  tags: string;
  content_html: string;
  content_json: string | null;
  hero_image_url: string | null;
  pub_date: string;
  updated_date: string | null;
  draft: number;
}

function toEntry(row: PostRow): PostEntry {
  return {
    id: `${row.lang}/${row.slug}`,
    slug: row.slug,
    data: {
      title: row.title,
      description: row.description,
      category: row.category as CategoryId,
      tags: JSON.parse(row.tags || '[]'),
      draft: row.draft === 1,
      pubDate: new Date(row.pub_date),
      updatedDate: row.updated_date ? new Date(row.updated_date) : undefined,
      heroImage: row.hero_image_url ?? undefined,
    },
    body: row.content_html,
  };
}

interface ListOptions {
  lang: Lang;
  category?: CategoryId;
  includeDrafts?: boolean;
  limit?: number;
}

export async function listPosts({ lang, category, includeDrafts = false, limit }: ListOptions): Promise<PostEntry[]> {
  const conditions = ['lang = ?1'];
  const params: unknown[] = [lang];

  if (!includeDrafts) {
    conditions.push('draft = 0');
  }
  if (category) {
    params.push(category);
    conditions.push(`category = ?${params.length}`);
  }

  let query = `SELECT * FROM posts WHERE ${conditions.join(' AND ')} ORDER BY pub_date DESC`;
  if (limit) {
    query += ` LIMIT ${Number(limit)}`;
  }

  const { results } = await env.DB.prepare(query)
    .bind(...params)
    .all<PostRow>();

  return results.map(toEntry);
}

export async function getPostBySlug(lang: Lang, slug: string, includeDrafts = false): Promise<PostEntry | null> {
  const conditions = ['lang = ?1', 'slug = ?2'];
  const params: unknown[] = [lang, slug];
  if (!includeDrafts) {
    conditions.push('draft = 0');
  }

  const row = await env.DB.prepare(`SELECT * FROM posts WHERE ${conditions.join(' AND ')} LIMIT 1`)
    .bind(...params)
    .first<PostRow>();

  return row ? toEntry(row) : null;
}
