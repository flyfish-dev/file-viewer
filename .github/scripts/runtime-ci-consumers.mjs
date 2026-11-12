import assert from 'node:assert/strict'
import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'
import { command, verifyFrozenArtifacts } from './runtime-ci-artifacts.mjs'
import {
  startFrozenValidationRegistry,
  verifyFrozenArchive
} from './frozen-validation-registry.mjs'

export const consumerFrameworks = [
  'web',
  'vue3',
  'vue2.7',
  'vue2.6',
  'react',
  'react-legacy',
  'svelte',
  'jquery'
]
const profiles = ['standard', 'full']
const declarationDependencies = {
  react: ['@types/react@19.3.0'],
  'react-legacy': ['@types/react@17.0.93'],
  jquery: ['@types/jquery@3.5.33']
}
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}

export async function serveConsumer(directory) {
  const root = await realpath(directory)
  const server = createServer(
    (request, response) =>
      void (async () => {
        assert(['GET', 'HEAD'].includes(request.method))
        const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
        assert(!path.includes('\\') && !path.split('/').includes('..'))
        const file = resolve(root, '.' + (path === '/' ? '/index.html' : path))
        assert(file.startsWith(root + sep))
        const actual = await realpath(file)
        assert(actual.startsWith(root + sep))
        const info = await lstat(actual)
        assert(info.isFile())
        response.writeHead(200, {
          'content-type': mime[extname(file)] || 'application/octet-stream',
          'content-length': info.size,
          'cache-control': 'no-store'
        })
        if (request.method === 'HEAD') response.end()
        else await pipeline(createReadStream(actual), response)
      })().catch(() => {
        if (!response.headersSent) {
          response.writeHead(404)
          response.end()
        } else response.destroy()
      })
  )
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((done) => {
        server.close(done)
        server.closeIdleConnections()
      })
  }
}

// The generated public quickstart must render actual document pixels, not just mount a shell.
export function pdfCanvasState() {
  const visit = (root) => {
    const canvas = root.querySelector('.pdfViewer .page[data-page-number="1"] canvas')
    if (canvas) return canvas
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) {
        const found = visit(element.shadowRoot)
        if (found) return found
      }
    }
    return null
  }
  const canvas = visit(document)
  if (!canvas || canvas.width <= 10 || canvas.height <= 10) return null
  const probe = document.createElement('canvas')
  probe.width = probe.height = 128
  const context = probe.getContext('2d', { willReadFrequently: true })
  context.fillStyle = '#fff'
  context.fillRect(0, 0, 128, 128)
  context.drawImage(canvas, 0, 0, 128, 128)
  const data = context.getImageData(0, 0, 128, 128).data
  let minimum = 255,
    maximum = 0,
    ink = 0
  for (let offset = 0; offset < data.length; offset += 4) {
    const luma = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722
    minimum = Math.min(minimum, luma)
    maximum = Math.max(maximum, luma)
    if (luma < 245) ink++
  }
  return ink > 1 && maximum - minimum > 5
    ? { width: canvas.width, height: canvas.height, ink, contrast: maximum - minimum }
    : null
}

