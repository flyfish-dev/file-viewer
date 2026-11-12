import assert from 'node:assert/strict'
import { DOMParser, parseHTML } from 'linkedom'
import JsZip from 'jszip'
import { parseOfdDocument, renderOfd } from '../vendor/dltech/ofd/ofd.js'

const { document, window } = parseHTML('<!doctype html><html><body></body></html>')
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
globalThis.DOMParser = DOMParser

const zip = new JsZip()
zip.file('OFD.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" Version="1.2" DocType="OFD">
  <ofd:DocBody><ofd:DocRoot>Doc/Document.xml</ofd:DocRoot></ofd:DocBody>
</ofd:OFD>`)
zip.file('Doc/Document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Document xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:CommonData>
    <ofd:PageArea><ofd:PhysicalBox>0 0 100 100</ofd:PhysicalBox></ofd:PageArea>
    <ofd:DocumentRes>DocumentRes.xml</ofd:DocumentRes>
  </ofd:CommonData>
  <ofd:Pages><ofd:Page ID="1" BaseLoc="Pages/Page.xml"/></ofd:Pages>
</ofd:Document>`)
zip.file('Doc/DocumentRes.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Res xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:DrawParams>
    <ofd:DrawParam ID="1" Relative="2"><ofd:FillColor Value="255 0 0"/></ofd:DrawParam>
    <ofd:DrawParam ID="2" Relative="3" LineWidth="1.5"/>
    <ofd:DrawParam ID="3"><ofd:StrokeColor Value="0 128 0"/></ofd:DrawParam>
  </ofd:DrawParams>
</ofd:Res>`)
const textObject = (text, attrs = '', children = '', drawParam = '1') =>
  `<ofd:TextObject Boundary="0 0 20 8" Font="0" Size="4" ${drawParam ? `DrawParam="${drawParam}"` : ''} ${attrs}>${children}<ofd:TextCode X="1" Y="5">${text}</ofd:TextCode></ofd:TextObject>`
zip.file('Doc/Pages/Page.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016"><ofd:Content><ofd:Layer ID="1">
  <ofd:PathObject ID="6" Boundary="0 0 10 10" DrawParam="1" Fill="true" Stroke="true">
    <ofd:AbbreviatedData>M 0 0 L 10 10</ofd:AbbreviatedData>
  </ofd:PathObject>
  ${textObject('A', 'Fill="false" Stroke="true"')}
  ${textObject('B', 'Fill="true" Stroke="false"')}
  ${textObject('C', 'Fill="false" Stroke="false"')}
  ${textObject('D')}
  ${textObject('E', 'Fill="0" Stroke="1"', '<ofd:StrokeColor Value="0 0 255" Alpha="0"/>')}
  ${textObject('F', '', '<ofd:StrokeColor Value="0 0 255"/>', null)}
  ${textObject('G', 'Stroke="false"', '<ofd:StrokeColor Value="0 0 255"/>', null)}
  ${textObject('H', 'Stroke="true" LineWidth="2"')}
  ${textObject('I', 'Fill="false" Stroke="true"', '<ofd:StrokeColor Value="0 0 255" Alpha="1"/>')}
  ${textObject('J', 'Fill="false" Stroke="true"', '<ofd:StrokeColor Value="0 0 255" Alpha="255"/>')}
</ofd:Layer></ofd:Content></ofd:Page>`)

const bytes = await zip.generateAsync({ type: 'uint8array' })
const ofd = await new Promise((resolve, reject) => {
  parseOfdDocument({
    ofd: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    success: resolve,
    fail: reject,
  })
})
const page = renderOfd(400, ofd[0])[0]
const pathStyle = page.querySelector('svg path').getAttribute('style')
assert.match(pathStyle, /fill:rgb\(255, 0, 0\)/)
assert.match(pathStyle, /stroke:rgb\(0, 128, 0\)/)
const texts = new Map(Array.from(page.querySelectorAll('svg text'), node => [node.textContent, node]))
assert.equal(texts.size, 10)
const paint = key => ({ fill: texts.get(key).getAttribute('fill'), stroke: texts.get(key).getAttribute('stroke') })
assert.deepEqual(paint('A'), { fill: 'none', stroke: 'rgb(0, 128, 0)' })
assert.equal(Number(texts.get('A').getAttribute('stroke-width')), 1.5 * 3.9)
assert.equal(texts.get('A').getAttribute('stroke-opacity'), '1')
assert.deepEqual(paint('B'), { fill: 'rgb(255, 0, 0)', stroke: null })
assert.deepEqual(paint('C'), { fill: 'none', stroke: null })
assert.deepEqual(paint('D'), { fill: 'rgb(255, 0, 0)', stroke: null })
assert.deepEqual(paint('E'), { fill: 'none', stroke: 'rgb(0, 0, 255)' })
assert.equal(texts.get('E').getAttribute('stroke-opacity'), '0')
assert.deepEqual(paint('F'), { fill: 'rgb(0, 0, 0)', stroke: null })
assert.deepEqual(paint('G'), { fill: 'rgb(0, 0, 0)', stroke: null })
assert.deepEqual(paint('H'), { fill: 'rgb(255, 0, 0)', stroke: 'rgb(0, 128, 0)' })
assert.equal(Number(texts.get('H').getAttribute('stroke-width')), 2 * 3.9)
assert.equal(Number(texts.get('I').getAttribute('stroke-opacity')), 1 / 255)
assert.equal(texts.get('J').getAttribute('stroke-opacity'), '1')
console.log('verify-text-paint: ten parsed text combinations and inherited path colors OK')
