import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { scaffoldFileViewerQuickstart } from '../dist/index.js'

const createRoot = async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-quickstart-runtime-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

test('generated Vite project declares and enforces its Node runtime contract', async (t) => {
  const root = await createRoot(t)
  await scaffoldFileViewerQuickstart(
    root,
    {
      framework: 'web',
      profile: 'standard',
      packageManager: 'pnpm',
      packageManagerVersion: '11.0.9',
    },
    { write: true }
  )

  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(manifest.engines.node, '^20.19.0 || >=22.12.0')
  assert.equal(manifest.scripts.dev, 'node ./scripts/check-node.mjs && vite')
  assert.equal(manifest.scripts.build, 'node ./scripts/check-node.mjs && vite build')

  const guard = await readFile(join(root, 'scripts/check-node.mjs'), 'utf8')
  assert.match(guard, /File Viewer quickstart uses Vite 8/)
  assert.match(guard, /\^20\.19\.0 \|\| >=22\.12\.0/)
  assert.match(guard, /remove node_modules, and reinstall dependencies/)
})
