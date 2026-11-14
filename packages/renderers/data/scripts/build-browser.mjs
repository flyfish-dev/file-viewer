import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { writeBundleNotices } from '../../../build-support/bundle-notices.mjs'
import { writeBundleInventory } from '../../../build-support/bundle-inventory.mjs'
import { browserRuntimeOptions } from '../../../build-support/browser-runtime-options.mjs'
import { writePrebundledNoticeReceipt } from '../../../build-support/prebundled-notices.mjs'

const require = createRequire(import.meta.url)
const output = new URL('../dist/vendor/', import.meta.url)
await mkdir(output, { recursive: true })
// Resolve only the shims avsc uses, without installing Browserify's unused crypto toolchain.
const builtins = {
  buffer: require.resolve('buffer/'),
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util/'),
  zlib: require.resolve('browserify-zlib'),
  path: require.resolve('path-browserify'),
  events: require.resolve('events/'),
  assert: require.resolve('assert/'),
  string_decoder: require.resolve('string_decoder/'),
}
// avsc's documented browser entry expects streams, Buffer and zlib.
// Bundle these here, never ask downstream Webpack/Vite users for Node polyfills.
const result = await build({
  entryPoints: [require.resolve('avsc/etc/browser/avsc.js')],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2018',
  alias: {
    ...Object.fromEntries(
      ['buffer', 'stream', 'util', 'zlib', 'path', 'events', 'assert', 'string_decoder'].map(
        (name) => [name, builtins[name]]
      )
    ),
    'process/browser': require.resolve('process/browser')
  },
  inject: [fileURLToPath(new URL('browser-globals.js', import.meta.url))],
  define: { global: 'globalThis' },
  metafile: true,
  ...browserRuntimeOptions(),
  outfile: fileURLToPath(new URL('avsc.cjs', output))
})
await writeBundleNotices(result.metafile, new URL('avsc.NOTICE.txt', output))
await writeBundleInventory(Object.keys(result.metafile.inputs), fileURLToPath(new URL('../.build/avsc-inputs.json', import.meta.url)))
await writePrebundledNoticeReceipt({
  packageRoot: fileURLToPath(new URL('..', import.meta.url)),
  runtimePaths: ['dist/vendor/avsc.cjs'], noticePath: 'dist/vendor/avsc.NOTICE.txt'
})
