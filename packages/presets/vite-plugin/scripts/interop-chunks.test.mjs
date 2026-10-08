import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileViewerRenderers } from '../dist/index.js'

const pako = '/app/node_modules/pako/lib/utils/common.js'
const helper = '\0commonjsHelpers.js'
const codemirror = '/app/node_modules/@codemirror/state/dist/index.js'
const unrelated = '/app/node_modules/other/index.js'

async function configuration(major, options, config = {}) {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-interop-'))
  try {
    await mkdir(join(root, 'node_modules/vite'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{}')
    await writeFile(join(root, 'node_modules/vite/package.json'), JSON.stringify({ name: 'vite', version: `${major}.0.0` }))
    const plugin = fileViewerRenderers({ formats: ['text'], copyAssets: false, ...options })
    return plugin.config({ root, ...config })
  } finally { await rm(root, { recursive: true, force: true }) }
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
  const host = (id) => id.includes('/node_modules/') ? 'host-vendor' : undefined
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
  assert.ok(!disabled.build.rolldownOptions.output.codeSplitting.groups.some((group) => group.name === 'vendor-commonjs'))
})
