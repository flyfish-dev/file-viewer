import { decodeFileViewerTextBuffer, resolveFileViewerTextEncoding } from '@file-viewer/core'

export type WordContainer = 'openxml' | 'wordml' | 'html' | 'text' | 'binary'
const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const wordMlNamespace = 'http://schemas.microsoft.com/office/word/2003/wordml'

function documentStart(text: string): string | null {
  let index = text.charCodeAt(0) === 0xfeff ? 1 : 0
  while (index <= text.length) {
    while (index < text.length && /\s/.test(text[index])) index++
    const closing = text.startsWith('<?', index) ? '?>' : text.startsWith('<!--', index) ? '-->' : null
    if (!closing) return text.slice(index)
    const end = text.indexOf(closing, index + 2)
    if (end < 0) return null
    index = end + closing.length
  }
  return ''
}

function decodeNamespace(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g, (entity, name: string) => {
    if (!name.startsWith('#')) return named[name]
    const point = name.startsWith('#x') ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10)
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : entity
  })
}

/** Inspect only the bounded root opening tag; conversion validates the full XML. */
function isWordMlRoot(start: string): boolean {
  const root = /^<(?:([^\s:"'<>/=!?]+):)?wordDocument(?=[\t\n\r />])/.exec(start)
  if (!root) return false
  const attributes = new Map<string, string>()
  let index = root[0].length
  while (index < start.length) {
    const beforeSpace = index
    while (index < start.length && /[\t\n\r ]/.test(start[index])) index++
    if (start[index] === '>' || start.startsWith('/>', index)) {
      return decodeNamespace(attributes.get(root[1] ? 'xmlns:' + root[1] : 'xmlns') || '') === wordMlNamespace
    }
    if (index === beforeSpace) return false
    const nameStart = index
    while (index < start.length && /[^\s="'<>/?]/.test(start[index])) index++
    const name = start.slice(nameStart, index)
    if (!name || attributes.has(name)) return false
    while (index < start.length && /[\t\n\r ]/.test(start[index])) index++
    if (start[index++] !== '=') return false
    while (index < start.length && /[\t\n\r ]/.test(start[index])) index++
    const quote = start[index++]
    if (quote !== '"' && quote !== "'") return false
    const end = start.indexOf(quote, index)
    if (end < 0) return false
    attributes.set(name, start.slice(index, end))
    index = end + 1
  }
  return false
}

/** Signature-first dispatch: a legacy suffix does not establish binary DOC. */
export function resolveWordContainer(buffer: ArrayBuffer): WordContainer {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'openxml'
  if (!bytes.length || ole.every((byte, index) => bytes[index] === byte)) return 'binary'
  const sample = buffer.slice(0, Math.min(buffer.byteLength, 65536))
  const encoding = resolveFileViewerTextEncoding(new Uint8Array(sample)).encoding
  if (encoding.startsWith('utf-16') && buffer.byteLength % 2 !== 0) return 'binary'
  let text: string
  try { text = decodeFileViewerTextBuffer(sample).text } catch { return 'binary' }
  const start = documentStart(text)
  if (start === null) return 'binary'
  if (isWordMlRoot(start)) return 'wordml'
  if (/^(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/i.test(start)) return 'html'
  // Reject binary/control data and unrelated XML/RTF rather than displaying it
  // as convincing but incorrect document text. Permit ordinary tabs/newlines.
  if (/^[<{]/.test(start) || /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text)) return 'binary'
  const replacements = (text.match(/\uFFFD/g) || []).length
  return replacements > Math.max(1, text.length * 0.01) ? 'binary' : 'text'
}
