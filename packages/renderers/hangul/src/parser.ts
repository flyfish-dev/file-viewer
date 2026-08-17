import JSZip, { type JSZipObject } from 'jszip';
import { inflateRaw } from 'pako';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { parseHwp as parseStructuredHwp } from '@ssabrojs/hwpxjs';
import { DEFAULT_HANGUL_PARSE_LIMITS } from './limits.js';
import type {
  HangulDocument,
  HangulMedia,
  HangulMediaPlacement,
  HangulPageGeometry,
  HangulParseLimits,
  HangulSection,
  HangulTable,
  HangulTableCell,
} from './model.js';

export type {
  HangulDocument,
  HangulMedia,
  HangulMediaPlacement,
  HangulPageGeometry,
  HangulParseLimits,
  HangulSection,
  HangulTable,
  HangulTableCell,
};

export { DEFAULT_HANGUL_PARSE_LIMITS } from './limits.js';

type XmlParserFactory = () => Pick<DOMParser, 'parseFromString'>;

const HWP_CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;
const HWP_SIGNATURE = 'HWP Document File';
const HWP_TAG_PARA_TEXT = 67;
interface ZipEntryWithSizes extends JSZipObject {
  _data?: { compressedSize?: number; uncompressedSize?: number };
}

const toBytes = (buffer: ArrayBuffer) => new Uint8Array(buffer);
const isCfb = (bytes: Uint8Array) => HWP_CFB_MAGIC.every((value, index) => bytes[index] === value);
const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b;
const cloneBytes = (content: ArrayLike<number>) => Uint8Array.from(content);
const localName = (node: Node) => ((node as Node & { localName?: string }).localName || node.nodeName).split(':').pop()!.toLowerCase();
const elements = (node: Node, name?: string) => Array.from(node.childNodes)
  .filter((child): child is Element => child.nodeType === 1)
  .filter(child => !name || localName(child) === name);

const descendants = (node: Node, name: string) => {
  const result: Element[] = [];
  const visit = (current: Node) => elements(current).forEach(child => {
    if (localName(child) === name) result.push(child);
    visit(child);
  });
  visit(node);
  return result;
};

const hasAncestor = (node: Node, names: Set<string>) => {
  let parent = node.parentNode;
  while (parent) {
    if (parent.nodeType === 1 && names.has(localName(parent))) return true;
    parent = parent.parentNode;
  }
  return false;
};

const nearestAncestor = (node: Node, name: string) => {
  let parent = node.parentNode;
  while (parent) {
    if (parent.nodeType === 1 && localName(parent) === name) return parent;
    parent = parent.parentNode;
  }
  return undefined;
};

