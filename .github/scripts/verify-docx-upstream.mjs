import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { JSDOM } from 'jsdom'

// Verify the installed owning engine, including semantics that must not be
// repaired by File Viewer after rendering.
export async function verifyDocxUpstream(
  root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
) {
  const require = createRequire(resolve(root, 'packages/renderers/word/package.json'))
  const docx = require('@file-viewer/docx')
  const manifest = require('@file-viewer/docx/package.json')
  const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>')
  const names = [
    'window',
    'document',
    'DOMParser',
    'XMLSerializer',
    'Node',
    'HTMLElement',
    'getComputedStyle'
  ]
  const previous = new Map(
    names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  )
  try {
    for (const name of names)
      Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value:
          name === 'getComputedStyle'
            ? dom.window.getComputedStyle.bind(dom.window)
            : dom.window[name]
      })
    const zip = new JSZip()
    zip.file(
      '[Content_Types].xml',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    )
    zip.file(
      '_rels/.rels',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    )
    zip.file(
      'word/document.xml',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tblGrid><w:gridCol w:w="3000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcBorders><w:tl2br w:val="single" w:sz="8" w:color="FF0000"/></w:tcBorders></w:tcPr><w:p><w:r><w:t>UPSTREAM_RELEASE_GATE</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>'
    )
    const host = dom.window.document.getElementById('root')
    await docx.renderAsync(await zip.generateAsync({ type: 'nodebuffer' }), host, null, {
      useWorker: false,
      breakPages: false,
      awaitLayout: false,
      ignoreFonts: true
    })
    assert.match(host.textContent, /UPSTREAM_RELEASE_GATE/)
    const diagonal = host.querySelector('[data-docx-diagonal="tl2br"]')
    assert.ok(
      diagonal,
      `Installed @file-viewer/docx@${manifest.version} lacks the upstream diagonal-border fix. Publish the merged upstream first, then run release:prepare-docx.`
    )
    assert.equal(diagonal.getAttribute('x1'), '0%')
    assert.equal(diagonal.getAttribute('x2'), '100%')
    assert.equal(diagonal.closest('svg').style.pointerEvents, 'none')
    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    const relationshipNamespace =
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    zip.file(
      'word/_rels/document.xml.rels',
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="header" Type="${relationshipNamespace}/header" Target="header.xml"/>
      <Relationship Id="footer" Type="${relationshipNamespace}/footer" Target="footer.xml"/>
      <Relationship Id="external" Type="${relationshipNamespace}/hyperlink" Target="https://example.com/preview" TargetMode="External"/>
    </Relationships>`
    )
    zip.file(
      'word/header.xml',
      `<w:hdr xmlns:w="${wordNamespace}"><w:p><w:r><w:t>NATIVE_HEADER</w:t></w:r></w:p></w:hdr>`
    )
    zip.file(
      'word/footer.xml',
      `<w:ftr xmlns:w="${wordNamespace}"><w:p><w:r><w:t>NATIVE_FOOTER</w:t></w:r></w:p></w:ftr>`
    )
    const body = await zip.file('word/document.xml').async('string')
    zip.file(
      'word/document.xml',
      body
        .replace('<w:document ', `<w:document xmlns:r="${relationshipNamespace}" `)
        .replace(
          '<w:body>',
          '<w:body><w:p><w:hyperlink r:id="external"><w:r><w:t>EXTERNAL_LINK</w:t></w:r></w:hyperlink><w:hyperlink w:anchor="section"><w:r><w:t>INTERNAL_LINK</w:t></w:r></w:hyperlink></w:p>'
        )
        .replace(
          '<w:sectPr/>',
          '<w:sectPr><w:headerReference w:type="default" r:id="header"/><w:footerReference w:type="default" r:id="footer"/></w:sectPr>'
        )
    )
    const bytes = await zip.generateAsync({ type: 'nodebuffer' })
    const parsed = await docx.parseAsync(bytes, { useWorker: false, externalLinkPolicy: 'block' })
    // A missing parsed header root must not discard the valid footer or body.
    const header = parsed.findPartByRelId('header', parsed.documentPart)
    assert.ok(header?.rootElement)
    header.rootElement = undefined
    host.replaceChildren(
      ...(await docx.renderDocument(parsed, {
        externalLinkPolicy: 'block',
        breakPages: false,
        ignoreFonts: true
      }))
    )
    assert.match(host.textContent, /UPSTREAM_RELEASE_GATE/)
    assert.match(host.querySelector('footer')?.textContent || '', /NATIVE_FOOTER/)
    assert.equal(host.querySelector('header'), null)
    const externalLink = () =>
      Array.from(host.querySelectorAll('a')).find((link) => link.textContent === 'EXTERNAL_LINK')
    assert.equal(externalLink()?.hasAttribute('href'), false)
    assert.equal(host.querySelector('a[href="#section"]')?.textContent, 'INTERNAL_LINK')
    await docx.renderAsync(bytes, host, null, {
      useWorker: false,
      awaitLayout: false,
      ignoreFonts: true,
      breakPages: false,
      externalLinkPolicy: 'allow'
    })
    assert.match(host.querySelector('header')?.textContent || '', /NATIVE_HEADER/)
    assert.match(host.querySelector('footer')?.textContent || '', /NATIVE_FOOTER/)
    assert.equal(externalLink()?.getAttribute('href'), 'https://example.com/preview')
    docx.disposeRenderedDocument(host)
    const result = {
      package: manifest.name,
      version: manifest.version,
      diagonalCount: 1,
      nativeHeaderFooter: true,
      nativeHyperlinkPolicy: true,
      passed: true
    }
    console.log('[docx-upstream]', JSON.stringify(result))
    return result
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
    dom.window.close()
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await verifyDocxUpstream()
