import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The implementation must resolve pdf-lib from this package, which owns it.
// Keep the renderer registration external so consumers share the same registry.
await build({
  entryPoints: [resolve(packageDir, 'src/index.ts')],
  outfile: resolve(packageDir, 'dist/index.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2019',
  external: ['pdf-lib'],
  plugins: [
    {
      name: 'shared-pdf-renderer-registration',
      setup(builder) {
        builder.onResolve({ filter: /^@file-viewer\/renderer-pdf$/ }, (args) => ({
          path: args.path,
          external: true
        }))
      }
    }
  ]
})
