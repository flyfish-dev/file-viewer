import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DOMParser, parseHTML } from 'linkedom'
import JsZip from 'jszip'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturesDir = join(packageDir, 'test', 'fixtures')
const fixturePath = join(fixturesDir, 'pageblock-path.ofd')

const buildMinimalPageBlockOfd = async () => {
  const zip = new JsZip()
  zip.file('OFD.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" Version="1.2" DocType="OFD">
  <ofd:DocBody>
    <ofd:DocInfo><ofd:DocID>pageblock-fixture</ofd:DocID></ofd:DocInfo>
    <ofd:DocRoot>Doc_0/Document.xml</ofd:DocRoot>
  </ofd:DocBody>
</ofd:OFD>`)
  zip.file('Doc_0/Document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Document xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:CommonData>
    <ofd:PageArea><ofd:PhysicalBox>0 0 100 100</ofd:PhysicalBox></ofd:PageArea>
    <ofd:DocumentRes>DocumentRes.xml</ofd:DocumentRes>
  </ofd:CommonData>
  <ofd:Pages><ofd:Page ID="1" BaseLoc="Pages/Page_0/Content.xml"/></ofd:Pages>
</ofd:Document>`)
  zip.file('Doc_0/DocumentRes.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Res xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:DrawParams>
    <ofd:DrawParam ID="1" LineWidth="0.353">
      <ofd:FillColor Value="0 0 0"/>
      <ofd:StrokeColor Value="0 0 0"/>
    </ofd:DrawParam>
  </ofd:DrawParams>
</ofd:Res>`)
  zip.file('Doc_0/Pages/Page_0/Content.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:Content>
    <ofd:Layer Type="Body" ID="2">
      <ofd:PageBlock ID="3">
        <ofd:PathObject ID="4" Boundary="10 10 80 80" Fill="true" Stroke="false" DrawParam="1">
          <ofd:AbbreviatedData>M 0 0 L 80 0 L 80 80 L 0 80 C</ofd:AbbreviatedData>
        </ofd:PathObject>
      </ofd:PageBlock>
    </ofd:Layer>
  </ofd:Content>
</ofd:Page>`)
  // Keep the tracked fixture byte-stable across repeated regression runs.
  for (const entry of Object.values(zip.files)) {
    entry.date = new Date('2026-07-09T06:50:10.000Z')
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

globalThis.DOMParser = DOMParser
const { document, window } = parseHTML('<!doctype html><html><body></body></html>')
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64')
}

const { parseOfdDocument, renderOfd, setPageScale } = await import(
  pathToFileURL(join(packageDir, 'vendor/dltech/ofd/ofd.js')).href
)

const parseOfd = (bytes) =>
  new Promise((resolve, reject) => {
    parseOfdDocument({
      ofd: bytes,
      success: resolve,
      fail: reject,
    })
  })

await mkdir(fixturesDir, { recursive: true })
const fixtureBytes = await buildMinimalPageBlockOfd()
await writeFile(fixturePath, fixtureBytes)

const docs = await parseOfd(fixtureBytes.buffer.slice(fixtureBytes.byteOffset, fixtureBytes.byteOffset + fixtureBytes.byteLength))
const doc = docs[0]
setPageScale(1)
const pageDivs = renderOfd(400, doc)
const page = pageDivs[0]
const svgCount = page.querySelectorAll('svg').length

if (!page || svgCount < 1) {
  throw new Error(`Expected PageBlock path object to render, got svg=${svgCount}`)
}

const externalPath = process.argv[2]
if (externalPath) {
  const { readFile } = await import('node:fs/promises')
  const externalBytes = await readFile(externalPath)
  const externalDocs = await parseOfd(externalBytes.buffer.slice(externalBytes.byteOffset, externalBytes.byteOffset + externalBytes.byteLength))
  const externalPages = renderOfd(800, externalDocs[0])
  const blankPages = externalPages.filter((pageDiv) => pageDiv.childElementCount === 0).length
  if (blankPages > 0) {
    throw new Error(`External OFD still has ${blankPages} blank page(s)`)
  }
  console.log(`verify-pageblock-render: external OFD OK (${externalPages.length} pages)`)
}

console.log('verify-pageblock-render: PageBlock nested path objects render OK')
