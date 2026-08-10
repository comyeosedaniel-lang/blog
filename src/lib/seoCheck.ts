export interface SeoCheckItem {
  label: string;
  pass: boolean;
  detail?: string;
}

export interface SeoCheckInput {
  title: string;
  description: string;
  slug: string;
  tags: string[];
  heroImageUrl: string | null | undefined;
  contentHtml: string;
}

export function runSeoCheck(input: SeoCheckInput): SeoCheckItem[] {
  const titleLen = input.title.length;
  const descLen = input.description.length;
  const slugOk = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) && input.slug.length <= 75;
  const plainText = input.contentHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const bodyLen = plainText.length;
  const hasHeading = /<h[23][ >]/i.test(input.contentHtml);
  const imgTags = input.contentHtml.match(/<img [^>]*>/gi) ?? [];
  const missingAlt = imgTags.filter((tag) => !/\balt="[^"]+"/.test(tag));

  return [
    {
      label: '제목 길이',
      pass: titleLen >= 10 && titleLen <= 60,
      detail: `${titleLen}자 (권장: 10~60자)`,
    },
    {
      label: '설명(메타) 길이',
      pass: descLen >= 50 && descLen <= 160,
      detail: descLen === 0 ? '설명이 비어 있어요.' : `${descLen}자 (권장: 50~160자)`,
    },
    {
      label: '주소(슬러그) 형식',
      pass: slugOk,
      detail: slugOk ? undefined : '영문 소문자·숫자·하이픈만 사용하고 75자 이하로 만들어주세요.',
    },
    {
      label: '본문 분량',
      pass: bodyLen >= 200,
      detail: `${bodyLen}자 (최소 200자 권장)`,
    },
    {
      label: '소제목(H2/H3) 사용',
      pass: bodyLen < 200 || hasHeading,
      detail: hasHeading ? undefined : '본문에 소제목을 추가하면 검색엔진이 구조를 더 잘 이해해요.',
    },
    {
      label: '이미지 대체 텍스트(alt)',
      pass: missingAlt.length === 0,
      detail: missingAlt.length ? `${missingAlt.length}개 이미지에 대체 텍스트가 없어요.` : undefined,
    },
    {
      label: '태그',
      pass: input.tags.length > 0,
      detail: input.tags.length ? undefined : '태그를 1개 이상 추가해주세요.',
    },
    {
      label: '대표 이미지',
      pass: Boolean(input.heroImageUrl),
      detail: input.heroImageUrl ? undefined : '공유 시 노출될 대표 이미지를 등록하면 좋아요.',
    },
  ];
}
