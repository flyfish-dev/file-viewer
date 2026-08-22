import assert from 'node:assert/strict'
import { readFile, readdir, rm, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const presentationPackagePath = join(root, 'packages/renderers/presentation/package.json')
const pptxEntryPath = join(root, 'packages/renderers/presentation/dist/pptx.js')
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

assert.deepEqual(pptSelection.packages, ['@file-viewer/renderer-presentation/ppt'])
assert.deepEqual(pptSelection.rendererIds, ['office-presentation-binary'])
assert.deepEqual(pptxSelection.packages, ['@file-viewer/renderer-presentation/pptx'])
assert.deepEqual(pptxSelection.rendererIds, ['office-presentation'])

const fixtureRoot = await mkdtemp(join(tmpdir(), 'file-viewer-pptx-only-'))
try {
  await writeFile(join(fixtureRoot, 'index.html'), '<script type="module" src="/src.js"></script>\n')
  await writeFile(join(fixtureRoot, 'src.js'), "console.log('PPTX-only fixture');\n")

  await build({
    root: fixtureRoot,
    logLevel: 'silent',
    plugins: [fileViewerRenderers({ formats: ['pptx'], autoPresets: false })],
    resolve: {
      alias: {
        '@file-viewer/renderer-presentation/pptx': pptxEntryPath
      }
    },
    build: {
      manifest: true,
      outDir: 'dist'
    }
  })

  const outputFiles = await readdir(join(fixtureRoot, 'dist'), {
    recursive: true
  })
  const legacyPptAssets = outputFiles.filter((file) =>
    /(?:ppt-font-cjk|ppt-native|file-viewer-presentation-ppt\b)/i.test(file)
  )
  assert.deepEqual(legacyPptAssets, [], `PPTX-only build emitted legacy PPT assets: ${legacyPptAssets.join(', ')}`)
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}

console.log('Presentation subpath and PPTX-only bundle verification passed.')
