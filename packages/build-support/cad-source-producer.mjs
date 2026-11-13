import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import JSZip from 'jszip'
import { CAD_INTEGRATION_SOURCE } from './cad-source-offer.mjs'
import { readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'
import { cadPreferredSourceDigest, cadPreferredSourceHashMode, listCadPreferredSourcePaths } from './cad-preferred-source.mjs'
import { readCadBuildToolchain } from './cad-rebuild-toolchain.mjs'

export const CAD_SOURCE_PRODUCER_TOOLCHAIN = Object.freeze({ node: '24.20.0', npm: '11.19.0' })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n')
const stableVersion = /^\d+\.\d+\.\d+$/
const compareVersions = (a, b) => {
  const left = a.split('.').map(Number), right = b.split('.').map(Number)
  for (let index = 0; index < 3; index++) if (left[index] !== right[index]) return left[index] - right[index]
  return 0
}
const exists = async path => {
  try { return await lstat(path) } catch (error) { if (error.code === 'ENOENT') return undefined; throw error }
}
const legalPath = path => path.startsWith('LICENSES/') || /(?:^|\/)(?:[^/]*(?:LICENSE|COPYING|NOTICE)[^/]*|PRIOR_[^/]*)$/i.test(path)
const compareStrings = (a, b) => a < b ? -1 : a > b ? 1 : 0
const controlInputs = [
  'package.json', 'pnpm-lock.yaml',
  'packages/renderers/cad/CORRESPONDING_SOURCE.zip',
  'packages/build-support/cad-source-offer.mjs',
  'packages/build-support/cad-corresponding-source.mjs',
  'packages/build-support/cad-preferred-source.mjs',
  'packages/build-support/cad-rebuild-toolchain.mjs',
  'packages/build-support/cad-source-producer.mjs',
  'packages/build-support/generate-cad-source-snapshot.mjs'
]

async function regularBytes(root, path) {
  assert.ok(path && !path.startsWith('/') && !path.includes('\\') &&
    path.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe CAD source path')
  let current = root
  for (const part of path.split('/')) {
    current = join(current, part)
    assert.ok(!(await lstat(current)).isSymbolicLink(), 'Unsafe CAD source path symlink: ' + path)
  }
  assert.ok((await lstat(current)).isFile(), 'CAD source input must be a regular file: ' + path)
  return readFile(current)
}

function sourceIdentity(root) {
  const run = args => spawnSync('git', ['--no-optional-locks', ...args], { cwd: root, encoding: 'utf8', shell: false })
  const top = run(['rev-parse', '--show-toplevel']), head = run(['rev-parse', 'HEAD'])
  const status = run(['status', '--porcelain=v1', '--untracked-files=all'])
  return {
    gitRoot: top.status === 0 ? resolve(top.stdout.trim()) : null,
    commit: head.status === 0 ? head.stdout.trim() : null,
    clean: status.status === 0 && !status.stdout.trim(),
    changes: status.status === 0 ? status.stdout.trim().split('\n').filter(Boolean) : ['Not a Git worktree']
  }
}

export const cadGitBlobDigest = (bytes, format = 'sha1') => {
  assert.ok(['sha1', 'sha256'].includes(format), 'Unsupported Git object format')
  return createHash(format).update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex')
}

/** Compare real bytes directly with HEAD, independently of index stat flags. */
export async function captureCadCommittedInputs(root, paths) {
  const run = args => spawnSync('git', ['--no-optional-locks', ...args], { cwd: root, encoding: 'utf8', shell: false })
  const format = run(['rev-parse', '--show-object-format'])
  const names = [...new Set(paths)].sort()
  const tree = run(['ls-tree', '-z', 'HEAD', '--', ...names])
  if (format.status !== 0 || tree.status !== 0)
    return { inputs: [], blockers: ['Cannot bind CAD source inputs to a committed Git tree'] }
  const entries = new Map(tree.stdout.split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755) blob ([a-f0-9]+)\t(.+)$/.exec(line)
    assert.ok(match, 'CAD committed input is not a regular Git blob')
    return [match[3], { mode: match[1], blob: match[2] }]
  }))
  const inputs = [], blockers = []
  for (const path of names) {
    const entry = entries.get(path)
    if (!entry) { blockers.push('CAD source input is absent from HEAD: ' + path); continue }
    const bytes = await regularBytes(root, path)
    const workingMode = (await lstat(join(root, path))).mode & 0o100 ? '100755' : '100644'
    if (workingMode !== entry.mode) blockers.push('CAD source input differs from HEAD mode: ' + path)
    if (cadGitBlobDigest(bytes, format.stdout.trim()) !== entry.blob)
      blockers.push('CAD source input differs from HEAD bytes: ' + path)
    inputs.push({ path, gitMode: entry.mode, workingMode, gitBlob: entry.blob, sha256: hash(bytes) })
  }
  return { inputs, blockers }
}

