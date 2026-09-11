import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { JSDOM } from 'jsdom'

// A behavioral release gate: an npm version string alone does not prove that
// the packed browser renderer contains the upstream table-border repair.
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
    const result = {
      package: manifest.name,
      version: manifest.version,
      diagonalCount: 1,
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
