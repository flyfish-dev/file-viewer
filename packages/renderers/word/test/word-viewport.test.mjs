import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { clampWordScale, isPositiveFinite, readWordFitViewport } from '../dist/wordViewport.js'

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
