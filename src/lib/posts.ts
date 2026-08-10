import { env } from 'cloudflare:workers';
import type { Lang } from '../i18n/ui';

export interface PostEntry {
  id: string; // `${lang}/${slug}`, matches the comments/newsletter postId format
  dbId: number;
  slug: string;
  data: {
    title: string;
    description: string;
    category: string;
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
    dbId: row.id,
    slug: row.slug,
    data: {
      title: row.title,
      description: row.description,
      category: row.category,
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
  category?: string;
  includeDrafts?: boolean;
  limit?: number;
  offset?: number;
}

export async function listPosts({
  lang,
  category,
  includeDrafts = false,
  limit,
  offset,
}: ListOptions): Promise<PostEntry[]> {
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
    if (offset) {
      query += ` OFFSET ${Number(offset)}`;
    }
  }

  const { results } = await env.DB.prepare(query)
    .bind(...params)
    .all<PostRow>();

  return results.map(toEntry);
}

export async function countPosts(lang: Lang, category?: string): Promise<number> {
  const conditions = ['lang = ?1', 'draft = 0'];
  const params: unknown[] = [lang];
  if (category) {
    params.push(category);
    conditions.push(`category = ?${params.length}`);
  }

  const row = await env.DB.prepare(`SELECT COUNT(*) as count FROM posts WHERE ${conditions.join(' AND ')}`)
    .bind(...params)
    .first<{ count: number }>();

  return row?.count ?? 0;
}

export async function getNextPost(lang: Lang, category: string, afterPubDate: Date): Promise<PostEntry | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM posts
     WHERE lang = ?1 AND category = ?2 AND draft = 0 AND pub_date > ?3
     ORDER BY pub_date ASC LIMIT 1`,
  )
    .bind(lang, category, afterPubDate.toISOString())
    .first<PostRow>();

  return row ? toEntry(row) : null;
}

export async function getPostsByTag(lang: Lang, tag: string): Promise<PostEntry[]> {
  const { results } = await env.DB.prepare(`SELECT * FROM posts WHERE lang = ?1 AND draft = 0 ORDER BY pub_date DESC`)
    .bind(lang)
    .all<PostRow>();

  return results.map(toEntry).filter((p) => p.data.tags.includes(tag));
}

export async function getRelatedPosts(
  lang: Lang,
  tags: string[],
  excludeSlug: string,
  limit = 4,
): Promise<PostEntry[]> {
  if (tags.length === 0) return [];

  const { results } = await env.DB.prepare(
    `SELECT * FROM posts WHERE lang = ?1 AND draft = 0 AND slug != ?2 ORDER BY pub_date DESC`,
  )
    .bind(lang, excludeSlug)
    .all<PostRow>();

  return results
    .map(toEntry)
    .map((post) => ({ post, overlap: post.data.tags.filter((t) => tags.includes(t)).length }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.post.data.pubDate.getTime() - a.post.data.pubDate.getTime())
    .slice(0, limit)
    .map((x) => x.post);
}

export async function searchPosts(lang: Lang, query: string): Promise<PostEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const like = `%${trimmed}%`;
  const { results } = await env.DB.prepare(
    `SELECT * FROM posts
     WHERE lang = ?1 AND draft = 0
       AND (title LIKE ?2 OR description LIKE ?2 OR tags LIKE ?2)
     ORDER BY pub_date DESC`,
  )
    .bind(lang, like)
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

// --- Admin (writer) operations: not language/draft filtered by default. ---

export interface AdminPostSummary {
  id: number;
  slug: string;
  lang: Lang;
  title: string;
  category: string;
  draft: boolean;
  pubDate: Date;
}

export interface AdminPostFull extends AdminPostSummary {
  description: string;
  tags: string[];
  contentHtml: string;
  contentJson: string | null;
  heroImageUrl: string | null;
  updatedDate: Date | null;
}

function toAdminSummary(row: PostRow): AdminPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    lang: row.lang as Lang,
    title: row.title,
    category: row.category,
    draft: row.draft === 1,
    pubDate: new Date(row.pub_date),
  };
}

function toAdminFull(row: PostRow): AdminPostFull {
  return {
    ...toAdminSummary(row),
    description: row.description,
    tags: JSON.parse(row.tags || '[]'),
    contentHtml: row.content_html,
    contentJson: row.content_json,
    heroImageUrl: row.hero_image_url,
    updatedDate: row.updated_date ? new Date(row.updated_date) : null,
  };
}

export async function listAllPostsForAdmin(limit?: number, offset?: number): Promise<AdminPostSummary[]> {
  let query = 'SELECT * FROM posts ORDER BY pub_date DESC';
  if (limit) {
    query += ` LIMIT ${Number(limit)}`;
    if (offset) {
      query += ` OFFSET ${Number(offset)}`;
    }
  }
  const { results } = await env.DB.prepare(query).all<PostRow>();
  return results.map(toAdminSummary);
}

export async function countAllPostsForAdmin(): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) as count FROM posts').first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getPostById(id: number): Promise<AdminPostFull | null> {
  const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?1').bind(id).first<PostRow>();
  return row ? toAdminFull(row) : null;
}

export async function slugExists(lang: Lang, slug: string, excludeId?: number): Promise<boolean> {
  const row = excludeId
    ? await env.DB.prepare('SELECT id FROM posts WHERE lang = ?1 AND slug = ?2 AND id != ?3')
        .bind(lang, slug, excludeId)
        .first()
    : await env.DB.prepare('SELECT id FROM posts WHERE lang = ?1 AND slug = ?2').bind(lang, slug).first();
  return row !== null;
}

export interface PostInput {
  slug: string;
  lang: Lang;
  title: string;
  description: string;
  category: string;
  tags: string[];
  contentHtml: string;
  contentJson: string;
  heroImageUrl: string | null;
  draft: boolean;
}

export async function createPost(input: PostInput): Promise<number> {
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `INSERT INTO posts (slug, lang, title, description, category, tags, content_html, content_json, hero_image_url, pub_date, draft)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) RETURNING id`,
  )
    .bind(
      input.slug,
      input.lang,
      input.title,
      input.description,
      input.category,
      JSON.stringify(input.tags),
      input.contentHtml,
      input.contentJson,
      input.heroImageUrl,
      now,
      input.draft ? 1 : 0,
    )
    .first<{ id: number }>();

  return result!.id;
}

export async function updatePost(id: number, input: PostInput): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE posts SET slug = ?1, lang = ?2, title = ?3, description = ?4, category = ?5, tags = ?6,
     content_html = ?7, content_json = ?8, hero_image_url = ?9, draft = ?10, updated_date = ?11 WHERE id = ?12`,
  )
    .bind(
      input.slug,
      input.lang,
      input.title,
      input.description,
      input.category,
      JSON.stringify(input.tags),
      input.contentHtml,
      input.contentJson,
      input.heroImageUrl,
      input.draft ? 1 : 0,
      now,
      id,
    )
    .run();
}

export async function deletePost(id: number): Promise<void> {
  await env.DB.prepare('DELETE FROM posts WHERE id = ?1').bind(id).run();
}