export async function verifyConsumerBrowser(browser, directory, screenshot) {
  const server = await serveConsumer(directory)
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block'
  })
  const page = await context.newPage(),
    errors = [],
    warnings = [],
    external = [],
    resources = [],
    pending = []
  await context.addInitScript(() => {
    window.__runtimeWorkers = []
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options)
        const record = { url: String(url), messages: 0 }
        window.__runtimeWorkers.push(record)
        this.addEventListener('message', () => record.messages++)
      }
    }
  })
  await context.route('**/*', (route) => {
    const url = route.request().url()
    if (/^(data|blob|about):/.test(url) || new URL(url).origin === server.url)
      return route.continue()
    external.push(url)
    return route.abort()
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (entry) => {
    if (entry.type() === 'error') errors.push(entry.text())
    if (entry.type() === 'warning') warnings.push(entry.text())
  })
  page.on('requestfailed', (request) => {
    if (
      new URL(request.url()).pathname === '/sample.pdf' &&
      /ABORTED|cancelled/i.test(request.failure()?.errorText || '')
    )
      return
    errors.push(`${request.url()}: ${request.failure()?.errorText}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`)
    const extension = extname(new URL(response.url()).pathname)
    if (!['.js', '.mjs', '.wasm'].includes(extension) || !response.ok()) return
    pending.push(
      (async () => {
        const bytes = await response.body(),
          contentType = response.headers()['content-type'] || ''
        assert(bytes.length > 0)
        assert.match(
          contentType,
          extension === '.wasm'
            ? /^application\/wasm\b/i
            : /^(?:text|application)\/(?:java|ecma)script\b/i
        )
        if (extension === '.wasm') assert.deepEqual([...bytes.subarray(0, 4)], [0, 97, 115, 109])
        resources.push({ path: new URL(response.url()).pathname, bytes: bytes.length, contentType })
      })().catch((error) => errors.push(error.message))
    )
  })
  try {
    const response = await page.goto(server.url, { waitUntil: 'load', timeout: 60_000 })
    assert(response?.ok())
    await page.waitForFunction(pdfCanvasState, undefined, { timeout: 60_000 })
    const canvas = await page.evaluate(pdfCanvasState)
    const workers = await page.evaluate(() => window.__runtimeWorkers)
    await page.screenshot({ path: screenshot })
    await writeFile(
      screenshot + '.json',
      JSON.stringify(
        {
          canvas,
          workers,
          warnings,
          errors,
          resources,
          frames: await Promise.all(
            page.frames().map(async (frame) => ({
              url: frame.url(),
              workers: await frame.evaluate(() => window.__runtimeWorkers || [])
            }))
          )
        },
        null,
        2
      ) + '\n'
    )
    assert(
      workers.some((worker) => worker.messages > 0),
      'A real runtime Worker must execute and respond'
    )
    await Promise.all(pending)
    assert(resources.length > 0)
    assert.deepEqual(external, [], 'The runtime requested external resources')
    assert.deepEqual(errors, [], errors.join('\n'))
    return { canvas, workers, resources, warnings, externalRequests: external.length }
  } finally {
    await context.close()
    await server.close()
  }
}

