import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  chooseVersionInteractively,
  discoverOfflineVersions,
  normalizeBootstrapRegistry,
  parseBootstrapOptions,
} from '../dist/bootstrap.js';

const integrity = value => `sha512-${createHash('sha512').update(value).digest('base64')}`;

async function writeOfflineCandidate(root, version, content = Buffer.from(`cli-${version}`)) {
  const directory = join(root, version);
  const filename = `file-viewer-cli-${version}.tgz`;
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), content);
  await writeFile(join(directory, 'file-viewer-offline-manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    release: version,
    roots: [{ packageName: '@file-viewer/cli', version }],
    files: {
      [filename]: {
        packageName: '@file-viewer/cli',
        version,
        dependencies: {},
        size: content.byteLength,
        integrity: integrity(content),
      },
    },
  }, null, 2)}\n`);
  return { directory, filename };
}

test('bootstrap parsing keeps CLI options while isolating version source options', () => {
  assert.deepEqual(parseBootstrapOptions([
    'demo',
    '--registry',
    'http://127.0.0.1:4873',
    '--file-viewer-version',
    '2.3.0',
    '--non-interactive',
    '--yes',
  ]), {
    forwarded: ['create', 'demo', '--non-interactive', '--yes'],
    requestedVersion: '2.3.0',
    registry: 'http://127.0.0.1:4873',
    offlineDirectory: undefined,
    nonInteractive: true,
    helpOnly: false,
  });
  assert.throws(
    () => parseBootstrapOptions(['--registry', 'https://registry.example', '--offline-dir', 'packs']),
    /mutually exclusive/,
  );
  assert.deepEqual(parseBootstrapOptions([
    'prepare',
    '--registry',
    'https://registry.example',
    '--offline-dir',
    'packs',
    '--file-viewer-version',
    '2.3.0',
    '--non-interactive',
  ]), {
    forwarded: ['prepare', '--offline-dir', 'packs', '--non-interactive'],
    requestedVersion: '2.3.0',
    registry: 'https://registry.example',
    offlineDirectory: undefined,
    nonInteractive: true,
    helpOnly: false,
  });
  assert.deepEqual(
    parseBootstrapOptions(['cache', '--offline-dir=packs', '--non-interactive']).forwarded,
    ['cache', '--offline-dir=packs', '--non-interactive'],
  );
  assert.throws(
    () => parseBootstrapOptions(['--file-viewer-version', '^2.3.0']),
    /exact stable/,
  );
  assert.deepEqual(parseBootstrapOptions(['capabilities', '--json']).forwarded, ['capabilities', '--json']);
});

test('registry URLs cannot carry credentials or ambiguous URL data', () => {
  assert.equal(normalizeBootstrapRegistry('https://registry.example/npm'), 'https://registry.example/npm/');
  assert.equal(normalizeBootstrapRegistry('http://127.0.0.1:4873'), 'http://127.0.0.1:4873/');
  assert.equal(normalizeBootstrapRegistry('http://[::1]:4873'), 'http://[::1]:4873/');
  assert.throws(() => normalizeBootstrapRegistry('https://user:secret@registry.example/npm'), /credential-free/);
  assert.throws(() => normalizeBootstrapRegistry('https://registry.example/npm?token=secret'), /credential-free/);
  assert.throws(() => normalizeBootstrapRegistry('http://registry.example/npm'), /credential-free/);
});

test('offline discovery verifies two manifests, sorts versions, and detects tampering', async () => {
  const root = await mkdtemp(join(tmpdir(), 'create-file-viewer-offline-test-'));
  try {
    await writeOfflineCandidate(root, '2.2.0');
    const older = await writeOfflineCandidate(root, '2.1.0');
    const candidates = await discoverOfflineVersions(root);
    assert.deepEqual(candidates.map(item => item.version), ['2.2.0', '2.1.0']);
    assert(candidates.every(item => item.source === 'offline'));
    await writeFile(join(older.directory, older.filename), 'tampered');
    await assert.rejects(discoverOfflineVersions(root), /integrity mismatch|size mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('interactive version choice uses a numbered stable candidate', async () => {
  const answers = ['invalid', '2'];
  const selected = await chooseVersionInteractively([
    { version: '2.2.0', source: 'registry' },
    { version: '2.1.0', source: 'registry' },
  ], async () => answers.shift() ?? '');
  assert.equal(selected.version, '2.1.0');
});

test('package README documents exact, registry, offline, and non-interactive selection', async () => {
  const readmeEn = await readFile(new URL('../README.en.md', import.meta.url), 'utf8');
  const readmeZh = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  for (const marker of ['--file-viewer-version', '--registry', '--offline-dir', '--non-interactive']) {
    assert(readmeEn.includes(marker), `English README is missing ${marker}`);
    assert(readmeZh.includes(marker), `Chinese README is missing ${marker}`);
  }
  assert.match(readmeEn, /exact matching|exact version/i);
  assert.match(readmeZh, /同版本|精确版本/);
});
