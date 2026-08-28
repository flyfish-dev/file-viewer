import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const require = createRequire(import.meta.url)
const demoRequire = createRequire(join(root, 'apps/viewer-demo/package.json'))
const timeout = Number(process.env.DOCX_EXTERNAL_RESOURCE_TIMEOUT || 90000)
const fixtures = {
  image: {
    path: join(root, 'test/fixtures/docx-external-resource/external-resources.docx'),
    remoteUrl: 'http://127.0.0.1:41799/external.svg'
  },
  blob: {
    path: join(root, 'test/fixtures/docx-external-resource/external-blob.docx'),
    remoteUrl: 'http://127.0.0.1:41799/external-blob.svg'
  }
}
const externalEngineRoot = process.env.FILE_VIEWER_DOCX_ENGINE_ROOT
  ? resolve(process.env.FILE_VIEWER_DOCX_ENGINE_ROOT)
  : null
const engineEntry = externalEngineRoot
  ? join(externalEngineRoot, 'dist/docx-preview.mjs')
  : require.resolve('@file-viewer/docx', {
      paths: [join(root, 'packages/renderers/word')]
    })

for (const fixture of Object.values(fixtures)) {
  assert(existsSync(fixture.path), `Missing real DOCX security fixture: ${fixture.path}`)
}
assert(existsSync(engineEntry), `Missing @file-viewer/docx engine entry: ${engineEntry}`)

const findInjectedPackage = (packageName) => {
  const packageRoots =
    process.env.PATH?.split(delimiter)
      .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map((binDir) => resolve(binDir, '..'))
      .filter(existsSync) || []

  for (const packageRoot of packageRoots) {
    try {
      return require.resolve(packageName, { paths: [packageRoot] })
    } catch {
      // npm exec exposes injected packages through a temporary node_modules root.
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
      `Missing Playwright. Run with npm exec --yes --package playwright -- node scripts/verify-docx-external-resource-policy.mjs\n${originalError}`,
      { cause: originalError }
    )
  }
}

const launchChromium = async (chromium) => {
  try {
    return await chromium.launch({ headless: true })
  } catch {
    return chromium.launch({ channel: 'chrome', headless: true })
  }
}

const harnessMain = String.raw`
import { renderAsync } from '@security/docx-engine'
import renderWordDocx from '@security/word-renderer'

const params = new URLSearchParams(location.search)
const surface = params.get('surface')
const externalResourcePolicy = params.get('policy')
const fixtureName = params.get('fixture')
const fixtures = __FIXTURES__
const fixture = fixtures[fixtureName]
if (!fixture) throw new Error('Unknown fixture: ' + fixtureName)
window.__docxResourceSentinel = 0

const response = await fetch(fixture.url)
if (!response.ok) throw new Error('DOCX fixture request failed: ' + response.status)
const buffer = await response.arrayBuffer()
const target = document.querySelector('#target')
let instance

if (surface === 'engine') {
  await renderAsync(buffer, target, undefined, {
    useWorker: false,
    awaitLayout: true,
    useBase64URL: true,
    renderPageBatchSize: Number.MAX_SAFE_INTEGER,
    externalResourcePolicy,
  })
} else if (surface === 'renderer') {
  instance = await renderWordDocx(buffer, target, {
    options: {
      docx: {
        worker: false,
        awaitLayout: true,
        progressive: false,
        externalResourcePolicy,
      },
    },
  })
} else {
  throw new Error('Unknown surface: ' + surface)
}

await new Promise(resolve => setTimeout(resolve, 50))
const sources = Array.from(target.querySelectorAll('img')).map(image => image.getAttribute('src'))
window.__docxExternalResourceResult = {
  sentinel: window.__docxResourceSentinel,
  dangerousAttributes: target.querySelectorAll('[onload],[onerror],[onclick],[onmouseover]').length,
  sources,
  remoteSources: sources.filter(source => source === fixture.remoteUrl),
  unsafeSources: sources.filter(source => /^\s*(?:javascript|vbscript|file):/i.test(source || '')),
  dataSources: sources.filter(source => String(source).startsWith('data:image/gif;base64,')),
  blobSources: sources.filter(source => String(source).startsWith('blob:')),
}
window.__docxExternalResourceCleanup = () => instance?.unmount?.()
`

const harnessRoot = await mkdtemp(join(tmpdir(), 'file-viewer-docx-resource-policy-'))
let viteServer
let browser

