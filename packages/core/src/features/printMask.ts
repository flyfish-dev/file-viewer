import type {
  FileViewerPrintMaskOptions,
  FileViewerPrintMaskRegion,
  FileViewerPrintStamp,
} from '../contracts/types';

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const normalizeMaskColor = (value: unknown) => {
  if (typeof value !== 'string') {
    return '#000000';
  }
  const color = value.trim();
  if (
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ||
    /^[a-z]{1,32}$/i.test(color) ||
    /^(?:rgb|rgba|hsl|hsla)\([0-9.,%+\- /]+\)$/i.test(color)
  ) {
    return color;
  }
  return '#000000';
};

export const normalizeFileViewerPrintMaskRegion = (
  region: Partial<FileViewerPrintMaskRegion> | null | undefined
): FileViewerPrintMaskRegion | null => {
  if (!region) {
    return null;
  }
  const pageIndex = region.pageIndex;
  if (
    pageIndex !== undefined &&
    (!Number.isInteger(pageIndex) || pageIndex < 0)
  ) {
    return null;
  }
  const left = clampPercent(Number(region.left) || 0);
  const top = clampPercent(Number(region.top) || 0);
  const width = clampPercent(Number(region.width) || 0);
  const height = clampPercent(Number(region.height) || 0);
  if (width <= 0 || height <= 0) {
    return null;
  }
  return {
    left,
    top,
    width: Math.min(width, 100 - left),
    height: Math.min(height, 100 - top),
    ...(pageIndex === undefined ? {} : { pageIndex }),
  };
};

const normalizeStampSource = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }
  const source = value.trim();
  if (
    /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);/i.test(source) ||
    /^(?:blob:|https?:\/\/|\/|\.\.?\/)/i.test(source)
  ) {
    return source;
  }
  return '';
};

const clampOpacity = (value: unknown) => {
  const opacity = Number(value);
  return Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
};

const normalizeRotation = (value: unknown) => {
  const rotation = Number(value);
  if (!Number.isFinite(rotation)) {
    return 0;
  }
  return ((rotation % 360) + 360) % 360;
};

export const normalizeFileViewerPrintStamp = (
  stamp: Partial<FileViewerPrintStamp> | null | undefined
): FileViewerPrintStamp | null => {
  const region = normalizeFileViewerPrintMaskRegion(stamp);
  const src = normalizeStampSource(stamp?.src);
  if (!region || !src) {
    return null;
  }
  return {
    ...region,
    src,
    opacity: clampOpacity(stamp?.opacity),
    rotate: normalizeRotation(stamp?.rotate),
    ...(typeof stamp?.alt === 'string' && stamp.alt.trim()
      ? { alt: stamp.alt.trim() }
      : {}),
  };
};

export const normalizeFileViewerPrintMaskOptions = (
  mask?: FileViewerPrintMaskOptions | null
): FileViewerPrintMaskOptions | null => {
  if (!mask) {
    return null;
  }
  const regions = (mask.regions || [])
    .map(region => normalizeFileViewerPrintMaskRegion(region))
    .filter((region): region is FileViewerPrintMaskRegion => !!region);
  const stamps = (mask.stamps || [])
    .map(stamp => normalizeFileViewerPrintStamp(stamp))
    .filter((stamp): stamp is FileViewerPrintStamp => !!stamp);
  if (!regions.length && !stamps.length) {
    return null;
  }
  return {
    ...(regions.length ? { regions } : {}),
    ...(stamps.length ? { stamps } : {}),
    color: normalizeMaskColor(mask.color),
  };
};

const escapeHtmlAttribute = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const buildFileViewerPrintMaskOverlayHtml = (
  mask?: FileViewerPrintMaskOptions | null,
  pageScoped = false
): string => {
  const normalized = normalizeFileViewerPrintMaskOptions(mask);
  if (!normalized) {
    return '';
  }
  const color = normalized.color || '#000000';
  const blocks = (normalized.regions || []).map(region => (
    `<div class="viewer-export-print-mask-block" style="left:${region.left}%;top:${region.top}%;width:${region.width}%;height:${region.height}%;background:${color};"></div>`
  )).join('');
  const stamps = (normalized.stamps || []).map(stamp => (
    `<img class="viewer-export-print-stamp" src="${escapeHtmlAttribute(stamp.src)}" alt="${escapeHtmlAttribute(stamp.alt || '')}" draggable="false" style="left:${stamp.left}%;top:${stamp.top}%;width:${stamp.width}%;height:${stamp.height}%;opacity:${stamp.opacity ?? 1};transform:rotate(${stamp.rotate ?? 0}deg);" />`
  )).join('');
  const className = pageScoped
    ? 'viewer-export-print-mask viewer-export-print-mask--page'
    : 'viewer-export-print-mask';
  return `<div class="${className}" aria-hidden="true">${blocks}${stamps}</div>`;
};

