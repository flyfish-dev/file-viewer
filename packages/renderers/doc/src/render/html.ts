import { escapeHtml, slugify, twipsToPx } from '../core/utils.js';
import { HIGHLIGHT_COLORS } from '../msdoc/constants.js';
import { cssTextAlign, cssUnderline, cssVerticalAlign } from '../msdoc/properties.js';
import type {
  AttachmentAsset,
  AttachmentsBlock,
  BorderSpec,
  CharState,
  CssStyleObject,
  ImageAsset,
  InlineNode,
  MsDocParseResult,
  MsDocRenderOptions,
  MsDocRenderResult,
  ParagraphBlock,
  TableBlock,
  TableCellBlock,
  ShadingSpec,
  TextInlineNode,
} from '../types.js';

const COLOR_INDEX_MAP: Record<number, string> = {
  1: '#000000',
  2: '#0000ff',
  3: '#00ffff',
  4: '#00ff00',
  5: '#ff00ff',
  6: '#ff0000',
  7: '#ffff00',
  8: '#ffffff',
  9: '#000080',
  10: '#008080',
  11: '#008000',
  12: '#800080',
  13: '#800000',
  14: '#808000',
  15: '#808080',
  16: '#c0c0c0',
};

type ExternalLinkPolicy = NonNullable<MsDocRenderOptions['externalLinkPolicy']>;
type ExternalResourcePolicy = NonNullable<MsDocRenderOptions['externalResourcePolicy']>;

interface RenderContext {
  externalLinkPolicy: ExternalLinkPolicy;
  externalResourcePolicy: ExternalResourcePolicy;
}

