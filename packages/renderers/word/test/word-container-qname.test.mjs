import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveWordContainer } from '../dist/wordContainer.js'

const namespace = 'http://schemas.microsoft.com/office/word/2003/wordml'
const classify = source => resolveWordContainer(new TextEncoder().encode(source).buffer)

test('XML 1.0 QName range endpoints are accepted as prefixes and attributes', () => {
  const ranges = [
    [0x41, 0x5a], [0x5f, 0x5f], [0x61, 0x7a], [0xc0, 0xd6],
    [0xd8, 0xf6], [0xf8, 0x2ff], [0x370, 0x37d], [0x37f, 0x1fff],
    [0x200c, 0x200d], [0x2070, 0x218f], [0x2c00, 0x2fef],
    [0x3001, 0xd7ff], [0xf900, 0xfdcf], [0xfdf0, 0xfffd], [0x10000, 0xeffff],
  ]
  for (const point of new Set(ranges.flat())) {
    const name = String.fromCodePoint(point)
    assert.equal(classify(`<${name}:wordDocument ${name}="value" xmlns:${name}="${namespace}"/>`), 'wordml', point.toString(16))
  }
  for (const point of [0x2d, 0x2e, 0x30, 0x39, 0xb7, 0x300, 0x36f, 0x203f, 0x2040]) {
    const name = `w${String.fromCodePoint(point)}`
    assert.equal(classify(`<${name}:wordDocument ${name}="value" xmlns:${name}="${namespace}"/>`), 'wordml', point.toString(16))
  }
})

test('characters outside XML 1.0 name ranges cannot establish a WordML root', () => {
  for (const point of [0x30, 0xb7, 0xd7, 0xf7, 0x300, 0x36f, 0x37e, 0x2000, 0x200b, 0x200e, 0x206f, 0x2190, 0x2bff, 0x2ff0, 0x3000, 0xf8ff, 0xfdd0, 0xfdef, 0xfffe, 0xffff, 0xf0000]) {
    const name = String.fromCodePoint(point)
    assert.equal(classify(`<${name}:wordDocument xmlns:${name}="${namespace}"/>`), 'binary', point.toString(16))
    assert.equal(classify(`<w:wordDocument ${name}="value" xmlns:w="${namespace}"/>`), 'binary', point.toString(16))
  }
  for (const name of ['a:b:c', ':name', 'name:', 'a!b']) {
    assert.equal(classify(`<w:wordDocument ${name}="value" xmlns:w="${namespace}"/>`), 'binary', name)
  }
  assert.equal(classify(`<w:wordDocument note="a<b" xmlns:w="${namespace}"/>`), 'binary')
})

test('XML declarations control legacy decoding and unsupported labels do not claim WordML', () => {
  for (const [encoding, attributes] of [['windows-1252', 'é="1" à="2"'], ['ISO-8859-1', 'øø="1" þþ="2"']]) {
    const bytes = Buffer.from(`<?xml version="1.0" encoding="${encoding}"?><w:wordDocument ${attributes} xmlns:w="${namespace}"/>`, 'latin1')
    assert.equal(resolveWordContainer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), 'wordml', encoding)
  }
  assert.equal(classify(`<?xml version="1.0" encoding="unsupported-encoding"?><w:wordDocument xmlns:w="${namespace}"/>`), 'binary')
})

test('a partial UTF-8 tail does not change the decoding of the root names', () => {
  const header = `<w:wordDocument a\u200c="1" a\u200d="2" xmlns:w="${namespace}"><w:body>`
  const source = header + 'a'.repeat(65535 - Buffer.byteLength(header)) + 'é</w:body></w:wordDocument>'
  assert.equal(classify(source), 'wordml')
})
