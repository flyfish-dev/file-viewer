import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILE_VIEWER_TEXT_FALLBACK_ENCODING,
  decodeFileViewerTextBuffer,
  findFileViewerSearchProvider,
  isSingleByteFileViewerTextEncoding,
  resolveFileViewerTextEncoding,
  type FileRenderContext
} from '../packages/core/src'
import renderLargeText, { shouldVirtualizeTextBuffer } from '../packages/renderers/text/src/largeText'

const readFixture = (name: string) => {
  const bytes = readFileSync(fileURLToPath(new URL(`./fixtures/text-encoding/${name}`, import.meta.url)))
  return new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

const toArrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

const encodeLatin1 = (text: string) => {
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    if (code > 0xff) {
      throw new Error(`Not a Latin-1 character: ${text[index]}`)
    }
    bytes[index] = code
  }
  return bytes
}

const LATIN1_TEXT =
  'Die Straße in Saarbrücken ist für Fußgänger gesperrt.\n' +
  'Nächste Woche öffnet das Büro in der Nähe wieder.\n'
const CYRILLIC_TEXT =
  'Съешь же ещё этих мягких французских булок, да выпей чаю.\n' +
  'Файл сохранён в кодировке Windows-1251, а не UTF-8.\n'

describe('single-byte text encodings', () => {
  const latin1 = readFixture('latin1-umlauts.txt')
  const cyrillic = readFixture('windows-1251-cyrillic.txt')

  it('keeps the GB18030 fallback by default so existing GBK files do not change', () => {
    expect(DEFAULT_FILE_VIEWER_TEXT_FALLBACK_ENCODING).toBe('gb18030')
    expect(resolveFileViewerTextEncoding(latin1)).toEqual({ encoding: 'gb18030', bomLength: 0 })
    expect(decodeFileViewerTextBuffer(toArrayBuffer(latin1)).text).toContain('Saarbr點ken')
  })

  it('decodes Latin-1 umlauts through text.fallbackEncoding', () => {
    for (const fallback of ['windows-1252', 'iso-8859-1', 'latin1', 'cp1252', 'ISO_8859_1']) {
      const decoded = decodeFileViewerTextBuffer(toArrayBuffer(latin1), 'auto', fallback)
      expect(decoded.text, fallback).toBe(LATIN1_TEXT)
      expect(isSingleByteFileViewerTextEncoding(decoded.encoding), fallback).toBe(true)
    }
  })

  it('decodes Latin-1 umlauts through an explicit text.encoding', () => {
    expect(resolveFileViewerTextEncoding(latin1, 'iso-8859-1')).toEqual({ encoding: 'iso-8859-1', bomLength: 0 })
    expect(decodeFileViewerTextBuffer(toArrayBuffer(latin1), 'windows-1252').text).toBe(LATIN1_TEXT)
    // Explicit encodings win over the fallback.
    expect(decodeFileViewerTextBuffer(toArrayBuffer(latin1), 'iso-8859-1', 'gb18030').text).toBe(LATIN1_TEXT)
  })

  it('decodes Windows-1251 Cyrillic text', () => {
    expect(decodeFileViewerTextBuffer(toArrayBuffer(cyrillic)).text).not.toBe(CYRILLIC_TEXT)
    expect(decodeFileViewerTextBuffer(toArrayBuffer(cyrillic), 'auto', 'windows-1251').text).toBe(CYRILLIC_TEXT)
    expect(decodeFileViewerTextBuffer(toArrayBuffer(cyrillic), 'cp1251').text).toBe(CYRILLIC_TEXT)
  })

  it('never applies the fallback to UTF-8, BOM, or UTF-16 input', () => {
    const utf8 = new TextEncoder().encode(LATIN1_TEXT)
    expect(resolveFileViewerTextEncoding(utf8, 'auto', 'windows-1252')).toEqual({ encoding: 'utf-8', bomLength: 0 })
    expect(decodeFileViewerTextBuffer(toArrayBuffer(utf8), 'auto', 'windows-1252').text).toBe(LATIN1_TEXT)

    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8])
    expect(resolveFileViewerTextEncoding(bom, 'auto', 'windows-1252')).toEqual({ encoding: 'utf-8', bomLength: 3 })

    const utf16 = new Uint8Array(LATIN1_TEXT.length * 2)
    for (let index = 0; index < LATIN1_TEXT.length; index += 1) {
      utf16[index * 2] = LATIN1_TEXT.charCodeAt(index)
    }
    expect(resolveFileViewerTextEncoding(utf16, 'auto', 'windows-1252')).toEqual({ encoding: 'utf-16le', bomLength: 0 })
  })

  it('maps GBK and unknown fallback labels onto GB18030', () => {
    expect(resolveFileViewerTextEncoding(latin1, 'auto', 'gbk').encoding).toBe('gb18030')
    expect(resolveFileViewerTextEncoding(latin1, 'auto', 'not-an-encoding').encoding).toBe('gb18030')
    expect(resolveFileViewerTextEncoding(latin1, 'constructor').encoding).toBe('gb18030')
    expect(resolveFileViewerTextEncoding(latin1, 'auto', '__proto__').encoding).toBe('gb18030')
    expect(isSingleByteFileViewerTextEncoding('gb18030')).toBe(false)
    expect(isSingleByteFileViewerTextEncoding('utf-8')).toBe(false)
    expect(isSingleByteFileViewerTextEncoding(undefined)).toBe(false)
  })
})

