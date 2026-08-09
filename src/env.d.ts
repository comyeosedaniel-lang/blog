// Secrets set via `wrangler secret put` (not declared in wrangler.jsonc, so
// `wrangler types` doesn't know about them). Declared here so `env.X` from
// 'cloudflare:workers' type-checks — that module's `env` is typed as
// `Cloudflare.Env`, not the bare global `Env`, so both need augmenting.
interface Env {
  ADMIN_PASSWORD_HASH?: string;
  NEWSLETTER_ADMIN_KEY?: string;
  CRON_SECRET?: string;
}

declare namespace Cloudflare {
  interface Env {
    ADMIN_PASSWORD_HASH?: string;
    NEWSLETTER_ADMIN_KEY?: string;
    CRON_SECRET?: string;
  }
}

declare namespace App {
  interface SessionData {
    authed: boolean;
  }
}
