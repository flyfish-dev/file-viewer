const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const MAX_CHM_PATH_LENGTH = 4_096;
const ABSOLUTE_SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i;
const EXTERNAL_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
const BLOCKED_SCHEMES = new Set([
  'about', 'blob', 'file', 'ftp', 'javascript', 'resource', 'shell', 'vbscript',
]);

export const MAX_CHM_HTML_TEXT_LENGTH = 16 * 1024 * 1024;
export const MAX_CHM_HTML_MARKUP_TOKENS = 100_000;
export const MAX_CHM_SVG_TEXT_LENGTH = 8 * 1024 * 1024;
export const MAX_CHM_SVG_MARKUP_TOKENS = 50_000;
export const MAX_CHM_CSS_TEXT_LENGTH = 4 * 1024 * 1024;
export const MAX_CHM_SEARCH_TEXT_LENGTH = 4 * 1024 * 1024;

export interface ChmResolvedReference {
  kind: 'internal' | 'fragment' | 'external' | 'data' | 'blocked';
  path?: string;
  fragment?: string;
  url?: string;
}

export interface SanitizedChmHtmlDocument {
  document: Document;
  html: string;
  title: string;
  resourcePaths: string[];
}

const createStringBuilder = (maxLength = Number.POSITIVE_INFINITY) => {
  const chunks: string[] = [];
  let buffer = '';
  let length = 0;
  const append = (value: string) => {
    if (!value || length >= maxLength) return;
    const remaining = maxLength - length;
    const next = value.length > remaining ? value.slice(0, remaining) : value;
    length += next.length;
    if (buffer.length + next.length <= 16_384) {
      buffer += next;
      return;
    }
    if (buffer) chunks.push(buffer);
    if (next.length > 16_384) {
      chunks.push(next);
      buffer = '';
    } else {
      buffer = next;
    }
  };
  return {
    append,
    get length() { return length; },
    finish: () => {
      if (buffer) chunks.push(buffer);
      return chunks.join('');
    },
  };
};

export const assertChmMarkupBudget = (
  source: string,
  maxLength: number,
  maxTokens: number,
  kind: 'HTML' | 'SVG'
) => {
  if (source.length > maxLength) {
    throw new Error(`CHM_LIMIT_EXCEEDED: ${kind} text exceeds ${maxLength} characters.`);
  }
  let tokens = 0;
  let tagTokens = 0;
  let inTag = false;
  let inTagToken = false;
  let quote = '';
  const maxTagTokens = maxTokens * 3;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (!quote && character === '<') {
      tokens += 1;
      if (tokens > maxTokens) {
        throw new Error(`CHM_LIMIT_EXCEEDED: ${kind} markup exceeds ${maxTokens} tokens.`);
      }
      if (!inTag) {
        inTag = true;
        inTagToken = false;
      }
      continue;
    }
    if (!inTag) continue;
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') {
      inTag = false;
      inTagToken = false;
      continue;
    }
    if (isAsciiWhitespace(character)) {
      inTagToken = false;
      continue;
    }
    if (!inTagToken) {
      inTagToken = true;
      tagTokens += 1;
      if (tagTokens > maxTagTokens) {
        throw new Error(`CHM_LIMIT_EXCEEDED: ${kind} markup exceeds ${maxTagTokens} tag fields.`);
      }
    }
  }
};

