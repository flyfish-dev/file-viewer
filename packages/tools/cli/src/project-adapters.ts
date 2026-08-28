import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type FileViewerBuildSystem = 'vite' | 'vue-cli' | 'webpack' | 'next' | 'nuxt' | 'unknown';

export interface FileViewerProjectAdapterInspection {
  schemaVersion: 1;
  buildSystem: FileViewerBuildSystem;
  safeAutomaticConfiguration: boolean;
  failClosed: boolean;
  assetTarget?: string;
  publicDirectory?: string;
  selectedConfigPath?: string;
  configPaths: string[];
  relevantScripts: Array<{ name: string; command: string }>;
  manualSteps: string[];
  warnings: string[];
}

interface ProjectManifest {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const conventionalViteConfigs = [
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'vite.config.cts',
  'vite.config.cjs',
];

const conventionalWebpackConfigs = [
  'webpack.config.ts',
  'webpack.config.js',
  'webpack.config.mjs',
  'webpack.config.cjs',
];

const conventionalNuxtConfigs = [
  'nuxt.config.ts',
  'nuxt.config.js',
  'nuxt.config.mjs',
];

const conventionalVueCliConfigs = [
  'vue.config.ts',
  'vue.config.js',
  'vue.config.cjs',
];

const normalizeProjectPath = (projectRoot: string, value: string, label: string) => {
  const trimmed = value.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (!trimmed || trimmed === '.') throw new Error(`${label} must not be the project root.`);
  const absolute = resolve(projectRoot, trimmed);
  const projectRelative = relative(resolve(projectRoot), absolute);
  if (!projectRelative || projectRelative === '..' || projectRelative.startsWith(`..${sep}`) || isAbsolute(projectRelative)) {
    throw new Error(`${label} must be a contained project-relative path.`);
  }
  return projectRelative.split(sep).join('/');
};

/**
 * Tokenizes only the shell syntax needed to inspect package scripts. It never
 * executes or expands variables. Shell substitutions deliberately make the
 * result unsafe so the adapter can fail closed.
 */
const tokenizePackageScript = (command: string) => {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let unsafe = false;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else {
        if (character === '$' || character === '`') unsafe = true;
        current += character;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '$' || character === '`' || character === '\n' || character === '\r') unsafe = true;
    if (/\s/.test(character)) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    if ([';', '|', '&', '>', '<'].includes(character)) {
      if (current) tokens.push(current);
      current = '';
      tokens.push(character);
      continue;
    }
    current += character;
  }
  if (escaped || quote) unsafe = true;
  if (current) tokens.push(current);
  return { tokens, unsafe };
};

const executableName = (token: string) => token.replace(/\\/g, '/').split('/').at(-1)?.replace(/\.(?:cmd|exe)$/i, '') ?? token;

const scriptUses = (command: string, executables: readonly string[]) => {
  const { tokens } = tokenizePackageScript(command);
  return tokens.some(token => executables.includes(executableName(token)));
};

const findConfigArguments = (scripts: Array<{ name: string; command: string }>, executable: string) => {
  const values: string[] = [];
  let unsafe = false;
  let optionSeenWithoutValue = false;
  for (const script of scripts) {
    const parsed = tokenizePackageScript(script.command);
    unsafe ||= parsed.unsafe;
    for (let index = 0; index < parsed.tokens.length; index += 1) {
      if (executableName(parsed.tokens[index]) !== executable) continue;
      for (let cursor = index + 1; cursor < parsed.tokens.length; cursor += 1) {
        const token = parsed.tokens[cursor];
        if ([';', '|', '&'].includes(token)) break;
        if (token === '--config' || token === '-c') {
          const value = parsed.tokens[cursor + 1];
          if (!value || value.startsWith('-') || [';', '|', '&'].includes(value)) optionSeenWithoutValue = true;
          else values.push(value);
        } else if (token.startsWith('--config=')) {
          const value = token.slice('--config='.length);
          if (value) values.push(value);
          else optionSeenWithoutValue = true;
        }
      }
    }
  }
  return { values: [...new Set(values)], unsafe, optionSeenWithoutValue };
};

const stripJavaScriptComments = (source: string) => {
  let output = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      output += character;
      continue;
    }
    if (character === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      output += '\n';
      continue;
    }
    if (character === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 1;
      output += ' ';
      continue;
    }
    output += character;
  }
  return output;
};

