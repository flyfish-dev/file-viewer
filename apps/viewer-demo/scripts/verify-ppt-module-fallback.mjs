import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourcePath = resolve('apps/viewer-demo/src/composables/useDemoViewerOptions.ts')
const source = await readFile(sourcePath, 'utf8')

if (/pptModuleUrl\s*:\s*pptRuntimeAssetUrl\(['"]vendor\/ppt\/index\.mjs/.test(source)) {
  throw new Error('The demo still dynamically imports vendor/ppt/index.mjs; Windows static servers may reject its MIME type.')
}
for (const asset of ['worker.mjs', 'ppt-native.wasm', 'ppt-font-cjk.otf']) {
  if (!source.includes(`pptRuntimeAssetUrl('vendor/ppt/${asset}')`)) {
    throw new Error(`Expected versioned external PPT asset ${asset}`)
  }
}
console.log('[ppt] Demo uses the bundled PPT ESM entry while retaining versioned worker/WASM/font assets.')
