import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core';
import { parseFb2Book, type Fb2Chapter } from './fb2/parser.js';

const styleText = `
.fb2-viewer{width:100%;height:100%;display:grid;grid-template-columns:minmax(190px,260px) minmax(0,1fr);overflow:hidden;background:var(--file-viewer-render-surface-background,#e8edf2);color:#1f2937;font-family:Georgia,'Times New Roman','Songti SC',serif}
.fb2-toc{min-height:0;overflow:auto;padding:18px 12px;border-right:1px solid #d8dee6;background:#fff}.fb2-toc h2{margin:0 8px 14px;font:700 15px/1.4 system-ui,sans-serif}.fb2-toc button{display:block;width:100%;padding:8px;border:0;border-radius:7px;background:transparent;color:#475569;text-align:left;cursor:pointer}.fb2-toc button:hover{background:#eef6ff;color:#0369a1}
.fb2-stage{min-width:0;overflow:auto;padding:24px}.fb2-paper{width:min(100%,860px);min-height:100%;margin:0 auto;padding:48px 56px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.12);box-sizing:border-box}.fb2-head{display:grid;grid-template-columns:auto 1fr;gap:22px;margin-bottom:36px}.fb2-head img{width:120px;max-height:180px;object-fit:contain}.fb2-head h1{margin:0 0 10px;font-size:30px}.fb2-meta{color:#64748b;font:13px/1.7 system-ui,sans-serif}.fb2-section{margin:0 0 36px}.fb2-section h2,.fb2-section h3{color:#172033}.fb2-section p{margin:0 0 13px;font-size:17px;line-height:1.85}.fb2-section img{display:block;max-width:100%;height:auto;margin:20px auto}.fb2-footnotes{margin-top:42px;padding-top:24px;border-top:1px solid #d8dee6}.fb2-footnotes h2{font-size:18px}
[data-viewer-theme='dark'] .fb2-viewer{background:var(--file-viewer-render-surface-background,#0d1117)}[data-viewer-theme='dark'] .fb2-toc,[data-viewer-theme='dark'] .fb2-paper{background:#161b22;color:#e6edf3;border-color:#30363d}[data-viewer-theme='dark'] .fb2-section h2,[data-viewer-theme='dark'] .fb2-section h3,[data-viewer-theme='dark'] .fb2-head h1{color:#f0f6fc}
@media(max-width:720px){.fb2-viewer{grid-template-columns:1fr}.fb2-toc{display:none}.fb2-stage{padding:10px}.fb2-paper{padding:30px 22px}}
`;

const appendText = (parent: HTMLElement, tag: keyof HTMLElementTagNameMap, text: string, className?: string) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
};

export default async function renderFb2(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const book = parseFb2Book(buffer.slice(0));
  const objectUrls = new Map<string, string>();
  const style = document.createElement('style');
  style.textContent = styleText;
  const root = document.createElement('div');
  root.className = 'fb2-viewer';
  const toc = document.createElement('nav');
  toc.className = 'fb2-toc';
  appendText(toc, 'h2', 'Contents');
  const stage = document.createElement('main');
  stage.className = 'fb2-stage';
  const paper = document.createElement('article');
  paper.className = 'fb2-paper';
  stage.appendChild(paper);

  const imageUrl = (id: string) => {
    const existing = objectUrls.get(id);
    if (existing) return existing;
    const image = book.images.get(id);
    if (!image) return '';
    const copy = new Uint8Array(image.bytes.length);
    copy.set(image.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: image.mimeType }));
    objectUrls.set(id, url);
    return url;
  };

  const header = document.createElement('header');
  header.className = 'fb2-head';
  if (book.coverImageId) {
    const src = imageUrl(book.coverImageId);
    if (src) {
      const image = document.createElement('img');
      image.src = src;
      image.alt = book.title;
      header.appendChild(image);
    }
  }
  const info = document.createElement('div');
  appendText(info, 'h1', book.title);
  appendText(info, 'div', [book.authors.join(', '), book.genres.join(', '), book.language].filter(Boolean).join(' · '), 'fb2-meta');
  if (book.annotation) appendText(info, 'p', book.annotation);
  header.appendChild(info);
  paper.appendChild(header);

  const renderChapter = (chapter: Fb2Chapter, depth = 0) => {
    const section = document.createElement('section');
    section.className = 'fb2-section';
    section.id = `fb2-${chapter.id.replace(/[^a-z0-9_-]/gi, '-')}`;
    section.dataset.viewerAnchorId = chapter.id;
    appendText(section, depth ? 'h3' : 'h2', chapter.title);
    chapter.paragraphs.forEach(paragraph => appendText(section, 'p', paragraph));
    chapter.imageIds.forEach(id => {
      const src = imageUrl(id);
      if (!src) return;
      const image = document.createElement('img');
      image.src = src;
      image.alt = chapter.title;
      section.appendChild(image);
    });
    chapter.children.forEach(child => section.appendChild(renderChapter(child, depth + 1)));
    return section;
  };

  book.chapters.forEach(chapter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = chapter.title;
    button.addEventListener('click', () => paper.querySelector(`#fb2-${chapter.id.replace(/[^a-z0-9_-]/gi, '-')}`)?.scrollIntoView({ block: 'start' }));
    toc.appendChild(button);
    paper.appendChild(renderChapter(chapter));
  });
  if (book.footnotes.length) {
    const notes = document.createElement('aside');
    notes.className = 'fb2-footnotes';
    appendText(notes, 'h2', 'Notes');
    book.footnotes.forEach(chapter => notes.appendChild(renderChapter(chapter, 1)));
    paper.appendChild(notes);
  }

  root.append(toc, stage);
  target.replaceChildren(style, root);
  context?.registerThumbnailAdapter?.({ getTarget: () => paper });
  return {
    $el: target,
    unmount() {
      context?.registerThumbnailAdapter?.(null);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      target.replaceChildren();
    },
  };
}
