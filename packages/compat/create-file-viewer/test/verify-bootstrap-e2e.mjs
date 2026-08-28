import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmod, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bootstrapBin = join(packageRoot, 'dist', 'cli.js');
const sha512 = content => `sha512-${createHash('sha512').update(content).digest('base64')}`;
const delay = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: 'utf8',
    shell: false,
    env: options.env ?? process.env,
    timeout: options.timeout ?? 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (!options.allowFailure && (result.error || result.status !== 0)) {
    throw new Error(`${command} ${args.join(' ')} failed (${String(result.status)}):\n${result.stderr || result.stdout || result.error?.message}`);
  }
  return result;
};

const freePort = () => new Promise((resolvePromise, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(error => error ? reject(error) : resolvePromise(address.port));
  });
});

async function waitForRegistry(registry, child) {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Verdaccio exited before readiness with ${String(child.exitCode)}.`);
    try {
      const response = await fetch(registry);
      if (response.ok) return;
    } catch {
      // Registry startup is bounded by the loop.
    }
    await delay(200);
  }
  throw new Error('Verdaccio did not become ready.');
}

async function createCandidate(root, version, catalogVersion = version) {
  const dependencyDirectory = join(root, `fixture-${version}`);
  await mkdir(dependencyDirectory, { recursive: true });
  await writeFile(join(dependencyDirectory, 'package.json'), `${JSON.stringify({
    name: '@file-viewer/bootstrap-fixture',
    version,
    type: 'module',
    exports: './index.js',
    files: ['index.js'],
  }, null, 2)}\n`);
  await writeFile(join(dependencyDirectory, 'index.js'), `export const bootstrapFixtureVersion = ${JSON.stringify(version)};\n`);
  const packedDependency = run('npm', ['pack', '--json', '--pack-destination', root], { cwd: dependencyDirectory });
  const dependencyDetails = JSON.parse(packedDependency.stdout).at(-1);
  const directory = join(root, `cli-${version}`);
  await mkdir(join(directory, 'catalog'), { recursive: true });
  await writeFile(join(directory, 'package.json'), `${JSON.stringify({
    name: '@file-viewer/cli',
    version,
    type: 'module',
    bin: { 'file-viewer': './cli.js' },
    exports: { './package.json': './package.json' },
    files: ['cli.js', 'catalog'],
    dependencies: { '@file-viewer/bootstrap-fixture': version },
  }, null, 2)}\n`);
  await writeFile(join(directory, 'catalog', 'catalog.json'), `${JSON.stringify({
    schemaVersion: 1,
    core: { packageName: '@file-viewer/core', version: catalogVersion },
    marker: `catalog-${catalogVersion}`,
  }, null, 2)}\n`);
  await writeFile(join(directory, 'cli.js'), `#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bootstrapFixtureVersion } from '@file-viewer/bootstrap-fixture';
const version = ${JSON.stringify(version)};
const marker = ${JSON.stringify(`catalog-${catalogVersion}`)};
if (bootstrapFixtureVersion !== version) {
  console.error('candidate dependency version mismatch');
  process.exit(42);
}
const argv = process.argv.slice(2);
const versionIndex = argv.indexOf('--file-viewer-version');
if (versionIndex < 0 || argv[versionIndex + 1] !== version) {
  console.error('candidate version mismatch');
  process.exit(41);
}
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write('candidate CLI ' + version + '\\n');
  process.exit(0);
}
const command = argv[0];
const project = resolve(command === 'create' && argv[1] && !argv[1].startsWith('-') ? argv[1] : '.');
await mkdir(project, { recursive: true });
await writeFile(new URL('package.json', 'file://' + project.replaceAll('\\\\', '/') + '/'), JSON.stringify({
  private: true,
  dependencies: {
    '@file-viewer/web': version,
    '@file-viewer/preset-standard': version
  }
}, null, 2) + '\\n');
await writeFile(new URL('file-viewer.config.json', 'file://' + project.replaceAll('\\\\', '/') + '/'), JSON.stringify({
  schemaVersion: 1,
  catalogVersion: version,
  catalogMarker: marker
}, null, 2) + '\\n');
process.stdout.write(JSON.stringify({ version, marker, project }) + '\\n');
`);
  await chmod(join(directory, 'cli.js'), 0o755);
  const packed = run('npm', ['pack', '--json', '--pack-destination', root], { cwd: directory });
  const details = JSON.parse(packed.stdout).at(-1);
  return {
    directory,
    archive: join(root, details.filename),
    dependencyArchive: join(root, dependencyDetails.filename),
    version,
    catalogVersion,
  };
}

async function createBootstrapCandidate(root, version) {
  const directory = join(root, `create-${version}`);
  await mkdir(join(directory, 'dist'), { recursive: true });
  await cp(join(packageRoot, 'dist', 'bootstrap.js'), join(directory, 'dist', 'bootstrap.js'));
  await cp(join(packageRoot, 'dist', 'cli.js'), join(directory, 'dist', 'cli.js'));
  await writeFile(join(directory, 'package.json'), `${JSON.stringify({
    name: 'create-file-viewer',
    version,
    type: 'module',
    bin: { 'create-file-viewer': './dist/cli.js' },
    files: ['dist'],
    dependencies: { '@file-viewer/cli': version },
    engines: { node: '>=20' },
  }, null, 2)}\n`);
  const packed = run('npm', ['pack', '--json', '--pack-destination', root], { cwd: directory });
  const details = JSON.parse(packed.stdout).at(-1);
  return { directory, archive: join(root, details.filename), version };
}

async function writeOfflineVersion(root, candidate) {
  const directory = join(root, candidate.version);
  await mkdir(directory, { recursive: true });
  const filename = `file-viewer-cli-${candidate.version}.tgz`;
  const dependencyFilename = `file-viewer-bootstrap-fixture-${candidate.version}.tgz`;
  await cp(candidate.archive, join(directory, filename));
  await cp(candidate.dependencyArchive, join(directory, dependencyFilename));
  const content = await readFile(join(directory, filename));
  const dependencyContent = await readFile(join(directory, dependencyFilename));
  await writeFile(join(directory, 'file-viewer-offline-manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    release: candidate.version,
    roots: [{ packageName: '@file-viewer/cli', version: candidate.version }],
    files: {
      [filename]: {
        packageName: '@file-viewer/cli',
        version: candidate.version,
        dependencies: { '@file-viewer/bootstrap-fixture': candidate.version },
        size: content.byteLength,
        integrity: sha512(content),
      },
      [dependencyFilename]: {
        packageName: '@file-viewer/bootstrap-fixture',
        version: candidate.version,
        dependencies: {},
        size: dependencyContent.byteLength,
        integrity: sha512(dependencyContent),
      },
    },
  }, null, 2)}\n`);
}

