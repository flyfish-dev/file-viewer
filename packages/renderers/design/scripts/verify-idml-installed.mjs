/** Real IDML rendering through ordinary packed packages and a clean npm consumer. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { pnpmInvocation } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'
import {
  assertNoAncestorNodeModules,
  cleanEnvironment,
  containedPath
} from '../../dicom/scripts/verify-packed-browser.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const output = resolve(
  process.env.IDML_INSTALLED_EVIDENCE_DIR || join(root, 'output/idml-installed')
)
mkdirSync(output, { recursive: true })
const temporary = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-idml-installed-')))
const consumer = join(temporary, 'consumer')
const tarballs = join(temporary, 'tarballs')
const site = join(consumer, 'site')
for (const folder of [consumer, tarballs, site, join(site, 'assets'), join(output, 'tarballs')])
  mkdirSync(folder, { recursive: true })
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const report = { status: 'running', packages: [], commands: [], artifacts: [], browsers: [] }
const env = Object.fromEntries(
  Object.entries(cleanEnvironment(process.env)).filter(
    ([name]) => !/^npm_config_/i.test(name) && !['NPM_TOKEN', 'NODE_AUTH_TOKEN'].includes(name)
  )
)
for (const name of ['user.npmrc', 'global.npmrc']) writeFileSync(join(temporary, name), '')
Object.assign(env, {
  npm_config_userconfig: join(temporary, 'user.npmrc'),
  npm_config_globalconfig: join(temporary, 'global.npmrc'),
  npm_config_cache: join(temporary, 'npm-cache'),
  npm_config_fetch_retries: '0',
  npm_config_fetch_timeout: '30000',
  npm_config_ignore_scripts: 'true'
})
function run(label, command, args, cwd) {
  const startedAt = new Date().toISOString()
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024
  })
  writeFileSync(join(output, `${label}.log`), `${result.stdout || ''}${result.stderr || ''}`)
  report.commands.push({
    label,
    command,
    args,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status,
    signal: result.signal,
    error: result.error?.message
  })
  assert.ok(
    !result.error && result.status === 0,
    `${label} failed: ${(result.stderr || result.stdout || result.error?.message || '').slice(-4000)}`
  )
}
function packageRoot(name, resolver) {
  let path = dirname(resolver.resolve(name))
  while (path !== dirname(path)) {
    if (existsSync(join(path, 'package.json'))) {
      const metadata = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'))
      if (metadata.name === name) return { path: containedPath(consumer, path), metadata }
    }
    path = dirname(path)
  }
  throw new Error(`Missing installed package: ${name}`)
}

let server
try {
  assert.equal(process.env.NODE_PATH, undefined)
  assert.equal(process.env.NODE_OPTIONS, undefined)
  assertNoAncestorNodeModules(consumer)
  const pnpm = pnpmInvocation()
  for (const path of ['packages/core', 'packages/renderers/data', 'packages/renderers/design']) {
    const metadata = JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8'))
    const before = new Set(readdirSync(tarballs))
    run(
      `pack-${metadata.name.split('/').pop()}`,
      pnpm.command,
      [...pnpm.args, 'pack', '--pack-destination', tarballs],
      join(root, path)
    )
    const added = readdirSync(tarballs).filter((name) => name.endsWith('.tgz') && !before.has(name))
    assert.equal(added.length, 1)
    const bytes = readFileSync(join(tarballs, added[0]))
    report.packages.push({
      name: metadata.name,
      version: metadata.version,
      tarball: added[0],
      bytes: bytes.length,
      sha256: sha256(bytes)
    })
    copyFileSync(join(tarballs, added[0]), join(output, 'tarballs', added[0]))
  }
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify(
      { name: 'idml-installed-proof', version: '1.0.0', private: true, type: 'module' },
      null,
      2
    )
  )
  const flags = [
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--strict-peer-deps',
    '--registry=https://registry.npmjs.org/'
  ]
  const sourceRequire = createRequire(join(root, 'package.json'))
  const sourceBuildRequire = createRequire(join(root, 'packages/renderers/design/package.json'))
  const esbuildVersion = sourceBuildRequire('esbuild/package.json').version
  run(
    'normal-install',
    'npm',
    [
      'install',
      '--save-exact',
      ...flags,
      ...report.packages.map((pkg) => join(tarballs, pkg.tarball)),
      `esbuild@${esbuildVersion}`
    ],
    consumer
  )
  run('frozen-install', 'npm', ['ci', ...flags], consumer)
  for (const name of ['package.json', 'package-lock.json']) {
    copyFileSync(join(consumer, name), join(output, name))
    assert.equal(JSON.parse(readFileSync(join(consumer, name), 'utf8')).overrides, undefined)
  }
  assertNoAncestorNodeModules(consumer)
  const require = createRequire(join(consumer, 'package.json'))
  for (const pkg of report.packages)
    assert.equal(packageRoot(pkg.name, require).metadata.version, pkg.version)
  const design = packageRoot('@file-viewer/renderer-design', require)
  assert.equal(design.metadata.dependencies['@paged-media/introspect-wasm'], '0.70.2')
  const ownedRequire = createRequire(join(design.path, 'package.json'))
  const introspect = packageRoot('@paged-media/introspect-wasm', ownedRequire)
  assert.equal(introspect.metadata.version, '0.70.2')
  const files = [
    [
      'idml.worker.js',
      containedPath(
        consumer,
        ownedRequire.resolve('@file-viewer/renderer-design/worker/idml.worker.js')
      )
    ],
    ['paged_introspect_wasm_bg.wasm', join(introspect.path, 'paged_introspect_wasm_bg.wasm')],
    ['LICENSE.introspect-wasm-MPL-2.0.txt', join(design.path, 'LICENSES/MPL-2.0.txt')]
  ]
  for (const [name, path] of files) {
    containedPath(consumer, path)
    const bytes = readFileSync(path)
    copyFileSync(path, join(site, 'assets', name))
    assert.equal(sha256(readFileSync(join(site, 'assets', name))), sha256(bytes))
    report.artifacts.push({
      name,
      bytes: bytes.length,
      sha256: sha256(bytes),
      source: relative(consumer, path)
    })
  }
  assert.equal(
    report.artifacts[1].sha256,
    'bc5eeb88eae1eabae0aeb30cfd74f7845be38628e638e733022d3aeb198af12d'
  )
  assert.equal(
    report.artifacts[2].sha256,
    '3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04'
  )
  const sample = readFileSync(join(root, 'apps/viewer-demo/public/example/indesign-layout.idml'))
  assert.equal(sample.length, 221328)
  assert.equal(sha256(sample), 'd13ef94a7fc7982fdb7ab9afabaecf63abd877b2b0fdf9de1841363ad0de5ce7')
  writeFileSync(join(site, 'sample.idml'), sample)
  copyFileSync(
    join(root, 'apps/viewer-demo/public/example/licenses/idmllib-MIT.txt'),
    join(output, 'fixture-MIT.txt')
  )
  report.fixture = {
    bytes: sample.length,
    sha256: sha256(sample),
    pages: 2,
    source: 'https://github.com/dimelords/idmllib/tree/01546af176afbe72cce45378d6c927099bcc9383',
    license: 'MIT'
  }
  writeFileSync(
    join(consumer, 'entry.mjs'),
    `import { renderFileViewerDesign } from '@file-viewer/renderer-design';
const target = document.querySelector('#viewer');
try {
  const buffer = await (await fetch('/sample.idml')).arrayBuffer();
  const design = {
    idmlWorkerUrl: '/assets/idml.worker.js', idmlWasmUrl: '/assets/paged_introspect_wasm_bg.wasm',
    maxFileBytes: 512 * 1024, idmlMaxExpandedBytes: 2 * 1024 * 1024, idmlMaxEntries: 256,
    idmlMaxPages: 4, idmlMaxFrames: 100, maxCanvasDimension: 2048, maxCanvasPixels: 2000000,
    workerTimeoutMs: 20000, maxLayerCacheBytes: 8 * 1024 * 1024, idmlRenderDpi: 96
  };
  try {
    await renderFileViewerDesign(buffer.slice(0), target, 'idml', { options: {
      locale: 'en', design: { ...design, maxCanvasPixels: 1100000 }
    } });
    throw new Error('Expected fixed-page projection to exceed the smaller pixel limit');
  } catch (error) {
    if (!/exceeding the 1100000-pixel safety limit/.test(error.message)) throw error;
    window.idmlSmallerLimit = { message: error.message, liveWorkers: window.idmlWorkers.live,
      remainingElements: target.childElementCount };
  }
  const instance = await renderFileViewerDesign(buffer, target, 'idml', {
    options: { locale: 'en', design }
  });
  window.idmlPacked = { unmount: () => instance.unmount() }; window.idmlReady = true;
} catch (error) { window.idmlError = String(error.name) + ': ' + String(error.message) + '\\n' + String(error.stack); }
`
  )
  const build = await require('esbuild').build({
    absWorkingDir: consumer,
    entryPoints: ['entry.mjs'],
    outfile: join(site, 'entry.mjs'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    metafile: true,
    logLevel: 'silent'
  })
  for (const input of Object.keys(build.metafile.inputs))
    containedPath(consumer, resolve(consumer, input))
  for (const item of Object.values(build.metafile.outputs))
    assert.ok(
      item.imports.every((entry) => !entry.external),
      'External browser import escaped ordinary consumer'
    )
  writeFileSync(join(output, 'build-metafile.json'), JSON.stringify(build.metafile, null, 2) + '\n')
  writeFileSync(
    join(site, 'index.html'),
    '<!doctype html><html lang="en"><meta charset="utf-8"><body style="margin:0"><div id="viewer" style="width:1100px;height:800px"></div><script type="module" src="/entry.mjs"></script></body></html>'
  )
  const types = {
    '.mjs': 'text/javascript',
    '.js': 'text/javascript',
    '.wasm': 'application/wasm',
    '.html': 'text/html'
  }
  server = createServer((request, response) => {
    try {
      const path = resolve(
        site,
        '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      )
      const file = path === site ? join(site, 'index.html') : path
      assert.ok(realpathSync(file).startsWith(realpathSync(site) + sep))
      response.writeHead(200, {
        'content-type': types[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream'
      })
      response.end(readFileSync(file))
    } catch {
      response.writeHead(404)
      response.end()
    }
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${server.address().port}`
  const playwright = sourceRequire('playwright')
  for (const name of ['chromium', 'webkit']) {
    const result = {
      browser: name,
      status: 'running',
      errors: [],
      requests: [],
      blockedRequests: [],
      pages: []
    }
    report.browsers.push(result)
    const browser = await playwright[name].launch({ headless: true })
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
      page.on('pageerror', (error) => result.errors.push(error.message))
      await page.route('**/*', (route) => {
        const url = route.request().url()
        result.requests.push(url.replace(origin, '<local>'))
        // WebKit reads a Worker-owned Blob stream through its same-origin blob URL.
        // It contains packaged metadata, rather than a request to an external server.
        if (url.startsWith(origin + '/') || url.startsWith(`blob:${origin}/`)) {
          return route.continue()
        }
        result.blockedRequests.push(url)
        return route.abort()
      })
      await page.addInitScript(() => {
        const Original = window.Worker
        window.idmlWorkers = { created: 0, live: 0, terminated: 0 }
        window.Worker = class extends Original {
          constructor(...args) {
            super(...args)
            this.ownedLive = true
            window.idmlWorkers.created++
            window.idmlWorkers.live++
          }
          terminate() {
            if (this.ownedLive) {
              this.ownedLive = false
              window.idmlWorkers.live--
              window.idmlWorkers.terminated++
            }
            super.terminate()
          }
        }
      })
      await page.goto(origin, { waitUntil: 'load' })
      await page.waitForFunction(() => window.idmlReady || window.idmlError, undefined, {
        timeout: 30000
      })
      assert.equal(await page.evaluate(() => window.idmlError), undefined)
      assert.deepEqual(result.blockedRequests, [])
      result.smallerLimit = await page.evaluate(() => window.idmlSmallerLimit)
      assert.equal(result.smallerLimit.liveWorkers, 0)
      assert.equal(result.smallerLimit.remainingElements, 0)
      assert.equal(await page.locator('.idml-viewer').getAttribute('data-page-count'), '2')
      assert.equal(
        await page.locator('.idml-viewer').getAttribute('data-idml-engine-version'),
        '0.70.2'
      )
      for (const index of [0, 1]) {
        if (index) await page.locator('[data-idml-action="next"]').click()
        await page.waitForFunction(
          (number) =>
            document
              .querySelector('.idml-status')
              ?.textContent.includes(`CPU WASM page render · ${number}/2`),
          index + 1
        )
        const pixels = await page.evaluate(() => {
          const canvas = document.querySelector('.idml-page-shell canvas')
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
          let nonwhite = 0
          for (let i = 0; i < data.length; i += 4)
            if (data[i + 3] && Math.min(data[i], data[i + 1], data[i + 2]) < 245) nonwhite++
          return {
            width: canvas.width,
            height: canvas.height,
            nonwhite,
            png: canvas.toDataURL('image/png')
          }
        })
        assert.equal(pixels.width, 1059)
        assert.equal(pixels.height, 1512)
        assert.ok(
          pixels.nonwhite >= (index ? 1000 : 200000),
          'IDML page lacks expected visible content'
        )
        const png = Buffer.from(pixels.png.split(',')[1], 'base64')
        writeFileSync(join(output, `${name}-page-${index + 1}-canvas.png`), png)
        await page
          .locator('.idml-page-shell canvas')
          .screenshot({ path: join(output, `${name}-page-${index + 1}-visible.png`) })
        delete pixels.png
        result.pages.push({ index, ...pixels, pngSHA256: sha256(png) })
      }
      const before = await page
        .locator('.idml-page-shell')
        .evaluate((element) => element.style.transform)
      await page.locator('[data-idml-action="zoom-in"]').click()
      assert.notEqual(
        await page.locator('.idml-page-shell').evaluate((element) => element.style.transform),
        before
      )
      await page.evaluate(() => {
        window.idmlPacked.unmount()
        window.idmlPacked.unmount()
      })
      await page.waitForFunction(() => window.idmlWorkers.live === 0)
      result.workers = await page.evaluate(() => window.idmlWorkers)
      assert.equal(result.workers.created, 2)
      assert.equal(result.workers.terminated, 2)
      assert.equal(
        await page.locator('#viewer').evaluate((element) => element.childElementCount),
        0
      )
      assert.deepEqual(result.errors, [])
      assert.deepEqual(result.blockedRequests, [])
      assert.ok(
        result.requests.every(
          (url) => url.startsWith('<local>/') || url.startsWith('blob:<local>/')
        )
      )
      result.status = 'passed'
    } finally {
      await browser.close()
    }
  }
  report.status = 'passed'
  console.log(
    JSON.stringify({
      status: report.status,
      artifacts: report.artifacts,
      browsers: report.browsers.map(({ browser, status, pages, workers }) => ({
        browser,
        status,
        pages,
        workers
      }))
    })
  )
} catch (error) {
  report.status = 'failed'
  report.error = error.stack || error.message
  throw error
} finally {
  if (server) await new Promise((done) => server.close(done))
  report.finishedAt = new Date().toISOString()
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  rmSync(temporary, { recursive: true, force: true })
}
