import { resolve } from 'node:path'
import { buildBrowserRuntime } from '../../../build-support/build-browser-runtime.mjs'

await buildBrowserRuntime({
  packageDir: resolve(import.meta.dirname, '..'),
  entries: ['index', 'engine'],
  requiredVersions: { katex: '0.18.2', mermaid: '12.1.0' },
  readmeLicensePackages: ['fastdom']
})
