import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { copyFile, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRuntime = [
  ['libwpd.mjs', 'be29b0bac887007ca9adc012c3122bb84964de2dd11d9500e8e9b03feb8939f2'],
  ['libwpd.wasm', '51db45b3bec05b72b2f6ff82c5ed3e715916e61a7a2f153df0644e10d75e6b8c'],
]

for (const [filename, expectedHash] of vendoredRuntime) {
  const bytes = await readFile(resolve(packageDir, 'vendor', filename))
  const actualHash = createHash('sha256').update(bytes).digest('hex')
  if (actualHash !== expectedHash) {
    throw new Error(`Vendored ${filename} checksum mismatch: ${actualHash}`)
  }
}

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

await Promise.all([
  ...vendoredRuntime.map(([filename]) => (
    copyFile(resolve(packageDir, 'vendor', filename), resolve(packageDir, 'dist', filename))
  )),
])

console.log('[renderer-wordperfect] Built standalone module Worker and staged the libwpd module/WASM runtime.')
