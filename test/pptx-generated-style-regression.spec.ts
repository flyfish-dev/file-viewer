import { describe, expect, it } from 'vitest'
import {
  genGlobalCSS,
  setTextByPathList,
} from '../packages/renderers/pptx/src/engine/support/vendor'
import { resolveDrawingMlTableGridWidth } from '../packages/renderers/pptx/src/engine/support/layout'
import { convertMetafileToSvg } from '../packages/renderers/pptx/src/engine/support/metafile/vector'

describe('PPTX DrawingML table geometry', () => {
  it('uses the column grid instead of a stale graphic-frame extent', () => {
    expect(resolveDrawingMlTableGridWidth([666750, '1688465', 632460])).toBe(2_987_675)
    expect(resolveDrawingMlTableGridWidth([666750, 'invalid'])).toBeUndefined()
  })
})

describe('PPTX generated style registry', () => {
  it('caches nested resources without extending Object.prototype', () => {
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'set')
    const target: Record<string, unknown> = {}
    const image = 'data:image/png;base64,AA=='

    setTextByPathList(target, ['loaded-images', 'ppt/media/image1.png'], image)

    expect((target['loaded-images'] as Record<string, unknown>)['ppt/media/image1.png']).toBe(image)
    expect(Object.getOwnPropertyDescriptor(Object.prototype, 'set')).toEqual(prototypeDescriptor)
  })

  it('never serializes inherited properties as CSS rules', () => {
    const inheritedKey = '__pptxInheritedStyleForTest__'
    Object.defineProperty(Object.prototype, inheritedKey, {
      value: { name: '_css_inherited', text: 'color:#ff0000;' },
      enumerable: true,
      configurable: true,
      writable: true,
    })

    try {
      expect(genGlobalCSS()).not.toContain('_css_inherited')
      expect(genGlobalCSS()).not.toContain('undefined')
    } finally {
      delete (Object.prototype as Record<string, unknown>)[inheritedKey]
    }
  })

  it('stores prototype-like resource names as ordinary own keys', () => {
    const target: Record<string, unknown> = {}

    setTextByPathList(target, ['loaded-images', '__proto__'], 'cached')

    const cache = target['loaded-images'] as Record<string, unknown>
    expect(Object.getPrototypeOf(cache)).toBeNull()
    expect(Object.prototype.hasOwnProperty.call(cache, '__proto__')).toBe(true)
    expect(cache['__proto__']).toBe('cached')
  })
})

function wmfRecord(type: number, size: number): Buffer {
  const record = Buffer.alloc(size)
  record.writeUInt32LE(size / 2, 0)
  record.writeUInt16LE(type, 4)
  return record
}

function wmfText(spacing: number[] = []): Buffer {
  const bytes = Buffer.from([0xd6, 0xd0, 0xce, 0xc4]) // «中文» in GB2312.
  const record = wmfRecord(0x0a32, 14 + bytes.length + spacing.length * 2)
  record.writeInt16LE(20, 6)
  record.writeInt16LE(10, 8)
  record.writeInt16LE(bytes.length, 10)
  bytes.copy(record, 14)
  spacing.forEach((value, index) => record.writeInt16LE(value, 14 + bytes.length + index * 2))
  return record
}

function wmfFile(...records: Buffer[]): Buffer {
  const header = Buffer.alloc(18)
  header.writeUInt16LE(1, 0)
  header.writeUInt16LE(9, 2)
  header.writeUInt16LE(0x300, 4)
  header.writeUInt16LE(1, 10)
  const font = wmfRecord(0x02fb, 56)
  font.writeInt16LE(-12, 6)
  font.writeUInt8(134, 19)
  return Buffer.concat([header, font, wmfRecord(0x012d, 8), ...records, wmfRecord(0, 6)])
}

function emfRecord(type: number, size: number): Buffer {
  const record = Buffer.alloc(size)
  record.writeUInt32LE(type, 0)
  record.writeUInt32LE(size, 4)
  return record
}

