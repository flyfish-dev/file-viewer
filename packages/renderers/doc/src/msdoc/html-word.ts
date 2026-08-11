import { charPropsToState, paraPropsToState } from './properties.js';
import type { MsDocParseResult, ParagraphBlock } from '../types.js';

const HTML_PREFIX_RE = /^(?:<!doctype\s+html\b|<html\b|<body\b)/i;
const BLOCK_RE = /<(div|p|h[1-6]|li|pre|blockquote|tr)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
const UNSAFE_CONTENT_RE =
  /<(script|style|noscript|iframe|object|embed|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

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

function fragmentToText(fragment: string): string {
  return decodeEntities(
    fragment
      .replace(UNSAFE_CONTENT_RE, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|p|h[1-6]|li|pre|blockquote|tr|table)>/gi, '\n')
      .replace(/<\/?(?:td|th)\b[^>]*>/gi, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/\u0000/g, ''),
  )
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function extractParagraphs(html: string): HtmlParagraphSource[] {
  const safe = html.replace(UNSAFE_CONTENT_RE, '').replace(/<!--[\s\S]*?-->/g, '');
  const paragraphs: HtmlParagraphSource[] = [];
  for (const match of safe.matchAll(BLOCK_RE)) {
    const content = match[3] || '';
    const text = fragmentToText(content);
    if (!text) continue;
    paragraphs.push({ text, attributes: match[2] || '', content });
  }
  if (paragraphs.length) return paragraphs;
  const text = fragmentToText(safe);
  return text ? [{ text, attributes: '', content: safe }] : [];
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
