import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PackageManager } from './types.js';
import { readDeclaredPackageManagerVersion } from './project-adapters.js';

export type YarnGeneration = 'classic' | 'berry' | 'unknown';

export interface FileViewerCarrierCommand {
  command: string;
  args: string[];
  compatibilityMode: 'native' | 'npm-exec-for-yarn-classic';
}

export function detectYarnGeneration(projectRoot: string): YarnGeneration {
  const declared = readDeclaredPackageManagerVersion(projectRoot, 'yarn');
  const major = Number(declared?.match(/^(\d+)/)?.[1] ?? NaN);
  if (Number.isFinite(major)) return major >= 2 ? 'berry' : 'classic';
  if (existsSync(resolve(projectRoot, '.yarnrc.yml'))) return 'berry';
  if (existsSync(resolve(projectRoot, '.yarnrc'))) return 'classic';
  return 'unknown';
}

export function createFileViewerCarrierCommand(
  manager: PackageManager,
  packageSpec: string,
  passthrough: readonly string[],
  options: { projectRoot: string; yarnGeneration?: YarnGeneration },
): FileViewerCarrierCommand {
  if (!/^file-viewer-copy-assets@[^\s]+$/.test(packageSpec)) throw new Error('Invalid file-viewer-copy-assets package spec.');
  if (manager === 'pnpm') return { command: 'pnpm', args: ['dlx', packageSpec, ...passthrough], compatibilityMode: 'native' };
  if (manager === 'bun') return { command: 'bunx', args: [packageSpec, ...passthrough], compatibilityMode: 'native' };
  if (manager === 'npm') {
    return {
      command: 'npm',
      args: ['exec', '--yes', '--package', packageSpec, '--', 'file-viewer-copy-assets', ...passthrough],
      compatibilityMode: 'native',
    };
  }
  const generation = options.yarnGeneration ?? detectYarnGeneration(options.projectRoot);
  if (generation === 'berry') return { command: 'yarn', args: ['dlx', packageSpec, ...passthrough], compatibilityMode: 'native' };
  // Yarn Classic has no `dlx`. npm exec is non-mutating and ships with the
  // supported Node runtime, so it is safer than adding a temporary dependency
  // to the user's project. Unknown Yarn versions take the same conservative path.
  return {
    command: 'npm',
    args: ['exec', '--yes', '--package', packageSpec, '--', 'file-viewer-copy-assets', ...passthrough],
    compatibilityMode: 'npm-exec-for-yarn-classic',
  };
}

export function createFileViewerRegistryEnvironment(registry: string) {
  return {
    npm_config_registry: registry,
    YARN_NPM_REGISTRY_SERVER: registry,
    BUN_CONFIG_REGISTRY: registry,
  };
}
