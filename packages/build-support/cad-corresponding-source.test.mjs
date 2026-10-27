import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, posix } from 'node:path'
import test from 'node:test'
import { CAD_INTEGRATION_SOURCE } from './cad-source-offer.mjs'
import { CAD_SOURCE_ARCHIVE_NAME, readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'

const root = resolve(import.meta.dirname, '../..')
test('the bundled preferred source is complete and bound to the actual current source', async () => {
  const archive = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
  await verifyCadPreferredSourceInputs(root, archive.manifest)
  assert.equal(archive.files.size, 84)
  assert.equal(archive.manifest.preferredSourceInputs.length, 70)
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
