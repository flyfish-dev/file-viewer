import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const work = await realpath(await mkdtemp(join(tmpdir(), 'file-viewer-257-browser-')))
const output = resolve(sourceRoot, 'output/vite-copy-github-257')
const require = createRequire(import.meta.url)
const paths = (process.env.PATH || '').split(delimiter).filter(p => p.endsWith(`${sep}node_modules${sep}.bin`)).map(p => resolve(p, '..'))
const playwright = await import(pathToFileURL(require.resolve('playwright', { paths: [sourceRoot, ...paths] })).href)
const { chromium } = playwright.default || playwright
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}
async function file(path, value) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, value) }
const json = (path, value) => file(path, JSON.stringify(value, null, 2))
const reports = []
await mkdir(output, { recursive: true })
await mkdir(join(work, 'pack'))
run('pnpm', ['pack', '--pack-destination', join(work, 'pack')], packageDir)
const tarball = join(work, 'pack', (await readdir(join(work, 'pack'))).find(name => name.endsWith('.tgz')))
const browser = await chromium.launch({ headless: true })
async function checkPage(origin, expectedBase, workerPath, label) {
  const page = await browser.newPage()
  const errors = []
  const workers = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.url().includes('pptx.worker.js')) workers.push({ url: response.url(), status: response.status(), mime: response.headers()['content-type'] })
  })
  try {
    await page.goto(origin)
    const last = page.locator('.flyfish-pptx-slide-slot[data-slide-number="20"]')
    await last.waitFor({ state: 'attached', timeout: 90000 })
    assert.equal(await page.locator('.flyfish-pptx-slide-slot').count(), 20)
    await last.scrollIntoViewIfNeeded()
    await last.locator('.slide').waitFor({ timeout: 45000 })
    assert.ok((await last.innerText()).trim().length > 0, 'The last slide must contain rendered text')
    const errorElements = page.locator('.pptx-error:visible, .flyfish-pptx-slide-error:visible')
    assert.deepEqual(await errorElements.allTextContents(), [], 'A visible slide error must not count as rendered content')
    const response = await page.request.get(new URL(expectedBase + 'vendor/pptx/pptx.worker.js', origin).href)
    const localHash = sha256(await readFile(workerPath))
    assert.equal(sha256(await response.body()), localHash, 'HTTP Worker must match the actual copied package bytes')
    assert.match(response.headers()['content-type'], /javascript/)
    assert.ok(workers.length > 0, 'The renderer must start its real Worker, not just probe a URL')
    for (const worker of workers) {
      assert.equal(new URL(worker.url).pathname, expectedBase + 'vendor/pptx/pptx.worker.js')
      assert.equal(worker.status, 200)
      assert.match(worker.mime, /javascript/)
    }
    assert.deepEqual(errors, [])
    const report = { label, origin, slides: 20, lastSlideRendered: true, workers, workerSha256: localHash, errors, passed: true }
    reports.push(report)
    await page.screenshot({ path: join(output, `${label}.png`) })
    console.log(`[issue-257] ${label}: 20 slides, last slide rendered, actual Worker MIME/path/hash passed`)
  } finally { await page.close() }
}
try {
  for (const major of [6, 8]) {
    const app = join(work, `vite-${major}`)
    // The published full baseline is deliberate: only the plugin under test is
    // replaced. No monorepo resolver or renderer override can hide path errors.
    await json(join(app, 'package.json'), {
      name: `issue-257-vite-${major}`, private: true, type: 'module',
      dependencies: { '@file-viewer/vue3-full': '3.0.2', '@file-viewer/vite-plugin': `file:${tarball}`, vue: '3.5.42', vite: major === 6 ? '6.4.3' : '8.2.2' }
    })
    await json(join(app, 'preview/package.json'), { name: 'nested-preview', private: true, type: 'module' })
    await file(join(app, 'preview/index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div><script type="module" src="./main.js"></script></body></html>')
    await file(join(app, 'preview/main.js'), `import { createApp, h } from 'vue';
import { FileViewer } from '@file-viewer/vue3-full';
createApp({ render: () => h(FileViewer, { url: import.meta.env.BASE_URL + 'sample.pptx', style: 'height:720px' }) }).mount('#app');`)
    await mkdir(join(app, 'preview/static'), { recursive: true })
    await copyFile(join(sourceRoot, 'apps/viewer-demo/public/example/ppt.pptx'), join(app, 'preview/static/sample.pptx'))
    await writeFile(join(output, `vite-${major}-install.log`), run('pnpm', ['install', '--ignore-scripts', '--registry=https://registry.npmjs.org'], app))
    const vite = await import(pathToFileURL(createRequire(join(app, 'package.json')).resolve('vite')).href)
    const plugin = await import(pathToFileURL(createRequire(join(app, 'package.json')).resolve('@file-viewer/vite-plugin')).href)
    const previousCwd = process.cwd()
    process.chdir(app)
    try {
      for (const [id, baseDir] of [['default', undefined], ['explicit', 'assets/viewer']]) {
        const expectedBase = '/tenant/app/' + (baseDir || 'file-viewer') + '/'
        const config = () => ({
          configFile: false, root: join(app, 'preview'), base: '/tenant/app/', publicDir: 'static', logLevel: 'warn',
          plugins: [plugin.fileViewerRenderers({ copyAssets: baseDir ? { baseDir } : true })],
          build: { outDir: `build-${id}` }, server: { host: '127.0.0.1', port: 0 }
        })
        const server = await vite.createServer(config())
        try {
          await server.listen()
          const origin = `http://127.0.0.1:${server.httpServer.address().port}/tenant/app/`
          await checkPage(origin, expectedBase, join(app, 'preview/static', baseDir || 'file-viewer', 'vendor/pptx/pptx.worker.js'), `vite-${major}-${id}-dev`)
        } finally { await server.close() }
        // One production build per Vite major covers the default contract;
        // explicit output roots are additionally covered by the pure resolver gate.
        if (baseDir) continue
        await vite.build(config())
        const preview = await vite.preview({ ...config(), preview: { host: '127.0.0.1', port: 0 } })
        try {
          await checkPage(`http://127.0.0.1:${preview.httpServer.address().port}/tenant/app/`, expectedBase,
            join(app, 'preview/build-default/file-viewer/vendor/pptx/pptx.worker.js'), `vite-${major}-default-build`)
        } finally { preview.httpServer.closeAllConnections(); await new Promise(resolve => preview.httpServer.close(resolve)) }
      }
    } finally { process.chdir(previousCwd) }
  }
} finally {
  await browser.close()
  await writeFile(join(output, 'report.json'), JSON.stringify({ pluginSha256: sha256(await readFile(tarball)), cases: reports }, null, 2))
  if (process.env.VITE_COPY_KEEP === '1') console.log(`[issue-257] kept ${work}`)
  else await rm(work, { recursive: true, force: true })
}
