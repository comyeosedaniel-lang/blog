# mylineal-comments

로그인 없는 자체 댓글 API. Cloudflare Worker + D1로 동작하며, Astro 사이트와는 별개로 배포됩니다.

- `GET /comments?post=<postId>` — 해당 글의 댓글 목록
- `POST /comments` — 댓글 작성 (`{ postId, name, message, turnstileToken, website }`, `website`는 허니팟용 숨김 필드)

## 다시 배포하기

```sh
cd comments-worker
npm install
npx wrangler deploy
```

## 시크릿 설정

Cloudflare Turnstile 위젯의 Secret Key:

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY
```

## DB 확인/직접 조작

```sh
npx wrangler d1 execute mylineal-comments --remote --command="SELECT * FROM comments ORDER BY created_at DESC LIMIT 20"
npx wrangler d1 execute mylineal-comments --remote --command="DELETE FROM comments WHERE id = <id>"
```
