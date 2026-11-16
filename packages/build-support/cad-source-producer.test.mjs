import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import JSZip from 'jszip'
import { CAD_INTEGRATION_SOURCE } from './cad-source-offer.mjs'
import { readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'
import { cadPreferredSourceDigest, cadSourceSnapshotIdentifier, listCadPreferredSourcePaths } from './cad-preferred-source.mjs'
import { assertCadOutputTree, buildCadStandaloneSource, cadGitBlobDigest, captureCadCommittedInputs,
  captureCadPreferredSource, createDeterministicCadArchive,
  generateCadSourceSnapshot, planCadSourceSnapshot, prepareCadSourcePayload } from './cad-source-producer.mjs'

const root = resolve(import.meta.dirname, '../..')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const priorPromise = readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
const json = value => JSON.stringify(value, null, 2) + '\n'
async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), 'cad-source-producer-test-'))
  t.after(() => rm(path, { recursive: true, force: true }))
  // The source-root guard uses canonical paths; macOS /var may be an alias.
  return (await import('node:fs/promises')).realpath(path)
}
async function put(root, path, bytes) {
  await mkdir(dirname(join(root, path)), { recursive: true })
  await writeFile(join(root, path), bytes)
  await chmod(join(root, path), 0o644)
}
async function fixture(t, version = '9.8.7') {
  const path = await temporary(t)
  for (const input of await captureCadPreferredSource(root)) await put(path, input.path, input.bytes)
  for (const directory of ['packages/core', 'packages/renderers/cad']) {
    const name = directory + '/package.json'
    const manifest = JSON.parse(await readFile(join(path, name)))
    manifest.version = version
    if (directory.endsWith('/cad')) manifest.dependencies['@file-viewer/core'] = 'workspace:' + version
    await put(path, name, json(manifest))
  }
  await put(path, 'package.json', json({ name: 'cad-test-source', version }))
  await copyFile(join(root, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip'), join(path, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip'))
  return path
}
async function inventory(root, prefix = '') {
  const entries = []
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? prefix + '/' + entry.name : entry.name
    if (entry.isDirectory()) entries.push(...await inventory(root, path))
    else entries.push({ path, sha256: hash(await readFile(join(root, path))) })
  }
  return entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
}

test('shared input digests preserve JSON formatting tolerance and reject semantic changes', () => {
  const path = 'packages/core/package.json'
  assert.equal(cadPreferredSourceDigest(path, Buffer.from('{"b":2,"a":1}')),
    cadPreferredSourceDigest(path, Buffer.from('{\n "a": 1, "b": 2\n}')))
  assert.notEqual(cadPreferredSourceDigest(path, Buffer.from('{"a":1}')),
    cadPreferredSourceDigest(path, Buffer.from('{"a":2}')))
  assert.notEqual(cadPreferredSourceDigest('packages/core/src/a.ts', Buffer.from('x')),
    cadPreferredSourceDigest('packages/core/src/a.ts', Buffer.from('x\n')))
})

test('new source membership replaces dropped files and includes newly added language modules', async t => {
  const source = await fixture(t), prior = await priorPromise
  const removed = 'packages/core/src/assets.ts'
  await rm(join(source, removed))
  await put(source, 'packages/core/src/i18n/new-language.ts', 'export const language = "synthetic"\n')
  const payload = await prepareCadSourcePayload(source, '9.8.7', prior)
  assert.ok(!payload.files.has(removed))
  assert.ok(payload.files.has('packages/core/src/i18n/new-language.ts'))
  assert.deepEqual(payload.preferred.map(input => input.path), await listCadPreferredSourcePaths(source))
  const manifest = { preferredSourceInputs: payload.preferred }
  await verifyCadPreferredSourceInputs(source, manifest)
  await put(source, 'packages/core/src/i18n/late.ts', 'export {}\n')
  await assert.rejects(verifyCadPreferredSourceInputs(source, manifest), /omits or adds/)
})

