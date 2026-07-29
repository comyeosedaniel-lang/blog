# Setup guide

This repo is a self-hosted, database-backed blog: an Astro site running as a
Cloudflare Worker, with a rich-text `/admin` editor (no separate CMS admin
app), self-hosted comments, and a bilingual double-opt-in email newsletter.
Nothing runs on someone else's platform except Cloudflare (compute/storage)
and Resend (outbound email) — no GitHub-hosted CMS, no third-party comment
widget.

It's also the actual source for a live blog, so a few files (`site.config.ts`,
`wrangler.jsonc`, the two workers' `wrangler.toml`) still carry that
deployment's real values. Follow the steps below to point everything at your
own Cloudflare account, domain, and content instead.

## Architecture

- **Main site** (`/`): Astro SSR (`output: 'server'`) on Cloudflare Workers,
  content in D1, images in R2, sessions in KV, TipTap editor at `/admin`.
- **comments-worker/**: standalone Cloudflare Worker + its own D1, guestbook-
  style comments with Turnstile spam protection. No login required to comment.
- **newsletter-worker/**: standalone Cloudflare Worker + its own D1, double
  opt-in email subscriptions via Resend, bilingual broadcast emails.

The three are independently deployed Workers. The main site talks to the
other two only over their public HTTP APIs (see `src/site.config.ts`).

## Prerequisites

- A Cloudflare account (free plan works)
- A domain you can point at Cloudflare (or use the free `workers.dev`
  subdomain Cloudflare gives every Worker, and skip the custom-domain step)
- A [Resend](https://resend.com) account + API key, for sending newsletter
  emails, with a sending domain verified (or use their sandbox domain while
  testing)
- Node.js 22+, and `wrangler` (installed as a dev dependency — use `npx
  wrangler`)
- `wrangler login` once, to authorize the CLI against your Cloudflare account

## 1. Deploy comments-worker

```sh
cd comments-worker
npx wrangler d1 create my-blog-comments
```

Copy the printed `database_id` into `comments-worker/wrangler.toml`'s
`database_id` field (also change `name` and `database_name` to whatever you
like — they just need to be unique in your account).

```sh
npx wrangler d1 execute my-blog-comments --remote --file=./schema.sql
```

Create a [Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
widget (any type works; "Managed" is a safe default) scoped to your domain.
You'll get a **site key** (public) and a **secret key**.

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Open `src/index.js` and change the hardcoded `ALLOWED_ORIGIN` at the top to
your domain (this is the CORS allow-list — it must match where the main site
will live).

```sh
npx wrangler deploy
```

Note the deployed URL (`https://<name>.<your-subdomain>.workers.dev` unless
you attach a custom domain).

## 2. Deploy newsletter-worker

```sh
cd ../newsletter-worker
npx wrangler d1 create my-blog-newsletter
```

Same as above: paste the `database_id` into `newsletter-worker/wrangler.toml`,
rename `name`/`database_name` as you like.

```sh
npx wrangler d1 execute my-blog-newsletter --remote --file=./schema.sql
```

Open `src/index.js` and update the hardcoded constants at the top:
`ALLOWED_ORIGIN` (your domain), `SITE_TITLE`, and the `FROM_ADDRESS` sending
email (must be on a domain verified in Resend). The confirmation/unsubscribe
page HTML also links back to `https://blog.mylineal.com/` in a couple of
places — swap those for your domain too.

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_KEY
```

`ADMIN_KEY` is a key you invent — the main site presents it to authorize
publish-time broadcast calls. Keep a copy; you'll set the same value as
`NEWSLETTER_ADMIN_KEY` on the main site in step 4.

```sh
npx wrangler deploy
```

Note this worker's deployed URL too.

## 3. Configure the main site

```sh
cd ..
cp src/site.config.example.ts src/site.config.ts
```

(If `src/site.config.ts` already exists with someone else's values — e.g.
you forked this repo as-is — edit it directly instead of copying over it.)

Fill in:
- `SITE.title`, `SITE.description`, `SITE.url` (your future domain, or the
  `workers.dev` URL you'll get in step 6 if skipping a custom domain),
  `SITE.author`, `SITE.github`
- `COMMENTS.apiUrl` — comments-worker's URL from step 1
- `COMMENTS.turnstileSiteKey` — the Turnstile site key from step 1
- `NEWSLETTER.apiUrl` — newsletter-worker's URL from step 2
- `NEWSLETTER.turnstileSiteKey` — same Turnstile site key works fine
- `GEO.apiUrl` — comments-worker's URL + `/geo` (it serves both)
- `UPLOADS_PUBLIC_URL` — filled in during step 5 below

## 4. Provision the main site's Cloudflare resources

```sh
npx wrangler d1 create my-blog-content
```

Paste the `database_id` into `wrangler.jsonc`'s `d1_databases[0].database_id`
(and rename `name`/`database_name` throughout the file to taste — every
`mylineal-*` string in `wrangler.jsonc` is deployment-specific).

```sh
npx wrangler d1 execute my-blog-content --remote --file=./schema.sql
```

```sh
npx wrangler r2 bucket create my-blog-uploads
npx wrangler r2 bucket dev-url enable my-blog-uploads
```

The second command prints a public `https://pub-xxxx.r2.dev` URL — paste it
into `site.config.ts`'s `UPLOADS_PUBLIC_URL`. Also update
`wrangler.jsonc`'s `r2_buckets[0].bucket_name` to match the bucket name you
created.

`schema.sql` seeds four starter categories (dev/book/life/us). Once you're
logged in, manage categories (rename, add, delete) from `/admin/categories`
— no code changes or redeploys needed.

## 5. Set the admin password

There's a single site-wide password gating `/admin` (no user accounts). It's
stored in the `admin` table in your D1 database (see `schema.sql`), not as a
Worker secret — this is what lets you change it later from `/admin/settings`
instead of re-running a CLI command every time.

```sh
node scripts/hash-password.mjs "choose-a-strong-password"
```

This prints a `salt:hash` string. Insert it as the initial password:

```sh
npx wrangler d1 execute my-blog-content --remote --command "INSERT INTO admin (id, password_hash) VALUES (1, '<salt:hash from above>');"
```

```sh
npx wrangler secret put NEWSLETTER_ADMIN_KEY
# paste the same ADMIN_KEY value you set on newsletter-worker in step 2
```

For local development, also create a `.dev.vars` file (gitignored) with:

```
NEWSLETTER_ADMIN_KEY=<same key as newsletter-worker's ADMIN_KEY>
```

and run the same `INSERT INTO admin ...` command without `--remote` against
your local D1 (or just log in once against the remote DB while developing).

Once logged in, you can change the password anytime from `/admin/settings`
without touching the CLI.

## 6. Build and deploy

```sh
npm install
npm run build
npx wrangler deploy
```

Without a custom domain, your site is live at
`https://<name>.<your-subdomain>.workers.dev`.

### Optional: custom domain

If your domain's DNS is already on Cloudflare, add a `routes` entry to
`wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "your-domain.example.com", "custom_domain": true }
]
```

If a DNS record for that hostname already exists from a previous host (e.g.
you're migrating off GitHub Pages or another provider), delete it first —
Cloudflare's Custom Domain feature refuses to take over a record it didn't
create. Then `npx wrangler deploy` again; it provisions the DNS record and
SSL certificate for you.

## 7. Start writing

Visit `/admin/login`, enter the password from step 5, and you're in. Posts
publish instantly (no rebuild/redeploy) and, if not saved as a draft,
trigger a broadcast email to confirmed newsletter subscribers automatically.

## Notes

- Every `mylineal-*` name and `comyeosedaniel*`-style URL you see in
  `wrangler.jsonc`, `comments-worker/wrangler.toml`, and
  `newsletter-worker/wrangler.toml` is this template's own deployment and
  needs to become yours — there's no way around hand-editing these, since
  Cloudflare resource IDs (D1 databases, R2 buckets) are generated per
  account and can't be templated with environment variables.
- Nothing in `site.config.ts` is a secret (Turnstile *site* keys, worker
  URLs, and R2 public URLs are all meant to be public) — the actual secrets
  (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `ADMIN_KEY`/
  `NEWSLETTER_ADMIN_KEY`) only ever live as Worker secrets or in your
  gitignored `.dev.vars`. The admin password hash is the one exception —
  it's intentionally in D1, not a Worker secret, so `/admin/settings` can
  change it at runtime.
