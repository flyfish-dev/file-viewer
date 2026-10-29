import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, posix } from 'node:path'
import test from 'node:test'
import { CAD_INTEGRATION_SOURCE } from './cad-source-offer.mjs'
import { CAD_SOURCE_ARCHIVE_NAME, readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'
import { workspaceCadBuildRecipe, verifyCadRebuiltRuntime } from './cad-rebuild-toolchain.mjs'

const root = resolve(import.meta.dirname, '../..')
test('the bundled preferred source is complete and bound to the actual current source', async () => {
  const archive = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
  await verifyCadPreferredSourceInputs(root, archive.manifest)
  assert.equal(archive.files.size, 85)
  assert.equal(archive.manifest.preferredSourceInputs.length, 71)
  assert.deepEqual(
    archive.files.get('packages/core/src/browser/source-feedback.ts'),
    await readFile(join(root, 'packages/core/src/browser/source-feedback.ts'))
  )
  assert.ok(archive.files.has('package-lock.json'))
  assert.ok(archive.files.has('LICENSES/AGPL-3.0.txt'))
  assert.ok(archive.files.has('LICENSES/GPL-3.0.txt'))
  assert.ok(archive.files.get('README.md').toString().includes('npm ci --ignore-scripts'))
})

test('altered source-archive bytes cannot acquire the reviewed notice', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'cad-source-tamper-'))
  t.after(() => rm(temporary, { recursive: true, force: true }))
  const archive = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
  const path = join(temporary, 'packages/renderers/cad', CAD_SOURCE_ARCHIVE_NAME)
  await mkdir(dirname(path), { recursive: true })
  const tampered = Buffer.from(archive.bytes)
  tampered[Math.floor(tampered.length / 2)] ^= 1
  await writeFile(path, tampered)
  await assert.rejects(readCadCorrespondingSource(temporary, CAD_INTEGRATION_SOURCE), /archive changed/)
})

test('changed or newly added preferred source fails before a stale offer is written', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'cad-source-inputs-'))
  t.after(() => rm(temporary, { recursive: true, force: true }))
  const { manifest } = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
  for (const entry of manifest.preferredSourceInputs) {
    const target = join(temporary, entry.path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await readFile(join(root, entry.path)))
  }
  await verifyCadPreferredSourceInputs(temporary, manifest)
  const config = join(temporary, 'packages/core/tsconfig.json')
  const compiler = JSON.parse(await readFile(config, 'utf8'))
  await writeFile(config, JSON.stringify(compiler))
  await verifyCadPreferredSourceInputs(temporary, manifest)
  await writeFile(config, JSON.stringify({ ...compiler, compilerOptions: { ...compiler.compilerOptions, target: 'ES2022' } }))
  await assert.rejects(verifyCadPreferredSourceInputs(temporary, manifest), /source is stale/)
  await writeFile(config, JSON.stringify(compiler))
  const changed = join(temporary, 'packages/core/src/platform/assets.ts')
  const original = await readFile(changed)
  await writeFile(changed, Buffer.concat([original, Buffer.from('\n// changed integration input\n')]))
  await assert.rejects(verifyCadPreferredSourceInputs(temporary, manifest), /source is stale/)
  await writeFile(changed, original)
  await writeFile(join(temporary, 'packages/core/src/new-runtime.ts'), 'export const newInput = true\n')
  await assert.rejects(verifyCadPreferredSourceInputs(temporary, manifest), /omits or adds preferred source/)
})


test('the actual standalone source keeps npm-resolvable manifests independently of workspace input identities', async () => {
  const archive = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
  await verifyCadPreferredSourceInputs(root, archive.manifest)
  let manifests = 0
  for (const [path, bytes] of archive.files) {
    if (!path.endsWith('package.json')) continue
    manifests += 1
    const manifest = JSON.parse(bytes)
    for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const [name, specifier] of Object.entries(manifest[group] || {})) {
        assert.equal(typeof specifier, 'string')
        assert.ok(!specifier.startsWith('workspace:'), `npm ci cannot restore ${path}: ${name}`)
        if (specifier.startsWith('file:')) {
          const target = posix.resolve('/', posix.dirname(path), specifier.slice(5)).slice(1)
          assert.ok(archive.files.has(`${target}/package.json`), `Missing standalone local dependency: ${path} -> ${target}`)
        }
      }
    }
  }
  assert.equal(manifests, 3)
})

