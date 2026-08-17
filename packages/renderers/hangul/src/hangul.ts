import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core';
import { parseHangulWithWorker } from './workerClient.js';

const styleText = `
.hangul-viewer{width:100%;height:100%;overflow:auto;padding:28px;background:var(--file-viewer-render-surface-background,#e6eaf0);box-sizing:border-box;color:#172033;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif}.hangul-shell{width:min(100%,920px);margin:0 auto}.hangul-page{min-height:780px;margin:0 auto 20px;padding:54px 58px;background:#fff;box-shadow:0 16px 38px rgba(15,23,42,.12);box-sizing:border-box;overflow:hidden}.hangul-page p{margin:0 0 12px;font-size:15px;line-height:1.85;white-space:pre-wrap}.hangul-header,.hangul-footer{font-size:12px;color:#64748b;white-space:pre-wrap}.hangul-header{margin-bottom:24px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}.hangul-footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0}.hangul-notes{margin-top:18px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:12px;color:#475569}.hangul-structured-html{overflow-wrap:anywhere}.hangul-table{width:100%;margin:18px 0;border-collapse:collapse}.hangul-table td{padding:8px 10px;border:1px solid #cbd5e1;vertical-align:top;white-space:pre-wrap}.hangul-media{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-top:24px}.hangul-media img{max-width:100%;height:auto}
[data-viewer-theme='dark'] .hangul-viewer{background:var(--file-viewer-render-surface-background,#0d1117)}[data-viewer-theme='dark'] .hangul-page{background:#161b22;color:#e6edf3;border:1px solid #30363d}.hangul-page{color-scheme:light}
@media(max-width:720px){.hangul-viewer{padding:10px}.hangul-page{min-height:0!important;padding:30px 22px!important}}
`;

export default async function renderHangul(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentModel = await parseHangulWithWorker(buffer.slice(0), type, context?.options?.hangul, context?.signal);
  const objectUrls: string[] = [];
  const style = document.createElement('style');
  style.textContent = styleText;
  const root = document.createElement('div');
  root.className = 'hangul-viewer';
  const shell = document.createElement('div');
  shell.className = 'hangul-shell';
  documentModel.sections.forEach((section, index) => {
    const page = document.createElement('article');
    page.className = 'hangul-page';
    page.dataset.viewerAnchorId = section.id;
    page.dataset.pageIndex = String(index);
    if (section.page) {
      page.style.width = `${section.page.widthPx}px`;
      page.style.minHeight = `${section.page.heightPx}px`;
      page.style.maxWidth = '100%';
      if (section.page.margins) {
        page.style.padding = `${section.page.margins.topPx}px ${section.page.margins.rightPx}px ${section.page.margins.bottomPx}px ${section.page.margins.leftPx}px`;
      }
    }
    if (section.headers?.length) {
      const header = document.createElement('header');
      header.className = 'hangul-header';
      header.textContent = section.headers.join('\n');
      page.appendChild(header);
    }
    if (section.html) {
      const structured = document.createElement('div');
      structured.className = 'hangul-structured-html';
      structured.innerHTML = section.html;
      structured.querySelectorAll('script,iframe,object,embed,link,meta,style').forEach(node => node.remove());
      structured.querySelectorAll<HTMLElement>('*').forEach(node => {
        Array.from(node.attributes).filter(attribute => attribute.name.startsWith('on')).forEach(attribute => node.removeAttribute(attribute.name));
        for (const attributeName of ['href', 'src', 'xlink:href', 'formaction']) {
          const value = node.getAttribute(attributeName)?.trim() || '';
          if (value && !/^(?:https?:|blob:|#|\/)/i.test(value)) node.removeAttribute(attributeName);
        }
      });
      page.appendChild(structured);
    } else section.paragraphs.forEach(value => {
      const paragraph = document.createElement('p');
      paragraph.textContent = value;
      page.appendChild(paragraph);
    });
    section.tables.forEach(table => {
      const element = document.createElement('table');
      element.className = 'hangul-table';
      const rows: Array<Array<{ text: string; colSpan?: number; rowSpan?: number }>> = table.cells ||
        table.rows.map(row => row.map(value => ({ text: value })));
      rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value.text;
          if (value.colSpan && value.colSpan > 1) cell.colSpan = value.colSpan;
          if (value.rowSpan && value.rowSpan > 1) cell.rowSpan = value.rowSpan;
          tr.appendChild(cell);
        });
        element.appendChild(tr);
      });
      page.appendChild(element);
    });
    if (section.notes?.length) {
      const notes = document.createElement('aside');
      notes.className = 'hangul-notes';
      notes.textContent = section.notes.join('\n');
      page.appendChild(notes);
    }
    if (section.footers?.length) {
      const footer = document.createElement('footer');
      footer.className = 'hangul-footer';
      footer.textContent = section.footers.join('\n');
      page.appendChild(footer);
    }
    shell.appendChild(page);
  });
  const imageMedia = documentModel.media.filter(media => media.mimeType.startsWith('image/'));
  if (imageMedia.length) {
    const gallery = document.createElement('section');
    gallery.className = 'hangul-media';
    imageMedia.forEach(media => {
      const copy = new Uint8Array(media.bytes.length);
      copy.set(media.bytes);
      const url = URL.createObjectURL(new Blob([copy], { type: media.mimeType }));
      objectUrls.push(url);
      const image = document.createElement('img');
      image.src = url;
      image.alt = media.id;
      gallery.appendChild(image);
    });
    shell.appendChild(gallery);
  }
  root.appendChild(shell);
  target.replaceChildren(style, root);
  context?.registerThumbnailAdapter?.({ getTarget: () => shell.querySelector('.hangul-page') || shell });
  return {
    $el: target,
    unmount() {
      context?.registerThumbnailAdapter?.(null);
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      target.replaceChildren();
    },
  };
}
