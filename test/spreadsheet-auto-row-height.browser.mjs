import { chromium, webkit } from 'playwright'
import assert from 'node:assert/strict'
import { writeFile, mkdir } from 'node:fs/promises'
const base =
  process.env.SPREADSHEET_AUTO_HEIGHT_BASE_URL ||
  'http://127.0.0.1:43147/preview/test/fixtures/spreadsheet-auto-row-height/index.html'
const out = new URL(
  '../artifacts/spreadsheet-auto-row-height/',
  import.meta.url,
)
await mkdir(out, { recursive: true })
const reports = []
const getMetrics = async (p) =>
  p.locator('.table-wrapper span').evaluateAll((es) =>
    es
      .filter((e) => e.style.whiteSpace === 'pre-wrap')
      .map((e) => {
        const r = e.getBoundingClientRect()
        return {
          text: e.textContent,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          scrollHeight: e.scrollHeight,
        }
      }),
  )
const waitText = async (p, prefix, full = true) => {
  await p.waitForFunction(
    ({ prefix, full }) => {
      const find = (root) => {
        for (const e of root.querySelectorAll('.table-wrapper span'))
          if (
            e.style.whiteSpace === 'pre-wrap' &&
            e.textContent.startsWith(prefix)
          ) {
            const r = e.getBoundingClientRect()
            if (r.height > 0 && (!full || e.scrollHeight <= r.height + 1))
              return true
          }
        for (const e of root.querySelectorAll('*'))
          if (e.shadowRoot && find(e.shadowRoot)) return true
        return false
      }
      return find(document)
    },
    { prefix, full },
    { timeout: 15000 },
  )
  return (await getMetrics(p)).find((x) => x.text.startsWith(prefix))
}
for (const [engine, type] of Object.entries({ chromium, webkit })) {
  const b = await type.launch()
  try {
    for (const worker of [true, false]) {
      const p = await b.newPage({
        viewport: { width: 1200, height: 900 },
        locale: 'en-US',
      })
      const errors = [],
        external = [],
        requests = []
      p.on('pageerror', (e) => errors.push(e.message))
      p.on('request', (r) => {
        if (r.url().endsWith('.xlsx')) requests.push(r.url())
      })
      await p.route('**/*', (r) => {
        const u = new URL(r.request().url())
        if (
          u.hostname === '127.0.0.1' ||
          ['data:', 'blob:'].includes(u.protocol)
        )
          return r.continue()
        external.push(u.href)
        return r.abort()
      })
      const open = async (file) => {
        await p.goto(`${base}?file=${file}&worker=${worker}`)
        await p.waitForFunction(() => window.issuesReady)
      }
      await open('original-454.xlsx')
      const initial = [
        await waitText(p, 'Wrapped text'),
        await waitText(p, 'Line 1'),
      ]
      assert.ok(initial[0].height > 40 && initial[1].height > 40)
      await p.screenshot({
        path: new URL(`${engine}-${worker}-original.png`, out).pathname,
      })
      const zooms = []
      for (const dir of ['Out', 'In']) {
        const z = await p.evaluate(async (dir) => {
          let s = window.commentsTest.getZoomState()
          for (
            let i = 0;
            i < 50 && s[dir === 'Out' ? 'canZoomOut' : 'canZoomIn'];
            i++
          )
            s = await window.commentsTest['zoom' + dir]()
          return s.scale
        }, dir)
        await p.waitForTimeout(300)
        const metrics = [
          await waitText(p, 'Wrapped text'),
          await waitText(p, 'Line 1'),
        ]
        zooms.push({ z, metrics })
        await p.evaluate(() => window.commentsTest.resetZoom())
        await p.waitForTimeout(300)
        const reset = await waitText(p, 'Wrapped text')
        assert.ok(Math.abs(reset.height - initial[0].height) <= 1)
      }
      assert.deepEqual(
        zooms.map((x) => x.z),
        [0.25, 2.5],
      )
      // Actual canvas header dragging, not a test-only table API.
      const before = await waitText(p, 'Wrapped text'),
        table = await p.locator('.table-wrapper').boundingBox()
      const boundary = before.x + before.width
      await p.mouse.move(boundary, table.y + 16)
      await p.mouse.down()
      await p.mouse.move(boundary - 65, table.y + 16, { steps: 10 })
      await p.mouse.up()
      await p.waitForTimeout(400)
      const narrow = await waitText(p, 'Wrapped text')
      assert.ok(narrow.width < before.width - 20)
      assert.ok(narrow.height > before.height)
      await p.mouse.move(narrow.x + narrow.width, table.y + 16)
      await p.mouse.down()
      await p.mouse.move(boundary, table.y + 16, { steps: 10 })
      await p.mouse.up()
      await p.waitForTimeout(400)
      const wide = await waitText(p, 'Wrapped text')
      assert.ok(wide.height < narrow.height)
      const line = await waitText(p, 'Line 1')
      await p.mouse.move(table.x + 34, line.y + line.height)
      await p.mouse.down()
      await p.mouse.move(table.x + 34, line.y + 27, { steps: 10 })
      await p.mouse.up()
      await p.waitForTimeout(300)
      const manual = (await getMetrics(p)).find((x) =>
        x.text.startsWith('Line 1'),
      )
      assert.ok(manual.height < 40)
      await p.evaluate(() => window.commentsTest.zoomIn())
      await p.evaluate(() => window.commentsTest.resetZoom())
      await p.waitForTimeout(300)
      assert.ok(
        Math.abs(
          (await getMetrics(p)).find((x) => x.text.startsWith('Line 1'))
            .height - manual.height,
        ) <= 1,
      )
      await open('autoheight-controls.xlsx')
      await waitText(p, 'Wrapped text')
      await p.waitForTimeout(300)
      const fixed = await getMetrics(p)
      for (const prefix of [
        'Explicit height',
        'Custom height only',
        'Merged wrap',
      ]) {
        const x = fixed.find((x) => x.text.startsWith(prefix))
        assert.ok(x, prefix)
        assert.equal(x.height, 20, prefix)
      }
      assert.ok(
        !fixed.some(
          (x) =>
            x.text.startsWith('Hidden row') || x.text.startsWith('Zero height'),
        ),
      )
      for (const n of [500, 501, 650]) {
        await p.evaluate(
          (n) => window.commentsTest.searchDocument('Window ' + n),
          n,
        )
        await waitText(p, 'Window ' + n)
      }
      await p.getByRole('button', { name: 'Second', exact: true }).click()
      await waitText(p, 'Second sheet')
      await p.getByRole('button', { name: 'Sheet1', exact: true }).click()
      await p.evaluate(() => window.commentsTest.searchDocument('Window 650'))
      await waitText(p, 'Window 650')
      await p.evaluate(() =>
        window.commentsTest.searchDocument('Late font wrap'),
      )
      await waitText(p, 'Late font wrap')
      await p.evaluate(async () => {
        const font = new FontFace('LateWorkbookFont', 'local("Arial")')
        await font.load()
        document.fonts.add(font)
        document.fonts.dispatchEvent(new Event('loadingdone'))
      })
      await p.waitForTimeout(400)
      await waitText(p, 'Late font wrap')
      await p.evaluate(() => {
        document.getElementById('viewer').style.display = 'none'
      })
      await p.waitForTimeout(150)
      await p.evaluate(() => {
        document.getElementById('viewer').style.display = 'block'
      })
      await p.waitForTimeout(400)
      await waitText(p, 'Late font wrap')
      await open('autoheight-drawings.xlsx')
      const a1 = await waitText(p, 'Wrapped text'),
        a2 = await waitText(p, 'Line 1')
      await p.waitForTimeout(400)
      const images = await p.locator('img.excel-image').evaluateAll((es) =>
        Object.fromEntries(
          es.map((e) => [
            e.alt,
            {
              top: parseFloat(e.style.top),
              height: parseFloat(e.style.height),
            },
          ]),
        ),
      )
      assert.equal(Object.keys(images).length, 5)
      assert.ok(Math.abs(images.rId1.top - (a1.height + a2.height + 2)) <= 1)
      assert.equal(images.rId1.height, 40)
      assert.ok(Math.abs(images.rId2.height - (a1.height + a2.height)) <= 1)
      assert.equal(images.rId3.height, 40)
      assert.equal(images.rId4.top, 2)
      assert.equal(images.rId4.height, 40)
      assert.equal(images.rId5.top, 40)
      assert.equal(images.rId5.height, 40)
      const chart = await p
        .locator('.excel-chart')
        .evaluate((e) => ({
          top: parseFloat(e.style.top),
          height: parseFloat(e.style.height),
        }))
      assert.equal(chart.top, 2)
      assert.ok(Math.abs(chart.height - (a1.height + a2.height)) <= 1)
      await p.screenshot({
        path: new URL(`${engine}-${worker}-drawings.png`, out).pathname,
      })
      await p.evaluate(() => {
        window.commentsTest.zoomIn()
        window.commentsTest.destroy()
      })
      await p.waitForTimeout(200)
      assert.equal(await p.locator('[data-spreadsheet-auto-height]').count(), 0)
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
      assert.equal(requests.length, 3)
      reports.push({
        engine,
        worker,
        initial,
        zooms,
        narrow,
        wide,
        manual,
        fixed,
        images,
        chart,
        errors,
        external,
        workbookRequests: requests.length,
      })
      await p.close()
    }
  } finally {
    await b.close()
  }
}
await writeFile(new URL('results.json', out), JSON.stringify(reports, null, 2))
console.log(
  'PASS original, zoom/reset, actual column/row drag, source size controls, 500/501/650, cross-sheet, late font, hidden/show, drawing editAs and disposal across Chromium/WebKit main/Worker',
)