async function captureControllerInputs() {
  const controllerRoot = resolve(import.meta.dirname, '../..')
  const result = []
  for (const path of controlInputs.filter(path => path.startsWith('packages/build-support/')))
    result.push({ path, sha256: hash(await regularBytes(controllerRoot, path)) })
  return result
}

async function producerToolchain() {
  const require = createRequire(import.meta.url)
  const zipPackage = JSON.parse(await readFile(require.resolve('jszip/package.json')))
  const candidates = [resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
    join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')]
  let npmCli
  for (const path of candidates) if (await exists(path)) { npmCli = path; break }
  const npm = npmCli && spawnSync(process.execPath, [npmCli, '--version'], { encoding: 'utf8', shell: false })
  return {
    node: process.versions.node, npm: npm?.status === 0 ? npm.stdout.trim() : null,
    nodeExecutable: process.execPath, npmCli,
    nodeSha256: hash(await readFile(process.execPath)),
    npmCliSha256: npmCli ? hash(await readFile(npmCli)) : null,
    jszip: zipPackage.version,
    platform: process.platform, arch: process.arch
  }
}

export async function captureCadPreferredSource(root) {
  const result = []
  for (const path of await listCadPreferredSourcePaths(root)) {
    const bytes = await regularBytes(root, path)
    result.push({ path, hashMode: cadPreferredSourceHashMode(path), sha256: cadPreferredSourceDigest(path, bytes), bytes })
  }
  return result
}

const externalDependencies = (manifest, group) => Object.fromEntries(Object.entries(manifest[group] || {})
  .filter(([name]) => name !== '@file-viewer/core').sort(([a], [b]) => compareStrings(a, b)))

async function safeOutputAncestors(root, target) {
  const path = relative(root, target)
  assert.ok(path && !path.startsWith('..') && !path.startsWith('/'), 'CAD output escapes the source root')
  let current = root
  for (const part of path.split('/')) {
    current = join(current, part)
    const info = await exists(current)
    if (!info) break
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Unsafe CAD output directory: ' + current)
  }
}

/** Adapt only npm workspace metadata; every original input digest is retained separately. */
export async function prepareCadSourcePayload(root, version, prior) {
  const preferred = await captureCadPreferredSource(root)
  const files = new Map(prior.files)
  files.delete('SOURCE_MANIFEST.json')
  for (const input of prior.manifest.preferredSourceInputs) files.delete(input.path)
  for (const input of preferred) files.set(input.path, input.bytes)
  const transformations = []
  const manifests = {}
  const coreVersion = JSON.parse(files.get('packages/core/package.json')).version
  for (const directory of ['packages/core', 'packages/renderers/cad']) {
    const path = directory + '/package.json'
    const manifest = JSON.parse(files.get(path)), old = JSON.parse(prior.files.get(path))
    for (const group of ['dependencies', 'optionalDependencies', 'peerDependencies'])
      assert.deepEqual(externalDependencies(manifest, group), externalDependencies(old, group),
        'CAD external dependencies changed; review a new standalone lock before generating: ' + path + ' ' + group)
    assert.equal(manifest.license, old.license, 'CAD package grant changed; separate review required: ' + path)
    const omitted = ['scripts', 'devDependencies'].filter(key => key in manifest)
    for (const key of omitted) delete manifest[key]
    const replacements = []
    for (const group of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, specifier] of Object.entries(manifest[group] || {})) {
        if (name === '@file-viewer/core') {
          assert.ok(specifier === coreVersion || specifier === 'workspace:' + coreVersion, 'Unexpected internal CAD dependency')
          if (specifier !== version) replacements.push({ group, name, from: specifier, to: version })
          manifest[group][name] = version
        } else assert.ok(!/^(?:workspace:|file:|link:)/.test(specifier), 'Unreviewed standalone local dependency: ' + name)
      }
    }
    files.set(path, json(manifest))
    manifests[directory] = manifest
    transformations.push({ path, kind: 'standalone-npm-manifest', omitted, replacements })
  }
  const packageJson = JSON.parse(files.get('package.json'))
  packageJson.version = version
  assert.deepEqual(packageJson.workspaces, ['packages/core', 'packages/renderers/cad'])
  assert.deepEqual(packageJson.scripts, { build: 'node build.mjs' }, 'Unreviewed standalone build recipe')
  files.set('package.json', json(packageJson))
  const lock = JSON.parse(files.get('package-lock.json'))
  assert.equal(lock.lockfileVersion, 3, 'Unsupported standalone lock')
  lock.version = version
  lock.packages[''].version = version
  for (const [directory, manifest] of Object.entries(manifests)) {
    const entry = lock.packages[directory]
    assert.ok(entry && entry.name === manifest.name, 'Standalone lock omits a local workspace')
    entry.version = version
    for (const group of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      if (manifest[group]) entry[group] = structuredClone(manifest[group])
      else delete entry[group]
    }
  }
  files.set('package-lock.json', json(lock))
  transformations.push({ path: 'package.json', kind: 'standalone-release-version', version },
    { path: 'package-lock.json', kind: 'local-workspace-metadata-only', version })
  const priorReadme = `PRIOR_QUALIFICATION_${prior.manifest.releaseVersion}_README.md`
  if (files.has(priorReadme)) assert.ok(files.get(priorReadme).equals(prior.files.get('README.md')), 'Conflicting prior README')
  files.set(priorReadme, prior.files.get('README.md'))
  transformations.push({ path: 'README.md', kind: 'generated-source-instructions', retainedPriorReadme: priorReadme })
  for (const [path, bytes] of prior.files) if (legalPath(path)) {
    assert.ok(files.get(path)?.equals(bytes), 'Original CAD grant/notice bytes changed: ' + path)
    if (await exists(join(root, path)))
      assert.ok(bytes.equals(await regularBytes(root, path)), 'Current CAD grant/notice requires separate review: ' + path)
  }
  return { files, preferred, transformations, priorReadme }
}

