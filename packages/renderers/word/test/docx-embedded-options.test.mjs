import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { createDocxOptions } from '../dist/wordDocx.js'

function options(docx) {
  const dom = new JSDOM('<div></div>', { url: 'https://viewer.example.test/' })
  try {
    return createDocxOptions(dom.window.document.querySelector('div'), { options: { docx: { worker: false, ...docx } } }, () => {})
  } finally { dom.window.close() }
}
test('omitted altChunk policy preserves engine defaults', () => {
  assert.equal(Object.hasOwn(options({}), 'renderAltChunks'), false)
  assert.equal(Object.hasOwn(options({ renderAltChunks: undefined }), 'renderAltChunks'), false)
})
for (const renderAltChunks of [false, true]) {
  test(`explicit renderAltChunks ${renderAltChunks} reaches the engine unchanged`, () => {
    const result = options({ renderAltChunks })
    assert.equal(result.renderAltChunks, renderAltChunks)
    assert.equal(result.externalResourcePolicy, 'block')
    assert.equal(result.externalLinkPolicy, 'block')
  })
}
test('altChunk opt-out is independent of the existing link/resource policies', () => {
  const result = options({ renderAltChunks: false, externalLinkPolicy: 'allow', externalResourcePolicy: 'allow' })
  assert.equal(result.renderAltChunks, false)
  assert.equal(result.externalLinkPolicy, 'allow')
  assert.equal(result.externalResourcePolicy, 'allow')
})