export async function runFrozenConsumers({
  manifest,
  archives,
  output,
  cacheDirectory,
  diagnosticCases,
  diagnosticCli
}) {
  const cases =
    diagnosticCases ||
    consumerFrameworks.flatMap((framework) => profiles.map((profile) => ({ framework, profile })))
  assert(!diagnosticCli || diagnosticCases, 'Local source overrides must be explicit diagnostics')
  assert(
    cases.length > 0 &&
      cases.every(
        (item) => consumerFrameworks.includes(item.framework) && profiles.includes(item.profile)
      )
  )
  const diagnostic = Boolean(diagnosticCases)
  const temporary = await mkdtemp(join(tmpdir(), 'runtime-ci-consumers-'))
  await mkdir(output, { recursive: true })
  const report = {
    schemaVersion: 1,
    version: manifest.version,
    sourceCommit: manifest.sourceCommit,
    releaseApproval: false,
    expectedCases: cases.length,
    canonicalMatrix: !diagnostic,
    cliInput: diagnosticCli
      ? 'local-source-cli-with-frozen-runtime-packages'
      : 'frozen-cli-tarball',
    status: 'running',
    cases: [],
    failures: [],
    auditExecuted: false
  }
  const save = () =>
    writeFile(join(output, 'consumers.json'), JSON.stringify(report, null, 2) + '\n')
  let registry, chromium, webkit
  try {
    registry = await startFrozenValidationRegistry({ archives, cacheDirectory })
    const env = {
      ...process.env,
      npm_config_registry: registry.url,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_cache: join(cacheDirectory, 'npm'),
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1'
    }
    const runner = join(temporary, 'runner')
    await mkdir(runner)
    await writeFile(join(runner, 'package.json'), '{"private":true,"type":"module"}\n')
    await command(
      'npm',
      [
        'install',
        '--save-exact',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        `@file-viewer/cli@${manifest.version}`,
        'typescript@5.9.3',
        'playwright@1.61.1'
      ],
      { cwd: runner, env }
    )
    const cli = diagnosticCli || join(runner, 'node_modules/@file-viewer/cli/dist/cli.js')
    const tsc = join(runner, 'node_modules/typescript/bin/tsc')
    if (process.env.CI === 'true')
      await command(
        process.execPath,
        [
          join(runner, 'node_modules/playwright/cli.js'),
          'install',
          '--with-deps',
          'chromium',
          'webkit'
        ],
        { cwd: runner, env }
      )
    const browsers = await import(
      pathToFileURL(join(runner, 'node_modules/playwright/index.mjs')).href
    )
    chromium = await browsers.chromium.launch({ headless: true })
    webkit = await browsers.webkit.launch({ headless: true })
    const catalog = JSON.parse(
      await readFile(join(runner, 'node_modules/@file-viewer/cli/catalog/catalog.json'), 'utf8')
    )
    for (const { framework, profile } of cases) {
      const project = join(temporary, `${framework}-${profile}`)
      const entry = { framework, profile, status: 'running', browsers: {} }
      report.cases.push(entry)
      await save()
      try {
        await command(
          process.execPath,
          [
            cli,
            'create',
            project,
            '--framework',
            framework,
            '--framework-version',
            catalog.frameworkTemplates[framework].defaultVersion,
            '--profile',
            profile,
            '--package-manager',
            'npm',
            '--registry',
            registry.url,
            '--cache-dir',
            join(cacheDirectory, 'cli'),
            '--concurrency',
            '3',
            '--file-viewer-version',
            manifest.version,
            '--non-interactive',
            '--yes',
            '--json'
          ],
          { cwd: runner, env }
        )
        const packageName =
          profile === 'full'
            ? catalog.frameworkOverrides.full[framework].packageName
            : catalog.frameworks[framework].packageName
        if (declarationDependencies[framework])
          await command(
            'npm',
            [
              'install',
              '--save-dev',
              '--save-exact',
              '--ignore-scripts',
              '--no-audit',
              '--no-fund',
              ...declarationDependencies[framework]
            ],
            { cwd: project, env }
          )
        await writeFile(
          join(project, 'runtime-types.mts'),
          [
            "import { createViewer, type FileViewerOptions } from '@file-viewer/core'",
            `import * as component from '${packageName}'`,
            'const options: FileViewerOptions = {}',
            "const viewer = createViewer(document.createElement('div'), { options })",
            'viewer.updateOptions(options); viewer.destroy(); void component',
            ''
          ].join('\n')
        )
        await command(
          process.execPath,
          [
            tsc,
            '--noEmit',
            '--strict',
            '--target',
            'ES2022',
            '--lib',
            'ES2022,DOM,DOM.Iterable',
            '--module',
            'NodeNext',
            '--moduleResolution',
            'NodeNext',
            '--skipLibCheck',
            'false',
            'runtime-types.mts'
          ],
          { cwd: project, env }
        )
        entry.typecheck = 'passed'
        await command('npm', ['run', 'build'], { cwd: project, env })
        entry.build = 'passed'
        for (const [id, browser] of [
          ['chromium', chromium],
          ['webkit', webkit]
        ]) {
          entry.browsers[id] = await verifyConsumerBrowser(
            browser,
            join(project, 'dist'),
            join(output, `${framework}-${profile}-${id}.png`)
          )
        }
        entry.status = 'passed'
      } catch (error) {
        entry.status = 'failed'
        entry.error = error.message
        report.failures.push({ framework, profile, error: error.message })
      } finally {
        await rm(project, { recursive: true, force: true })
        await save()
      }
    }
    assert.equal(report.cases.length, report.expectedCases)
    assert.equal(report.failures.length, 0, 'Frozen type/build/browser consumer checks failed')
    for (const archive of archives) await verifyFrozenArchive(archive.path, archive)
    report.status = diagnostic ? 'passed-local-diagnostic-consumers' : 'passed-runtime-consumers'
  } catch (error) {
    report.status = 'failed-runtime-consumers'
    report.error = error.message
  } finally {
    if (chromium) await chromium.close()
    if (webkit) await webkit.close()
    if (registry) {
      report.registryRequests = registry.requests
      await registry.close()
    }
    await rm(temporary, { recursive: true, force: true })
    report.finishedAt = new Date().toISOString()
    await save()
  }
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(
    process.argv.length,
    4,
    'Public control root and verified artifact directory are required'
  )
  const root = resolve(process.argv[2]),
    directory = resolve(process.argv[3])
  const manifest = JSON.parse(
    await readFile(join(root, 'artifacts/npm-release-manifest.json'), 'utf8')
  )
  const verified = await verifyFrozenArtifacts(directory, manifest)
  const candidate = JSON.parse(
    await readFile(join(root, 'artifacts/runtime-ci-candidate.json'), 'utf8')
  )
  const archives = verified.map((item) => ({
    packageName: item.packageName,
    version: item.version,
    filename: item.tarball,
    path: join(directory, item.tarball),
    bytes: item.tarballSize,
    integrity: item.integrity,
    sha256: item.sha256,
    unpackedBytes: item.unpackedBytes
  }))
  for (const item of candidate.registrySupport)
    archives.push({
      ...item,
      filename: item.tarball,
      path: join(directory, item.tarball),
      bytes: item.tarballSize
    })
  const output = join(process.env.RUNNER_TEMP || tmpdir(), 'runtime-ci-evidence')
  const report = await runFrozenConsumers({
    manifest,
    archives,
    output,
    cacheDirectory: join(output, 'cache')
  })
  console.log(
    JSON.stringify({
      status: report.status,
      cases: report.cases.length,
      failures: report.failures.length
    })
  )
  if (report.status !== 'passed-runtime-consumers') process.exitCode = 1
}
