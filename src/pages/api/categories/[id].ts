import { updateCategory, deleteCategory, categoryIdExists, countPostsInCategory } from '../../../lib/categories';
import type { APIRoute } from 'astro';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!(await categoryIdExists(id))) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const ko = typeof body?.ko === 'string' ? body.ko.trim() : '';
  const en = typeof body?.en === 'string' ? body.en.trim() : '';
  if (!ko || !en) {
    return new Response(JSON.stringify({ error: 'invalid category data' }), { status: 400 });
  }

  await updateCategory(id, { ko, en });

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!(await categoryIdExists(id))) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }

  const postCount = await countPostsInCategory(id);
  if (postCount > 0) {
    return new Response(
      JSON.stringify({ error: `이 카테고리에 글이 ${postCount}개 있어요. 먼저 다른 카테고리로 옮기거나 글을 삭제해주세요.` }),
      { status: 409 },
    );
  }

  await deleteCategory(id);

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
