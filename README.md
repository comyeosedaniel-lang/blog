# mylineal Blog

Astro 기반 블로그. GitHub Pages로 배포되고, `blog.mylineal.com` 커스텀 서브도메인으로 서비스됩니다.

## 개발

```sh
npm install
npm run dev       # localhost:4321
npm run build     # ./dist 로 정적 빌드
npm run preview   # 빌드 결과 로컬 미리보기
```

## 글쓰기 워크플로

**글쓰기 (사용자)** — 세 가지 방법 중 편한 걸로:

1. **채팅으로** — Claude에게 제목과 본문을 그대로 써서 보내면 파일 생성부터 교정, 배포까지 처리합니다.
2. **CMS 관리자 화면** — `blog.mylineal.com/admin`에서 GitHub 계정으로 로그인하면 폼으로 글을 쓰고 바로 저장(=커밋)할 수 있습니다. ([초기 설정](#글쓰기-cms-초기-설정-1회) 필요)
3. **직접 파일 작성** — `src/content/blog/ko/`(한국어) 또는 `src/content/blog/en/`(영어)에 마크다운 파일을 추가합니다. 파일명이 곧 글 주소(slug)가 됩니다. 예: `src/content/blog/ko/my-post.md` → `blog.mylineal.com/blog/my-post/`

   프런트매터 형식:

   ```md
   ---
   title: 글 제목
   description: 목록/검색엔진에 노출될 한두 줄 요약
   pubDate: 2026-07-25
   updatedDate: 2026-07-26   # 선택
   tags: [태그1, 태그2]        # 선택
   draft: false               # true면 배포 사이트에서 숨김, 로컬 dev에서는 보임
   ---
   ```

**교정 (Claude)** — 초안이 준비되면 맞춤법, 문장 흐름, 가독성을 검토하고 수정 제안을 드립니다.

`main` 브랜치에 푸시(또는 CMS에서 저장)하면 GitHub Actions가 자동으로 빌드해서 배포합니다 (`.github/workflows/deploy.yml`).

예시 글이 `hello-world.md`로 양쪽 언어 폴더에 들어 있습니다 — 실제 글을 쓸 때 지우거나 덮어써도 됩니다.

## 디자인

- 폰트: [Pretendard](https://github.com/orioncactus/pretendard)(본문), [Noto Serif KR](https://fonts.google.com/noknoto/specimen/Noto+Serif+KR)(제목) — 로컬 번들, 외부 요청 없음
- 라이트/다크 테마: `prefers-color-scheme` 자동 감지 + 우측 상단 토글로 수동 전환 (localStorage에 저장)
- 색상, 타이포 스케일 등은 `src/styles/global.css`의 CSS 변수에서 관리
- 사이트 제목/설명 등은 `src/site.config.ts`에서 수정

## 배포 설정 (최초 1회, 아직 안 한 상태)

1. **GitHub 저장소**: `comyeosedaniel-lang/blog`로 생성 후 이 프로젝트를 push
2. **GitHub Pages 활성화**: 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정
3. **DNS 설정** (mylineal.com을 관리하는 곳에서): `blog` 서브도메인에 대해 아래 CNAME 레코드 추가

   ```
   Type:  CNAME
   Name:  blog
   Value: comyeosedaniel-lang.github.io
   ```

4. DNS가 전파되면 저장소 Settings → Pages에서 커스텀 도메인이 `blog.mylineal.com`으로 확인되고, "Enforce HTTPS"를 켤 수 있게 됩니다. (`public/CNAME` 파일이 이미 배포마다 자동으로 포함됩니다.)

## 글쓰기 CMS 초기 설정 (1회)

`/admin`은 [Decap CMS](https://decapcms.org/)로, GitHub 저장소에 직접 커밋하는 방식이라 별도 데이터베이스가 없습니다. GitHub 로그인만 대신 처리해줄 작은 OAuth 프록시가 필요해서 `oauth-worker/`에 Cloudflare Worker로 구현되어 있고, 이미 배포되어 있습니다 (`https://mylineal-cms-auth.comyeosedaniel.workers.dev`).

남은 건 GitHub에 "이 앱이 로그인을 대신 처리해도 된다"고 등록하는 것뿐입니다:

1. https://github.com/settings/applications/new 접속 (comyeosedaniel-lang 계정으로)
2. 아래 값 입력:
   - Application name: `mylineal Blog CMS` (자유롭게)
   - Homepage URL: `https://blog.mylineal.com`
   - Authorization callback URL: `https://mylineal-cms-auth.comyeosedaniel.workers.dev/callback`
3. **Register application** 클릭 → **Client ID** 복사
4. **Generate a new client secret** 클릭 → **Client Secret** 복사 (한 번만 보여줌)
5. 두 값을 Claude에게 전달 (또는 직접 아래 명령 실행)

   ```sh
   cd oauth-worker
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

설정이 끝나면 `blog.mylineal.com/admin`에서 GitHub 계정으로 로그인해 글을 쓸 수 있습니다.

## 구조

```
/
├── public/
│   ├── CNAME                 # 커스텀 도메인
│   └── admin/                # Decap CMS 관리자 화면 (index.html, config.yml)
├── src/
│   ├── content/blog/{ko,en}/ # 글 (마크다운)
│   ├── content.config.ts     # 콘텐츠 스키마
│   ├── site.config.ts        # 사이트 제목/설명
│   ├── i18n/ui.ts            # UI 텍스트 (한/영)
│   ├── layouts/               # BaseLayout, PostLayout
│   ├── components/            # Header, Footer, PostCard, ThemeToggle
│   └── pages/                 # 라우트 (홈, /en, /blog/[slug], rss.xml 등)
├── oauth-worker/              # CMS 로그인용 Cloudflare Worker (별도 배포)
└── .github/workflows/deploy.yml
```
