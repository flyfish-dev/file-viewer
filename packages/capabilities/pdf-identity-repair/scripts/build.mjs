import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { captureBundleEvidence } from '../../../build-support/bundle-evidence.mjs'
import { writePrebundledNoticeReceipt } from '../../../build-support/prebundled-notices.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const evidence = captureBundleEvidence(build, packageDir, 'pdf-identity-repair', {
  includeWorkspacePackages: ['@file-viewer/renderer-pdf']
})

// Keep the optional repair self-contained, but share the renderer's registration.
await evidence.build({
  entryPoints: [resolve(packageDir, 'src/index.ts')],
  outfile: resolve(packageDir, 'dist/index.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2019',
  minify: true,
  sourcemap: false,
  legalComments: 'external',
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
await evidence.finish()
await writePrebundledNoticeReceipt({
  packageRoot: packageDir, runtimePaths: ['dist/index.js'],
  noticePath: 'dist/pdf-identity-repair.THIRD_PARTY_LICENSES.txt'
})
