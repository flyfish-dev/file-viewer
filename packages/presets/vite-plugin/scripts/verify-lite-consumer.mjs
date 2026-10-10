import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const packageRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(packageRoot, '../../..')
const require = createRequire(join(sourceRoot, 'package.json'))
const { chromium, webkit } = require('playwright')
const work = await realpath(await mkdtemp(join(tmpdir(), 'file-viewer-lite-consumer-')))
const output = join(sourceRoot, 'output/vite-lite-consumer')
const report = { passed: false, packages: [], cases: [], thirdPartyOverrides: [] }
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 300000
  })
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

await mkdir(output, { recursive: true })
try {
  const tarballs = {}
  // Replace only unpublished, normally packed File Viewer artifacts. All third-party
  // dependencies and peer resolution use the consumer's ordinary registry graph.
  for (const directory of [
    'core',
    'components/web',
    'presets/lite',
    'presets/vite-plugin',
    'renderers/text',
    'renderers/image',
    'renderers/media'
  ]) {
    const root = join(sourceRoot, 'packages', directory)
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const destination = join(work, 'pack', directory.replaceAll('/', '-'))
    await mkdir(destination, { recursive: true })
    run('pnpm', ['pack', '--pack-destination', destination], root)
    const tarball = join(
      destination,
      (await readdir(destination)).find((name) => name.endsWith('.tgz'))
    )
    tarballs[manifest.name] = `file:${tarball}`
    report.packages.push({
      name: manifest.name,
      version: manifest.version,
      sha256: sha256(await readFile(tarball))
    })
  }

  const app = join(work, 'consumer')
  await mkdir(app)
  const pluginManifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
  const manifest = {
    name: 'file-viewer-lite-cold-consumer',
    private: true,
    type: 'module',
    dependencies: {
      '@file-viewer/web': tarballs['@file-viewer/web'],
      '@file-viewer/preset-lite': tarballs['@file-viewer/preset-lite']
    },
    devDependencies: {
      '@file-viewer/vite-plugin': tarballs['@file-viewer/vite-plugin'],
      vite: pluginManifest.devDependencies.vite
    }
  }
  report.hostDependencies = Object.keys(manifest.dependencies)
  await writeFile(join(app, 'package.json'), JSON.stringify(manifest, null, 2))
  await writeFile(
    join(app, 'pnpm-workspace.yaml'),
    `overrides:\n${Object.entries(tarballs)
      .map(([name, location]) => `  '${name}': '${location}'`)
      .join('\n')}\n`
  )
  await writeFile(
    join(output, 'install.log'),
    run(
      'pnpm',
      [
        'install',
        '--ignore-scripts',
        '--strict-peer-dependencies',
        '--registry=https://registry.npmjs.org'
      ],
      app
    )
  )
  const consumerRequire = createRequire(join(app, 'package.json'))
  assert.throws(
    () => consumerRequire.resolve('@file-viewer/core'),
    { code: 'MODULE_NOT_FOUND' },
    'The host must not resolve an undeclared raw-core dependency'
  )
  const pluginEntry = await realpath(consumerRequire.resolve('@file-viewer/vite-plugin'))
  assert.ok(
    pluginEntry.startsWith(app + sep),
    'The plugin must be physically installed in the cold consumer'
  )
  const presetEntry = await realpath(consumerRequire.resolve('@file-viewer/preset-lite'))
  const coreEntry = await realpath(createRequire(presetEntry).resolve('@file-viewer/core'))
  assert.ok(coreEntry.startsWith(app + sep), 'The preset must own the installed core dependency')
  const { fileViewerRenderers } = await import(pathToFileURL(pluginEntry).href)
  const vite = await import(pathToFileURL(consumerRequire.resolve('vite')).href)
  report.vite = JSON.parse(
    await readFile(consumerRequire.resolve('vite/package.json'), 'utf8')
  ).version
  report.undeclaredCoreUnresolvable = true
  await writeFile(
    join(app, 'index.html'),
    '<!doctype html><meta charset="utf-8"><flyfish-file-viewer id="viewer" style="display:block;height:500px"></flyfish-file-viewer><script type="module" src="./main.js"></script>'
  )
  await writeFile(
    join(app, 'main.js'),
    `
import { defineFileViewerElement } from '@file-viewer/web'
defineFileViewerElement()
let viewer = document.querySelector('#viewer')
viewer.options = { toolbar: false, locale: 'en-US' }
window.showLiteFile = (filename, text) => {
  viewer.source = { buffer: new TextEncoder().encode(text).buffer, filename }
}
window.disposeLiteViewer = () => viewer.remove()
const installResizeFeedback = element => {
  element.addEventListener('viewer-event', event => {
    if (event.detail.type === 'zoom-change' && window.pendingLiteResizeFeedback) {
      window.pendingLiteResizeFeedback = false
      window.liteResizeFeedbackCount++
      element.style.height = '480px'
    }
  })
}
window.liteResizeFeedbackCount = 0
installResizeFeedback(viewer)
window.resizeLiteViewer = (width, height, feedback = false) => {
  window.pendingLiteResizeFeedback = feedback
  viewer.style.width = width + 'px'
  viewer.style.height = height + 'px'
}
window.reopenLiteViewer = () => {
  const next = document.createElement('flyfish-file-viewer')
  next.id = 'viewer'
  next.style.cssText = 'display:block;height:500px'
  viewer.replaceWith(next)
  document.body.append(next)
  viewer = next
  installResizeFeedback(viewer)
}
window.showLiteFile('cold-consumer.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="90"><rect width="200" height="90" fill="#1565c0"/></svg>')
`
  )
  const previousCwd = process.cwd()
  process.chdir(app)
  try {
    for (const copyAssets of [false, true]) {
      const name = copyAssets ? 'with-assets' : 'without-assets'
      const plugin = fileViewerRenderers({ preset: 'lite', copyAssets })
      const aliases = plugin.config({ root: app }).resolve.alias
      const coreAlias = aliases.find((alias) => alias.find.test?.('@file-viewer/core'))
      assert.ok(coreAlias, 'The virtual renderer module requires a core alias owned by the preset')
      assert.equal(await realpath(coreAlias.replacement), coreEntry)
      const moduleIds = []
      const config = {
        configFile: false,
        root: app,
        logLevel: 'warn',
        plugins: [
          plugin,
          {
            name: 'record-lite-consumer-inputs',
            generateBundle() {
              moduleIds.push(...this.getModuleIds())
            }
          }
        ],
        build: { outDir: `dist-${name}` }
      }
      await vite.build(config)
      assert.ok(
        moduleIds.includes(coreEntry),
        'The production bundle must contain the actual installed core'
      )
      assert.ok(
        !moduleIds.some((id) => id.includes(sourceRoot)),
        'Consumer runtime inputs must not borrow monorepo files'
      )
      const preview = await vite.preview({ ...config, preview: { host: '127.0.0.1', port: 0 } })
      const origin = `http://127.0.0.1:${preview.httpServer.address().port}`
      try {
        for (const [browserName, engine] of [
          ['chromium', chromium],
          ['webkit', webkit]
        ]) {
          const browser = await engine.launch({ headless: true })
          try {
            const page = await browser.newPage({ viewport: { width: 1000, height: 650 } })
            await page.addInitScript(() => {
              const NativeObserver = window.ResizeObserver
              const observed = new Map()
              const windowErrors = []
              let deliveries = 0
              window.addEventListener('error', (event) => windowErrors.push(event.message))
              window.ResizeObserver = class extends NativeObserver {
                constructor(callback) {
                  super((entries, observer) => {
                    deliveries++
                    callback.call(observer, entries, observer)
                  })
                }
                observe(target, options) {
                  super.observe(target, options)
                  const targets = observed.get(this) || new Set()
                  targets.add(target)
                  observed.set(this, targets)
                }
                unobserve(target) {
                  super.unobserve(target)
                  const targets = observed.get(this)
                  targets?.delete(target)
                  if (!targets?.size) observed.delete(this)
                }
                disconnect() {
                  super.disconnect()
                  observed.delete(this)
                }
              }
              window.liteResizeState = () => ({
                observers: observed.size,
                targets: [...observed.values()].reduce((count, targets) => count + targets.size, 0),
                deliveries,
                windowErrors: [...windowErrors]
              })
            })
            const errors = []
            const externalRequests = []
            page.on('pageerror', (error) => errors.push(error.message))
            page.on('console', (message) => {
              if (message.type() === 'error') errors.push(message.text())
            })
            page.on('request', (request) => {
              if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/'))
                externalRequests.push(request.url())
            })
            await page.goto(origin)
            const image = page.locator('#viewer img').first()
            await image.waitFor({ timeout: 30000 })
            await image.evaluate((image) => image.decode())
            assert.equal(await image.evaluate((image) => image.naturalWidth), 200)
            const layoutChecks = []
            const stableLayout = async (phase, locator = image) => {
              const samples = await locator.evaluate(async (element) => {
                const samples = []
                for (let frame = 0; frame < 8; frame++) {
                  await new Promise((resolve) => requestAnimationFrame(resolve))
                  const root = element.closest('.image-viewer') || element
                  const bounds = element.getBoundingClientRect()
                  samples.push({
                    width: bounds.width,
                    height: bounds.height,
                    viewportWidth: root.clientWidth,
                    viewportHeight: root.clientHeight,
                    deliveries: window.liteResizeState().deliveries
                  })
                }
                return samples
              })
              assert.deepEqual(samples.at(-1), samples.at(-2), `${phase}: geometry must settle`)
              assert.deepEqual(
                samples.at(-2),
                samples.at(-3),
                `${phase}: observer delivery must settle`
              )
              assert.deepEqual(await page.evaluate(() => window.liteResizeState().windowErrors), [])
              layoutChecks.push({ phase, samples })
              return samples.at(-1)
            }
            await stableLayout('initial SVG')
            await page.evaluate(() => window.resizeLiteViewer(530, 420, true))
            await stableLayout('host resize from a zoom subscriber')
            assert.equal(await page.evaluate(() => window.liteResizeFeedbackCount), 1)
            await page.evaluate(() => window.resizeLiteViewer(220, 260))
            assert.ok((await stableLayout('narrow host')).width < 200)
            await page.evaluate(() => window.resizeLiteViewer(760, 500))
            assert.equal((await stableLayout('restored host')).width, 200)
            await page.evaluate(() =>
              window.showLiteFile(
                'cold-consumer.md',
                '# Cold lite consumer\n\nActual preset registration'
              )
            )
            await page
              .getByRole('heading', { name: 'Cold lite consumer' })
              .waitFor({ timeout: 30000 })
            await stableLayout('Markdown after image disposal', page.locator('#viewer'))
            await page.screenshot({ path: join(output, `${name}-${browserName}.png`) })
            await page.evaluate(() => window.disposeLiteViewer())
            assert.equal(await page.locator('#viewer').count(), 0)
            assert.equal(await page.evaluate(() => window.liteResizeState().observers), 0)
            assert.equal(await page.evaluate(() => window.liteResizeState().targets), 0)
            for (let round = 1; round <= 2; round++) {
              await page.evaluate(() => {
                window.reopenLiteViewer()
                window.showLiteFile(
                  'reopened.svg',
                  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="90"><rect width="200" height="90" fill="#1565c0"/></svg>'
                )
              })
              await image.waitFor({ timeout: 30000 })
              await image.evaluate((element) => element.decode())
              await stableLayout(`reopen ${round}`)
              await page.evaluate(() => window.resizeLiteViewer(220, 260))
              assert.ok((await stableLayout(`reopen ${round} resized`)).width < 200)
              await page.evaluate(() => window.disposeLiteViewer())
              assert.equal(await page.locator('#viewer').count(), 0)
              assert.equal(await page.evaluate(() => window.liteResizeState().observers), 0)
              assert.equal(await page.evaluate(() => window.liteResizeState().targets), 0)
            }
            assert.deepEqual(errors, [])
            const resizeState = await page.evaluate(() => window.liteResizeState())
            assert.deepEqual(resizeState.windowErrors, [])
            assert.deepEqual(externalRequests, [])
            report.cases.push({
              name,
              browser: browserName,
              browserVersion: browser.version(),
              svgWidth: 200,
              markdown: true,
              removed: true,
              layoutChecks,
              reopenCycles: 2,
              resizeFeedbackCount: await page.evaluate(() => window.liteResizeFeedbackCount),
              resizeState,
              errors,
              externalRequests,
              passed: true
            })
          } finally {
            await browser.close()
          }
        }
      } finally {
        await new Promise((resolveClose) => preview.httpServer.close(resolveClose))
      }
    }
  } finally {
    process.chdir(previousCwd)
  }
  report.passed = true
} catch (error) {
  report.error = error.message
  throw error
} finally {
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  await rm(work, { recursive: true, force: true })
}
console.log(
  `[vite-plugin] Cold lite consumer: ${report.cases.length} actual browser cases passed without a host core dependency.`
)
