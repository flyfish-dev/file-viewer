import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { writeBundleNotices } from '../../../build-support/bundle-notices.mjs'

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
  legalComments: 'eof',
  outfile: fileURLToPath(new URL('avsc.cjs', output))
})
await writeBundleNotices(result.metafile, new URL('avsc.NOTICE.txt', output))
