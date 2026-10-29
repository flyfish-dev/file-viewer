import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import JSZip from 'jszip'
import { chromium } from 'playwright'
import { establishWordBrowserOrigin } from '../test/browser-origin.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const require = createRequire(join(root, 'packages/renderers/word/package.json'))
const { build } = createRequire(join(root, 'packages/renderers/pptx/package.json'))('esbuild')
const engine = dirname(require.resolve('@file-viewer/docx/package.json'))
const ownerManifest = JSON.parse(await readFile(join(root, 'packages/renderers/word/package.json'), 'utf8'))
const engineVersion = ownerManifest.dependencies['@file-viewer/docx']
assert.match(engineVersion, /^0\.3\.(?:0|[1-9]\d*)$/, 'Table-header verification requires a reviewed, exactly pinned DOCX 0.3.x engine')
assert.ok(Number(engineVersion.split('.')[2]) >= 35, 'The DOCX engine must retain the table-header fix introduced in 0.3.35')
assert.equal(JSON.parse(await readFile(join(engine, 'package.json'), 'utf8')).version, engineVersion)
const worker = await readFile(join(engine, 'dist/docx-preview.worker.js'), 'utf8')
const zipWorker = await readFile(require.resolve('jszip/dist/jszip.min.js'), 'utf8')
assert.equal(
  await readFile(join(root, 'apps/viewer-demo/public/vendor/docx/docx.worker.js'), 'utf8'),
  worker,
  'Copied offline Worker must match the installed formal engine'
)
assert.equal(
  await readFile(join(root, 'apps/viewer-demo/public/vendor/docx/jszip.min.js'), 'utf8'),
  zipWorker,
  'Copied ZIP runtime must match the installed dependency'
)
const output = resolve(process.env.WORD_HEADER_EVIDENCE || join(root, 'output/word-table-headers'))
await mkdir(output, { recursive: true })

const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const relationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const expected = [
  'HEADER',
  ...Array.from({ length: 36 }, (_, index) => 'ROW_' + String(index + 1).padStart(2, '0'))
]
const rows = expected
  .map(
    (text, index) =>
      `<w:tr><w:trPr>${index === 0 ? '<w:tblHeader/>' : ''}<w:trHeight w:val="420" w:hRule="atLeast"/><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p></w:tc></w:tr>`
  )
  .join('')
