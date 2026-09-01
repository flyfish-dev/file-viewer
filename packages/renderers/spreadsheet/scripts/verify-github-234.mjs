import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSpreadsheetParserContext,
  handleSpreadsheetWorkerRequest
} from '../dist/spreadsheet/worker/sheetjs/index.js'
import { buildFont, createTextLayer, normalizeCellStyle } from '../dist/spreadsheet/view.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturePath = join(packageDir, 'test', 'fixtures', 'github-234-rich-text.xlsx')
const bytes = await readFile(fixturePath)
const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const context = createSpreadsheetParserContext()
const workbookResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseWorkbook',
  payload: { workbook: data, filename: 'github-234-rich-text.xlsx' }
})
const sheets = workbookResponses.find(response => response.type === 'sheets')?.payload?.sheets || []
const sheet = sheets[0]

if (!sheet) {
  throw new Error('Expected the reported workbook to expose one visible worksheet')
}

const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseSheet',
  payload: { sheet: sheet.id, startRow: 0, pageSize: 500, sessionId: 234 }
})
const parsed = sheetResponses.find(response => response.type === 'parseSheet')?.payload?.sheetData
if (!parsed) {
  throw new Error('Expected the reported worksheet to parse successfully')
}

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
  }
}

assertEqual(parsed.data?.[74]?.[5], '☐初级☐中级☐高级', 'F75 display text')
assertEqual(parsed.data?.[74]?.[11], '☐中级☐高级', 'L75 display text')
assertEqual(parsed.data?.[96]?.[5], '☐初级☐中级☐高级', 'F97 display text')

const richCells = Object.values(parsed.cell || {}).filter(meta => Array.isArray(meta?.richText))
assertEqual(richCells.length, 37, 'rich-text cell count')
for (const meta of richCells) {
  const plainText = meta.richText.map(run => run.text).join('')
  if (plainText.includes('£')) {
    throw new Error(`Symbol-font fallback leaked the raw Wingdings character: ${plainText}`)
  }
}

const sourceMeta = parsed.cell?.['74-5']
if (!sourceMeta) {
  throw new Error('Expected F75 metadata to be preserved in the initial worksheet window')
}
assertEqual(sourceMeta.richText?.length, 6, 'F75 rich-text run count')
assertEqual(sourceMeta.richText?.[0]?.text, '☐', 'F75 first symbol run')
assertEqual(sourceMeta.richText?.[0]?.fontFamily, '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", sans-serif', 'F75 symbol fallback font')
assertEqual(sourceMeta.richText?.[1]?.text, '初级', 'F75 first label run')
assertEqual(sourceMeta.richText?.[1]?.fontFamily, '等线', 'F75 label font')
assertEqual(sourceMeta.richText?.[1]?.fontSize, 11, 'F75 label font size')

const normalized = normalizeCellStyle(sourceMeta)
assertEqual(normalized?.font, 'normal normal 11px "Wingdings 2"', 'quoted cell font shorthand')
assertEqual(normalized?.richText?.length, 6, 'normalized rich-text run count')
assertEqual(buildFont({ fontFamily: 'Wingdings 2', fontSize: '11px' }), 'normal normal 11px "Wingdings 2"', 'font family quoting')

const createMockElement = tagName => ({
  tagName,
  style: {},
  dataset: {},
  children: [],
  textContent: '',
  appendChild(child) {
    this.children.push(child)
    return child
  }
})
const mockDocument = { createElement: createMockElement }
const textLayer = createTextLayer(mockDocument, '☐初级☐中级☐高级', normalized, 2)
assertEqual(textLayer.style.font, 'normal normal 11px "Wingdings 2"', 'rich-text layer base font')
const textContent = textLayer.children[0]
assertEqual(textContent?.dataset?.fileViewerRichText, 'true', 'rich-text layer marker')
assertEqual(textContent?.children?.length, 6, 'rich-text DOM segment count')
assertEqual(textContent?.children?.[0]?.textContent, '☐', 'rich-text DOM symbol text')
assertEqual(textContent?.children?.[0]?.style?.fontFamily, '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", sans-serif', 'rich-text DOM symbol font')
assertEqual(textContent?.children?.[1]?.textContent, '初级', 'rich-text DOM label text')
assertEqual(textContent?.children?.[1]?.style?.fontFamily, '等线', 'rich-text DOM label font')
assertEqual(textContent?.children?.[1]?.style?.fontSize, '11px', 'rich-text DOM font size')

const windowResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseSheet',
  payload: { sheet: sheet.id, startRow: 74, pageSize: 1, sessionId: 235 }
})
const window = windowResponses.find(response => response.type === 'parseSheet')?.payload?.sheetData
assertEqual(window?.data?.[0]?.[5], '☐初级☐中级☐高级', 'virtual F75 display text')
assertEqual(window?.cell?.['0-5']?.richText?.length, 6, 'virtual F75 rich-text metadata')

console.log('[spreadsheet] GitHub #234 rich text, symbol fonts and spaced font families render without content loss.')