const runBootstrap = (cwd, args, env, allowFailure = false) => run(
  process.execPath,
  [bootstrapBin, ...args],
  { cwd, env, allowFailure },
);

const readProjectEvidence = async project => ({
  packageJson: JSON.parse(await readFile(join(project, 'package.json'), 'utf8')),
  config: JSON.parse(await readFile(join(project, 'file-viewer.config.json'), 'utf8')),
});

let root;
let registryProcess;
try {
  root = await mkdtemp(join(tmpdir(), 'create-file-viewer-bootstrap-e2e-'));
  run('npm', ['run', 'build'], { cwd: packageRoot });
  const candidatesRoot = join(root, 'candidates');
  await mkdir(candidatesRoot);
  const oldCandidate = await createCandidate(candidatesRoot, '2.0.0');
  const mixedCandidate = await createCandidate(candidatesRoot, '2.0.1', '2.1.0');
  const newCandidate = await createCandidate(candidatesRoot, '2.1.0');
  const oldCreateCandidate = await createBootstrapCandidate(candidatesRoot, '2.0.0');
  const newCreateCandidate = await createBootstrapCandidate(candidatesRoot, '2.1.0');

  const localHelp = runBootstrap(root, ['--help', '--lang', 'en', '--non-interactive'], {
    ...process.env,
    npm_config_registry: 'http://127.0.0.1:9/',
    NPM_CONFIG_REGISTRY: 'http://127.0.0.1:9/',
  });
  assert.match(localHelp.stdout, /create-file-viewer version bootstrap/);
  assert.match(localHelp.stdout, /Primary commands/);
  assert.match(localHelp.stdout, /never used as an implicit version-discovery source/);

  const port = await freePort();
  const registry = `http://127.0.0.1:${port}/`;
  const storage = join(root, 'storage');
  const npmrc = join(root, 'npmrc');
  const config = join(root, 'verdaccio.yaml');
  await mkdir(storage);
  await writeFile(npmrc, '');
  await chmod(npmrc, 0o600);
  await writeFile(config, [
    `storage: ${JSON.stringify(storage)}`,
    'auth:',
    '  htpasswd:',
    `    file: ${JSON.stringify(join(root, 'htpasswd'))}`,
    '    max_users: 10',
    'uplinks: {}',
    'packages:',
    "  '@file-viewer/*':",
    '    access: $all',
    '    publish: $authenticated',
    '    unpublish: $authenticated',
    "  '**':",
    '    access: $all',
    '    publish: $authenticated',
    'log: { type: stdout, format: pretty, level: warn }',
    '',
  ].join('\n'));
  registryProcess = spawn('pnpm', ['dlx', 'verdaccio@6.10.0', '--config', config, '--listen', `127.0.0.1:${port}`], {
    cwd: root,
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, NPM_CONFIG_USERCONFIG: npmrc },
  });
  let registryError = '';
  registryProcess.stderr.setEncoding('utf8').on('data', chunk => { registryError = `${registryError}${chunk}`.slice(-8_000); });
  await waitForRegistry(registry, registryProcess).catch(error => {
    throw new Error(`${error.message}\n${registryError}`);
  });
  const username = `bootstrap-${randomBytes(5).toString('hex')}`;
  const password = randomBytes(20).toString('base64url');
  const userResponse = await fetch(`${registry}-/user/org.couchdb.user:${encodeURIComponent(username)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: username, password, email: `${username}@example.invalid`, type: 'user', roles: [] }),
  });
  const userResponseBody = await userResponse.text();
  assert.equal(userResponse.ok, true, userResponseBody);
  const user = JSON.parse(userResponseBody);
  assert.equal(typeof user.token, 'string');
  await writeFile(npmrc, `registry=${registry}\n//127.0.0.1:${port}/:_authToken=${user.token}\n`);
  const registryEnv = {
    ...process.env,
    NPM_CONFIG_USERCONFIG: npmrc,
    npm_config_registry: registry,
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };
  for (const candidate of [oldCandidate, mixedCandidate, newCandidate]) {
    run('npm', ['publish', candidate.dependencyArchive, '--registry', registry, '--access', 'public'], { cwd: root, env: registryEnv });
    run('npm', ['publish', candidate.archive, '--registry', registry, '--access', 'public'], { cwd: root, env: registryEnv });
  }
  for (const candidate of [oldCreateCandidate, newCreateCandidate]) {
    run('npm', ['publish', candidate.archive, '--registry', registry, '--access', 'public'], { cwd: root, env: registryEnv });
  }

  const fixedCreate = run('npm', [
    'create', 'file-viewer@2.0.0', '--', '--help', '--lang', 'en', '--non-interactive',
  ], { cwd: root, env: registryEnv });
  assert.match(fixedCreate.stdout, /candidate CLI 2\.0\.0/);
  assert.doesNotMatch(fixedCreate.stdout, /candidate CLI 2\.1\.0/);
  const latestCreate = run('npm', [
    'create', 'file-viewer@latest', '--', '--help', '--lang', 'en', '--non-interactive',
  ], { cwd: root, env: registryEnv });
  assert.match(latestCreate.stdout, /candidate CLI 2\.1\.0/);

  const registryOldProject = join(root, 'registry-old');
  runBootstrap(root, [
    registryOldProject,
    '--registry', registry,
    '--file-viewer-version', '2.0.0',
    '--non-interactive',
    '--yes',
    '--json',
  ], registryEnv);
  const registryOld = await readProjectEvidence(registryOldProject);
  assert.equal(registryOld.config.catalogVersion, '2.0.0');
  assert.equal(registryOld.config.catalogMarker, 'catalog-2.0.0');
  assert.deepEqual(registryOld.packageJson.dependencies, {
    '@file-viewer/web': '2.0.0',
    '@file-viewer/preset-standard': '2.0.0',
  });

  const registryLatestProject = join(root, 'registry-latest');
  runBootstrap(root, [
    registryLatestProject,
    '--registry', registry,
    '--file-viewer-version', 'latest',
    '--non-interactive',
    '--yes',
  ], registryEnv);
  assert.equal((await readProjectEvidence(registryLatestProject)).config.catalogVersion, '2.1.0');

  const missingSelectionProject = join(root, 'registry-no-selection');
  const missingSelection = runBootstrap(root, [
    missingSelectionProject,
    '--registry', registry,
    '--non-interactive',
    '--yes',
  ], registryEnv, true);
  assert.notEqual(missingSelection.status, 0);
  assert.match(missingSelection.stderr, /requires --file-viewer-version/);
  assert.equal(await stat(missingSelectionProject).then(() => true, () => false), false);

  const mixedProject = join(root, 'registry-mixed');
  const mixed = runBootstrap(root, [
    mixedProject,
    '--registry', registry,
    '--file-viewer-version', '2.0.1',
    '--non-interactive',
    '--yes',
  ], registryEnv, true);
  assert.notEqual(mixed.status, 0);
  assert.match(mixed.stderr, /Refusing to mix release catalogs/);
  assert.equal(await stat(mixedProject).then(() => true, () => false), false);

  const secretProject = join(root, 'registry-secret');
  const secret = runBootstrap(root, [
    secretProject,
    '--registry', `http://user:do-not-print@127.0.0.1:${port}/`,
    '--file-viewer-version', 'latest',
    '--non-interactive',
  ], registryEnv, true);
  assert.notEqual(secret.status, 0);
  assert.equal(`${secret.stdout}${secret.stderr}`.includes('do-not-print'), false);
  assert.equal(await stat(secretProject).then(() => true, () => false), false);

  const offlineRoot = join(root, 'offline');
  await mkdir(offlineRoot);
  await writeOfflineVersion(offlineRoot, oldCandidate);
  await writeOfflineVersion(offlineRoot, newCandidate);
  const offlineOldProject = join(root, 'offline-old');
  runBootstrap(root, [
    offlineOldProject,
    '--offline-dir', offlineRoot,
    '--file-viewer-version', '2.0.0',
    '--non-interactive',
    '--yes',
  ], { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' });
  assert.equal((await readProjectEvidence(offlineOldProject)).config.catalogVersion, '2.0.0');
  const offlineLatestProject = join(root, 'offline-latest');
  runBootstrap(root, [
    offlineLatestProject,
    '--offline-dir', offlineRoot,
    '--file-viewer-version', 'latest',
    '--non-interactive',
    '--yes',
  ], { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' });
  assert.equal((await readProjectEvidence(offlineLatestProject)).config.catalogVersion, '2.1.0');

  process.stdout.write('[create-file-viewer-bootstrap] Verdaccio and two-version offline bootstrap passed.\n');
} finally {
  if (registryProcess?.pid) {
    try {
      process.kill(-registryProcess.pid, 'SIGTERM');
    } catch {
      registryProcess.kill('SIGTERM');
    }
  }
  if (root) await rm(root, { recursive: true, force: true });
}