test('standalone adaptations bind original inputs, normalize only local lock metadata and retain all grants', async t => {
  const source = await fixture(t), prior = await priorPromise
  const payload = await prepareCadSourcePayload(source, '9.8.7', prior)
  for (const [path, bytes] of prior.files)
    if (path.startsWith('LICENSES/') || /LICENSE|NOTICE|^PRIOR_/.test(path)) assert.deepEqual(payload.files.get(path), bytes)
  const core = JSON.parse(payload.files.get('packages/core/package.json'))
  const cad = JSON.parse(payload.files.get('packages/renderers/cad/package.json'))
  assert.equal(core.scripts, undefined)
  assert.equal(core.devDependencies, undefined)
  assert.equal(cad.dependencies['@file-viewer/core'], '9.8.7')
  assert.equal(payload.preferred.find(input => input.path === 'packages/renderers/cad/package.json').sha256,
    cadPreferredSourceDigest('packages/renderers/cad/package.json', await readFile(join(source, 'packages/renderers/cad/package.json'))))
  const oldLock = JSON.parse(prior.files.get('package-lock.json')), lock = JSON.parse(payload.files.get('package-lock.json'))
  assert.equal(lock.packages['packages/core'].version, '9.8.7')
  assert.equal(lock.packages['packages/renderers/cad'].dependencies['@file-viewer/core'], '9.8.7')
  for (const [path, entry] of Object.entries(oldLock.packages))
    if (path && !['packages/core', 'packages/renderers/cad'].includes(path)) assert.deepEqual(lock.packages[path], entry)
  assert.deepEqual(payload.files.get('build.mjs'), prior.files.get('build.mjs'))
  const revised = await prepareCadSourcePayload(source, '9.8.7', {
    ...prior, manifest: { ...prior.manifest, sourceRevision: 'r1' }
  })
  assert.equal(revised.priorReadme, `PRIOR_QUALIFICATION_${prior.manifest.releaseVersion}-r1_README.md`)
  assert.deepEqual(revised.files.get(revised.priorReadme), prior.files.get('README.md'))
})

test('an external dependency, optional dependency or original grant change requires review', async t => {
  const source = await fixture(t), prior = await priorPromise
  const path = 'packages/core/package.json', original = await readFile(join(source, path))
  for (const group of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    const manifest = JSON.parse(original)
    manifest[group] = { ...manifest[group], 'unreviewed-dependency': '1.0.0' }
    await put(source, path, json(manifest))
    await assert.rejects(prepareCadSourcePayload(source, '9.8.7', prior), /external dependencies changed/)
  }
  await put(source, path, original)
  await put(source, 'LICENSE', 'changed grant')
  await assert.rejects(prepareCadSourcePayload(source, '9.8.7', prior), /grant\/notice requires separate review/)
})

test('symlinked preferred inputs and output trees are rejected without following them', async t => {
  const source = await fixture(t), target = await temporary(t)
  await put(target, 'secret.ts', 'not a source input')
  await symlink(join(target, 'secret.ts'), join(source, 'packages/core/src/linked.ts'))
  await assert.rejects(captureCadPreferredSource(source), /symlink/)
  const link = join(target, 'output-link')
  await symlink(source, link)
  await assert.rejects(assertCadOutputTree(link, new Map()), /Unsafe existing CAD output/)
})

test('default plan leaves the entire fixture unchanged and cannot qualify dirty/uncommitted source', async t => {
  const source = await fixture(t), before = await inventory(source)
  const { plan } = await planCadSourceSnapshot({ sourceRoot: source, version: '9.8.7' })
  assert.ok(plan.blockers.some(message => message.includes('clean committed')))
  assert.ok(plan.blockers.some(message => message.includes('committed Git tree')))
  assert.equal(plan.toolchain.node, process.versions.node)
  assert.equal(plan.toolchain.nodeExecutable, process.execPath)
  assert.equal(plan.runtime, null)
  assert.equal(plan.releaseReady, false)
  assert.deepEqual(await inventory(source), before)
  await assert.rejects(generateCadSourceSnapshot({ sourceRoot: source, version: '9.8.7' }), /generation blocked/)
  assert.deepEqual(await inventory(source), before)
  const old = await planCadSourceSnapshot({ sourceRoot: source, version: CAD_INTEGRATION_SOURCE.releaseVersion })
  assert.ok(old.plan.blockers.some(message => message.includes('new version')))
})

