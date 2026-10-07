import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { readDocxFlowPaperHeight } from '../dist/docxExport.js'

function run(fn) {
  const dom = new JSDOM('<section class="docx"></section>')
  try { fn(dom.window.document, dom.window.document.querySelector('section')) }
  finally { dom.window.close() }
}

test('flow paper height comes from the unscaled minimum, not tall content or A4 fallback', () => run((d, root) => {
  root.style.cssText = 'min-height:1056px;height:2800px;transform:scale(.5)'
  assert.equal(readDocxFlowPaperHeight(root, 1123), 1056)
  root.style.minHeight = '720px'
  assert.equal(readDocxFlowPaperHeight(root, 1123), 720)
}))

test('unmeasurable flow paper lengths use the caller fallback without guessing', () => run((d, root) => {
  for (const value of ['auto', '0px', '50%']) {
    root.style.minHeight = value
    assert.equal(readDocxFlowPaperHeight(root, 1123), 1123)
  }
  assert.equal(readDocxFlowPaperHeight(null, 1123), 1123)
}))
