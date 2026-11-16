import assert from 'node:assert/strict'
import { DOMParser, parseHTML } from 'linkedom'
import JsZip from 'jszip'

const zip = new JsZip()
zip.file('OFD.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" Version="1.2" DocType="OFD">
  <ofd:DocBody><ofd:DocRoot>Doc/Document.xml</ofd:DocRoot></ofd:DocBody>
</ofd:OFD>`)
zip.file('Doc/Document.xml', `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Document xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:CommonData><ofd:PageArea><ofd:PhysicalBox>0 0 100 140</ofd:PhysicalBox></ofd:PageArea></ofd:CommonData>
  <ofd:Pages>${Array.from({ length: 6 }, (_, i) =>
    `<ofd:Page ID="${i + 1}" BaseLoc="Pages/${i + 1}.xml"/>`).join('')}</ofd:Pages>
</ofd:Document>`)
for (let i = 1; i <= 6; i++) {
  zip.file(`Doc/Pages/${i}.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016"><ofd:Content><ofd:Layer ID="${i}"/></ofd:Content></ofd:Page>`)
}

globalThis.DOMParser = DOMParser
const { document, window } = parseHTML('<!doctype html><html><body><div id="outer"><div id="host"></div></div></body></html>')
globalThis.document = document
globalThis.window = window
globalThis.HTMLElement = window.HTMLElement
globalThis.DOMException ||= window.DOMException
const outer = document.getElementById('outer')
const host = document.getElementById('host')
const shadow = host.attachShadow({ mode: 'open' })
const target = document.createElement('div')
shadow.append(target)
let slotClip = null

let mode = 'internal'
let offset = 0
Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 })
window.HTMLElement.prototype.scrollIntoView = function () {}
const rect = (top, height) => ({ top, bottom: top + height, height, left: 0, right: 448, width: 448, x: 0, y: top })
window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.classList?.contains('ofd-page-frame')) {
    return rect(Number(this.dataset.pageIndex || 0) * 160 - offset, 140)
  }
  if (this.classList?.contains('ofd-stage')) return rect(mode === 'internal' ? 0 : -offset, mode === 'internal' ? 300 : 960)
  if (this === document.documentElement && mode === 'root-window') return rect(-offset, 300)
  if (this === document.body && mode === 'body-window') return rect(-offset, 300)
  if (this === document.body && ['body-independent', 'body-contained', 'root-contained'].includes(mode)) return rect(0, 80)
  if (this === slotClip) return rect(0, 80)
  if (this === host && mode === 'nested') return rect(120, 140)
  return rect(0, 300)
}
Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    if (this.classList?.contains('ofd-stage') && mode !== 'internal') return 960
    if (this === slotClip || this === document.body && ['body-independent', 'body-contained', 'root-contained'].includes(mode)) return 80
    return this === host && mode === 'nested' ? 140 : 300
  },
})
Object.defineProperty(window.HTMLElement.prototype, 'clientTop', { configurable: true, get() { return 0 } })
Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() { return this.classList?.contains('ofd-page') ? 390 : 448 },
})
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() { return this.classList?.contains('ofd-page') ? 546 : 300 },
})

const bytes = await zip.generateAsync({ type: 'uint8array' })
const renderOfd = (await import(process.env.OFD_RENDERER_ENTRY || '../dist/ofd.js')).default
const instance = await renderOfd(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), target)
const frames = [...target.querySelectorAll('.ofd-page-frame')]
frames.forEach((frame, index) => { frame.dataset.pageIndex = String(index) })
const current = target.querySelector('.ofd-page-meter strong')
assert.equal(frames.length, 6)
const tick = () => new Promise(resolve => setTimeout(resolve, 10))
const check = async (nextMode, nextOffset, source, expected) => {
  mode = nextMode
  offset = nextOffset
  outer.style.overflowY = nextMode === 'outer' || nextMode === 'nested' ? 'auto' : 'visible'
  host.style.overflowY = nextMode === 'shadow-host' || nextMode === 'nested' ? 'auto' : 'visible'
  document.documentElement.style.overflowY = nextMode === 'root-window' || nextMode === 'body-independent' ? 'auto' : 'visible'
  document.documentElement.style.contain = nextMode === 'root-contained' ? 'layout' : 'none'
  document.body.style.overflowY = ['body-window', 'body-independent', 'body-contained', 'root-contained'].includes(nextMode) ? 'auto' : 'visible'
  document.body.style.contain = nextMode === 'body-contained' ? 'layout' : 'none'
  source.dispatchEvent(new window.Event('scroll'))
  await tick()
  assert.equal(current.textContent, String(expected), `${nextMode} scroll should select visible page ${expected}`)
}