export const assertChmSvgSourceSafety = (source: string) => {
  assertChmMarkupBudget(source, MAX_CHM_SVG_TEXT_LENGTH, MAX_CHM_SVG_MARKUP_TOKENS, 'SVG');
  for (let index = 0; index + 2 < source.length; index += 1) {
    if (source[index] !== '<' || source[index + 1] !== '!') continue;
    let cursor = index + 2;
    while (isAsciiWhitespace(source[cursor])) cursor += 1;
    let end = cursor;
    while (end < source.length) {
      const code = source.charCodeAt(end);
      if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122))) break;
      end += 1;
    }
    const keyword = source.slice(cursor, end).toLowerCase();
    if (keyword === 'doctype' || keyword === 'entity') {
      throw new Error(`CHM_SECURITY_BLOCKED: SVG ${keyword.toUpperCase()} declarations are disabled.`);
    }
  }
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const normalizeChmPath = (input: string): string | null => {
  if (typeof input !== 'string' || CONTROL_CHARACTER_PATTERN.test(input)) return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_CHM_PATH_LENGTH) return null;
  const decoded = safeDecodeURIComponent(trimmed);
  if (/^(?:[a-z]:[\\/]|[\\/]{2})/i.test(decoded)) return null;
  const source = decoded.replace(/\\/g, '/');
  const segments: string[] = [];
  for (const segment of source.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!segments.length) return null;
      segments.pop();
      continue;
    }
    if (CONTROL_CHARACTER_PATTERN.test(segment)) return null;
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
};

const splitReference = (value: string) => {
  const hashIndex = value.indexOf('#');
  const fragment = hashIndex >= 0 ? safeDecodeURIComponent(value.slice(hashIndex + 1)) : '';
  const withoutFragment = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutFragment.indexOf('?');
  return {
    path: queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment,
    fragment,
  };
};

const unwrapCompiledHelpUrl = (value: string) => {
  const delimiter = value.indexOf('::');
  return delimiter >= 0 ? value.slice(delimiter + 2) : '';
};

export const resolveChmReference = (basePath: string, rawUrl: string): ChmResolvedReference => {
  if (typeof rawUrl !== 'string') return { kind: 'blocked' };
  let value = rawUrl.trim();
  if (!value || CONTROL_CHARACTER_PATTERN.test(value)) return { kind: 'blocked' };
  if (value.startsWith('#')) {
    return { kind: 'fragment', fragment: safeDecodeURIComponent(value.slice(1)) };
  }
  if (value.startsWith('//')) return { kind: 'external', url: value };

  const schemeMatch = value.match(ABSOLUTE_SCHEME_PATTERN);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme === 'ms-its' || scheme === 'mk' || scheme === 'its') {
      value = unwrapCompiledHelpUrl(value);
      if (!value) return { kind: 'blocked' };
    } else if (scheme === 'data') {
      return /^data:image\/(?:avif|bmp|gif|jpeg|png|webp);/i.test(value)
        ? { kind: 'data', url: value }
        : { kind: 'blocked' };
    } else if (EXTERNAL_SCHEMES.has(scheme)) {
      return { kind: 'external', url: value };
    } else if (BLOCKED_SCHEMES.has(scheme) || scheme) {
      return { kind: 'blocked' };
    }
  }

  const { path: rawPath, fragment } = splitReference(value);
  if (!rawPath && fragment) return { kind: 'fragment', fragment };
  const normalizedBase = normalizeChmPath(basePath) || '/';
  const baseDirectory = normalizedBase.includes('/')
    ? normalizedBase.slice(0, normalizedBase.lastIndexOf('/') + 1)
    : '';
  const joined = rawPath.startsWith('/') ? rawPath : `${baseDirectory}${rawPath}`;
  const path = normalizeChmPath(joined);
  if (path == null || path === '/') return { kind: 'blocked' };
  return { kind: 'internal', path, fragment: fragment || undefined };
};

