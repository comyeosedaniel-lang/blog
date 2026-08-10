import { env } from 'cloudflare:workers';
import type { Lang } from '../i18n/ui';

export interface PageEntry {
  id: number;
  slug: string;
  title: string;
  contentHtml: string;
  updatedDate: Date | null;
}

interface PageRow {
  id: number;
  slug: string;
  lang: string;
  title: string;
  content_html: string;
  content_json: string | null;
  nav_label: string | null;
  nav_order: number;
  published: number;
  updated_date: string | null;
}

function toEntry(row: PageRow): PageEntry {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    contentHtml: row.content_html,
    updatedDate: row.updated_date ? new Date(row.updated_date) : null,
  };
}

export async function getPageBySlug(lang: Lang, slug: string): Promise<PageEntry | null> {
  const row = await env.DB.prepare('SELECT * FROM pages WHERE lang = ?1 AND slug = ?2 AND published = 1')
    .bind(lang, slug)
    .first<PageRow>();
  return row ? toEntry(row) : null;
}

export interface SitemapPage {
  slug: string;
  updatedDate: Date | null;
}

export async function listPublishedPages(lang: Lang): Promise<SitemapPage[]> {
  const { results } = await env.DB.prepare(
    `SELECT slug, updated_date FROM pages WHERE lang = ?1 AND published = 1 AND slug != 'about'`,
  )
    .bind(lang)
    .all<{ slug: string; updated_date: string | null }>();

  return results.map((r) => ({ slug: r.slug, updatedDate: r.updated_date ? new Date(r.updated_date) : null }));
}

export interface NavPage {
  slug: string;
  navLabel: string;
}

export async function listNavPages(lang: Lang): Promise<NavPage[]> {
  const { results } = await env.DB.prepare(
    `SELECT slug, nav_label FROM pages
     WHERE lang = ?1 AND published = 1 AND nav_label IS NOT NULL AND nav_label != ''
     ORDER BY nav_order ASC, id ASC`,
  )
    .bind(lang)
    .all<{ slug: string; nav_label: string }>();

  return results.map((r) => ({ slug: r.slug, navLabel: r.nav_label }));
}

// --- Admin (writer) operations ---

export interface AdminPageSummary {
  id: number;
  slug: string;
  lang: Lang;
  title: string;
  navLabel: string | null;
  published: boolean;
}

export interface AdminPageFull extends AdminPageSummary {
  contentHtml: string;
  contentJson: string | null;
  navOrder: number;
  updatedDate: Date | null;
}

function toAdminSummary(row: PageRow): AdminPageSummary {
  return {
    id: row.id,
    slug: row.slug,
    lang: row.lang as Lang,
    title: row.title,
    navLabel: row.nav_label,
    published: row.published === 1,
  };
}

function toAdminFull(row: PageRow): AdminPageFull {
  return {
    ...toAdminSummary(row),
    contentHtml: row.content_html,
    contentJson: row.content_json,
    navOrder: row.nav_order,
    updatedDate: row.updated_date ? new Date(row.updated_date) : null,
  };
}

export async function listAllPagesForAdmin(): Promise<AdminPageSummary[]> {
  const { results } = await env.DB.prepare('SELECT * FROM pages ORDER BY lang ASC, nav_order ASC, id ASC').all<PageRow>();
  return results.map(toAdminSummary);
}

export async function getPageById(id: number): Promise<AdminPageFull | null> {
  const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?1').bind(id).first<PageRow>();
  return row ? toAdminFull(row) : null;
}

export async function pageSlugExists(lang: Lang, slug: string, excludeId?: number): Promise<boolean> {
  const row = excludeId
    ? await env.DB.prepare('SELECT id FROM pages WHERE lang = ?1 AND slug = ?2 AND id != ?3')
        .bind(lang, slug, excludeId)
        .first()
    : await env.DB.prepare('SELECT id FROM pages WHERE lang = ?1 AND slug = ?2').bind(lang, slug).first();
  return row !== null;
}

export interface PageInput {
  slug: string;
  lang: Lang;
  title: string;
  contentHtml: string;
  contentJson: string;
  navLabel: string | null;
  navOrder: number;
  published: boolean;
}

export async function createPage(input: PageInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO pages (slug, lang, title, content_html, content_json, nav_label, nav_order, published, updated_date)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now')) RETURNING id`,
  )
    .bind(
      input.slug,
      input.lang,
      input.title,
      input.contentHtml,
      input.contentJson,
      input.navLabel,
      input.navOrder,
      input.published ? 1 : 0,
    )
    .first<{ id: number }>();

  return result!.id;
}

export async function updatePage(id: number, input: PageInput): Promise<void> {
  await env.DB.prepare(
    `UPDATE pages SET slug = ?1, lang = ?2, title = ?3, content_html = ?4, content_json = ?5,
     nav_label = ?6, nav_order = ?7, published = ?8, updated_date = datetime('now') WHERE id = ?9`,
  )
    .bind(
      input.slug,
      input.lang,
      input.title,
      input.contentHtml,
      input.contentJson,
      input.navLabel,
      input.navOrder,
      input.published ? 1 : 0,
      id,
    )
    .run();
}

export async function deletePage(id: number): Promise<void> {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?1').bind(id).run();
}
