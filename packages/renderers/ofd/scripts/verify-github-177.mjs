import { DOMParser, parseHTML } from 'linkedom'
import JsZip from 'jszip'

const buildMultiPageOfd = async () => {
  const zip = new JsZip()
  zip.file('OFD.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" Version="1.2" DocType="OFD">
  <ofd:DocBody><ofd:DocInfo><ofd:DocID>github-177</ofd:DocID></ofd:DocInfo><ofd:DocRoot>Doc_0/Document.xml</ofd:DocRoot></ofd:DocBody>
</ofd:OFD>`)
  zip.file('Doc_0/Document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Document xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:CommonData><ofd:PageArea><ofd:PhysicalBox>0 0 100 140</ofd:PhysicalBox></ofd:PageArea></ofd:CommonData>
  <ofd:Pages>
    <ofd:Page ID="1" BaseLoc="Pages/Page_0/Content.xml"/>
    <ofd:Page ID="2" BaseLoc="Pages/Page_1/Content.xml"/>
    <ofd:Page ID="3" BaseLoc="Pages/Page_2/Content.xml"/>
  </ofd:Pages>
</ofd:Document>`)
  for (let index = 0; index < 3; index += 1) {
    zip.file(`Doc_0/Pages/Page_${index}/Content.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016"><ofd:Content><ofd:Layer ID="${index + 10}" Type="Body"><ofd:PathObject ID="${index + 20}" Boundary="10 10 30 30" Fill="true" Stroke="false"><ofd:FillColor Value="${index * 60} 80 160"/><ofd:AbbreviatedData>M 0 0 L 30 0 L 30 30 L 0 30 C</ofd:AbbreviatedData></ofd:PathObject></ofd:Layer></ofd:Content></ofd:Page>`)
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

globalThis.DOMParser = DOMParser
const { document, window } = parseHTML('<!doctype html><html><body><div id="target"></div></body></html>')
globalThis.document = document
globalThis.window = window
globalThis.HTMLElement = window.HTMLElement
globalThis.DOMException ||= window.DOMException
if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64')
}

let scrolledFrame = null
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
  // The harness records the exact frame selected by renderer navigation.
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  scrolledFrame = this
}
window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const pageIndex = Number(this.dataset?.pageIndex || 0)
  return { x: 0, y: pageIndex * 160, top: pageIndex * 160, left: 0, right: 400, bottom: pageIndex * 160 + 140, width: 400, height: 140, toJSON() { return this } }
}
Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.classList?.contains('ofd-page') ? 390 : 400 } })
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.classList?.contains('ofd-page') ? 546 : 600 } })
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 600 } })

const target = document.getElementById('target')
target.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 448, bottom: 700, width: 448, height: 700, toJSON() { return this } })
const bytes = await buildMultiPageOfd()
const renderOfd = (await import('../dist/ofd.js')).default
const instance = await renderOfd(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), target, {
  options: { locale: 'zh-CN' }
})

const frames = Array.from(target.querySelectorAll('.ofd-page-frame'))
frames.forEach((frame, index) => { frame.dataset.pageIndex = String(index) })
const buttons = Array.from(target.querySelectorAll('.ofd-page-button'))
const previous = buttons[0]
const next = buttons[1]
const current = target.querySelector('.ofd-page-meter strong')
const total = target.querySelector('.ofd-page-meter span')

if (frames.length !== 3 || current?.textContent !== '1' || total?.textContent !== '/ 3') {
  throw new Error(`Expected initial 1 / 3 navigation state, got frames=${frames.length}, current=${current?.textContent}, total=${total?.textContent}`)
}
if (!previous.disabled || next.disabled) {
  throw new Error('Expected previous disabled and next enabled on the first page')
}
next.click()
if (current.textContent !== '2' || scrolledFrame !== frames[1]) {
  throw new Error('Next-page navigation did not activate and scroll to page 2')
}
next.click()
if (current.textContent !== '3' || !next.disabled || scrolledFrame !== frames[2]) {
  throw new Error('Next-page navigation did not clamp and disable at page 3')
}
previous.click()
if (current.textContent !== '2' || scrolledFrame !== frames[1]) {
  throw new Error('Previous-page navigation did not return to page 2')
}

instance.unmount()
console.log('[ofd] GitHub #177 previous/next controls and page counter work across three pages.')