test('explicit same-release revisions use new destinations and retain every source/worktree guard', async t => {
  const version = CAD_INTEGRATION_SOURCE.releaseVersion
  const source = await fixture(t, version), prior = await priorPromise
  const revision = 'ci-recovery-20261114'
  const { plan } = await planCadSourceSnapshot({ sourceRoot: source, version, sourceRevision: revision })
  assert.equal(plan.snapshotId, `${version}-${revision}`)
  assert.equal(plan.sourceRevision, revision)
  assert.ok(plan.snapshot.endsWith(`/cad-source-snapshots/${version}-${revision}`))
  assert.ok(plan.output.endsWith(`/cad-source/${version}-${revision}`))
  assert.ok(!plan.blockers.some(message => message.includes('new version')))
  assert.ok(plan.blockers.some(message => message.includes('clean committed')))
  assert.equal(plan.releaseReady, false)
  assert.equal(plan.publicSourceVerified, false)
  assert.equal(plan.actualFullVerified, false)
  const original = await readFile(join(source, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip'))
  await assert.rejects(generateCadSourceSnapshot({ sourceRoot: source, version, sourceRevision: revision }), /generation blocked/)
  assert.deepEqual(await readFile(join(source, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip')), original)
  await put(source, 'packages/components/web-full/scripts/offline-asset-sanitize.mjs',
    prior.files.get('packages/components/web-full/scripts/offline-asset-sanitize.mjs'))
  const unchanged = await planCadSourceSnapshot({ sourceRoot: source, version, sourceRevision: revision })
  assert.ok(unchanged.plan.blockers.some(message => message.includes('requires changed preferred-source inputs')))
  const older = await planCadSourceSnapshot({ sourceRoot: source, version: '0.0.1', sourceRevision: revision })
  assert.ok(older.plan.blockers.some(message => message.includes('new version')))
})

test('revision identifiers cannot escape, collide with the base directory or change release versions', () => {
  assert.equal(cadSourceSnapshotIdentifier('3.3.4'), '3.3.4')
  assert.equal(cadSourceSnapshotIdentifier('3.3.4', ''), '3.3.4')
  assert.equal(cadSourceSnapshotIdentifier('3.3.4', 'r1'), '3.3.4-r1')
  for (const revision of ['../outside', 'a/b', 'a\\b', '.', 'R1', 'r1-', 'r--1', 'x'.repeat(49)])
    assert.throws(() => cadSourceSnapshotIdentifier('3.3.4', revision), /safe CAD source revision/)
  assert.throws(() => cadSourceSnapshotIdentifier('3.3.4-r1', 'r2'), /explicit source version/)
})

test('a revised ZIP binds the exact revision without altering the retained archive', async t => {
  const prior = await priorPromise, directory = await temporary(t)
  const files = new Map(prior.files)
  const manifest = { ...prior.manifest, sourceRevision: 'control-r1' }
  files.set('SOURCE_MANIFEST.json', Buffer.from(json(manifest)))
  const bytes = await createDeterministicCadArchive(files, manifest.releaseVersion)
  await put(directory, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip', bytes)
  const proof = { ...CAD_INTEGRATION_SOURCE, sourceRevision: 'control-r1', sha256: hash(bytes), bytes: bytes.length }
  assert.equal((await readCadCorrespondingSource(directory, proof)).manifest.sourceRevision, 'control-r1')
  await assert.rejects(readCadCorrespondingSource(directory, { ...proof, sourceRevision: 'control-r2' }), /source revision changed/)
  await assert.rejects(readCadCorrespondingSource(directory, { ...proof, sourceRevision: '' }), /requires a source revision/)
  assert.deepEqual(await readFile(join(root, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip')), prior.bytes)
})

test('archive bytes are order- and timezone-independent, with no implicit directories or private members', async () => {
  const files = new Map([['z.ts', Buffer.from('last')], ['LICENSE', Buffer.from('original grant')], ['a.ts', Buffer.from('first')]])
  const bytes = await createDeterministicCadArchive(files, '9.8.7')
  assert.deepEqual(bytes, await createDeterministicCadArchive(new Map([...files].reverse()), '9.8.7'))
  const zip = await JSZip.loadAsync(bytes)
  for (const entry of Object.values(zip.files)) {
    assert.equal(entry.dir, false)
    assert.equal(entry.unixPermissions & 0o177777, 0o100644)
  }
  const producerUrl = pathToFileURL(join(import.meta.dirname, 'cad-source-producer.mjs')).href
  const script = `import {createDeterministicCadArchive} from ${JSON.stringify(producerUrl)};import {createHash} from 'node:crypto';console.log(createHash('sha256').update(await createDeterministicCadArchive(new Map([['a',Buffer.from('same')]]),'9.8.7')).digest('hex'))`
  const hashes = ['UTC', 'Asia/Shanghai', 'America/Los_Angeles'].map(TZ => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, TZ } })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  })
  assert.equal(new Set(hashes).size, 1)
  for (const path of ['../escape', '/absolute', '.git/config', 'node_modules/pkg/index.js', 'a\\b'])
    await assert.rejects(createDeterministicCadArchive(new Map([[path, Buffer.from('bad')]]), '9.8.7'), /Unsafe/)
})

test('existing different bytes, missing/extra files or modes fail without modifying the destination', async t => {
  const target = await temporary(t), files = new Map([['a', Buffer.from('same')]])
  await put(target, 'a', files.get('a'))
  await assertCadOutputTree(target, files)
  await assert.rejects(assertCadOutputTree(target, new Map([['a', Buffer.from('different')]])), /different bytes/)
  assert.equal((await readFile(join(target, 'a'))).toString(), 'same')
  await assert.rejects(assertCadOutputTree(target, new Map([...files, ['missing', Buffer.from('x')]])), /membership differs/)
  await put(target, 'extra', 'x')
  await assert.rejects(assertCadOutputTree(target, files), /different bytes/)
  await rm(join(target, 'extra'))
  await chmod(join(target, 'a'), 0o600)
  await assert.rejects(assertCadOutputTree(target, files), /mode differs/)
})

test('a real failed standalone build records logs but never returns a measured runtime', async t => {
  const work = await temporary(t)
  const pkg = { name: 'cad-producer-failure-fixture', version: '9.8.7', private: true, type: 'module' }
  const files = new Map([
    ['package.json', Buffer.from(json(pkg))],
    ['package-lock.json', Buffer.from(json({ ...pkg, lockfileVersion: 3, requires: true, packages: { '': pkg } }))],
    ['build.mjs', Buffer.from('process.exit(37)\n')]
  ])
  const npmCli = resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')
  await assert.rejects(buildCadStandaloneSource(work, files, { npmCli }), /cold build failed/)
  assert.ok((await lstat(join(work, 'build.log'))).isFile())
  assert.equal(await lstat(join(work, 'SOURCE_MANIFEST.json')).then(() => true, () => false), false)
  assert.equal(await lstat(join(work, 'generation-receipt.json')).then(() => true, () => false), false)
})

test('cold builds refuse a retained compiled output before invoking installation', async t => {
  const work = await temporary(t)
  await assert.rejects(buildCadStandaloneSource(work,
    new Map([['dist/cad.iife.js', Buffer.from('stale compiled output')]]), {}), /pre-existing output/)
  assert.equal(await lstat(join(work, 'install.log')).then(() => true, () => false), false)
})

test('HEAD byte and mode binding detects both hidden-index flags and staged changes in isolated Git fixtures', async t => {
  const directory = await temporary(t)
  const git = (...args) => {
    const run = spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=' + join(directory, '.git/empty-hooks'),
      ...args], { cwd: directory, encoding: 'utf8' })
    assert.equal(run.status, 0, run.stderr)
    return run.stdout.trim()
  }
  git('init', '--quiet')
  await mkdir(join(directory, '.git/empty-hooks'))
  git('config', 'user.name', 'CAD source test fixture')
  git('config', 'user.email', 'cad-source-test@example.invalid')
  git('config', 'core.filemode', 'true')
  await put(directory, 'input.ts', 'export const committed = true\n')
  await put(directory, 'package.json', '{"version":"9.8.7"}\n')
  git('add', '--', 'input.ts', 'package.json')
  git('commit', '--quiet', '-m', 'Isolated test fixture')
  const paths = ['input.ts', 'package.json']
  assert.deepEqual((await captureCadCommittedInputs(directory, paths)).blockers, [])
  const blob = git('hash-object', 'input.ts')
  assert.equal(cadGitBlobDigest(await readFile(join(directory, 'input.ts')), git('rev-parse', '--show-object-format')), blob)
  for (const [flag, clear, path] of [
    ['--assume-unchanged', '--no-assume-unchanged', 'input.ts'],
    ['--skip-worktree', '--no-skip-worktree', 'package.json']
  ]) {
    const bytes = await readFile(join(directory, path))
    git('update-index', flag, '--', path)
    await writeFile(join(directory, path), Buffer.concat([bytes, Buffer.from('\n ')]))
    assert.equal(git('status', '--porcelain'), '', 'Fixture must demonstrate a hidden clean status')
    assert.ok((await captureCadCommittedInputs(directory, paths)).blockers.some(message => message.includes('HEAD bytes: ' + path)))
    await writeFile(join(directory, path), bytes)
    git('update-index', clear, '--', path)
  }
  await put(directory, 'input.ts', 'export const staged = true\n')
  git('add', '--', 'input.ts')
  assert.ok((await captureCadCommittedInputs(directory, paths)).blockers.some(message => message.includes('HEAD bytes: input.ts')))
  git('reset', '--quiet', 'HEAD', '--', 'input.ts')
  await put(directory, 'input.ts', 'export const committed = true\n')
  git('config', 'core.filemode', 'false')
  await chmod(join(directory, 'input.ts'), 0o755)
  assert.equal(git('status', '--porcelain'), '')
  assert.ok((await captureCadCommittedInputs(directory, paths)).blockers.some(message => message.includes('HEAD mode: input.ts')))
})

test('the retained qualified 3.3.3 snapshot still satisfies the legacy archive and input contracts', async t => {
  const directory = await temporary(t)
  const oldRoot = join(root, 'packages/build-support/cad-source-snapshots/3.3.3')
  const oldManifest = JSON.parse(await readFile(join(oldRoot, 'SOURCE_MANIFEST.json')))
  const files = new Map()
  for (const path of [...oldManifest.files.map(entry => entry.path), 'SOURCE_MANIFEST.json'])
    files.set(path, await readFile(join(oldRoot, path)))
  const bytes = await createDeterministicCadArchive(files, '3.3.3')
  await put(directory, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip', bytes)
  const decoded = await readCadCorrespondingSource(directory, {
    releaseVersion: '3.3.3', sha256: hash(bytes), bytes: bytes.length, files: files.size,
    runtimeBytes: oldManifest.runtime.bytes, runtimeSha256: oldManifest.runtime.sha256
  })
  assert.deepEqual(decoded.manifest, oldManifest)
  assert.deepEqual([...decoded.files.keys()].sort(), [...files.keys()].sort())
  for (const [path, original] of files) assert.deepEqual(decoded.files.get(path), original)
  const manifest = { preferredSourceInputs: await captureCadPreferredSource(root) }
  await verifyCadPreferredSourceInputs(root, manifest)
  const changed = structuredClone(manifest)
  changed.preferredSourceInputs[0].sha256 = '0'.repeat(64)
  await assert.rejects(verifyCadPreferredSourceInputs(root, changed), /source is stale/)
})