await tick()
assert.equal(current.textContent, '1')
await check('internal', 190, target.querySelector('.ofd-stage'), 3)
await check('outer', 510, outer, 5)
await check('nested', 320, outer, 4)
await check('shadow-host', 350, host, 4)
await check('window', 670, window, 6)
await check('root-window', 670, window, 6)
await check('body-window', 670, window, 6)
await check('body-independent', 350, window, 3)
await check('body-contained', 350, window, 3)
await check('root-contained', 350, window, 3)
await check('outer', 0, outer, 1)
mode = 'outer'
offset = 350
outer.style.overflowY = 'auto'
window.dispatchEvent(new window.Event('resize'))
await tick()
assert.equal(current.textContent, '4', 'viewport resize should refresh the visible page')
mode = 'window'
offset = 670
outer.style.overflowY = 'visible'
instance.$el.__flyfishViewerZoomProvider.setZoom(1.2)
await tick()
assert.equal(current.textContent, '6', 'zoom should refresh the visible page')
instance.unmount()
const last = current.textContent
outer.dispatchEvent(new window.Event('scroll'))
window.dispatchEvent(new window.Event('scroll'))
await tick()
assert.equal(current.textContent, last, 'unmount removes ancestor and window listeners')

// A light-DOM mount can be assigned to a slot inside a scrolling shadow tree.
// linkedom does not implement slot assignment, so supply the browser's
// assignedSlot relationship explicitly while preserving the actual DOM tree.
const slottedHost = document.createElement('div')
document.body.append(slottedHost)
const slottedRoot = slottedHost.attachShadow({ mode: 'open' })
slotClip = document.createElement('div')
slotClip.style.overflowY = 'auto'
const slot = document.createElement('slot')
slot.name = 'viewer'
slotClip.append(slot)
slottedRoot.append(slotClip)
const slottedTarget = document.createElement('div')
slottedTarget.slot = 'viewer'
Object.defineProperty(slottedTarget, 'assignedSlot', { configurable: true, value: slot })
slottedHost.append(slottedTarget)
mode = 'internal'
offset = 0
const slottedInstance = await renderOfd(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), slottedTarget)
const slottedFrames = [...slottedTarget.querySelectorAll('.ofd-page-frame')]
slottedFrames.forEach((frame, index) => { frame.dataset.pageIndex = String(index) })
const slottedCurrent = slottedTarget.querySelector('.ofd-page-meter strong')
await tick()
assert.equal(slottedCurrent.textContent, '1')
mode = 'slot'
offset = 350
slotClip.dispatchEvent(new window.Event('scroll'))
await tick()
assert.equal(slottedCurrent.textContent, '3', 'assigned slot must contribute its scroll event and clipped viewport')
slottedInstance.unmount()
const lastSlottedPage = slottedCurrent.textContent
offset = 670
slotClip.dispatchEvent(new window.Event('scroll'))
await tick()
assert.equal(slottedCurrent.textContent, lastSlottedPage, 'unmount removes slot ancestor listeners')
console.log('verify-issue-463: six-page synthetic stage, root/body window scroll, nested and slotted shadow ancestors, zoom and cleanup OK')
