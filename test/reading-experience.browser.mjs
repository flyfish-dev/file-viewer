import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const output = resolve(process.env.READING_EVIDENCE || join(root, 'output/reading-experience'))
const runtimeRoot = resolve(process.env.FILE_VIEWER_TEST_RUNTIME_ROOT || root)
const record = process.argv.includes('--record-only')
const requirePdf = createRequire(join(root, 'packages/renderers/pdf/package.json'))
const requireSheet = createRequire(join(root, 'packages/renderers/spreadsheet/package.json'))
const JSZip = requireSheet('jszip')
const { utils, write } = requireSheet('styled-exceljs')
await mkdir(output, { recursive: true })

// Original, generated fixtures: no customer documents or proprietary fonts.
function pdfFixture(
  encoding = 'UniGB-UCS2-H',
  family = 'STSong-Light',
  text = '中文阅读测试',
  bytes
) {
  const encoded = bytes || Buffer.from(text, 'utf16le').swap16().toString('hex')
  const stream = `BT /F1 28 Tf 40 240 Td <${encoded}> Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 320] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>',
    `<< /Type /Font /Subtype /Type0 /BaseFont /${family} /Encoding /${encoding} /DescendantFonts [5 0 R] >>`,
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /${family} /CIDSystemInfo << /Registry (Adobe) /Ordering (${encoding.startsWith('ETen') ? 'CNS1' : 'GB1'}) /Supplement 4 >> /FontDescriptor 7 0 R /DW 1000 >>`,
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    `<< /Type /FontDescriptor /FontName /${family} /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 900 /Descent -200 /CapHeight 800 /StemV 80 >>`
  ]
  let result = '%PDF-1.7\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(result))
    result += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(result)
  result += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  result += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  return Buffer.from(
    result + `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  )
}
const zip = new JSZip()
zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
zip.file(
  'META-INF/container.xml',
  '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
)
zip.file(
  'book.opf',
  '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">reading-regression</dc:identifier><dc:title>Reading regression</dc:title><dc:language>zh</dc:language><meta property="dcterms:modified">2026-10-22T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>'
)
zip.file(
  'nav.xhtml',
  '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">Chapter 1</a></li><li><a href="two.xhtml">Chapter 2</a></li></ol></nav></body></html>'
)
for (const chapter of ['one', 'two'])
  zip.file(
    `${chapter}.xhtml`,
    `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${chapter}</title><style>body,p{color:#111;background:#fff}p{line-height:1.7}</style></head><body><h1>${chapter}</h1>${'<p>中文阅读测试 Reading text and a <a href="#end">link</a>.</p>'.repeat(30)}<p id="end">End</p></body></html>`
  )
// Keep the exact fixture bytes reusable across browser engines and later runs.
zip.forEach((_path, entry) => {
  entry.date = new Date(2020, 0, 1)
})
const book = utils.book_new()
utils.book_append_sheet(book, utils.aoa_to_sheet([['One', 'Two', 'Three']]), 'Small')
utils.book_append_sheet(book, utils.aoa_to_sheet([]), 'Empty')
const assets = new Map([
  ['/sample.epub', await zip.generateAsync({ type: 'nodebuffer' })],
  ['/small.xlsx', Buffer.from(write(book, { type: 'buffer', bookType: 'xlsx' }))],
  ['/small.csv', Buffer.from('One,Two,Three\n')],
  ['/chinese.pdf', pdfFixture()],
  ['/chinese-vertical.pdf', pdfFixture('UniGB-UCS2-V')],
  ['/chinese-yahei.pdf', pdfFixture('UniGB-UCS2-H', 'MicrosoftYaHei')],
  [
    '/chinese-gbk.pdf',
    pdfFixture('GBK-EUC-H', 'STSong-Light', '中文阅读测试', 'd6d0cec4d4c4b6c1b2e2cad4')
  ],
  ['/chinese-big5.pdf', pdfFixture('ETen-B5-H', 'MSung-Light', '中文', 'a4a4a4e5')],
  ['/chinese-cold-font.pdf', pdfFixture('UniGB-UCS2-H', 'ReadingRegressionCJK')],
  ['/chinese-retry-font.pdf', pdfFixture('UniGB-UCS2-H', 'CjkCssRetryRegression')],
  [
    '/embedded-cjk.pdf',
    await readFile(join(runtimeRoot, 'apps/viewer-demo/public/example/pdf.pdf'))
  ]
])
const tableEntry = join(
  dirname(requireSheet.resolve('e-virt-table/package.json')),
  'dist/index.es.js'
)
const bundle = await build({
  stdin: {
    resolveDir: root,
    loader: 'ts',
    contents: `
    import pdf from './packages/renderers/pdf/src/pdf.ts';
    import epub from './packages/renderers/ebook/src/epub.ts';
    import spreadsheet from './packages/renderers/spreadsheet/src/spreadsheet.ts';
    import { pdfRenderer } from './packages/renderers/pdf/src/index.ts';
    import { createPdfCjkFontFallbackManager } from './packages/renderers/pdf/src/pdfFontFallback.ts';
    import { createViewer, findFileViewerZoomProvider, findFileViewerViewStateProvider, observeFileViewerColorScheme } from './packages/core/src/index.ts';
    window.review = { pdf, epub, spreadsheet, pdfRenderer, createViewer, createPdfCjkFontFallbackManager, findFileViewerZoomProvider, findFileViewerViewStateProvider, observeFileViewerColorScheme };
    window.mount = async (type, theme = 'dark', options = {}, file) => {
      await window.handle?.unmount(); window.handle = null; window.exportAdapter = null;
      const host = document.querySelector('#host'); host.dataset.viewerTheme = theme;
      const url = file || (type === 'pdf' ? '/chinese.pdf' : type === 'epub' ? '/sample.epub' : '/small.' + type);
      window.handle = await review[type === 'xlsx' || type === 'csv' ? 'spreadsheet' : type](
        await (await fetch(url)).arrayBuffer(), host, ...(type === 'xlsx' || type === 'csv' ? [type] : []),
        { filename: url.slice(1), registerExportAdapter: adapter => { window.exportAdapter = adapter; }, options: { locale: 'en-US', theme, ...options, pdf: {
          workerUrl: '/pdfjs/legacy/build/pdf.worker.mjs', cMapUrl: '/pdfjs/cmaps/', wasmUrl: '/pdfjs/wasm/',
          standardFontDataUrl: '/pdfjs/standard_fonts/', cjkFontFallbackPath: '/pdf-cjk/', navigation: false,
          ...options.pdf }, spreadsheet: { worker: false, ...options.spreadsheet } } });
    };
  `
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  logLevel: 'warning',
  alias: {
    '@file-viewer/core/assets': join(root, 'packages/core/src/assets.ts'),
    '@file-viewer/core': join(root, 'packages/core/src/index.ts')
  },
  plugins: [
    {
      name: 'test-runtimes',
      setup(builder) {
        builder.onResolve({ filter: /^pdfjs-dist\// }, (args) => ({
          path: '/pdfjs/' + args.path.slice('pdfjs-dist/'.length),
          external: true
        }))
        builder.onResolve({ filter: /^\.\/vendor\/epubjs\.js$/ }, () => ({
          path: join(runtimeRoot, 'packages/renderers/ebook/dist/vendor/epubjs.js')
        }))
        builder.onResolve({ filter: /^e-virt-table(?:\/dist\/index\.es\.js)?$/ }, () => ({
          path: 'table',
          namespace: 'review-table'
        }))
        builder.onLoad({ filter: /.*/, namespace: 'review-table' }, () => ({
          resolveDir: root,
          contents: `import RealTable from ${JSON.stringify(tableEntry)};
      export default class extends RealTable { constructor(...args) { super(...args); window.reviewTable=this; } }`
        }))
      }
    }
  ]
})
assets.set('/browser.js', Buffer.from(bundle.outputFiles[0].text))
assets.set(
  '/',
  Buffer.from(
    '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%}#host{width:100%;height:100%;overflow:hidden}</style><div id="host"></div><script type="module" src="/browser.js"></script>'
  )
)
const runtime = join(runtimeRoot, 'packages/renderers/pdf/dist/vendor/pdfjs')
const cjk = dirname(requirePdf.resolve('@fontsource-variable/noto-sans-sc/package.json'))
const requests = []
let retryCssRequests = 0
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  if (pathname === '/retry-cjk/noto-sans-sc.css' && retryCssRequests++ === 0) {
    requests.push({ path: pathname, status: 503, expected: true })
    response.writeHead(503, { 'Content-Type': 'text/css' }).end('controlled cold-network fault')
    return
  }
  try {
    let data = assets.get(pathname)
    if (!data && pathname.startsWith('/pdfjs/') && !pathname.includes('..'))
      data = await readFile(join(runtime, pathname.slice(7)))
    if (!data && pathname.startsWith('/pdf-cjk/') && !pathname.includes('..'))
      data = await readFile(
        join(cjk, pathname.slice(9) === 'noto-sans-sc.css' ? 'index.css' : pathname.slice(9))
      )
    if (!data && pathname.startsWith('/retry-cjk/') && !pathname.includes('..'))
      data = await readFile(
        join(cjk, pathname.slice(11) === 'noto-sans-sc.css' ? 'index.css' : pathname.slice(11))
      )
    requests.push({ path: pathname, status: data ? 200 : 404 })
    response.writeHead(data ? 200 : 404, {
      'Content-Type': /\.m?js$/.test(pathname)
        ? 'text/javascript'
        : pathname.endsWith('.css')
          ? 'text/css'
          : pathname.endsWith('.wasm')
            ? 'application/wasm'
            : pathname === '/'
              ? 'text/html'
              : 'application/octet-stream'
    })
    response.end(data || 'missing')
  } catch {
    requests.push({ path: pathname, status: 404 })
    response.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browserName = process.env.READING_BROWSER || 'chromium'
const browser = await { chromium, webkit }[browserName].launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = {
  browser: browserName,
  browserVersion: browser.version(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceDirty: execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8'
  }).trim(),
  bundleSha256: hash(bundle.outputFiles[0].contents),
  fixtureSha256: Object.fromEntries(
    [...assets]
      .filter(([name]) => name !== '/' && name !== '/browser.js')
      .map(([name, bytes]) => [name, hash(bytes)])
  ),
  checks: [],
  errors: [],
  warnings: [],
  external: [],
  requests
}
page.on('worker', (worker) => {
  ;(report.workers ||= []).push(worker.url())
})
page.on('pageerror', (error) => report.errors.push(error.message))
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) report.warnings.push(message.text())
})
await page.route('**/*', (route) =>
  route
    .request()
    .url()
    .startsWith(origin + '/') || /^(?:blob|data):/.test(route.request().url())
    ? route.continue()
    : (report.external.push(route.request().url()), route.abort())
)
async function check(name, action) {
  try {
    await action()
    report.checks.push({ name, passed: true })
    console.log('PASS ' + name)
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.message })
    console.log('FAIL ' + name + ': ' + error.message)
    if (!record) throw error
  }
}
const settle = () =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
const epubColors = () =>
  page.evaluate(() => {
    const frame = document.querySelector('.epub-stage iframe')
    const doc = frame.contentDocument,
      view = frame.contentWindow
    return {
      body: view.getComputedStyle(doc.body).backgroundColor,
      text: view.getComputedStyle(doc.querySelector('p')).color,
      paper: getComputedStyle(document.querySelector('.epub-stage')).backgroundColor
    }
  })
