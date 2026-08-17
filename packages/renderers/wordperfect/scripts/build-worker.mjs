import { build } from 'esbuild'
import { copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

await build({
  entryPoints: [resolve(packageDir, 'src/wordperfect.worker.ts')],
  outfile: resolve(packageDir, 'dist/wordperfect.worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
})

await copyFile(resolve(packageDir, 'vendor/libwpd.mjs'), resolve(packageDir, 'dist/libwpd.mjs'))

console.log('[renderer-wordperfect] Built standalone module Worker and staged the libwpd module loader.')
