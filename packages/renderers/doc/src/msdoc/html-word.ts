import { charPropsToState, paraPropsToState } from './properties.js';
import type { MsDocParseResult, ParagraphBlock } from '../types.js';

const HTML_PREFIX_RE = /^(?:<!doctype\s+html\b|<html\b|<body\b)/i;
const HTML_BREAK_TAGS = new Set(['br']);
const HTML_PARAGRAPH_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote', 'tr']);
const HTML_BLOCK_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote', 'tr', 'table']);
const HTML_CELL_TAGS = new Set(['td', 'th']);
const HTML_SKIPPED_CONTENT_TAGS = new Set(['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg']);

interface HtmlParagraphSource {
  text: string;
  attributes: string;
  content: string;
}

function asciiPreview(bytes: Uint8Array, length = 1024): string {
  return Array.from(bytes.subarray(0, Math.min(length, bytes.length)), byte =>
    byte === 0 ? '' : String.fromCharCode(byte),
  ).join('');
}

export function isHtmlWordDocumentStream(bytes: Uint8Array): boolean {
  const preview = asciiPreview(bytes)
    .replace(/^\uFEFF/, '')
    .trimStart();
  return HTML_PREFIX_RE.test(preview);
}

function decodeWith(bytes: Uint8Array, label: string, fatal = false): string | null {
  try {
    return new TextDecoder(label, { fatal }).decode(bytes);
  } catch {
    return null;
  }
}

function decodeHtmlWordDocument(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  const content = bytes.subarray(0, end);
  const preview = asciiPreview(content, 4096);
  const declared = /charset\s*=\s*["']?([a-z0-9._-]+)/i.exec(preview)?.[1]?.toLowerCase();
  const declaredEncoding = declared === 'gb2312' || declared === 'gbk' ? 'gb18030' : declared;
  if (declaredEncoding) {
    const decoded = decodeWith(content, declaredEncoding);
    if (decoded != null) return decoded;
  }
  const utf8 = decodeWith(content, 'utf-8', true);
  if (utf8 != null) return utf8;
  return decodeWith(content, 'gb18030') ?? decodeWith(content, 'utf-8') ?? '';
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: '\u00a0',
    quot: '"',
  };
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const parsed = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff) {
        try {
          return String.fromCodePoint(parsed);
        } catch {
          return match;
        }
      }
      return match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function findHtmlTagEnd(value: string, start: number): number {
  let quote = '';
  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index] || '';
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function readHtmlTag(value: string, start: number, end: number) {
  let cursor = start + 1;
  while (cursor < end && /\s/.test(value[cursor] || '')) cursor += 1;
  const closing = value[cursor] === '/';
  if (closing) cursor += 1;
  while (cursor < end && /\s/.test(value[cursor] || '')) cursor += 1;
  const nameStart = cursor;
  while (cursor < end && /[A-Za-z0-9]/.test(value[cursor] || '')) cursor += 1;
  return {
    closing,
    name: value.slice(nameStart, cursor).toLowerCase(),
    attributes: closing ? '' : value.slice(cursor, end),
    selfClosing: !closing && /\/\s*$/.test(value.slice(cursor, end)),
  };
}

function skipHtmlElementContent(value: string, lowerValue: string, tagName: string, start: number): number {
  const closingPrefix = `</${tagName}`;
  let cursor = start;
  while (cursor < value.length) {
    const closingStart = lowerValue.indexOf(closingPrefix, cursor);
    if (closingStart < 0) return value.length;
    const boundary = lowerValue[closingStart + closingPrefix.length] || '';
    if (boundary && !/[\s>]/.test(boundary)) {
      cursor = closingStart + closingPrefix.length;
      continue;
    }
    const closingEnd = findHtmlTagEnd(value, closingStart);
    return closingEnd < 0 ? value.length : closingEnd + 1;
  }
  return value.length;
}

function htmlFragmentToText(fragment: string): string {
  const chunks: string[] = [];
  const lowerFragment = fragment.toLowerCase();
  let cursor = 0;
  while (cursor < fragment.length) {
    const tagStart = fragment.indexOf('<', cursor);
    if (tagStart < 0) {
      chunks.push(fragment.slice(cursor));
      break;
    }
    chunks.push(fragment.slice(cursor, tagStart));
    if (fragment.startsWith('<!--', tagStart)) {
      const commentEnd = fragment.indexOf('-->', tagStart + 4);
      cursor = commentEnd < 0 ? fragment.length : commentEnd + 3;
      continue;
    }
    const tagEnd = findHtmlTagEnd(fragment, tagStart);
    if (tagEnd < 0) {
      chunks.push(fragment.slice(tagStart));
      break;
    }
    const tag = readHtmlTag(fragment, tagStart, tagEnd);
    if (!tag.closing && HTML_SKIPPED_CONTENT_TAGS.has(tag.name)) {
      cursor = skipHtmlElementContent(fragment, lowerFragment, tag.name, tagEnd + 1);
      continue;
    }
    if (HTML_BREAK_TAGS.has(tag.name) || (tag.closing && HTML_BLOCK_TAGS.has(tag.name))) {
      chunks.push('\n');
    } else if (HTML_CELL_TAGS.has(tag.name)) {
      chunks.push('\t');
    }
    cursor = tagEnd + 1;
  }
  return chunks.join('').replace(/\u0000/g, '');
}

