import { describe, expect, it } from 'vitest'
import { build } from 'esbuild'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { FILE_VIEWER_BUILTIN_MESSAGES } from '../packages/core/src/i18n/messages'
import {
  createSpreadsheetParserContext,
  decodeSpreadsheetText,
  handleSpreadsheetWorkerRequest,
  isValidUtf8,
  prepareSpreadsheetReadInput,
  type SpreadsheetTextEncoding,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs'

const utf8Csv = new TextEncoder().encode('姓名,城市\n小明,北京\n')
const utf8BomCsv = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8Csv])
const gbkCsv = new Uint8Array([
  0xd0, 0xd5, 0xc3, 0xfb, 0x2c, 0xb3, 0xc7, 0xca, 0xd0, 0x0a,
  0xd0, 0xa1, 0xc3, 0xf7, 0x2c, 0xb1, 0xb1, 0xbe, 0xa9, 0x0a,
])
const gb18030Csv = new Uint8Array([
  0xd7, 0xd6, 0xb7, 0xfb, 0x2c, 0xd6, 0xb5, 0x0a,
  0x95, 0x32, 0x82, 0x36, 0x2c, 0x31, 0x0a,
])
const gbkTsv = new Uint8Array([
  0xc3, 0xfb, 0xb3, 0xc6, 0x09, 0xca, 0xfd, 0xc1, 0xbf, 0x0a,
  0xce, 0xc4, 0xbc, 0xfe, 0x09, 0x32, 0x0a,
])
const ambiguousGbkCsv = new Uint8Array([0xc2, 0xa9, 0x2c, 0x31, 0x0a])

const toArrayBuffer = (bytes: Uint8Array) => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const parseRows = async (
  bytes: Uint8Array,
  fileType: 'csv' | 'tsv',
  textEncoding?: SpreadsheetTextEncoding
) => {
  const context = createSpreadsheetParserContext()
  const workbookResponses = await handleSpreadsheetWorkerRequest(context, {
    type: 'parseWorkbook',
    payload: {
      workbook: toArrayBuffer(bytes),
      fileType,
      filename: `fixture.${fileType}`,
      textEncoding,
    },
  })

  expect(workbookResponses.find(response => response.type === 'parseError')).toBeUndefined()
  expect(workbookResponses.find(response => response.type === 'sheets')?.payload?.sheets).toHaveLength(1)

  const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
    type: 'parseSheet',
    payload: { sheet: 0, startRow: 0, pageSize: 20, sessionId: 1 },
  })
  const parsed = sheetResponses.find(response => response.type === 'parseSheet')
  expect(parsed).toBeTruthy()
  return parsed?.payload?.sheetData.data as string[][]
}

