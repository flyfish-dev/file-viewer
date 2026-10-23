import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../../../..')
const require = createRequire(join(root, 'packages/renderers/spreadsheet/package.json'))
const { utils, write } = require('styled-exceljs')
const output = resolve(process.env.EXCEL_VIEWPORT_EVIDENCE || join(root, 'output/excel-fill-viewport'))
await mkdir(output, { recursive: true })
const workbook = utils.book_new()
const small = utils.aoa_to_sheet([['测试附件', ...Array(13).fill('')]])
small['!cols'] = Array.from({ length: 14 }, () => ({ wpx: 64 }))
utils.book_append_sheet(workbook, small, 'Small')
utils.book_append_sheet(workbook, utils.aoa_to_sheet([]), 'Empty')
utils.book_append_sheet(workbook, utils.aoa_to_sheet(Array.from({ length: 3000 }, (_, row) => (
  Array.from({ length: 40 }, (_, col) => `R${row + 1}C${col + 1}`)
))), 'Large')
const merged = utils.aoa_to_sheet([['Merged', '', ''], ['', '', ''], ['End', '', '']])
merged['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }]
merged['!cols'] = [{ wpx: 92 }, { hidden: true }, { wpx: 80 }]
merged['!rows'] = [{ hpx: 30 }, { hidden: true }, { hpx: 40 }]
utils.book_append_sheet(workbook, merged, 'Merged')
const emptyWorkbook = utils.book_new()
utils.book_append_sheet(emptyWorkbook, utils.aoa_to_sheet([]), 'Empty')
const assets = new Map([
  ['/book.xlsx', Buffer.from(write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true }))],
  ['/empty.xlsx', Buffer.from(write(emptyWorkbook, { type: 'buffer', bookType: 'xlsx' }))],
  ['/small.csv', Buffer.from('Only\nvalue\n')],
  ['/vendor/xlsx/sheet.worker.js', await readFile(join(root, 'packages/renderers/spreadsheet/dist/worker/sheet.worker.js'))],
])
const tableEntry = join(dirname(require.resolve('e-virt-table/package.json')), 'dist/index.es.js')
const bundle = await build({
  stdin: {
    resolveDir: root, loader: 'ts', contents: `
      import renderSpreadsheet from './packages/renderers/spreadsheet/src/spreadsheet.ts';
      import {findFileViewerZoomProvider,findFileViewerSearchProvider} from './packages/core/src/index.ts';
      window.review={renderSpreadsheet,findFileViewerZoomProvider,findFileViewerSearchProvider};
    `,
  },
  bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'warning',
  alias: { '@file-viewer/core': join(root, 'packages/core/src/index.ts') },
  plugins: [{ name: 'observe-real-virtual-table', setup(builder) {
    builder.onResolve({ filter: /^e-virt-table(?:\/dist\/index\.es\.js)?$/ }, () => ({ path: 'table', namespace: 'review-table' }))
    builder.onLoad({ filter: /.*/, namespace: 'review-table' }, () => ({
      contents: `import RealTable from ${JSON.stringify(tableEntry)};
        export default class extends RealTable { constructor(...args) { super(...args); window.reviewTable=this; } }`,
      resolveDir: root, loader: 'js',
    }))
  } }],
})
assets.set('/browser.js', Buffer.from(bundle.outputFiles[0].text))
assets.set('/', Buffer.from('<!doctype html><meta charset="utf-8"><style>body{margin:0}#host{width:1100px;height:720px}</style><div id="host"></div><script src="/browser.js"></script>'))
const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const asset = assets.get(pathname)
  response.writeHead(asset ? 200 : 404, { 'Content-Type': pathname.endsWith('.js') ? 'application/javascript' : pathname === '/' ? 'text/html' : 'application/octet-stream' })
  response.end(asset || 'missing fixture')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const report = { checks: [], passed: false }