const toolchain = (vite = '8.3.3') => ({
  versions: {typescript: '6.0.3', vite, rolldown: vite === '8.3.3' ? '1.2.13' : '1.2.15', esbuild: '0.28.2'},
  entries: {typescript: 'file:///tools/typescript.js', vite: 'file:///tools/vite.js'}
})
const reproduction = () => {
  const canonical = Buffer.from('pinned compiler output'), distributed = Buffer.from('workspace compiler output')
  return {canonical, distributed,
    expected: {runtimeBytes: canonical.length, runtimeSha256: createHash('sha256').update(canonical).digest('hex')},
    sourceToolchain: toolchain(), workspaceToolchain: toolchain('8.3.5')}
}

test('an exact pinned rebuild needs no alternative build', async () => {
  const input = reproduction()
  const proof = await verifyCadRebuiltRuntime({...input, distributed: input.canonical,
    rebuildWithWorkspace: () => { throw new Error('must not run') }})
  assert.equal(proof.matchedBy, 'archive-pinned-toolchain')
  assert.deepEqual(proof.canonical, proof.distributed)
})

test('a changed owner toolchain must independently reconstruct every shipped byte', async () => {
  const input = reproduction()
  let builds = 0
  const proof = await verifyCadRebuiltRuntime({...input,
    rebuildWithWorkspace: async () => { builds++; return input.distributed }})
  assert.equal(builds, 1)
  assert.equal(proof.matchedBy, 'workspace-toolchain')
  assert.notEqual(proof.canonical.sha256, proof.distributed.sha256)
  assert.deepEqual(proof.sourceToolchain, input.sourceToolchain.versions)
  assert.deepEqual(proof.workspaceToolchain, input.workspaceToolchain.versions)
})

test('a changed pinned-source fingerprint is rejected before any alternate build', async () => {
  const input = reproduction()
  let builds = 0
  await assert.rejects(verifyCadRebuiltRuntime({...input, canonical: Buffer.alloc(input.canonical.length),
    rebuildWithWorkspace: async () => { builds++; return input.distributed }}), /fingerprint changed/)
  assert.equal(builds, 0)
})

test('a changed distributed runtime cannot pass through a different-toolchain declaration', async () => {
  const input = reproduction()
  await assert.rejects(verifyCadRebuiltRuntime({...input, distributed: Buffer.from('unexpected code'),
    rebuildWithWorkspace: async () => input.distributed}), /does not reconstruct the actual Full runtime/)
})

test('identical declared tools never excuse different runtime bytes', async () => {
  const input = reproduction()
  let builds = 0
  await assert.rejects(verifyCadRebuiltRuntime({...input, workspaceToolchain: input.sourceToolchain,
    rebuildWithWorkspace: async () => { builds++; return input.distributed }}), /identical declared build tools/)
  assert.equal(builds, 0)
})

test('tool selection preserves the complete recipe except its two tool import specifiers', () => {
  const source = "import ts from 'typescript'\nimport { build } from 'vite'\nconst preferredSourcesStayUnchanged = true\n"
  const selected = workspaceCadBuildRecipe(source, toolchain())
  assert.ok(selected.includes('from "file:///tools/typescript.js"'))
  assert.ok(selected.includes('from "file:///tools/vite.js"'))
  assert.equal(selected.slice(selected.indexOf('const preferred')), source.slice(source.indexOf('const preferred')))
})

test('unexpected or duplicated recipe imports fail closed', () => {
  const source = "import ts from 'typescript'\nimport { build } from 'vite'\n"
  assert.throws(() => workspaceCadBuildRecipe(source + "import other from 'vite'\n", toolchain()), /Unexpected CAD build-tool import/)
  assert.throws(() => workspaceCadBuildRecipe("import ts from 'typescript'\n", toolchain()), /Unexpected CAD build-tool import/)
})

test('tool-selection entries must be installed local files', () => {
  const source = "import ts from 'typescript'\nimport { build } from 'vite'\n"
  const tools = toolchain()
  tools.entries.vite = 'https://example.invalid/build.js'
  assert.throws(() => workspaceCadBuildRecipe(source, tools), /installed local modules/)
})
