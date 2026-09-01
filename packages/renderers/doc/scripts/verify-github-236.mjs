import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMsDoc, renderMsDoc } from '../dist/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturePath = join(packageDir, 'test', 'fixtures', 'github-236-wps-save.doc')
const bytes = await readFile(fixturePath)
const parsed = parseMsDoc(bytes)
const tables = parsed.blocks.filter(block => block.type === 'table')

const cellText = cell => cell.paragraphs.map(paragraph => paragraph.text).join('\n')
const visibleRowText = row => row.cells.filter(cell => !cell.hidden).map(cellText)
const findTable = needle => tables.find(table => table.rows.some(row => (
  row.cells.some(cell => cellText(cell).includes(needle))
)))

assert.equal(tables.length, 4, 'expected the WPS fixture to retain four table blocks')

const priceTable = findTable('品种')
assert.ok(priceTable, 'expected the price table')
assert.equal(priceTable.rows.length, 8, 'expected eight price rows')
assert.ok(
  priceTable.rows.every(row => row.cells.filter(cell => !cell.hidden).length === 2),
  'expected two visible cells in every price row'
)
assert.deepEqual(visibleRowText(priceTable.rows[0]), [
  '品种',
  '铁矿粉（开票品名：铁原矿*铁矿粉）'
])

const indicatorTable = findTable('化学成分')
assert.ok(indicatorTable, 'expected the reference-indicator table')
assert.equal(indicatorTable.rows.length, 6, 'expected six reference-indicator rows')
assert.deepEqual(indicatorTable.rows.map(visibleRowText), [
  ['化学成分', 'FE', '60.7'],
  ['SIO2', '4.85'],
  ['AL2O3', '2.54'],
  ['P', '0.105'],
  ['S', '0.018'],
  ['水分', 'H2O', '8.5']
])
assert.equal(
  indicatorTable.rows[0].cells[0]?.rowspan,
  5,
  'expected the chemical-composition cell to span five rows'
)

const signatureTable = findTable('甲方：【阿里巴巴集团股份有限公司】')
assert.ok(signatureTable, 'expected the signature table')
assert.equal(signatureTable.rows.length, 8, 'expected eight signature rows')
assert.ok(
  signatureTable.rows.every(row => row.cells.filter(cell => !cell.hidden).length === 2),
  'expected both parties to stay in the same table row'
)
assert.deepEqual(visibleRowText(signatureTable.rows[0]), [
  '甲方：【阿里巴巴集团股份有限公司】',
  '乙方：【供应链科技有限公司】'
])
assert.deepEqual(visibleRowText(signatureTable.rows[5]), [
  '指定联系人：【张三】',
  '指定联系人：【王五】'
])

for (const table of [priceTable, indicatorTable, signatureTable]) {
  assert.ok(
    table.rows.every(row => row.cells.every(cell => (
      cell.meta?.leftBoundary != null
      && cell.meta?.rightBoundary != null
      && cell.meta.rightBoundary > cell.meta.leftBoundary
    ))),
    'expected every reconstructed table cell to retain a positive grid width'
  )
}

const detachedTexts = new Set([
  '60.7',
  '4.85',
  '2.54',
  '0.105',
  '0.018',
  '8.5',
  '乙方：【供应链科技有限公司】'
])
const detached = parsed.blocks.filter(block => (
  block.type === 'paragraph' && detachedTexts.has(block.text)
))
assert.deepEqual(detached, [], 'expected WPS table-cell text to remain inside table blocks')

const rendered = renderMsDoc(parsed)
const count = pattern => rendered.html.match(pattern)?.length || 0
assert.equal(count(/<table\b/g), 4, 'expected four rendered tables')
assert.equal(count(/<tr\b/g), count(/<\/tr>/g), 'expected balanced table-row markup')
assert.equal(count(/<td\b/g), count(/<\/td>/g), 'expected balanced table-cell markup')
assert.ok(rendered.html.includes('rowspan="5"'), 'expected the vertical merge to render as rowspan=5')

console.log('[doc] GitHub #236 WPS-saved DOC fixture parsed and rendered successfully.')
