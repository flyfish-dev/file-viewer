import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { finalizeTableGrid, normalizeRowEndOnlyTables } from '../dist/msdoc/parser.js'
import { applyTableStateToCells, tablePropsToState } from '../dist/msdoc/properties.js'
import { decodeGrpprl, decodeSprm, SprmCodes } from '../dist/msdoc/sprm.js'
import { mergePropertyArrays } from '../dist/msdoc/styles.js'
import { parseMsDoc, renderMsDoc } from '../dist/index.js'

function word(value) {
  return [value & 0xff, (value >>> 8) & 0xff]
}

function makeCell(index, borders = {}) {
  return {
    index,
    width: 1200,
    leftBoundary: index * 1200,
    rightBoundary: (index + 1) * 1200,
    borders,
    merge: 0,
    vertMerge: 0,
    vertAlign: 0,
  }
}

function makeTableState(operations, cellCount = 2) {
  return {
    ...tablePropsToState([]),
    defTable: {
      cb: 0,
      numberOfColumns: cellCount,
      rgdxaCenter: Array.from({ length: cellCount + 1 }, (_, index) => index * 1200),
      cells: Array.from({ length: cellCount }, () => ({
        tcgrf: {},
        wWidth: 1200,
        borders: {},
      })),
    },
    operations,
  }
}

function renderSingleCellTable(meta, state = makeTableState([], 1)) {
  return renderMsDoc({
    blocks: [{
      type: 'table',
      id: 'single-cell-table',
      depth: 1,
      gridWidthTwips: 1200,
      state,
      rows: [{
        id: 'row',
        state,
        gridWidthTwips: 1200,
        cells: [{
          id: 'cell',
          paragraphs: [],
          meta,
          colIndex: 0,
          colspan: 1,
          rowspan: 1,
          hidden: false,
        }],
      }],
    }],
    assets: [],
    warnings: [],
    metadata: {},
  }).html
}

// TableBrc80Operand: cb, cell range, side mask, then Brc80. Byte 3 is not border data.
const rightBorder = decodeSprm(
  SprmCodes.sprmTSetBrc80,
  Uint8Array.from([7, 0, 2, 0x08, 8, 1, 1, 0]),
)
const borderedCells = applyTableStateToCells(makeTableState([rightBorder]))
assert.equal(borderedCells.length, 2)
assert.equal(borderedCells[0].borders.right.borderType, 1)
assert.equal(borderedCells[0].borders.right.lineWidth, 8)
assert.equal(borderedCells[0].borders.top, undefined)
assert.equal(borderedCells[0].borders.all, undefined)

