# Blog template

A self-hosted, database-backed bilingual (Korean/English) blog: Astro SSR on
Cloudflare Workers, a free-writing rich-text editor at `/admin` (no separate
CMS admin app, no markdown files to hand-edit), self-hosted comments, and a
double opt-in email newsletter — all running on your own Cloudflare account.

Deploying your own copy? Start with **[SETUP.md](./SETUP.md)**.

## Stack

- [Astro](https://astro.build) in SSR mode (`output: 'server'`) via
  `@astrojs/cloudflare`
- [Cloudflare D1](https://developers.cloudflare.com/d1/) for post content
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for uploaded images
- [Cloudflare KV](https://developers.cloudflare.com/kv/) for sessions (via
  Astro's built-in session API)
- [TipTap](https://tiptap.dev) for the `/admin` rich-text editor
- Two standalone Cloudflare Workers, each with its own D1 database:
  `comments-worker/` (guestbook-style comments, Turnstile spam protection)
  and `newsletter-worker/` (double opt-in subscriptions, broadcasts via
  [Resend](https://resend.com))

## Development

```sh
npm install
npm run dev       # localhost:4321
npm run build     # ./dist — server build for the Cloudflare adapter
npm run preview   # preview the build locally
```

Local dev reads secrets from a gitignored `.dev.vars` file (see SETUP.md).

## Writing

Go to `/admin/login`, sign in with the site password, and write. Posts save
as drafts or publish instantly — no rebuild, no redeploy. Publishing (not
saving as a draft) automatically emails confirmed newsletter subscribers.

There's no other way to create a post — no markdown files, no separate CMS.

## Configuration

`src/site.config.ts` is the single place to edit site title/description and
the URLs/keys for the comments and newsletter workers. See
`src/site.config.example.ts` for a blank starting point.

Categories aren't in this file — they live in D1 and are managed from
`/admin/categories` (add, rename, delete; a category with posts in it can't
be deleted until they're reassigned or removed).

Colors, typography, and other design tokens live as CSS variables in
`src/styles/global.css`.

## Structure

```
/
├── src/
│   ├── site.config.ts         # site title, worker URLs/keys
│   ├── site.config.example.ts # template starting point for the above
│   ├── lib/
│   │   ├── posts.ts           # D1 query layer (list/get/create/update/delete)
│   │   ├── categories.ts      # D1 query layer for categories
│   │   ├── admin.ts           # D1-backed admin password hash get/set
│   │   ├── auth.ts            # password hashing (PBKDF2 via Web Crypto)
│   │   └── notify.ts          # publish-time newsletter broadcast call
│   ├── middleware.ts          # gates /admin and /api/posts, /api/upload, /api/categories
│   ├── pages/
│   │   ├── admin/              # /admin dashboard, editor, login, categories, settings
│   │   ├── api/                # posts/categories CRUD, image upload, login/logout
│   │   ├── blog/[...slug].astro, en/blog/[...slug].astro
│   │   ├── category/[category].astro, en/category/[category].astro
│   │   ├── rss.xml.js, en/rss.xml.js, sitemap.xml.js
│   ├── components/            # Header, Footer, Hero, WriteEditor, Comments, ...
│   ├── layouts/                # BaseLayout, PostLayout
│   └── i18n/ui.ts             # UI copy (한/영)
├── schema.sql                 # D1 schema for the main site's `posts` table
├── scripts/
│   ├── hash-password.mjs      # generate the admin password hash
│   └── migrate-content-to-d1.mjs
├── comments-worker/           # standalone Worker + D1 (own schema.sql)
├── newsletter-worker/         # standalone Worker + D1 (own schema.sql)
└── wrangler.jsonc             # main site's Worker config (D1/R2/KV bindings)
```