const readSimpleStringProperty = (source: string, property: string) => {
  const stripped = stripJavaScriptComments(source);
  const occurrence = new RegExp(`\\b${property.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*:`, 'g');
  const matches = [...stripped.matchAll(occurrence)];
  if (!matches.length) return { kind: 'absent' as const };
  if (matches.length !== 1) return { kind: 'dynamic' as const };
  const tail = stripped.slice((matches[0].index ?? 0) + matches[0][0].length).trimStart();
  if (tail.startsWith('false')) return { kind: 'disabled' as const };
  const quote = tail[0];
  if (!['"', "'", '`'].includes(quote)) return { kind: 'dynamic' as const };
  let value = '';
  let escaped = false;
  for (let index = 1; index < tail.length; index += 1) {
    const character = tail[index];
    if (escaped) {
      if (!['\\', '/', '"', "'", '`'].includes(character)) return { kind: 'dynamic' as const };
      value += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === quote) {
      if (quote === '`' && value.includes('${')) return { kind: 'dynamic' as const };
      return { kind: 'literal' as const, value };
    }
    value += character;
  }
  return { kind: 'dynamic' as const };
};

const readNuxtDirectoryProperty = (source: string, property: 'public' | 'static') => {
  const stripped = stripJavaScriptComments(source);
  const matches = [...stripped.matchAll(/\bdir\s*:/g)];
  if (!matches.length) return { kind: 'absent' as const };
  if (matches.length !== 1) return { kind: 'dynamic' as const };
  const start = (matches[0].index ?? 0) + matches[0][0].length;
  const objectStart = stripped.slice(start).search(/\S/) + start;
  if (objectStart < start || stripped[objectStart] !== '{') return { kind: 'dynamic' as const };
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = objectStart; index < stripped.length; index += 1) {
    const character = stripped[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return readSimpleStringProperty(stripped.slice(objectStart, index + 1), property);
    }
  }
  return { kind: 'dynamic' as const };
};

const dependencyMajor = (value: string | undefined) => Number(value?.match(/(?:^|[^0-9])(\d+)(?:\.|$)/)?.[1] ?? NaN);

const adapterResult = (
  buildSystem: FileViewerBuildSystem,
  values: Omit<FileViewerProjectAdapterInspection, 'schemaVersion' | 'buildSystem' | 'safeAutomaticConfiguration' | 'failClosed'>,
): FileViewerProjectAdapterInspection => ({
  schemaVersion: 1,
  buildSystem,
  safeAutomaticConfiguration: Boolean(values.assetTarget) && values.manualSteps.length === 0,
  failClosed: !values.assetTarget || values.manualSteps.length > 0,
  ...values,
});

const conventionalFiles = (projectRoot: string, names: readonly string[]) => names.filter(name => existsSync(resolve(projectRoot, name)));