export async function planCadSourceSnapshot({ sourceRoot, version }) {
  assert.match(version, stableVersion, 'An explicit stable --version x.y.z is required')
  const root = resolve(sourceRoot)
  assert.equal(await realpath(root), root, 'CAD source root cannot be a symlink')
  const prior = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
  const payload = await prepareCadSourcePayload(root, version, prior)
  const identity = sourceIdentity(root), toolchain = await producerToolchain()
  const blockers = []
  if (identity.gitRoot !== root || !identity.commit || !identity.clean) blockers.push('Source must be a clean committed Git worktree root')
  const committed = await captureCadCommittedInputs(root, [...controlInputs, ...payload.preferred.map(input => input.path)])
  blockers.push(...committed.blockers)
  const controllerInputs = await captureControllerInputs()
  for (const input of controllerInputs)
    if (committed.inputs.find(entry => entry.path === input.path)?.sha256 !== input.sha256)
      blockers.push('Executing CAD controller differs from committed source root: ' + input.path)
  if (compareVersions(version, prior.manifest.releaseVersion) <= 0) blockers.push('Only a new version newer than the retained archive may be generated')
  for (const path of ['package.json', 'packages/core/package.json', 'packages/renderers/cad/package.json']) {
    const manifest = JSON.parse(await regularBytes(root, path))
    if (manifest.version !== version) blockers.push(`${path} version is ${manifest.version}, expected ${version}`)
  }
  for (const name of ['node', 'npm']) if (toolchain[name] !== CAD_SOURCE_PRODUCER_TOOLCHAIN[name])
    blockers.push(`Recipe requires ${name} ${CAD_SOURCE_PRODUCER_TOOLCHAIN[name]}, actual ${toolchain[name] || 'unavailable'}`)
  const snapshot = join(root, 'packages/build-support/cad-source-snapshots', version)
  const output = join(root, '.release/cad-source', version)
  await safeOutputAncestors(root, snapshot)
  await safeOutputAncestors(root, output)
  const plan = {
    mode: 'plan', version, sourceRoot: root, sourceCommit: identity.commit, clean: identity.clean,
    previousVersion: prior.manifest.releaseVersion, priorArchiveSha256: hash(prior.bytes),
    preferredSourceInputs: payload.preferred.map(({ bytes, ...entry }) => ({ ...entry, bytes: bytes.length })),
    transformations: payload.transformations, toolchain, requiredToolchain: CAD_SOURCE_PRODUCER_TOOLCHAIN,
    committedInputs: committed.inputs,
    controllerInputs,
    snapshot, output, existingSnapshot: Boolean(await exists(snapshot)), blockers,
    writes: [snapshot, join(output, 'CORRESPONDING_SOURCE.zip'), join(output, 'generation-receipt.json')],
    runtime: null, publicSourceVerified: false, actualFullVerified: false, releaseReady: false
  }
  return { plan, payload, prior }
}

