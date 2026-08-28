import JSZip from 'jszip';
import {
  createFileViewerTranslator,
  type FileRenderContext,
  type FileViewerRenderedInstance,
} from '@file-viewer/core';
import { getFileViewerRtfLoader } from './optionalCapabilities.js';
import {
  createFileViewerRtfHyperlinkContainer,
  sanitizeFileViewerRtfElement,
} from './sanitizeRtf.js';

interface OpenDocumentPage {
  blocks: string[];
}

type OpenDocumentTranslator = ReturnType<typeof createFileViewerTranslator>;

const openDocumentStyle = `
.odf-viewer{min-height:100%;padding:28px;overflow:auto;background:var(--file-viewer-render-surface-background,#dfe5eb);box-sizing:border-box}
.odf-shell{width:min(100%,980px);margin:0 auto}
.odf-page{min-height:360px;margin:0 auto 18px;padding:42px 48px;border-radius:4px;background:#fff;box-shadow:0 16px 38px rgba(15,23,42,.12);color:#1f2937;box-sizing:border-box}
.odf-page p{margin:0 0 12px;font-size:15px;line-height:1.85;white-space:pre-wrap}
.flyfish-rtf-viewer{min-height:100%;padding:28px;overflow:auto;background:var(--file-viewer-render-surface-background,#dfe5eb);color:#1f2937;box-sizing:border-box}
.flyfish-rtf-paper{width:min(100%,900px);min-height:980px;margin:0 auto;padding:54px 62px;background:#fff;box-shadow:0 16px 38px rgba(15,23,42,.12);line-height:1.75;box-sizing:border-box}.flyfish-rtf-paper p{margin:0 0 12px}
[data-viewer-theme='dark'] .odf-viewer,[data-viewer-theme='dark'] .flyfish-rtf-viewer{color-scheme:dark;background:var(--file-viewer-render-surface-background,#0d1117);color:#e6edf3}
[data-viewer-theme='dark'] .odf-page,[data-viewer-theme='dark'] .flyfish-rtf-paper{border:1px solid rgba(139,148,158,.24);background:#161b22;color:#e6edf3;box-shadow:0 18px 44px rgba(0,0,0,.34)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .odf-viewer,[data-viewer-theme='system'] .flyfish-rtf-viewer{color-scheme:dark;background:var(--file-viewer-render-surface-background,#0d1117);color:#e6edf3}[data-viewer-theme='system'] .odf-page,[data-viewer-theme='system'] .flyfish-rtf-paper{border:1px solid rgba(139,148,158,.24);background:#161b22;color:#e6edf3;box-shadow:0 18px 44px rgba(0,0,0,.34)}}
@media (max-width:720px){.odf-viewer,.flyfish-rtf-viewer{padding:14px}.odf-page{padding:28px 24px}.flyfish-rtf-paper{padding:36px 28px}}
`;

const createStyle = (documentRef: Document = document) => {
  const style = documentRef.createElement('style');
  style.textContent = openDocumentStyle;
  return style;
};

const appendText = (parent: HTMLElement, tag: keyof HTMLElementTagNameMap, text: string, className?: string) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  parent.appendChild(element);
  return element;
};

const nodeText = (node: Element) => {
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
};

const parseOdf = async (
  buffer: ArrayBuffer,
  type: string,
  t: OpenDocumentTranslator
): Promise<OpenDocumentPage[]> => {
  const zip = await JSZip.loadAsync(buffer);
  const content = await zip.file('content.xml')?.async('text');
  if (!content) {
    throw new Error(t('word.error.missingOdfContent'));
  }
  const doc = new DOMParser().parseFromString(content, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(t('word.error.odfXmlParseFailed'));
  }
  if (type === 'odp') {
    const slides = Array.from(doc.getElementsByTagName('draw:page'));
    return slides.map(slide => {
      const blocks = Array.from(slide.getElementsByTagName('text:p'))
        .map(nodeText)
        .filter(Boolean);
      return {
        blocks,
      };
    });
  }
  const blocks = [
    ...Array.from(doc.getElementsByTagName('text:h')).map(nodeText),
    ...Array.from(doc.getElementsByTagName('text:p')).map(nodeText),
  ].filter(Boolean);
  return [{ blocks }];
};

const renderOdfPages = (pages: OpenDocumentPage[]) => {
  const root = document.createElement('div');
  root.className = 'odf-viewer';
  const shell = document.createElement('section');
  shell.className = 'odf-shell';
  pages.forEach(page => {
    const article = document.createElement('article');
    article.className = 'odf-page';
    page.blocks.forEach(block => appendText(article, 'p', block));
    shell.appendChild(article);
  });

  root.appendChild(shell);
  return root;
};

const resolveRtfJs = async () => {
  const loadRtf = getFileViewerRtfLoader();
  if (!loadRtf) {
    throw new Error('RTF support is opt-in. Run `npx file-viewer-cli add rtf --write`, then `npx file-viewer-cli install --yes`.');
  }
  const rtfModule = await loadRtf();
  return rtfModule.RTFJS || rtfModule.default || rtfModule;
};

const renderRtf = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> => {
  const RTFJS = await resolveRtfJs();
  const documentRef = target.ownerDocument || document;
  const externalLinkPolicy = context?.options?.docx?.externalLinkPolicy ?? 'block';
  const externalResourcePolicy = context?.options?.docx?.externalResourcePolicy ?? 'block';
  RTFJS.loggingEnabled?.(false);
  const doc = new RTFJS.Document(buffer, {
    onHyperlink: (create: () => HTMLElement, hyperlink: { url: () => string }) =>
      createFileViewerRtfHyperlinkContainer(documentRef, create, hyperlink, externalLinkPolicy),
  });
  const elements = await doc.render();

  const stage = documentRef.createElement('div');
  stage.className = 'flyfish-rtf-viewer';
  const paper = documentRef.createElement('article');
  paper.className = 'flyfish-rtf-paper';
  elements.forEach((element: HTMLElement) => paper.append(sanitizeFileViewerRtfElement(documentRef, element, {
    externalLinkPolicy,
    externalResourcePolicy,
  })));
  stage.appendChild(paper);
  target.replaceChildren(createStyle(documentRef), stage);
  context?.registerThumbnailAdapter?.({ getTarget: () => paper });

  return {
    $el: target,
    unmount() {
      context?.registerThumbnailAdapter?.(null);
      target.replaceChildren();
    },
  };
};

export default async function renderOpenDocument(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options);
  const normalizedType = (type || 'odt').toLowerCase();
  if (normalizedType === 'rtf') {
    return renderRtf(buffer, target, context);
  }
  const pages = await parseOdf(buffer, normalizedType, t);
  target.replaceChildren(createStyle(), renderOdfPages(pages));
  context?.registerThumbnailAdapter?.({
    getTarget: () => target.querySelector('.odf-page') || target
  });

  return {
    $el: target,
    unmount() {
      context?.registerThumbnailAdapter?.(null);
      target.replaceChildren();
    },
  };
}
