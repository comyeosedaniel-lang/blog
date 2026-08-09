import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

// The model reliably translates one sentence but tends to give up partway
// through (leaving the rest verbatim in English) once given more than one —
// splitting into sentences and translating each on its own call works
// around that.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function translateOne(text: string): Promise<string> {
  const result = await env.AI.run('@cf/meta/m2m100-1.2b', {
    text,
    source_lang: 'en',
    target_lang: 'ko',
  });
  return (result as any).translated_text ?? '';
}

async function translate(text: string): Promise<string> {
  if (!text) return '';
  const sentences = splitSentences(text);
  const translated = await Promise.all(sentences.map(translateOne));
  return translated.join(' ');
}

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as any;
  const title = typeof body?.title === 'string' ? body.title : '';
  const summary = typeof body?.summary === 'string' ? body.summary : '';

  if (!title && !summary) {
    return new Response(JSON.stringify({ error: 'missing text' }), { status: 400 });
  }

  try {
    // Translated independently (not concatenated) — combining title + a long,
    // sometimes run-on RSS summary made the model give up partway through.
    const [translatedTitle, translatedSummary] = await Promise.all([translate(title), translate(summary)]);
    return new Response(JSON.stringify({ title: translatedTitle, summary: translatedSummary }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '번역에 실패했어요.' }), { status: 502 });
  }
};