const text = (node?: Node | null) => (node?.textContent || '').replace(/[\t\r ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const inlineText = (node?: Node | null) => (node?.textContent || '').replace(/[\t\r\n ]+/g, ' ');
const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeCssValue = (value: string) => value.replace(/[;{}<>]/g, '').trim();
const positiveNumber = (value?: string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};
const hwpUnitToPx = (value: number) => value / 75;

const paragraphText = (paragraph: Element, excludedContainers: Set<string>) => {
  const values: string[] = [];
  const visit = (node: Node) => elements(node).forEach(child => {
    const name = localName(child);
    if (excludedContainers.has(name)) return;
    if (name === 't') {
      const value = inlineText(child);
      if (value) values.push(value);
      return;
    }
    visit(child);
  });
  visit(paragraph);
  return values.join('').replace(/\s+/g, ' ').trim();
};

const collectControlParagraphs = (document: Document, controlName: string) => descendants(document.documentElement, controlName)
  .flatMap(control => descendants(control, 'p'))
  .map(paragraph => paragraphText(paragraph, new Set(['tbl'])))
  .filter(Boolean);

interface HwpxStyleMaps {
  character: Map<string, string>;
  paragraph: Map<string, string>;
}

const parseHwpxStyleMaps = (document: Document): HwpxStyleMaps => {
  const character = new Map<string, string>();
  const paragraph = new Map<string, string>();
  descendants(document.documentElement, 'charpr').forEach(item => {
    const id = item.getAttribute('id');
    if (id == null) return;
    const declarations: string[] = [];
    const height = positiveNumber(item.getAttribute('height'));
    const color = item.getAttribute('textColor');
    const shade = item.getAttribute('shadeColor');
    if (height) declarations.push(`font-size:${Math.max(1, height / 100)}pt`);
    if (color && /^#[0-9a-f]{6}$/i.test(color)) declarations.push(`color:${color}`);
    if (shade && /^#[0-9a-f]{6}$/i.test(shade)) declarations.push(`background-color:${shade}`);
    if (descendants(item, 'bold').length) declarations.push('font-weight:700');
    if (descendants(item, 'italic').length) declarations.push('font-style:italic');
    const underline = descendants(item, 'underline')[0];
    const strikeout = descendants(item, 'strikeout')[0];
    const decorations: string[] = [];
    if (underline && underline.getAttribute('type')?.toUpperCase() !== 'NONE') decorations.push('underline');
    if (strikeout && strikeout.getAttribute('shape')?.toUpperCase() !== 'NONE') decorations.push('line-through');
    if (decorations.length) declarations.push(`text-decoration:${decorations.join(' ')}`);
    character.set(id, declarations.join(';'));
  });
  descendants(document.documentElement, 'parapr').forEach(item => {
    const id = item.getAttribute('id');
    if (id == null) return;
    const declarations: string[] = [];
    const align = descendants(item, 'align')[0]?.getAttribute('horizontal')?.toLowerCase();
    if (align && ['left', 'right', 'center', 'justify'].includes(align)) declarations.push(`text-align:${align}`);
    const margin = descendants(item, 'margin')[0];
    const marginValue = (name: string) => positiveNumber(descendants(margin || item, name)[0]?.getAttribute('value'));
    const left = marginValue('left');
    const right = marginValue('right');
    const indent = marginValue('indent');
    const previous = marginValue('prev');
    const next = marginValue('next');
    if (left) declarations.push(`margin-left:${hwpUnitToPx(left)}px`);
    if (right) declarations.push(`margin-right:${hwpUnitToPx(right)}px`);
    if (indent) declarations.push(`text-indent:${hwpUnitToPx(indent)}px`);
    if (previous) declarations.push(`margin-top:${hwpUnitToPx(previous)}px`);
    if (next) declarations.push(`margin-bottom:${hwpUnitToPx(next)}px`);
    paragraph.set(id, declarations.join(';'));
  });
  return { character, paragraph };
};

const createHwpxParagraphHtml = (paragraph: Element, styles: HwpxStyleMaps) => {
  const runs = elements(paragraph, 'run').map(run => {
    const value = elements(run, 't').map(inlineText).filter(Boolean).join('');
    if (!value) return '';
    const css = styles.character.get(run.getAttribute('charPrIDRef') || '') || '';
    return `<span${css ? ` style="${escapeHtml(css)}"` : ''}>${escapeHtml(value)}</span>`;
  }).filter(Boolean);
  if (!runs.length) return '';
  const css = styles.paragraph.get(paragraph.getAttribute('paraPrIDRef') || '') || '';
  return `<p${css ? ` style="${escapeHtml(css)}"` : ''}>${runs.join('')}</p>`;
};

const tableFromXml = (table: Element): HangulTable => {
  const size = descendants(table, 'sz')[0];
  const tableRows = descendants(table, 'tr').filter(row => nearestAncestor(row, 'tbl') === table);
  const cells = tableRows.map(row => descendants(row, 'tc')
    .filter(cell => nearestAncestor(cell, 'tr') === row)
    .map(cell => {
      const span = descendants(cell, 'cellspan')[0];
      const cellSize = descendants(cell, 'cellsz')[0];
      const cellMargin = descendants(cell, 'cellmargin')[0];
      const marginValue = (name: string) => hwpUnitToPx(positiveNumber(cellMargin?.getAttribute(name)) || 0);
      return {
        text: descendants(cell, 't').map(inlineText).filter(Boolean).join('').replace(/\s+/g, ' ').trim(),
        colSpan: positiveNumber(span?.getAttribute('colSpan')) || 1,
        rowSpan: positiveNumber(span?.getAttribute('rowSpan')) || 1,
        widthPx: positiveNumber(cellSize?.getAttribute('width')) != null
          ? hwpUnitToPx(positiveNumber(cellSize?.getAttribute('width')) || 0)
          : undefined,
        heightPx: positiveNumber(cellSize?.getAttribute('height')) != null
          ? hwpUnitToPx(positiveNumber(cellSize?.getAttribute('height')) || 0)
          : undefined,
        padding: cellMargin ? {
          topPx: marginValue('top'),
          rightPx: marginValue('right'),
          bottomPx: marginValue('bottom'),
          leftPx: marginValue('left'),
        } : undefined,
      };
    }));
  return {
    rows: cells.map(row => row.map(cell => cell.text)),
    cells,
    widthPx: positiveNumber(size?.getAttribute('width')) != null
      ? hwpUnitToPx(positiveNumber(size?.getAttribute('width')) || 0)
      : undefined,
    heightPx: positiveNumber(size?.getAttribute('height')) != null
      ? hwpUnitToPx(positiveNumber(size?.getAttribute('height')) || 0)
      : undefined,
  };
};

const mediaPlacementsFromXml = (document: Document): HangulMediaPlacement[] => descendants(document.documentElement, 'pic')
  .flatMap(picture => {
    const image = descendants(picture, 'img')[0];
    const mediaId = image?.getAttribute('binaryItemIDRef')?.trim();
    if (!mediaId) return [];
    const size = descendants(picture, 'cursz')[0] || descendants(picture, 'sz')[0];
    const position = descendants(picture, 'pos').find(item => item.hasAttribute('treatAsChar'));
    const shapeComment = text(descendants(picture, 'shapecomment')[0]);
    const width = positiveNumber(size?.getAttribute('width'));
    const height = positiveNumber(size?.getAttribute('height'));
    const x = positiveNumber(position?.getAttribute('horzOffset'));
    const y = positiveNumber(position?.getAttribute('vertOffset'));
    const pagePositioned = position?.getAttribute('treatAsChar') !== '1' &&
      ['paper', 'page'].includes(position?.getAttribute('horzRelTo')?.toLowerCase() || '') &&
      ['paper', 'page'].includes(position?.getAttribute('vertRelTo')?.toLowerCase() || '');
    return [{
      mediaId,
      alt: shapeComment || undefined,
      widthPx: width != null ? hwpUnitToPx(width) : undefined,
      heightPx: height != null ? hwpUnitToPx(height) : undefined,
      xPx: pagePositioned && x != null ? hwpUnitToPx(x) : undefined,
      yPx: pagePositioned && y != null ? hwpUnitToPx(y) : undefined,
      position: pagePositioned ? 'page' : 'flow',
    } satisfies HangulMediaPlacement];
  });

const pageGeometryFromXml = (document: Document): HangulPageGeometry | undefined => {
  const page = descendants(document.documentElement, 'pagepr')[0];
  const width = positiveNumber(page?.getAttribute('width'));
  const height = positiveNumber(page?.getAttribute('height'));
  if (!width || !height) return undefined;
  const margin = descendants(page, 'margin')[0];
  const marginValue = (name: string) => hwpUnitToPx(positiveNumber(margin?.getAttribute(name)) || 0);
  return {
    widthPx: hwpUnitToPx(width),
    heightPx: hwpUnitToPx(height),
    margins: {
      topPx: marginValue('top'),
      rightPx: marginValue('right'),
      bottomPx: marginValue('bottom'),
      leftPx: marginValue('left'),
    },
  };
};

const mimeFromName = (name: string) => {
  const extension = name.split('.').pop()?.toLowerCase();
  return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml' } as Record<string, string>)[extension || ''] || 'application/octet-stream';
};

const normalizeLimits = (overrides: Partial<HangulParseLimits> = {}): HangulParseLimits => ({
  maxUncompressedBytes: Math.max(1, overrides.maxUncompressedBytes ?? DEFAULT_HANGUL_PARSE_LIMITS.maxUncompressedBytes),
  maxCompressionRatio: Math.max(1, overrides.maxCompressionRatio ?? DEFAULT_HANGUL_PARSE_LIMITS.maxCompressionRatio),
  maxEntries: Math.max(1, overrides.maxEntries ?? DEFAULT_HANGUL_PARSE_LIMITS.maxEntries),
  maxRecords: Math.max(1, overrides.maxRecords ?? DEFAULT_HANGUL_PARSE_LIMITS.maxRecords),
});

const parseHwpx = async (
  buffer: ArrayBuffer,
  createParser: XmlParserFactory,
  limits: HangulParseLimits
): Promise<HangulDocument> => {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files) as ZipEntryWithSizes[];
  if (entries.length > limits.maxEntries) throw new Error(`HWPX contains too many ZIP entries (${entries.length}).`);
  let totalUncompressedBytes = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    const compressedSize = Number(entry._data?.compressedSize || 0);
    const uncompressedSize = Number(entry._data?.uncompressedSize || 0);
    totalUncompressedBytes += uncompressedSize;
    if (uncompressedSize > limits.maxUncompressedBytes || totalUncompressedBytes > limits.maxUncompressedBytes) {
      throw new Error('HWPX uncompressed data exceeds the configured safe limit.');
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxCompressionRatio) {
      throw new Error(`HWPX ZIP entry exceeds the configured compression ratio: ${entry.name}`);
    }
  }
  if (zip.file('EncryptionInfo') || zip.file('EncryptedPackage')) {
    throw new Error('Encrypted HWPX documents are detected but cannot be decrypted.');
  }
  const sectionEntries = entries
    .filter(entry => !entry.dir && /(?:^|\/)section\d+\.xml$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!sectionEntries.length) throw new Error('HWPX section XML was not found.');

  const headerEntry = zip.file(/(?:^|\/)header\.xml$/i)[0];
  let styleMaps: HwpxStyleMaps = { character: new Map(), paragraph: new Map() };
  if (headerEntry) {
    const headerXml = await headerEntry.async('text');
    const headerDocument = createParser().parseFromString(headerXml, 'application/xml');
    if (!headerDocument.getElementsByTagName('parsererror').length) styleMaps = parseHwpxStyleMaps(headerDocument);
  }

  const sections: HangulSection[] = [];
  for (const [index, entry] of sectionEntries.entries()) {
    const xml = await entry.async('text');
    const document = createParser().parseFromString(xml, 'application/xml');
    if (document.getElementsByTagName('parsererror').length) throw new Error(`Malformed HWPX XML: ${entry.name}`);
    const excludedBodyAncestors = new Set(['tc', 'header', 'footer', 'footnote', 'endnote']);
    const excludedInlineContainers = new Set(['tbl', 'header', 'footer', 'footnote', 'endnote']);
    const bodyParagraphElements = descendants(document.documentElement, 'p')
      .filter(paragraph => !hasAncestor(paragraph, excludedBodyAncestors));
    const paragraphs = bodyParagraphElements
      .map(paragraph => paragraphText(paragraph, excludedInlineContainers))
      .filter(Boolean);
    const tables = descendants(document.documentElement, 'tbl')
      .filter(table => !nearestAncestor(table, 'tbl'))
      .map(tableFromXml)
      .filter(table => table.rows.length);
    const html = bodyParagraphElements.map(paragraph => createHwpxParagraphHtml(paragraph, styleMaps)).filter(Boolean).join('');
    sections.push({
      id: entry.name || `section-${index + 1}`,
      paragraphs,
      tables,
      html: html || undefined,
      headers: collectControlParagraphs(document, 'header'),
      footers: collectControlParagraphs(document, 'footer'),
      notes: [...collectControlParagraphs(document, 'footnote'), ...collectControlParagraphs(document, 'endnote')],
      page: pageGeometryFromXml(document),
      placedMedia: mediaPlacementsFromXml(document),
    });
  }

  const media: HangulMedia[] = [];
  for (const entry of entries.filter(item => !item.dir && /(?:^|\/)bindata\//i.test(item.name))) {
    const bytes = await entry.async('uint8array');
    media.push({ id: entry.name, mimeType: mimeFromName(entry.name), bytes });
  }
  return {
    format: 'hwpx',
    sections,
    media,
    warnings: ['HWPX is rendered as a static structured preview; charts, OLE objects and advanced drawing effects remain limited.'],
  };
};

const decodeHwpTextRecord = (bytes: Uint8Array) => {
  const evenLength = bytes.length - (bytes.length % 2);
  const decoded = new TextDecoder('utf-16le').decode(bytes.slice(0, evenLength));
  return decoded
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .trim();
};

const parseHwpRecords = (bytes: Uint8Array, maxRecords: number) => {
  const paragraphs: string[] = [];
  let offset = 0;
  let recordCount = 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 4 <= bytes.length && recordCount < maxRecords) {
    const header = view.getUint32(offset, true);
    offset += 4;
    const tag = header & 0x3ff;
    let size = header >>> 20;
    if (size === 0xfff) {
      if (offset + 4 > bytes.length) break;
      size = view.getUint32(offset, true);
      offset += 4;
    }
    if (size > bytes.length - offset) break;
    if (tag === HWP_TAG_PARA_TEXT) {
      const value = decodeHwpTextRecord(bytes.slice(offset, offset + size));
      if (value) paragraphs.push(value);
    }
    offset += size;
    recordCount += 1;
  }
  return paragraphs;
};

type StructuredHwpDocument = ReturnType<typeof parseStructuredHwp>;
type StructuredHwpParagraph = StructuredHwpDocument['sections'][number]['paragraphs'][number];
type StructuredHwpTable = Extract<StructuredHwpParagraph['controls'][number], { kind: 'table' }>;

const colorFromHwp = (value: number | undefined) => {
  if (value == null || !Number.isFinite(value) || value === 0xffffffff) return undefined;
  const red = value & 0xff;
  const green = (value >>> 8) & 0xff;
  const blue = (value >>> 16) & 0xff;
  return `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};

const structuredHwpParagraphHtml = (paragraph: StructuredHwpParagraph, document: StructuredHwpDocument) => {
  const paraShape = document.docInfo.paraShapes[paragraph.paraShapeId];
  const paragraphCss: string[] = [];
  if (paraShape) {
    if (['left', 'right', 'center', 'justify'].includes(paraShape.alignment)) paragraphCss.push(`text-align:${paraShape.alignment}`);
    if (paraShape.leftMargin) paragraphCss.push(`margin-left:${hwpUnitToPx(paraShape.leftMargin)}px`);
    if (paraShape.rightMargin) paragraphCss.push(`margin-right:${hwpUnitToPx(paraShape.rightMargin)}px`);
    if (paraShape.indent) paragraphCss.push(`text-indent:${hwpUnitToPx(paraShape.indent)}px`);
    if (paraShape.prevSpacing) paragraphCss.push(`margin-top:${hwpUnitToPx(paraShape.prevSpacing)}px`);
    if (paraShape.nextSpacing) paragraphCss.push(`margin-bottom:${hwpUnitToPx(paraShape.nextSpacing)}px`);
  }
  const runs = paragraph.runs.map(run => {
    if (!run.text) return '';
    const shape = document.docInfo.charShapes[run.charShapeId];
    const css: string[] = [];
    if (shape) {
      if (shape.baseSize) css.push(`font-size:${Math.max(1, shape.baseSize / 100)}pt`);
      const color = colorFromHwp(shape.textColor);
      const background = colorFromHwp(shape.shadeColor);
      if (color) css.push(`color:${color}`);
      if (background && background !== '#ffffff') css.push(`background-color:${background}`);
      if (shape.bold) css.push('font-weight:700');
      if (shape.italic) css.push('font-style:italic');
      const decoration = [shape.underline ? 'underline' : '', shape.strikeout ? 'line-through' : ''].filter(Boolean);
      if (decoration.length) css.push(`text-decoration:${decoration.join(' ')}`);
      const hangulFace = document.docInfo.fontFaces[0]?.[shape.faceNameIds.hangul]?.name;
      const latinFace = document.docInfo.fontFaces[1]?.[shape.faceNameIds.latin]?.name;
      const face = hangulFace || latinFace;
      if (face) css.push(`font-family:'${safeCssValue(face).replace(/'/g, '')}'`);
    }
    return `<span${css.length ? ` style="${escapeHtml(css.join(';'))}"` : ''}>${escapeHtml(run.text)}</span>`;
  }).filter(Boolean).join('');
  if (!runs) return '';
  return `<p${paragraphCss.length ? ` style="${escapeHtml(paragraphCss.join(';'))}"` : ''}>${runs}</p>`;
};

