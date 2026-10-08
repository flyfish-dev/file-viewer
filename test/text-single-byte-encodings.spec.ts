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
import renderLrc from '../packages/renderers/text/src/lrc'

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

const SINGLE_BYTE_CASES = [
  { encoding: 'iso-8859-1', bytes: [0xc4, 0xe4, 0xd6, 0xf6], text: 'ÄäÖö' },
  { encoding: 'iso-8859-2', bytes: [0xa1, 0xb1, 0xa3, 0xb3], text: 'ĄąŁł' },
  { encoding: 'iso-8859-15', bytes: [0xa4, 0xa6, 0xa8, 0xb4], text: '€ŠšŽ' },
  { encoding: 'windows-1250', bytes: [0x8a, 0x9a, 0x8e, 0x9e], text: 'ŠšŽž' },
  { encoding: 'windows-1251', bytes: [0xc0, 0xdf, 0xe0, 0xff], text: 'АЯая' },
  { encoding: 'windows-1252', bytes: [0xc4, 0xe4, 0xd6, 0xf6], text: 'ÄäÖö' }
] as const

describe('decoder precedence and each supported charset', () => {
  it.each(SINGLE_BYTE_CASES)('decodes exact $encoding text without changing source bytes', ({ encoding, bytes, text }) => {
    const data = new Uint8Array(bytes)
    const original = data.slice()
    expect(decodeFileViewerTextBuffer(data.buffer, encoding)).toEqual({ encoding, text })
    expect(decodeFileViewerTextBuffer(data.buffer, 'auto', encoding)).toEqual({ encoding, text })
    expect(isSingleByteFileViewerTextEncoding(encoding)).toBe(true)
    expect(data).toEqual(original)
  })

  it.each(SINGLE_BYTE_CASES)('keeps $encoding LRC lyrics and their source view consistent', async ({ encoding, bytes, text }) => {
    const source = new Uint8Array([...new TextEncoder().encode('[00:01.00]'), ...bytes])
    const dom = new JSDOM('<!doctype html><div id="target"></div>')
    const target = dom.window.document.getElementById('target') as HTMLDivElement
    const instance = await renderLrc(source.buffer, target, 'lrc', { options: { text: { fallbackEncoding: encoding } } })
    try {
      expect(target.querySelector('.lrc-phrase')?.textContent).toBe(text)
      target.querySelector<HTMLButtonElement>('[data-lrc-mode="2"]')!.click()
      expect(target.querySelector('.lrc-source')?.textContent).toBe(`[00:01.00]${text}`)
      expect([...source]).toEqual([...new TextEncoder().encode('[00:01.00]'), ...bytes])
    } finally {
      instance.unmount?.()
      dom.window.close()
    }
  })

  it('requires an explicit encoding for single-byte input that is also valid UTF-8', () => {
    const data = new Uint8Array([0xc3, 0xa4]).buffer
    expect(decodeFileViewerTextBuffer(data, 'auto', 'windows-1252')).toEqual({ encoding: 'utf-8', text: 'ä' })
    expect(decodeFileViewerTextBuffer(data, 'windows-1252')).toEqual({ encoding: 'windows-1252', text: 'Ã¤' })
  })

  it.each(['utf-16le', 'utf-16be'] as const)('keeps BOM and structural %s ahead of a configured single-byte fallback', encoding => {
    const text = 'Die Straße: 中文'
    const bytes = new Uint8Array(text.length * 2)
    for (let i = 0; i < text.length; i++) {
      const value = text.charCodeAt(i)
      bytes[i * 2 + (encoding === 'utf-16le' ? 0 : 1)] = value & 0xff
      bytes[i * 2 + (encoding === 'utf-16le' ? 1 : 0)] = value >> 8
    }
    const bom = encoding === 'utf-16le' ? [0xff, 0xfe] : [0xfe, 0xff]
    for (const input of [bytes, new Uint8Array([...bom, ...bytes])]) {
      expect(decodeFileViewerTextBuffer(toArrayBuffer(input), 'auto', 'windows-1251')).toEqual({ encoding, text })
      const context: FileRenderContext = { options: { text: { fallbackEncoding: 'windows-1251', virtualizeAboveBytes: 1 } } }
      expect(shouldVirtualizeTextBuffer(toArrayBuffer(input), context)).toBe(false)
    }
  })

  it('honors a UTF-8 BOM even if later bytes are malformed and preserves default GBK decoding', () => {
    const invalidAfterBom = new Uint8Array([0xef, 0xbb, 0xbf, 0xff])
    expect(resolveFileViewerTextEncoding(invalidAfterBom, 'auto', 'windows-1252')).toEqual({ encoding: 'utf-8', bomLength: 3 })
    expect(decodeFileViewerTextBuffer(invalidAfterBom.buffer, 'auto', 'windows-1252').text).toBe('�')
    const gbk = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4]).buffer
    expect(decodeFileViewerTextBuffer(gbk)).toEqual({ encoding: 'gb18030', text: '中文' })
    expect(decodeFileViewerTextBuffer(gbk, 'gbk', 'windows-1252')).toEqual({ encoding: 'gb18030', text: '中文' })
  })
})

