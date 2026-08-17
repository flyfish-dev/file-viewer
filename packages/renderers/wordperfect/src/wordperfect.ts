import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core';
import type { WordPerfectParagraph, WordPerfectTable } from './parser.js';
import { parseWordPerfectWithWorker } from './workerClient.js';

const styleText = `
.wpd-viewer{width:100%;height:100%;overflow:auto;padding:28px;background:var(--file-viewer-render-surface-background,#dfe5eb);box-sizing:border-box;color:#1f2937}.wpd-page{width:min(100%,880px);min-height:1040px;margin:0 auto;padding:56px 64px;background:#fff;box-shadow:0 16px 38px rgba(15,23,42,.12);box-sizing:border-box;font:16px/1.85 Georgia,'Times New Roman',serif}.wpd-page p,.wpd-page h1,.wpd-page h2,.wpd-page h3,.wpd-page h4,.wpd-page h5,.wpd-page h6{margin:0 0 13px;white-space:pre-wrap}.wpd-page h1{font-size:1.65em}.wpd-page h2{font-size:1.4em}.wpd-page h3{font-size:1.2em}.wpd-page a{color:#2563eb}.wpd-table{width:100%;margin:18px 0;border-collapse:collapse}.wpd-table td{padding:7px 9px;border:1px solid #94a3b8;vertical-align:top}.wpd-running{margin:0 0 24px;padding:0 0 12px;border-bottom:1px solid #cbd5e1;color:#475569;font-size:.85em}.wpd-footer{margin-top:28px;padding-top:12px;border-top:1px solid #cbd5e1}.wpd-notes{margin-top:28px;padding:16px;background:#f8fafc;border-left:4px solid #94a3b8;font-size:.9em}
[data-viewer-theme='dark'] .wpd-viewer{background:var(--file-viewer-render-surface-background,#0d1117)}.wpd-page{color-scheme:light}
@media(max-width:720px){.wpd-viewer{padding:10px}.wpd-page{min-height:0;padding:34px 24px}}
`;

const appendParagraph = (parent: HTMLElement, paragraph: WordPerfectParagraph) => {
  const level = Math.min(6, Math.max(1, paragraph.level || 1));
  const element = document.createElement(paragraph.kind === 'heading' ? `h${level}` : 'p');
  if (paragraph.list) {
    const marker = paragraph.list.ordered ? `${paragraph.list.counter}. ` : '• ';
    element.append(document.createTextNode(`${'  '.repeat(Math.max(0, paragraph.list.level - 1))}${marker}`));
  }
  paragraph.runs.forEach(run => {
    let node: HTMLElement = document.createElement('span');
    node.textContent = run.text;
    const styles = new Set(run.styles);
    if (styles.has('bold')) node.style.fontWeight = '700';
    if (styles.has('italic')) node.style.fontStyle = 'italic';
    const decorations = [styles.has('underline') ? 'underline' : '', styles.has('strikethrough') ? 'line-through' : ''].filter(Boolean);
    if (decorations.length) node.style.textDecoration = decorations.join(' ');
    if (styles.has('superscript')) node.style.verticalAlign = 'super';
    if (styles.has('subscript')) node.style.verticalAlign = 'sub';
    if (run.href) {
      const link = document.createElement('a');
      link.href = run.href;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      link.appendChild(node);
      node = link;
    }
    element.appendChild(node);
  });
  parent.appendChild(element);
};

const appendTable = (parent: HTMLElement, table: WordPerfectTable) => {
  const element = document.createElement('table');
  element.className = 'wpd-table';
  table.rows.forEach(row => {
    const tr = document.createElement('tr');
    row.filter(cell => !cell.covered).forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell.text;
      td.colSpan = Math.max(1, cell.colSpan);
      td.rowSpan = Math.max(1, cell.rowSpan);
      tr.appendChild(td);
    });
    element.appendChild(tr);
  });
  parent.appendChild(element);
};

export default async function renderWordPerfect(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const model = await parseWordPerfectWithWorker(buffer.slice(0), context?.options?.wordPerfect, context?.signal);
  const style = document.createElement('style');
  style.textContent = styleText;
  const root = document.createElement('div');
  root.className = 'wpd-viewer';
  const page = document.createElement('article');
  page.className = 'wpd-page';
  page.dataset.viewerAnchorId = 'wordperfect-body';
  if (model.headers.length) {
    const header = document.createElement('header');
    header.className = 'wpd-running';
    model.headers.forEach(paragraph => appendParagraph(header, paragraph));
    page.appendChild(header);
  }
  model.structuredParagraphs.forEach(paragraph => appendParagraph(page, paragraph));
  model.tables.forEach(table => appendTable(page, table));
  if (model.notes.length) {
    const notes = document.createElement('aside');
    notes.className = 'wpd-notes';
    model.notes.forEach(paragraph => appendParagraph(notes, paragraph));
    page.appendChild(notes);
  }
  if (model.footers.length) {
    const footer = document.createElement('footer');
    footer.className = 'wpd-running wpd-footer';
    model.footers.forEach(paragraph => appendParagraph(footer, paragraph));
    page.appendChild(footer);
  }
  root.appendChild(page);
  target.replaceChildren(style, root);
  context?.registerThumbnailAdapter?.({ getTarget: () => page });
  return {
    $el: target,
    unmount() {
      context?.registerThumbnailAdapter?.(null);
      target.replaceChildren();
    },
  };
}
