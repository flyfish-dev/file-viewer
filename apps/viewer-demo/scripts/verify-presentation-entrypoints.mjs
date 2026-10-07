import assert from 'node:assert/strict'
import { readFile, readdir, realpath, rm, stat, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { assertPptxOnlyBundle, presentationModuleGraph } from './presentation-bundle-boundary.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const presentationPackagePath = join(root, 'packages/renderers/presentation/package.json')
const vitePluginEntryPath = join(root, 'packages/presets/vite-plugin/dist/index.js')

const presentationPackage = JSON.parse(await readFile(presentationPackagePath, 'utf8'))
assert.equal(presentationPackage.exports['./ppt']?.import, './dist/ppt.js')
assert.equal(presentationPackage.exports['./pptx']?.import, './dist/pptx.js')

const {
  default: fileViewerRenderers,
  resolveFileViewerRendererSelection
} = await import(vitePluginEntryPath)
const pptSelection = resolveFileViewerRendererSelection({ formats: ['ppt'] })
const pptxSelection = resolveFileViewerRendererSelection({ formats: ['pptx'] })

assert.deepEqual(pptSelection.packages, ['@file-viewer/renderer-ppt'])
assert.deepEqual(pptSelection.rendererIds, ['office-presentation-binary'])
assert.deepEqual(pptxSelection.packages, ['@file-viewer/renderer-pptx'])
assert.deepEqual(pptxSelection.rendererIds, ['office-presentation'])

const fixtureRoot = await realpath(
  await mkdtemp(join(await realpath(tmpdir()), 'file-viewer-pptx-only-'))
)
try {
  await writeFile(join(fixtureRoot, 'index.html'), '<script type="module" src="/src.js"></script>\n')
  await writeFile(join(fixtureRoot, 'src.js'), "console.log('PPTX-only fixture');\n")

  await build({
    root: fixtureRoot,
    logLevel: 'silent',
    plugins: [fileViewerRenderers({ formats: ['pptx'], autoPresets: false }), presentationModuleGraph()],
    worker: { plugins: () => [presentationModuleGraph('pptx-worker-module-graph.json')] },
    build: {
      manifest: true,
      outDir: 'dist'
    }
  })

  const outputFiles = await readdir(join(fixtureRoot, 'dist'), {
    recursive: true
  })
  const outputRecords = []
  for (const file of outputFiles) {
    const path = join(fixtureRoot, 'dist', file)
    const info = await stat(path)
    if (!info.isFile()) continue
    const body = await readFile(path)
    outputRecords.push({ file, body })
  }
  assertPptxOnlyBundle(outputRecords,
    await readFile(join(root, 'packages/renderers/pptx/dist/worker/pptx.worker.js')))
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}

console.log('Presentation subpath and PPTX-only bundle verification passed.')
