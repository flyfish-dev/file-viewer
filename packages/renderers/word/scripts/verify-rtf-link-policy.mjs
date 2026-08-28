import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(packageRoot, '../../..')
const require = createRequire(import.meta.url)
const supportedBrowserNames = new Set(['chromium', 'firefox', 'webkit'])
const browserNames = (process.env.FILE_VIEWER_RTF_BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)
assert(browserNames.length > 0, 'FILE_VIEWER_RTF_BROWSERS must select at least one browser')
for (const name of browserNames) {
  assert(supportedBrowserNames.has(name), `Unsupported RTF security browser: ${name}`)
}
const demoRequire = createRequire(join(root, 'apps/viewer-demo/package.json'))
const wordRequire = createRequire(join(packageRoot, 'package.json'))
const timeout = Number(process.env.RTF_SECURITY_TIMEOUT || 90000)

const findInjectedPackage = (packageName) => {
  const packageRoots =
    process.env.PATH?.split(delimiter)
      .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map((binDir) => resolve(binDir, '..')) || []
  for (const packagePath of packageRoots) {
    try {
      return require.resolve(packageName, { paths: [packagePath] })
    } catch {
      // npm exec injects Playwright into one of these temporary module roots.
    }
  }
  return null
}

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (originalError) {
    const entry = findInjectedPackage('playwright')
    if (entry) return import(pathToFileURL(entry).href)
    throw new Error(
      'Missing Playwright. Run with: npm exec --yes --package playwright@1.61.1 -- node packages/renderers/word/scripts/verify-rtf-link-policy.mjs',
      { cause: originalError }
    )
  }
}

const launchBrowser = async (name, browserType) => {
  try {
    return await browserType.launch({ headless: true })
  } catch (error) {
    if (name === 'chromium') return browserType.launch({ channel: 'chrome', headless: true })
    throw error
  }
}

