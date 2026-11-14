export interface PrintPageSize {
  width: number;
  height: number;
}

export interface ApplyPrintPageSizeOptions {
  heightMode?: 'fixed' | 'min';
}

export interface BuildPrintPageStyleOptions extends PrintPageSize {
  selector: string;
  /** Per-page CSS pixel sizes, matched by data-viewer-print-page-index (fixed layout only). */
  pages?: readonly PrintPageSize[];
  heightMode?: 'fixed' | 'min';
}

const CSS_PIXELS_PER_INCH = 96;

const normalizeCssPixels = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Number(value.toFixed(3));
};

export const formatCssPixels = (value: number) => `${normalizeCssPixels(value)}px`;

const formatCssInches = (value: number) => `${Number((normalizeCssPixels(value) / CSS_PIXELS_PER_INCH).toFixed(4))}in`;

const readPositiveCssNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Browser print helper. DOM measurement belongs in the core browser layer
 * because it depends on CSS layout and HTMLElement.
 */
export const getElementPrintPageSize = (
  element: HTMLElement,
  fallback: Partial<PrintPageSize> = {}
): PrintPageSize => {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const horizontal = style && style.boxSizing !== 'border-box'
    ? ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
      .reduce((sum, key) => sum + readPositiveCssNumber(style[key as keyof CSSStyleDeclaration] as string), 0)
    : 0;
  const vertical = style && style.boxSizing !== 'border-box'
    ? ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
      .reduce((sum, key) => sum + readPositiveCssNumber(style[key as keyof CSSStyleDeclaration] as string), 0)
    : 0;
  const cssWidth = readPositiveCssNumber(style?.width || '');
  const cssHeight = readPositiveCssNumber(style?.height || '') || readPositiveCssNumber(style?.minHeight || '');
  const width = (cssWidth ? cssWidth + horizontal : 0) ||
    element.offsetWidth ||
    fallback.width ||
    element.getBoundingClientRect().width;
  const height = (cssHeight ? cssHeight + vertical : 0) ||
    element.offsetHeight ||
    fallback.height ||
    element.getBoundingClientRect().height;

  return {
    width: normalizeCssPixels(width),
    height: normalizeCssPixels(height),
  };
};

export const applyPrintPageSize = (
  element: HTMLElement,
  size: PrintPageSize,
  options: ApplyPrintPageSizeOptions = {}
) => {
  const width = formatCssPixels(size.width);
  const height = formatCssPixels(size.height);
  const heightMode = options.heightMode || 'fixed';

  element.classList.add('viewer-print-page');
  element.style.setProperty('--viewer-print-page-width', width);
  element.style.setProperty('--viewer-print-page-height', height);
  element.style.width = width;
  element.style.maxWidth = 'none';
  element.style.minHeight = height;

  if (heightMode === 'fixed') {
    element.style.height = height;
    element.style.overflow = 'hidden';
  } else {
    element.style.height = 'auto';
    element.style.overflow = 'visible';
  }
};

export const buildPrintPageStyle = ({
  selector,
  width,
  height,
  heightMode = 'fixed',
  pages,
}: BuildPrintPageStyleOptions) => {
  const pageWidth = formatCssPixels(width);
  const pageHeight = formatCssPixels(height);
  const heightRule = heightMode === 'fixed'
    ? `height:${pageHeight}!important;min-height:${pageHeight}!important;overflow:hidden!important;`
    : `height:auto!important;min-height:${pageHeight}!important;overflow:visible!important;`;

  const mixedPages = heightMode === 'fixed' && pages && pages.length > 1 &&
    pages.every(page => Number.isFinite(page.width) && page.width > 0 && Number.isFinite(page.height) && page.height > 0) &&
    pages.some(page => normalizeCssPixels(page.width) !== normalizeCssPixels(width) || normalizeCssPixels(page.height) !== normalizeCssPixels(height))
    ? pages : [];

  const namedPages = mixedPages.map((page, index) => {
    const name = `file-viewer-print-page-${index}`;
    const w = formatCssPixels(page.width), h = formatCssPixels(page.height);
    return `
      @page ${name} { size: ${w} ${h}; margin: 0; }
      @media print {
        ${selector}[data-viewer-print-page-index="${index}"] {
          page: ${name}; width: ${w}!important; height: ${h}!important; min-height: ${h}!important;
        }
      }
    `;
  }).join('');

  return `
    @page { size: ${formatCssInches(width)} ${formatCssInches(height)}; margin: 0; }
    @media print {
      html, body {
        width: ${pageWidth};
        min-width: ${pageWidth};
        margin: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
        background: #ffffff !important;
      }
      .viewer-export-shell,
      .viewer-export-content {
        width: ${pageWidth} !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      ${selector} {
        width: ${pageWidth}!important;
        max-width: none!important;
        ${heightRule}
        margin: 0!important;
        box-shadow: none!important;
        border: 0!important;
        break-after: page;
        page-break-after: always;
      }
      ${selector}:last-child {
        break-after: auto;
        page-break-after: auto;
      }
    }
    ${namedPages}
    ${mixedPages.length ? `@media print {
      html, body, .viewer-export-shell, .viewer-export-content {
        width: auto!important; min-width: 0!important; max-width: none!important;
      }
    }` : ''}
  `;
};
