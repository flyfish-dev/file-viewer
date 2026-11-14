import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { writeBundleNotices } from '../../../build-support/bundle-notices.mjs'
import { writeBundleInventory } from '../../../build-support/bundle-inventory.mjs'
import { browserRuntimeOptions } from '../../../build-support/browser-runtime-options.mjs'
import { writePrebundledNoticeReceipt } from '../../../build-support/prebundled-notices.mjs'

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
  ...browserRuntimeOptions(),
  outfile: fileURLToPath(new URL('xmind.js', output))
})
await writeBundleNotices(result.metafile, new URL('xmind.NOTICE.txt', output), {
  readmeLicensePackages: ['@ljheee/xmind-parser']
})
await writeBundleInventory(Object.keys(result.metafile.inputs), fileURLToPath(new URL('../.build/xmind-inputs.json', import.meta.url)))
await writePrebundledNoticeReceipt({
  packageRoot: root, runtimePaths: ['dist/vendor/xmind.js'], noticePath: 'dist/vendor/xmind.NOTICE.txt'
})
