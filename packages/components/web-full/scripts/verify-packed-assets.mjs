import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pnpmInvocation } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const output = join(root, 'output/web-full-packed-assets', new Date().toISOString().replaceAll(':', '-'))
const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-web-full-assets-')))
const version = JSON.parse(readFileSync(join(root, 'packages/components/web-full/package.json'), 'utf8')).version
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
mkdirSync(output, { recursive: true })
const report = {
  status: 'running', startedAt: new Date().toISOString(), consumer, version,
  scope: 'Actual source tarballs: unpacked CDN limit, all renderer entries, complete offline CLI byte identity, and compiled CDN selection. This does not claim a full npm dependency install or registry release.',
  commands: [], tarballs: {}, browsers: []
}
const run = (name, command, args, cwd = root, allowFailure = false) => {
  report.stage = name
  writeJson(join(output, 'report.json'), report)
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  delete env.NODE_PATH
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024 })
  writeFileSync(join(output, `${name}.log`), `${result.stdout || ''}${result.stderr || ''}`)
  report.commands.push({ name, command, args, status: result.status, signal: result.signal, error: result.error?.message })
  if (result.error || (!allowFailure && result.status !== 0)) throw new Error(`${name} failed; inspect ${output}/${name}.log`)
  return result
}
const listFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(item => {
  const path = join(dir, item.name)
  assert.ok(!item.isSymbolicLink(), `Unexpected symlink: ${path}`)
  return item.isDirectory() ? listFiles(path) : item.isFile() ? [path] : []
})
const extract = String.raw`
import hashlib,json,pathlib,sys,tarfile
p=pathlib.Path(sys.argv[1]); target=pathlib.Path(sys.argv[2]); files=[]
with tarfile.open(p,'r:gz') as archive:
 members=archive.getmembers()
 for member in members:
  parts=pathlib.PurePosixPath(member.name).parts
  if not parts or parts[0]!='package' or '..' in parts or member.name.startswith('/') or not (member.isfile() or member.isdir()):
   raise ValueError('Unsafe tarball member: '+member.name)
  if member.isfile():files.append({'path':'/'.join(parts[1:]),'bytes':member.size})
 total=sum(f['bytes'] for f in files)
 if total>150000000:raise ValueError('Package exceeds the 150 MB unpacked CDN limit: '+str(total))
 for member in members:
  path=target.joinpath(*pathlib.PurePosixPath(member.name).parts[1:])
  if member.isdir():path.mkdir(parents=True,exist_ok=True)
  elif member.isfile():
   path.parent.mkdir(parents=True,exist_ok=True)
   with archive.extractfile(member) as source,path.open('wb') as destination:
    while chunk:=source.read(1048576):destination.write(chunk)
print(json.dumps({'unpackedBytes':total,'files':files,'tarballBytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))
`

