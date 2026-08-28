import { chmod } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const output = resolve(scriptDir, 'copy-assets.mjs')
await build({
  entryPoints: [resolve(scriptDir, 'copy-assets-entry.mjs')],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
  legalComments: 'none',
})
await chmod(output, 0o755)
process.stdout.write(`[web-full] built safe copy-assets compatibility bin ${output}\n`)
