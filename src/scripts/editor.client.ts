import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { SITE } from '../site.config';
import { runSeoCheck, type SeoCheckItem } from '../lib/seoCheck';

interface InitialPost {
  id: number;
  slug: string;
  lang: string;
  title: string;
  contentHtml: string;
  contentJson: string | null;
}

const root = document.querySelector<HTMLElement>('.write-editor');
if (root) {
  const initialDataEl = document.getElementById('initial-data');
  const initial: InitialPost | null = initialDataEl?.textContent ? JSON.parse(initialDataEl.textContent) : null;
  let postId = initial?.id ?? null;

  const editorEl = document.getElementById('editor')!;
  const statusEl = document.getElementById('write-status')!;

  function setStatus(message: string, isError = false) {
    statusEl.textContent = isError && message ? `⚠ ${message}` : message;
    statusEl.classList.toggle('write-editor__status--error', isError);
  }

  const sourceLink = root.dataset.sourceLink;

  function isEmptyDoc(json: unknown): boolean {
    if (!json || typeof json !== 'object') return true;
    const content = (json as { content?: unknown[] }).content;
    if (!Array.isArray(content) || content.length === 0) return true;
    if (content.length === 1) {
      const node = content[0] as { type?: string; content?: unknown };
      if (node?.type === 'paragraph' && !node.content) return true;
    }
    return false;
  }

  let initialContent: string | object = initial?.contentHtml ?? (sourceLink ? `<p>출처: <a href="${sourceLink}">${sourceLink}</a></p><p></p>` : '');
  if (initial?.contentJson) {
    const parsedJson = JSON.parse(initial.contentJson);
    if (!isEmptyDoc(parsedJson) || !initial.contentHtml) {
      initialContent = parsedJson;
    }
  }

  const editor = new Editor({
    element: editorEl,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: '이야기를 시작해보세요...' }),
    ],
    content: initialContent,
  });

  // --- Unsaved-changes guard ---
  let isDirty = false;
  const markDirty = () => {
    isDirty = true;
  };

  editor.on('update', markDirty);
  ['title', 'slug', 'lang', 'category', 'description', 'tags'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', markDirty);
    document.getElementById(id)?.addEventListener('change', markDirty);
  });

  window.addEventListener('beforeunload', (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // --- Autosave (local only — protects against crashed tabs/browsers) ---
  let autosaveKey = `blog-draft-autosave:${postId ?? 'new'}`;
  let autosaveTimer: number | undefined;

  function scheduleAutosave() {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(autosaveKey, JSON.stringify({ ...currentFormValues(), savedAt: Date.now() }));
      } catch {
        // localStorage unavailable (private mode, quota) — autosave is best-effort
      }
    }, 2000);
  }

  editor.on('update', scheduleAutosave);
  ['title', 'slug', 'lang', 'category', 'description', 'tags'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', scheduleAutosave);
  });

  function slugify(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
  }

  function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const text = `© ${SITE.author}`;
    const fontSize = Math.max(14, Math.round(width * 0.025));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    const x = width - fontSize * 0.6;
    const y = height - fontSize * 0.6;
    ctx.lineWidth = Math.max(1, fontSize * 0.12);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(text, x, y);
  }

  async function resizeImage(file: File, maxWidth = 1600, quality = 0.82): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))), 'image/jpeg', quality);
    });
  }

  async function uploadImage(file: File, maxWidth = 1600): Promise<string> {
    const blob = await resizeImage(file, maxWidth);
    const form = new FormData();
    form.append('file', blob, 'image.jpg');
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error('upload failed');
    const data = (await res.json()) as { url: string };
    return data.url;
  }

  // --- Toolbar ---
  document.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      const chain = editor.chain().focus();
      switch (cmd) {
        case 'bold':
          chain.toggleBold().run();
          break;
        case 'italic':
          chain.toggleItalic().run();
          break;
        case 'h2':
          chain.toggleHeading({ level: 2 }).run();
          break;
        case 'h3':
          chain.toggleHeading({ level: 3 }).run();
          break;
        case 'bullet':
          chain.toggleBulletList().run();
          break;
        case 'ordered':
          chain.toggleOrderedList().run();
          break;
        case 'blockquote':
          chain.toggleBlockquote().run();
          break;
        case 'code':
          chain.toggleCodeBlock().run();
          break;
        case 'undo':
          chain.undo().run();
          break;
        case 'redo':
          chain.redo().run();
          break;
        case 'link': {
          const url = window.prompt('링크 주소를 입력하세요');
          if (url) chain.setLink({ href: url }).run();
          break;
        }
        case 'image':
          document.getElementById('image-input')?.click();
          break;
      }
    });
  });

  const imageInput = document.getElementById('image-input') as HTMLInputElement;
  imageInput.addEventListener('change', async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    const alt = window.prompt('이 이미지를 설명하는 대체 텍스트를 입력하세요 (검색엔진 노출에 도움돼요).', '') ?? '';
    statusEl.textContent = '이미지 업로드 중...';
    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url, alt }).run();
      setStatus('');
    } catch {
      setStatus('이미지 업로드에 실패했어요.', true);
    } finally {
      imageInput.value = '';
    }
  });

  editorEl.addEventListener('paste', async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const alt = window.prompt('이 이미지를 설명하는 대체 텍스트를 입력하세요 (검색엔진 노출에 도움돼요).', '') ?? '';
          statusEl.textContent = '이미지 업로드 중...';
          try {
            const url = await uploadImage(file);
            editor.chain().focus().setImage({ src: url, alt }).run();
            setStatus('');
          } catch {
            setStatus('이미지 업로드에 실패했어요.', true);
          }
        }
      }
    }
  });

  // --- Hero image ---
  const heroInput = document.getElementById('hero-input') as HTMLInputElement;
  const heroUrlField = document.getElementById('heroImageUrl') as HTMLInputElement;
  const heroPreview = document.getElementById('hero-preview') as HTMLImageElement;
  heroInput.addEventListener('change', async () => {
    const file = heroInput.files?.[0];
    if (!file) return;
    statusEl.textContent = '대문 이미지 업로드 중...';
    try {
      const url = await uploadImage(file, 2000);
      heroUrlField.value = url;
      heroPreview.src = url;
      heroPreview.hidden = false;
      markDirty();
      setStatus('');
    } catch {
      setStatus('대문 이미지 업로드에 실패했어요.', true);
    }
  });

  // --- Autosave restore banner ---
  const autosaveBanner = document.getElementById('autosave-banner')!;
  try {
    const raw = localStorage.getItem(autosaveKey);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved) {
      autosaveBanner.hidden = false;
      document.getElementById('autosave-restore')?.addEventListener('click', () => {
        (document.getElementById('title') as HTMLInputElement).value = saved.title ?? '';
        const slugField = document.getElementById('slug') as HTMLInputElement;
        if (!slugField.disabled) slugField.value = saved.slug ?? '';
        (document.getElementById('description') as HTMLTextAreaElement).value = saved.description ?? '';
        (document.getElementById('tags') as HTMLInputElement).value = (saved.tags ?? []).join(', ');
        if (saved.contentJson) {
          editor.commands.setContent(JSON.parse(saved.contentJson));
        } else if (saved.contentHtml) {
          editor.commands.setContent(saved.contentHtml);
        }
        markDirty();
        autosaveBanner.hidden = true;
      });
      document.getElementById('autosave-discard')?.addEventListener('click', () => {
        localStorage.removeItem(autosaveKey);
        autosaveBanner.hidden = true;
      });
    }
  } catch {
    // localStorage unavailable — nothing to restore
  }

  // --- Slug auto-generate (new posts only) ---
  document.getElementById('slug-from-title')?.addEventListener('click', () => {
    const title = (document.getElementById('title') as HTMLInputElement).value;
    (document.getElementById('slug') as HTMLInputElement).value = slugify(title);
  });

  // --- Preview toggle ---
  const previewPane = document.getElementById('preview-pane')!;
  const previewToggle = document.getElementById('toggle-preview') as HTMLButtonElement;
  const writeToolbar = document.querySelector<HTMLElement>('.write-toolbar');
  let previewing = false;

  previewToggle.addEventListener('click', () => {
    previewing = !previewing;
    if (previewing) {
      previewPane.innerHTML = editor.getHTML();
      previewPane.hidden = false;
      editorEl.hidden = true;
      writeToolbar?.setAttribute('hidden', '');
      previewToggle.textContent = '편집으로 돌아가기';
    } else {
      previewPane.hidden = true;
      editorEl.hidden = false;
      writeToolbar?.removeAttribute('hidden');
      previewToggle.textContent = '미리보기';
    }
  });

  // --- SEO check ---
  function renderSeoCheck(items: SeoCheckItem[]) {
    const container = document.getElementById('seo-check')!;
    const list = document.getElementById('seo-check-list')!;
    list.innerHTML = '';
    for (const item of items) {
      const li = document.createElement('li');
      li.className = `seo-check__item seo-check__item--${item.pass ? 'pass' : 'fail'}`;
      const detailHtml = item.detail ? `<span class="seo-check__detail">${item.detail}</span>` : '';
      li.innerHTML = `<span class="seo-check__icon">${item.pass ? '✅' : '⚠'}</span><span><span class="seo-check__label">${item.label}</span>${detailHtml}</span>`;
      list.appendChild(li);
    }
    container.hidden = false;
  }

  // --- Save / publish ---
  function currentFormValues() {
    return {
      slug: (document.getElementById('slug') as HTMLInputElement).value.trim(),
      lang: (document.getElementById('lang') as unknown as HTMLSelectElement).value,
      title: (document.getElementById('title') as HTMLInputElement).value.trim(),
      description: (document.getElementById('description') as HTMLTextAreaElement).value.trim(),
      category: (document.getElementById('category') as unknown as HTMLSelectElement).value,
      tags: (document.getElementById('tags') as HTMLInputElement).value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      contentHtml: editor.getHTML(),
      contentJson: JSON.stringify(editor.getJSON()),
      heroImageUrl: heroUrlField.value || null,
    };
  }

  async function save(draft: boolean) {
    const values = currentFormValues();

    if (!values.slug || !values.title) {
      setStatus('제목과 주소(슬러그)는 필수예요.', true);
      return;
    }

    const payload = { ...values, draft };

    setStatus('저장하는 중...');

    const url = postId ? `/api/posts/${postId}` : '/api/posts';
    const method = postId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus(`저장 실패: ${err.error ?? res.status}`, true);
        return;
      }

      if (!postId) {
        const data = (await res.json().catch(() => ({}))) as { id?: number };
        if (data.id) {
          postId = data.id;
          (document.getElementById('slug') as HTMLInputElement).disabled = true;
          window.history.replaceState(null, '', `/admin/edit/${data.id}`);
        }
      }

      isDirty = false;
      try {
        localStorage.removeItem(autosaveKey);
      } catch {
        // ignore
      }
      autosaveKey = `blog-draft-autosave:${postId ?? 'new'}`;
      setStatus(draft ? '임시저장했어요.' : '발행했어요.');
      renderSeoCheck(runSeoCheck(payload));
    } catch {
      setStatus('저장 중 문제가 생겼어요. 네트워크 연결을 확인해주세요.', true);
    }
  }

  document.getElementById('save-draft')?.addEventListener('click', () => save(true));
  document.getElementById('publish')?.addEventListener('click', () => save(false));

  // Show the SEO check right away when opening an existing (draft or already-published) post,
  // not only right after clicking save.
  if (initial) {
    renderSeoCheck(runSeoCheck(currentFormValues()));
  }

  document.getElementById('delete-post')?.addEventListener('click', async () => {
    if (!postId) return;
    if (!window.confirm('정말 이 글을 삭제할까요?')) return;
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      isDirty = false;
      try {
        localStorage.removeItem(autosaveKey);
      } catch {
        // ignore
      }
      window.location.href = '/admin';
    } else {
      setStatus('삭제에 실패했어요.', true);
    }
  });
}
