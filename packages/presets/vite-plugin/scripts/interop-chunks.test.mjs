import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { fileViewerRenderers } from '../dist/index.js'

const pako = '/app/node_modules/pako/lib/utils/common.js'
const helper = '\0commonjsHelpers.js'
const codemirror = '/app/node_modules/@codemirror/state/dist/index.js'
const unrelated = '/app/node_modules/other/index.js'

test('an isolated design asset copy updates notices and rejects a missing owner notice', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-design-assets-'))
  const previousCwd = process.cwd()
  const previousWarn = console.warn
  try {
    const owner = join(root, 'node_modules/@file-viewer/renderer-design')
    await mkdir(owner, { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(
      join(owner, 'package.json'),
      JSON.stringify({
        name: '@file-viewer/renderer-design',
        version: '1.0.0',
        main: 'index.js'
      })
    )
    await writeFile(join(owner, 'index.js'), 'export {}')
    const source = join(owner, 'THIRD_PARTY_NOTICES.md')
    await writeFile(source, 'Exact current owner notices\n')
    const destination = join(root, 'dist/vendor/design/THIRD_PARTY_NOTICES.md')
    await mkdir(join(root, 'dist/vendor/design'), { recursive: true })
    await writeFile(destination, 'Stale previous notices\n')
    const isolatedPlugin = join(root, 'plugin.mjs')
    await copyFile(new URL('../dist/index.js', import.meta.url), isolatedPlugin)
    process.chdir(root)
    console.warn = () => undefined
    const { fileViewerRenderers: isolatedRenderers } = await import(
      pathToFileURL(isolatedPlugin).href
    )
    const plugin = isolatedRenderers({
      formats: ['idml'],
      preset: false,
      scan: false,
      copyAssets: { mode: 'build', baseDir: '' }
    })
    plugin.configResolved({
      root,
      publicDir: join(root, 'public'),
      base: '/',
      build: { outDir: 'dist' }
    })
    await plugin.closeBundle()
    assert.deepEqual(await readFile(destination), await readFile(source))
    const receipt = JSON.parse(
      await readFile(join(root, 'dist/flyfish-viewer-assets.json'), 'utf8')
    )
    const notices = receipt.assets.filter((asset) => asset.id.endsWith('-third-party-notices'))
    assert.equal(notices.length, 10)
    assert.ok(notices.every((asset) => asset.copied && asset.required))
    await rm(source)
    await assert.rejects(plugin.closeBundle(), /third-party-notices/)
  } finally {
    process.chdir(previousCwd)
    console.warn = previousWarn
    await rm(root, { recursive: true, force: true })
  }
})

async function configuration(major, options, config = {}) {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-interop-'))
  try {
    await mkdir(join(root, 'node_modules/vite'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{}')
    await writeFile(
      join(root, 'node_modules/vite/package.json'),
      JSON.stringify({ name: 'vite', version: `${major}.0.0` })
    )
    const plugin = fileViewerRenderers({ formats: ['text'], copyAssets: false, ...options })
    return plugin.config({ root, ...config })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('default Rollup groups keep Pako and shared helpers out of application chunks', async () => {
  const config = await configuration(7)
  const chunks = config.build.rollupOptions.output.manualChunks
  assert.equal(chunks(pako), 'vendor-commonjs')
  assert.equal(chunks(helper), 'vendor-commonjs')
  assert.equal(chunks(codemirror), 'vendor-codemirror')
  assert.equal(chunks(unrelated), undefined)
})

test('host manualChunks retain unrelated groups and explicit opt-out', async () => {
  const host = (id) => (id.includes('/node_modules/') ? 'host-vendor' : undefined)
  const input = { build: { rollupOptions: { output: { manualChunks: host } } } }
  const fixed = await configuration(7, {}, input)
  const chunks = fixed.build.rollupOptions.output.manualChunks
  assert.equal(chunks(pako), 'vendor-commonjs')
  assert.equal(chunks(helper), 'vendor-commonjs')
  assert.equal(chunks(unrelated), 'host-vendor')
  const disabled = await configuration(7, { stabilizeInteropChunks: false }, input)
  assert.equal(disabled.build, undefined)
  assert.equal(host(pako), 'host-vendor')
})

test('Rolldown retains the same CommonJS ownership and explicit opt-out', async () => {
  const config = await configuration(8)
  const groups = config.build.rolldownOptions.output.codeSplitting.groups
  const common = groups.find((group) => group.name === 'vendor-commonjs')
  assert.ok(common)
  assert.equal(common.test(pako), true)
  assert.equal(common.test(helper), true)
  assert.equal(common.test(unrelated), false)
  const disabled = await configuration(8, { stabilizeInteropChunks: false })
  assert.ok(
    !disabled.build.rolldownOptions.output.codeSplitting.groups.some(
      (group) => group.name === 'vendor-commonjs'
    )
  )
})
