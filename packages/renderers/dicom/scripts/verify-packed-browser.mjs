import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { pnpmInvocation } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const output = resolve(
  root,
  'output/dicom-packed-browser',
  new Date().toISOString().replaceAll(':', '-')
)
const packs = join(output, 'packs')
// Keep the consumer outside the repository so ancestor node_modules cannot
// supply missing dependencies and turn the regression into a false pass.
const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-dicom-packed-')))
console.log(`Standalone DICOM consumer: ${consumer}`)
mkdirSync(packs, { recursive: true })
mkdirSync(join(consumer, 'public'), { recursive: true })
const pnpm = pnpmInvocation()
const run = (name, command, args, cwd) => {
  const log = join(output, `${name}.log`)
  try {
    writeFileSync(log, execFileSync(command, args, { cwd, encoding: 'utf8', env: process.env }))
  } catch (error) {
    writeFileSync(log, `${error.stdout || ''}\n${error.stderr || ''}`)
    throw new Error(`${name} failed; inspect ${log}`, { cause: error })
  }
}
for (const name of ['core', 'renderer-dicom']) {
  run(
    `pack-${name}`,
    pnpm.command,
    [...pnpm.args, '--filter', `@file-viewer/${name}`, 'pack', '--pack-destination', packs],
    root
  )
}
const coreVersion = JSON.parse(
  readFileSync(join(root, 'packages/core/package.json'), 'utf8')
).version
const dicomVersion = JSON.parse(
  readFileSync(join(root, 'packages/renderers/dicom/package.json'), 'utf8')
).version
const coreTar = join(packs, `file-viewer-core-${coreVersion}.tgz`)
const dicomTar = join(packs, `file-viewer-renderer-dicom-${dicomVersion}.tgz`)
const manifest = {
  name: 'file-viewer-dicom-packed-browser-regression',
  private: true,
  type: 'module',
  dependencies: {
    '@file-viewer/core': `file:${coreTar}`,
    '@file-viewer/renderer-dicom': `file:${dicomTar}`
  },
  overrides: {
    // The source core is not published yet. This maps only that internal package;
    // the following third-party policies are the documented application policy.
    '@file-viewer/core': '$@file-viewer/core',
    dcmjs: { 'adm-zip': '0.6.1' },
    '@cornerstonejs/dicom-image-loader': { uuid: '11.1.1' },
    '@kitware/vtk.js': { fflate: '0.7.5' }
  }
}
writeFileSync(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(join(consumer, '.npmrc'), 'engine-strict=true\nregistry=https://registry.npmjs.org\n')
run(
  'cold-install',
  'npm',
  ['install', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'],
  consumer
)
run('official-audit', 'npm', ['audit', '--json', '--registry=https://registry.npmjs.org'], consumer)
const audit = JSON.parse(readFileSync(join(output, 'official-audit.log'), 'utf8'))
assert.equal(audit.metadata.vulnerabilities.total, 0)
const fixture = join(root, 'apps/viewer-demo/public/example/ct-small.dcm')
copyFileSync(fixture, join(consumer, 'public/ct-small.dcm'))
writeFileSync(
  join(consumer, 'index.html'),
  '<!doctype html><html><body><div id="viewer" style="width:480px;height:560px"></div><script type="module" src="/main.js"></script></body></html>'
)
writeFileSync(
  join(consumer, 'main.js'),
  `
import { renderFileViewerDicom } from '@file-viewer/renderer-dicom'
const target = document.getElementById('viewer')
let instance
window.dicomPacked = {
  async render() {
    const buffer = await (await fetch('/ct-small.dcm')).arrayBuffer()
    instance = await renderFileViewerDicom(buffer, target, 'dcm', {
      filename: 'ct-small.dcm', options: { locale: 'en-US' }
    })
  },
  pixels() {
    const source = target.querySelector('canvas')
    if (!source || !source.width || !source.height) return null
    const probe = document.createElement('canvas')
    probe.width = source.width
    probe.height = source.height
    const context = probe.getContext('2d')
    context.drawImage(source, 0, 0)
    const values = context.getImageData(0, 0, probe.width, probe.height).data
    let maximum = 0, bright = 0
    for (let index = 0; index < values.length; index += 4) {
      maximum = Math.max(maximum, values[index], values[index + 1], values[index + 2])
      if (values[index] > 16) bright++
    }
    return { width: source.width, height: source.height, maximum, brightRatio: bright / (values.length / 4) }
  },
  async destroy() {
    await instance.destroy()
    return !target.querySelector('.dicom-viewer')
  }
}
`
)
const viteRequire = createRequire(join(root, 'apps/viewer-demo/package.json'))
const { build } = await import(pathToFileURL(viteRequire.resolve('vite')).href)
const dist = join(consumer, 'dist')
// No workspace aliases or manually added events dependency: resolution must
// come from the actual installed renderer tarball and its declared closure.
await build({ root: consumer, logLevel: 'warn', build: { outDir: dist, target: 'es2020' } })
const mime = {
  '.js': 'application/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.wasm': 'application/wasm'
}
const server = createServer((request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    const path = resolve(
      dist,
      '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
    )
    if (!path.startsWith(dist + sep) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' })
    response.end(readFileSync(path))
  } catch {
    response.writeHead(400).end()
  }
})
await new Promise((accept, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', accept)
})
const playwright = createRequire(join(root, 'package.json'))('playwright')
const results = []
try {
  for (const name of ['chromium', 'webkit']) {
    const browser = await playwright[name].launch({ headless: true })
    try {
      const page = await browser.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`http://127.0.0.1:${server.address().port}`)
      await page.waitForFunction(() => Boolean(window.dicomPacked))
      await page.evaluate(() => window.dicomPacked.render())
      await page.waitForFunction(() => {
        const pixels = window.dicomPacked.pixels()
        return pixels?.maximum > 64 && pixels.brightRatio > 0.01
      })
      const pixels = await page.evaluate(() => window.dicomPacked.pixels())
      await page.screenshot({ path: join(output, `${name}.png`) })
      assert.equal(await page.evaluate(() => window.dicomPacked.destroy()), true)
      assert.deepEqual(errors, [])
      results.push({ browser: name, pixels, cleanup: 'passed', errors })
    } finally {
      await browser.close()
    }
  }
} finally {
  await new Promise((accept) => server.close(accept))
}
const report = {
  node: process.version,
  fixtureSha256: createHash('sha256').update(readFileSync(fixture)).digest('hex'),
  tarballs: Object.fromEntries(
    [coreTar, dicomTar].map((path) => [
      path,
      createHash('sha256').update(readFileSync(path)).digest('hex')
    ])
  ),
  auditVulnerabilities: audit.metadata.vulnerabilities,
  consumerManifest: manifest,
  results
}
writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
for (const name of ['package.json', 'package-lock.json', 'index.html', 'main.js']) {
  copyFileSync(join(consumer, name), join(output, name))
}
rmSync(consumer, { recursive: true, force: true })
console.log(
  `Packed DICOM Chromium/WebKit CT pixels and cleanup passed; ${join(output, 'report.json')}`
)
