# mylineal-comments

로그인 없는 자체 댓글 API. Cloudflare Worker + D1로 동작하며, Astro 사이트와는 별개로 배포됩니다.

- `GET /comments?post=<postId>` — 해당 글의 댓글 목록
- `POST /comments` — 댓글 작성 (`{ postId, name, message, turnstileToken, website }`, `website`는 허니팟용 숨김 필드)
- `GET /comments/recent?adminKey=<key>&limit=<n>` — 최근 댓글 목록 (관리자 모더레이션용)
- `DELETE /comments/<id>` (`{ adminKey }`) — 댓글 삭제 (관리자 모더레이션용)

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

관리자 모더레이션(최근 댓글 조회/삭제)용 키 — 메인 블로그 워커의 `COMMENTS_ADMIN_KEY`와 같은 값이어야 함:

```sh
npx wrangler secret put ADMIN_KEY
```

## DB 확인/직접 조작

```sh
npx wrangler d1 execute mylineal-comments --remote --command="SELECT * FROM comments ORDER BY created_at DESC LIMIT 20"
npx wrangler d1 execute mylineal-comments --remote --command="DELETE FROM comments WHERE id = <id>"
```