const normalizeEncoding = (value: string | undefined) => {
  const normalized = (value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return '';
  if (normalized === 'utf8') return 'utf-8';
  if (normalized === 'gbk' || normalized === 'cp936') return 'gb18030';
  if (normalized === 'big5-hkscs') return 'big5';
  if (normalized === 'shift-jis' || normalized === 'sjis' || normalized === 'cp932') return 'shift_jis';
  if (normalized === 'euc-kr' || normalized === 'cp949') return 'euc-kr';
  if (/^windows-?\d+$/.test(normalized)) return normalized.replace(/^windows-?/, 'windows-');
  if (/^cp\d+$/.test(normalized)) return normalized.replace(/^cp/, 'windows-');
  return normalized;
};

const sniffHtmlEncoding = (bytes: Uint8Array) => {
  const prefix = bytes.subarray(0, Math.min(bytes.byteLength, 8_192));
  let ascii = '';
  for (let index = 0; index < prefix.byteLength; index += 1) {
    const value = prefix[index];
    ascii += value >= 0x20 && value <= 0x7e ? String.fromCharCode(value) : ' ';
  }
  const match = ascii.match(/<meta\b[^>]*\bcharset\s*=\s*["']?\s*([^\s"'/>;]+)/i)
    || ascii.match(/<meta\b[^>]*\bcontent\s*=\s*["'][^"']*charset\s*=\s*([^\s"'/>;]+)/i);
  return normalizeEncoding(match?.[1]);
};

const decodeWith = (bytes: Uint8Array, encoding: string) => {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
};

export const decodeChmText = (bytes: Uint8Array, fallbackEncoding = 'windows-1252') => {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return decodeWith(bytes.subarray(3), 'utf-8');
  }
  if (bytes.byteLength >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return decodeWith(bytes.subarray(2), 'utf-16le');
  }
  if (bytes.byteLength >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.byteLength - 2);
    for (let index = 2; index + 1 < bytes.byteLength; index += 2) {
      swapped[index - 2] = bytes[index + 1];
      swapped[index - 1] = bytes[index];
    }
    return decodeWith(swapped, 'utf-16le');
  }
  const candidates = [sniffHtmlEncoding(bytes), normalizeEncoding(fallbackEncoding), 'utf-8', 'windows-1252'];
  for (const encoding of candidates) {
    if (!encoding) continue;
    const decoded = decodeWith(bytes, encoding);
    if (decoded) return decoded.replace(/^\ufeff/, '');
  }
  return '';
};

const isAsciiWhitespace = (character: string | undefined) => character === ' '
  || character === '\t'
  || character === '\n'
  || character === '\f'
  || character === '\r';
const isHtmlNameCharacter = (character: string | undefined) => {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return (code >= 48 && code <= 57)
    || (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || character === ':'
    || character === '_'
    || character === '-';
};
const startsWithAsciiCaseInsensitive = (source: string, index: number, expected: string) => {
  if (index + expected.length > source.length) return false;
  for (let offset = 0; offset < expected.length; offset += 1) {
    const actual = source.charCodeAt(index + offset);
    const wanted = expected.charCodeAt(offset);
    const folded = actual >= 65 && actual <= 90 ? actual + 32 : actual;
    if (folded !== wanted) return false;
  }
  return true;
};

const scanHtmlTagEnd = (source: string, start: number) => {
  let index = start;
  let quote = '';
  while (index < source.length) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index + 1;
    }
    index += 1;
  }
  return source.length;
};

const skipHtmlRawTextElement = (source: string, start: number, name: 'script' | 'style') => {
  let index = start;
  while (index < source.length) {
    if (source[index] === '<' && source[index + 1] === '/'
      && startsWithAsciiCaseInsensitive(source, index + 2, name)
      && !isHtmlNameCharacter(source[index + 2 + name.length])) {
      return scanHtmlTagEnd(source, index + 2 + name.length);
    }
    index += 1;
  }
  return source.length;
};

const decodeSearchEntity = (source: string, index: number) => {
  let end = index + 1;
  const limit = Math.min(source.length, index + 13);
  while (end < limit && source[end] !== ';') {
    if (source[end] === '&' || source[end] === '<' || isAsciiWhitespace(source[end])) return null;
    end += 1;
  }
  if (end >= limit || source[end] !== ';') return null;
  const entity = source.slice(index + 1, end).toLowerCase();
  const named: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  };
  if (named[entity] != null) return { end: end + 1, value: named[entity] };
  const numeric = entity.startsWith('#x')
    ? Number.parseInt(entity.slice(2), 16)
    : entity.startsWith('#') ? Number.parseInt(entity.slice(1), 10) : Number.NaN;
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 0x10ffff || (numeric >= 0xd800 && numeric <= 0xdfff)) {
    return null;
  }
  return { end: end + 1, value: String.fromCodePoint(numeric) };
};

