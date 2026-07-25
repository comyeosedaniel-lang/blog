import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

const BROADCAST_URL = 'https://mylineal-newsletter.comyeosedaniel.workers.dev/broadcast';
const SITE_URL = 'https://blog.mylineal.com';

const before = process.env.BEFORE_SHA;
const after = process.env.AFTER_SHA;
const adminKey = process.env.NEWSLETTER_ADMIN_KEY;

if (!before || /^0+$/.test(before)) {
  console.log('No previous commit to diff against (first push) — skipping notify.');
  process.exit(0);
}

if (!adminKey) {
  console.log('NEWSLETTER_ADMIN_KEY not set — skipping notify.');
  process.exit(0);
}

const diff = execSync(`git diff --name-status ${before} ${after}`, { encoding: 'utf-8' });

const addedPosts = diff
  .split('\n')
  .filter((line) => line.startsWith('A\t'))
  .map((line) => line.slice(2))
  .filter((path) => path.startsWith('src/content/blog/') && path.endsWith('.md'));

if (addedPosts.length === 0) {
  console.log('No new posts in this push.');
  process.exit(0);
}

for (const filePath of addedPosts) {
  const { data } = matter(readFileSync(filePath, 'utf-8'));
  if (data.draft) {
    console.log(`Skipping draft: ${filePath}`);
    continue;
  }

  const lang = filePath.includes('/src/content/blog/en/') ? 'en' : 'ko';
  const slug = filePath.split('/').pop().replace(/\.mdx?$/, '');
  const postUrl = lang === 'en' ? `${SITE_URL}/en/blog/${slug}/` : `${SITE_URL}/blog/${slug}/`;

  const res = await fetch(BROADCAST_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      adminKey,
      title: data.title,
      postUrl,
      excerpt: data.description,
    }),
  });

  const result = await res.json();
  console.log(filePath, '->', res.status, JSON.stringify(result));
}