export async function createDeterministicCadArchive(files, version) {
  assert.match(version, stableVersion)
  const zip = new JSZip()
  for (const path of [...files.keys()].sort()) {
    assert.ok(path && !path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..' &&
      !['node_modules', '.git', '.npmrc', '.release', '.agents', '.codex'].includes(part)), 'Unsafe CAD archive member')
    zip.file(`file-viewer-cad-corresponding-source-${version}/${path}`, files.get(path), {
      // The pinned JSZip encodes DOS date fields through UTC getters.
      date: new Date('1980-01-01T00:00:00Z'), unixPermissions: 0o100644, createFolders: false
    })
  }
  return zip.generateAsync({ type: 'nodebuffer', platform: 'UNIX', compression: 'DEFLATE', compressionOptions: { level: 9 } })
}

async function writeFiles(root, files) {
  for (const [path, bytes] of files) {
    const target = join(root, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes, { flag: 'wx', mode: 0o644 })
    await chmod(target, 0o644)
  }
}

export async function buildCadStandaloneSource(work, files, toolchain) {
  await writeFiles(work, files)
  for (const path of ['node_modules', 'dist', '.generated', 'packages/core/dist', 'packages/renderers/cad/dist'])
    assert.ok(!await exists(join(work, path)), 'CAD cold build contains a pre-existing output: ' + path)
  const commands = [
    [toolchain.npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/'],
    [join(work, 'build.mjs')]
  ]
  for (let index = 0; index < commands.length; index++) {
    const result = spawnSync(process.execPath, commands[index], { cwd: work, shell: false, timeout: 600_000,
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    await writeFile(join(work, index ? 'build.log' : 'install.log'), `${result.stdout || ''}${result.stderr || ''}`)
    if (result.error) throw result.error
    assert.equal(result.status, 0, `CAD ${index ? 'cold build' : 'frozen install'} failed; logs retained in ${work}`)
  }
  for (const [path, original] of files) assert.ok(original.equals(await regularBytes(work, path)), 'CAD build changed an archived input: ' + path)
  const runtime = await regularBytes(work, 'dist/cad.iife.js')
  assert.ok(runtime.length > 0, 'CAD cold build emitted an empty runtime')
  const installed = await readCadBuildToolchain(join(work, 'package.json'))
  const declared = JSON.parse(files.get('package.json')).devDependencies
  for (const name of ['typescript', 'vite', 'esbuild']) assert.equal(installed.versions[name], declared[name], 'CAD installed build tool differs from its lock: ' + name)
  return { runtime, installed: installed.versions }
}

export async function assertCadOutputTree(root, files) {
  const paths = []
  async function walk(directory, prefix = '') {
    assert.ok(!(await lstat(directory)).isSymbolicLink(), 'Unsafe existing CAD output directory')
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix ? prefix + '/' + entry.name : entry.name
      assert.ok(!entry.isSymbolicLink(), 'Unsafe existing CAD output symlink')
      if (entry.isDirectory()) await walk(join(directory, entry.name), path)
      else {
        assert.ok(entry.isFile(), 'Unsafe existing CAD output member')
        paths.push(path)
        assert.ok(files.has(path) && files.get(path).equals(await readFile(join(directory, entry.name))), 'Existing CAD output has different bytes: ' + path)
        assert.equal((await lstat(join(directory, entry.name))).mode & 0o777, 0o644, 'Existing CAD output mode differs: ' + path)
      }
    }
  }
  await walk(root)
  assert.deepEqual(paths.sort(), [...files.keys()].sort(), 'Existing CAD output membership differs')
}

async function publishNewTree(path, files) {
  if (await exists(path)) { await assertCadOutputTree(path, files); return }
  // Exclusive mkdir and wx files preserve every pre-existing target, including a
  // concurrently created one. Interrupted final copies are evidence, never pass.
  await mkdir(dirname(path), { recursive: true })
  await mkdir(path)
  await writeFiles(path, files)
}

export async function generateCadSourceSnapshot(options) {
  const { plan, payload, prior } = await planCadSourceSnapshot(options)
  assert.deepEqual(plan.blockers, [], 'CAD source generation blocked: ' + plan.blockers.join('; '))
  const lock = join(dirname(plan.output), `producer-${plan.version}.lock`)
  await mkdir(dirname(lock), { recursive: true })
  await mkdir(lock) // Exclusive ownership; do not remove another run's stale lock.
  const lockIdentity = await lstat(lock)
  const ownLock = async () => {
    const current = await exists(lock)
    return current?.isDirectory() && !current.isSymbolicLink() &&
      current.ino === lockIdentity.ino && current.dev === lockIdentity.dev
  }
  let temporary
  let passed = false
  try {
    temporary = await mkdtemp(join(tmpdir(), 'file-viewer-cad-source-producer-'))
    const buildRoot = join(temporary, 'source-build')
    await mkdir(buildRoot)
    // This README contains instructions only; runtime fingerprints are formed
    // below from the real output, never accepted as CLI arguments or old proof.
    payload.files.set('README.md', Buffer.from(`# CAD corresponding source ${plan.version}\n\nComplete preferred sources, original grants/notices and an exact standalone npm lock.\nUse Node.js ${plan.toolchain.node} and npm ${plan.toolchain.npm}. Run npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/, then npm run build.\nSOURCE_MANIFEST.json records original input and adapted file digests, the measured runtime, and the build-tool versions.\nThis local snapshot does not establish immutable public availability, actual Full equivalence or release acceptance.\nHistorical qualification instructions remain in ${payload.priorReadme}; their claims apply only to that prior archive.\n`))
    const built = await buildCadStandaloneSource(buildRoot, payload.files, plan.toolchain)
    const runtime = { bytes: built.runtime.length, sha256: hash(built.runtime) }
    const preferredSourceInputs = payload.preferred.map(({ bytes, ...input }) => ({
      ...input, archiveSha256: hash(payload.files.get(input.path))
    }))
    const manifest = {
      schemaVersion: 1, releaseVersion: plan.version, priorArchiveSha256: plan.priorArchiveSha256,
      preferredSourceInputs, manifestNormalization: payload.transformations,
      producerInputs: plan.committedInputs,
      controllerInputs: plan.controllerInputs,
      runtime, upstream: prior.manifest.upstream,
      toolchain: { node: plan.toolchain.node, npm: plan.toolchain.npm, jszip: plan.toolchain.jszip, ...built.installed },
      files: [...payload.files].map(([path, bytes]) => ({ path, sha256: hash(bytes) })).sort((a, b) => compareStrings(a.path, b.path))
    }
    payload.files.set('SOURCE_MANIFEST.json', json(manifest))
    const bytes = await createDeterministicCadArchive(payload.files, plan.version)
    assert.ok(bytes.equals(await createDeterministicCadArchive(payload.files, plan.version)), 'CAD archive is not deterministic')
    const archiveRoot = join(temporary, 'archive-validation')
    await mkdir(join(archiveRoot, 'packages/renderers/cad'), { recursive: true })
    await writeFile(join(archiveRoot, 'packages/renderers/cad/CORRESPONDING_SOURCE.zip'), bytes, { flag: 'wx' })
    const proof = { releaseVersion: plan.version, sha256: hash(bytes), bytes: bytes.length,
      files: payload.files.size, runtimeBytes: runtime.bytes, runtimeSha256: runtime.sha256 }
    const extracted = await readCadCorrespondingSource(archiveRoot, proof)
    await verifyCadPreferredSourceInputs(plan.sourceRoot, extracted.manifest)
    const replayRoot = join(temporary, 'extracted-replay')
    await mkdir(replayRoot)
    const replay = await buildCadStandaloneSource(replayRoot, extracted.files, plan.toolchain)
    assert.ok(replay.runtime.equals(built.runtime), 'Extracted CAD archive does not reproduce the measured runtime')
    assert.deepEqual(replay.installed, built.installed, 'Extracted CAD build toolchain differs')
    const finalInputs = await captureCadPreferredSource(plan.sourceRoot)
    assert.deepEqual(finalInputs.map(({ bytes: input, ...entry }) => ({ ...entry, bytes: hash(input) })),
      payload.preferred.map(({ bytes: input, ...entry }) => ({ ...entry, bytes: hash(input) })), 'CAD source changed during generation')
    const finalIdentity = sourceIdentity(plan.sourceRoot)
    assert.ok(finalIdentity.clean && finalIdentity.commit === plan.sourceCommit, 'CAD source commit/worktree changed during generation')
    const finalCommitted = await captureCadCommittedInputs(plan.sourceRoot, plan.committedInputs.map(input => input.path))
    assert.deepEqual(finalCommitted.blockers, [], 'CAD committed input bytes changed during generation')
    assert.deepEqual(finalCommitted.inputs, plan.committedInputs, 'CAD committed input binding changed during generation')
    assert.deepEqual(await captureControllerInputs(), plan.controllerInputs, 'Executing CAD controller changed during generation')
    const finalTools = await producerToolchain()
    assert.deepEqual(finalTools, plan.toolchain, 'CAD producer executable/toolchain changed during generation')
    const receipt = { schemaVersion: 1, status: 'local-source-and-extracted-replay', sourceCommit: plan.sourceCommit,
      version: plan.version, archive: proof, toolchain: plan.toolchain, buildTools: built.installed,
      committedInputs: plan.committedInputs,
      controllerInputs: plan.controllerInputs,
      publicSourceVerified: false, actualFullVerified: false, releaseReady: false }
    // Check all already-existing outputs before creating either destination.
    const outputFiles = new Map([['CORRESPONDING_SOURCE.zip', bytes], ['generation-receipt.json', json(receipt)]])
    assert.ok(await ownLock(), 'CAD producer lost its generation lock')
    await safeOutputAncestors(plan.sourceRoot, plan.snapshot)
    await safeOutputAncestors(plan.sourceRoot, plan.output)
    for (const [path, files] of [[plan.snapshot, payload.files], [plan.output, outputFiles]])
      if (await exists(path)) await assertCadOutputTree(path, files)
    await publishNewTree(plan.snapshot, payload.files)
    await publishNewTree(plan.output, outputFiles)
    await assertCadOutputTree(plan.snapshot, payload.files)
    await assertCadOutputTree(plan.output, outputFiles)
    passed = true
    return { ...receipt, snapshot: plan.snapshot, output: plan.output }
  } finally {
    if (passed && temporary) await rm(temporary, { recursive: true, force: true })
    else if (temporary) console.error('CAD source generation evidence retained at ' + temporary)
    if (await ownLock()) await rm(lock, { recursive: true })
    else console.error('CAD producer lock ownership changed; retained ' + lock)
  }
}