function styleObjectToCss(style: CssStyleObject): string {
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}:${escapeHtml(value)}`)
    .join(';');
}

function quoteCssString(value: unknown): string {
  const escaped = String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/[\n\r\f]/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
  return `'${escaped}'`;
}

/**
 * Normalizes a document-provided hyperlink before it reaches generated HTML.
 * Internal bookmarks always remain available. External navigation is opt-in
 * and is still restricted to browser-safe schemes and relative paths.
 */
export function sanitizeMsDocLinkHref(
  href: string | undefined | null,
  policy: ExternalLinkPolicy = 'block',
): string | null {
  const value = String(href ?? '')
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
    .trim();
  if (!value) return null;
  if (value.startsWith('#')) return value;
  if (policy !== 'allow') return null;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('//') || value.includes('\\')) return null;
  if (/^(?:\/|\.\/|\.\.\/)/.test(value) && !value.startsWith('//')) {
    return value;
  }
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return value;
  return null;
}

function renderLink(content: string, href: string | null): string {
  if (!href) return content;
  const escapedHref = escapeHtml(href);
  if (href.startsWith('#')) return `<a class="msdoc-link" href="${escapedHref}">${content}</a>`;
  return `<a class="msdoc-link" href="${escapedHref}" target="_blank" rel="noreferrer noopener">${content}</a>`;
}

function borderToCss(border: BorderSpec | undefined | null): string | null {
  if (!border || border.nil) return null;
  const borderType = border.borderType as number | undefined;
  if (!borderType) return null;
  const lineWidth = Math.max(2, border.lineWidth || 0);
  const widthPoints = borderType >= 0x40 ? lineWidth : lineWidth / 8;
  const width = Math.max(1, Math.round(widthPoints * (96 / 72)));
  const style = borderType === 3
    ? 'double'
    : borderType === 6
      ? 'dotted'
      : [7, 8, 9].includes(borderType)
        ? 'dashed'
        : 'solid';
  const colorIndex = border.color as number | undefined;
  const color = border.colorRef != null
    ? colorRefToCss(border.colorRef)
    : COLOR_INDEX_MAP[colorIndex || 1] || '#000000';
  return `${width}px ${style} ${color}`;
}

function colorRefToCss(colorRef: number | undefined): string {
  if (colorRef == null || (colorRef >>> 24) === 0xff) return '#000000';
  const red = colorRef & 0xff;
  const green = (colorRef >>> 8) & 0xff;
  const blue = (colorRef >>> 16) & 0xff;
  return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

const SHADING_PERCENT: Record<number, number> = {
  2: 5, 3: 10, 4: 20, 5: 25, 6: 30, 7: 40,
  8: 50, 9: 60, 10: 70, 11: 75, 12: 80, 13: 90,
};

function mixHexColors(foreground: string, background: string, percent: number): string {
  const channel = (color: string, offset: number) => Number.parseInt(color.slice(offset, offset + 2), 16);
  const ratio = Math.max(0, Math.min(100, percent)) / 100;
  const values = [1, 3, 5].map(offset => Math.round(
    channel(foreground, offset) * ratio + channel(background, offset) * (1 - ratio)
  ));
  return `#${values.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function shadingToCss(shading: ShadingSpec | undefined): CssStyleObject {
  if (!shading || shading.nil || shading.auto || shading.pattern === 0) return {};
  const foreground = shading.foregroundColorRef != null
    ? colorRefToCss(shading.foregroundColorRef)
    : COLOR_INDEX_MAP[shading.foregroundColorIndex || 1] || '#000000';
  const background = shading.backgroundColorRef != null
    ? colorRefToCss(shading.backgroundColorRef)
    : COLOR_INDEX_MAP[shading.backgroundColorIndex || 8] || '#ffffff';
  if (shading.pattern === 1) return { 'background-color': foreground };
  if (SHADING_PERCENT[shading.pattern] != null) {
    return { 'background-color': mixHexColors(foreground, background, SHADING_PERCENT[shading.pattern]!) };
  }
  const stripe = shading.pattern === 14 || shading.pattern === 20
    ? `repeating-linear-gradient(0deg,${foreground} 0 1px,transparent 1px 4px)`
    : shading.pattern === 15 || shading.pattern === 21
      ? `repeating-linear-gradient(90deg,${foreground} 0 1px,transparent 1px 4px)`
      : shading.pattern === 16 || shading.pattern === 22
        ? `repeating-linear-gradient(45deg,${foreground} 0 1px,transparent 1px 5px)`
        : shading.pattern === 17 || shading.pattern === 23
          ? `repeating-linear-gradient(-45deg,${foreground} 0 1px,transparent 1px 5px)`
          : null;
  return stripe
    ? { 'background-color': background, 'background-image': stripe }
    : { 'background-color': background };
}

function paragraphStyleToCss(paraState: ParagraphBlock['paraState']): CssStyleObject {
  const style: CssStyleObject = {
    'text-align': cssTextAlign(paraState.alignment),
  };
  const marginTop = twipsToPx(paraState.spacingBefore);
  const marginBottom = twipsToPx(paraState.spacingAfter);
  const marginLeft = twipsToPx(paraState.leftIndent);
  const marginRight = twipsToPx(paraState.rightIndent);
  const textIndent = twipsToPx(paraState.firstLineIndent);
  if (marginTop) style['margin-top'] = `${marginTop}px`;
  if (marginBottom) style['margin-bottom'] = `${marginBottom}px`;
  if (marginLeft) style['margin-left'] = `${marginLeft}px`;
  if (marginRight) style['margin-right'] = `${marginRight}px`;
  if (textIndent) style['text-indent'] = `${textIndent}px`;
  if (paraState.lineSpacing) {
    const lineHeight = Math.abs(paraState.lineSpacing) / 240;
    if (lineHeight) style['line-height'] = String(Math.max(1, lineHeight));
  }
  if (paraState.keepLines) style['break-inside'] = 'avoid';
  if (paraState.keepNext) style['break-after'] = 'avoid';
  if (paraState.pageBreakBefore) style['break-before'] = 'page';
  if (paraState.rtlPara) style.direction = 'rtl';

  const top = borderToCss(paraState.borders?.top);
  const right = borderToCss(paraState.borders?.right);
  const bottom = borderToCss(paraState.borders?.bottom);
  const left = borderToCss(paraState.borders?.left);
  if (top) style['border-top'] = top;
  if (right) style['border-inline-end'] = right;
  if (bottom) style['border-bottom'] = bottom;
  if (left) style['border-inline-start'] = left;
  return style;
}

