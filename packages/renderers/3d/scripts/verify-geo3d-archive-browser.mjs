import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  browserOutput,
  rendererFile,
  engineFile,
  runtimeGraphPlugin
} from './geo3d-browser-package.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, '../../../..')
const require = createRequire(join(repositoryRoot, 'package.json'))
const { chromium, webkit } = require('playwright')
const JSZip = require('jszip')
const buildRequire = createRequire(join(repositoryRoot, 'apps/viewer-demo/package.json'))
const { build } = await import(buildRequire.resolve('vite'))
const work = join(browserOutput, 'archive-schema-source')
const site = join(browserOutput, 'archive-schema-site')
const report = { cases: [], status: 'running' }
const requests = []
await mkdir(work, { recursive: true })
await writeFile(
  join(work, 'index.html'),
  '<!doctype html><meta charset="utf-8"><script type="module" src="/main.js"></script>'
)
await writeFile(
  join(work, 'main.js'),
  `
import { prepare3tzDataset } from ${JSON.stringify(rendererFile('dist/geo3dArchive.js'))}
import { renderFileViewerGeo3d } from ${JSON.stringify(rendererFile('dist/geo3d.js'))}
import Tiles3D from ${JSON.stringify(engineFile('entities/Tiles3D.js'))}
// Retain the selected renderer in the physical module-graph proof.
window.renderer = renderFileViewerGeo3d
window.inspectArchive = async bytes => {
  let dataset, entity
  try {
    dataset = await prepare3tzDataset(new Uint8Array(bytes))
    entity = new Tiles3D({ url: dataset.rootUrl, enableFetchPlugin: false })
    const root = await (await dataset.fetchData(dataset.rootUrl)).json()
    const url = root.root.content.uri
    const loader = entity.tiles.manager.getHandler(url)
    const plugin = entity.tiles.plugins.find(item => item._loader === loader && typeof item.metadata === 'boolean')
    const model = await loader.parseAsync(await (await dataset.fetchData(url)).arrayBuffer(), new URL('.', url).href)
    return { phase: 'parsed', metadata: plugin.metadata, schemaId: model.scene.userData.structuralMetadata.schema.id }
  } catch (error) {
    return { phase: 'rejected', error: String(error) }
  } finally {
    entity?.dispose()
    dataset?.dispose()
  }
}
window.entryReady = true
`
)
await build({
  configFile: false,
  root: work,
  logLevel: 'warn',
  plugins: [runtimeGraphPlugin('archive-schema')],
  build: { outDir: site, emptyOutDir: true, target: 'es2022', minify: false }
})
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://fixture.invalid').pathname
    if (path === '/outside/schema.json') {
      requests.push(path)
      response
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ id: 'outside-schema', classes: {} }))
      return
    }
    const file = resolve(site, '.' + (path === '/' ? '/index.html' : path))
    assert.ok(file.startsWith(site + sep))
    const contentType =
      { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }[
        extname(file)
      ] || 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': contentType }).end(await readFile(file))
  } catch {
    response
      .writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' })
      .end('Missing fixture.\n')
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

function glb(json) {
  const encoded = Buffer.from(JSON.stringify(json))
  const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32)
  encoded.copy(padded)
  const bytes = Buffer.alloc(20 + padded.length)
  bytes.write('glTF')
  bytes.writeUInt32LE(2, 4)
  bytes.writeUInt32LE(bytes.length, 8)
  bytes.writeUInt32LE(padded.length, 12)
  bytes.writeUInt32LE(0x4e4f534a, 16)
  padded.copy(bytes, 20)
  return bytes
}
try {
  for (const [browserName, engine] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    const browser = await engine.launch({ headless: true })
    try {
      for (const format of ['gltf', 'glb']) {
        for (const local of [false, true]) {
          const zip = new JSZip()
          const model = {
            asset: { version: '2.0' },
            scene: 0,
            scenes: [{ nodes: [] }],
            nodes: [],
            extensionsUsed: ['EXT_structural_metadata'],
            extensions: {
              EXT_structural_metadata: {
                schemaUri: local ? 'schema.json' : origin + '/outside/schema.json'
              }
            }
          }
          zip.file(
            'tileset.json',
            JSON.stringify({
              asset: { version: '1.1' },
              root: { content: { uri: 'model.' + format } }
            })
          )
          zip.file('model.' + format, format === 'glb' ? glb(model) : JSON.stringify(model))
          if (local) zip.file('schema.json', JSON.stringify({ id: 'archive-schema', classes: {} }))
          const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
          const page = await browser.newPage()
          const row = { browser: browserName, format, local, errors: [], passed: false }
          report.cases.push(row)
          const firstRequest = requests.length
          page.on('pageerror', (error) => row.errors.push(error.message))
          try {
            await page.goto(origin)
            await page.waitForFunction(() => window.entryReady)
            row.result = await page.evaluate((bytes) => window.inspectArchive(bytes), [...bytes])
            row.externalRequests = requests.slice(firstRequest)
            assert.deepEqual(row.externalRequests, [], 'A 3TZ resource escaped its owning archive')
            if (local) {
              assert.equal(row.result.phase, 'parsed')
              assert.equal(row.result.metadata, true, 'Test the actual default metadata plugin')
              assert.equal(row.result.schemaId, 'archive-schema')
            } else {
              assert.equal(row.result.phase, 'rejected')
              assert.match(row.result.error, /3TZ external\/absolute resource/)
            }
            assert.deepEqual(row.errors, [])
            row.passed = true
          } catch (error) {
            row.failure = String(error)
          } finally {
            await page.close()
          }
        }
      }
    } finally {
      await browser.close()
    }
  }
  assert.ok(
    report.cases.every((row) => row.passed),
    JSON.stringify(report.cases, null, 2)
  )
  report.status = 'passed'
} finally {
  if (report.status !== 'passed') report.status = 'failed'
  await writeFile(
    join(browserOutput, 'archive-schema-report.json'),
    JSON.stringify(report, null, 2) + '\n'
  )
  const combinedPath = join(browserOutput, 'report.json')
  if (existsSync(combinedPath)) {
    const combined = JSON.parse(await readFile(combinedPath, 'utf8'))
    combined.archiveSchemas = report
    await writeFile(combinedPath, JSON.stringify(combined, null, 2) + '\n')
  }
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}
console.log(`Geo3D archive schema checks passed: ${report.cases.length} real browser cases`)