const errors = [], external = []
const page = await browser.newPage({ viewport: { width: 2300, height: 1000 } })
page.on('pageerror', error => errors.push(error.message))
await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : (external.push(route.request().url()), route.abort()))
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
async function mount(fillViewport, worker = false, file = '/book.xlsx', type = 'xlsx') {
  await page.evaluate(async ({ fillViewport, worker, file, type }) => {
    window.handle?.unmount()
    const host = document.querySelector('#host')
    host.style.width = '1100px'; host.style.height = '720px'
    const bytes = await (await fetch(file)).arrayBuffer()
    window.sourceBytes = bytes
    window.exportAdapter = null
    window.workerMessages = []
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor(...args) { super(...args); this.addEventListener('message', event => window.workerMessages.push(event.data?.type)) }
    }
    window.handle = await window.review.renderSpreadsheet(bytes, host, type, {
      registerExportAdapter: adapter => { window.exportAdapter = adapter },
      filename: file.slice(1), options: {
        initialViewState: { scale: 1 }, spreadsheet: {
          fillViewport, worker, workerUrl: '/vendor/xlsx/sheet.worker.js',
          resizableColumns: true, resizableRows: true,
        },
      },
    })
    window.Worker = NativeWorker
  }, { fillViewport, worker, file, type })
  await page.waitForFunction(() => document.querySelector('.loading')?.classList.contains('hidden'))
  await settle()
}
async function snapshot() {
  return page.evaluate(() => {
    const ctx = window.reviewTable.ctx, host = ctx.containerElement
    return {
      rows: ctx.body.data.length, columns: ctx.header.leafCellHeaders.map(header => ({ key: header.key, title: header.column.title, width: header.width, fixed: header.fixed, x: header.drawX })),
      width: ctx.header.width, height: ctx.body.height + ctx.header.height,
      viewportWidth: host.clientWidth, viewportHeight: host.clientHeight,
      summary: document.querySelector('.summary').textContent,
      firstValue: ctx.body.data[0]?.c0 ?? null,
      dom: host.querySelectorAll('*').length,
      head: ctx.body.headIndex, tail: ctx.body.tailIndex,
      scrollX: ctx.scrollX, scrollY: ctx.scrollY, messages: window.workerMessages,
      exportAdapter: window.exportAdapter,
    }
  })
}
function covers(value) {
  assert.ok(value.width >= value.viewportWidth - 1, JSON.stringify(value))
  assert.ok(value.height >= value.viewportHeight - 1, JSON.stringify(value))
  assert.ok(value.rows < 1000 && value.columns.length < 500, 'Padding must be proportional to the viewport')
  assert.ok(value.dom < 1500, 'Blank cells must remain virtual')
}
async function check(name, action) { await action(); report.checks.push({ name, passed: true }); console.log('PASS ' + name) }
try {
  await page.goto(origin)
  await check('false retains the original small-sheet range and geometry', async () => {
    await mount(false); report.baseline = await snapshot()
    assert.equal(report.baseline.rows, 1); assert.equal(report.baseline.columns.length, 15)
  })
  await check('enabled grid covers the viewport without resizing authored columns or changing counts/search', async () => {
    await mount(undefined); const value = await snapshot(); covers(value)
    assert.deepEqual(value.columns.slice(0, 15).map(column => column.width), report.baseline.columns.map(column => column.width))
    assert.equal(value.summary, report.baseline.summary); assert.equal(value.firstValue, '测试附件')
    assert.deepEqual(value.exportAdapter, report.baseline.exportAdapter)
    const matches = await page.evaluate(async () => (await window.review.findFileViewerSearchProvider(window.handle.$el).search('测试附件')).matches)
    assert.equal(matches.length, 1); assert.equal(matches[0].anchor.spreadsheet.row, 0)
    report.small = value
    await page.screenshot({ path: join(output, 'small-enabled.png') })
  })
  await check('real canvas paints the blank grid near the bottom and right edges', async () => {
    const pixels = await page.evaluate(() => {
      const canvas = window.reviewTable.ctx.canvasElement, context = canvas.getContext('2d')
      const bytes = context.getImageData(Math.max(0, canvas.width - 110), Math.max(0, canvas.height - 110), 80, 80).data
      let grid = 0
      for (let i = 0; i < bytes.length; i += 4) if (bytes[i + 3] && bytes[i] < 240 && bytes[i] > 180) grid++
      return grid
    })
    assert.ok(pixels > 30, 'Grid lines must be physically painted in the formerly empty area')
  })
  await check('padding keeps default metrics when the host enables row and column resizing', async () => {
    const before = await snapshot()
    await page.evaluate(() => {
      const ctx = window.reviewTable.ctx
      ctx.body.data[1]._height = 80
      ctx.emit('resizeRowChange', { rowIndex: 1, height: 80 })
    })
    await settle()
    assert.equal(await page.evaluate(() => window.reviewTable.ctx.body.data[1]._height), 20)
    assert.equal((await snapshot()).summary, before.summary)
    assert.deepEqual(await page.evaluate(() => {
      const padding = window.reviewTable.ctx.header.leafCellHeaders.find(header => header.key === 'c14').column
      return [padding.minWidth, padding.maxWidth]
    }), Array(2).fill(before.columns.find(column => column.key === 'c14').width))
    covers(await snapshot())
  })
  await check('resize and zoom recalculate padding including Z to AA while preserving cell sizes', async () => {
    for (const [width, height, zoom] of [[420, 330, 1], [2000, 900, 0.25], [1100, 720, 2.5], [1100, 720, 1]]) {
      await page.evaluate(({ width, height, zoom }) => {
        const host = document.querySelector('#host'); host.style.width = width + 'px'; host.style.height = height + 'px'
        window.review.findFileViewerZoomProvider(window.handle.$el).setZoom(zoom)
      }, { width, height, zoom })
      await page.waitForFunction(width => window.reviewTable.ctx.containerElement.clientWidth === width, width)
      await settle(); const value = await snapshot(); covers(value)
      assert.equal(value.columns[1].width, Math.round(64 * zoom))
      if (zoom === 0.25) assert.equal(value.columns[27].title, 'AA')
    }
  })
  await check('empty sheets keep zero content counts and work when switched or restored from cache', async () => {
    await page.getByRole('button', { name: 'Empty', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.sheet-tab.active')?.textContent === 'Empty' && document.querySelector('.summary')?.textContent === '')
    await page.waitForFunction(() => window.reviewTable.ctx.body.data[0]?.__k.startsWith('viewport-'))
    await settle(); const empty = await snapshot(); covers(empty); assert.equal(empty.columns[1].title, 'A'); assert.equal(empty.firstValue, null)
    await page.getByRole('button', { name: 'Small', exact: true }).click(); await settle()
    await page.getByRole('button', { name: 'Empty', exact: true }).click(); await settle(); covers(await snapshot())
    report.empty = empty
  })
  await check('merged cells, hidden dimensions and fixed row-number headers retain their behavior', async () => {
    await page.getByRole('button', { name: 'Merged', exact: true }).click()
    await page.waitForFunction(() => window.reviewTable.ctx.body.data[0]?.c0 === 'Merged')
    await settle(); covers(await snapshot())
    const span = await page.evaluate(() => window.reviewTable.ctx.config.SPAN_METHOD({ rowIndex: 0, colIndex: 1, column: { key: 'c0' } }))
    assert.deepEqual(span, { rowspan: 2, colspan: 3 })
    const columns = (await snapshot()).columns
    assert.equal(columns[0].fixed, 'left'); assert.equal(columns[1].width, 92)
    assert.equal(columns.some(column => column.key === 'c1'), false)
  })
  await check('large sheets do not expand and still load after horizontal and vertical scrolling', async () => {
    await page.getByRole('button', { name: 'Large', exact: true }).click()
    await page.waitForFunction(() => window.reviewTable.ctx.body.data[0]?.c0 === 'R1C1')
    const before = await snapshot(); assert.equal(before.rows, 3000); assert.equal(before.columns.length, 41)
    await page.evaluate(() => window.reviewTable.scrollTo(1100, 42000))
    await page.waitForFunction(() => {
      const ctx = window.reviewTable.ctx; return ctx.body.headIndex > 1000 && ctx.body.data[ctx.body.headIndex]?.__s === 2
    })
    const after = await snapshot(); assert.equal(after.rows, 3000); assert.equal(after.columns.length, 41)
    assert.equal(after.columns[0].fixed, 'left'); assert.equal(after.columns[0].x, 0)
    assert.ok(after.scrollX > 0 && after.scrollY > 0); assert.ok(after.dom < 1500)
    assert.equal(await page.evaluate(() => window.reviewTable.ctx.body.data[window.reviewTable.ctx.body.headIndex].c0), `R${after.head + 1}C1`)
    report.large = after
  })
  await check('actual static Worker supports small and empty sheets without fallback', async () => {
    await mount(true, true); covers(await snapshot())
    assert.ok((await snapshot()).messages.includes('sheets'))
    await mount(true, true, '/empty.xlsx'); covers(await snapshot())
    assert.ok((await snapshot()).messages.includes('parseSheet'))
    const matches = await page.evaluate(async () => (await window.review.findFileViewerSearchProvider(window.handle.$el).search('测试附件')).matches)
    assert.equal(matches.length, 0)
  })
  await check('CSV fills by default and false retains the original range for CSV and empty Excel', async () => {
    await mount(false, false, '/empty.xlsx'); const empty = await snapshot(); assert.equal(empty.rows, 0); assert.equal(empty.columns.length, 0)
    await mount(false, false, '/small.csv', 'csv'); const normal = await snapshot()
    await mount(undefined, false, '/small.csv', 'csv'); const filled = await snapshot(); covers(filled)
    assert.equal(filled.firstValue, normal.firstValue); assert.equal(filled.summary, normal.summary)
  })
  await check('unmount releases the table and no browser errors or external requests occur', async () => {
    await page.evaluate(() => window.handle.unmount())
    assert.deepEqual(errors, []); assert.deepEqual(external, [])
  })
  report.fixtureSha256 = createHash('sha256').update(assets.get('/book.xlsx')).digest('hex')
  report.passed = true
} finally {
  report.lastState = await page.evaluate(() => ({
    active: document.querySelector('.sheet-tab.active')?.textContent,
    summary: document.querySelector('.summary')?.textContent,
    error: document.querySelector('.error')?.textContent,
    rows: window.reviewTable?.ctx.body.data.length,
    firstKey: window.reviewTable?.ctx.body.data[0]?.__k,
  })).catch(() => null)
  await page.close(); await browser.close(); await new Promise(resolve => server.close(resolve))
  await writeFile(join(output, 'report.json'), JSON.stringify({ ...report, errors, external }, null, 2) + '\n')
}
