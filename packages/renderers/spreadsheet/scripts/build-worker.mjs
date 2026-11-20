import { build as buildBundle } from 'esbuild'
import { captureBundleEvidence } from '../../../build-support/bundle-evidence.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const evidence = captureBundleEvidence(buildBundle, packageDir, 'worker')
const build = options => evidence.build(options)
const outfile = resolve(packageDir, 'dist/worker/sheet.worker.js')

await build({
  bundle: true,
  // The worker shares Core's text decoder and has no viewer UI to translate.
  conditions: ['file-viewer-custom-locales', 'module'],
  entryPoints: [resolve(packageDir, 'src/spreadsheet/worker/sheetjs/sheet.worker.ts')],
  format: 'esm',
  minify: true,
  outfile,
  platform: 'browser',
  target: ['es2019'],
})

const source = await readFile(outfile, 'utf8')
await writeFile(outfile, source.replace(/[ \t]+$/gm, ''))

await evidence.finish()
