import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { correctDocxMixedAnchorOrigins } from '../dist/docxAnchors.js'

function fixture(scale, indent, horizontal = 'column') {
  const dom = new JSDOM(`<section style="box-sizing:border-box;width:600px;padding-left:50px"><article><p data-docx-anchor-context="paragraph" style="position:relative;margin-left:${indent}px"><span><div data-docx-anchor-horizontal="${horizontal}" data-docx-anchor-vertical="paragraph" style="position:absolute;left:249pt;top:-47pt"></div></span></p></article></section>`)
  const document = dom.window.document
  const section = document.querySelector('section')
  const root = document.querySelector('article')
  const p = document.querySelector('p')
  // Build legal DOM explicitly: HTML's parser otherwise auto-closes p at div.
  const anchor = document.querySelector('[data-docx-anchor-horizontal]')
  p.appendChild(anchor)
  Object.defineProperty(anchor, 'offsetParent', { configurable: true, get: () => p })
  section.getBoundingClientRect = () => ({ left: 100, width: 600 * scale })
  root.getBoundingClientRect = () => ({ left: 100 + 50 * scale })
  p.getBoundingClientRect = () => ({ left: 100 + (50 + indent) * scale })
  return { dom, section, root, p, anchor }
}

for (const scale of [0.5, 1, 2]) for (const indent of [-24, 0, 310]) {
  test(`mixed paragraph/column anchor keeps authored column origin at scale ${scale}, indent ${indent}`, () => {
    const { dom, section, anchor } = fixture(scale, indent)
    correctDocxMixedAnchorOrigins(section)
    const once = anchor.style.left
    correctDocxMixedAnchorOrigins(section)
    assert.equal(anchor.style.left, once, 'corrections must not accumulate')
    assert.equal(anchor.style.top, '-47pt', 'paragraph-relative vertical offset is unchanged')
    assert.equal(once, indent === 0 ? '249pt' : `calc(${332 - indent}px)`)
    dom.window.close()
  })
}

test('page and character anchors remain engine-owned', () => {
  for (const horizontal of ['page', 'character']) {
    const { dom, section, anchor } = fixture(1, 310, horizontal)
    correctDocxMixedAnchorOrigins(section)
    assert.equal(anchor.style.left, '249pt')
    dom.window.close()
  }
})

test('margin reference uses the page content edge and resize does not compound offsets', () => {
  const { dom, section, root, anchor } = fixture(1, 310, 'margin')
  root.getBoundingClientRect = () => ({ left: 700 })
  correctDocxMixedAnchorOrigins(section)
  assert.equal(anchor.style.left, 'calc(22px)')
  correctDocxMixedAnchorOrigins(section)
  assert.ok(!anchor.style.left.includes('calc(calc('))
  dom.window.close()
})
