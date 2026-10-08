import assert from 'node:assert/strict'

// Deliberately authored byte/Unicode pairs, not output from the decoder under test.
export const encodings = [
  // WHATWG's ISO-8859-1 label uses Windows-1252, including the C1 byte range.
  { encoding: 'iso-8859-1', bytes: [0xe9, 0xe4, 0xf1, 0xbf, 0xa3, 0x80, 0x93, 0x94, 0x9f], text: 'éäñ¿£€“”Ÿ' },
  { encoding: 'iso-8859-2', bytes: [0xa1, 0xb1, 0xa3, 0xb3, 0xc8, 0xe8], text: 'ĄąŁłČč' },
  { encoding: 'iso-8859-15', bytes: [0xa4, 0xa6, 0xa8, 0xb4, 0xb8, 0xbc, 0xbd, 0xbe], text: '€ŠšŽžŒœŸ' },
  { encoding: 'windows-1250', bytes: [0xa5, 0xb9, 0xa3, 0xb3, 0x8a, 0x9a, 0x80], text: 'ĄąŁłŠš€' },
  { encoding: 'windows-1251', bytes: [0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2, 0x80, 0xc0], text: 'ПриветЂА' },
  { encoding: 'windows-1252', bytes: [0x80, 0x93, 0x94, 0x96, 0xe9, 0x9f], text: '€“”–éŸ' }
]

export const paths = ['code', 'markdown', 'html', 'xml', 'patch', 'largeText', 'lrc']
export const segmentBytes = 1024
export const searchRowBytes = 4096
export const searchMatchOffset = 2048
export const searchMatchCount = 200

const templates = {
  code: 'first @@TEXT@@ last\nsecond line',
  markdown: '# Encoding\n\n@@TEXT@@\n\n```js\nconst encoded = true\n```\n',
  html: '<!doctype html><html><body><p id="encoded">@@TEXT@@</p></body></html>',
  xml: '<?xml version="1.0"?><sample>@@TEXT@@</sample>',
  patch: 'diff --git a/value.txt b/value.txt\n--- a/value.txt\n+++ b/value.txt\n@@ -1 +1 @@\n-before\n+@@TEXT@@\n',
  largeText: 'first @@TEXT@@ last\nsecond line',
  lrc: '[ti:Encoding]\n[00:01.00]@@TEXT@@\n[00:02.00]second line'
}

export const renderFixture = (path, fixture) => {
  const [before, after] = templates[path].split('@@TEXT@@')
  const source = before + fixture.text + after
  return {
    source,
    bytes: fixture.encode
      ? Array.from(fixture.encode(source))
      : [...Buffer.from(before, 'ascii'), ...fixture.bytes, ...Buffer.from(after, 'ascii')]
  }
}

export const segmentationFixture = encoding => {
  const bytes = new Uint8Array(64 * segmentBytes).fill(0x78)
  for (let index = 0; index < 64; index++) bytes[index * segmentBytes] = 0x80 + index
  // Native decoding supplies a boundary-independent oracle for preserving every
  // byte. The authored pairs above separately check the chosen character set.
  const text = new TextDecoder(encoding).decode(bytes)
  return { bytes: Array.from(bytes), text }
}

export const searchFixture = fixture => {
  const queryBytes = [...fixture.bytes, ...Buffer.from(' NEEDLE', 'ascii')]
  const bytes = new Uint8Array(searchMatchCount * searchRowBytes).fill(0x78)
  for (let row = 0; row < searchMatchCount; row++) {
    // Every 256 KiB search chunk starts on 0x80, which UTF-8 alignment would skip.
    bytes[row * searchRowBytes] = 0x80
    bytes.set(queryBytes, row * searchRowBytes + searchMatchOffset)
    bytes[(row + 1) * searchRowBytes - 1] = 0x0a
  }
  return {
    bytes: Array.from(bytes),
    query: fixture.text + ' NEEDLE',
    expectedSegment: fixture.text + ' NEEDLE' + 'x'.repeat(segmentBytes - queryBytes.length),
    offsets: Array.from({ length: searchMatchCount }, (_, row) => row * searchRowBytes + searchMatchOffset)
  }
}

