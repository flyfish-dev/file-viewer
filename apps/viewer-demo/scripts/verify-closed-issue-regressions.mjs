import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { delimiter, dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const dist = resolve(root, 'apps/viewer-demo/dist')
const output = resolve(root, 'output/closed-issue-regressions')
const require = createRequire(import.meta.url)
const spreadsheetRequire = createRequire(
  resolve(root, 'packages/renderers/spreadsheet/package.json')
)
const XLSX = spreadsheetRequire('styled-exceljs')
const JSZip = spreadsheetRequire('jszip')
const timeout = 60_000
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const evidence = { origin: '', assets: [], cases: [] }
await mkdir(output, { recursive: true })

async function importPlaywright() {
  for (const path of [
    root,
    ...(process.env.PATH || '')
      .split(delimiter)
      .filter((p) => p.endsWith(`${sep}node_modules${sep}.bin`))
      .map((p) => resolve(p, '..'))
  ]) {
    try {
      return await import(pathToFileURL(require.resolve('playwright', { paths: [path] })).href)
    } catch {}
  }
  throw new Error(
    'Run with npm exec --package playwright -- node apps/viewer-demo/scripts/verify-closed-issue-regressions.mjs'
  )
}

function createVirtualWorkbook() {
  const workbook = XLSX.utils.book_new()
  for (const [name, cells] of [
    [
      'First',
      [
        [2107, 120],
        [2200, 2]
      ]
    ],
    ['Second', [[2515, 120]]]
  ]) {
    const sheet = { '!ref': 'A1:DS3500', A1: { t: 's', v: 'Workbook search regression' } }
    for (const [r, c] of cells)
      sheet[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: 'REMOTE_NEEDLE' }
    if (name === 'Second') sheet['!merges'] = [{ s: { r: 2515, c: 120 }, e: { r: 2515, c: 122 } }]
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function createLongFlowDocx() {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  )
  zip.file(
    '_rels/.rels',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  )
  zip.file(
    'word/document.xml',
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl>${Array.from({ length: 150 }, (_, i) => `<w:tr><w:tc><w:p><w:r><w:t>Flow row ${i}</w:t></w:r></w:p></w:tc></w:tr>`).join('')}</w:tbl><w:sectPr><w:pgSz w:w="11907" w:h="16839"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`
  )
  return zip.generateAsync({ type: 'nodebuffer' })
}

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm'
}
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname)
  const path = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!path.startsWith(`${dist}${sep}`) || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404).end()
    return
  }
  response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream')
  createReadStream(path).pipe(response)
})

let browser
try {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const origin = (
    process.env.CLOSED_ISSUE_DEMO_URL || `http://127.0.0.1:${server.address().port}`
  ).replace(/\/$/, '')
  evidence.origin = origin
  const playwright = await importPlaywright()
  const { chromium } = playwright.chromium ? playwright : playwright.default
  try {
    browser = await chromium.launch({ headless: true })
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
  if (process.env.CLOSED_ISSUE_EXPECTED_COMMIT) {
    const response = await page.request.get(`${origin}/build-info.json`)
    const build = await response.json()
    assert.equal(build.sourceCommit, process.env.CLOSED_ISSUE_EXPECTED_COMMIT)
    assert.equal(build.sourceDirty, false, 'Production Demo was built from uncommitted source')
    evidence.build = build
  }
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const assetReads = []
  page.on('response', (response) => {
    if (/\/(?:assets\/.*|vendor\/.*)\.js(?:\?|$)/.test(response.url())) {
      assetReads.push(
        response
          .body()
          .then((bytes) =>
            evidence.assets.push({
              url: response.url(),
              status: response.status(),
              sha256: sha256(bytes)
            })
          )
          .catch(() => {})
      )
    }
  })

  async function openFixture(name, bytes) {
    await page.route(`**/__regression__/${name}`, (route) =>
      route.fulfill({ body: bytes, contentType: 'application/octet-stream' })
    )
    await page.goto(`${origin}/?url=${encodeURIComponent(`/__regression__/${name}`)}`, {
      waitUntil: 'domcontentloaded',
      timeout
    })
  }

  async function checkSearch(name, query, cells, sheetNames) {
    await page.locator('.e-virt-table-container').waitFor({ state: 'visible', timeout })
    await page.keyboard.press('Control+f')
    const input = page.locator('.viewer-search-popover input')
    await input.waitFor({ state: 'visible', timeout })
    assert.equal(
      await page.locator('.e-virt-table-finder-bar:visible').count(),
      0,
      'Ctrl+F opened the loaded-row-only vendor finder'
    )
    assert.equal(await page.locator('[data-spreadsheet-search]').count(), 0)
    await input.fill(query)
    await input.press('Enter')
    for (let step = 0; step <= cells.length; step++) {
      const index = step % cells.length
      if (step) await page.locator('.viewer-search-popover button').nth(1).click()
      const [row, col] = cells[index]
      await page
        .waitForFunction(
          ({ root, row, col, count, sheet, query }) => {
            const hit = root?.querySelector(
              `[data-spreadsheet-search="active"][data-spreadsheet-row="${row}"][data-spreadsheet-col="${col}"]`
            )
            if (!hit || document.querySelector('.viewer-search-summary')?.textContent !== count)
              return false
            if (sheet && root.querySelector('.sheet-tab.active')?.textContent !== sheet)
              return false
            const viewport = root.querySelector('.e-virt-table-container').getBoundingClientRect()
            const rect = hit.getBoundingClientRect()
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              rect.left >= viewport.left &&
              rect.right <= viewport.right &&
              rect.top >= viewport.top &&
              rect.bottom <= viewport.bottom &&
              hit.textContent.includes(query) &&
              getComputedStyle(hit).backgroundColor === 'rgb(255, 191, 71)' &&
              root.querySelectorAll('[data-spreadsheet-search="active"]').length === 1
            )
          },
          {
            root: await page.locator('.excel-wrapper').elementHandle(),
            row,
            col,
            query,
            count: `${index + 1}/${cells.length}`,
            sheet: sheetNames?.[index]
          },
          { timeout }
        )
        .catch(async (error) => {
          await page.screenshot({ path: resolve(output, `${name}-failure.png`) })
          console.error(
            await page.locator('.excel-wrapper').evaluate((root) => ({
              inDocument: !!document.querySelector('.excel-wrapper'),
              count: document.querySelector('.viewer-search-summary')?.textContent,
              viewport: root
                .querySelector('.e-virt-table-container')
                .getBoundingClientRect()
                .toJSON(),
              hits: [...root.querySelectorAll('[data-spreadsheet-search]')].map((el) => ({
                data: { ...el.dataset },
                rect: el.getBoundingClientRect().toJSON()
              }))
            }))
          )
          throw error
        })
      await page.screenshot({ path: resolve(output, `${name}-${step}.png`) })
    }
    await page.locator('.viewer-search-popover button').nth(0).click()
    await page.waitForFunction(
      () => document.querySelector('.viewer-search-summary')?.textContent === '3/3',
      null,
      { timeout }
    )
    await input.fill('NO_SUCH_WORKBOOK_TEXT')
    await input.press('Enter')
    await page.waitForFunction(
      (root) =>
        document.querySelector('.viewer-search-summary')?.textContent === '0/0' &&
        !root.querySelector('[data-spreadsheet-search]'),
      await page.locator('.excel-wrapper').elementHandle(),
      { timeout }
    )
    await input.fill('')
    await input.press('Enter')
    assert.equal(await page.locator('[data-spreadsheet-search]').count(), 0)
    evidence.cases.push({ name, cells, passed: true })
    console.log(
      `[closed-issues] ${name}: all matches visible, highlighted, next/previous/wrap/clear passed`
    )
  }

  const sample = await readFile(resolve(root, 'apps/viewer-demo/public/example/excel.xls'))
  assert.equal(sha256(sample), 'b70c312b2ba39a2adfaab02dc07131d02b5aa9ecbd528846b1953c8d2128c953')
  // Use the production sample URL too, not a synthetic replacement of the reported XLS.
  const deployedSample = await page.request.get(`${origin}/example/excel.xls`)
  assert.equal(sha256(await deployedSample.body()), sha256(sample))
  await page.goto(`${origin}/?url=%2Fexample%2Fexcel.xls`, {
    waitUntil: 'domcontentloaded',
    timeout
  })
  await checkSearch('issue-247-xls', '湖北三宁化工股份有限公司', [
    [176, 1],
    [181, 1],
    [189, 0]
  ])
  await openFixture('virtual.xlsx', createVirtualWorkbook())
  await checkSearch(
    'issue-247-virtual-xlsx',
    'REMOTE_NEEDLE',
    [
      [2107, 120],
      [2200, 2],
      [2515, 120]
    ],
    ['First', 'First', 'Second']
  )

  const docx = await readFile(
    resolve(root, 'apps/viewer-demo/test/fixtures/issue-250/page-anchors.docx')
  )
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 820 })
    await openFixture('page-anchors.docx', docx)
    await page
      .locator('[aria-label="CoverBorderOuter"]')
      .last()
      .waitFor({ state: 'visible', timeout })
    await page.waitForFunction(
      (root) => root.querySelectorAll('.docx-flow-frame').length >= 3,
      await page.locator('.docx-fit-viewer').elementHandle(),
      { timeout }
    )
    const geometry = await page.locator('section.docx').evaluateAll((pages) =>
      pages.map((page) => {
        const rect = page.getBoundingClientRect()
        const scale = rect.width / page.offsetWidth
        return {
          text: page.innerText,
          shapeCount: page.querySelectorAll('[aria-label="CoverBorderOuter"]').length,
          shapes: [...page.querySelectorAll('[aria-label="CoverBorderOuter"]')].map((shape) => {
            const box = shape.getBoundingClientRect()
            return {
              x: (box.left - rect.left) / scale,
              y: (box.top - rect.top) / scale,
              width: box.width / scale,
              height: box.height / scale,
              inside: box.left >= rect.left - 1 && box.right <= rect.right + 1
            }
          })
        }
      })
    )
    assert.equal(geometry[0].shapeCount, 1, 'First and second cover borders overlap on one page')
    assert.equal(geometry[1].shapeCount, 1, 'Second cover lost its own page coordinate space')
    for (const [index, expectedHeight] of [
      [0, 170.05],
      [1, 283.46]
    ]) {
      const shape = geometry[index].shapes[0]
      assert.ok(shape.inside, 'Cover border extends outside the paper')
      assert.ok(Math.abs(shape.x - (141.7 * 4) / 3) < 1, `Wrong page-relative x: ${shape.x}`)
      assert.ok(Math.abs(shape.y - (255.05 * 4) / 3) < 1, `Wrong page-relative y: ${shape.y}`)
      assert.ok(
        Math.abs(shape.height - (expectedHeight * 4) / 3) < 1,
        `Wrong shape height: ${shape.height}`
      )
    }
    assert.match(geometry[0].text, /Bắt đầu sử dụng/)
    assert.doesNotMatch(geometry[0].text, /THỦ TRƯỞNG/)
    assert.match(geometry[1].text, /THỦ TRƯỞNG/)
    await page.screenshot({ path: resolve(output, `issue-250-${width}.png`) })
    evidence.cases.push({
      name: `issue-250-${width}`,
      fixtureSha256: sha256(docx),
      geometry,
      passed: true
    })
    console.log(
      `[closed-issues] issue-250/${width}px: authored breaks and page-relative shape geometry passed`
    )
  }
  await openFixture('continuous.docx', await createLongFlowDocx())
  await page.getByText('Flow row 149', { exact: true }).waitFor({ state: 'attached', timeout })
  assert.equal(
    await page.locator('section.docx').count(),
    1,
    'Flow mode started automatically paginating a long table'
  )
  assert.equal(await page.locator('section.docx table').count(), 1)
  assert.equal(await page.locator('section.docx tr').count(), 150)
  assert.deepEqual(errors, [])
  evidence.cases.push({ name: 'continuous-table', rows: 150, passed: true })
  await Promise.all(assetReads)
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(evidence, null, 2) + '\n')
  await browser?.close()
  await new Promise((r) => server.close(r))
}
