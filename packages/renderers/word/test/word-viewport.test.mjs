import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { clampWordScale, isPositiveFinite, readWordFitViewport } from '../dist/wordViewport.js'
import { mountWordDocument } from '../dist/wordDoc.js'

for (const value of [NaN, Infinity, -Infinity, 0, -1]) {
  test(`invalid positive dimension/scale: ${value}`, () => assert.equal(isPositiveFinite(value), false))
}
test('scale clamp retains fractions and bounds the final scale only', () => {
  for (const scale of [0.333333333333, 0.8812345, 1, 3]) assert.equal(clampWordScale(scale, 0.24, 3), scale)
  assert.equal(clampWordScale(0.01, 0.24, 3), 0.24)
  assert.equal(clampWordScale(12.5 * 0.24, 0.24, 3), 3)
})
function withTarget(fn) {
  const dom = new JSDOM('<div></div>')
  const target = dom.window.document.querySelector('div')
  let width = 300, height = 600
  Object.defineProperties(target, { clientWidth: { get: () => width }, clientHeight: { get: () => height } })
  try { fn(target, (w, h) => { width = w; height = h }) } finally { dom.window.close() }
}
test('explicit fractional dimensions are preserved', () => withTarget(target => {
  assert.deepEqual(readWordFitViewport(target, { viewportWidth: 250.5, viewportHeight: 500.25 }), { width: 250.5, height: 500.25 })
}))
test('omitted dimensions retain the legacy measurable-host fallback', () => withTarget(target => {
  assert.deepEqual(readWordFitViewport(target, {}), { width: 300, height: 600 })
}))
for (const dimension of ['viewportWidth', 'viewportHeight']) {
  test(`invalid explicit ${dimension} does not use host fallback`, () => withTarget(target => {
    for (const value of [0, -1, NaN, Infinity]) assert.equal(readWordFitViewport(target, { viewportWidth: 300, viewportHeight: 600, [dimension]: value }), null)
  }))
}
test('hidden host does not pass on requested dimensions alone', () => withTarget((target, resize) => {
  for (const [w, h] of [[0, 0], [0, 600], [300, 0]]) {
    resize(w, h)
    assert.equal(readWordFitViewport(target, { viewportWidth: 300, viewportHeight: 600 }), null)
  }
  resize(300, 600)
  assert.deepEqual(readWordFitViewport(target, { viewportWidth: 300, viewportHeight: 600 }), { width: 300, height: 600 })
}))

test('authored DOC pages preserve geometry, nested content, export and cleanup', () => {
  const dom = new JSDOM('<div id="target"></div>', { pretendToBeVisual: true })
  const target = dom.window.document.querySelector('#target')
  Object.defineProperty(target, 'clientWidth', { value: 1000 })
  let adapter
  try {
    const page = { width: 816, height: 1056, html: '<section class="msdoc-layout-page"><div class="msdoc-textbox"><p>Floating content</p></div><div>Main content</div></section>' }
    const instance = mountWordDocument({ html: page.html, css: '', layoutPages: [page] }, target, {
      registerExportAdapter: value => { adapter = value }
    })
    assert.equal(target.querySelectorAll('.msdoc-page').length, 1)
    assert.equal(target.querySelector('.msdoc-page').dataset.msdocPageWidth, '816')
    assert.equal(target.querySelector('.msdoc-root').style.padding, '0px')
    assert.equal(target.querySelector('.msdoc-root').style.width, '816px')
    assert.equal(target.querySelector('.msdoc-page').style.height, '1056px')
    assert.equal(target.textContent.split('Floating content').length - 1, 1)
    assert.match(adapter.printStyle(), /width:\s*816px!important/)
    assert.match(adapter.printStyle(), /min-height:1056px!important/)
    const clone = new JSDOM(adapter.toHtml()).window.document
    assert.equal(clone.querySelector('.msdoc-root').style.width, '816px')
    assert.equal(clone.querySelector('.msdoc-root').style.minHeight, '1056px')
    assert.equal(clone.querySelector('.msdoc-root').style.padding, '0px')
    assert.equal(clone.querySelectorAll('.msdoc-textbox').length, 1)
    clone.defaultView.close()
    instance.unmount()
    assert.equal(adapter, null)
    assert.equal(target.childNodes.length, 0)
  } finally { dom.window.close() }
})
