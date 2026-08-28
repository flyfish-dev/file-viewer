#!/usr/bin/env node
import { installFileViewerStandardAssets } from './index.js';

const args = process.argv.slice(2);
let targetDir: string | undefined;
let clean = false;
let confirmClean = false;
for (const arg of args) {
  if (arg === '--clean') clean = true;
  else if (arg === '--confirm') confirmClean = true;
  else if (arg === '--help' || arg === '-h') {
    process.stdout.write('file-viewer-assets-standard [target-directory] [--clean --confirm]\n');
    process.exit(0);
  } else if (arg.startsWith('-')) {
    throw new Error(`Unknown option ${arg}.`);
  } else if (targetDir) {
    throw new Error('Only one target directory is supported.');
  } else targetDir = arg;
}

installFileViewerStandardAssets({ targetDir, clean, confirmClean })
  .then(result => process.stdout.write(`[file-viewer] Installed standard assets in ${result.targetDir}.\n`))
  .catch(error => {
    process.stderr.write(`[file-viewer] ${(error as Error).message}\n`);
    process.exitCode = 1;
  });