function buildUnderlineStyle(underline: number): CssStyleObject {
  const wordStyle = cssUnderline(underline);
  if (!underline || wordStyle === 'none') return {};
  const css: CssStyleObject = { 'text-decoration-line': 'underline' };
  if (wordStyle === 'double' || wordStyle === 'wavy-double') css['text-decoration-style'] = 'double';
  else if (wordStyle.includes('dot') || wordStyle === 'dotted-heavy') css['text-decoration-style'] = 'dotted';
  else if (wordStyle.includes('dash')) css['text-decoration-style'] = 'dashed';
  else if (wordStyle.includes('wave') || wordStyle.includes('wavy')) css['text-decoration-style'] = 'wavy';
  else css['text-decoration-style'] = 'solid';
  return css;
}

function inlineStyleToCss(styleState: CharState): CssStyleObject {
  const style: CssStyleObject = {};
  if (styleState.bold || styleState.boldBi) style['font-weight'] = '700';
  if (styleState.italic || styleState.italicBi) style['font-style'] = 'italic';
  if (styleState.strike || styleState.doubleStrike) style['text-decoration-line'] = `${style['text-decoration-line'] ? `${style['text-decoration-line']} ` : ''}line-through`;
  Object.assign(style, buildUnderlineStyle(styleState.underline));
  if (styleState.fontSizeHalfPoints) style['font-size'] = `${styleState.fontSizeHalfPoints / 2}pt`;
  if (styleState.fontFamily) style['font-family'] = `${quoteCssString(styleState.fontFamily)},sans-serif`;
  if (styleState.colorIndex && COLOR_INDEX_MAP[styleState.colorIndex]) style.color = COLOR_INDEX_MAP[styleState.colorIndex];
  const highlightIndex = typeof styleState.highlight === 'number' ? styleState.highlight : styleState.highlight?.index;
  if (highlightIndex && HIGHLIGHT_COLORS[highlightIndex as keyof typeof HIGHLIGHT_COLORS]) {
    style['background-color'] = HIGHLIGHT_COLORS[highlightIndex as keyof typeof HIGHLIGHT_COLORS];
  }
  if (styleState.smallCaps) style['font-variant-caps'] = 'small-caps';
  if (styleState.caps) style['text-transform'] = 'uppercase';
  if (styleState.scale && styleState.scale !== 100) {
    style.display = 'inline-block';
    style.transform = `scaleX(${styleState.scale / 100})`;
    style['transform-origin'] = 'left center';
  }
  if (styleState.positionHalfPoints > 0) style['vertical-align'] = 'super';
  if (styleState.positionHalfPoints < 0) style['vertical-align'] = 'sub';
  if (styleState.outline) style['text-shadow'] = '0 0 0.02em currentColor';
  if (styleState.shadow || styleState.emboss || styleState.imprint) {
    style['text-shadow'] = style['text-shadow'] ? `${style['text-shadow']}, 0.06em 0.06em 0.08em rgba(0,0,0,.25)` : '0.06em 0.06em 0.08em rgba(0,0,0,.25)';
  }
  if (styleState.rtl) style.direction = 'rtl';
  return style;
}

function renderTextNode(node: TextInlineNode, context: RenderContext): string {
  const content = escapeHtml(node.text);
  const inlineStyle = inlineStyleToCss(node.style);
  inlineStyle['white-space'] = 'break-spaces';
  const style = styleObjectToCss(inlineStyle);
  const inner = `<span${style ? ` style="${style}"` : ''}>${content}</span>`;
  return renderLink(inner, sanitizeMsDocLinkHref(node.href, context.externalLinkPolicy));
}

