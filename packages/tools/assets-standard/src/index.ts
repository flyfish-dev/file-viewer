import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installFileViewerCapabilityAssetPack,
  verifyFileViewerCapabilityAssetReceipt,
  type CapabilityAssetReceipt,
  type CapabilityAssetReceiptFile,
} from '@file-viewer/asset-installer';

export interface InstallStandardAssetsOptions {
  targetDir?: string;
  /** Transactional merge is the default. Full removal requires clean + confirmClean. */
  clean?: boolean;
  confirmClean?: boolean;
}

export type StandardAssetReceiptFile = CapabilityAssetReceiptFile;
export type StandardAssetReceipt = CapabilityAssetReceipt & {
  packageName: '@file-viewer/assets-standard';
  profile: 'standard';
  profileManifestSha256: string;
};

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const receiptFilename = 'file-viewer-assets-standard.receipt.json';
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8')) as { version: string };

export const installFileViewerStandardAssets = async (options: InstallStandardAssetsOptions = {}) => {
  const result = await installFileViewerCapabilityAssetPack({
    packageName: '@file-viewer/assets-standard',
    packageVersion: packageJson.version,
    packRoot: packageDir,
    receiptFilename,
    manifestFilename: 'flyfish-viewer-assets.json',
    profile: 'standard',
  }, options);
  return { ...result, rendererIds: result.copyGroups };
};

export const verifyFileViewerStandardAssetReceipt = async (targetDir: string) =>
  verifyFileViewerCapabilityAssetReceipt(targetDir, receiptFilename);
