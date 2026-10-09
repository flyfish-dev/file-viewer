import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { gzipSync } from 'node:zlib'
import {
  readPublishedDocxEntry,
  verifyDocxDistribution,
  verifyPublishedDocxFiles
} from './verify-docx-distribution.mjs'
import { compatibilityEngineCandidates } from '../../apps/component-demo/scripts/pack-compatibility-engines.mjs'
import { assertDocxCandidateAllowed } from '../../apps/component-demo/scripts/build-packed-issue-consumer.mjs'

const version = '0.3.34'
const sha = (algorithm, bytes, encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding)
const files = {
  'package.json': JSON.stringify({ name: '@file-viewer/docx', version }),
  'dist/docx-preview.mjs': 'export const publicFixture = true\n',
  'dist/docx-preview.worker.js': 'self.onmessage = () => {}\n',
  LICENSE: 'Public test fixture, no upstream implementation.\n'
}
// A tiny standard USTAR archive generated entirely in memory. The real tar
// executable reads it in tests; npm commands are stubbed and cannot publish.
function archive(entries) {
  const blocks = []
  for (const [entry, value] of Object.entries(entries)) {
    const bytes = Buffer.from(value)
    const header = Buffer.alloc(512)
    header.write(`package/${entry}`, 0, 100)
    header.write('0000644\0', 100)
    header.write('0000000\0', 108)
    header.write('0000000\0', 116)
    header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124)
    header.write('00000000000\0', 136)
    header.fill(32, 148, 156)
    header.write('0', 156)
    header.write('ustar\0', 257)
    header.write('00', 263)
    const checksum = header.reduce((sum, byte) => sum + byte, 0)
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148)
    blocks.push(header, bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512))
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]))
}
async function project(t, installed = files) {
  const root = await mkdtemp(join(tmpdir(), 'docx-distribution-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const directory = join(root, 'packages/renderers/word/node_modules/@file-viewer/docx')
  for (const [path, text] of Object.entries(installed)) {
    await mkdir(dirname(join(directory, path)), { recursive: true })
    await writeFile(join(directory, path), text)
  }
  await writeFile(
    join(root, 'packages/renderers/word/package.json'),
    JSON.stringify({ dependencies: { '@file-viewer/docx': version } })
  )
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
  await mkdir(join(root, 'patches'))
  await writeFile(
    join(root, 'pnpm-lock.yaml'),
    `importers:\n  packages/renderers/word:\n    dependencies:\n      '@file-viewer/docx':\n        specifier: ${version}\n        version: ${version}\n`
  )
  return { root, directory }
}
function registry({
  entries = files,
  corrupt = false,
  requestVersion = version,
  reportedVersion = requestVersion,
  reportedIntegrity
} = {}) {
  const bytes = archive(entries)
  const integrity = 'sha512-' + sha('sha512', bytes, 'base64')
  const calls = []
  return {
    calls,
    integrity,
    run: async (command, args, binary = false) => {
      calls.push([command, args])
      if (command === 'npm') {
        assert.equal(
          args[1],
          `@file-viewer/docx@${requestVersion}`,
          'The registry request must use the exact stable version'
        )
        assert.ok(args.includes('--registry=https://registry.npmjs.org/'))
        if (args[0] === 'view')
          return JSON.stringify({ version: reportedVersion, dist: { integrity } })
        assert.equal(args[0], 'pack', 'This fixture must never publish or install anything')
        assert.ok(args.includes('--ignore-scripts'))
        const destination = args[args.indexOf('--pack-destination') + 1]
        await writeFile(
          join(destination, 'fixture.tgz'),
          corrupt ? Buffer.from('corrupted bytes') : bytes
        )
        return JSON.stringify([
          { filename: 'fixture.tgz', integrity: reportedIntegrity || integrity }
        ])
      }
      assert.equal(command, 'tar')
      return execFileSync(command, args, { encoding: binary ? undefined : 'utf8' })
    }
  }
}

test('ordinary installed DOCX files must exactly match the integrity-verified public registry archive', async (t) => {
  const { root } = await project(t)
  const stub = registry()
  const result = await verifyDocxDistribution(root, { requirePublished: true, run: stub.run })
  assert.equal(result.mode, 'published')
  assert.equal(result.version, version)
  assert.equal(result.integrity, stub.integrity)
  assert.deepEqual(Object.keys(result.sha256).sort(), Object.keys(files).sort())
  assert.equal(
    result.sha256['dist/docx-preview.mjs'],
    sha('sha256', files['dist/docx-preview.mjs'])
  )
})

test('a locally changed production entry fails even when the installed version is correct', async (t) => {
  const { root } = await project(t, {
    ...files,
    'dist/docx-preview.mjs': 'export const hiddenFix = true\n'
  })
  await assert.rejects(
    verifyDocxDistribution(root, { run: registry().run }),
    /differs from the ordinary registry distribution/
  )
})

test('extra locally injected production files are rejected', async (t) => {
  const { root } = await project(t, { ...files, 'dist/local-repair.mjs': 'export {}\n' })
  await assert.rejects(verifyDocxDistribution(root, { run: registry().run }), /file set differs/)
})

test('registry integrity is checked before archive contents are trusted', async (t) => {
  const { root } = await project(t)
  const stub = registry({ corrupt: true })
  await assert.rejects(
    verifyDocxDistribution(root, { run: stub.run }),
    /tarball integrity mismatch/
  )
  assert.ok(stub.calls.every(([command]) => command !== 'tar'))
})

test('a changed registry version or packing integrity cannot pass', async (t) => {
  const { root } = await project(t)
  await assert.rejects(
    verifyDocxDistribution(root, { run: registry({ reportedVersion: '0.3.33' }).run }),
    /version mismatch/
  )
  await assert.rejects(
    verifyDocxDistribution(root, { run: registry({ reportedIntegrity: 'sha512-incorrect' }).run }),
    /metadata changed/
  )
})

test('registry archives cannot name files outside the package', async (t) => {
  const { directory } = await project(t)
  await assert.rejects(
    verifyPublishedDocxFiles({
      directory,
      version,
      run: registry({ entries: { ...files, '../escape': 'no' } }).run
    }),
    /Unsafe registry archive entry/
  )
})

test('installed symlinks cannot substitute external bytes', async (t) => {
  const { root, directory } = await project(t)
  await writeFile(join(root, 'outside.mjs'), files['dist/docx-preview.mjs'])
  await rm(join(directory, 'dist/docx-preview.mjs'))
  await symlink(join(root, 'outside.mjs'), join(directory, 'dist/docx-preview.mjs'))
  await assert.rejects(verifyDocxDistribution(root, { run: registry().run }), /Unexpected link/)
})

test('obsolete compatibility metadata and unregistered DOCX patches block registry adoption', async (t) => {
  const { root } = await project(t)
  const stub = registry()
  const metadata = join(root, 'patches/docx-engine-compatibility.json')
  await writeFile(metadata, '{}')
  await assert.rejects(
    verifyDocxDistribution(root, { run: stub.run }),
    /obsolete DOCX compatibility/
  )
  await writeFile(metadata, 'null')
  await assert.rejects(
    verifyDocxDistribution(root, { run: stub.run }),
    /obsolete DOCX compatibility/
  )
  await rm(metadata)
  await writeFile(join(root, 'patches/@file-viewer__docx@0.3.33.patch'), 'old patch')
  await assert.rejects(verifyDocxDistribution(root, { run: stub.run }), /obsolete DOCX patch/)
  assert.equal(stub.calls.length, 0)
})

test('the interim compatibility path retains byte checks but cannot masquerade as a published engine', async (t) => {
  const { root, directory } = await project(t)
  await writeFile(
    join(root, 'pnpm-workspace.yaml'),
    `patchedDependencies:\n  '@file-viewer/docx@${version}': patches/@file-viewer__docx@${version}.patch\n`
  )
  await writeFile(
    join(root, 'patches/docx-engine-compatibility.json'),
    JSON.stringify({
      package: '@file-viewer/docx',
      version,
      sourceBuild: { repository: 'https://github.com/flyfish-dev/docxjs' },
      sha256: Object.fromEntries(
        Object.entries(files)
          .filter(([path]) => path.startsWith('dist/'))
          .map(([path, text]) => [path.slice(5), sha('sha256', text)])
      )
    })
  )
  const stub = registry()
  assert.equal((await verifyDocxDistribution(root, { run: stub.run })).mode, 'compatibility')
  await assert.rejects(
    verifyDocxDistribution(root, { requirePublished: true, run: stub.run }),
    /still has an active patch/
  )
  await writeFile(join(directory, 'dist/docx-preview.worker.js'), 'changed worker')
  await assert.rejects(
    verifyDocxDistribution(root, { run: stub.run }),
    /differs from its owning-source build/
  )
  assert.equal(stub.calls.length, 0)
})

test('published consumers never repack or override DOCX while PPT compatibility remains available', () => {
  const published = compatibilityEngineCandidates('published')
  assert.deepEqual(published, [
    ['packages/renderers/presentation-ppt', 'patches/ppt-http-compatibility.json']
  ])
  assert.deepEqual(compatibilityEngineCandidates('compatibility'), [
    ['packages/renderers/word', 'patches/docx-engine-compatibility.json'],
    ...published
  ])
  assert.throws(
    () =>
      assertDocxCandidateAllowed(
        '@file-viewer/docx',
        'patchedDependencies:\n  ppt@1.0.0: patches/ppt.patch\n'
      ),
    /ordinary registry/
  )
  assert.doesNotThrow(() => assertDocxCandidateAllowed('@file-viewer/ppt', ''))
  assert.doesNotThrow(() =>
    assertDocxCandidateAllowed(
      '@file-viewer/docx',
      `patchedDependencies:\n  '@file-viewer/docx@0.3.33': patches/@file-viewer__docx@0.3.33.patch\n`
    )
  )
})

test('normal public CI runs the distribution gate through the existing DOCX command', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  )
  assert.equal(
    manifest.scripts['verify:docx-upstream'],
    'node .github/scripts/verify-docx-distribution.mjs && node .github/scripts/verify-docx-upstream.mjs'
  )
  const workflow = await readFile(new URL('../workflows/public-ci.yml', import.meta.url), 'utf8')
  assert.match(workflow, /run: pnpm verify:docx-upstream/)
})