try {
  await page.goto(origin)
  await page.waitForFunction(() => window.mount)
  await check('EPUB dark theme includes authored white paragraphs and paper', async () => {
    await page.evaluate(() => window.mount('epub'))
    await page.waitForSelector('.epub-state[hidden]', { state: 'attached' })
    await page.screenshot({ path: join(output, 'epub-dark.png') })
    report.epubDark = await epubColors()
    assert.notEqual(report.epubDark.body, 'rgb(255, 255, 255)')
    assert.notEqual(report.epubDark.text, 'rgb(17, 17, 17)')
    assert.notEqual(report.epubDark.paper, 'rgb(255, 255, 255)')
  })
  await check(
    'EPUB live theme switch keeps the same chapter frame and scroll position',
    async () => {
      const before = await page.evaluate(() => {
        window.savedFrame = document.querySelector('.epub-stage iframe')
        const scroller = document.querySelector('.epub-container')
        scroller.scrollTop = 140
        document.querySelector('#host').dataset.viewerTheme = 'light'
        return scroller.scrollTop
      })
      await settle()
      assert.equal((await epubColors()).body, 'rgb(255, 255, 255)')
      assert.equal(
        await page.evaluate(
          () => window.savedFrame === document.querySelector('.epub-stage iframe')
        ),
        true
      )
      assert.equal(
        await page.evaluate(() => document.querySelector('.epub-container').scrollTop),
        before
      )
    }
  )
  await check(
    'EPUB new chapters inherit dark colors and explicit false retains authored colors',
    async () => {
      await page.evaluate(() => {
        document.querySelector('#host').dataset.viewerTheme = 'dark'
      })
      await page.getByRole('button', { name: 'Chapter 2', exact: true }).click()
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.epub-stage iframe')].some(
          (frame) => frame.contentDocument?.querySelector('h1')?.textContent === 'two'
        )
      )
      const values = await page.evaluate(() =>
        [...document.querySelectorAll('.epub-stage iframe')]
          .filter((frame) => frame.contentDocument?.querySelector('p'))
          .map(
            (frame) =>
              frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('p')).color
          )
      )
      assert.ok(
        values.length && values.every((color) => color === 'rgb(229, 231, 235)'),
        JSON.stringify(values)
      )
      await page.evaluate(() => window.mount('epub', 'dark', { epub: { darkMode: false } }))
      await page.waitForSelector('.epub-state[hidden]', { state: 'attached' })
      assert.equal((await epubColors()).text, 'rgb(17, 17, 17)')
    }
  )
  for (const type of ['xlsx', 'csv'])
    await check(
      `${type} default grid covers blank viewport without changing three data cells`,
      async () => {
        await page.evaluate((type) => window.mount(type, 'light'), type)
        await page.waitForFunction(() =>
          document.querySelector('.loading')?.classList.contains('hidden')
        )
        await settle()
        const state = await page.evaluate(() => ({
          rows: window.reviewTable.ctx.body.data.length,
          columns: window.reviewTable.ctx.header.leafCellHeaders.length,
          width: window.reviewTable.ctx.header.width,
          height: window.reviewTable.ctx.body.height + window.reviewTable.ctx.header.height,
          viewportWidth: window.reviewTable.ctx.containerElement.clientWidth,
          viewportHeight: window.reviewTable.ctx.containerElement.clientHeight,
          data: window.reviewTable.ctx.body.data[0],
          summary: document.querySelector('.summary').textContent
        }))
        report[type] = state
        await page.screenshot({ path: join(output, `${type}-grid.png`) })
        assert.ok(
          state.width >= state.viewportWidth - 1 && state.height >= state.viewportHeight - 1,
          JSON.stringify(state)
        )
        assert.ok(state.rows < 100 && state.columns < 100)
        assert.equal(state.data.c2, 'Three')
      }
    )
  for (const file of [
    '/chinese.pdf',
    '/chinese-vertical.pdf',
    '/chinese-yahei.pdf',
    '/chinese-gbk.pdf',
    '/chinese-big5.pdf',
    '/chinese-cold-font.pdf'
  ])
    await check(`PDF CJK self-hosted fonts and real Worker: ${file}`, async () => {
      await page.evaluate((file) => window.mount('pdf', 'dark', {}, file), file)
      const expected = file.includes('big5') ? '中文' : '中文阅读测试'
      await page.waitForFunction(
        (expected) =>
          document.querySelector('.pdfViewer .textLayer')?.textContent?.includes(expected),
        expected
      )
      await page.waitForFunction(() => document.querySelector('.pdfViewer canvas')?.width > 0)
      await settle()
      await page.screenshot({ path: join(output, file.slice(1) + '.png') })
      assert.equal(
        await page.evaluate(
          (expected) =>
            document.querySelector('.pdfViewer .textLayer').textContent.includes(expected),
          expected
        ),
        true
      )
    })
  await check(
    'PDF dark reading changes canvas presentation and restores without reloading PDF',
    async () => {
      const before = await page.evaluate(() => {
        const canvas = document.querySelector('.pdfViewer canvas')
        window.savedCanvas = canvas
        window.savedPixel = [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data]
        return getComputedStyle(canvas).filter
      })
      assert.notEqual(before, 'none')
      await page.evaluate(() => {
        document.querySelector('#host').dataset.viewerTheme = 'light'
      })
      await settle()
      assert.equal(await page.evaluate(() => getComputedStyle(window.savedCanvas).filter), 'none')
      assert.equal(
        await page.evaluate(
          () => window.savedCanvas === document.querySelector('.pdfViewer canvas')
        ),
        true
      )
      assert.deepEqual(
        await page.evaluate(() => [
          ...window.savedCanvas.getContext('2d').getImageData(0, 0, 1, 1).data
        ]),
        [255, 255, 255, 255]
      )
      assert.deepEqual(await page.evaluate(() => window.savedPixel), [255, 255, 255, 255])
    }
  )
  await check(
    'PDF print and HTML export keep original white canvas colors in dark reading',
    async () => {
      await page.evaluate(() => {
        document.querySelector('#host').dataset.viewerTheme = 'dark'
      })
      for (const mode of ['print', 'export']) {
        const value = await page.evaluate(async (mode) => {
          const html = await window.exportAdapter.toHtml({ mode, title: 'Reading regression' })
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const image = new Image()
          image.src = doc.querySelector('img').src
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(image, 0, 0)
          return { filter: html.includes('invert('), pixel: [...ctx.getImageData(0, 0, 1, 1).data] }
        }, mode)
        assert.equal(value.filter, false)
        assert.ok(value.pixel.slice(0, 3).every((channel) => channel > 245))
      }
    }
  )
  await check('PDF explicit false keeps original colors even in a dark host', async () => {
    await page.evaluate(() => window.mount('pdf', 'dark', { pdf: { darkMode: false } }))
    await page.waitForFunction(() => document.querySelector('.pdfViewer canvas')?.width > 0)
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('.pdfViewer canvas')).filter
      ),
      'none'
    )
  })
  await check(
    'embedded CJK fonts render on the first and final pages without fallback',
    async () => {
      await page.evaluate(() => window.mount('pdf', 'light', {}, '/embedded-cjk.pdf'))
      await page.waitForFunction(() =>
        document.querySelector('.pdfViewer .textLayer')?.textContent?.includes('沉浸式翻译')
      )
      const last = await page.evaluate(async () => {
        const provider = window.review.findFileViewerViewStateProvider(window.handle.$el)
        const count = provider.getState().pageCount
        await provider.applyState({ page: count })
        return count
      })
      await page.waitForFunction(
        (last) =>
          document
            .querySelector(`.pdfViewer .page[data-page-number="${last}"] .textLayer`)
            ?.textContent?.match(/[\u4e00-\u9fff]/),
        last
      )
      await page.screenshot({ path: join(output, 'embedded-cjk-last-page.png') })
      assert.equal(last, 13)
    }
  )
  await check('Vanilla core updateOptions changes reading theme without reloading', async () => {
    await page.evaluate(async () => {
      await window.handle.unmount()
      const host = document.querySelector('#host')
      host.replaceChildren()
      window.coreViewer = window.review.createViewer(host, {
        options: {
          renderers: window.review.pdfRenderer,
          builtinRenderers: 'none',
          theme: 'dark',
          styleIsolation: 'none',
          pdf: {
            navigation: false,
            workerUrl: '/pdfjs/legacy/build/pdf.worker.mjs',
            cMapUrl: '/pdfjs/cmaps/',
            wasmUrl: '/pdfjs/wasm/',
            standardFontDataUrl: '/pdfjs/standard_fonts/',
            cjkFontFallbackPath: '/pdf-cjk/'
          }
        }
      })
      await window.coreViewer.load({
        buffer: await (await fetch('/chinese.pdf')).arrayBuffer(),
        filename: 'chinese.pdf'
      })
      window.handle = { unmount: () => window.coreViewer.destroy() }
    })
    await page.waitForFunction(() => document.querySelector('.pdfViewer canvas')?.width > 0)
    await page.evaluate(() => {
      window.coreCanvas = document.querySelector('.pdfViewer canvas')
      window.coreViewer.updateOptions({ theme: 'light' })
    })
    await page.waitForFunction(() => getComputedStyle(window.coreCanvas).filter === 'none')
    assert.equal(
      await page.evaluate(() => window.coreCanvas === document.querySelector('.pdfViewer canvas')),
      true
    )
    await page.evaluate(() => window.coreViewer.updateOptions({ theme: 'dark' }))
    await page.waitForFunction(() => getComputedStyle(window.coreCanvas).filter !== 'none')
  })
  await check(
    'system color changes and Shadow DOM hosts update once and release observers',
    async () => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.evaluate(() => {
        const host = document.createElement('div')
        host.dataset.viewerTheme = 'system'
        document.body.append(host)
        const child = document.createElement('div')
        host.attachShadow({ mode: 'open' }).append(child)
        window.themeHost = host
        window.themeEvents = []
        window.stopTheme = window.review.observeFileViewerColorScheme(child, undefined, (theme) =>
          window.themeEvents.push(theme)
        )
      })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForFunction(() => window.themeEvents.at(-1) === 'dark')
      await page.evaluate(() => {
        window.themeHost.dataset.viewerTheme = 'light'
      })
      await page.waitForFunction(() => window.themeEvents.at(-1) === 'light')
      await page.evaluate(() => {
        window.stopTheme()
        window.themeHost.dataset.viewerTheme = 'dark'
        window.themeHost.remove()
      })
      await settle()
      assert.deepEqual(await page.evaluate(() => window.themeEvents), ['light', 'dark', 'light'])
    }
  )
  await check('concurrent CJK consumers wait for shared cold font readiness', async () => {
    const value = await page.evaluate(async () => {
      const fonts = document.fonts
      const nativeLoad = fonts.load.bind(fonts)
      let release
      const gate = new Promise((resolve) => {
        release = resolve
      })
      fonts.load = async () => {
        await gate
        return [{}]
      }
      try {
        const manager = window.review.createPdfCjkFontFallbackManager({
          documentRef: document,
          fontAssetPath: location.origin + '/pdf-cjk/'
        })
        const content = {
          items: [{ str: '中文', fontName: 'f1' }],
          styles: { f1: { fontSubstitution: '"Concurrent CJK Fixture", sans-serif' } }
        }
        let firstReady = false,
          secondReady = false
        const first = manager.ensureTextContent(content).then(() => {
          firstReady = true
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
        const second = manager.ensureTextContent(content).then(() => {
          secondReady = true
        })
        await new Promise((resolve) => setTimeout(resolve, 50))
        const premature = { firstReady, secondReady }
        release()
        await Promise.all([first, second])
        return premature
      } finally {
        fonts.load = nativeLoad
      }
    })
    assert.deepEqual(value, { firstReady: false, secondReady: false })
  })
  await check(
    'a transient CJK stylesheet failure recovers after first paint without reopening',
    async () => {
      const recovered = page.waitForResponse(
        (response) =>
          response.url().endsWith('/retry-cjk/noto-sans-sc.css') && response.status() === 200
      )
      await page.evaluate(() =>
        window.mount(
          'pdf',
          'light',
          { pdf: { cjkFontFallbackPath: location.origin + '/retry-cjk/' } },
          '/chinese-retry-font.pdf'
        )
      )
      await recovered
      await page.waitForFunction(() =>
        [...document.fonts].some(
          (face) => face.family.includes('CjkCssRetryRegression') && face.status === 'loaded'
        )
      )
      await page.waitForFunction(() =>
        document.querySelector('.pdfViewer .textLayer')?.textContent?.includes('中文阅读测试')
      )
      assert.equal(retryCssRequests, 2)
      report.expectedFaults = requests.filter((request) => request.expected)
    }
  )
  assert.deepEqual(report.errors, [])
  assert.deepEqual(report.external, [])
  assert.ok(report.workers.some((url) => url.startsWith(origin + '/pdfjs/')))
  assert.ok(requests.some((item) => item.path.endsWith('.woff2') && item.status === 200))
  assert.ok(requests.some((item) => item.path.endsWith('.bcmap') && item.status === 200))
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