describe.each(SINGLE_BYTE_CASES)('$encoding large-text byte boundaries', ({ encoding, bytes: wordBytes, text: word }) => {
  const mount = async (bytes: Uint8Array) => {
    const dom = new JSDOM('<!doctype html><div id="target"></div>', { pretendToBeVisual: true })
    const target = dom.window.document.getElementById('target') as HTMLDivElement
    const instance = await renderLargeText(toArrayBuffer(bytes), target, 'txt', {
      options: { text: { encoding, maxRenderedLineBytes: 1024 } }
    })
    return { dom, target, instance }
  }

  it('retains every 0x80–0xBF byte on both sides of segment boundaries', async () => {
    const bytes = Uint8Array.from({ length: 3000 }, (_, i) => 0x80 + (i % 64))
    const { dom, target, instance } = await mount(bytes)
    try {
      for (let segment = 0; segment < 3; segment++) {
        const row = target.querySelector<HTMLElement>('.code-virtual-line[data-line="1"]')!
        expect(row).not.toBeNull()
        expect(row.querySelector('.code-virtual-content')?.textContent)
          .toBe(new TextDecoder(encoding).decode(bytes.subarray(segment * 1024, (segment + 1) * 1024)))
        expect(row.querySelector('.code-line-segments span')?.textContent).toBe(`${segment + 1}/3`)
        if (segment < 2) row.querySelector<HTMLButtonElement>('button[data-segment-action="next"]')!.click()
      }
    } finally {
      instance.unmount?.()
      dom.window.close()
    }
  })

  it('finds exactly 200 matches across the 256 KiB search boundary with exact byte offsets', async () => {
    // The first word crosses the primary search chunk boundary. Subsequent
    // high bytes ensure UTF-8 re-encoding cannot accidentally give correct offsets.
    const prefix = new Uint8Array(256 * 1024 - 2).fill(0xab)
    const tail = Array.from({ length: 199 }, () => [0xab, 0xbb, ...wordBytes, 0x0a]).flat()
    const bytes = new Uint8Array([...prefix, ...wordBytes, 0x0a, ...tail])
    const expectedOffsets = [prefix.length, ...Array.from({ length: 199 }, (_, i) => prefix.length + wordBytes.length + 1 + i * (wordBytes.length + 3) + 2)]
    const { dom, target, instance } = await mount(bytes)
    try {
      const provider = findFileViewerSearchProvider(target)!
      expect(provider).not.toBeNull()
      const state = await provider.search(word, { caseSensitive: true })
      expect(state.total).toBe(200)
      expect(state.matches.map(match => ({ line: match.line, text: match.text, byteOffset: (match as typeof match & { byteOffset: number }).byteOffset })))
        .toEqual(expectedOffsets.map((byteOffset, i) => ({ line: i + 1, text: word, byteOffset })))
      expect(target.querySelector('.code-virtual-line--match')?.getAttribute('data-line')).toBe('1')
      const last = await provider.previous()
      expect(last.currentIndex).toBe(199)
      expect(target.querySelector('.code-virtual-line--match')?.getAttribute('data-line')).toBe('200')
      expect(target.querySelector('.code-virtual-line--match .code-virtual-content')?.textContent)
        .toBe(new TextDecoder(encoding).decode(new Uint8Array([0xab, 0xbb, ...wordBytes])))
      expect((await provider.search('unfindable-ascii-control')).total).toBe(0)
    } finally {
      instance.unmount?.()
      dom.window.close()
    }
  })
})