export const FILE_VIEWER_PRINT_MASK_STYLE = `
  .viewer-export-print-mask{position:absolute;inset:0;z-index:15;pointer-events:none;print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  .viewer-export-print-mask--page{z-index:2147483647;}
  .viewer-export-print-mask-block{position:absolute;box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  .viewer-export-print-stamp{position:absolute;display:block;object-fit:contain;transform-origin:center center;print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  [data-viewer-print-page-index]{position:relative!important;isolation:isolate;}
`;

const isAsciiWhitespace = (value: string) => (
  value === ' ' || value === '\t' || value === '\n' || value === '\r' || value === '\f'
);

const isAsciiLetter = (value: string) => {
  const code = value.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
};

const findOpeningTagEnd = (html: string, start: number) => {
  let quote = '';
  for (let index = start + 1; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index;
    }
  }
  return -1;
};

const parseNonNegativeInteger = (value: string) => {
  if (!value) {
    return null;
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) {
      return null;
    }
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const readPrintPageIndex = (html: string, start: number, end: number) => {
  let cursor = start + 1;
  while (cursor < end && !isAsciiWhitespace(html[cursor]) && html[cursor] !== '/' && html[cursor] !== '>') {
    cursor += 1;
  }

  while (cursor < end) {
    while (cursor < end && isAsciiWhitespace(html[cursor])) {
      cursor += 1;
    }
    if (cursor >= end || html[cursor] === '/' || html[cursor] === '>') {
      return null;
    }

    const nameStart = cursor;
    while (
      cursor < end &&
      !isAsciiWhitespace(html[cursor]) &&
      html[cursor] !== '=' &&
      html[cursor] !== '/' &&
      html[cursor] !== '>'
    ) {
      cursor += 1;
    }
    const name = html.slice(nameStart, cursor).toLowerCase();
    while (cursor < end && isAsciiWhitespace(html[cursor])) {
      cursor += 1;
    }
    if (html[cursor] !== '=') {
      continue;
    }
    cursor += 1;
    while (cursor < end && isAsciiWhitespace(html[cursor])) {
      cursor += 1;
    }
    const quote = html[cursor];
    if (quote !== '"' && quote !== "'") {
      while (cursor < end && !isAsciiWhitespace(html[cursor]) && html[cursor] !== '>') {
        cursor += 1;
      }
      continue;
    }
    cursor += 1;
    const valueStart = cursor;
    while (cursor < end && html[cursor] !== quote) {
      cursor += 1;
    }
    if (cursor >= end) {
      return null;
    }
    const value = html.slice(valueStart, cursor);
    cursor += 1;
    if (name === 'data-viewer-print-page-index') {
      return parseNonNegativeInteger(value);
    }
  }
  return null;
};

export const applyFileViewerPagePrintMasksToHtml = (
  contentHtml: string,
  mask?: FileViewerPrintMaskOptions | null
) => {
  const normalized = normalizeFileViewerPrintMaskOptions(mask);
  if (!normalized) {
    return contentHtml;
  }
  const regionsByPage = new Map<number, FileViewerPrintMaskRegion[]>();
  const stampsByPage = new Map<number, FileViewerPrintStamp[]>();
  normalized.regions?.forEach(region => {
    if (region.pageIndex === undefined) {
      return;
    }
    const pageRegions = regionsByPage.get(region.pageIndex) || [];
    pageRegions.push(region);
    regionsByPage.set(region.pageIndex, pageRegions);
  });
  normalized.stamps?.forEach(stamp => {
    if (stamp.pageIndex === undefined) {
      return;
    }
    const pageStamps = stampsByPage.get(stamp.pageIndex) || [];
    pageStamps.push(stamp);
    stampsByPage.set(stamp.pageIndex, pageStamps);
  });
  if (!regionsByPage.size && !stampsByPage.size) {
    return contentHtml;
  }

  const chunks: string[] = [];
  let copiedThrough = 0;
  let cursor = 0;
  while (cursor < contentHtml.length) {
    const start = contentHtml.indexOf('<', cursor);
    if (start < 0) {
      break;
    }
    if (!isAsciiLetter(contentHtml[start + 1] || '')) {
      cursor = start + 1;
      continue;
    }
    const end = findOpeningTagEnd(contentHtml, start);
    if (end < 0) {
      break;
    }
    const pageIndex = readPrintPageIndex(contentHtml, start, end);
    const pageRegions = pageIndex === null ? undefined : regionsByPage.get(pageIndex);
    const pageStamps = pageIndex === null ? undefined : stampsByPage.get(pageIndex);
    if (pageRegions?.length || pageStamps?.length) {
      chunks.push(
        contentHtml.slice(copiedThrough, end + 1),
        buildFileViewerPrintMaskOverlayHtml({
          regions: pageRegions || [],
          stamps: pageStamps || [],
          color: normalized.color,
        }, true)
      );
      copiedThrough = end + 1;
    }
    cursor = end + 1;
  }
  if (!chunks.length) {
    return contentHtml;
  }
  chunks.push(contentHtml.slice(copiedThrough));
  return chunks.join('');
};
