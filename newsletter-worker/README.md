# mylineal-newsletter

이메일 구독(더블 옵트인) + 발송용 Cloudflare Worker + D1. Astro 사이트와는 별개로 배포됩니다.

- `POST /subscribe` — `{ email, turnstileToken, website }` 구독 신청, 확인 메일 발송
- `GET /confirm?token=...` — 확인 메일의 링크, 구독 확정
- `GET /unsubscribe?token=...` — 구독 취소
- `POST /broadcast` — `{ adminKey, title, postUrl, excerpt }` 확정된 구독자 전체에게 새 글 발송 (관리자 전용)

## 새 글 발송하는 법 (지금은 수동)

```sh
curl -X POST https://mylineal-newsletter.comyeosedaniel.workers.dev/broadcast \
  -H "content-type: application/json" \
  -d '{"adminKey":"<ADMIN_KEY>","title":"글 제목","postUrl":"https://blog.mylineal.com/blog/...","excerpt":"한 줄 요약"}'
```

## 다시 배포하기

```sh
cd newsletter-worker
npm install
npx wrangler deploy
```

## 시크릿 설정

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put ADMIN_KEY
```

## 발신 주소

지금은 Resend의 공용 주소(`onboarding@resend.dev`)로 발송돼요. 나중에 `mylineal.com` 도메인을 Resend에 인증하면 `newsletter@mylineal.com` 같은 자체 주소로 바꿀 수 있어요 (Cloudflare DNS에 레코드 추가 필요).

## 구독자 확인/직접 조작

```sh
npx wrangler d1 execute mylineal-newsletter --remote --command="SELECT email, confirmed, created_at FROM subscribers ORDER BY created_at DESC"
```
