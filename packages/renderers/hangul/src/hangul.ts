import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core';
import type { HangulMedia, HangulMediaPlacement, HangulTableCell } from './model.js';
import { parseHangulWithWorker } from './workerClient.js';

const styleText = `
.hangul-viewer{width:100%;height:100%;overflow:auto;padding:28px;background:var(--file-viewer-render-surface-background,#e6eaf0);box-sizing:border-box;color:#172033;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif}.hangul-shell{width:min(100%,920px);margin:0 auto}.hangul-page{position:relative;width:min(100%,793.7067px);min-height:1122.5067px;margin:0 auto 20px;padding:75.5733px 113.3867px 56.6933px;background:#fff;box-shadow:0 16px 38px rgba(15,23,42,.12);box-sizing:border-box;overflow:hidden;color-scheme:light}.hangul-page p{margin:0 0 12px;font-size:13.333px;line-height:1.6;white-space:pre-wrap}.hangul-header,.hangul-footer{position:relative;z-index:2;font-size:12px;color:#64748b;white-space:pre-wrap}.hangul-header{margin-bottom:24px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}.hangul-footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0}.hangul-notes{position:relative;z-index:2;margin-top:18px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:12px;color:#475569}.hangul-structured-html{position:relative;z-index:2;overflow-wrap:anywhere}.hangul-table{position:relative;z-index:2;max-width:100%;margin:18px 0;border-collapse:collapse;background:#fff}.hangul-table td{box-sizing:border-box;padding:6px 8px;border:1px solid #94a3b8;vertical-align:middle;white-space:pre-wrap;overflow-wrap:anywhere}.hangul-page-media{display:block;position:relative;z-index:1;max-width:100%;height:auto;margin:20px auto;object-fit:contain}.hangul-page-media--positioned{position:absolute;margin:0}
[data-viewer-theme='dark'] .hangul-viewer{background:var(--file-viewer-render-surface-background,#0d1117)}
@media(max-width:720px){.hangul-viewer{padding:10px}.hangul-page{min-height:0!important;padding:30px 22px!important}.hangul-page-media--positioned{position:relative!important;left:auto!important;top:auto!important;width:auto!important;height:auto!important;margin:20px auto}}
`;

const mediaLookupKey = (value: string) => value
  .replace(/\\/g, '/')
  .split('/').pop()!
  .replace(/\.[^.]+$/, '')
  .toLowerCase();

export default async function renderHangul(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentModel = await parseHangulWithWorker(buffer.slice(0), type, context?.options?.hangul, context?.signal);
  const objectUrls: string[] = [];
  const mediaUrls = new Map<HangulMedia, string>();
  const resolveMedia = (mediaId: string) => documentModel.media.find(media =>
    media.id.toLowerCase() === mediaId.toLowerCase() || mediaLookupKey(media.id) === mediaLookupKey(mediaId));
  const mediaUrl = (media: HangulMedia) => {
    const existing = mediaUrls.get(media);
    if (existing) return existing;
    const copy = new Uint8Array(media.bytes.length);
    copy.set(media.bytes);
    const url = URL.createObjectURL(new Blob([copy], { type: media.mimeType }));
    mediaUrls.set(media, url);
    objectUrls.push(url);
    return url;
  };
  const usedMedia = new Set<HangulMedia>();
  const appendMedia = (page: HTMLElement, placement: HangulMediaPlacement, media: HangulMedia) => {
    const image = document.createElement('img');
    image.className = 'hangul-page-media';
    image.src = mediaUrl(media);
    image.alt = placement.alt || '';
    if (placement.widthPx) image.style.width = `${placement.widthPx}px`;
    if (placement.heightPx) image.style.height = `${placement.heightPx}px`;
    if (placement.position === 'page' && placement.xPx != null && placement.yPx != null) {
      image.classList.add('hangul-page-media--positioned');
      image.style.left = `${placement.xPx}px`;
      image.style.top = `${placement.yPx}px`;
    }
    page.appendChild(image);
    usedMedia.add(media);
  };
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
      if (table.widthPx) {
        element.style.width = `${table.widthPx}px`;
        element.style.tableLayout = 'fixed';
      } else {
        element.style.width = '100%';
      }
      const rows: HangulTableCell[][] = table.cells ||
        table.rows.map(row => row.map(value => ({ text: value })));
      rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value.text;
          if (value.colSpan && value.colSpan > 1) cell.colSpan = value.colSpan;
          if (value.rowSpan && value.rowSpan > 1) cell.rowSpan = value.rowSpan;
          if (value.widthPx) cell.style.width = `${value.widthPx}px`;
          if (value.heightPx) cell.style.height = `${value.heightPx}px`;
          if (value.padding) {
            cell.style.padding = `${value.padding.topPx}px ${value.padding.rightPx}px ${value.padding.bottomPx}px ${value.padding.leftPx}px`;
          }
          tr.appendChild(cell);
        });
        element.appendChild(tr);
      });
      page.appendChild(element);
    });
    section.placedMedia?.forEach(placement => {
      const media = resolveMedia(placement.mediaId);
      if (media?.mimeType.startsWith('image/')) appendMedia(page, placement, media);
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
  const fallbackPage = shell.querySelector<HTMLElement>('.hangul-page');
  documentModel.media
    .filter(media => media.mimeType.startsWith('image/') && !usedMedia.has(media))
    .forEach(media => {
      if (fallbackPage) appendMedia(fallbackPage, { mediaId: media.id, position: 'flow' }, media);
    });
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
