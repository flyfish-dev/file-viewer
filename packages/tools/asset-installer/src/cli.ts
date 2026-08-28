#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { installFileViewerCapabilityAssetPack } from './index.js';

const args = process.argv.slice(2);
let packageName: string | undefined;
let targetDir: string | undefined;
let clean = false;
let confirmClean = false;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--package') packageName = args[++index];
  else if (arg === '--clean') clean = true;
  else if (arg === '--confirm') confirmClean = true;
  else if (arg === '--help' || arg === '-h') {
    process.stdout.write('file-viewer-install-asset-pack --package <installed-package> [target-directory] [--clean --confirm]\n');
    process.exit(0);
  } else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.`);
  else if (!targetDir) targetDir = arg;
  else throw new Error('Only one target directory is supported.');
}
if (!packageName) throw new Error('--package is required.');
const require = createRequire(resolve(process.cwd(), 'package.json'));
const packageJsonPath = require.resolve(`${packageName}/package.json`);
const packageJson = require(packageJsonPath) as { name: string; version: string };
const packRoot = dirname(packageJsonPath);
const config = require(resolve(packRoot, 'file-viewer.asset-pack.json')) as { receiptFilename: string };
const result = await installFileViewerCapabilityAssetPack(
  { packageName: packageJson.name, packageVersion: packageJson.version, packRoot, receiptFilename: config.receiptFilename },
  { targetDir, clean, confirmClean },
);
process.stdout.write(`[file-viewer] Installed ${packageJson.name} assets in ${result.targetDir}.\n`);