const structuredHwpTable = (table: StructuredHwpTable): HangulTable => {
  const cells = Array.from({ length: table.rowCount }, (_, row) => table.cells
    .filter(cell => cell.row === row)
    .sort((a, b) => a.col - b.col)
    .map(cell => ({
      text: cell.paragraphs.map(paragraph => paragraph.text).filter(Boolean).join('\n'),
      colSpan: Math.max(1, cell.colSpan || 1),
      rowSpan: Math.max(1, cell.rowSpan || 1),
    })));
  return { rows: cells.map(row => row.map(cell => cell.text)), cells };
};

const structuredControlParagraphs = (
  paragraphs: StructuredHwpParagraph[],
  kind: 'header' | 'footer' | 'footnote'
) => paragraphs.flatMap(paragraph => paragraph.controls
  .flatMap(control => control.kind === kind
    ? control.paragraphs.map(item => item.text).filter(Boolean)
    : []));

const structuredMediaPlacements = (paragraphs: StructuredHwpParagraph[]): HangulMediaPlacement[] => {
  return paragraphs.flatMap(paragraph => paragraph.controls.flatMap(control => control.kind === 'picture'
    ? [{ mediaId: `BinData/${control.binDataId}`, position: 'flow' as const }]
    : []));
};

const parseHwp = async (buffer: ArrayBuffer, limits: HangulParseLimits): Promise<HangulDocument> => {
  if (buffer.byteLength > limits.maxUncompressedBytes) throw new Error('HWP container exceeds the configured safe limit.');
  const CFB = await import('cfb');
  const container = CFB.parse(toBytes(buffer), { type: 'array' });
  const find = (path: string) => CFB.find(container, path) || CFB.find(container, `Root Entry/${path}`);
  const headerEntry = find('FileHeader');
  if (!headerEntry?.content) throw new Error('HWP FileHeader stream was not found.');
  const header = cloneBytes(headerEntry.content);
  const signature = new TextDecoder('ascii').decode(header.slice(0, 32)).replace(/\0+$/, '');
  if (!signature.startsWith(HWP_SIGNATURE)) throw new Error('The CFB file is not an HWP v5 document.');
  const flags = header.length >= 40 ? new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(36, true) : 0;
  if (flags & 0x02) throw new Error('Encrypted HWP documents are detected but cannot be decrypted.');
  if (flags & 0x04) throw new Error('Distribution HWP documents are detected but are not decrypted.');
  const compressed = (flags & 0x01) !== 0;
  const version = header.length >= 36 ? Array.from(header.slice(32, 36)).reverse().join('.') : undefined;

  const sections: HangulSection[] = [];
  const sectionEntries = container.FileIndex
    .map((entry, index) => ({ entry, path: container.FullPaths[index] || entry.name }))
    .filter(item => /(?:^|\/)BodyText\/Section\d+$/i.test(item.path) && item.entry.content)
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  for (const item of sectionEntries) {
    const raw = cloneBytes(item.entry.content);
    if (raw.length > limits.maxUncompressedBytes) throw new Error(`HWP stream exceeds the safe limit: ${item.path}`);
    let decoded = raw;
    if (compressed) {
      try { decoded = inflateRaw(raw); } catch { throw new Error(`HWP compressed stream is malformed: ${item.path}`); }
    }
    if (decoded.length > limits.maxUncompressedBytes) throw new Error(`HWP decompressed stream exceeds the safe limit: ${item.path}`);
    sections.push({ id: item.path, paragraphs: parseHwpRecords(decoded, limits.maxRecords), tables: [] });
  }
  if (!sections.some(section => section.paragraphs.length)) {
    const preview = find('PrvText');
    if (preview?.content) sections.push({ id: 'PrvText', paragraphs: [decodeHwpTextRecord(cloneBytes(preview.content))].filter(Boolean), tables: [] });
  }

  const mediaByPath = new Map<string, HangulMedia>();
  container.FileIndex
    .map((entry, index) => ({ entry, path: container.FullPaths[index] || entry.name }))
    .filter(item => item.entry.type === 2 && item.entry.size > 0 && /(?:^|\/)BinData\//i.test(item.path) && item.entry.content)
    .forEach(item => mediaByPath.set(item.path.toLowerCase(), { id: item.path, mimeType: mimeFromName(item.path), bytes: cloneBytes(item.entry.content) }));
  const media = [...mediaByPath.values()];
  const warnings = compressed ? ['BodyText streams were decompressed in the browser.'] : [];
  try {
    const structured = parseStructuredHwp(toBytes(buffer));
    sections.splice(0, sections.length, ...structured.sections.map((section, index) => ({
      id: `BodyText/Section${index}`,
      paragraphs: section.paragraphs.map(paragraph => paragraph.text).filter(Boolean),
      tables: section.paragraphs.flatMap(paragraph => paragraph.controls
        .filter(control => control.kind === 'table')
        .map(table => structuredHwpTable(table))),
      html: section.paragraphs.map(paragraph => structuredHwpParagraphHtml(paragraph, structured)).filter(Boolean).join('') || undefined,
      headers: structuredControlParagraphs(section.paragraphs, 'header'),
      footers: structuredControlParagraphs(section.paragraphs, 'footer'),
      notes: structuredControlParagraphs(section.paragraphs, 'footnote'),
      placedMedia: structuredMediaPlacements(section.paragraphs),
    })));
    media.splice(0, media.length, ...[...structured.binData.entries()].map(([id, item]) => ({
      id: `BinData/${id}.${item.extension}`,
      mimeType: mimeFromName(`file.${item.extension}`),
      bytes: item.data,
    })));
    warnings.push('Parsed HWP v5 structure, tables, inline styles and embedded binary data with the MIT-licensed structured parser.');
  } catch (error) {
    warnings.push(`Structured HWP parser was unavailable for this document: ${error instanceof Error ? error.message : String(error)}. Used the bounded record fallback.`);
  }
  return { format: 'hwp', version, sections, media, warnings };
};

export const parseHangulDocument = async (
  buffer: ArrayBuffer,
  type?: string,
  createParser: XmlParserFactory = () => new XmlDomParser() as unknown as DOMParser,
  limitOverrides: Partial<HangulParseLimits> = {}
) => {
  const bytes = toBytes(buffer);
  const normalized = (type || '').toLowerCase();
  const limits = normalizeLimits(limitOverrides);
  if (isZip(bytes)) return parseHwpx(buffer, createParser, limits);
  if (isCfb(bytes)) return parseHwp(buffer, limits);
  throw new Error(`The ${normalized || 'Hangul'} extension does not match an HWP/HWPX container.`);
};
