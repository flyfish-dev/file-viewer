/**
 * Build core and PDF first, then exercise their packed candidate in a cold npm
 * consumer. --prepare-only checks packaging, installation and the browser bundle
 * without starting a server or browser; it is not a browser verification pass.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { preparePdfReviewBundle } from './pdf-review-harness.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const output = path.resolve(process.env.PDF_HAND_INSTALLED_OUTPUT || path.join(root, 'output/pdf-hand-tool/installed-consumer'));
const prepareOnly = process.argv.includes('--prepare-only');
assert.ok(process.argv.slice(2).every(arg => arg === '--prepare-only'), 'Only --prepare-only is supported');
assert.notEqual(process.env.PDF_REVIEW_IN_MEMORY, '1', 'Installed hand-tool proof requires the local HTTP Worker path');
const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest(algorithm === 'sha512' ? 'base64' : 'hex');
const inside = (file, directory) => file === directory || file.startsWith(directory + path.sep);
const report = {
  status: 'running',
  browserStatus: 'not-run',
  nodeVersion: process.version,
  packages: [],
  checks: [],
  commands: [],
  limitations: [
    'This verifies current packed build output, not packages published to a registry.',
    'Fixture generation, esbuild and Playwright come from the checkout; browser runtime modules and served assets come from the isolated installed consumer.',
  ],
};
await mkdir(path.join(output, 'tarballs'), { recursive: true });
await mkdir(path.join(output, 'consumer'), { recursive: true });
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'file-viewer-pdf-installed-')));
const consumer = path.join(temporary, 'consumer');
const tarballs = path.join(temporary, 'tarballs');
assert.ok(!inside(temporary, await realpath(root)), 'Consumer must be physically outside the checkout');
await mkdir(consumer);
await mkdir(tarballs);

async function run(label, command, args, cwd, env = process.env) {
  const log = createWriteStream(path.join(output, `${label}.log`));
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let tail = '', failure, timedOut = false;
  const capture = bytes => {
    log.write(bytes);
    tail = (tail + bytes.toString('utf8')).slice(-12000);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('error', error => { failure = error; });
  log.on('error', error => { failure = error; child.kill('SIGKILL'); });
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 10 * 60 * 1000);
  const exit = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
  clearTimeout(timer);
  if (!log.destroyed) await new Promise(resolve => log.end(resolve));
  report.commands.push({ label, command, exit, timedOut, log: `${label}.log` });
  if (failure || timedOut || exit.code !== 0) throw Error(`${label} failed: ${failure || (timedOut ? 'deadline exceeded' : `exit ${exit.code}`)}\n${tail}`);
  console.log(`PDF_INSTALLED_STEP ${label} passed`);
  return tail.trim();
}

// Compare all built files, including the staged PDF.js Worker, CMaps and WASM,
// rather than trusting package versions or the provenance file alone.
async function treeHashes(directory) {
  const result = {};
  async function walk(current) {
    for (const item of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(current, item.name);
      assert.ok(!item.isSymbolicLink(), `Built payload must not contain symlinks: ${file}`);
      if (item.isDirectory()) await walk(file);
      else if (item.isFile()) result[path.relative(directory, file).split(path.sep).join('/')] = hash(await readFile(file));
    }
  }
  await walk(directory);
  assert.ok(result['index.js'], `Missing built entry in ${directory}; build core and PDF before running this gate`);
  return result;
}

try {
  const rootMetadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  report.pnpmVersion = await run('pnpm-version', 'pnpm', ['--version'], root);
  assert.equal(`pnpm@${report.pnpmVersion}`, rootMetadata.packageManager, 'Use the repository-pinned pnpm version');
  // Explicit check also protects callers that disabled package lifecycle scripts.
  await run('pdf-runtime-provenance', process.execPath, [path.join(import.meta.dirname, 'stage-pdfjs-runtime.mjs'), '--check'], root);
  const payloads = new Map();
  for (const relative of ['packages/core', 'packages/renderers/pdf']) {
    const folder = path.join(root, relative);
    const metadata = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8'));
    payloads.set(metadata.name, await treeHashes(path.join(folder, 'dist')));
    const before = new Set(await readdir(tarballs));
    await run(`pack-${metadata.name.split('/').pop()}`, 'pnpm', ['pack', '--pack-destination', tarballs], folder);
    const added = (await readdir(tarballs)).filter(name => name.endsWith('.tgz') && !before.has(name));
    assert.equal(added.length, 1, `Expected one tarball for ${metadata.name}`);
    const bytes = await readFile(path.join(tarballs, added[0]));
    const entry = { name: metadata.name, version: metadata.version, tarball: added[0], sha256: hash(bytes), integrity: `sha512-${hash(bytes, 'sha512')}` };
    report.packages.push(entry);
    await copyFile(path.join(tarballs, entry.tarball), path.join(output, 'tarballs', entry.tarball));
  }
  await writeFile(path.join(consumer, 'package.json'), JSON.stringify({
    name: 'pdf-hand-tool-installed-consumer', version: '1.0.0', private: true, type: 'module',
    dependencies: Object.fromEntries(report.packages.map(pkg => [pkg.name, `file:../tarballs/${pkg.tarball}`])),
  }, null, 2) + '\n');
  await writeFile(path.join(temporary, 'user.npmrc'), '');
  await writeFile(path.join(temporary, 'global.npmrc'), '');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^npm_config_/i.test(key) && !['NODE_PATH', 'NODE_OPTIONS', 'NPM_TOKEN', 'NODE_AUTH_TOKEN'].includes(key),
  ));
  Object.assign(env, {
    npm_config_cache: path.join(temporary, 'npm-cache'),
    npm_config_userconfig: path.join(temporary, 'user.npmrc'),
    npm_config_globalconfig: path.join(temporary, 'global.npmrc'),
    NODE_USE_ENV_PROXY: '1',
  });
  const flags = ['--ignore-scripts', '--no-audit', '--no-fund', '--strict-peer-deps', '--omit=optional', '--registry=https://registry.npmjs.org/'];
  await run('cold-install', 'npm', ['install', ...flags], consumer, env);
  await run('clean-lockfile-install', 'npm', ['ci', ...flags], consumer, env);
  for (const filename of ['package.json', 'package-lock.json']) await copyFile(path.join(consumer, filename), path.join(output, 'consumer', filename));
  const lockBytes = await readFile(path.join(consumer, 'package-lock.json'));
  report.lockSha256 = hash(lockBytes);
  const lock = JSON.parse(lockBytes);
  const installed = createRequire(path.join(consumer, 'package.json'));
  const core = report.packages.find(pkg => pkg.name === '@file-viewer/core');
  for (const pkg of report.packages) {
    const directory = path.join(consumer, 'node_modules', pkg.name);
    assert.equal((await lstat(directory)).isSymbolicLink(), false, `${pkg.name} must be physically installed`);
    assert.ok(inside(await realpath(directory), consumer), `${pkg.name} escaped the consumer`);
    const metadata = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    assert.equal(metadata.name, pkg.name);
    assert.equal(metadata.version, pkg.version);
    assert.ok(!Object.values(metadata.dependencies || {}).some(value => value.startsWith('workspace:')), 'Packed manifest retained workspace references');
    if (pkg.name === '@file-viewer/renderer-pdf') assert.equal(metadata.dependencies['@file-viewer/core'], core.version, 'Packed PDF must depend on the exact candidate core');
    const locked = lock.packages[`node_modules/${pkg.name}`];
    assert.equal(locked.version, pkg.version);
    assert.equal(locked.integrity, pkg.integrity, `Lockfile did not select the candidate tarball for ${pkg.name}`);
    assert.equal(locked.resolved, `file:../tarballs/${pkg.tarball}`);
    assert.deepEqual(await treeHashes(path.join(directory, 'dist')), payloads.get(pkg.name), `Installed ${pkg.name} differs from current build output`);
    for (const development of ['src', 'scripts']) {
      await assert.rejects(lstat(path.join(directory, development)), { code: 'ENOENT' }, `Development ${development} must not be packed`);
    }
    report.checks.push({ name: `${pkg.name}: physical tarball, exact version, integrity and complete dist identity`, passed: true, files: Object.keys(payloads.get(pkg.name)).length });
  }
  const rendererRequire = createRequire(installed.resolve('@file-viewer/renderer-pdf'));
  assert.equal(await realpath(rendererRequire.resolve('@file-viewer/core')), await realpath(installed.resolve('@file-viewer/core')), 'Renderer resolved a different core');
  const prepared = await preparePdfReviewBundle({ output: path.join(temporary, 'bundle'), installedRoot: consumer });
  report.checks.push({ name: 'Browser bundle and PDF.js/CJK assets resolve only inside the installed consumer', passed: true, bundleInputs: prepared.bundleInputs.length });
  await rm(prepared.temporary, { recursive: true, force: true });
  if (prepareOnly) {
    report.status = 'prepared';
    console.log('Packed PDF candidate prepared; Chromium/WebKit assertions were not run (--prepare-only).');
  } else {
    report.browserStatus = 'running';
    await run('chromium-webkit-hand-tool', process.execPath, [path.join(import.meta.dirname, 'verify-hand-tool-browser.mjs')], consumer, {
      ...env, PDF_HAND_INSTALLED_ROOT: consumer, PDF_HAND_OUTPUT: path.join(output, 'browsers'),
    });
    const browserReport = JSON.parse(await readFile(path.join(output, 'browsers/report.json'), 'utf8'));
    assert.equal(browserReport.passed, true);
    assert.ok(browserReport.checks.length > 0 && browserReport.checks.every(check => check.passed));
    report.browserStatus = 'passed';
    report.status = 'passed';
  }
} catch (error) {
  report.status = 'failed';
  if (report.browserStatus === 'running') report.browserStatus = 'failed';
  report.error = String(error);
  throw error;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await rm(temporary, { recursive: true, force: true });
}