/** Extract searchable topic text without DOM APIs or backtracking regular expressions. */
export const extractChmSearchText = (
  html: string,
  maxOutputLength = MAX_CHM_SEARCH_TEXT_LENGTH
) => {
  const output = createStringBuilder(Math.max(0, maxOutputLength));
  let index = 0;
  let pendingSpace = false;
  const appendText = (value: string) => {
    if (!value) return;
    if (isAsciiWhitespace(value)) {
      pendingSpace = output.length > 0;
      return;
    }
    if (pendingSpace && output.length < maxOutputLength) output.append(' ');
    pendingSpace = false;
    output.append(value);
  };

  while (index < html.length) {
    const character = html[index];
    if (character === '<') {
      pendingSpace = output.length > 0;
      if (html.startsWith('<!--', index)) {
        const end = html.indexOf('-->', index + 4);
        index = end < 0 ? html.length : end + 3;
        continue;
      }
      let cursor = index + 1;
      const closing = html[cursor] === '/';
      if (closing) cursor += 1;
      while (isAsciiWhitespace(html[cursor])) cursor += 1;
      const nameStart = cursor;
      while (isHtmlNameCharacter(html[cursor])) cursor += 1;
      const name = html.slice(nameStart, cursor).toLowerCase();
      const tagEnd = scanHtmlTagEnd(html, cursor);
      index = !closing && (name === 'script' || name === 'style')
        ? skipHtmlRawTextElement(html, tagEnd, name)
        : tagEnd;
      continue;
    }
    if (character === '&') {
      const entity = decodeSearchEntity(html, index);
      if (entity) {
        appendText(entity.value);
        index = entity.end;
        continue;
      }
    }
    appendText(character);
    index += 1;
  }
  return output.finish().trim();
};

const INTERNAL_RESOURCE_SCHEME = 'chm-internal:';
export const MAX_CHM_TOPIC_RESOURCE_PATHS = 2_048;
export const MAX_CHM_CSS_RESOURCE_PATHS = 1_024;