function fragmentToText(fragment: string): string {
  return decodeEntities(htmlFragmentToText(fragment))
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function extractParagraphs(html: string): HtmlParagraphSource[] {
  const paragraphs: HtmlParagraphSource[] = [];
  const lowerHtml = html.toLowerCase();
  let active: {
    attributes: string;
    contentStart: number;
    name: string;
    sameNameDepth: number;
  } | null = null;
  let cursor = 0;

  const appendParagraph = (attributes: string, content: string) => {
    const text = fragmentToText(content);
    if (text) paragraphs.push({ text, attributes, content });
  };

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor);
    if (tagStart < 0) break;
    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4);
      cursor = commentEnd < 0 ? html.length : commentEnd + 3;
      continue;
    }
    const tagEnd = findHtmlTagEnd(html, tagStart);
    if (tagEnd < 0) break;
    const tag = readHtmlTag(html, tagStart, tagEnd);
    if (!tag.closing && HTML_SKIPPED_CONTENT_TAGS.has(tag.name)) {
      cursor = skipHtmlElementContent(html, lowerHtml, tag.name, tagEnd + 1);
      continue;
    }
    if (HTML_PARAGRAPH_TAGS.has(tag.name) && !tag.selfClosing) {
      if (!tag.closing) {
        if (!active) {
          active = {
            attributes: tag.attributes,
            contentStart: tagEnd + 1,
            name: tag.name,
            sameNameDepth: 0,
          };
        } else if (active.name === tag.name) {
          active.sameNameDepth += 1;
        }
      } else if (active?.name === tag.name) {
        if (active.sameNameDepth > 0) {
          active.sameNameDepth -= 1;
        } else {
          appendParagraph(active.attributes, html.slice(active.contentStart, tagStart));
          active = null;
        }
      }
    }
    cursor = tagEnd + 1;
  }

  // Malformed HTML saved by old Word versions is common. Preserve its visible
  // tail as a paragraph without restarting a regex search at every opening tag.
  if (active) {
    appendParagraph(active.attributes, html.slice(active.contentStart));
  }
  if (paragraphs.length) return paragraphs;
  const text = fragmentToText(html);
  return text ? [{ text, attributes: '', content: html }] : [];
}

function readStyle(attributes: string): string {
  return /\bstyle\s*=\s*(["'])([\s\S]*?)\1/i.exec(attributes)?.[2] || '';
}

function createParagraph(source: HtmlParagraphSource, index: number): ParagraphBlock {
  const paraState = paraPropsToState([]);
  const charState = charPropsToState([]);
  const style = readStyle(source.attributes);
  const alignment = /text-align\s*:\s*(center|right|justify)/i.exec(style)?.[1]?.toLowerCase();
  if (alignment === 'center') paraState.alignment = 1;
  if (alignment === 'right') paraState.alignment = 2;
  if (alignment === 'justify') paraState.alignment = 3;
  const indentPoints = Number.parseFloat(/text-indent\s*:\s*([\d.]+)pt/i.exec(style)?.[1] || '');
  if (Number.isFinite(indentPoints)) paraState.firstLineIndent = Math.round(indentPoints * 20);
  const fontSizePoints = Number.parseFloat(/font-size\s*:\s*([\d.]+)pt/i.exec(style)?.[1] || '');
  if (Number.isFinite(fontSizePoints)) {
    charState.fontSizeHalfPoints = Math.round(Math.min(96, Math.max(8, fontSizePoints)) * 2);
  }
  if (
    /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style) ||
    /<(?:b|strong)\b/i.test(source.content)
  ) {
    charState.bold = true;
  }
  if (/font-style\s*:\s*italic/i.test(style) || /<(?:i|em)\b/i.test(source.content)) {
    charState.italic = true;
  }

  const inlines = source.text
    .split('\n')
    .flatMap((line, lineIndex) => [
      ...(lineIndex ? [{ type: 'lineBreak' as const }] : []),
      ...(line ? [{ type: 'text' as const, text: line, style: { ...charState } }] : []),
    ]);
  return {
    type: 'paragraph',
    id: `html-word-paragraph-${index + 1}`,
    styleId: 0,
    styleName: 'Normal',
    paraState,
    inlines,
    text: source.text,
  };
}

export function parseHtmlWordDocumentStream(bytes: Uint8Array): MsDocParseResult | null {
  if (!isHtmlWordDocumentStream(bytes)) return null;
  const paragraphs = extractParagraphs(decodeHtmlWordDocument(bytes));
  if (!paragraphs.length) return null;
  const blocks = paragraphs.map(createParagraph);
  const textLength = paragraphs.reduce((total, paragraph) => total + paragraph.text.length, 0);
  return {
    kind: 'msdoc',
    version: 1,
    warnings: [
      {
        message: 'Recovered an HTML document stored inside the legacy WordDocument stream.',
        code: 'MSDOC_HTML_WORDDOCUMENT_RECOVERED',
      },
    ],
    meta: {
      fib: {
        wIdent: 0,
        nFib: 0,
        fWhichTblStm: 0,
        fComplex: false,
        fEncrypted: false,
        ccpText: textLength,
      },
      counts: {
        paragraphs: blocks.length,
        blocks: blocks.length,
        assets: 0,
        styles: 0,
        fonts: 0,
      },
    },
    fonts: [],
    styles: [],
    blocks,
    assets: [],
  };
}
