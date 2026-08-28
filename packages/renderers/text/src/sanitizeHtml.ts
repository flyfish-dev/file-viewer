import createDOMPurify from 'dompurify';
import type { WindowLike } from 'dompurify';
import { sanitizeFileViewerSvgResources } from '@file-viewer/core';

export type FileViewerRichHtmlSanitizerOptions = {
  /** Preserve inert SVG markup such as diff icons. Raw Markdown keeps this disabled. */
  allowSvg?: boolean;
};

const safeUrl = (value: string) => {
  // eslint-disable-next-line no-control-regex -- remove URL controls before scheme validation
  const compact = value.trim().replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme);
};

export const sanitizeFileViewerRichHtml = (
  documentRef: Document,
  html: string,
  options: FileViewerRichHtmlSanitizerOptions = {}
): DocumentFragment => {
  const fallback = () => {
    const fragment = documentRef.createDocumentFragment();
    fragment.append(documentRef.createTextNode(html));
    return fragment;
  };
  const windowRef = documentRef.defaultView;
  if (!windowRef) return fallback();
  const purifier = createDOMPurify(windowRef as unknown as WindowLike);
  if (!purifier.isSupported) return fallback();
  const fragment = purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: options.allowSvg
      ? { html: true, svg: true, svgFilters: true }
      : { html: true },
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script', 'style', 'template'],
    FORBID_ATTR: ['action', 'formaction', 'srcdoc', 'style'],
  }) as unknown as DocumentFragment;
  fragment.querySelectorAll<HTMLElement>('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
  });
  fragment.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
    const href = anchor.getAttribute('href') || '';
    if (!safeUrl(href)) anchor.removeAttribute('href');
    if ((anchor.getAttribute('target') || '').toLowerCase() === '_blank') anchor.rel = 'noopener noreferrer';
  });
  if (options.allowSvg) sanitizeFileViewerSvgResources(fragment);
  return fragment;
};
