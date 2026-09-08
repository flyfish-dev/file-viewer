import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(demoDir, '../..')
const legacySourceDir = resolve(repoDir, 'packages/components/web/viewer')
const stagedSourceDir = resolve(repoDir, 'packages/tools/copy-assets/viewer')
const sourceDir = existsSync(resolve(legacySourceDir, 'flyfish-viewer-assets.json'))
  ? legacySourceDir
  : stagedSourceDir
const targetDir = resolve(demoDir, 'public/file-viewer')
const helperSourceDir = resolve(repoDir, 'packages/components/web/dist')
const helperTargetDir = targetDir
const helperFiles = ['flyfish-file-viewer-web.iife.js', 'flyfish-file-viewer-web.amd.js']
const fullHelperSourceDir = resolve(repoDir, 'packages/components/web-full/dist')
const fullHelperTargetDir = targetDir
const fullHelperFiles = ['flyfish-file-viewer-web-full.iife.js', 'flyfish-file-viewer-web-full.amd.js']
const legacyAssetRoots = [
  resolve(demoDir, 'public/vendor/file-viewer'),
  resolve(demoDir, 'public/vendor/file-viewer-web'),
  resolve(demoDir, 'public/vendor/file-viewer-web-full')
]
const exampleSourceDir = resolve(repoDir, 'apps/viewer-demo/public/example')
const exampleTargetDir = resolve(demoDir, 'public/example')

if (!existsSync(resolve(sourceDir, 'flyfish-viewer-assets.json'))) {
  throw new Error('缺少已 stage 的 flyfish-viewer-assets.json，请先运行 pnpm build:tools')
}

const removeMacMetadata = async dir => {
  const entries = await readdir(dir, { withFileTypes: true })
  await Promise.all(entries.map(entry => {
    const path = resolve(dir, entry.name)
    if (entry.name === '.DS_Store') {
      return rm(path, { force: true })
    }
    if (entry.isDirectory()) {
      return removeMacMetadata(path)
    }
    return undefined
  }))
}

await Promise.all(legacyAssetRoots.map(path => rm(path, { force: true, recursive: true })))
await rm(targetDir, { force: true, recursive: true })
await mkdir(targetDir, { recursive: true })
await cp(sourceDir, targetDir, { recursive: true })
await removeMacMetadata(targetDir)
console.log(`[file-viewer-demo] viewer assets copied to ${targetDir}`)

// Older component demos copied the same viewer tree to /vendor, /wasm,
// /vendor/file-viewer and inside web-full. Remove those stale roots so the
// static site contains one authoritative runtime payload at /file-viewer/.
for (const assetRoot of ['vendor', 'wasm']) {
  const sourceAssetRoot = resolve(sourceDir, assetRoot)
  if (!existsSync(sourceAssetRoot)) {
    continue
  }
  const entries = await readdir(sourceAssetRoot, { withFileTypes: true })
  const legacyRoot = resolve(demoDir, 'public', assetRoot)
  await Promise.all(entries.map(entry =>
    rm(resolve(legacyRoot, entry.name), { force: true, recursive: true })
  ))
  // Vite preserves empty directories from public/. Remove the legacy root as
  // well so a clean component demo cannot recreate misleading /vendor or
  // /wasm paths next to the canonical /file-viewer tree.
  await rm(legacyRoot, { force: true, recursive: true })
}

await mkdir(helperTargetDir, { recursive: true })
for (const helperFile of helperFiles) {
  const sourceFile = resolve(helperSourceDir, helperFile)
  if (!existsSync(sourceFile)) {
    throw new Error(`缺少 ${sourceFile}，请先运行 pnpm --filter @file-viewer/web build`)
  }
  await cp(sourceFile, resolve(helperTargetDir, helperFile))
}
console.log(`[file-viewer-demo] web helper assets copied to ${helperTargetDir}`)

if (!existsSync(resolve(fullHelperSourceDir, 'flyfish-file-viewer-web-full.iife.js'))) {
  throw new Error(`缺少 ${fullHelperSourceDir}，请先运行 pnpm --filter @file-viewer/web-full build`)
}
await mkdir(fullHelperTargetDir, { recursive: true })
for (const helperFile of fullHelperFiles) {
  await cp(resolve(fullHelperSourceDir, helperFile), resolve(fullHelperTargetDir, helperFile))
}
await rm(resolve(fullHelperTargetDir, 'renderers'), { force: true, recursive: true })
await cp(
  resolve(fullHelperSourceDir, 'renderers'),
  resolve(fullHelperTargetDir, 'renderers'),
  { recursive: true }
)
await removeMacMetadata(fullHelperTargetDir)
console.log(`[file-viewer-demo] web full helper and renderer bundles copied to ${fullHelperTargetDir}`)

const requireJsDir = dirname(createRequire(import.meta.url).resolve('requirejs/package.json'))
const requireJsTarget = resolve(demoDir, 'public/requirejs')
await mkdir(requireJsTarget, { recursive: true })
await cp(resolve(requireJsDir, 'require.js'), resolve(requireJsTarget, 'require.js'))
// The npm package keeps only a license URL in its header. Retain the full
// upstream 2.3.7 license alongside the locally deployed loader.
await cp(resolve(demoDir, 'licenses/requirejs-2.3.7.txt'), resolve(requireJsTarget, 'LICENSE'))

await mkdir(exampleTargetDir, { recursive: true })
await cp(resolve(exampleSourceDir, 'word.docx'), resolve(exampleTargetDir, 'word.docx'))
for (const name of ['pdf.pdf', 'ppt.pptx', 'word-wps-contract.doc']) {
  await cp(resolve(exampleSourceDir, name), resolve(exampleTargetDir, name))
}
await cp(resolve(exampleSourceDir, 'excel.xlsx'), resolve(exampleTargetDir, 'excel.xlsx'))
await cp(resolve(exampleSourceDir, 'office-demo.ppt'), resolve(exampleTargetDir, 'office-demo.ppt'))
await cp(resolve(exampleSourceDir, 'pic.png'), resolve(exampleTargetDir, 'pic.png'))
await cp(resolve(exampleSourceDir, 'en/markdown.md'), resolve(exampleTargetDir, 'markdown.md'))
console.log(`[file-viewer-demo] pdf/doc/docx/xlsx/ppt/pptx/png/markdown examples copied to ${exampleTargetDir}`)
