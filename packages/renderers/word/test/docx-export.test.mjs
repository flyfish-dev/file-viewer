import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { preserveDocxParagraphStructureForExport, readDocxFlowPaperHeight } from '../dist/docxExport.js'

function run(fn) {
  const dom = new JSDOM('<style>.docx span{font-size:11px;font-family:monospace}.chart{display:block}</style><section class="docx"></section>')
  try { fn(dom.window.document, dom.window.document.querySelector('section')) }
  finally { dom.window.close() }
}
function paragraph(document, root, display = 'block') {
  const p = document.createElement('p'), r = document.createElement('span'), chart = document.createElement('div')
  p.style.cssText = 'font-size:19px;font-family:serif;line-height:25px'
  chart.className = 'chart'
  chart.style.cssText = `display:${display};width:120px;height:60px;font-size:19px;color:rgb(10, 20, 30)`
  chart.textContent = 'Generated chart label'
  r.append('Before', chart, 'After'); p.append(r); root.append(p)
  return chart
}

test('serialization does not terminate a paragraph around its block chart', () => run((d, root) => {
  paragraph(d, root)
  const before = root.outerHTML, clone = root.cloneNode(true)
  const invalid = new JSDOM(root.outerHTML)
  try { assert.notEqual(invalid.window.document.querySelectorAll('p').length, 1) } finally { invalid.window.close() }
  preserveDocxParagraphStructureForExport(root, clone)
  const parsed = new JSDOM(clone.outerHTML)
  try {
    assert.equal(parsed.window.document.querySelectorAll('p').length, 1)
    assert.equal(parsed.window.document.querySelector('p .chart').tagName, 'SPAN')
    assert.equal(parsed.window.document.querySelector('p').textContent, root.querySelector('p').textContent)
    assert.equal(root.outerHTML, before)
  } finally { parsed.window.close() }
}))

test('replacement preserves resolved typography instead of inheriting span defaults', () => run((d, root) => {
  const chart = paragraph(d, root), clone = root.cloneNode(true)
  chart.style.setProperty('font-size', '21px', 'important')
  const aligned = root.cloneNode(true)
  preserveDocxParagraphStructureForExport(root, aligned)
  const replacement = aligned.querySelector('.chart')
  assert.equal(replacement.style.display, 'block')
  assert.equal(replacement.style.fontSize, '21px')
  assert.equal(replacement.style.getPropertyPriority('font-size'), 'important')
  assert.equal(replacement.style.color, 'rgb(10, 20, 30)')
  assert.equal(replacement.style.width, '120px')
  assert.equal(clone.querySelector('.chart').tagName, 'DIV')
}))

for (const display of ['inline-block', 'flex', 'none']) {
  test(`explicit ${display} layout survives the phrasing-tag substitution`, () => run((d, root) => {
    paragraph(d, root, display); const clone = root.cloneNode(true)
    preserveDocxParagraphStructureForExport(root, clone)
    assert.equal(clone.querySelector('.chart').style.display, display)
  }))
}

test('nested block wrappers remain ordered and preserve attributes', () => run((d, root) => {
  const chart = paragraph(d, root), inner = d.createElement('div')
  inner.id = 'nested'; inner.setAttribute('aria-label', 'Generated drawing'); inner.style.position = 'relative'
  inner.append(d.createElementNS('http://www.w3.org/2000/svg', 'svg'))
  chart.append(inner)
  const clone = root.cloneNode(true)
  preserveDocxParagraphStructureForExport(root, clone)
  assert.equal(clone.querySelectorAll('p div').length, 0)
  assert.equal(clone.querySelector('#nested').getAttribute('aria-label'), 'Generated drawing')
  assert.equal(clone.querySelector('#nested svg').namespaceURI, 'http://www.w3.org/2000/svg')
  const once = clone.outerHTML
  preserveDocxParagraphStructureForExport(clone, clone)
  assert.equal(clone.outerHTML, once)
}))

test('blocks outside paragraphs and SVG foreignObject parsing contexts stay untouched', () => run((d, root) => {
  root.innerHTML = '<div id="outside">Outside</div><p><svg><foreignObject><div id="inside">Inside</div></foreignObject></svg></p>'
  const clone = root.cloneNode(true), before = clone.outerHTML
  preserveDocxParagraphStructureForExport(root, clone)
  assert.equal(clone.outerHTML, before)
}))

test('mismatched clones fail closed without changing unrelated nodes', () => run((d, root) => {
  paragraph(d, root)
  const clone = root.cloneNode(true); clone.querySelector('.chart').remove()
  const before = clone.outerHTML
  preserveDocxParagraphStructureForExport(root, clone)
  assert.equal(clone.outerHTML, before)
}))

test('an export clone in a different document uses the source view for computed styles', () => run((d, root) => {
  paragraph(d, root)
  const other = new JSDOM('<body></body>')
  try {
    const clone = other.window.document.importNode(root, true)
    preserveDocxParagraphStructureForExport(root, clone)
    assert.equal(clone.querySelector('.chart').ownerDocument, other.window.document)
    assert.equal(clone.querySelector('.chart').style.fontSize, '19px')
  } finally { other.window.close() }
}))

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

test('passing the live source as its own clone is a no-op', () => run((d, root) => {
  paragraph(d, root)
  const before = root.outerHTML
  preserveDocxParagraphStructureForExport(root, root)
  assert.equal(root.outerHTML, before)
}))
