import assert from 'node:assert/strict'
import { DOMParser, parseHTML } from 'linkedom'
import JSZip from 'jszip'
import { calTextPoint, converterDpi, deltaFormatter, setPageScal } from '../vendor/dltech/ofd/ofd_util.js'

assert.deepEqual(deltaFormatter('g 3 2.5  4\n-1'), [2.5, 2.5, 2.5, 4, -1])
assert.deepEqual(deltaFormatter('g 1000000000 1', 3), [1, 1, 1])
assert.deepEqual(deltaFormatter('g -1 4'), [])
assert.deepEqual(deltaFormatter('g 2'), [])
assert.deepEqual(deltaFormatter('Infinity'), [])
setPageScal(1)
const runs = calTextPoint([
  { '@_X': '10', '@_Y': '20', '@_DeltaX': 'g 2 5', '#text': ' A中' },
  { '@_X': '50', '@_Y': '20', '#text': 'B' },
  { '@_X': '0', '@_Y': '0', '@_DeltaX': '7', '@_DeltaY': '3', '#text': '😀Z' },
])
assert.equal(runs.length, 3, 'Independent TextCodes on the same baseline must not be concatenated')
assert.equal(runs[0].text, ' A中')
assert.deepEqual(runs[0].xPositions, [10, 15, 20].map(converterDpi))
assert.deepEqual(runs[1].xPositions, [converterDpi(50)])
assert.equal(runs[2].xPositions.length, 2, 'Unicode codepoints must not be indexed as UTF-16 code units')
assert.deepEqual(runs[2].yPositions, [0, 3].map(converterDpi))
assert.ok(calTextPoint([{ '@_X': 'Infinity', '#text': 'A' }])[0].xPositions.every(Number.isFinite))

const { document, window } = parseHTML('<html><body></body></html>')
globalThis.DOMParser = DOMParser
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
const { parseOfdDocument, renderOfd } = await import('../vendor/dltech/ofd/ofd.js')
const zip = new JSZip()
const ns = 'xmlns:ofd="http://www.ofdspec.org/2016"'
zip.file('OFD.xml', `<ofd:OFD ${ns}><ofd:DocBody><ofd:DocRoot>Doc/Document.xml</ofd:DocRoot></ofd:DocBody></ofd:OFD>`)
zip.file('Doc/Document.xml', `<ofd:Document ${ns}><ofd:CommonData><ofd:PageArea><ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox></ofd:PageArea></ofd:CommonData><ofd:Pages><ofd:Page ID="1" BaseLoc="Page.xml"/></ofd:Pages></ofd:Document>`)
const date = ' '.repeat(22) + '2025'
zip.file('Doc/Page.xml', `<ofd:Page ${ns}><ofd:Content><ofd:Layer ID="1"><ofd:TextObject ID="2" Boundary="20 250 170 12" Font="0" Size="4"><ofd:TextCode X="0" Y="4" DeltaX="g 25 2">${date}</ofd:TextCode><ofd:TextCode X="60" Y="4"> DATE</ofd:TextCode></ofd:TextObject></ofd:Layer></ofd:Content></ofd:Page>`)
const bytes = await zip.generateAsync({ type: 'arraybuffer' })
const docs = await new Promise((resolve, reject) => parseOfdDocument({ ofd: bytes, success: resolve, fail: reject }))
const page = renderOfd(850, docs[0])[0]
const nodes = Array.from(page.querySelectorAll('text'))
assert.equal(nodes.length, 2)
assert.equal(nodes[0].textContent, date, 'XML parser must retain leading TextCode whitespace')
assert.equal(nodes[0].getAttribute('xml:space'), 'preserve')
assert.match(nodes[0].getAttribute('style'), /white-space:pre/)
const xs = nodes[0].getAttribute('x').split(/\s+/).map(Number)
assert.equal(xs.length, 26)
assert.ok(xs[22] > xs[0] + 100, 'The first digit must follow all 22 authored space advances')
assert.equal(nodes[1].textContent, ' DATE')
console.log('[ofd] #266 whitespace, independent runs, explicit X/Y advances, Unicode and bounded delta regression passed.')
