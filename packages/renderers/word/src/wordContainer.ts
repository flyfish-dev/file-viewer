import { decodeFileViewerTextBuffer, resolveFileViewerTextEncoding } from '@file-viewer/core'

export type WordContainer = 'openxml' | 'wordml' | 'html' | 'text' | 'binary'
const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

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
  if (/<(?:[\w.-]+:)?wordDocument(?:\s|>)/.test(text) &&
      text.includes('http://schemas.microsoft.com/office/word/2003/wordml')) return 'wordml'
  // Match the document prologue, not a '<table>' appearing in ordinary prose.
  const start = text.replace(/^\uFEFF/, '').trimStart()
    .replace(/^(?:<\?xml[^>]*\?>\s*|<!--[\s\S]*?-->\s*)+/i, '')
  if (/^(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/i.test(start)) return 'html'
  // Reject binary/control data and unrelated XML/RTF rather than displaying it
  // as convincing but incorrect document text. Permit ordinary tabs/newlines.
  if (/^[<{]/.test(start) || /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text)) return 'binary'
  const replacements = (text.match(/\uFFFD/g) || []).length
  return replacements > Math.max(1, text.length * 0.01) ? 'binary' : 'text'
}
