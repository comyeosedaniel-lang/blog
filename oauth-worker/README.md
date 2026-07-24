# mylineal-cms-auth

Decap CMS(`/admin`)의 GitHub 로그인을 처리하는 OAuth 프록시. Astro 사이트와는 별개로 Cloudflare Workers에 배포됩니다.

- 배포 주소: `https://mylineal-cms-auth.comyeosedaniel.workers.dev`
- `public/admin/config.yml`의 `backend.base_url`이 이 주소를 가리킵니다.

## 다시 배포하기

```sh
cd oauth-worker
npm install
npx wrangler deploy
```

## 시크릿 설정/변경

GitHub OAuth App의 Client ID / Secret이 바뀌면:

```sh
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```
