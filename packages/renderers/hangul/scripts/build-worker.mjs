import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workerOutput = resolve(packageDir, 'dist/hangul.worker.js')
const parserOutput = resolve(packageDir, 'dist/hangul.parser.js')
const stripTrailingWhitespace = async filename => {
  const source = await readFile(filename, 'utf8')
  await writeFile(filename, source.replace(/[ \t]+$/gm, ''))
}

await build({
  entryPoints: [resolve(packageDir, 'src/hangul.worker.ts')],
  outfile: workerOutput,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
})

await build({
  entryPoints: [resolve(packageDir, 'src/hangul.parser.ts')],
  outfile: parserOutput,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2017',
  minify: true,
  legalComments: 'eof',
})

await Promise.all([workerOutput, parserOutput].map(stripTrailingWhitespace))

console.log('[renderer-hangul] Built standalone module Worker and legacy-bundler-safe parser fallback.')