function emfText(text: string, advances: Array<[number, number]> = []): Buffer {
  const string = Buffer.from(text, 'utf16le')
  const stringOffset = 60
  const spacingOffset = stringOffset + Math.ceil(string.length / 4) * 4
  const record = emfRecord(0x54, spacingOffset + advances.length * 8)
  record.writeInt32LE(99, 36)
  record.writeInt32LE(99, 40)
  record.writeUInt32LE(text.length, 44)
  record.writeUInt32LE(stringOffset, 48)
  record.writeUInt32LE(0x0100 | (advances.length ? 0x2000 : 0), 52)
  record.writeUInt32LE(advances.length ? spacingOffset : 0, 56)
  string.copy(record, stringOffset)
  advances.forEach(([x, y], index) => {
    record.writeInt32LE(x, spacingOffset + index * 8)
    record.writeInt32LE(y, spacingOffset + index * 8 + 4)
  })
  return record
}

function svg(mime: 'image/wmf' | 'image/emf', file: Buffer): string {
  const converted = convertMetafileToSvg(mime, file)
  expect(converted?.sourceMime).toBe(mime)
  return new TextDecoder().decode(converted?.bytes)
}

describe('PPTX metafile text positioning', () => {
  it.each([{ spacing: [] }, { spacing: [3, -1] }])('uses natural spacing for multibyte WMF text with Dx $spacing', ({ spacing }) => {
    const output = svg('image/wmf', wmfFile(wmfText(spacing), wmfText([5, -2, 7, 1])))
    expect(output).toMatch(/<text[^>]*>中文<\/text>/)
    expect(output).toContain('<tspan x="10" y="20">中</tspan><tspan x="13" y="20">文</tspan>')
  })

  it.each([
    { family: 'System', input: 'ABC', expected: 'ABC' },
    { family: 'Euclid', input: '„', expected: '„' },
    { family: 'Symbol', input: '\uf041', expected: 'Α' },
    { family: 'Euclid Math Two', input: '\uf084', expected: '≤' },
  ])('decodes $family glyphs without changing text from other fonts', ({ family, input, expected }) => {
    const header = emfRecord(1, 88)
    header.writeInt32LE(100, 16)
    header.writeInt32LE(100, 20)
    const font = emfRecord(82, 332)
    font.writeUInt32LE(1, 8)
    font.writeInt32LE(-12, 12)
    font.write(family, 40, 'utf16le')
    const select = emfRecord(37, 12)
    select.writeUInt32LE(1, 8)
    const output = svg('image/emf', Buffer.concat([header, font, select, emfText(input), emfRecord(14, 20)]))
    expect(output).toContain(`>${expected}</text>`)
  })

  it('uses signed ETO_PDY advances and carries both coordinates into the next EMF text record', () => {
    const header = emfRecord(1, 88)
    header.writeInt32LE(100, 16)
    header.writeInt32LE(100, 20)
    const textAlign = emfRecord(22, 12)
    textAlign.writeUInt32LE(1, 8) // TA_UPDATECP
    const move = emfRecord(27, 16)
    move.writeInt32LE(10, 8)
    move.writeInt32LE(20, 12)
    const transform = emfRecord(35, 32)
    transform.writeFloatLE(1, 8)
    transform.writeFloatLE(0.5, 12)
    transform.writeFloatLE(1, 20)
    const output = svg('image/emf', Buffer.concat([
      header, transform, textAlign, move,
      emfText('ABC', [[12, -5], [6, 7], [1, -4]]), emfText('D'), emfRecord(14, 20),
    ]))
    expect(output).toContain('<tspan x="10" y="25">A</tspan>')
    expect(output).toContain('<tspan x="22" y="26">B</tspan>')
    expect(output).toContain('<tspan x="28" y="36">C</tspan>')
    expect(output).toMatch(/<text x="29" y="32\.5"[^>]*>D<\/text>/)
  })
})
