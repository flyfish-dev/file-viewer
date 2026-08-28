import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline/promises';
import { existsSync } from 'node:fs';
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const knownCommands = new Set([
  'create',
  'add',
  'list',
  'capabilities',
  'plan',
  'init',
  'config',
  'select',
  'remove',
  'generate',
  'install',
  'assets',
  'copy-assets',
  'prepare',
  'cache',
  'doctor',
  'verify',
]);

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export interface BootstrapOptions {
  forwarded: string[];
  requestedVersion?: string;
  registry?: string;
  offlineDirectory?: string;
  nonInteractive: boolean;
  helpOnly: boolean;
}

export interface BootstrapVersionCandidate {
  version: string;
  source: 'bundled' | 'registry' | 'offline';
  directory?: string;
  cliTarball?: string;
  tarballs?: string[];
}

interface OfflineManifestFile {
  packageName?: string;
  version?: string;
  dependencies?: Record<string, string>;
  size?: number;
  integrity?: string;
}

interface OfflineManifest {
  schemaVersion?: number;
  release?: string;
  roots?: Array<{ packageName?: string; version?: string }>;
  files?: Record<string, OfflineManifestFile>;
}

const compareStableVersions = (left: string, right: string) => {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
};

const stableVersions = (values: readonly unknown[]) => [...new Set(values
  .filter((value): value is string => typeof value === 'string' && stableVersionPattern.test(value)))]
  .sort((left, right) => compareStableVersions(right, left));

const valueAfter = (argv: string[], index: number, option: string) => {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value.`);
  return value;
};

export function parseBootstrapOptions(argv: string[]): BootstrapOptions {
  const forwarded: string[] = [];
  const preparesOfflineDirectory = argv[0] === 'prepare' || argv[0] === 'cache';
  let requestedVersion: string | undefined;
  let registry: string | undefined;
  let offlineDirectory: string | undefined;
  let preparedOfflineDirectory: string | undefined;
  let nonInteractive = false;
  let helpOnly = false;
  const assignOnce = (current: string | undefined, next: string, option: string) => {
    if (current !== undefined) throw new Error(`${option} may be specified only once.`);
    return next;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file-viewer-version') {
      requestedVersion = assignOnce(requestedVersion, valueAfter(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg.startsWith('--file-viewer-version=')) {
      requestedVersion = assignOnce(requestedVersion, arg.slice('--file-viewer-version='.length), '--file-viewer-version');
      continue;
    }
    if (arg === '--registry') {
      registry = assignOnce(registry, valueAfter(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg.startsWith('--registry=')) {
      registry = assignOnce(registry, arg.slice('--registry='.length), '--registry');
      continue;
    }
    if (arg === '--offline-dir') {
      const directory = valueAfter(argv, index, arg);
      if (preparesOfflineDirectory) {
        preparedOfflineDirectory = assignOnce(preparedOfflineDirectory, directory, arg);
        forwarded.push(arg, directory);
      } else {
        offlineDirectory = assignOnce(offlineDirectory, directory, arg);
      }
      index += 1;
      continue;
    }
    if (arg.startsWith('--offline-dir=')) {
      const directory = arg.slice('--offline-dir='.length);
      if (preparesOfflineDirectory) {
        preparedOfflineDirectory = assignOnce(
          preparedOfflineDirectory,
          directory,
          '--offline-dir',
        );
        forwarded.push(arg);
      } else {
        offlineDirectory = assignOnce(offlineDirectory, directory, '--offline-dir');
      }
      continue;
    }
    if (arg === '--non-interactive') nonInteractive = true;
    if (arg === '--help' || arg === '-h') helpOnly = true;
    forwarded.push(arg);
  }

  if (registry && offlineDirectory) throw new Error('--registry and --offline-dir are mutually exclusive.');
  if (requestedVersion && requestedVersion !== 'latest' && !stableVersionPattern.test(requestedVersion)) {
    throw new Error('--file-viewer-version must be latest or an exact stable x.y.z version.');
  }
  const first = forwarded[0];
  if (!knownCommands.has(first ?? '')) forwarded.unshift('create');
  return { forwarded, requestedVersion, registry, offlineDirectory, nonInteractive, helpOnly };
}

export function normalizeBootstrapRegistry(value: string) {
  // eslint-disable-next-line no-control-regex -- reject ASCII controls before URL parsing
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) {
    throw new Error('The bootstrap registry must be a credential-free HTTP(S) URL.');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('The bootstrap registry must be a credential-free HTTP(S) URL.');
  }
  const hostname = parsed.hostname.toLowerCase();
  const ipv4 = hostname.split('.');
  const loopback = hostname === 'localhost' || hostname === '[::1]' || (
    ipv4.length === 4 &&
    ipv4[0] === '127' &&
    ipv4.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    (parsed.protocol === 'http:' && !loopback) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('The bootstrap registry must be a credential-free HTTP(S) URL.');
  }
  return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`;
}