function inlineImageDisplaySizePx(asset: ImageAsset): { widthPx?: number; heightPx?: number } {
  const widthPx = twipsToPx(asset.meta?.displayWidthTwips);
  const heightPx = twipsToPx(asset.meta?.displayHeightTwips);
  return {
    widthPx: widthPx && widthPx > 0 ? widthPx : undefined,
    heightPx: heightPx && heightPx > 0 ? heightPx : undefined,
  };
}

function applyInlineImageDisplaySize(style: CssStyleObject, asset: ImageAsset): void {
  const { widthPx, heightPx } = inlineImageDisplaySizePx(asset);
  if (!widthPx && !heightPx) return;
  if (widthPx) style.width = `${widthPx}px`;
  if (heightPx) style.height = `${heightPx}px`;
}

const SAFE_RASTER_IMAGE_DATA_URL =
  /^data:image\/(?:avif|bmp|gif|jpeg|png|webp|x-icon);base64,[a-z\d+/=]+$/i;

function decodeBase64Text(value: string): string | null {
  try {
    const bufferCtor = (globalThis as {
      Buffer?: { from(value: string, encoding: string): { toString(encoding: string): string } };
    }).Buffer;
    if (bufferCtor) return bufferCtor.from(value, 'base64').toString('utf8');
    if (typeof atob !== 'function') return null;
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function isSafeSvgImageDataUrl(value: string): boolean {
  const match = /^data:image\/svg\+xml;base64,([a-z\d+/=]+)$/i.exec(value);
  if (!match || match[1].length > 8 * 1024 * 1024) return false;
  const svg = decodeBase64Text(match[1]);
  if (!svg || !/^\s*<svg(?:\s|>)/i.test(svg)) return false;
  if (/<\/?(?:script|style|foreignObject|iframe|object|embed|form|link)\b/i.test(svg)) return false;
  if (/<!\s*(?:doctype|entity)\b/i.test(svg) || /\son[a-z\d_-]+\s*=/i.test(svg)) return false;
  if (svg.includes('\\') || svg.includes('/*') || /@import\b/i.test(svg)) return false;
  if (/url\s*\(\s*(?!["']?#[A-Za-z0-9_.:-]+["']?\s*\))/i.test(svg)) return false;
  for (const resource of svg.matchAll(/\s(?:href|xlink:href|src)\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    const target = String(resource[2] || '').replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
    if (!/^#[A-Za-z0-9_.:-]+$/.test(target) && !SAFE_RASTER_IMAGE_DATA_URL.test(target)) return false;
  }
  return true;
}

function sanitizeImageSource(
  src: string | undefined | null,
  policy: ExternalResourcePolicy,
  allowGeneratedVector = false,
): string | null {
  const value = String(src || '').replace(/[\u0000-\u0020\u007f-\u009f]/g, '').trim();
  if (!value) return null;
  if (SAFE_RASTER_IMAGE_DATA_URL.test(value)) return value;
  if (allowGeneratedVector && isSafeSvgImageDataUrl(value)) return value;
  if (/^blob:/i.test(value)) return value;
  if (policy !== 'allow') return null;
  if (/^https?:/i.test(value)) return value;
  if (value.startsWith('//') || value.startsWith('\\')) return null;
  if (!/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith('\\')) return value;
  return null;
}

function sanitizeDownloadHref(href: string | undefined | null): string | null {
  const value = String(href ?? '').trim();
  if (!value) return null;
  const dataUrl = /^data:([^;,]+);base64,([a-z\d+/=\s]+)$/i.exec(value);
  if (!dataUrl) return null;
  const mimeType = dataUrl[1].trim().toLowerCase();
  if (/^(?:text\/(?:html|javascript)|application\/(?:javascript|xhtml\+xml|xml)|image\/svg\+xml)$/.test(mimeType)) {
    return null;
  }
  if (mimeType.endsWith('+xml')) return null;
  return value;
}

function sanitizeAssetHref(href: string | undefined | null, context: RenderContext): string | null {
  const downloadHref = sanitizeDownloadHref(href);
  if (downloadHref) return downloadHref;
  const value = sanitizeMsDocLinkHref(href, context.externalLinkPolicy);
  if (value && !value.startsWith('#')) return value;
  return null;
}

function renderImageNode(node: Extract<InlineNode, { type: 'image' }>, context: RenderContext): string {
  const allowGeneratedVector = node.asset.meta?.vectorConverted === true;
  const src = sanitizeImageSource(
    node.asset.sourceUrl,
    context.externalResourcePolicy,
    allowGeneratedVector,
  ) || sanitizeImageSource(
    node.asset.dataUrl,
    context.externalResourcePolicy,
    allowGeneratedVector,
  );
  const baseStyle = inlineStyleToCss(node.style);
  const displaySize = inlineImageDisplaySizePx(node.asset);
  if (displaySize.widthPx || displaySize.heightPx) {
    applyInlineImageDisplaySize(baseStyle, node.asset);
    baseStyle['max-width'] = 'none';
    if (!displaySize.heightPx) baseStyle.height = 'auto';
  } else {
    baseStyle['max-width'] = '100%';
    baseStyle.height = 'auto';
  }

  if (!src || node.asset.displayable === false) {
    const fallbackHref = sanitizeAssetHref(node.asset.dataUrl, context) || sanitizeAssetHref(node.asset.sourceUrl, context);
    const label = escapeHtml(String(node.asset.meta?.linkedPath || node.asset.mime || 'image'));
    const inner = fallbackHref
      ? `<a class="msdoc-attachment msdoc-image-fallback" href="${escapeHtml(fallbackHref)}" target="_blank" rel="noreferrer noopener">🖼 ${label}</a>`
      : `<span class="msdoc-image-fallback">🖼 ${label}</span>`;
    return renderLink(inner, sanitizeMsDocLinkHref(node.href, context.externalLinkPolicy));
  }

  const img = `<img class="msdoc-image" src="${escapeHtml(src)}" alt="" style="${styleObjectToCss(baseStyle)}">`;
  return renderLink(img, sanitizeMsDocLinkHref(node.href, context.externalLinkPolicy));
}

function renderAttachmentNode(node: Extract<InlineNode, { type: 'attachment' }>, context: RenderContext): string {
  const label = escapeHtml(node.asset.name || 'embedded-file');
  const downloadHref = sanitizeDownloadHref(node.asset.dataUrl);
  const inner = downloadHref
    ? `<a class="msdoc-attachment" href="${escapeHtml(downloadHref)}" download="${label}">📎 ${label}</a>`
    : `<span class="msdoc-attachment">📎 ${label}</span>`;
  const href = sanitizeMsDocLinkHref(node.href, context.externalLinkPolicy);
  return href ? `<span class="msdoc-inline-group">${inner}${renderLink('↗', href)}</span>` : inner;
}

function renderInlineNodes(nodes: InlineNode[], context: RenderContext): string {
  return nodes.map((node) => {
    if (node.type === 'text') return renderTextNode(node, context);
    if (node.type === 'image') return renderImageNode(node, context);
    if (node.type === 'attachment') return renderAttachmentNode(node, context);
    if (node.type === 'lineBreak') return '<br>';
    if (node.type === 'pageBreak') return '<span class="msdoc-page-break"></span>';
    return '';
  }).join('');
}

function renderParagraphBlock(block: ParagraphBlock, context: RenderContext, options: { inline?: boolean } = {}): string {
  const tag = options.inline ? 'div' : 'p';
  const style = styleObjectToCss(paragraphStyleToCss(block.paraState));
  const body = renderInlineNodes(block.inlines || [], context);
  const empty = body || '<br>';
  const classNames = ['msdoc-paragraph'];
  if (block.styleName) classNames.push(`msdoc-style-${slugify(block.styleName)}`);
  return `<${tag} class="${classNames.join(' ')}"${style ? ` style="${style}"` : ''}>${empty}</${tag}>`;
}

function cellStyle(cell: TableCellBlock): CssStyleObject {
  const style: CssStyleObject = {};
  const widthTwips = (cell.meta?.rightBoundary != null && cell.meta?.leftBoundary != null)
    ? cell.meta.rightBoundary - cell.meta.leftBoundary
    : cell.meta?.width;
  const widthPx = twipsToPx(widthTwips);
  if (widthPx) style.width = `${widthPx}px`;
  if (cell.meta?.noWrap) style['white-space'] = 'nowrap';
  if (cell.meta?.fitText) style['text-align'] = 'justify';
  if (cell.meta?.vertAlign != null) style['vertical-align'] = cssVerticalAlign(cell.meta.vertAlign);
  const borders = cell.meta?.borders || {};
  const borderAll = borderToCss(borders.all);
  const borderForSide = (side: string) => Object.prototype.hasOwnProperty.call(borders, side)
    ? borderToCss(borders[side])
    : borderAll;
  const top = borderForSide('top');
  const right = borderForSide('right');
  const bottom = borderForSide('bottom');
  const left = borderForSide('left');
  if (top) style['border-top'] = top;
  if (right) style['border-inline-end'] = right;
  if (bottom) style['border-bottom'] = bottom;
  if (left) style['border-inline-start'] = left;
  const padding = cell.meta?.paddingTwips;
  if (padding?.top != null) style['padding-top'] = `${twipsToPx(padding.top)}px`;
  if (padding?.right != null) style['padding-inline-end'] = `${twipsToPx(padding.right)}px`;
  if (padding?.bottom != null) style['padding-bottom'] = `${twipsToPx(padding.bottom)}px`;
  if (padding?.left != null) style['padding-inline-start'] = `${twipsToPx(padding.left)}px`;
  Object.assign(style, shadingToCss(cell.meta?.shading));
  return style;
}

function tableStyle(block: TableBlock): CssStyleObject {
  const style: CssStyleObject = {};
  const widthPx = twipsToPx(block.gridWidthTwips || block.state?.tableWidth?.wWidth);
  if (widthPx) style.width = `${widthPx}px`;
  else style.width = '100%';
  const marginLeft = twipsToPx(block.state?.leftIndent);
  if (marginLeft) style['margin-inline-start'] = `${marginLeft}px`;
  if (block.state?.rtl) style.direction = 'rtl';
  const spacing = block.rows.flatMap(row => row.cells).reduce((maximum, cell) => {
    const value = cell.meta?.spacingTwips;
    if (!value) return maximum;
    return {
      horizontal: Math.max(maximum.horizontal, value.left || 0, value.right || 0),
      vertical: Math.max(maximum.vertical, value.top || 0, value.bottom || 0),
    };
  }, { horizontal: 0, vertical: 0 });
  if (spacing.horizontal || spacing.vertical) {
    style['border-collapse'] = 'separate';
    style['border-spacing'] = `${twipsToPx(spacing.horizontal)}px ${twipsToPx(spacing.vertical)}px`;
  } else {
    style['border-collapse'] = 'collapse';
  }
  style['table-layout'] = 'fixed';
  return style;
}

function renderTableBlock(block: TableBlock, context: RenderContext): string {
  const rows = block.rows.map((row) => {
    const rowHeight = row.state?.rowHeight ? twipsToPx(Math.abs(row.state.rowHeight)) : null;
    const rowStyle = rowHeight ? ` style="height:${rowHeight}px"` : '';
    const cells = row.cells
      .filter((cell) => !cell.hidden)
      .map((cell) => {
        const attrs: string[] = [];
        if ((cell.colspan ?? 1) > 1) attrs.push(` colspan="${cell.colspan}"`);
        if ((cell.rowspan ?? 1) > 1) attrs.push(` rowspan="${cell.rowspan}"`);
        const style = styleObjectToCss(cellStyle(cell));
        const body = cell.paragraphs.map((paragraph) => renderParagraphBlock(paragraph, context, { inline: true })).join('');
        return `<td class="msdoc-cell"${attrs.join('')}${style ? ` style="${style}"` : ''}>${body || '<div class="msdoc-paragraph"><br></div>'}</td>`;
      })
      .join('');
    return `<tr class="msdoc-row"${rowStyle}>${cells}</tr>`;
  }).join('');

  return `<table class="msdoc-table msdoc-table-depth-${block.depth}" style="${styleObjectToCss(tableStyle(block))}"><tbody>${rows}</tbody></table>`;
}

function renderAttachmentsBlock(block: AttachmentsBlock): string {
  const items = block.items.map((item: AttachmentAsset) => {
    const label = escapeHtml(item.name || 'embedded-file');
    const downloadHref = sanitizeDownloadHref(item.dataUrl);
    const content = downloadHref
      ? `<a class="msdoc-attachment" href="${escapeHtml(downloadHref)}" download="${label}">📎 ${label}</a>`
      : `<span class="msdoc-attachment">📎 ${label}</span>`;
    return `<li>${content}</li>`;
  }).join('');
  return `<section class="msdoc-attachments"><div class="msdoc-attachments-title">Embedded attachments</div><ul>${items}</ul></section>`;
}

export function defaultMsDocCss(): string {
  return `
.msdoc-root{box-sizing:border-box;max-width:100%;padding:24px;background:#fff;color:#111;font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.msdoc-root *{box-sizing:border-box}
.msdoc-paragraph{margin:0 0 8px;white-space:normal;word-break:break-word;overflow-wrap:anywhere}
.msdoc-paragraph:last-child{margin-bottom:0}
.msdoc-table{margin:12px 0;border-collapse:collapse;border-spacing:0;max-width:100%}
.msdoc-cell{padding:6px 8px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}
.msdoc-link{color:#1a73e8;text-decoration:none}
.msdoc-link:hover{text-decoration:underline}
.msdoc-image{display:inline-block;vertical-align:middle}
.msdoc-image-fallback{display:inline-flex;align-items:center;gap:6px}
.msdoc-attachment{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #d0d7de;border-radius:6px;background:#f6f8fa;color:#0969da;text-decoration:none}
.msdoc-attachments{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb}
.msdoc-attachments-title{font-weight:600;margin-bottom:8px}
.msdoc-page-break{display:block;height:0;border-top:1px dashed #cbd5e1;margin:16px 0}
`;
}

/**
 * Converts the parsed AST into HTML and a companion CSS string.
 * Keeping rendering separate from parsing makes it easier for downstream apps
 * to customize styles or consume the AST directly.
 */
export function renderMsDoc(parsed: MsDocParseResult, options: MsDocRenderOptions = {}): MsDocRenderResult {
  const css = options.css ?? defaultMsDocCss();
  const context: RenderContext = {
    externalLinkPolicy: options.externalLinkPolicy ?? 'block',
    externalResourcePolicy: options.externalResourcePolicy ?? 'block',
  };
  const html = parsed.blocks.map((block) => {
    if (block.type === 'paragraph') return renderParagraphBlock(block, context);
    if (block.type === 'table') return renderTableBlock(block, context);
    if (block.type === 'attachments') return renderAttachmentsBlock(block);
    return '';
  }).join('');
  return {
    html,
    css,
    warnings: parsed.warnings || [],
    meta: parsed.meta,
    assets: parsed.assets || [],
    parsed,
  };
}
