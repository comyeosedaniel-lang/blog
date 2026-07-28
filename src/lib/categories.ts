import { env } from 'cloudflare:workers';

export interface Category {
  id: string;
  ko: string;
  en: string;
  sortOrder: number;
}

interface CategoryRow {
  id: string;
  ko: string;
  en: string;
  sort_order: number;
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, ko: row.ko, en: row.en, sortOrder: row.sort_order };
}

export async function listCategories(): Promise<Category[]> {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all<CategoryRow>();
  return results.map(toCategory);
}

export async function getCategory(id: string): Promise<Category | null> {
  const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ?1').bind(id).first<CategoryRow>();
  return row ? toCategory(row) : null;
}

export async function categoryIdExists(id: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT 1 FROM categories WHERE id = ?1').bind(id).first();
  return row !== null;
}

export async function countPostsInCategory(id: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE category = ?1')
    .bind(id)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export interface CategoryInput {
  id: string;
  ko: string;
  en: string;
}

export async function createCategory(input: CategoryInput): Promise<void> {
  const row = await env.DB.prepare('SELECT MAX(sort_order) as maxOrder FROM categories').first<{
    maxOrder: number | null;
  }>();
  const sortOrder = (row?.maxOrder ?? -1) + 1;

  await env.DB.prepare('INSERT INTO categories (id, ko, en, sort_order) VALUES (?1, ?2, ?3, ?4)')
    .bind(input.id, input.ko, input.en, sortOrder)
    .run();
}

export async function updateCategory(id: string, input: { ko: string; en: string }): Promise<void> {
  await env.DB.prepare('UPDATE categories SET ko = ?1, en = ?2 WHERE id = ?3').bind(input.ko, input.en, id).run();
}

export async function deleteCategory(id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM categories WHERE id = ?1').bind(id).run();
}
