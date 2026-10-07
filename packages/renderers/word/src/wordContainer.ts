import {
  decodeFileViewerTextBuffer,
  resolveFileViewerTextEncoding
} from '@file-viewer/core'

export type WordContainer = 'openxml' | 'wordml' | 'html' | 'text' | 'binary'
const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const wordMlNamespace = 'http://schemas.microsoft.com/office/word/2003/wordml'
// XML 1.0 Fifth Edition NCNames use explicit ranges, not Unicode letter
// categories: legal names also include astral symbols and format characters.
// https://www.w3.org/TR/xml/#NT-NameStartChar (colon is the QName separator).
const xmlNameStart =
  String.raw`A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF` +
  String.raw`\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F` +
  String.raw`\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD` +
  String.raw`\u{10000}-\u{EFFFF}`
const xmlName = String.raw`[${xmlNameStart}][${xmlNameStart}.0-9\u00B7\u0300-\u036F\u203F-\u2040-]*`
const wordMlRoot = new RegExp(
  String.raw`^<((?:${xmlName}:)?wordDocument)(?=[\t\r\n />])`,
  'u'
)

/** Inspect only the bounded root start tag; the converter validates the full XML. */
function hasWordMlRoot(source: string): boolean {
  const root = wordMlRoot.exec(source)
  if (!root) return false
  const colon = root[1].indexOf(':')
  const namespaceAttribute =
    colon < 0 ? 'xmlns' : `xmlns:${root[1].slice(0, colon)}`
  const attribute = new RegExp(
    String.raw`[\t\r\n ]+((?:${xmlName}:)?${xmlName})[\t\r\n ]*=[\t\r\n ]*(?:"([^"<]*)"|'([^'<]*)')`,
    'uy'
  )
  const names = new Set<string>()
  let namespace: string | undefined
  let offset = root[0].length
  while (offset < source.length) {
    if (/^[\t\r\n ]*\/?>/.test(source.slice(offset)))
      return namespace === wordMlNamespace
    attribute.lastIndex = offset
    const match = attribute.exec(source)
    if (!match || names.has(match[1])) return false
    names.add(match[1])
    offset = attribute.lastIndex
    if (match[1] === namespaceAttribute) {
      // XML namespace names are identifiers, not navigable URLs. Resolve only
      // numeric references for this ASCII identifier, then compare it exactly.
      // Marker text in content, comments or another attribute never binds it.
      namespace = (match[2] ?? match[3]).replace(
        /&#(?:x([\da-fA-F]+)|(\d+));/g,
        (_reference, hex, decimal) => {
          const code = Number.parseInt(hex ?? decimal, hex ? 16 : 10)
          return code >= 0x20 && code <= 0x7e
            ? String.fromCharCode(code)
            : '\uFFFD'
        }
      )
    }
  }
  return false
}

function withoutXmlPrologue(source: string): string {
  return source
    .replace(/^\uFEFF/, '')
    .trimStart()
    .replace(/^(?:<\?[\s\S]*?\?>\s*|<!--[\s\S]*?-->\s*)+/, '')
}

/** Match XML decoding rules without eagerly loading the WordML converter. */
function hasWordMlDocument(sample: ArrayBuffer): boolean {
  const bytes = new Uint8Array(sample)
  const utf16le =
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0x3c && bytes[1] === 0)
  const utf16be =
    (bytes[0] === 0xfe && bytes[1] === 0xff) ||
    (bytes[0] === 0 && bytes[1] === 0x3c)
  const utf8Bom =
    bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const detected = utf16le
    ? 'utf-16le'
    : utf16be
      ? 'utf-16be'
      : utf8Bom
        ? 'utf-8'
        : null
  try {
    const prefix = new TextDecoder(detected || 'windows-1252').decode(
      bytes.subarray(0, 1024)
    )
    const declaration = /^<\?xml\s[^?]*\?>/.exec(prefix)?.[0]
    const declared = declaration &&
      /\sencoding\s*=\s*(["'])([A-Za-z][A-Za-z0-9._-]*)\1/.exec(declaration)?.[2]
    // XML defaults to UTF-8. Generic text auto-detection can collapse distinct
    // legacy-encoded names, or change names when a multibyte tail is truncated.
    // Leave full-buffer fatal decoding and signature conflicts to the converter.
    const text = new TextDecoder(detected || declared || 'utf-8').decode(bytes)
    return hasWordMlRoot(withoutXmlPrologue(text))
  } catch {
    return false
  }
}

/** Signature-first dispatch: a legacy suffix does not establish binary DOC. */
export function resolveWordContainer(buffer: ArrayBuffer): WordContainer {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'openxml'
  if (!bytes.length || ole.every((byte, index) => bytes[index] === byte))
    return 'binary'
  const sample = buffer.slice(0, Math.min(buffer.byteLength, 65536))
  const encoding = resolveFileViewerTextEncoding(
    new Uint8Array(sample)
  ).encoding
  if (encoding.startsWith('utf-16') && buffer.byteLength % 2 !== 0)
    return 'binary'
  if (hasWordMlDocument(sample)) return 'wordml'
  let text: string
  try {
    text = decodeFileViewerTextBuffer(sample).text
  } catch {
    return 'binary'
  }
  // Match the document prologue, not a '<table>' appearing in ordinary prose.
  const start = withoutXmlPrologue(text)
  if (/^(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/i.test(start))
    return 'html'
  // Reject binary/control data and unrelated XML/RTF rather than displaying it
  // as convincing but incorrect document text. Permit ordinary tabs/newlines.
  if (
    /^[<{]/.test(start) ||
    /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text)
  )
    return 'binary'
  const replacements = (text.match(/\uFFFD/g) || []).length
  return replacements > Math.max(1, text.length * 0.01) ? 'binary' : 'text'
}
