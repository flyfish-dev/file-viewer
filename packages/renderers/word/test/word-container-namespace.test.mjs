import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveFileViewerWordContainer } from '../dist/index.js'

const namespace = 'http://schemas.microsoft.com/office/word/2003/wordml'
const classify = source => resolveFileViewerWordContainer(new TextEncoder().encode(source).buffer)

test('WordML dispatch binds the document root to the complete namespace value', () => {
  for (const source of [
    `<w:wordDocument xmlns:w="${namespace}"><w:body/></w:wordDocument>`,
    `<wordDocument xmlns='${namespace}'/>`,
    `<?xml version="1.0"?><!-- header --><?mso-application progid="Word.Document"?><doc:wordDocument title="a>b" xmlns:doc="${namespace}"/>`,
    `<w:wordDocument xmlns:w="http&#58;//schemas.microsoft.com/office/word/2003/wordml"/>`
  ]) assert.equal(classify(source), 'wordml', source)
})

test('namespace substrings, unrelated bindings and nested roots cannot establish WordML', () => {
  for (const source of [
    `<w:wordDocument xmlns:w="https://untrusted.example/${namespace}"/>`,
    `<w:wordDocument xmlns:w="${namespace}/extra"/>`,
    `<w:wordDocument xmlns:w="urn:other" data-reference="${namespace}"/>`,
    `<w:wordDocument xmlns:other="${namespace}"/>`,
    `<w:wordDocument xmlns:w="${namespace}" xmlns:w="urn:other"/>`,
    `<other><w:wordDocument xmlns:w="${namespace}"/></other>`
  ]) assert.equal(classify(source), 'binary', source)
})

test('document comments and ordinary prose cannot change the root container', () => {
  const comment = `<!-- <w:wordDocument xmlns:w="${namespace}"> -->`
  assert.equal(classify(`${comment}<html><body>Example</body></html>`), 'html')
  assert.equal(classify(`Example: <w:wordDocument xmlns:w="${namespace}">`), 'text')
  assert.equal(classify('<!-- missing end marker <html>'), 'binary')
})