const archive = new JSZip()
archive.file(
  '[Content_Types].xml',
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
)
archive.file(
  '_rels/.rels',
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="${relationships}/officeDocument" Target="word/document.xml"/></Relationships>`
)
archive.file(
  'word/document.xml',
  `<w:document xmlns:w="${namespace}"><w:body><w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="6000"/></w:tblGrid>${rows}</w:tbl><w:sectPr><w:pgSz w:w="7200" w:h="3600"/><w:pgMar w:top="360" w:right="600" w:bottom="360" w:left="600" w:header="0" w:footer="0"/></w:sectPr></w:body></w:document>`
)
const bytes = await archive.generateAsync({ type: 'nodebuffer' })
await writeFile(join(output, 'table-37-rows.docx'), bytes)
const bundle = await build({
  stdin: {
    resolveDir: root,
    loader: 'ts',
    contents:
      "import {renderFileViewerWordDoc} from './packages/renderers/word/src/index.ts'; window.renderWord=renderFileViewerWordDoc;"
  },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  write: false,
  logLevel: 'silent'
})
const report = { engine: engineVersion, expectedRows: expected.length, cases: [], passed: false }
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
})
try {
  for (const useWorker of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } })
    const errors = [],
      external = [],
      servedAssets = [],
      liveWorkers = new Set()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('worker', (worker) => {
      liveWorkers.add(worker)
      worker.on('close', () => liveWorkers.delete(worker))
    })
    await establishWordBrowserOrigin(page)
    await page.route(/^https?:/, (route) => {
      const url = new URL(route.request().url())
      if (url.origin === 'http://docx-fixture.test') {
        const body = url.pathname.endsWith('/vendor/docx/docx.worker.js')
          ? worker
          : url.pathname.endsWith('/vendor/docx/jszip.min.js')
            ? zipWorker
            : null
        if (body) {
          servedAssets.push(url.href)
          return route.fulfill({ status: 200, contentType: 'application/javascript', body })
        }
      }
      external.push(url.href)
      return route.abort()
    })
    try {
      await page.setContent('<div id="host" style="width:900px;height:800px"></div>')
      await page.addScriptTag({ content: bundle.outputFiles[0].text })
      await page.evaluate(
        async ({ base64, useWorker }) => {
          window.messages = []
          const OriginalWorker = window.Worker
          if (useWorker)
            window.Worker = class extends OriginalWorker {
              constructor(...args) {
                super(...args)
                this.addEventListener('message', (event) => messages.push(event.data?.type))
              }
            }
          try {
            window.handle = await renderWord(
              Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer,
              document.querySelector('#host'),
              'docx',
              {
                filename: 'table-37-rows.docx',
                options: {
                  docx: {
                    worker: useWorker,
                    visualPagination: true
                  }
                }
              }
            )
          } finally {
            window.Worker = OriginalWorker
          }
          await document.fonts.ready
        },
        { base64: bytes.toString('base64'), useWorker }
      )
      await page.waitForFunction(
        () => document.querySelector('.docx-wrapper')?.dataset.docxPaginated === 'true'
      )
      const result = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#host article tr')]
        const tables = [...document.querySelectorAll('#host article table')]
        const logical = rows
          .filter((row) => row.dataset.docxRepeatedHeader !== 'true')
          .map((row) => row.textContent.trim())
        const repeated = rows.filter((row) => row.dataset.docxRepeatedHeader === 'true')
        return {
          logical,
          physicalRows: rows.length,
          repeated: repeated.length,
          tables: tables.length,
          pageHeaders: tables.map((table) => table.rows[0]?.textContent.trim()),
          headerFlags: repeated.every((row) => row.dataset.docxRepeatHeader === 'true'),
          messages: window.messages
        }
      })
      assert.deepEqual(
        result.logical,
        expected,
        'All 37 logical rows must survive in order, each once'
      )
      assert.ok(result.tables > 1, 'The fixture must actually cross pages')
      assert.deepEqual(result.pageHeaders, Array(result.tables).fill('HEADER'))
      assert.equal(
        result.repeated,
        result.tables - 1,
        'Every continuation has exactly one marked header copy'
      )
      assert.equal(result.physicalRows, expected.length + result.repeated)
      assert.equal(result.headerFlags, true, 'Marked clones retain the source header semantics')
      if (useWorker)
        assert.ok(result.messages.includes('parsed'), 'Worker must parse rather than fall back')
      else assert.deepEqual(result.messages, [])
      if (useWorker) {
        assert.equal(servedAssets.length, 2)
        for (const url of servedAssets) {
          assert.equal(new URL(url).searchParams.get('file-viewer-docx'), engineVersion)
        }
      } else assert.deepEqual(servedAssets, [])
      await page.screenshot({
        path: join(output, useWorker ? 'worker.png' : 'main.png'),
        fullPage: true
      })
      await page.evaluate(async () => {
        await handle.unmount()
      })
      await page.waitForFunction(() => document.querySelector('#host').childElementCount === 0)
      for (let attempt = 0; liveWorkers.size && attempt < 100; attempt++) {
        await page.waitForTimeout(20)
      }
      assert.equal(liveWorkers.size, 0)
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
      report.cases.push({
        useWorker,
        ...result,
        errors,
        external,
        servedAssets,
        liveWorkers: liveWorkers.size,
        passed: true
      })
    } finally {
      await page.close()
    }
  }
  report.passed = true
} finally {
  await browser.close()
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(
  `DOCX ${engineVersion}: cross-page headers and all 37 logical rows passed in main and actual Worker paths.`
)
