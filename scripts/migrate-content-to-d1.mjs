import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const CONTENT_ROOT = 'src/content/blog';
const OUT_FILE = 'migration.sql';

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Rewrite the content-collection-relative image path (./images/...) used by
// the old markdown pipeline into the plain static path under public/images/
// that the pre-optimized copies were placed at (see scripts/ comments / prior
// manual `sharp` pre-processing step).
function rewriteImagePaths(text) {
  return text.replace(/\.\/images\//g, '/images/');
}

function toIso(dateLike) {
  return new Date(dateLike).toISOString();
}

const statements = [];

for (const lang of ['ko', 'en']) {
  const dir = join(CONTENT_ROOT, lang);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    continue;
  }

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = readFileSync(join(dir, file), 'utf-8');
    const { data, content } = matter(raw);

    const fixedMarkdown = rewriteImagePaths(content);
    const contentHtml = marked.parse(fixedMarkdown);

    const heroImageUrl = data.heroImage ? data.heroImage.replace(/^\.\//, '/') : null;

    const cols = ['slug', 'lang', 'title', 'description', 'category', 'tags', 'content_html', 'hero_image_url', 'pub_date', 'updated_date', 'draft'];
    const vals = [
      sqlString(slug),
      sqlString(lang),
      sqlString(data.title),
      sqlString(data.description),
      sqlString(data.category ?? 'life'),
      sqlString(JSON.stringify(data.tags ?? [])),
      sqlString(contentHtml),
      heroImageUrl ? sqlString(heroImageUrl) : 'NULL',
      sqlString(toIso(data.pubDate)),
      data.updatedDate ? sqlString(toIso(data.updatedDate)) : 'NULL',
      data.draft ? 1 : 0,
    ];

    statements.push(`INSERT INTO posts (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
    console.log(`Prepared: ${lang}/${slug}`);
  }
}

writeFileSync(OUT_FILE, statements.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${statements.length} statements to ${OUT_FILE}`);