const strictMain = String.raw`
import {
  registerFileViewerRtfLoader,
  renderFileViewerOpenDocument,
  renderFileViewerWordDoc,
  sanitizeFileViewerRtfHtml,
} from '@security/word'

const loadFixture = async name => {
  const response = await fetch('/fixtures/' + name)
  if (!response.ok) throw new Error('Fixture request failed: ' + name + ' (' + response.status + ')')
  return response.arrayBuffer()
}

const hrefs = target => Array.from(target.querySelectorAll('a')).map(anchor => [
  anchor.textContent.trim(),
  anchor.getAttribute('href'),
])
const blocked = target => Array.from(target.querySelectorAll('[data-file-viewer-blocked-link="true"]'))
const dangerous = target => target.querySelectorAll('script,iframe,object,embed,form,[onload],[onerror],[onclick],[onmouseover]').length

window.__rtfSecuritySentinel = 0
window.__rtfSecurityResult = null
window.__rtfSecurityError = null

try {
  registerFileViewerRtfLoader(() => import('@security/rtfjs'))
  const [rtf, doc] = await Promise.all([
    loadFixture('rtf-link-policy.rtf'),
    loadFixture('normal.doc'),
  ])
  const rtfBlockedTarget = document.querySelector('#rtf-blocked')
  const rtfAllowedTarget = document.querySelector('#rtf-allowed')
  const docTarget = document.querySelector('#doc')
  const blockedInstance = await renderFileViewerOpenDocument(rtf, rtfBlockedTarget, 'rtf', {
    options: { docx: { externalLinkPolicy: 'block' } },
  })
  const allowedInstance = await renderFileViewerOpenDocument(rtf, rtfAllowedTarget, 'rtf', {
    options: { docx: { externalLinkPolicy: 'allow' } },
  })
  const docInstance = await renderFileViewerWordDoc(doc, docTarget, 'doc', {
    options: { docx: { externalLinkPolicy: 'block', externalResourcePolicy: 'block' } },
  })

  for (const node of [...blocked(rtfBlockedTarget), ...blocked(rtfAllowedTarget)]) node.click()
  await new Promise(resolve => setTimeout(resolve, 20))

  const directMarkup = [
    '<a id="direct-unsafe" href="java&#10;script:window.__rtfSecuritySentinel=10" onclick="window.__rtfSecuritySentinel=20">unsafe</a>',
    '<a id="direct-safe" href="https://safe.example/path" target="_blank">safe</a>',
    '<a id="direct-bookmark" href="#section" target="_top">bookmark</a>',
    '<a id="direct-ping" href="#section" ping="https://attacker.example/ping">ping</a>',
    '<a id="direct-mixed-link" href="/&#92;attacker.example/path">mixed</a>',
    '<img id="direct-event" src="x" onerror="window.__rtfSecuritySentinel=30">',
    '<img id="direct-srcset" srcset="https://attacker.example/a.png 1x">',
    '<img id="direct-mixed-resource" src="/&#92;attacker.example/a.png">',
    '<video id="direct-poster" poster="https://attacker.example/a.png"></video>',
    '<svg><image id="direct-svg-external" href="https://attacker.example/a.png"></image><image id="direct-svg-fragment" href="#shape"></image></svg>',
    '<span id="direct-style" style="background:url(javascript:window.__rtfSecuritySentinel=40)">style</span>',
    '<span id="direct-escaped-style" style="background-image:u\\72l(https://attacker.example/a.png)">escaped</span>',
    '<span id="direct-comment-style" style="background-image:u/**/rl(https://attacker.example/a.png)">comment</span>',
    '<span id="direct-image-set-style" style="background-image:image-set(\'https://attacker.example/a.png\' 1x)">image-set</span>',
    '<span id="direct-image-style" style="background-image:image(\'https://attacker.example/a.png\')">image</span>',
    '<script>window.__rtfSecuritySentinel=50</script>',
  ].join('')
  const directHtml = sanitizeFileViewerRtfHtml(document, directMarkup, { externalLinkPolicy: 'allow' })
  const trustedPolicy = window.trustedTypes?.createPolicy('file-viewer-rtf-test', { createHTML: value => value })
  const directDocument = new DOMParser().parseFromString(
    trustedPolicy ? trustedPolicy.createHTML(directHtml) : directHtml,
    'text/html',
  )
  const directMount = document.createElement('div')
  directMount.id = 'direct-markup'
  directMount.append(...directDocument.body.childNodes)
  document.body.append(directMount)
  directMount.querySelector('#direct-unsafe')?.click()
  await new Promise(resolve => setTimeout(resolve, 20))

  const result = {
    sentinel: window.__rtfSecuritySentinel,
    trustedTypes: Boolean(window.trustedTypes),
    blockedHrefs: hrefs(rtfBlockedTarget),
    allowedHrefs: hrefs(rtfAllowedTarget),
    blockedCount: blocked(rtfBlockedTarget).length,
    allowedBlockedCount: blocked(rtfAllowedTarget).length,
    blockedDangerous: dangerous(rtfBlockedTarget),
    allowedDangerous: dangerous(rtfAllowedTarget),
    blockedText: rtfBlockedTarget.textContent,
    direct: {
      unsafeHref: directMount.querySelector('#direct-unsafe')?.getAttribute('href') ?? null,
      safeHref: directMount.querySelector('#direct-safe')?.getAttribute('href') ?? null,
      safeRel: directMount.querySelector('#direct-safe')?.getAttribute('rel') ?? null,
      bookmarkHref: directMount.querySelector('#direct-bookmark')?.getAttribute('href') ?? null,
      bookmarkTarget: directMount.querySelector('#direct-bookmark')?.getAttribute('target') ?? null,
      ping: directMount.querySelector('#direct-ping')?.getAttribute('ping') ?? null,
      mixedLink: directMount.querySelector('#direct-mixed-link')?.getAttribute('href') ?? null,
      dangerous: dangerous(directMount),
      eventSrc: directMount.querySelector('#direct-event')?.getAttribute('src') ?? null,
      srcset: directMount.querySelector('#direct-srcset')?.getAttribute('srcset') ?? null,
      mixedResource: directMount.querySelector('#direct-mixed-resource')?.getAttribute('src') ?? null,
      poster: directMount.querySelector('#direct-poster')?.getAttribute('poster') ?? null,
      svgExternal: directMount.querySelector('#direct-svg-external')?.getAttribute('href') ?? null,
      svgFragment: directMount.querySelector('#direct-svg-fragment')?.getAttribute('href') ?? null,
      activeStyle: directMount.querySelector('#direct-style')?.getAttribute('style') ?? null,
      escapedStyle: directMount.querySelector('#direct-escaped-style')?.getAttribute('style') ?? null,
      commentStyle: directMount.querySelector('#direct-comment-style')?.getAttribute('style') ?? null,
      imageSetStyle: directMount.querySelector('#direct-image-set-style')?.getAttribute('style') ?? null,
      imageStyle: directMount.querySelector('#direct-image-style')?.getAttribute('style') ?? null,
    },
    doc: {
      pages: docTarget.querySelectorAll('.msdoc-page').length,
      roots: docTarget.querySelectorAll('.msdoc-root').length,
      textLength: (docTarget.textContent || '').trim().length,
      dangerous: dangerous(docTarget),
    },
  }
  await Promise.all([blockedInstance.unmount(), allowedInstance.unmount(), docInstance.unmount()])
  result.cleanupEmpty = [rtfBlockedTarget, rtfAllowedTarget, docTarget].every(target => target.childNodes.length === 0)
  window.__rtfSecurityResult = result
} catch (error) {
  window.__rtfSecurityError = error instanceof Error ? error.stack || error.message : String(error)
}
`