const isHexDigit = (character: string | undefined) => {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return (code >= 48 && code <= 57)
    || (code >= 65 && code <= 70)
    || (code >= 97 && code <= 102);
};
const isCssIdentifierCharacter = (character: string | undefined) => {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return (code >= 48 && code <= 57)
    || (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || character === '_'
    || character === '-';
};

const normalizeCssSyntax = (css: string) => {
  const output = createStringBuilder();
  let index = 0;
  let spanStart = 0;
  while (index < css.length) {
    if (css[index] === '/' && css[index + 1] === '*') {
      output.append(css.slice(spanStart, index));
      const end = css.indexOf('*/', index + 2);
      if (end < 0) {
        index = css.length;
        spanStart = index;
        break;
      }
      index = end + 2;
      spanStart = index;
      continue;
    }
    if (css[index] !== '\\') {
      index += 1;
      continue;
    }
    output.append(css.slice(spanStart, index));
    const next = css[index + 1];
    if (next === '\n' || next === '\f') {
      index += 2;
      spanStart = index;
      continue;
    }
    if (next === '\r') {
      index += css[index + 2] === '\n' ? 3 : 2;
      spanStart = index;
      continue;
    }
    let cursor = index + 1;
    while (cursor < css.length && cursor < index + 7 && isHexDigit(css[cursor])) cursor += 1;
    if (cursor > index + 1) {
      const hex = css.slice(index + 1, cursor);
      const codePoint = Number.parseInt(hex, 16);
      if (css[cursor] === '\r' && css[cursor + 1] === '\n') cursor += 2;
      else if (/[\t\n\f\r ]/.test(css[cursor] || '')) cursor += 1;
      const decoded = codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\ufffd';
      if (/^["'();\\]$/.test(decoded)) output.append(`\\${hex} `);
      else output.append(decoded);
      index = cursor;
      spanStart = index;
      continue;
    }
    if (next) {
      if (/^["'();\\]$/.test(next)) output.append(`\\${next}`);
      else output.append(next);
      index += 2;
    } else {
      index += 1;
    }
    spanStart = index;
  }
  output.append(css.slice(spanStart));
  return output.finish();
};

const stripCssImports = (css: string) => {
  const output = createStringBuilder();
  let index = 0;
  let spanStart = 0;
  while (index < css.length) {
    const isImport = css[index] === '@'
      && css.slice(index, index + 7).toLowerCase() === '@import'
      && !isCssIdentifierCharacter(css[index + 7]);
    if (!isImport) {
      index += 1;
      continue;
    }
    output.append(css.slice(spanStart, index));
    index += 7;
    let quote = '';
    let parenthesisDepth = 0;
    while (index < css.length) {
      const character = css[index];
      if (character === '\\') {
        index = Math.min(css.length, index + 2);
        continue;
      }
      if (quote) {
        if (character === quote) quote = '';
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '(') {
        parenthesisDepth += 1;
      } else if (character === ')' && parenthesisDepth > 0) {
        parenthesisDepth -= 1;
      } else if (character === ';' && parenthesisDepth === 0) {
        index += 1;
        break;
      }
      index += 1;
    }
    spanStart = index;
  }
  output.append(css.slice(spanStart));
  return output.finish();
};

const matchCssFunction = (css: string, index: number, name: string) => {
  if (isCssIdentifierCharacter(css[index - 1]) || css.slice(index, index + name.length).toLowerCase() !== name) return -1;
  let cursor = index + name.length;
  if (isCssIdentifierCharacter(css[cursor])) return -1;
  while (/[\t\n\f\r ]/.test(css[cursor] || '')) cursor += 1;
  return css[cursor] === '(' ? cursor : -1;
};

const readCssFunction = (css: string, openParenthesis: number) => {
  let cursor = openParenthesis + 1;
  let depth = 1;
  let quote = '';
  while (cursor < css.length) {
    const character = css[cursor];
    if (character === '\\') {
      cursor = Math.min(css.length, cursor + 2);
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) return { body: css.slice(openParenthesis + 1, cursor), end: cursor + 1 };
    }
    cursor += 1;
  }
  return { body: css.slice(openParenthesis + 1), end: css.length };
};

const matchDangerousDeclaration = (css: string, index: number) => {
  if (isCssIdentifierCharacter(css[index - 1])) return -1;
  for (const name of ['behavior', '-moz-binding']) {
    if (css.slice(index, index + name.length).toLowerCase() !== name) continue;
    let cursor = index + name.length;
    if (isCssIdentifierCharacter(css[cursor])) continue;
    while (/[\t\n\f\r ]/.test(css[cursor] || '')) cursor += 1;
    if (css[cursor] === ':') return cursor + 1;
  }
  return -1;
};

const skipCssDeclarationValue = (css: string, start: number) => {
  let cursor = start;
  let depth = 0;
  let quote = '';
  while (cursor < css.length) {
    const character = css[cursor];
    if (character === '\\') {
      cursor = Math.min(css.length, cursor + 2);
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')' && depth > 0) {
      depth -= 1;
    } else if (depth === 0 && (character === ';' || character === '}')) {
      return character === ';' ? cursor + 1 : cursor;
    }
    cursor += 1;
  }
  return cursor;
};

const recordResourcePath = (resources: Set<string>, path: string, maxResourcePaths: number) => {
  if (resources.has(path)) return true;
  if (resources.size >= maxResourcePaths) return false;
  resources.add(path);
  return true;
};

const sanitizeCss = (css: string, basePath: string, resources: Set<string>, maxResourcePaths: number) => {
  if (css.length > MAX_CHM_CSS_TEXT_LENGTH) return '';
  const source = stripCssImports(normalizeCssSyntax(css));
  const output = createStringBuilder();
  let index = 0;
  let spanStart = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '"' || character === "'") {
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') index = Math.min(source.length, index + 2);
        else if (source[index++] === character) break;
        else index += 0;
      }
      continue;
    }
    const declarationStart = matchDangerousDeclaration(source, index);
    if (declarationStart >= 0) {
      output.append(source.slice(spanStart, index));
      index = skipCssDeclarationValue(source, declarationStart);
      spanStart = index;
      continue;
    }
    const expressionStart = matchCssFunction(source, index, 'expression');
    if (expressionStart >= 0) {
      output.append(source.slice(spanStart, index));
      index = readCssFunction(source, expressionStart).end;
      spanStart = index;
      continue;
    }
    const urlStart = matchCssFunction(source, index, 'url');
    if (urlStart >= 0) {
      output.append(source.slice(spanStart, index));
      const parsed = readCssFunction(source, urlStart);
      let raw = parsed.body.trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1).trim();
      }
      const resolved = resolveChmReference(basePath, raw);
      if (resolved.kind === 'data' && resolved.url) {
        output.append(`url("${resolved.url.replace(/"/g, '%22')}")`);
      } else if (resolved.kind === 'fragment' && resolved.fragment && /^[\w:.-]+$/.test(resolved.fragment)) {
        output.append(`url("#${resolved.fragment}")`);
      } else if (resolved.kind === 'internal' && resolved.path
        && recordResourcePath(resources, resolved.path, maxResourcePaths)) {
        output.append(`url("${INTERNAL_RESOURCE_SCHEME}${encodeURIComponent(resolved.path)}")`);
      } else {
        output.append('url("")');
      }
      index = parsed.end;
      spanStart = index;
      continue;
    }
    index += 1;
  }
  output.append(source.slice(spanStart));
  return output.finish();
};

