import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import JSZip from 'jszip'
import { resolveFileViewerWordContainer } from '../dist/index.js'
import { convertWordMlToDocx } from '../dist/wordMl.js'

const ns = 'http://schemas.microsoft.com/office/word/2003/wordml'
const wn = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const bytes = text => new TextEncoder().encode(text).buffer
const xml = body => `<w:wordDocument xmlns:w="${ns}" xmlns:wx="http://schemas.microsoft.com/office/word/2003/auxHint" xmlns:v="urn:schemas-microsoft-com:vml">${body}</w:wordDocument>`
const paragraph = '<w:p><w:r><w:t xml:space="preserve">  Example &amp; text  </w:t></w:r></w:p>'
const document = xml(`<w:body><wx:sect>${paragraph}<w:sectPr><w:ftr w:type="odd">${paragraph}</w:ftr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></wx:sect></w:body>`)

async function convert(source) {
  const dom = new JSDOM('<div id="target"></div>')
  try { return await JSZip.loadAsync(await convertWordMlToDocx(source, dom.window.document.querySelector('#target'))) }
  finally { dom.window.close() }
}

test('Word container routing preserves ZIP and OLE and recognizes UTF-8/UTF-16 WordML', () => {
  assert.equal(resolveFileViewerWordContainer(new Uint8Array([0x50, 0x4b]).buffer), 'openxml')
  assert.equal(resolveFileViewerWordContainer(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]).buffer), 'binary')
  assert.equal(resolveFileViewerWordContainer(new ArrayBuffer(0)), 'binary')
  for (const text of [document, '\ufeff' + document]) assert.equal(resolveFileViewerWordContainer(bytes(text)), 'wordml')
  for (const bigEndian of [false, true]) {
    const encoded = Buffer.from('\ufeff' + document, 'utf16le')
    if (bigEndian) encoded.swap16()
    assert.equal(resolveFileViewerWordContainer(encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)), 'wordml')
  }
  assert.equal(resolveFileViewerWordContainer(bytes('<Error>download denied</Error>')), 'binary')
})

test('WordML becomes a package with local header/footer relationships, styles and preserved whitespace', async () => {
  const file = await convert(bytes(document))
  const main = await file.file('word/document.xml').async('string')
  const footer = await file.file('word/footer1.xml').async('string')
  assert.ok(main.includes(wn))
  assert.ok(!main.includes(ns))
  assert.match(main, /footerReference/)
  assert.match(main, /w:type="default"/)
  assert.match(footer, /  Example &amp; text  /)
  assert.match(main, /w:pgSz/)
  assert.ok(!main.includes('wx:sect'))
  assert.match(await file.file('word/_rels/document.xml.rels').async('string'), /Target="footer1.xml"/)
  assert.match(await file.file('[Content_Types].xml').async('string'), /wordprocessingml.footer\+xml/)
})

test('multiple WordML sections, tables and property aliases retain structure', async () => {
  const file = await convert(bytes(xml(`<w:styles><w:style w:type="paragraph" w:styleId="Normal"><w:rPr><w:rFonts w:h-ansi="Arial" w:fareast="SimSun"/><w:sz-cs w:val="24"/></w:rPr></w:style></w:styles><w:body><wx:sect>${paragraph}<w:sectPr><w:pgSz w:w="12000"/></w:sectPr></wx:sect><wx:sect><w:tbl><w:tr><w:tc><w:tcPr><w:tcBorders><w:top w:val="single"/></w:tcBorders></w:tcPr>${paragraph}</w:tc></w:tr></w:tbl><w:sectPr/></wx:sect></w:body>`)))
  const main = await file.file('word/document.xml').async('string')
  const dom = new JSDOM(main, { contentType: 'application/xml' })
  const body = dom.window.document.getElementsByTagNameNS(wn, 'body')[0]
  assert.equal(Array.from(body.children).filter(n => n.localName === 'sectPr').length, 1)
  assert.equal(body.getElementsByTagNameNS(wn, 'sectPr').length, 2)
  assert.equal(body.getElementsByTagNameNS(wn, 'tcBorders').length, 1)
  dom.window.close()
  const styles = await file.file('word/styles.xml').async('string')
  assert.match(styles, /w:hAnsi="Arial"/)
  assert.match(styles, /w:eastAsia="SimSun"/)
  assert.match(styles, /w:szCs/)
})

test('WordML embedded images use local package relationships, never external image URLs', async () => {
  const file = await convert(bytes(xml(`<w:body><w:p><w:r><w:pict><w:binData w:name="wordml://a.png">AQID</w:binData><v:shape><v:imagedata src="wordml://a.png"/></v:shape><v:shape><v:imagedata src="https://example.invalid/private.png"/></v:shape></w:pict></w:r></w:p></w:body>`)))
  assert.deepEqual(Array.from(await file.file('word/media/image1.png').async('uint8array')), [1, 2, 3])
  const main = await file.file('word/document.xml').async('string')
  assert.match(main, /r:id="rId1"/)
  assert.ok(!main.includes('https://example.invalid'))
  assert.ok(!main.includes('binData'))
  assert.match(await file.file('word/_rels/document.xml.rels').async('string'), /Target="media\/image1.png"/)
})

test('WordML rejects DTDs, malformed XML, unrelated documents and excessive nesting', async () => {
  for (const source of ['<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///secret">]>' + document, '<wordDocument/>', document.slice(0, -20), xml('<w:body>' + '<w:p>'.repeat(260) + '</w:p>'.repeat(260) + '</w:body>')]) {
    await assert.rejects(convert(bytes(source)))
  }
})