describe('virtualized large text with a single-byte encoding', () => {
  // Line 1 is 3000 bytes of «» so it splits into 1024-byte segments. Both bytes
  // (AB, BB) look like UTF-8 continuation bytes, which the UTF-8 boundary
  // alignment used to skip. Lines 2-201 repeat the Latin-1 fixture text.
  const longLine = '«»'.repeat(1500)
  const germanLines = Array.from({ length: 200 }, (_, index) => `${index + 1}: ${LATIN1_TEXT.split('\n')[0]}`)
  const bytes = encodeLatin1(`${longLine}\n${germanLines.join('\n')}\n`)
  const context = {
    options: {
      text: {
        fallbackEncoding: 'windows-1252',
        virtualizeAboveBytes: 1024,
        maxRenderedLineBytes: 1024
      }
    }
  } as FileRenderContext

  const mount = async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="target"></div></body></html>', {
      pretendToBeVisual: true
    })
    const target = dom.window.document.getElementById('target') as HTMLDivElement
    const instance = await renderLargeText(toArrayBuffer(bytes), target, 'txt', context)
    return { dom, target, instance }
  }

  it('virtualizes the buffer and reports the resolved encoding', async () => {
    expect(shouldVirtualizeTextBuffer(toArrayBuffer(bytes), context)).toBe(true)
    const { dom, target, instance } = await mount()
    const root = target.querySelector<HTMLElement>('.code-viewer--virtual')
    expect(root?.dataset.textEncoding).toBe('windows-1252')
    expect(root?.dataset.totalLines).toBe('202')
    const second = target.querySelector('.code-virtual-line[data-line="2"] .code-virtual-content')
    expect(second?.textContent).toBe('1: Die Straße in Saarbrücken ist für Fußgänger gesperrt.')
    instance.unmount?.()
    dom.window.close()
  })

  it('slices long lines at byte offsets without dropping high bytes', async () => {
    const { dom, target, instance } = await mount()
    const firstRow = target.querySelector<HTMLElement>('.code-virtual-line[data-line="1"]')
    const content = () => firstRow?.querySelector('.code-virtual-content')?.textContent ?? ''
    expect(content()).toBe('«»'.repeat(512))
    expect(firstRow?.querySelector('.code-line-segments')?.textContent).toContain('1/3')

    firstRow?.querySelector<HTMLButtonElement>('button[data-segment-action="next"]')?.click()
    const nextRow = target.querySelector<HTMLElement>('.code-virtual-line[data-line="1"]')
    expect(nextRow?.querySelector('.code-line-segments')?.textContent).toContain('2/3')
    expect(nextRow?.querySelector('.code-virtual-content')?.textContent).toBe('«»'.repeat(512))
    instance.unmount?.()
    dom.window.close()
  })

  it('finds matches on the right lines when one character is one byte', async () => {
    const { dom, target, instance } = await mount()
    const provider = findFileViewerSearchProvider(target)
    expect(provider).not.toBeNull()
    const state = await provider!.search('Saarbrücken')
    expect(state.total).toBe(200)
    expect(state.matches[0]?.line).toBe(2)
    expect(state.matches[199]?.line).toBe(201)
    expect(state.matches.every(match => match.text === 'Saarbrücken')).toBe(true)
    const active = target.querySelector('.code-virtual-line--match')
    expect(active?.getAttribute('data-line')).toBe('2')
    instance.unmount?.()
    dom.window.close()
  })
})
