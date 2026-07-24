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

1. **글쓰기 (사용자)** — `src/content/blog/ko/`(한국어) 또는 `src/content/blog/en/`(영어)에 마크다운 파일을 추가합니다. 파일명이 곧 글 주소(slug)가 됩니다. 예: `src/content/blog/ko/my-post.md` → `blog.mylineal.com/blog/my-post/`

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

2. **교정 (Claude)** — 초안이 준비되면 맞춤법, 문장 흐름, 가독성을 검토하고 수정 제안을 드립니다.
3. `main` 브랜치에 푸시하면 GitHub Actions가 자동으로 빌드해서 배포합니다 (`.github/workflows/deploy.yml`).

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

## 구조

```
/
├── public/CNAME              # 커스텀 도메인
├── src/
│   ├── content/blog/{ko,en}/ # 글 (마크다운)
│   ├── content.config.ts     # 콘텐츠 스키마
│   ├── site.config.ts        # 사이트 제목/설명
│   ├── i18n/ui.ts            # UI 텍스트 (한/영)
│   ├── layouts/               # BaseLayout, PostLayout
│   ├── components/            # Header, Footer, PostCard, ThemeToggle
│   └── pages/                 # 라우트 (홈, /en, /blog/[slug], rss.xml 등)
└── .github/workflows/deploy.yml
```