export async function inspectFileViewerProjectAdapter(projectRoot: string): Promise<FileViewerProjectAdapterInspection> {
  const root = resolve(projectRoot);
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as ProjectManifest;
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const scripts = Object.entries(manifest.scripts ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, command]) => ({ name, command }));
  const relevantScripts = scripts.filter(item => scriptUses(item.command, ['vite', 'vue-cli-service', 'webpack', 'webpack-cli', 'next', 'nuxt', 'nuxt2', 'nuxi']));

  const usesVite = Boolean(dependencies.vite) || relevantScripts.some(item => scriptUses(item.command, ['vite']));
  const usesVueCli = Boolean(dependencies['@vue/cli-service']) || relevantScripts.some(item => scriptUses(item.command, ['vue-cli-service']));
  const usesNext = Boolean(dependencies.next) || relevantScripts.some(item => scriptUses(item.command, ['next']));
  const usesNuxt = Boolean(dependencies.nuxt) || relevantScripts.some(item => scriptUses(item.command, ['nuxt', 'nuxt2', 'nuxi']));
  const usesWebpack = Boolean(dependencies.webpack || dependencies['webpack-cli']) || relevantScripts.some(item => scriptUses(item.command, ['webpack', 'webpack-cli']));
  const detected = [usesVite && 'vite', usesVueCli && 'vue-cli', usesNext && 'next', usesNuxt && 'nuxt', usesWebpack && 'webpack'].filter(Boolean) as FileViewerBuildSystem[];
  const primary = ['build', 'dev', 'start'].map(name => scripts.find(script => script.name === name)).filter(Boolean) as Array<{ name: string; command: string }>;
  const primarySystems = [
    primary.some(item => scriptUses(item.command, ['vite'])) && 'vite',
    primary.some(item => scriptUses(item.command, ['vue-cli-service'])) && 'vue-cli',
    primary.some(item => scriptUses(item.command, ['next'])) && 'next',
    primary.some(item => scriptUses(item.command, ['nuxt', 'nuxt2', 'nuxi'])) && 'nuxt',
    primary.some(item => scriptUses(item.command, ['webpack', 'webpack-cli'])) && 'webpack',
  ].filter(Boolean) as FileViewerBuildSystem[];
  const selectedSystems = [...new Set(primarySystems.length ? primarySystems : detected)];
  if (selectedSystems.length > 1) {
    return adapterResult('unknown', {
      configPaths: [],
      relevantScripts,
      warnings: [],
      manualSteps: [`Multiple build systems were detected (${selectedSystems.join(', ')}). Choose the application package or configure its static directory, then pass --asset-target explicitly.`],
    });
  }
  const buildSystem = selectedSystems[0] ?? 'unknown';

  if (buildSystem === 'vite') {
    const viteScripts = relevantScripts.filter(item => scriptUses(item.command, ['vite']));
    const argumentsResult = findConfigArguments(viteScripts, 'vite');
    const manualSteps: string[] = [];
    const warnings: string[] = [];
    let configPaths: string[] = [];
    if (argumentsResult.unsafe || argumentsResult.optionSeenWithoutValue) {
      manualSteps.push('The Vite --config argument uses shell expansion or has no static value. Resolve it to one contained config file before running add.');
    } else if (argumentsResult.values.length) {
      try {
        configPaths = argumentsResult.values.map(value => normalizeProjectPath(root, value, 'Vite config path'));
      } catch (error) {
        manualSteps.push((error as Error).message);
      }
    } else configPaths = conventionalFiles(root, conventionalViteConfigs);
    configPaths = [...new Set(configPaths)];
    if (configPaths.length > 1) manualSteps.push(`Multiple Vite configs were detected (${configPaths.join(', ')}). Select one build target and pass a matching --asset-target.`);
    const selectedConfigPath = configPaths.length === 1 ? configPaths[0] : undefined;
    let publicDirectory: string | undefined;
    if (selectedConfigPath && !existsSync(resolve(root, selectedConfigPath))) {
      manualSteps.push(`The Vite config ${selectedConfigPath} referenced by package scripts does not exist.`);
    } else if (selectedConfigPath) {
      const publicDir = readSimpleStringProperty(await readFile(resolve(root, selectedConfigPath), 'utf8'), 'publicDir');
      if (publicDir.kind === 'literal') {
        try {
          publicDirectory = normalizeProjectPath(root, publicDir.value, 'Vite publicDir');
        } catch (error) {
          manualSteps.push((error as Error).message);
        }
      } else if (publicDir.kind === 'absent') publicDirectory = 'public';
      else if (publicDir.kind === 'disabled') manualSteps.push(`Vite publicDir is disabled in ${selectedConfigPath}. Configure an explicit copied static directory before running add.`);
      else manualSteps.push(`Vite publicDir in ${selectedConfigPath} is dynamic. Resolve its actual static directory and pass --asset-target explicitly.`);
    } else if (!manualSteps.length) publicDirectory = 'public';
    const assetTarget = publicDirectory ? `${publicDirectory}/file-viewer` : undefined;
    return adapterResult('vite', { assetTarget, publicDirectory, selectedConfigPath, configPaths, relevantScripts, manualSteps, warnings });
  }

  if (buildSystem === 'vue-cli') {
    const configPaths = conventionalFiles(root, conventionalVueCliConfigs);
    const manualSteps = configPaths.length > 1 ? [`Multiple Vue CLI configs were detected (${configPaths.join(', ')}). Keep one application config before running add.`] : [];
    return adapterResult('vue-cli', {
      assetTarget: manualSteps.length ? undefined : 'public/file-viewer',
      publicDirectory: manualSteps.length ? undefined : 'public',
      selectedConfigPath: configPaths.length === 1 ? configPaths[0] : undefined,
      configPaths,
      relevantScripts,
      manualSteps,
      warnings: [],
    });
  }

  if (buildSystem === 'next') {
    const configPaths = conventionalFiles(root, ['next.config.ts', 'next.config.js', 'next.config.mjs']);
    return adapterResult('next', {
      assetTarget: 'public/file-viewer',
      publicDirectory: 'public',
      selectedConfigPath: configPaths.length === 1 ? configPaths[0] : undefined,
      configPaths,
      relevantScripts,
      manualSteps: [],
      warnings: ['Next.js serves files in public at the site root; File Viewer assets will be available under /file-viewer/.'],
    });
  }

  if (buildSystem === 'nuxt') {
    const configPaths = conventionalFiles(root, conventionalNuxtConfigs);
    const manualSteps = configPaths.length > 1 ? [`Multiple Nuxt configs were detected (${configPaths.join(', ')}). Keep one application config before running add.`] : [];
    const major = dependencyMajor(dependencies.nuxt);
    const property = Number.isFinite(major) && major <= 2 ? 'static' : 'public';
    let publicDirectory = property;
    const selectedConfigPath = configPaths.length === 1 ? configPaths[0] : undefined;
    if (selectedConfigPath) {
      const configured = readNuxtDirectoryProperty(await readFile(resolve(root, selectedConfigPath), 'utf8'), property);
      if (configured.kind === 'literal') {
        try {
          publicDirectory = normalizeProjectPath(root, configured.value, `Nuxt dir.${property}`);
        } catch (error) {
          manualSteps.push((error as Error).message);
        }
      } else if (configured.kind === 'dynamic' || configured.kind === 'disabled') {
        manualSteps.push(`Nuxt dir.${property} in ${selectedConfigPath} is not a static directory. Resolve it and pass --asset-target explicitly.`);
      }
    }
    return adapterResult('nuxt', {
      assetTarget: manualSteps.length ? undefined : `${publicDirectory}/file-viewer`,
      publicDirectory: manualSteps.length ? undefined : publicDirectory,
      selectedConfigPath,
      configPaths,
      relevantScripts,
      manualSteps,
      warnings: [],
    });
  }

  if (buildSystem === 'webpack') {
    const scriptConfigs = findConfigArguments(relevantScripts.filter(item => scriptUses(item.command, ['webpack', 'webpack-cli'])), 'webpack');
    let configPaths: string[] = [];
    try {
      configPaths = scriptConfigs.values.length
        ? scriptConfigs.values.map(value => normalizeProjectPath(root, value, 'Webpack config path'))
        : conventionalFiles(root, conventionalWebpackConfigs);
    } catch {
      // The manual step below deliberately handles unsafe/uncontained configs.
    }
    return adapterResult('webpack', {
      selectedConfigPath: configPaths.length === 1 ? configPaths[0] : undefined,
      configPaths: [...new Set(configPaths)],
      relevantScripts,
      manualSteps: ['Generic Webpack has no standard public source directory. Configure CopyWebpackPlugin (or an equivalent static copy) for a dedicated directory, then pass that directory as --asset-target.'],
      warnings: [],
    });
  }

  return adapterResult('unknown', {
    configPaths: [],
    relevantScripts,
    manualSteps: ['No supported build adapter was detected. Configure a project-relative static directory that is copied unchanged to the public build, then pass it as --asset-target.'],
    warnings: [],
  });
}

export function assertFileViewerProjectAdapterCanWrite(inspection: FileViewerProjectAdapterInspection) {
  if (!inspection.safeAutomaticConfiguration || inspection.failClosed) {
    throw new Error(`File Viewer cannot safely complete this project integration automatically:\n- ${inspection.manualSteps.join('\n- ')}`);
  }
  return inspection;
}

export function readDeclaredPackageManagerVersion(projectRoot: string, manager: string) {
  try {
    const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as { packageManager?: string };
    const match = manifest.packageManager?.match(new RegExp(`^${manager.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}@([^\\s]+)$`, 'i'));
    return match?.[1];
  } catch {
    return undefined;
  }
}