const docxMain = String.raw`
import { renderFileViewerWordDocx } from '@security/word'

window.__docxRegressionResult = null
window.__docxRegressionError = null
try {
  const response = await fetch('/fixtures/normal.docx')
  if (!response.ok) throw new Error('DOCX fixture request failed: ' + response.status)
  const target = document.querySelector('#docx')
  const instance = await renderFileViewerWordDocx(await response.arrayBuffer(), target, 'docx', {
    options: {
      docx: {
        worker: false,
        visualPagination: false,
        externalLinkPolicy: 'block',
        externalResourcePolicy: 'block',
      },
    },
  })
  const result = {
    wrappers: target.querySelectorAll('.docx-wrapper').length,
    frames: target.querySelectorAll('.docx-page-frame, .docx-flow-frame').length,
    text: target.textContent || '',
    dangerous: target.querySelectorAll('script,iframe,object,embed,form,[onload],[onerror],[onclick],[onmouseover]').length,
  }
  await instance.unmount()
  result.cleanupEmpty = target.childNodes.length === 0
  window.__docxRegressionResult = result
} catch (error) {
  window.__docxRegressionError = error instanceof Error ? error.stack || error.message : String(error)
}
`

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.rtf': 'application/rtf'
}

const harnessRoot = await realpath(await mkdtemp(join(tmpdir(), 'file-viewer-rtf-security-')))
const distRoot = join(harnessRoot, 'dist')
let server

