import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = resolve(packageDir, 'dist/worker/sheet.worker.js')

await build({
  bundle: true,
  entryPoints: [resolve(packageDir, 'src/spreadsheet/worker/sheetjs/sheet.worker.ts')],
  format: 'esm',
  minify: true,
  outfile,
  platform: 'browser',
  target: ['es2019'],
})

const source = await readFile(outfile, 'utf8')
await writeFile(outfile, source.replace(/[ \t]+$/gm, ''))