try {
  assert.equal(process.env.NODE_OPTIONS, undefined)
  assert.equal(process.env.NODE_PATH, undefined)
  const packs = join(output, 'packs')
  mkdirSync(packs)
  const pnpm = pnpmInvocation()
  for (const name of ['web-full', 'assets-cad', 'assets-drawing']) {
    run(`pack-${name}`, pnpm.command, [...pnpm.args, '--filter', `@file-viewer/${name}`, 'pack', '--pack-destination', packs])
    const tarball = join(packs, `file-viewer-${name}-${version}.tgz`)
    const packageDir = join(consumer, 'node_modules/@file-viewer', name)
    mkdirSync(packageDir, { recursive: true })
    const inventory = JSON.parse(run(`extract-${name}`, 'python3', ['-c', extract, tarball, packageDir]).stdout)
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    assert.equal(manifest.name, `@file-viewer/${name}`)
    assert.equal(manifest.version, version)
    report.tarballs[name] = inventory
  }
  const full = join(consumer, 'node_modules/@file-viewer/web-full')
  const fullManifest = JSON.parse(readFileSync(join(full, 'package.json'), 'utf8'))
  assert.equal(fullManifest.dependencies['@file-viewer/assets-cad'], version)
  assert.equal(fullManifest.dependencies['@file-viewer/assets-drawing'], version)
  const fullInventory = report.tarballs['web-full'].files.map(file => file.path)
  assert.ok(!fullInventory.some(path => path.startsWith('dist/vendor/drawio/') || path.startsWith('dist/wasm/cad/')))
  const rendererEntries = fullInventory.filter(path => /^dist\/renderers\/[^/]+\.iife\.js$/.test(path)).sort()
  assert.equal(rendererEntries.length, 22, 'Every full renderer entry must remain in the npm tarball')
  report.rendererEntries = rendererEntries

  const target = join(consumer, 'public/file-viewer')
  mkdirSync(target, { recursive: true })
  writeFileSync(join(target, 'host-owned.txt'), 'Host file must survive asset copying.\n')
  const cli = join(full, 'scripts/copy-assets.mjs')
  const copied = JSON.parse(run('copy-complete-offline-assets', process.execPath, [cli, target, '--json'], consumer).stdout)
  assert.equal(copied.validation.valid, true)
  assert.deepEqual(copied.validation.missingRequired, [])
  assert.equal(readFileSync(join(target, 'host-owned.txt'), 'utf8'), 'Host file must survive asset copying.\n')
  const assetManifest = JSON.parse(readFileSync(join(full, 'dist/flyfish-viewer-assets.json'), 'utf8'))
  const sourceDist = join(root, 'packages/components/web-full/dist')
  const expected = new Map()
  for (const renderer of assetManifest.rendererAssetManifests) {
    for (const asset of renderer.assets) {
      if (asset.target !== 'public' || !asset.defaultPath) continue
      const source = resolve(sourceDist, asset.defaultPath)
      assert.ok(source.startsWith(sourceDist + sep), 'Asset path escapes the full source build')
      if (!existsSync(source)) { assert.ok(!asset.required, `Missing source asset: ${asset.defaultPath}`); continue }
      for (const file of statSync(source).isDirectory() ? listFiles(source) : [source]) {
        const path = relative(sourceDist, file).split(sep).join('/')
        const record = { path, bytes: statSync(file).size, sha256: hash(file) }
        assert.equal(hash(join(target, path)), record.sha256, `Complete offline asset changed or disappeared: ${path}`)
        expected.set(path, record)
      }
    }
  }
  const receiptPath = join(target, 'file-viewer-copy-assets.receipt.json')
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  assert.equal(receipt.packageVersion, version)
  assert.deepEqual(receipt.copyGroups, assetManifest.rendererAssetManifests.map(item => item.rendererId).sort())
  const receiptByPath = new Map(receipt.files.map(file => [file.path, file]))
  for (const record of expected.values()) assert.equal(receiptByPath.get(record.path)?.sha256, record.sha256)
  const firstReceiptHash = hash(receiptPath)
  run('repeat-complete-offline-assets', process.execPath, [cli, target, '--json'], consumer)
  assert.equal(hash(receiptPath), firstReceiptHash, 'An unchanged repeated copy must preserve the receipt')
  const selectedTarget = join(consumer, 'public/cad-drawing')
  const selected = JSON.parse(run('copy-cad-drawing-assets', process.execPath, [cli, selectedTarget, '--renderers', 'cad,drawing', '--json'], consumer).stdout)
  assert.equal(selected.validation.valid, true)
  assert.deepEqual(JSON.parse(readFileSync(join(selectedTarget, 'file-viewer-copy-assets.receipt.json'), 'utf8')).copyGroups, ['cad', 'drawing'])
  report.offline = { valid: true, sourceAssetFilesVerified: expected.size, sourceAssetBytes: [...expected.values()].reduce((sum, item) => sum + item.bytes, 0), groups: receipt.copyGroups, receiptSha256: firstReceiptHash, repeatStable: true, hostFilePreserved: true }
  writeJson(join(output, 'offline-source-files.json'), [...expected.values()])

  const scriptName = 'flyfish-file-viewer-web-full.iife.js'
  const cadFixture = join(root, 'apps/viewer-demo/public/example/sample.dwg')
  assert.ok(statSync(cadFixture).size < 1024 * 1024, 'The offline DWG fixture must remain bounded')
  report.cadFixture = { bytes: statSync(cadFixture).size, sha256: hash(cadFixture) }
  const drawingFixture = '<mxfile><diagram name="Offline"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Complete offline" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="180" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/') {
      const script = url.searchParams.get('script') || `/full/dist/${scriptName}`
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><html><head><meta charset="utf-8"></head><body><div id="offline-document" style="width:960px;height:600px"></div><script src="${script}"></script></body></html>`)
      return
    }
    if (url.pathname === '/fixture/sample.dwg') { response.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(readFileSync(cadFixture)); return }
    const source = url.pathname.startsWith('/full/dist/') ? resolve(full, 'dist', decodeURIComponent(url.pathname.slice('/full/dist/'.length))) : resolve(target, decodeURIComponent(url.pathname.slice('/assets/'.length)))
    if (!url.pathname.startsWith('/full/dist/') && !url.pathname.startsWith('/assets/')) { response.writeHead(404).end(); return }
    if (!source.startsWith(full + sep) && !source.startsWith(target + sep)) { response.writeHead(403).end(); return }
    if (!existsSync(source) || !statSync(source).isFile()) { response.writeHead(404).end(); return }
    response.writeHead(200, { 'Content-Type': { '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.wasm': 'application/wasm', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }[extname(source)] || 'application/octet-stream' }).end(readFileSync(source))
  })
  await new Promise((accept, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', accept)
  })
  try {
    const origin = `http://127.0.0.1:${server.address().port}`
    const playwright = createRequire(join(root, 'package.json'))('playwright')
    for (const name of ['chromium', 'webkit']) {
      const browser = await playwright[name].launch({ headless: true })
      const result = { browser: name, version: browser.version(), cases: [], errors: [], failedResponses: [] }
      report.browsers.push(result)
      try {
        for (const provider of ['self-hosted', 'jsdelivr', 'unpkg']) {
          const scriptBase = provider === 'self-hosted' ? `${origin}/full/dist/` : provider === 'jsdelivr' ? `https://cdn.jsdelivr.net/npm/@file-viewer/web-full@${version}/dist/` : `https://unpkg.com/@file-viewer/web-full@${version}/dist/`
          const page = await browser.newPage()
          const requests = []
          page.on('pageerror', error => result.errors.push(error.message))
          page.on('response', response => { if (response.status() >= 400) result.failedResponses.push({url: response.url(), status: response.status()}) })
          await page.addInitScript(() => {
            window.addEventListener('error', event => {
              window.__fileViewerBootstrapError = {
                message: event.message, filename: event.filename,
                line: event.lineno, column: event.colno
              }
            })
          })
          await page.route('**/*', route => {
            const url = route.request().url()
            if (url === scriptBase + scriptName && provider !== 'self-hosted') return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: readFileSync(join(full, 'dist', scriptName)) })
            if (new URL(url).origin === origin) return route.continue()
            requests.push(url)
            return route.abort()
          })
          await page.goto(`${origin}/?script=${encodeURIComponent(scriptBase + scriptName)}`)
          await page.waitForFunction(() => Boolean(window.FlyfishFileViewerWebFull || window.__fileViewerBootstrapError))
          const bootstrapError = await page.evaluate(() => window.__fileViewerBootstrapError)
          assert.equal(bootstrapError, undefined, `Full bundle bootstrap failed: ${JSON.stringify(bootstrapError)}`)
          const documentCharset = await page.evaluate(() => document.characterSet)
          assert.equal(documentCharset, 'UTF-8', 'The source-built script must be served as UTF-8')
          const options = await page.evaluate(() => {
            const api = window.FlyfishFileViewerWebFull
            const options = api.withFullViewerOptions()
            return { base: api.getDefaultFullAssetBaseUrl(), cad: options.cad, drawing: options.drawing, word: options.word, rendererUrls: ['cad', 'drawing', 'ppt', 'docx'].map(id => api.getFullRendererScriptUrl(id)) }
          })
          assert.equal(options.base, scriptBase)
          const packBase = packageName => provider === 'self-hosted' ? scriptBase : provider === 'jsdelivr' ? `https://cdn.jsdelivr.net/npm/@file-viewer/${packageName}@${version}/viewer/` : `https://unpkg.com/@file-viewer/${packageName}@${version}/viewer/`
          assert.ok(options.cad.workerUrl.startsWith(packBase('assets-cad') + 'wasm/cad/'))
          assert.equal(options.drawing.viewerScriptUrl, packBase('assets-drawing') + 'vendor/drawio/viewer-static.min.js')
          assert.ok(options.rendererUrls.every(url => url.startsWith(scriptBase + 'renderers/')))
          const custom = await page.evaluate(base => window.FlyfishFileViewerWebFull.withFullViewerOptions({}, base), `${origin}/assets/`)
          assert.equal(custom.drawing.viewerScriptUrl, `${origin}/assets/vendor/drawio/viewer-static.min.js`)
          assert.ok(custom.cad.workerUrl.startsWith(`${origin}/assets/wasm/cad/`))
          const resolved = await page.evaluate(async options => {
            const urls = [options.cad.workerUrl, options.cad.dwfWasmUrl, options.drawing.viewerScriptUrl]
            return Promise.all(urls.map(async url => ({ url, status: (await fetch(url)).status })))
          }, { cad: custom.cad, drawing: custom.drawing })
          assert.ok(resolved.every(item => item.status === 200), 'Copied offline CAD and Draw.io assets must actually resolve')
          const documents = []
          if (provider === 'self-hosted') {
            await page.evaluate(async assetBase => {
              const api = window.FlyfishFileViewerWebFull
              const options = api.withFullViewerOptions({ locale: 'en-US', cad: { renderer: 'canvas2d', preloadDwg: false }, drawing: { preferOfficial: true } }, assetBase)
              window.__offlineFullViewer = api.mountViewer(document.getElementById('offline-document'), { options })
              const buffer = await (await fetch('/fixture/sample.dwg')).arrayBuffer()
              await window.__offlineFullViewer.load({ buffer, filename: 'sample.dwg', type: 'dwg', options })
            }, `${origin}/assets/`)
            await page.waitForFunction(() => window.__offlineFullViewer.getViewState()?.extra?.status === 'ready')
            await page.evaluate(() => new Promise(accept => requestAnimationFrame(() => requestAnimationFrame(accept))))
            const cadPixels = await page.locator('#offline-document .cad-stage canvas').first().evaluate(canvas => {
              const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
              const colors = new Set()
              for (let index = 0; index < data.length; index += 4) if (data[index + 3] > 0) colors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`)
              return { width: canvas.width, height: canvas.height, colors: colors.size }
            })
            assert.ok(cadPixels.width > 100 && cadPixels.height > 100 && cadPixels.colors > 8, 'The offline DWG must produce actual drawing pixels')
            await page.screenshot({ path: join(output, `${name}-offline-dwg.png`) })
            documents.push({ type: 'dwg', pixels: cadPixels, status: 'passed' })
            await page.evaluate(() => window.__offlineFullViewer.destroy())
            await page.evaluate(async ({ xml, assetBase }) => {
              const api = window.FlyfishFileViewerWebFull
              const options = api.withFullViewerOptions({ locale: 'en-US', drawing: { preferOfficial: true } }, assetBase)
              window.__offlineFullViewer = api.mountViewer(document.getElementById('offline-document'), { options })
              await window.__offlineFullViewer.load({ buffer: new TextEncoder().encode(xml).buffer, filename: 'offline.drawio', type: 'drawio', options })
            }, { xml: drawingFixture, assetBase: `${origin}/assets/` })
            await page.locator('#offline-document [data-drawing-rendered="official"]').waitFor({ state: 'attached' })
            assert.equal(await page.locator('#offline-document [data-drawing-rendered="official"]').count(), 1, 'The bundled official Draw.io viewer must render without a fallback')
            const frame = await (await page.locator('#offline-document iframe.drawing-mxgraph').elementHandle()).contentFrame()
            await frame.waitForFunction(() => document.querySelector('#graph svg') && document.getElementById('graph').textContent.includes('Complete offline'))
            await page.screenshot({ path: join(output, `${name}-offline-drawio.png`) })
            documents.push({ type: 'drawio', mode: 'official', label: 'Complete offline', status: 'passed' })
            await page.evaluate(() => window.__offlineFullViewer.destroy())
            assert.equal(await page.locator('#offline-document > *').count(), 0, 'The offline viewer must release its DOM on destroy')
          }
          assert.deepEqual(requests, [], 'Verification must not contact an external CDN')
          result.cases.push({ provider, documentCharset, options, offlineResources: resolved, documents })
          await page.close()
        }
        assert.deepEqual(result.errors, [])
        assert.deepEqual(result.failedResponses, [], 'All lazy renderer and offline asset requests must resolve')
        result.status = 'passed'
      } finally { await browser.close() }
    }
  } finally { await new Promise(accept => server.close(accept)) }
  report.status = 'passed'
  console.log(`Web Full packed assets passed; evidence: ${output}`)
} catch (error) {
  report.status = 'failed'
  report.error = error.stack || String(error)
  console.error(error)
  process.exitCode = 1
} finally {
  report.finishedAt = new Date().toISOString()
  writeJson(join(output, 'report.json'), report)
}
