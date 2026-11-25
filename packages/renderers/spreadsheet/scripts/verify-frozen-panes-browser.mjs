import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import JSZip from 'jszip'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { utils, write } from 'styled-exceljs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sheets = [
  { name: 'Both', prefix: 'b', rows: 2, columns: 2 },
  { name: 'Rows', prefix: 'r', rows: 2, columns: 0 },
  { name: 'Columns', prefix: 'c', rows: 0, columns: 2 },
  { name: 'Unfrozen', prefix: 'u', rows: 0, columns: 0 }
]
const rowCount = 700
const columnCount = 16
const lastRow = 660
const theme = process.env.FILE_VIEWER_FROZEN_PANES_THEME === 'dark' ? 'dark' : 'light'
const token = (sheet, row, column) => `${sheet.prefix}_r${row}_c${column}`

async function createWorkbook() {
  const workbook = utils.book_new()
  for (const sheet of sheets) {
    const cells = Array.from({ length: rowCount }, (_, row) =>
      Array.from({ length: columnCount }, (_, column) => token(sheet, row, column)))
    const worksheet = utils.aoa_to_sheet(cells)
    worksheet['!cols'] = Array.from({ length: columnCount }, () => ({ wpx: 125 }))
    worksheet['!rows'] = Array.from({ length: rowCount }, () => ({ hpt: 18 }))
    utils.book_append_sheet(workbook, worksheet, sheet.name)
  }
  const zip = await JSZip.loadAsync(write(workbook, { type: 'array', bookType: 'xlsx' }))
  const styles = await zip.file('xl/styles.xml').async('string')
  zip.file('xl/styles.xml', styles
    .replace('<fonts count="1">', '<fonts count="2">')
    .replace('</fonts>', '<font><b/><sz val="12"/><color rgb="FFFF2020"/><name val="Calibri"/></font></fonts>')
    .replace('<cellXfs count="1">', '<cellXfs count="2">')
    .replace('</cellXfs>', '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1"/></xf></cellXfs>'))
  for (const [index, sheet] of sheets.entries()) {
    if (!sheet.rows && !sheet.columns) continue
    const part = `xl/worksheets/sheet${index + 1}.xml`
    const xml = await zip.file(part).async('string')
    const freeze = [
      sheet.columns ? ` xSplit="${sheet.columns}"` : '',
      sheet.rows ? ` ySplit="${sheet.rows}"` : '',
      ` topLeftCell="${utils.encode_cell({ r: sheet.rows, c: sheet.columns })}"`,
      ' state="frozen"'
    ].join('')
    const view = `<sheetViews><sheetView workbookViewId="0"><pane${freeze}/></sheetView></sheetViews>`
    assert.match(xml, /<sheetViews>[\s\S]*?<\/sheetViews>/)
    const styledXml = sheet.name === 'Both' ? xml.replace(/<c r="[A-D][34]"/g, '$& s="1"') : xml
    zip.file(part, styledXml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, view))
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

const fixture = await createWorkbook()
const worker = await readFile(join(packageDir, 'dist/worker/sheet.worker.js'))
const bundled = await build({
  stdin: {
    contents: `
import { renderFileViewerSpreadsheet } from ${JSON.stringify(join(packageDir, 'dist/index.js'))};
import { findFileViewerViewStateProvider } from '@file-viewer/core';

const NativeWorker = window.Worker;
window.sheetWindows = [];
window.Worker = class extends NativeWorker {
  constructor(...args) {
    super(...args);
    this.addEventListener('message', ({ data }) => {
      if (data.type === 'parseSheet') {
        const { sheet, sheetData } = data.payload;
        window.sheetWindows.push({ sheet, startRow: sheetData.meta.startRow, freeze: sheetData.structure?.freeze });
      }
    });
  }
};

const tokens = /^[brcu]_r\\d+_c\\d+$/;
const drawn = new WeakMap();
const { fillText, clearRect } = CanvasRenderingContext2D.prototype;
CanvasRenderingContext2D.prototype.clearRect = function (...args) {
  drawn.delete(this.canvas);
  return clearRect.apply(this, args);
};
CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
  const value = String(text);
  if (tokens.test(value)) {
    const hit = this.getTransform().transformPoint({ x, y });
    const marks = drawn.get(this.canvas) || new Map();
    marks.set(value, hit);
    drawn.set(this.canvas, marks);
  }
  return fillText.call(this, text, x, y, ...args);
};

const displayed = (element, x, y) => {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const box = node.getBoundingClientRect();
    if (style.overflowX !== 'visible' && (x < box.left || x > box.right)) return false;
    if (style.overflowY !== 'visible' && (y < box.top || y > box.bottom)) return false;
  }
  return true;
};

window.readMarkers = (wanted) => {
  const grid = document.querySelector('.excel-wrapper .table-wrapper');
  if (!grid) return {};
  const bounds = grid.getBoundingClientRect();
  const result = {};
  const inspect = (value, x, y, element) => {
    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom && displayed(element, x, y)) {
      result[value] = { x: x - bounds.left, y: y - bounds.top };
    }
  };
  for (const canvas of grid.querySelectorAll('canvas')) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;
    for (const value of wanted) {
      const mark = drawn.get(canvas)?.get(value);
      if (mark) {
        inspect(value, bounds.left + mark.x * bounds.width / canvas.width,
          bounds.top + mark.y * bounds.height / canvas.height, canvas);
      }
    }
  }
  for (const element of grid.querySelectorAll('*')) {
    if (element.childElementCount) continue;
    const value = element.textContent?.trim();
    if (!wanted.includes(value) || result[value]) continue;
    const textRange = document.createRange();
    textRange.selectNodeContents(element);
    const box = textRange.getBoundingClientRect();
    if (box.width && box.height) inspect(value, box.left, box.top + box.height / 2, element);
  }
  return result;
};

const bytes = await (await fetch('/frozen-panes.xlsx')).arrayBuffer();
window.viewer = await renderFileViewerSpreadsheet(bytes, document.querySelector('#app'), 'xlsx', {
  filename: 'frozen-panes.xlsx',
  options: { theme: ${JSON.stringify(theme)}, fit: 'none', spreadsheet: { worker: true, workerUrl: '/sheet.worker.js' } }
});
window.provider = findFileViewerViewStateProvider(window.viewer.$el);
window.moveToRange = (sheetId, row, column) => window.provider.applyState({
  spreadsheet: { range: { sheetId, startRow: row, endRow: row, startCol: column, endCol: column } }
});
`,
    resolveDir: packageDir
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  logLevel: 'warning'
})

const assets = new Map([
  ['/', ['text/html', '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body,#app{height:100%;margin:0}</style><div id="app"></div><script type="module" src="/main.js"></script>']],
  ['/main.js', ['text/javascript', bundled.outputFiles[0].contents]],
  ['/sheet.worker.js', ['text/javascript', worker]],
  ['/frozen-panes.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fixture]]
])
const server = createServer((request, response) => {
  const asset = assets.get(new URL(request.url, 'http://127.0.0.1').pathname)
  if (!asset) {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, { 'Content-Type': asset[0] }).end(asset[1])
})

const near = (left, right, label) => assert.ok(Math.abs(left - right) <= 5, `${label}: ${left} versus ${right}`)
const output = process.env.FILE_VIEWER_FROZEN_PANES_EVIDENCE

function countRedInk(image, left, right, top, bottom) {
  let count = 0
  for (let y = Math.ceil(top); y < Math.floor(bottom); y++) {
    for (let x = Math.ceil(left); x < Math.floor(right); x++) {
      const offset = (y * image.width + x) * 4
      if (image.data[offset] > 155 && image.data[offset + 1] < 90 && image.data[offset + 2] < 90) count++
    }
  }
  return count
}

async function verifyFrozenOcclusion(page, label) {
  const overlay = page.locator('.e-virt-table-overlayer-body')
  const text = overlay.getByText('b_r2_c0', { exact: true })
  await text.waitFor()
  const { cell, body } = await text.evaluate(element => {
    const { x, y, width, height } = element.parentElement.getBoundingClientRect()
    const area = element.closest('.e-virt-table-overlayer-body').getBoundingClientRect()
    return { cell: { x, y, width, height }, body: { x: area.x, y: area.y, width: area.width } }
  })
  const left = cell.x
  const right = Math.min(body.x + body.width, left + cell.width * 4)
  const seam = cell.y + 1
  const before = PNG.sync.read(await page.screenshot(output ? { path: join(output, `overlay-${label}-before.png`) } : {}))
  assert.ok(countRedInk(before, left, right, seam + 2, seam + cell.height * 2) > 50,
    'styled body text must paint distinct pixels in the scrolling pane')

  await page.mouse.move(left + 20, seam + 50)
  const scrollAgainstSeam = Math.round(cell.height * 0.75)
  await page.mouse.wheel(0, scrollAgainstSeam)
  await page.waitForFunction(delta => window.provider.getState().scroll.top >= delta - 2, scrollAgainstSeam)
  // After the wheel, wait for the real text layer to cross the pane boundary.
  await page.waitForFunction(y => [...document.querySelectorAll('.e-virt-table-overlayer-body span')].some(element =>
    element.textContent === 'b_r2_c0' && element.getBoundingClientRect().top < y
  ), seam)
  const after = PNG.sync.read(await page.screenshot(output ? { path: join(output, `overlay-${label}-scrolled.png`) } : {}))
  assert.ok(countRedInk(after, left, right, seam + 2, seam + cell.height * 2) > 50,
    'clipping must preserve body text below the frozen pane')
  const overlapPixels = countRedInk(after, left, right, body.y + 2, seam - 2)
  assert.equal(overlapPixels, 0, 'scrolling body text painted above the frozen pane boundary')
  console.log(`[spreadsheet] ${theme} ${label}: overlap pixels ${overlapPixels}, scrolling text stays visible.`)
  await page.mouse.wheel(0, -100)
  await page.waitForFunction(() => window.provider.getState().scroll.top === 0)
  return cell.height
}

let browser
try {
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen))
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ channel: process.env.FILE_VIEWER_BROWSER_CHANNEL || 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 850, height: 580 } })
  const workers = [], errors = [], external = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) external.push(request.url())
  })
  page.on('response', response => {
    if (response.url() === `${origin}/sheet.worker.js`) {
      workers.push({ status: response.status(), mime: response.headers()['content-type'] })
    }
  })
  await page.goto(origin)
  await page.waitForFunction(() => !!window.provider)
  if (output) {
    await mkdir(output, { recursive: true })
    await writeFile(join(output, 'styled-freeze.xlsx'), fixture)
  }
  const unscaledHeight = await verifyFrozenOcclusion(page, '100%')
  await page.evaluate(() => window.provider.applyState({ scale: 1.25 }))
  await page.waitForFunction(height => [...document.querySelectorAll('.e-virt-table-overlayer-body span')].some(element =>
    element.textContent === 'b_r2_c0' && element.parentElement.getBoundingClientRect().height > height * 1.15
  ), unscaledHeight)
  await verifyFrozenOcclusion(page, '125%')
  await page.evaluate(() => window.provider.applyState({ scale: 1 }))

  for (const [sheetId, sheet] of sheets.entries()) {
    const initial = token(sheet, 1, 1)
    await page.getByRole('button', { name: sheet.name, exact: true }).click()
    await page.waitForFunction(value => window.readMarkers([value])[value], initial)
    const start = await page.evaluate(value => window.readMarkers([value])[value], initial)
    const target = token(sheet, lastRow, columnCount - 1)
    const rowMarker = token(sheet, 1, columnCount - 1)
    const colMarker = token(sheet, lastRow, 1)
    const wanted = [target, initial, rowMarker, colMarker]
    const mustPaint = [target, ...(sheet.rows ? [rowMarker] : []), ...(sheet.columns ? [colMarker] : [])]
    const state = await page.evaluate(({ sheetId, row, column }) => window.moveToRange(sheetId, row, column),
      { sheetId, row: lastRow, column: columnCount - 1 })
    assert.equal(state.spreadsheet.status, 'applied')
    assert.ok(state.scroll.top > 10_000 && state.scroll.left > 800, `${sheet.name}: scroll both axes to the remote cell`)

    await page.waitForFunction(markers => {
      const painted = window.readMarkers(markers);
      return markers.every(marker => painted[marker]);
    }, mustPaint, { timeout: 12_000 })
    const current = await page.evaluate(values => window.readMarkers(values), wanted)
    if (sheet.rows) {
      near(current[rowMarker].y, start.y, `${sheet.name}: frozen row position`)
      near(current[rowMarker].x, current[target].x, `${sheet.name}: frozen row follows horizontal scrolling`)
    } else {
      assert.equal(current[rowMarker], undefined, `${sheet.name}: top row must scroll away`)
    }
    if (sheet.columns) {
      near(current[colMarker].x, start.x, `${sheet.name}: frozen column position`)
      near(current[colMarker].y, current[target].y, `${sheet.name}: frozen column follows vertical scrolling`)
    } else {
      assert.equal(current[colMarker], undefined, `${sheet.name}: left column must scroll away`)
    }
    if (sheet.rows && sheet.columns) {
      assert.ok(current[initial], 'Both: intersecting frozen cell remains visible')
      near(current[initial].x, start.x, 'Both: corner x')
      near(current[initial].y, start.y, 'Both: corner y')
      await page.mouse.move(480, 300)
      await page.mouse.wheel(-180, -500)
      await page.waitForFunction(({ top, left }) => {
        const scroll = window.provider.getState().scroll
        return scroll.top < top && scroll.left < left
      }, state.scroll)
      const afterWheel = await page.evaluate(value => window.readMarkers([value])[value], initial)
      near(afterWheel.x, start.x, 'Both: corner x after wheel scroll')
      near(afterWheel.y, start.y, 'Both: corner y after wheel scroll')
    } else {
      assert.equal(current[initial], undefined, `${sheet.name}: the unpinned axis can move the initial corner away`)
    }
    const windows = await page.evaluate(() => window.sheetWindows)
    assert.ok(windows.some(item => item.sheet === sheetId && item.startRow >= 500), `${sheet.name}: the worker loaded rows beyond the first window`)
    const layout = windows.find(item => item.sheet === sheetId && item.startRow === 0)
    assert.deepEqual(layout?.freeze, sheet.rows || sheet.columns ? { rows: sheet.rows, columns: sheet.columns } : undefined)
    if (output) await page.screenshot({ path: join(output, `${sheet.prefix}-remote.png`) })
    console.log(`[spreadsheet] ${sheet.name} freeze, visible markers and remote worker data passed.`)
  }
  assert.ok(workers.length && workers.every(response => response.status === 200 && response.mime.includes('javascript')))
  assert.deepEqual(errors, [])
  assert.deepEqual(external, [])
  await page.evaluate(() => window.viewer.unmount())
} finally {
  await browser?.close()
  await new Promise(resolveClose => server.close(resolveClose))
}
