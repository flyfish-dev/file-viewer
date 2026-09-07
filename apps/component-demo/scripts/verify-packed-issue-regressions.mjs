import assert from 'node:assert/strict'
import { delimiter, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, resolve, sep } from 'node:path'

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
assert.ok(
  process.env.PACKED_ISSUE_CONSUMER_DIR,
  'Set PACKED_ISSUE_CONSUMER_DIR to the built, cold-installed consumer project'
)
const project = resolve(process.env.PACKED_ISSUE_CONSUMER_DIR)
const root = resolve(project, 'dist')
const out = resolve(project, 'regression-evidence')
const require = createRequire(resolve(source, 'packages/renderers/data/package.json'))
const zipRequire = createRequire(resolve(source, 'packages/renderers/spreadsheet/package.json'))
const JSZip = zipRequire('jszip')
await mkdir(out, { recursive: true })
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://local').pathname
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.setHeader(
    'Content-Type',
    {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.wasm': 'application/wasm'
    }[extname(file)] || 'application/octet-stream'
  )
  createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const toolRequire = createRequire(import.meta.url)
let playwright
for (const path of [
  source,
  ...(process.env.PATH || '')
    .split(delimiter)
    .filter((p) => p.endsWith(`${sep}node_modules${sep}.bin`))
    .map((p) => resolve(p, '..'))
]) {
  try {
    playwright = await import(
      pathToFileURL(toolRequire.resolve('playwright', { paths: [path] })).href
    )
    break
  } catch {}
}
assert.ok(
  playwright,
  'Run with npm exec --package playwright -- node apps/component-demo/scripts/verify-packed-issue-regressions.mjs'
)
const browser = await (playwright.chromium ? playwright : playwright.default).chromium.launch({
  headless: true
})
const report = []
async function poll(read, check, label, timeout = 45000) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    try {
      last = await read()
      if (check(last)) return last
    } catch (e) {
      last = e.message
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`${label}: ${JSON.stringify(last)}`)
}
async function revisionDocx() {
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
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Tracked: </w:t></w:r><w:del w:id="1" w:author="Regression"><w:r><w:delText>OLD_VALUE</w:delText></w:r></w:del><w:ins w:id="2" w:author="Regression"><w:r><w:t>NEW_VALUE</w:t></w:r></w:ins></w:p><w:p><w:r><w:t>Unchanged: OLD_VALUE</w:t></w:r></w:p></w:body></w:document>'
  )
  return {
    name: 'revisions.docx',
    mimeType: 'application/octet-stream',
    buffer: await zip.generateAsync({ type: 'nodebuffer' })
  }
}
async function avroFixture() {
  const avsc = require('avsc')
  const encoder = new avsc.streams.BlockEncoder(
    {
      type: 'record',
      name: 'Row',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'value', type: 'int' }
      ]
    },
    { codec: 'deflate' }
  )
  const chunks = []
  const ended = new Promise((resolve, reject) =>
    encoder
      .on('data', (b) => chunks.push(b))
      .on('end', resolve)
      .on('error', reject)
  )
  encoder.write({ title: 'Browser Avro deflate', value: 243 })
  encoder.end({ title: 'Second row', value: 255 })
  await ended
  return {
    name: 'deflate.avro',
    mimeType: 'application/octet-stream',
    buffer: Buffer.concat(chunks)
  }
}
const sample = (name) => resolve(source, 'apps/viewer-demo/public/example', name)
try {
  for (const framework of ['vue', 'react']) {
    for (const kind of [
      'doc',
      'docx-revisions',
      'docx-cover',
      'xls',
      ...(framework === 'react' ? ['psd', 'avro', 'step', 'xmind', 'ppt'] : [])
    ]) {
      const name = `${framework}-${kind}`
      if (process.env.CONSUMER_CASES && !process.env.CONSUMER_CASES.split(',').includes(name))
        continue
      console.log(`[consumer] Starting ${name}`)
      const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })
      page.setDefaultTimeout(45000)
      const errors = []
      const requests = []
      page.on('pageerror', (e) => errors.push(e.message))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text())
      })
      page.on('response', (r) => {
        if (r.status() >= 400 && !r.url().endsWith('/favicon.ico'))
          requests.push({ url: r.url(), status: r.status() })
      })
      let details
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}`)
        if (framework === 'react') await page.locator('#react').check()
        const files = {
          doc: resolve(source, 'packages/renderers/doc/test/fixtures/github-255-revisions.doc'),
          'docx-cover': resolve(
            source,
            'apps/viewer-demo/test/fixtures/issue-250/page-anchors.docx'
          ),
          xls: sample('excel.xls'),
          psd: sample('design.psd'),
          step: sample('model.step'),
          xmind: sample('mindmap.xmind'),
          ppt: sample('office-demo.ppt')
        }
        await page
          .locator('#file')
          .setInputFiles(
            kind === 'docx-revisions'
              ? await revisionDocx()
              : kind === 'avro'
                ? await avroFixture()
                : files[kind]
          )
        if (kind === 'doc' || kind === 'docx-revisions') {
          const surface = page.locator(kind === 'doc' ? '.msdoc-root' : 'section.docx').first()
          await surface.locator('del').first().waitFor({ state: 'visible' })
          const marks = await surface
            .locator('ins,del')
            .evaluateAll((es) =>
              es.map((e) => ({
                tag: e.tagName,
                text: e.textContent,
                decoration: getComputedStyle(e).textDecorationLine
              }))
            )
          assert.equal(
            marks
              .filter((m) => m.tag === 'DEL')
              .map((m) => m.text)
              .join(''),
            kind === 'doc' ? '2222' : 'OLD_VALUE'
          )
          assert.equal(
            marks
              .filter((m) => m.tag === 'INS')
              .map((m) => m.text)
              .join(''),
            kind === 'doc' ? '\u6d4b\u8bd5\u4fee\u8ba2' : 'NEW_VALUE'
          )
          marks.forEach((m) =>
            assert.ok(m.decoration.includes(m.tag === 'DEL' ? 'line-through' : 'underline'))
          )
          for (const mode of ['final', 'original', 'all']) {
            await page.locator('#review').selectOption(mode)
            await poll(
              () =>
                (kind === 'doc'
                  ? surface.locator('p').filter({ hasText: '\u7532\u65b9' })
                  : surface.locator('p')
                )
                  .first()
                  .innerText(),
              (text) => {
                const old = kind === 'doc' ? '2222' : 'OLD_VALUE'
                const inserted = kind === 'doc' ? '\u6d4b\u8bd5\u4fee\u8ba2' : 'NEW_VALUE'
                return (
                  text.includes(old) === (mode !== 'final') &&
                  text.includes(inserted) === (mode !== 'original')
                )
              },
              `${name}/${mode}`
            )
          }
          details = { marks, modes: ['all', 'final', 'original'] }
        } else if (kind === 'docx-cover') {
          await page.locator('[aria-label="CoverBorderOuter"]').last().waitFor({ state: 'visible' })
          await poll(
            () => page.locator('section.docx').count(),
            (n) => n >= 3,
            'authored page breaks'
          )
          details = await page.locator('section.docx').evaluateAll((pages) =>
            pages.map((page) => {
              const rect = page.getBoundingClientRect(),
                scale = rect.width / page.offsetWidth
              return {
                text: page.innerText,
                shapes: [...page.querySelectorAll('[aria-label="CoverBorderOuter"]')].map(
                  (shape) => {
                    const box = shape.getBoundingClientRect()
                    return {
                      x: (box.left - rect.left) / scale,
                      y: (box.top - rect.top) / scale,
                      height: box.height / scale,
                      inside: box.left >= rect.left - 1 && box.right <= rect.right + 1
                    }
                  }
                )
              }
            })
          )
          for (const [index, height] of [
            [0, 170.05],
            [1, 283.46]
          ]) {
            assert.equal(details[index].shapes.length, 1, 'Cover borders overlap')
            const s = details[index].shapes[0]
            assert.ok(
              s.inside &&
                Math.abs(s.x - (141.7 * 4) / 3) < 1 &&
                Math.abs(s.y - (255.05 * 4) / 3) < 1 &&
                Math.abs(s.height - (height * 4) / 3) < 1,
              JSON.stringify(s)
            )
          }
          assert.doesNotMatch(details[0].text, /THỦ TRƯỞNG/)
          assert.match(details[1].text, /THỦ TRƯỞNG/)
          for (const delta of [-160, 260]) {
            const handle = await page.locator('.el-drawer__dragger').boundingBox()
            assert.ok(handle, 'Missing actual Element Plus resize handle')
            await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
            await page.mouse.down()
            await page.mouse.move(handle.x + delta, handle.y + handle.height / 2, { steps: 12 })
            await page.mouse.up()
            await poll(() => page.locator('section.docx').evaluateAll(pages => {
              return pages.slice(0, 2).every((page, index) => {
                const paper = page.getBoundingClientRect()
                const scale = paper.width / page.offsetWidth
                const shapes = page.querySelectorAll('[aria-label="CoverBorderOuter"]')
                if (shapes.length !== 1) return false
                const shape = shapes[0].getBoundingClientRect()
                return shape.left >= paper.left - 1 && shape.right <= paper.right + 1 &&
                  Math.abs((shape.left - paper.left) / scale - 141.7 * 4 / 3) < 1 &&
                  Math.abs((shape.top - paper.top) / scale - 255.05 * 4 / 3) < 1 &&
                  Math.abs(shape.height / scale - [170.05, 283.46][index] * 4 / 3) < 1
              })
            }), valid => valid, `${name}/actual-drawer-resize`)
          }
          for (let i = 0; i < 3; i++) {
            await page.locator('.el-drawer__close-btn').click()
            await page.locator('section.docx').first().waitFor({ state: 'detached' })
            await page.locator('#toggle').click()
            await page
              .locator('[aria-label="CoverBorderOuter"]')
              .last()
              .waitFor({ state: 'visible' })
          }
        } else if (kind === 'xls') {
          await page.locator('.e-virt-table-container').waitFor({ state: 'visible' })
          await page
            .locator('#query')
            .fill('\u6e56\u5317\u4e09\u5b81\u5316\u5de5\u80a1\u4efd\u6709\u9650\u516c\u53f8')
          await page.locator('#search').click()
          details = []
          for (let index = 0; index < 4; index++) {
            if (index) await page.locator('#next-match').click()
            const state = await poll(
              () => page.locator('#matches').innerText().then(JSON.parse),
              (s) => s.total === 3 && s.currentIndex === index % 3,
              'search API state'
            )
            const hit = await poll(
              () =>
                page.locator('[data-spreadsheet-search="active"]').evaluate((el) => {
                  const rect = el.getBoundingClientRect(),
                    viewport = el.closest('.e-virt-table-container').getBoundingClientRect()
                  return {
                    row: el.dataset.spreadsheetRow,
                    col: el.dataset.spreadsheetCol,
                    color: getComputedStyle(el).backgroundColor,
                    inside:
                      rect.left >= viewport.left &&
                      rect.right <= viewport.right &&
                      rect.top >= viewport.top &&
                      rect.bottom <= viewport.bottom
                  }
                }),
              (h) =>
                h.inside &&
                h.color === 'rgb(255, 191, 71)' &&
                h.row === String([176, 181, 189][index % 3]),
              'visible highlighted search result'
            )
            details.push({ currentIndex: state.currentIndex, ...hit })
          }
        } else if (kind === 'psd') {
          await page.locator('.psd-viewer canvas').waitFor({ state: 'visible' })
          details = await page.locator('.psd-viewer canvas').evaluate((c) => ({
            width: c.width,
            height: c.height,
            nonempty: c
              .getContext('2d')
              .getImageData(0, 0, c.width, c.height)
              .data.some((v) => v !== 0)
          }))
          assert.ok(details.nonempty && details.width > 100)
        } else if (kind === 'avro') {
          await page
            .locator('.data-table')
            .getByText('Browser Avro deflate', { exact: true })
            .waitFor({ state: 'visible' })
          assert.equal(await page.locator('.data-table tbody tr').count(), 2)
        } else if (kind === 'xmind') {
          await page.locator('.xmind-node').first().waitFor({ state: 'visible' })
          details = { nodes: await page.locator('.xmind-node').count() }
          assert.ok(details.nodes > 1)
        } else if (kind === 'step') {
          await page.locator('.model-viewer canvas').waitFor({ state: 'visible' })
          await page.locator('.model-state').waitFor({ state: 'hidden' })
          details = await page.locator('.model-meta').innerText()
          assert.ok(details.length > 5)
        } else if (kind === 'ppt') {
          await page
            .locator('.ppt-binary-page canvas')
            .first()
            .waitFor({ state: 'visible', timeout: 90000 })
          details = { pages: await page.locator('.ppt-binary-page').count() }
          assert.ok(details.pages > 1)
        }
        assert.deepEqual(errors, [], 'Browser errors')
        assert.deepEqual(requests, [], 'Failed asset requests')
        report.push({ name, passed: true, details })
      } catch (error) {
        report.push({
          name,
          passed: false,
          error: error.stack,
          errors,
          requests,
          text: (await page.locator('body').innerText()).slice(0, 2000)
        })
      }
      console.log(JSON.stringify(report.at(-1)))
      await page.screenshot({ path: resolve(out, `${name}.png`) })
      await page.close()
    }
  }
} finally {
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
  await new Promise((r) => server.close(r))
}
assert.ok(
  report.every((item) => item.passed),
  'Packed-consumer regressions failed'
)
