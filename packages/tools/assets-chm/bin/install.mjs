#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runFileViewerAssetPackCli } from '@file-viewer/asset-installer'

const outcome = await runFileViewerAssetPackCli(
  resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  process.argv.slice(2)
)
process.stdout.write(
  outcome.help
    ? outcome.text
    : `[file-viewer] Installed @file-viewer/assets-chm assets in ${outcome.result.targetDir}.\n`
)