const secretValues = () => Object.entries(process.env)
  .filter(([name, value]) => /(?:TOKEN|AUTH|PASSWORD|PASSWD|SECRET)/i.test(name) && typeof value === 'string' && value.length >= 4)
  .map(([, value]) => value as string)
  .sort((left, right) => right.length - left.length);

const safeDiagnostic = (value: string) => {
  let output = value.replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi, '$1[redacted]@');
  for (const secret of secretValues()) output = output.split(secret).join('[redacted]');
  return output.trim().slice(-8_000);
};

const npmEnvironment = (registry?: string) => ({
  ...process.env,
  npm_config_audit: 'false',
  npm_config_fund: 'false',
  npm_config_update_notifier: 'false',
  ...(registry ? {
    npm_config_registry: registry,
    NPM_CONFIG_REGISTRY: registry,
    YARN_NPM_REGISTRY_SERVER: registry,
    BUN_CONFIG_REGISTRY: registry,
  } : {}),
});

const runNpmJson = (args: string[], registry: string) => {
  const result = spawnSync('npm', args, {
    encoding: 'utf8',
    shell: false,
    env: npmEnvironment(registry),
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Could not read File Viewer versions from the explicit registry: ${safeDiagnostic(result.stderr || result.stdout || result.error?.message || '')}`);
  }
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    throw new Error('The explicit registry returned invalid File Viewer version metadata.');
  }
};

export function discoverRegistryVersions(rawRegistry: string) {
  const registry = normalizeBootstrapRegistry(rawRegistry);
  const versionsValue = runNpmJson(['view', '@file-viewer/cli', 'versions', '--json'], registry);
  const tagsValue = runNpmJson(['view', '@file-viewer/cli', 'dist-tags', '--json'], registry);
  const versions = stableVersions(Array.isArray(versionsValue) ? versionsValue : [versionsValue]);
  if (!versions.length) throw new Error('The explicit registry has no stable @file-viewer/cli versions.');
  const latestTag = typeof tagsValue === 'object' && tagsValue !== null
    ? (tagsValue as Record<string, unknown>).latest
    : undefined;
  const latest = typeof latestTag === 'string' && versions.includes(latestTag) ? latestTag : versions[0];
  return { registry, versions, latest };
}

const isContained = (root: string, path: string) => {
  const value = relative(root, path);
  return value === '' || (!value.startsWith('..') && !value.startsWith('/') && !value.startsWith('\\'));
};

const inspectOfflineManifest = async (directory: string): Promise<BootstrapVersionCandidate | null> => {
  const manifestPath = join(directory, 'file-viewer-offline-manifest.json');
  if (!existsSync(manifestPath)) return null;
  const physicalRoot = await realpath(directory);
  const manifestDetails = await lstat(manifestPath);
  if (!manifestDetails.isFile() || manifestDetails.isSymbolicLink()) {
    throw new Error(`Offline integrity manifest is not a regular file in ${directory}.`);
  }
  const physicalManifest = await realpath(manifestPath);
  if (!isContained(physicalRoot, physicalManifest)) {
    throw new Error(`Offline integrity manifest escapes ${directory}.`);
  }
  const manifest = JSON.parse(await readFile(physicalManifest, 'utf8')) as OfflineManifest;
  if (manifest.schemaVersion !== 1 || !manifest.files || Array.isArray(manifest.files)) {
    throw new Error(`Invalid offline integrity manifest in ${directory}.`);
  }
  const tarballs: string[] = [];
  const packageVersions = new Map<string, string>();
  let cliTarball: string | undefined;
  let cliVersion: string | undefined;
  for (const [filename, item] of Object.entries(manifest.files)) {
    if (!filename.endsWith('.tgz') || filename !== filename.split(/[\\/]/).at(-1)) {
      throw new Error(`Unsafe offline tarball name in ${manifestPath}.`);
    }
    if (!item.packageName || !item.version || !stableVersionPattern.test(item.version) || !item.integrity) {
      throw new Error(`Incomplete offline package metadata for ${filename}.`);
    }
    if (!item.dependencies || Array.isArray(item.dependencies)) {
      throw new Error(`Offline package ${filename} has no dependency metadata.`);
    }
    const previous = packageVersions.get(item.packageName);
    if (previous && previous !== item.version) {
      throw new Error(`Offline directory mixes ${item.packageName}@${previous} and ${item.packageName}@${item.version}.`);
    }
    packageVersions.set(item.packageName, item.version);
    const archive = join(physicalRoot, filename);
    const details = await lstat(archive);
    if (!details.isFile() || details.isSymbolicLink()) throw new Error(`Offline tarball is not a regular file: ${filename}.`);
    const physicalArchive = await realpath(archive);
    if (!isContained(physicalRoot, physicalArchive)) throw new Error(`Offline tarball escapes its manifest directory: ${filename}.`);
    const content = await readFile(physicalArchive);
    if (item.size !== undefined && item.size !== content.byteLength) {
      throw new Error(`Offline tarball size mismatch: ${filename}.`);
    }
    const integrity = `sha512-${createHash('sha512').update(content).digest('base64')}`;
    if (integrity !== item.integrity) throw new Error(`Offline tarball integrity mismatch: ${filename}.`);
    tarballs.push(physicalArchive);
    if (item.packageName === '@file-viewer/cli') {
      if (cliTarball) throw new Error(`Offline directory contains more than one @file-viewer/cli tarball: ${directory}.`);
      cliTarball = physicalArchive;
      cliVersion = item.version;
    }
  }
  if (!cliTarball || !cliVersion) return null;
  if (manifest.release && manifest.release !== cliVersion) {
    throw new Error(`Offline manifest release ${manifest.release} does not match @file-viewer/cli@${cliVersion}.`);
  }
  if (Array.isArray(manifest.roots)) {
    const declaredCli = manifest.roots.find(item => item.packageName === '@file-viewer/cli');
    if (declaredCli && declaredCli.version !== cliVersion) {
      throw new Error(`Offline root @file-viewer/cli@${String(declaredCli.version)} does not match ${cliVersion}.`);
    }
  }
  return { version: cliVersion, source: 'offline', directory: physicalRoot, cliTarball, tarballs };
};

export async function discoverOfflineVersions(rawDirectory: string, cwd = process.cwd()) {
  const root = resolve(cwd, rawDirectory);
  const rootDetails = await lstat(root);
  if (!rootDetails.isDirectory()) throw new Error(`Offline bootstrap path is not a directory: ${root}.`);
  const directories = [root];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) directories.push(join(root, entry.name));
  }
  const candidates: BootstrapVersionCandidate[] = [];
  for (const directory of directories) {
    const candidate = await inspectOfflineManifest(directory);
    if (candidate) candidates.push(candidate);
  }
  if (!candidates.length) {
    throw new Error(`No integrity-verified @file-viewer/cli release was found in ${root} or its direct subdirectories.`);
  }
  const byVersion = new Map<string, BootstrapVersionCandidate>();
  for (const candidate of candidates) {
    const previous = byVersion.get(candidate.version);
    if (previous) throw new Error(`Offline bootstrap version ${candidate.version} is ambiguous across multiple manifests.`);
    byVersion.set(candidate.version, candidate);
  }
  return [...byVersion.values()].sort((left, right) => compareStableVersions(right.version, left.version));
}

export async function chooseVersionInteractively(
  candidates: readonly BootstrapVersionCandidate[],
  question?: (prompt: string) => Promise<string>,
) {
  if (!candidates.length) throw new Error('No stable File Viewer versions are available.');
  let io: ReturnType<typeof createInterface> | undefined;
  const ask = question ?? (() => {
    io = createInterface({ input: process.stdin, output: process.stdout });
    return (prompt: string) => io!.question(prompt);
  })();
  try {
    process.stdout.write(`\nFile Viewer version:\n${candidates.map((candidate, index) => `  ${index + 1}) ${candidate.version}`).join('\n')}\n`);
    while (true) {
      const answer = (await ask(`Choose a number [1]: `)).trim();
      if (!answer) return candidates[0];
      const selected = candidates[Number(answer) - 1];
      if (selected && /^\d+$/.test(answer)) return selected;
    }
  } finally {
    io?.close();
  }
}

const bootstrapHelp: Record<string, string> = {
  en: `create-file-viewer version bootstrap

Version selection:
  npm create file-viewer@<x.y.z> keeps that exact create/CLI catalog pair.
  --registry <url> discovers stable CLI releases only from that credential-free registry URL.
  --offline-dir <dir> discovers integrity-verified releases in that directory or direct version subdirectories.
  --file-viewer-version <x.y.z|latest> selects one exact catalog; multi-version non-interactive use requires it.
  Registry environment variables are never used as an implicit version-discovery source.
`,
  'zh-CN': `create-file-viewer 版本引导

版本选择：
  npm create file-viewer@<x.y.z> 始终使用完全一致的 create/CLI catalog 版本。
  --registry <url> 只从这个不含凭据的显式 registry 发现稳定版本。
  --offline-dir <dir> 从当前目录或其一级版本子目录发现并校验完整性清单。
  --file-viewer-version <x.y.z|latest> 精确选择 catalog；非交互式多版本场景必须提供。
  不会把 registry 环境变量作为隐式版本发现来源。
`,
  'ja-JP': `create-file-viewer バージョンブートストラップ

バージョン選択:
  npm create file-viewer@<x.y.z> は create と CLI catalog の同一バージョンを使用します。
  --registry <url> は認証情報を含まない明示 URL から安定版だけを検出します。
  --offline-dir <dir> はディレクトリまたは直下の版別ディレクトリで integrity manifest を検証します。
  --file-viewer-version <x.y.z|latest> で catalog を固定します。非対話の複数版選択では必須です。
  registry 環境変数を暗黙のバージョン検出元には使用しません。
`,
  'de-DE': `create-file-viewer Versions-Bootstrap

Versionsauswahl:
  npm create file-viewer@<x.y.z> verwendet exakt dieselbe create/CLI-Katalogversion.
  --registry <url> ermittelt stabile Versionen nur aus dieser expliziten URL ohne Zugangsdaten.
  --offline-dir <dir> prüft Integritätsmanifeste im Verzeichnis oder direkten Versionsunterverzeichnissen.
  --file-viewer-version <x.y.z|latest> fixiert einen Katalog; bei nichtinteraktiver Mehrfachauswahl ist die Option Pflicht.
  Registry-Umgebungsvariablen werden nie als implizite Quelle zur Versionsermittlung verwendet.
`,
};

const renderBootstrapHelp = (forwarded: readonly string[]) => {
  const index = forwarded.findIndex(value => value === '--lang' || value === '--locale');
  const locale = index >= 0 ? forwarded[index + 1] : 'en';
  return bootstrapHelp[locale] ?? bootstrapHelp.en;
};

const readBundledPackageVersion = async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version?: string };
  if (!manifest.version || !stableVersionPattern.test(manifest.version)) throw new Error('create-file-viewer has no stable package version.');
  return manifest.version;
};

const resolveInstalledCli = async (selectedVersion: string, requireFrom: ReturnType<typeof createRequire>) => {
  const packageJsonPath = requireFrom.resolve('@file-viewer/cli/package.json');
  const packageRoot = dirname(packageJsonPath);
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    name?: string;
    version?: string;
    bin?: string | Record<string, string>;
  };
  if (manifest.name !== '@file-viewer/cli' || manifest.version !== selectedVersion) {
    throw new Error(`Resolved ${String(manifest.name)}@${String(manifest.version)}; selected @file-viewer/cli@${selectedVersion}. Refusing to mix release catalogs.`);
  }
  const catalog = JSON.parse(await readFile(join(packageRoot, 'catalog', 'catalog.json'), 'utf8')) as {
    core?: { version?: string };
  };
  if (catalog.core?.version !== selectedVersion) {
    throw new Error(`@file-viewer/cli@${selectedVersion} contains catalog ${String(catalog.core?.version)}. Refusing to mix release catalogs.`);
  }
  const relativeBin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.['file-viewer'];
  if (!relativeBin) throw new Error(`@file-viewer/cli@${selectedVersion} has no file-viewer executable.`);
  const bin = resolve(packageRoot, relativeBin);
  if (!isContained(packageRoot, bin)) throw new Error(`@file-viewer/cli@${selectedVersion} has an unsafe executable path.`);
  return bin;
};

const installSelectedCli = async (candidate: BootstrapVersionCandidate, registry?: string) => {
  const root = await mkdtemp(join(tmpdir(), 'create-file-viewer-bootstrap-'));
  await writeFile(join(root, 'package.json'), '{"private":true,"type":"module"}\n', 'utf8');
  const specs = candidate.source === 'offline'
    ? (candidate.tarballs ?? []).map(path => `file:${path}`)
    : [`@file-viewer/cli@${candidate.version}`];
  const args = [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-save',
    '--package-lock=false',
    ...(candidate.source === 'offline' ? ['--offline'] : []),
    ...specs,
  ];
  const result = spawnSync('npm', args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: npmEnvironment(registry),
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    await rm(root, { recursive: true, force: true });
    throw new Error(`Could not prepare @file-viewer/cli@${candidate.version}: ${safeDiagnostic(result.stderr || result.stdout || result.error?.message || '')}`);
  }
  const requireFrom = createRequire(join(root, 'package.json'));
  try {
    const bin = await resolveInstalledCli(candidate.version, requireFrom);
    return { root, bin };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
};

const delegateArguments = (options: BootstrapOptions, candidate: BootstrapVersionCandidate, registry?: string) => [
  ...options.forwarded,
  '--file-viewer-version',
  candidate.version,
  ...(registry ? ['--registry', registry] : []),
  ...(candidate.source === 'offline' && candidate.directory ? ['--offline-dir', candidate.directory] : []),
];

export async function runFileViewerBootstrap(argv = process.argv.slice(2)) {
  const options = parseBootstrapOptions(argv);
  const bundledVersion = await readBundledPackageVersion();
  let registry: string | undefined;
  let candidates: BootstrapVersionCandidate[];
  let latest: string;

  if (options.registry) {
    const discovered = discoverRegistryVersions(options.registry);
    registry = discovered.registry;
    candidates = discovered.versions.map(version => ({ version, source: 'registry' as const }));
    latest = discovered.latest;
  } else if (options.offlineDirectory) {
    candidates = await discoverOfflineVersions(options.offlineDirectory);
    latest = candidates[0].version;
  } else {
    candidates = [{ version: bundledVersion, source: 'bundled' }];
    latest = bundledVersion;
  }

  let candidate: BootstrapVersionCandidate | undefined;
  if (options.requestedVersion) {
    const selectedVersion = options.requestedVersion === 'latest' ? latest : options.requestedVersion;
    candidate = candidates.find(item => item.version === selectedVersion);
    if (!candidate) throw new Error(`@file-viewer/cli@${selectedVersion} is not available from the selected bootstrap source.`);
  } else if (options.helpOnly && candidates.some(item => item.version === bundledVersion)) {
    candidate = candidates.find(item => item.version === bundledVersion);
  } else if ((options.registry || options.offlineDirectory) && (options.nonInteractive || !process.stdin.isTTY || !process.stdout.isTTY)) {
    throw new Error('Non-interactive multi-version bootstrap requires --file-viewer-version <x.y.z|latest>.');
  } else if (candidates.length === 1) {
    candidate = candidates[0];
  } else if (options.nonInteractive || !process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Non-interactive bootstrap requires an exact npm create package version or --file-viewer-version <x.y.z|latest>.');
  } else {
    candidate = await chooseVersionInteractively(candidates);
  }

  if (!candidate) throw new Error('No File Viewer CLI version was selected.');
  let temporaryRoot: string | undefined;
  let bin: string;
  if (candidate.source === 'bundled') {
    if (candidate.version !== bundledVersion) throw new Error('The bundled CLI version does not match create-file-viewer.');
    bin = await resolveInstalledCli(candidate.version, createRequire(import.meta.url));
  } else if (candidate.source === 'registry' && candidate.version === bundledVersion) {
    bin = await resolveInstalledCli(candidate.version, createRequire(import.meta.url));
  } else {
    const installed = await installSelectedCli(candidate, registry);
    temporaryRoot = installed.root;
    bin = installed.bin;
  }

  try {
    if (options.helpOnly) process.stdout.write(`${renderBootstrapHelp(options.forwarded)}\n`);
    const child = spawnSync(process.execPath, [bin, ...delegateArguments(options, candidate, registry)], {
      cwd: process.cwd(),
      shell: false,
      stdio: 'inherit',
      env: npmEnvironment(registry),
    });
    if (child.error) throw child.error;
    return child.status ?? 1;
  } finally {
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  }
}
