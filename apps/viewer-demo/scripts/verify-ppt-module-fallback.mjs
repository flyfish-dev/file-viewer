import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const sourcePath = join(root, 'apps/viewer-demo/src/composables/useDemoViewerOptions.ts')
const source = await readFile(sourcePath, 'utf8')

if (/pptModuleUrl\s*:\s*pptRuntimeAssetUrl\(['"]vendor\/ppt\/index\.mjs/.test(source)) {
  throw new Error('The Demo still natively imports vendor/ppt/index.mjs, so a generic .mjs MIME type can reproduce GitHub #179.')
}
for (const asset of ['worker.mjs', 'ppt-native.wasm', 'ppt-font-cjk.otf']) {
  if (!source.includes(`pptRuntimeAssetUrl('vendor/ppt/${asset}')`)) {
    throw new Error(`Expected the versioned external PPT asset ${asset}.`)
  }
}
if (!/\.\.\.runtime\.presentation/.test(source)) {
  throw new Error('Explicit presentation runtime overrides must remain available to integrators.')
}

const distRoot = join(root, 'apps/viewer-demo/dist')
if (existsSync(distRoot)) {
  const files = []
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (['.js', '.mjs'].includes(extname(path))) files.push(path)
    }
  }
  await visit(distRoot)
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    if (/vendor\/ppt\/index\.mjs\?file-viewer-ppt=/.test(content)) {
      throw new Error(`Built Demo chunk still imports the MIME-sensitive PPT module URL: ${file}`)
    }
  }
}

console.log('[issue-179] Demo bundles the PPT ESM entry and keeps only Worker/WASM/font URLs external.')