try {
  await mkdir(join(harnessRoot, 'public/fixtures'), { recursive: true })
  await Promise.all([
    copyFile(
      join(packageRoot, 'test/fixtures/rtf-link-policy.rtf'),
      join(harnessRoot, 'public/fixtures/rtf-link-policy.rtf')
    ),
    copyFile(join(root, 'test/test.doc'), join(harnessRoot, 'public/fixtures/normal.doc')),
    copyFile(
      join(root, 'test/fixtures/issue-96/chart.docx'),
      join(harnessRoot, 'public/fixtures/normal.docx')
    ),
    writeFile(join(harnessRoot, 'strict-main.js'), strictMain),
    writeFile(join(harnessRoot, 'docx-main.js'), docxMain),
    writeFile(
      join(harnessRoot, 'index.html'),
      '<!doctype html><html><head><meta charset="utf-8"><title>RTF security</title></head><body><div id="rtf-blocked"></div><div id="rtf-allowed"></div><div id="doc"></div><script type="module" src="/strict-main.js"></script></body></html>'
    ),
    writeFile(
      join(harnessRoot, 'docx.html'),
      '<!doctype html><html><head><meta charset="utf-8"><title>DOCX regression</title></head><body><div id="docx"></div><script type="module" src="/docx-main.js"></script></body></html>'
    )
  ])

  const viteEntry = demoRequire.resolve('vite')
  const { build } = await import(pathToFileURL(viteEntry).href)
  await build({
    root: harnessRoot,
    configFile: false,
    logLevel: 'error',
    define: { global: 'globalThis' },
    resolve: {
      alias: [
        {
          find: '@security/rtfjs',
          replacement: wordRequire.resolve('rtf.js/dist/RTFJS.bundle.js')
        },
        { find: '@security/word', replacement: join(packageRoot, 'src/index.ts') },
        {
          find: '@file-viewer/core/assets',
          replacement: join(root, 'packages/core/src/assets.ts')
        },
        { find: '@file-viewer/core', replacement: join(root, 'packages/core/src/index.ts') },
        { find: '@file-viewer/doc', replacement: join(root, 'packages/renderers/doc/src/index.ts') }
      ]
    },
    build: {
      outDir: distRoot,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          strict: 'index.html',
          docx: 'docx.html'
        }
      }
    }
  })

  const httpServer = createHttpServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname)
      const requested = pathname === '/' ? '/index.html' : pathname
      const filePath = resolve(distRoot, `.${requested}`)
      if (relative(distRoot, filePath).startsWith('..')) throw new Error('Invalid path')
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) throw new Error('Not a file')
      const strict = requested === '/index.html'
      const csp = [
        "default-src 'self'",
        "base-uri 'none'",
        "connect-src 'self'",
        "font-src 'self' data:",
        "frame-src 'none'",
        "img-src 'self' data: blob:",
        "object-src 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "worker-src 'self' blob:",
        ...(strict
          ? [
              "require-trusted-types-for 'script'",
              'trusted-types file-viewer-document-sanitizer file-viewer-rtf-test'
            ]
          : [])
      ].join('; ')
      response.statusCode = 200
      response.setHeader('content-security-policy', csp)
      response.setHeader('x-content-type-options', 'nosniff')
      response.setHeader(
        'content-type',
        contentTypes[extname(filePath)] || 'application/octet-stream'
      )
      response.end(await readFile(filePath))
    } catch {
      response.statusCode = 404
      response.end('Not found')
    }
  })
  await new Promise((resolvePromise, rejectPromise) => {
    httpServer.once('error', rejectPromise)
    httpServer.listen(0, '127.0.0.1', resolvePromise)
  })
  server = httpServer
  const address = server.address()
  assert(address && typeof address === 'object')
  const baseUrl = `http://127.0.0.1:${address.port}`

  const playwrightModule = await importPlaywright()
  const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  for (const name of browserNames) {
    const browser = await launchBrowser(name, playwright[name])
    try {
      for (const pageName of ['strict', 'docx']) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
        const failures = []
        const externalRequests = []
        let dialogs = 0
        page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
        page.on('console', (message) => {
          if (message.type() === 'error') failures.push(`console: ${message.text()}`)
        })
        page.on('request', (request) => {
          const url = request.url()
          if (!url.startsWith(baseUrl)) externalRequests.push(url)
        })
        page.on('dialog', async (dialog) => {
          dialogs += 1
          await dialog.dismiss()
        })
        await page.goto(pageName === 'strict' ? `${baseUrl}/` : `${baseUrl}/docx.html`, {
          waitUntil: 'domcontentloaded',
          timeout
        })

        if (pageName === 'strict') {
          await page.waitForFunction(
            () => window.__rtfSecurityResult || window.__rtfSecurityError,
            null,
            { timeout }
          )
          const state = await page.evaluate(() => ({
            result: window.__rtfSecurityResult,
            error: window.__rtfSecurityError
          }))
          assert.equal(state.error, null, `${name}: ${state.error}`)
          const result = state.result
          assert.equal(result.sentinel, 0)
          if (name === 'chromium') assert.equal(result.trustedTypes, true)
          assert.deepEqual(result.blockedHrefs, [['safe-bookmark', '#section']])
          assert.deepEqual(result.allowedHrefs, [
            ['safe-http', 'http://safe.example/path'],
            ['safe-https', 'https://safe.example/path'],
            ['safe-mailto', 'mailto:admin@example.com'],
            ['safe-tel', 'tel:+12025550123'],
            ['safe-relative', 'docs/readme.html'],
            ['safe-root-relative', '/help/index.html'],
            ['safe-dot-relative', './next.html'],
            ['safe-parent-relative', '../previous.html'],
            ['safe-bookmark', '#section']
          ])
          assert.equal(result.blockedCount, 19)
          assert.equal(result.allowedBlockedCount, 11)
          assert.equal(result.blockedDangerous, 0)
          assert.equal(result.allowedDangerous, 0)
          assert.match(result.blockedText, /Bookmark target/)
          assert.deepEqual(result.direct, {
            unsafeHref: null,
            safeHref: 'https://safe.example/path',
            safeRel: 'noopener noreferrer',
            bookmarkHref: '#section',
            bookmarkTarget: null,
            ping: null,
            mixedLink: null,
            dangerous: 0,
            eventSrc: null,
            srcset: null,
            mixedResource: null,
            poster: null,
            svgExternal: null,
            svgFragment: '#shape',
            activeStyle: null,
            escapedStyle: null,
            commentStyle: null,
            imageSetStyle: null,
            imageStyle: null
          })
          assert.ok(result.doc.pages > 0)
          assert.ok(result.doc.roots > 0)
          assert.ok(result.doc.textLength > 500)
          assert.equal(result.doc.dangerous, 0)
          assert.equal(result.cleanupEmpty, true)
        } else {
          await page.waitForFunction(
            () => window.__docxRegressionResult || window.__docxRegressionError,
            null,
            { timeout }
          )
          const state = await page.evaluate(() => ({
            result: window.__docxRegressionResult,
            error: window.__docxRegressionError
          }))
          assert.equal(state.error, null, `${name}: ${state.error}`)
          assert.ok(state.result.wrappers > 0)
          assert.ok(state.result.frames > 0)
          assert.match(state.result.text, /升级/)
          assert.equal(state.result.dangerous, 0)
          assert.equal(state.result.cleanupEmpty, true)
        }
        assert.deepEqual(failures, [], `${name}/${pageName}`)
        assert.deepEqual(externalRequests, [], `${name}/${pageName}`)
        assert.equal(dialogs, 0)
        await page.close()
      }
      console.log(
        `[rtf-security] ${name}: strict RTF/DOC and CSP-only DOCX regression checks passed.`
      )
    } finally {
      await browser.close()
    }
  }
} finally {
  if (server) await new Promise((resolvePromise) => server.close(resolvePromise))
  await rm(harnessRoot, { recursive: true, force: true })
}