describe('spreadsheet CSV / TSV text decoding', () => {
  it('bundles the actual Worker with shared decoders and without UI message tables', async () => {
    const packageDir = fileURLToPath(new URL('../packages/renderers/spreadsheet/', import.meta.url))
    const result = await build({
      absWorkingDir: packageDir,
      entryPoints: [fileURLToPath(new URL('../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/sheet.worker.ts', import.meta.url))],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['es2019'],
      minify: true,
      write: false,
      metafile: true,
      plugins: [{
        name: 'workspace-public-core-entries',
        setup(bundle) {
          // Match the source aliases used by the ordinary unit suite, while
          // keeping the real public barrels and the complete Worker graph.
          bundle.onResolve({ filter: /^@file-viewer\/core(?:\/headless)?$/ }, ({ path }) => ({
            path: fileURLToPath(new URL(path.endsWith('/headless')
              ? '../packages/core/src/headless.ts'
              : '../packages/core/src/index.ts', import.meta.url)),
          }))
        },
      }],
    })
    expect(Object.keys(result.metafile!.inputs).some(path => path.endsWith('core/src/source/textEncoding.ts'))).toBe(true)
    const catalogKeys = new Set(Object.keys(FILE_VIEWER_BUILTIN_MESSAGES['en-US']))
    const retainedUiKeys = new Set<string>()
    const output = ts.createSourceFile('sheet.worker.js', result.outputFiles[0].text,
      ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    const inspect = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) && catalogKeys.has(node.text)) retainedUiKeys.add(node.text)
      ts.forEachChild(node, inspect)
    }
    inspect(output)
    expect([...retainedUiKeys]).toEqual([])
  })

  it('validates UTF-8 bytes without depending on TextDecoder fatal-mode support', () => {
    expect(isValidUtf8(utf8Csv)).toBe(true)
    expect(isValidUtf8(new Uint8Array([0xc0, 0xaf]))).toBe(false)
    expect(isValidUtf8(new Uint8Array([0xed, 0xa0, 0x80]))).toBe(false)
    expect(isValidUtf8(new Uint8Array([0xf4, 0x90, 0x80, 0x80]))).toBe(false)
  })

  it('parses UTF-8 Chinese CSV without a BOM through the worker request contract', async () => {
    await expect(parseRows(utf8Csv, 'csv')).resolves.toEqual([
      ['姓名', '城市'],
      ['小明', '北京'],
    ])
  })

  it('strips a UTF-8 BOM before parsing CSV', async () => {
    const decoded = decodeSpreadsheetText(toArrayBuffer(utf8BomCsv))
    expect(decoded).toEqual({
      text: '姓名,城市\n小明,北京\n',
      encoding: 'utf-8',
    })
    await expect(parseRows(utf8BomCsv, 'csv')).resolves.toEqual([
      ['姓名', '城市'],
      ['小明', '北京'],
    ])
  })

  it('falls back deterministically to GB18030 for GBK CSV bytes', async () => {
    expect(decodeSpreadsheetText(toArrayBuffer(gbkCsv))).toEqual({
      text: '姓名,城市\n小明,北京\n',
      encoding: 'gb18030',
    })
    await expect(parseRows(gbkCsv, 'csv')).resolves.toEqual([
      ['姓名', '城市'],
      ['小明', '北京'],
    ])
  })

  it('decodes four-byte GB18030 characters and honors an explicit override', async () => {
    await expect(parseRows(gb18030Csv, 'csv', 'gb18030')).resolves.toEqual([
      ['字符', '值'],
      ['𠀀', '1'],
    ])
  })

  it('uses the same decoding path for GBK TSV files', async () => {
    await expect(parseRows(gbkTsv, 'tsv', 'gbk')).resolves.toEqual([
      ['名称', '数量'],
      ['文件', '2'],
    ])
  })

  it('lets callers override byte sequences that are valid in both UTF-8 and GBK', async () => {
    await expect(parseRows(ambiguousGbkCsv, 'csv')).resolves.toEqual([['©', '1']])
    await expect(parseRows(ambiguousGbkCsv, 'csv', 'gbk')).resolves.toEqual([['漏', '1']])
  })

  it('never converts binary XLS/XLSX inputs into text', () => {
    const xlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).buffer

    expect(prepareSpreadsheetReadInput(xlsx, {
      fileType: 'xlsx',
      filename: 'misleading.csv',
    })).toEqual({ kind: 'binary', data: xlsx })
    expect(prepareSpreadsheetReadInput(xls, {
      fileType: 'xls',
    })).toEqual({ kind: 'binary', data: xls })
  })

  it('uses the shared decoder for UTF-8 and GBK text exported with a legacy XLS filename', () => {
    expect(prepareSpreadsheetReadInput(toArrayBuffer(utf8Csv), { fileType: 'xls' })).toEqual({
      kind: 'text', data: '姓名,城市\n小明,北京\n', encoding: 'utf-8',
    })
    expect(prepareSpreadsheetReadInput(toArrayBuffer(gbkCsv), { filename: 'legacy.xls' })).toEqual({
      kind: 'text', data: '姓名,城市\n小明,北京\n', encoding: 'gb18030',
    })
  })

  it.each([
    [0x09, 0x00], [0x09, 0x02], [0x09, 0x04], [0x09, 0x08],
    [...new TextEncoder().encode('%PDF-1.7')],
    [...new TextEncoder().encode('%!PS-Adobe')],
    [...new TextEncoder().encode('{\\rtf1')],
  ])('preserves a non-text legacy signature as binary: %j', (...signature) => {
    const data = toArrayBuffer(new Uint8Array(signature))
    const result = prepareSpreadsheetReadInput(data, { fileType: 'xls' })
    expect(result).toEqual({ kind: 'binary', data })
    expect(result.data).toBe(data)
  })

  it('recognizes text spreadsheet filenames and MIME types when no extension is passed', () => {
    expect(prepareSpreadsheetReadInput(toArrayBuffer(utf8Csv), {
      filename: '.csv?download=1',
    }).kind).toBe('text')
    expect(prepareSpreadsheetReadInput(toArrayBuffer(utf8Csv), {
      fileType: 'text/csv; charset=utf-8',
    }).kind).toBe('text')
  })
})
