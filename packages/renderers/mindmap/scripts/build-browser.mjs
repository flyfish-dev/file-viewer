import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { writeBundleNotices } from '../../../build-support/bundle-notices.mjs'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const output = new URL('../dist/vendor/', import.meta.url)
await mkdir(output, { recursive: true })
const result = await build({
  stdin: {
    contents: "export { parseXmind8Xml, parseXmind2020Json } from '@ljheee/xmind-parser'",
    resolveDir: root
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2018',
  // Only browser text parsing is exposed; local filesystem/Node ZIP IO is not used.
  define: { process: 'undefined' },
  metafile: true,
  legalComments: 'eof',
  outfile: fileURLToPath(new URL('xmind.js', output))
})
await writeBundleNotices(result.metafile, new URL('xmind.NOTICE.txt', output), {
  readmeLicensePackages: ['@ljheee/xmind-parser']
})