export const crossingFixture = fixture => {
  const queryBytes = [...fixture.bytes, ...Buffer.from(' CROSSING', 'ascii')]
  const offset = 256 * 1024 - 2
  const bytes = new Uint8Array(offset + queryBytes.length + 20).fill(0x78)
  bytes.set(queryBytes, offset)
  return { bytes: Array.from(bytes), offset, query: fixture.text + ' CROSSING' }
}

const utf16 = (source, littleEndian, bom) => {
  const bytes = new Uint8Array(source.length * 2 + (bom ? 2 : 0))
  const view = new DataView(bytes.buffer)
  if (bom) view.setUint16(0, 0xfeff, littleEndian)
  for (let index = 0; index < source.length; index++) {
    view.setUint16((bom ? 2 : 0) + index * 2, source.charCodeAt(index), littleEndian)
  }
  return bytes
}

export const controls = [
  { name: 'default GB18030', resolvedEncoding: 'gb18030', bytes: [0xd6, 0xd0, 0xce, 0xc4], text: '中文', options: {} },
  { name: 'explicit GB18030 beats fallback', resolvedEncoding: 'gb18030', bytes: [0xd6, 0xd0, 0xce, 0xc4], text: '中文', options: { encoding: 'gb18030', fallbackEncoding: 'windows-1252' } },
  { name: 'explicit Windows-1252 beats UTF-8 detection', resolvedEncoding: 'windows-1252', bytes: [0x63, 0x61, 0x66, 0xc3, 0xa9], text: 'cafÃ©', options: { encoding: 'windows-1252', fallbackEncoding: 'gb18030' } },
  { name: 'valid UTF-8 beats fallback', resolvedEncoding: 'utf-8', text: 'Grüße 中文', encode: source => new TextEncoder().encode(source) },
  { name: 'UTF-8 BOM beats fallback', resolvedEncoding: 'utf-8', text: 'Grüße 中文', encode: source => new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(source)]) },
  { name: 'UTF-16LE BOM beats fallback', resolvedEncoding: 'utf-16le', text: 'Grüße 中文', encode: source => utf16(source, true, true), utf16: true },
  { name: 'UTF-16BE BOM beats fallback', resolvedEncoding: 'utf-16be', text: 'Grüße 中文', encode: source => utf16(source, false, true), utf16: true },
  { name: 'UTF-16LE sniffing beats fallback', resolvedEncoding: 'utf-16le', text: 'Grüße', encode: source => utf16(source, true, false), utf16: true },
  { name: 'UTF-16BE sniffing beats fallback', resolvedEncoding: 'utf-16be', text: 'Grüße', encode: source => utf16(source, false, false), utf16: true }
]

export function validateFixtures() {
  for (const fixture of encodings) {
    assert.equal(new TextDecoder(fixture.encoding).decode(new Uint8Array(fixture.bytes)), fixture.text)
    for (const path of paths) {
      const value = renderFixture(path, fixture)
      assert.equal(new TextDecoder(fixture.encoding).decode(new Uint8Array(value.bytes)), value.source)
    }
    const segmented = segmentationFixture(fixture.encoding)
    assert.equal(segmented.bytes.length, 64 * segmentBytes)
    assert.equal(segmented.text.length, segmented.bytes.length)
    for (let index = 0; index < 64; index++) assert.equal(segmented.bytes[index * segmentBytes], 0x80 + index)
    const search = searchFixture(fixture)
    const decoded = new TextDecoder(fixture.encoding).decode(new Uint8Array(search.bytes))
    assert.equal(decoded.split(search.query).length - 1, searchMatchCount)
    for (const offset of search.offsets) assert.equal(decoded.slice(offset, offset + search.query.length), search.query)
    const crossing = crossingFixture(fixture)
    assert.equal(new TextDecoder(fixture.encoding).decode(new Uint8Array(crossing.bytes)).indexOf(crossing.query), crossing.offset)
  }
  for (const fixture of controls) {
    for (const path of paths) {
      const { bytes, source } = renderFixture(path, fixture)
      assert.equal(new TextDecoder(fixture.resolvedEncoding).decode(new Uint8Array(bytes)), source, `${fixture.name}/${path}`)
    }
  }
}
