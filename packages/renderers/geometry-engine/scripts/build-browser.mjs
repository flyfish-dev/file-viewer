import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { writeBundleNotices } from '../../../build-support/bundle-notices.mjs'

const require = createRequire(import.meta.url)
const output = new URL('../dist/vendor/', import.meta.url)
const entry = require.resolve('occt-import-js')
await mkdir(output, { recursive: true })
// Seal the Emscripten Node-only path resolver inside its browser distribution.
const result = await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2018',
  define: { process: 'undefined' },
  alias: { path: require.resolve('path-browserify') },
  metafile: true,
  legalComments: 'eof',
  outfile: fileURLToPath(new URL('occt.cjs', output))
})
await writeBundleNotices(result.metafile, new URL('occt.NOTICE.txt', output))
for (const name of ['license.occt.txt', 'license.occt-import-js.txt']) {
  await writeFile(new URL(name, output), await readFile(join(dirname(entry), name)))
}