try {
  const browserFixtures = Object.fromEntries(
    Object.entries(fixtures).map(([name, fixture]) => [
      name,
      {
        url: `/@fs/${fixture.path}`,
        remoteUrl: fixture.remoteUrl
      }
    ])
  )
  await writeFile(
    join(harnessRoot, 'main.js'),
    harnessMain.replace('__FIXTURES__', JSON.stringify(browserFixtures))
  )
  await writeFile(
    join(harnessRoot, 'index.html'),
    '<!doctype html><html><head><meta charset="UTF-8"><link rel="icon" href="data:,"></head><body><div id="target"></div><script type="module" src="/main.js"></script></body></html>'
  )

  const viteEntry = demoRequire.resolve('vite')
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  viteServer = await createServer({
    root: harnessRoot,
    configFile: false,
    logLevel: 'error',
    define: { global: 'globalThis' },
    resolve: {
      alias: [
        { find: '@security/docx-engine', replacement: engineEntry },
        { find: /^@file-viewer\/docx$/, replacement: engineEntry },
        {
          find: '@security/word-renderer',
          replacement: join(root, 'packages/renderers/word/src/wordDocx.ts')
        },
        {
          find: '@file-viewer/core/assets',
          replacement: join(root, 'packages/core/src/assets.ts')
        },
        { find: '@file-viewer/core', replacement: join(root, 'packages/core/src/index.ts') }
      ]
    },
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      fs: { allow: [root, harnessRoot, dirname(engineEntry)] }
    }
  })
  await viteServer.listen()
  const address = viteServer.httpServer?.address()
  assert(address && typeof address === 'object', 'Vite did not expose a local address.')

  const playwrightModule = await importPlaywright()
  const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default
  browser = await launchChromium(chromium)

  for (const [fixtureName, fixture] of Object.entries(fixtures)) {
    for (const surface of ['engine', 'renderer']) {
      for (const policy of ['block', 'allow']) {
        const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
        let externalGets = 0
        let dialogs = 0
        const failures = []

        await page.route(fixture.remoteUrl, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'image/svg+xml',
            headers: { 'cache-control': 'no-store' },
            body: '<svg xmlns="http://www.w3.org/2000/svg" onload="top.__docxResourceSentinel+=1"><script>top.__docxResourceSentinel+=10</script><rect width="1" height="1"/></svg>'
          })
        })
        page.on('request', (request) => {
          if (request.url() === fixture.remoteUrl && request.method() === 'GET') externalGets += 1
        })
        page.on('pageerror', (error) => failures.push(error.message))
        page.on('dialog', async (dialog) => {
          dialogs += 1
          await dialog.dismiss()
        })

        await page.goto(
          `http://127.0.0.1:${address.port}/?fixture=${fixtureName}&surface=${surface}&policy=${policy}`,
          { waitUntil: 'domcontentloaded', timeout }
        )
        await page.waitForFunction(() => Boolean(window.__docxExternalResourceResult), null, {
          timeout
        })
        const result = await page.evaluate(() => window.__docxExternalResourceResult)

        assert.deepEqual(failures, [], `${surface}/${policy} raised a page error`)
        assert.equal(dialogs, 0, `${surface}/${policy} opened a dialog`)
        assert.equal(result.sentinel, 0, `${surface}/${policy} executed document-authored content`)
        assert.equal(
          result.dangerousAttributes,
          0,
          `${surface}/${policy} retained event attributes`
        )
        assert.deepEqual(
          result.unsafeSources,
          [],
          `${surface}/${policy} retained an unsafe protocol`
        )
        if (fixtureName === 'image') {
          assert.ok(result.dataSources.length >= 1, `${surface}/${policy} lost the data image URL`)
          assert.ok(result.blobSources.length >= 1, `${surface}/${policy} lost the blob image URL`)
          assert.ok(
            result.dataSources.length + result.blobSources.length >= 3,
            `${surface}/${policy} lost a local or embedded image: ${JSON.stringify(result.sources)}`
          )
        }
        assert.equal(
          externalGets,
          policy === 'allow' ? 1 : 0,
          `${surface}/${policy} external GET count did not match policy`
        )
        assert.equal(
          result.remoteSources.length,
          policy === 'allow' ? 1 : 0,
          `${surface}/${policy} remote image DOM state did not match policy`
        )

        await page.evaluate(() => window.__docxExternalResourceCleanup?.())
        await page.close()
        console.log(
          `[docx-external-resource] ${fixtureName}/${surface}/${policy}: ${externalGets} external GET`
        )
      }
    }
  }
} finally {
  await browser?.close()
  await viteServer?.close()
  await rm(harnessRoot, { recursive: true, force: true })
}

console.log(
  '[docx-external-resource] direct engine and standard renderer passed Chromium request isolation.'
)