test('the paragraph baseline uses integrity-checked old public bytes without private preparation or production edits', async () => {
  const stub = registry({ requestVersion: '0.3.33' })
  const baseline = await readPublishedDocxEntry('0.3.33', 'dist/docx-preview.mjs', {
    run: stub.run
  })
  assert.equal(baseline.text, files['dist/docx-preview.mjs'])
  assert.equal(baseline.provenance.version, '0.3.33')
  assert.equal(baseline.provenance.integrity, stub.integrity)
  await assert.rejects(
    readPublishedDocxEntry('0.3.33', '../escape', { run: stub.run }),
    /Missing public DOCX baseline entry/
  )
})

test('a stale patched or local lock resolution cannot pass ordinary registry verification', async (t) => {
  const { root } = await project(t)
  const path = join(root, 'pnpm-lock.yaml')
  const original = await readFile(path, 'utf8')
  const stub = registry()
  for (const resolution of ['0.3.34(patch_hash=old)', 'file:patched.tgz', 'link:../docx']) {
    await writeFile(path, original.replace(`version: ${version}`, `version: ${resolution}`))
    await assert.rejects(
      verifyDocxDistribution(root, { run: stub.run }),
      /ordinary unpatched registry version/
    )
  }
  await writeFile(
    path,
    original + "\npatchedDependencies:\n  '@file-viewer/docx@0.3.33': oldhash\n"
  )
  await assert.rejects(verifyDocxDistribution(root, { run: stub.run }), /Lockfile still registers/)
  assert.equal(stub.calls.length, 0)
})

test('ancestor dependency fallback is rejected when the Word renderer installation is missing', async (t) => {
  const { root, directory } = await project(t)
  const ancestor = join(root, 'node_modules/@file-viewer/docx')
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(ancestor, path)), { recursive: true })
    await writeFile(join(ancestor, path), text)
  }
  await rm(directory, { recursive: true })
  const stub = registry()
  await assert.rejects(verifyDocxDistribution(root, { run: stub.run }), { code: 'ENOENT' })
  assert.equal(stub.calls.length, 0)
})

test('an otherwise valid external package symlink cannot serve as checkout-local proof', async (t) => {
  const first = await project(t)
  const second = await project(t)
  await rm(first.directory, { recursive: true })
  await symlink(second.directory, first.directory)
  const stub = registry()
  await assert.rejects(
    verifyDocxDistribution(first.root, { run: stub.run }),
    /physically belong to this checkout/
  )
  assert.equal(stub.calls.length, 0)
})