const sanitizeEmbeddedCssAttribute = (value: string, basePath: string) => sanitizeCss(value, basePath, new Set(), 0);

export const sanitizeChmCss = (
  css: string,
  basePath: string,
  maxResourcePaths = MAX_CHM_CSS_RESOURCE_PATHS
) => {
  const resources = new Set<string>();
  return {
    css: sanitizeCss(css, basePath, resources, maxResourcePaths),
    resourcePaths: Array.from(resources),
  };
};

const RESOURCE_ATTRIBUTES: ReadonlyArray<[string, string]> = [
  ['img', 'src'], ['source', 'src'], ['audio', 'src'], ['video', 'src'], ['video', 'poster'],
  ['track', 'src'], ['input', 'src'], ['img', 'lowsrc'], ['img', 'dynsrc'],
  ['body', 'background'], ['table', 'background'], ['td', 'background'], ['th', 'background'],
  ['image', 'href'], ['image', 'xlink:href'], ['use', 'href'], ['use', 'xlink:href'],
  ['feImage', 'href'], ['feImage', 'xlink:href'],
];

const removeUnsafeElements = (document: Document) => {
  document.querySelectorAll(
    'script,object,embed,applet,iframe,frame,frameset,form,input,button,textarea,select,option,base,noscript,template,foreignObject,animate,animateMotion,set'
  ).forEach(element => element.remove());
  document.querySelectorAll('meta[http-equiv]').forEach(element => element.remove());
};