// NilBrc explicitly means no border and must never become a fallback gray rule.
const nilTopBorder = decodeSprm(
  SprmCodes.sprmTSetBrc,
  Uint8Array.from([11, 0, 1, 0x01, 0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff]),
)
const nilCell = applyTableStateToCells(makeTableState([nilTopBorder], 1))[0]
assert.equal(nilCell.borders.top.nil, true)
const renderedNilBorder = renderSingleCellTable(nilCell)
assert.doesNotMatch(renderedNilBorder, /border-top/)
assert.doesNotMatch(renderedNilBorder, /#666/)

// Word 97+ paragraph borders use a size-prefixed eight-byte Brc. Parsing
// them as the four-byte legacy form creates the same kind of phantom rules.
const nilParagraphBorder = decodeSprm(
  SprmCodes.sprmPBrcLeft,
  Uint8Array.from([8, 0, 0, 0, 0, 0xff, 0xff, 0xff, 0xff]),
)
assert.equal(nilParagraphBorder.value.nil, true)

// VertMergeOperand targets one cell, not an ItcFirstLim range.
const verticalRestart = decodeSprm(SprmCodes.sprmTVertMerge, Uint8Array.from([2, 1, 3]))
const verticallyMergedCells = applyTableStateToCells(makeTableState([verticalRestart]))
assert.equal(verticallyMergedCells[0].vertMerge, 0)
assert.equal(verticallyMergedCells[1].vertMerge, 3)

// TInsertOperand is a fixed four-byte structure and creates the missing cell definitions.
const initialInsert = decodeSprm(SprmCodes.sprmTInsert, Uint8Array.from([0, 1, ...word(1200)]))
const insert = decodeSprm(SprmCodes.sprmTInsert, Uint8Array.from([1, 2, ...word(800)]))
const insertOnlyState = { ...tablePropsToState([]), operations: [initialInsert, insert] }
const insertedCells = applyTableStateToCells(insertOnlyState)
assert.equal(insertedCells.length, 3)
assert.deepEqual(insertedCells.map(cell => cell.width), [1200, 800, 800])
assert.deepEqual(insertedCells.map(cell => cell.index), [0, 1, 2])
assert.deepEqual(insertedCells.map(cell => cell.leftBoundary), [0, 1200, 2000])
assert.deepEqual(insertedCells.map(cell => cell.rightBoundary), [1200, 2000, 2800])
assert.equal(applyTableStateToCells(makeTableState([insert], 1)).length, 1)

// ftsNil/ftsAuto widths are undefined and must not collapse a valid TDefTable grid.
const nilPreferredWidth = decodeSprm(
  SprmCodes.sprmTCellWidth,
  Uint8Array.from([5, 0, 1, 0, 0, 0]),
)
const widthPreservedCell = applyTableStateToCells(makeTableState([nilPreferredWidth], 1))[0]
assert.equal(widthPreservedCell.width, 1200)

// CSSA keeps its side mask before ftsWidth; padding and spacing are distinct operations.
const padding = decodeSprm(
  SprmCodes.sprmTCellPaddingDefault,
  Uint8Array.from([6, 0, 1, 0x0a, 3, ...word(120)]),
)
const spacing = decodeSprm(
  SprmCodes.sprmTCellSpacingDefault,
  Uint8Array.from([6, 0, 1, 0x0f, 0x13, ...word(120)]),
)
const spacedCell = applyTableStateToCells(makeTableState([padding, spacing], 1))[0]
assert.deepEqual(spacedCell.paddingTwips, { left: 120, right: 120 })
assert.deepEqual(spacedCell.spacingTwips, { top: 120, left: 120, bottom: 120, right: 120 })
const spacedHtml = renderSingleCellTable(spacedCell)
assert.match(spacedHtml, /border-spacing:8px 8px/)
assert.match(spacedHtml, /padding-inline-start:8px/)

// MS-DOC bounds these CSSA widths by operation. An out-of-range value is not
// a signed twip or a common sentinel and must not become a giant CSS margin.
for (const code of [SprmCodes.sprmTCellPadding, SprmCodes.sprmTCellPaddingDefault]) {
  const valid = decodeSprm(code, Uint8Array.from([6, 0, 1, 0x0f, 3, ...word(31680)]))
  const oversized = decodeSprm(code, Uint8Array.from([6, 0, 1, 0x0f, 3, ...word(31681)]))
  const malformed = decodeSprm(code, Uint8Array.from([6, 0, 1, 0x0f, 3, ...word(0xffff)]))
  assert.equal(valid.warning, undefined)
  assert.equal(oversized.warning?.code, 'MSDOC_TABLE_CSSA_WIDTH_OUT_OF_RANGE')
  assert.equal(oversized.warning?.widthTwips, 31681)
  assert.equal(malformed.warning?.widthTwips, 65535)
  assert.equal(malformed.warning?.maxWidthTwips, 31680)
  assert.equal(malformed.warning?.sprm, code)
  assert.equal(applyTableStateToCells(makeTableState([valid], 1))[0].paddingTwips?.left, 31680)
  assert.equal(applyTableStateToCells(makeTableState([oversized], 1))[0].paddingTwips?.left, undefined)
  const recovered = applyTableStateToCells(makeTableState([padding, malformed], 1))[0]
  assert.equal(recovered.paddingTwips?.left, 120)
  assert.doesNotMatch(renderSingleCellTable(recovered), /4369px/)
}
const spacingAtLimit = decodeSprm(
  SprmCodes.sprmTCellSpacingDefault,
  Uint8Array.from([6, 0, 1, 0x0f, 3, ...word(15840)]),
)
const spacingTooWide = decodeSprm(
  SprmCodes.sprmTCellSpacingDefault,
  Uint8Array.from([6, 0, 1, 0x0f, 3, ...word(15841)]),
)
assert.equal(applyTableStateToCells(makeTableState([spacingAtLimit], 1))[0].spacingTwips?.left, 15840)
assert.equal(spacingAtLimit.warning, undefined)
assert.equal(spacingTooWide.warning?.widthTwips, 15841)
assert.equal(spacingTooWide.warning?.maxWidthTwips, 15840)
assert.equal(spacingTooWide.warning?.operation, 'cellSpacing')
assert.equal(applyTableStateToCells(makeTableState([spacingTooWide], 1))[0].spacingTwips?.left, undefined)
const systemSpacingTooWide = decodeSprm(
  SprmCodes.sprmTCellSpacingDefault,
  Uint8Array.from([6, 0, 1, 0x0f, 0x13, ...word(0xffff)]),
)
assert.equal(applyTableStateToCells(makeTableState([spacing, systemSpacingTooWide], 1))[0].spacingTwips?.left, 120)

// Exercise the complete DOC container path with twelve malformed CSSA widths
// in an existing table fixture. The source fixture stays byte-for-byte intact.
const malformedDoc = Uint8Array.from(await readFile(new URL('../test/fixtures/github-34-wps-table.doc', import.meta.url)))
let changedWidths = 0
for (let index = 0; index < malformedDoc.length - 9 && changedWidths < 12; index++) {
  if (malformedDoc[index] !== 0x34 || malformedDoc[index + 1] !== 0xd6 ||
      malformedDoc[index + 2] !== 6 || malformedDoc[index + 3] !== 0 ||
      malformedDoc[index + 4] !== 1 || malformedDoc[index + 6] !== 3 ||
      malformedDoc[index + 7] !== 15 || malformedDoc[index + 8] !== 0) continue
  malformedDoc[index + 7] = 0xff
  malformedDoc[index + 8] = 0xff
  changedWidths++
}
assert.equal(changedWidths, 12)
assert.equal(createHash('sha256').update(malformedDoc).digest('hex'), '864c2ea4b06481fc8e1840f13f75697dd7cf0e726af8ca6e2271a7e9c17134f9')
const malformedParsed = parseMsDoc(malformedDoc)
assert.equal(malformedParsed.blocks.length, 2)
assert.doesNotMatch(renderMsDoc(malformedParsed).html, /4369px/)
const cssaWarnings = malformedParsed.warnings.filter(warning => warning.code === 'MSDOC_TABLE_CSSA_WIDTH_OUT_OF_RANGE')
assert.equal(cssaWarnings.length, 1, 'repeated invalid operands produce one recovery diagnostic')
assert.equal(cssaWarnings[0].widthTwips, 65535)
assert.equal(cssaWarnings[0].maxWidthTwips, 31680)
assert.deepEqual(renderMsDoc(malformedParsed).warnings, malformedParsed.warnings)
assert.deepEqual(parseMsDoc(await readFile(new URL('../test/fixtures/github-34-wps-table.doc', import.meta.url))).warnings, [])

// Fixed-size table operands must not desynchronize the following grpprl entry.
const grpprl = Uint8Array.from([
  ...word(SprmCodes.sprmTDxaCol), 0, 2, ...word(900),
  ...word(SprmCodes.sprmTMerge), 0, 2,
])
const decodedGrpprl = decodeGrpprl(grpprl, 0, grpprl.length)
assert.deepEqual(decodedGrpprl.map(property => property.name), ['columnWidth', 'merge'])
assert.equal(decodedGrpprl[0].value.width, 900)

// Range operations are ordered differences; merging style/direct properties must retain all sides.
const topBorder = decodeSprm(
  SprmCodes.sprmTSetBrc80,
  Uint8Array.from([7, 0, 1, 0x01, 8, 1, 1, 0]),
)
const bottomBorder = decodeSprm(
  SprmCodes.sprmTSetBrc80,
  Uint8Array.from([7, 0, 1, 0x04, 8, 1, 1, 0]),
)
const retainedOperations = mergePropertyArrays([topBorder], [bottomBorder])
assert.equal(retainedOperations.length, 2)
const retainedCell = applyTableStateToCells(makeTableState(retainedOperations, 1))[0]
assert.equal(retainedCell.borders.top.borderType, 1)
assert.equal(retainedCell.borders.bottom.borderType, 1)

// TableShadeOperand contains a ten-byte Shd, not a one-byte color index.
const shading = decodeSprm(
  SprmCodes.sprmTSetShdOdd,
  Uint8Array.from([12, 0, 3, 0, 0, 0xff, 0, 0xff, 0xff, 0xff, 0, 1, 0]),
)
const shadedCells = applyTableStateToCells(makeTableState([shading], 3))
assert.equal(shadedCells[0].shading.pattern, 1)
assert.equal(shadedCells[1].shading, undefined)
assert.equal(shadedCells[2].shading.pattern, 1)

// Only continuations with a valid restart are hidden. The restart cell adopts
// the merged region's outer geometry and closing borders.
const horizontalRows = [{
  cells: [
    { meta: { ...makeCell(0), merge: 3 } },
    { meta: { ...makeCell(1), merge: 1 } },
    { meta: { ...makeCell(2), merge: 1, borders: { right: { borderType: 1, lineWidth: 8 } } } },
  ],
}]
finalizeTableGrid(horizontalRows)
assert.equal(horizontalRows[0].cells[0].colspan, 3)
assert.equal(horizontalRows[0].cells[0].meta.rightBoundary, 3600)
assert.equal(horizontalRows[0].cells[0].meta.borders.right.borderType, 1)
assert.equal(horizontalRows[0].cells[1].hidden, true)
assert.equal(horizontalRows[0].cells[2].hidden, true)

const orphanContinuationRows = [{ cells: [{ meta: { ...makeCell(0), merge: 1 } }] }]
finalizeTableGrid(orphanContinuationRows)
assert.equal(orphanContinuationRows[0].cells[0].hidden, false)

const verticalRows = [
  { cells: [{ meta: { ...makeCell(0), vertMerge: 3 } }] },
  { cells: [{ meta: { ...makeCell(0), vertMerge: 1, borders: { bottom: { borderType: 1, lineWidth: 8 } } } }] },
]
finalizeTableGrid(verticalRows)
assert.equal(verticalRows[0].cells[0].rowspan, 2)
assert.equal(verticalRows[0].cells[0].meta.borders.bottom.borderType, 1)
assert.equal(verticalRows[1].cells[0].hidden, true)

// Rows can use different TDefTable boundaries for the same physical table.
// Their HTML colspans must be projected onto one union grid.
const mixedBoundaryRows = [
  { cells: [
    { meta: { ...makeCell(0), leftBoundary: 0, rightBoundary: 1200 } },
    { meta: { ...makeCell(1), leftBoundary: 1200, rightBoundary: 4800 } },
  ] },
  { cells: [
    { meta: { ...makeCell(0), leftBoundary: 0, rightBoundary: 1200 } },
    { meta: { ...makeCell(1), leftBoundary: 1200, rightBoundary: 2400 } },
    { meta: { ...makeCell(2), leftBoundary: 2400, rightBoundary: 3600 } },
    { meta: { ...makeCell(3), leftBoundary: 3600, rightBoundary: 4800 } },
  ] },
]
finalizeTableGrid(mixedBoundaryRows)
assert.deepEqual(mixedBoundaryRows[0].cells.map(cell => cell.colspan), [1, 3])
assert.deepEqual(mixedBoundaryRows[1].cells.map(cell => cell.colspan), [1, 1, 1, 1])
assert.deepEqual(mixedBoundaryRows[1].cells.map(cell => cell.colIndex), [0, 1, 2, 3])

// Word/WPS may place table properties only on the empty row terminator. Keep
// paragraph marks inside multi-paragraph cells attached to the surrounding row.
const twoCellState = makeTableState([], 2)
const fourCellState = makeTableState([], 4)
fourCellState.defTable.rgdxaCenter = [0, 600, 1200, 1800, 2400]
fourCellState.defTable.cells.forEach(cell => { cell.wWidth = 600 })
const paragraph = (text, terminator, overrides = {}) => ({
  text,
  terminator,
  paraState: {
    inTable: false,
    tableRowEnd: false,
    innerTableRowEnd: false,
    itap: 0,
    ...overrides,
  },
  tableState: makeTableState([], 0),
  tableProps: [],
})
const rowEnd = () => paragraph('', '\u0007', {
  inTable: true,
  tableRowEnd: true,
  itap: 1,
})
const rowEndOne = rowEnd()
rowEndOne.tableState = twoCellState
const rowEndTwo = rowEnd()
rowEndTwo.tableState = fourCellState
const rowEndOnlyParagraphs = [
  paragraph('first row left', '\u0007'),
  paragraph('first row right', '\u0007'),
  rowEndOne,
  paragraph('first cell line one', '\r'),
  paragraph('first cell line two', '\u0007'),
  paragraph('second cell line one', '\r'),
  paragraph('second cell line two', '\u0007'),
  paragraph('third cell', '\u0007'),
  paragraph('fourth cell', '\u0007'),
  rowEndTwo,
  paragraph('after table', '\r'),
]
normalizeRowEndOnlyTables(rowEndOnlyParagraphs)
assert.equal(rowEndOnlyParagraphs.slice(0, 10).every(item => item.paraState.inTable), true)
assert.equal(rowEndOnlyParagraphs[10].paraState.inTable, false)
assert.equal(rowEndOnlyParagraphs[3].tableState, fourCellState)

console.log('[doc] MS-DOC table operand and rendering regression checks passed.')
