import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  copyFileViewerAssets,
  parseCopyAssetsCliArguments
} from '../../../tools/copy-assets/src/index.ts'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
const help = `file-viewer-copy-assets ${packageJson.version}

Copy File Viewer Worker, WASM, font, and vendor assets into a self-hosted web project.

Usage:
  file-viewer-copy-assets [target-directory] [--renderers <csv>] [--clean --confirm]

Options:
  --renderers <csv> Copy only assets for the selected renderer ids
  --clean           Replace the dedicated target directory
  --confirm         Required together with --clean
  --no-clean        Merge transactionally (the default)
  --json            Emit one machine-readable JSON object
  --help, -h        Show this help without writing files
  --version, -v     Show the package version without writing files

Environment:
  FILE_VIEWER_PUBLIC_DIR      Override the default target directory
  FILE_VIEWER_SKIP_ASSET_COPY Skip copying when set to 1 or true
  INIT_CWD                    Host project root used for the default target
`

try {
  const parsed = parseCopyAssetsCliArguments(process.argv.slice(2))
  if (parsed.mode === 'help') {
    process.stdout.write(`${help}\n`)
  } else if (parsed.mode === 'version') {
    process.stdout.write(`${packageJson.version}\n`)
  } else if (process.env.FILE_VIEWER_SKIP_ASSET_COPY !== '1' && process.env.FILE_VIEWER_SKIP_ASSET_COPY !== 'true') {
    const result = await copyFileViewerAssets({
      ...parsed,
      sourceDir: resolve(packageDir, 'dist'),
      packageVersion: packageJson.version,
    })
    if (parsed.json) {
      process.stdout.write(`${JSON.stringify({ ...result, mode: 'copy' })}\n`)
    } else {
      process.stdout.write(`[file-viewer-copy-assets] copied assets to ${result.targetDir}\n`)
      process.stdout.write(`[file-viewer-copy-assets] wrote manifest ${result.assetManifestPath}\n`)
    }
  } else if (parsed.json) {
    process.stdout.write(`${JSON.stringify({ mode: 'skipped', reason: 'FILE_VIEWER_SKIP_ASSET_COPY' })}\n`)
  }
} catch (error) {
  process.stderr.write(`[file-viewer-copy-assets] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