export const sanitizeChmHtmlDocument = (
  html: string,
  basePath: string,
  serialize = true
): SanitizedChmHtmlDocument => {
  if (typeof DOMParser === 'undefined') {
    throw new Error('CHM_SECURITY_DOM_UNAVAILABLE: DOMParser is required to sanitize CHM topics.');
  }
  assertChmMarkupBudget(html, MAX_CHM_HTML_TEXT_LENGTH, MAX_CHM_HTML_MARKUP_TOKENS, 'HTML');
  const document = new DOMParser().parseFromString(html, 'text/html');
  const resources = new Set<string>();
  removeUnsafeElements(document);

  document.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'ping' || name === 'formaction') {
        element.removeAttribute(attribute.name);
      }
    }
    const inlineStyle = element.getAttribute('style');
    if (inlineStyle) {
      element.setAttribute('style', sanitizeCss(inlineStyle, basePath, resources, MAX_CHM_TOPIC_RESOURCE_PATHS));
    }
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase() === 'style') continue;
      if (/(?:url\s*\(|@import\b|expression\s*\(|behavior\s*:|-moz-binding|\\|\/\*)/i.test(attribute.value)) {
        element.setAttribute(attribute.name, sanitizeEmbeddedCssAttribute(attribute.value, basePath));
      }
    }
  });

  document.querySelectorAll('style').forEach(style => {
    style.textContent = sanitizeCss(style.textContent || '', basePath, resources, MAX_CHM_TOPIC_RESOURCE_PATHS);
  });

  document.querySelectorAll('a,area').forEach(element => {
    const hasXlink = element.hasAttribute('xlink:href')
      || element.hasAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!element.hasAttribute('href') && !hasXlink) return;
    const raw = element.getAttribute('href')
      || element.getAttribute('xlink:href')
      || element.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      || '';
    const resolved = resolveChmReference(basePath, raw);
    element.removeAttribute('href');
    element.removeAttribute('xlink:href');
    element.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
    element.setAttribute('data-chm-link-kind', resolved.kind);
    if (resolved.path) element.setAttribute('data-chm-path', resolved.path);
    if (resolved.fragment) element.setAttribute('data-chm-fragment', resolved.fragment);
    if (resolved.kind === 'internal' || resolved.kind === 'fragment') {
      element.setAttribute('href', '#');
    } else {
      element.setAttribute('aria-disabled', 'true');
      element.setAttribute('title', 'External and active links are disabled in CHM preview.');
    }
  });

  document.querySelectorAll('link[href]').forEach(element => {
    const relation = (element.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    const resolved = resolveChmReference(basePath, element.getAttribute('href') || '');
    element.removeAttribute('href');
    if (!relation.includes('stylesheet') || resolved.kind !== 'internal' || !resolved.path) {
      element.remove();
      return;
    }
    if (!recordResourcePath(resources, resolved.path, MAX_CHM_TOPIC_RESOURCE_PATHS)) {
      element.remove();
      return;
    }
    element.setAttribute('data-chm-resource-href', resolved.path);
  });

  for (const [selector, attribute] of RESOURCE_ATTRIBUTES) {
    document.querySelectorAll(`${selector}[${attribute.replace(':', '\\:')}]`).forEach(element => {
      const raw = element.getAttribute(attribute) || '';
      const resolved = resolveChmReference(basePath, raw);
      element.removeAttribute(attribute);
      if (resolved.kind === 'fragment' && resolved.fragment) {
        element.setAttribute(attribute, `#${resolved.fragment}`);
      } else if (resolved.kind === 'data' && resolved.url) {
        element.setAttribute(attribute, resolved.url);
      } else if (resolved.kind === 'internal' && resolved.path
        && recordResourcePath(resources, resolved.path, MAX_CHM_TOPIC_RESOURCE_PATHS)) {
        element.setAttribute(`data-chm-resource-${attribute.replace(':', '-')}`, resolved.path);
      }
    });
  }
  document.querySelectorAll('[srcset]').forEach(element => element.removeAttribute('srcset'));

  const csp = document.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline' blob:",
    'img-src data: blob:',
    'font-src data: blob:',
    'media-src data: blob:',
    "connect-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; '));
  document.head.prepend(csp);

  const viewerStyle = document.createElement('style');
  viewerStyle.textContent = [
    ':root{color-scheme:light dark}',
    'html,body{min-height:100%;margin:0}',
    'body{padding:24px;box-sizing:border-box;background:#fff;color:#172033;font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere}',
    'img,video,svg,table{max-width:100%}',
    'pre{white-space:pre-wrap}',
    'a[aria-disabled=true]{color:inherit;text-decoration:line-through;cursor:not-allowed}',
    '@media(prefers-color-scheme:dark){body{background:#111827;color:#e5eef8}a{color:#7dd3fc}}',
  ].join('');
  document.head.append(viewerStyle);

  return {
    document,
    html: serialize ? `<!doctype html>${document.documentElement.outerHTML}` : '',
    title: document.title || '',
    resourcePaths: Array.from(resources),
  };
};

export const CHM_INTERNAL_RESOURCE_SCHEME = INTERNAL_RESOURCE_SCHEME;
