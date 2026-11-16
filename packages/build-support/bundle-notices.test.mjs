import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { writeBundleNotices } from './bundle-notices.mjs'
import { writePrebundledNoticeReceipt } from './prebundled-notices.mjs'
import {
  fullWorkspaceLicensePackages,
  verifyFullWorkspaceNotices
} from './full-workspace-notices.mjs'

test('HEIC image notice propagates once beside an existing decoder LICENSE and rejects missing or altered bytes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-heic-owner-notices-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const image = join(root, 'packages/renderers/image')
  const decoder = join(root, 'node_modules/@example/already-licensed-decoder')
  const full = join(root, 'packages/components/web-full')
  await mkdir(image, { recursive: true })
  await mkdir(decoder, { recursive: true })
  await mkdir(join(full, '.build'), { recursive: true })
  await mkdir(join(full, 'dist'))
  const imageNotice = await readFile(new URL('../renderers/image/THIRD_PARTY_NOTICES.md', import.meta.url))
  await writeFile(join(image, 'package.json'), JSON.stringify({
    name: '@file-viewer/renderer-image', version: '1.0.0', license: 'Apache-2.0'
  }))
  await writeFile(join(image, 'LICENSE'), await readFile(new URL('../renderers/image/LICENSE', import.meta.url)))
  await writeFile(join(image, 'THIRD_PARTY_NOTICES.md'), imageNotice)
  await writeFile(join(decoder, 'package.json'), JSON.stringify({
    name: '@example/already-licensed-decoder', version: '1.0.0', license: 'MIT'
  }))
  // This synthetic dependency already publishes its original grant. Its presence
  // must not suppress separately required notices of the physical image owner.
  const outerGrant = await readFile(new URL('../renderers/doc/LICENSE', import.meta.url))
  await writeFile(join(decoder, 'LICENSE'), outerGrant)
  const entry = join(image, 'index.js')
  const secondEntry = join(image, 'second.js')
  const decoderEntry = join(decoder, 'index.js')
  for (const path of [entry, secondEntry, decoderEntry]) await writeFile(path, 'export const used = true\n')
  await writeFile(join(full, '.build/iife-inputs.json'), JSON.stringify({
    purpose: 'private-actual-bundle-input-evidence',
    packages: [{ name: '@file-viewer/renderer-image', version: '1.0.0' }]
  }))
  const output = join(full, 'dist/THIRD_PARTY_LICENSES.txt')
  const options = { includeWorkspacePackages: fullWorkspaceLicensePackages.map(owner => owner.packageName) }
  await writeBundleNotices({ inputs: { [entry]: {}, [secondEntry]: {}, [decoderEntry]: {} } }, output, options)
  const complete = await readFile(output)
  assert.ok(complete.includes(outerGrant))
  assert.ok(complete.includes(imageNotice), 'The already-licensed decoder must not hide image original notices')
  assert.equal(complete.toString().split('@file-viewer/renderer-image@1.0.0\n\n').length - 1, 1)
  assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, 1)
  const position = complete.indexOf(imageNotice)
  const tampered = Buffer.from(complete)
  tampered[position] ^= 1
  for (const altered of [
    Buffer.from(complete.toString().replace(imageNotice.toString(), '')),
    Buffer.from(complete.toString().replace(imageNotice.toString(), imageNotice.subarray(0, Math.floor(imageNotice.length / 2)).toString())),
    tampered
  ]) {
    await writeFile(output, altered)
    await assert.rejects(() => verifyFullWorkspaceNotices(root), /THIRD_PARTY_NOTICES/)
  }
  await writeFile(output, complete)
  await rm(join(image, 'THIRD_PARTY_NOTICES.md'))
  await assert.rejects(() => verifyFullWorkspaceNotices(root), /ENOENT/)
  await writeFile(join(image, 'THIRD_PARTY_NOTICES.md'), imageNotice)
  await writeBundleNotices({ inputs: { [decoderEntry]: {} } }, output, options)
  assert.ok(!(await readFile(output)).includes(imageNotice), 'Unused image capability must not acquire an owner notice')
})

async function prebundledProducerFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-producer-notice-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const packageRoot = join(root, 'owner')
  await mkdir(join(packageRoot, 'dist/vendor'), { recursive: true })
  const metadata = { name: '@example/owner', version: '1.0.0', license: 'Apache-2.0' }
  await writeFile(join(packageRoot, 'package.json'), JSON.stringify(metadata))
  await writeFile(join(packageRoot, 'LICENSE'),
    await readFile(new URL('../renderers/pdf/LICENSE', import.meta.url)))
  const notice = Buffer.concat([
    Buffer.from('Producer child notice with original CRLF\r\n'),
    await readFile(new URL('../renderers/doc/LICENSE', import.meta.url)),
    Buffer.from('\r\nEnd of the complete producer notice\r\n')
  ])
  const files = {
    'dist/vendor/first.js': Buffer.from('export const first = true\n'),
    'dist/vendor/second.js': Buffer.from('export const second = true\n')
  }
  for (const [path, bytes] of Object.entries(files)) await writeFile(join(packageRoot, path), bytes)
  const configuration = {
    packageName: metadata.name,
    runtimePaths: Object.keys(files),
    noticePath: 'dist/vendor/original.NOTICE.txt',
    receiptPath: 'dist/prebundled-notices.json'
  }
  await writeFile(join(packageRoot, configuration.noticePath), notice)
  const fingerprint = bytes => ({ bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') })
  const receipt = { schemaVersion: 1, kind: 'prebundled-runtime-notice',
    packageName: metadata.name, packageVersion: metadata.version,
    runtimeFiles: Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, fingerprint(bytes)])),
    notice: { path: configuration.noticePath, ...fingerprint(notice) } }
  const save = () => writeFile(join(packageRoot, configuration.receiptPath), JSON.stringify(receipt))
  await save()
  const plain = join(packageRoot, 'dist/plain.js')
  await writeFile(plain, 'export const ordinaryTypescriptOutput = true\n')
  const inputs = Object.fromEntries(Object.keys(files).map(path => [join(packageRoot, path), {}]))
  const options = { includePrebundledRuntimeNotices: [configuration] }
  return { root, packageRoot, metadata, notice, files, configuration, receipt, save, plain,
    inputs, options, output: join(root, 'THIRD_PARTY_LICENSES.txt') }
}

test('prebundled producer preserves the complete notice only for actual matching runtime inputs', async t => {
  const f = await prebundledProducerFixture(t)
  await writeBundleNotices({ inputs: { ...f.inputs, [f.plain]: {} } }, f.output, f.options)
  const bytes = await readFile(f.output)
  assert.ok(bytes.includes(f.notice))
  assert.equal(bytes.toString().split('Complete producer third-party notice').length - 1, 1)
})

test('prebundled producer does not attach unrelated grants for an unused or ordinary TS input', async t => {
  const f = await prebundledProducerFixture(t)
  await rm(join(f.packageRoot, f.configuration.receiptPath))
  for (const inputs of [{}, { [f.plain]: {} }]) {
    await writeBundleNotices({ inputs }, f.output, f.options)
    assert.ok(!(await readFile(f.output)).includes(f.notice))
  }
})

test('prebundled producer rejects drift in every actual runtime input before changing output', async t => {
  const f = await prebundledProducerFixture(t)
  for (const [path, bytes] of Object.entries(f.files)) {
    await writeFile(f.output, 'unchanged on failed verification')
    await writeFile(join(f.packageRoot, path), Buffer.from(bytes.toString().replace('true', 'True')))
    await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options),
      /Prebundled runtime input (?:size|bytes) changed/)
    assert.equal(await readFile(f.output, 'utf8'), 'unchanged on failed verification')
    await writeFile(join(f.packageRoot, path), bytes)
  }
})

test('prebundled producer rejects a changed or missing complete original notice', async t => {
  const f = await prebundledProducerFixture(t)
  await writeFile(f.output, 'unchanged on failed verification')
  await writeFile(join(f.packageRoot, f.configuration.noticePath),
    Buffer.from(f.notice.toString().replace('Producer', 'producer')))
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options),
    /Prebundled producer notice (?:size|bytes) changed/)
  await rm(join(f.packageRoot, f.configuration.noticePath))
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options), /ENOENT/)
  assert.equal(await readFile(f.output, 'utf8'), 'unchanged on failed verification')
})

test('prebundled producer rejects a missing receipt and a different owner or version', async t => {
  const f = await prebundledProducerFixture(t)
  for (const [key, value, message] of [
    ['packageName', '@example/other', /Prebundled producer owner changed/],
    ['packageVersion', '2.0.0', /Prebundled producer version changed/]
  ]) {
    const original = f.receipt[key]
    f.receipt[key] = value
    await f.save()
    await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options), message)
    f.receipt[key] = original
  }
  await rm(join(f.packageRoot, f.configuration.receiptPath))
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options), /ENOENT/)
})

test('prebundled producer rejects an unexpected runtime set or substituted notice path', async t => {
  const f = await prebundledProducerFixture(t)
  f.receipt.runtimeFiles['dist/plain.js'] = Object.values(f.receipt.runtimeFiles)[0]
  await f.save()
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options),
    /Prebundled producer runtime paths changed/)
  delete f.receipt.runtimeFiles['dist/plain.js']
  f.receipt.notice.path = 'LICENSE'
  await f.save()
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options),
    /Prebundled producer notice path changed/)
})

test('prebundled producer writes only public byte identities using the actual output owner', async t => {
  const f = await prebundledProducerFixture(t)
  await writeFile(join(f.packageRoot, 'package.json'),
    JSON.stringify({ name: '@file-viewer/thumbnail', version: '3.3.4', license: 'Apache-2.0' }))
  const receipt = await writePrebundledNoticeReceipt({ packageRoot: f.packageRoot,
    runtimePaths: f.configuration.runtimePaths, noticePath: f.configuration.noticePath })
  assert.equal(receipt.packageName, '@file-viewer/thumbnail')
  assert.equal(receipt.packageVersion, '3.3.4')
  assert.deepEqual(receipt.runtimeFiles, f.receipt.runtimeFiles)
  assert.deepEqual(receipt.notice, f.receipt.notice)
  assert.deepEqual(Object.keys(receipt).sort(),
    ['kind', 'notice', 'packageName', 'packageVersion', 'runtimeFiles', 'schemaVersion'])
  assert.ok(!JSON.stringify(receipt).includes(f.root))
})

test('prebundled producer accepts a package-root alias but rejects an internal input symlink', async t => {
  const f = await prebundledProducerFixture(t)
  const alias = join(f.root, 'installed-owner')
  await symlink(f.packageRoot, alias)
  const first = f.configuration.runtimePaths[0]
  await writeBundleNotices({ inputs: { ...f.inputs, [join(alias, first)]: {} } }, f.output, f.options)
  assert.ok((await readFile(f.output)).includes(f.notice))
  const external = join(f.root, 'outside.js')
  await writeFile(external, f.files[first])
  await rm(join(f.packageRoot, first))
  await symlink(external, join(f.packageRoot, first))
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options), /symlink/)
  await assert.rejects(() => writePrebundledNoticeReceipt({ packageRoot: f.packageRoot,
    runtimePaths: f.configuration.runtimePaths, noticePath: f.configuration.noticePath }), /symlink/)
})

test('prebundled producer rejects unsafe output paths without writing outside its owner', async t => {
  const f = await prebundledProducerFixture(t)
  const outside = join(f.root, 'outside')
  await mkdir(outside)
  await symlink(outside, join(f.packageRoot, 'dist/alias'))
  await assert.rejects(() => writePrebundledNoticeReceipt({ packageRoot: f.packageRoot,
    runtimePaths: f.configuration.runtimePaths, noticePath: f.configuration.noticePath,
    receiptPath: 'dist/alias/new/receipt.json' }), /real output directory/)
  await assert.rejects(() => lstat(join(outside, 'new')), /ENOENT/)
  await assert.rejects(() => writePrebundledNoticeReceipt({ packageRoot: f.packageRoot,
    runtimePaths: ['../outside.js'], noticePath: f.configuration.noticePath }), /package-relative/)
})

test('prebundled producer rejects conflicting descriptors for the same actual output', async t => {
  const f = await prebundledProducerFixture(t)
  f.options.includePrebundledRuntimeNotices.push({ ...f.configuration, noticePath: 'LICENSE' })
  await assert.rejects(() => writeBundleNotices({ inputs: f.inputs }, f.output, f.options),
    /Ambiguous prebundled producer descriptor/)
})

test('retains the full original MIT grant of a physically bundled workspace dependency', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-workspace-notices-'))
  try {
    const packageRoot = join(root, 'doc')
    await mkdir(packageRoot)
    const license = await readFile(new URL('../renderers/doc/LICENSE', import.meta.url), 'utf8')
    await writeFile(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@file-viewer/doc',
        version: '3.2.0',
        license: 'MIT'
      })
    )
    await writeFile(join(packageRoot, 'LICENSE'), license)
    const entry = join(packageRoot, 'index.js')
    await writeFile(entry, 'export const doc = true\n')
    const output = join(root, 'THIRD_PARTY_LICENSES.txt')
    await writeBundleNotices({ inputs: { [entry]: {} } }, output, {
      includeWorkspacePackages: ['@file-viewer/doc']
    })
    const notices = await readFile(output, 'utf8')
    assert.ok(notices.includes('@file-viewer/doc@3.2.0'))
    assert.ok(notices.includes(license))
    // A name in the opt-in list is not evidence of physical inclusion.
    await writeBundleNotices({ inputs: {} }, output, {
      includeWorkspacePackages: ['@file-viewer/doc']
    })
    assert.equal((await readFile(output, 'utf8')).trim(), '')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})


test('retains the actual dlmalloc grant and author rather than its unrelated first source marker', async () => {
  for (const relative of ['licenses/occt-toolchain-original-notices.json',
    '../renderers/media/src/vendor/mp4v/TOOLCHAIN_THIRD_PARTY_LICENSES.json']) {
    const book = JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'))
    const grant = book.materials.find(material => material.source.endsWith('/dlmalloc.c'))
    assert.match(grant.text, /written by\n Doug Lea and released to the public domain/)
    assert.match(grant.text, /creativecommons\.org\/publicdomain\/zero\/1\.0/)
    assert.match(grant.sourceGitBlob, /^[a-f0-9]{40}$/)
    assert.equal(createHash('sha256').update(grant.text).digest('hex'), grant.sha256)
    const standard = book.materials.find(material => material.declaredLicense === 'CC0-1.0')
    assert.ok(standard.text.includes('CC0 1.0 Universal'))
    assert.equal(createHash('sha256').update(standard.text).digest('hex'), standard.sha256)
  }
})

test('Full preserves every contributor grant byte and associates equal grants with all physical owners', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'full-workspace-copyright-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const inputs = {}
  const expected = []
  for (const owner of fullWorkspaceLicensePackages) {
    const directory = join(root, owner.directory)
    await mkdir(directory, { recursive: true })
    const original = await readFile(
      new URL('../../' + owner.directory + '/LICENSE', import.meta.url)
    )
    const metadata = {
      name: owner.packageName,
      version: '3.3.0',
      license: owner.packageName === '@file-viewer/doc' ? 'MIT' : 'Apache-2.0'
    }
    await writeFile(join(directory, 'package.json'), JSON.stringify(metadata))
    await writeFile(join(directory, 'LICENSE'), original)
    for (const filename of owner.noticeFiles || []) {
      await writeFile(join(directory, filename),
        await readFile(new URL('../../' + owner.directory + '/' + filename, import.meta.url)))
    }
    const entry = join(directory, 'index.js')
    await writeFile(entry, 'export const used=true\n')
    inputs[entry] = {}
    expected.push({ name: owner.packageName, version: metadata.version, original })
  }
  const full = join(root, 'packages/components/web-full')
  await mkdir(join(full, 'dist'), { recursive: true })
  await mkdir(join(full, '.build'))
  const output = join(full, 'dist/THIRD_PARTY_LICENSES.txt')
  await writeFile(
    join(full, '.build/iife-inputs.json'),
    JSON.stringify({
      purpose: 'private-actual-bundle-input-evidence',
      packages: expected.map(({ name, version }) => ({ name, version }))
    })
  )
  const options = {
    includeWorkspacePackages: fullWorkspaceLicensePackages.map((owner) => owner.packageName)
  }
  await writeBundleNotices({ inputs }, output, options)
  assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, fullWorkspaceLicensePackages.length)
  const notices = await readFile(output)
  for (const owner of expected) assert.ok(notices.includes(owner.original))
  const altered = notices
    .toString()
    .replace('Copyright 2026 Yu Wang', 'Copyright 2026 another contributor')
  await writeFile(output, altered)
  await assert.rejects(() => verifyFullWorkspaceNotices(root), /every original LICENSE byte/)
  await writeBundleNotices({ inputs: {} }, output, options)
  assert.equal((await readFile(output, 'utf8')).trim(), '')
})

test('retains the exact complete grants of a physically inlined SDK and rejects byte drift', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-sdk-notices-'))
  try {
    const packageRoot = join(root, 'sdk')
    const dist = join(packageRoot, 'dist')
    await mkdir(dist, { recursive: true })
    const metadata = { name: '@example/sdk', version: '1.0.0', license: 'Apache-2.0' }
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify(metadata))
    const grant = await readFile(new URL('../renderers/doc/LICENSE', import.meta.url))
    const first = Buffer.from('export const first = true\n')
    const second = Buffer.from('export const second = true\n')
    const files = { 'first.js': first, 'second.js': second, 'THIRD_PARTY_LICENSES.txt': grant }
    for (const [name, bytes] of Object.entries(files)) await writeFile(join(dist, name), bytes)
    const receipt = {
      schemaVersion: 1,
      packageName: metadata.name,
      packageVersion: metadata.version,
      files: Object.fromEntries(
        Object.entries(files).map(([name, bytes]) => [
          name,
          {
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex')
          }
        ])
      )
    }
    await writeFile(join(dist, 'bundled-runtime.json'), JSON.stringify(receipt))
    const output = join(root, 'THIRD_PARTY_LICENSES.txt')
    const options = { includePrebundledSdkPackages: [metadata.name] }
    const inputs = { [join(dist, 'first.js')]: {}, [join(dist, 'second.js')]: {} }
    await writeBundleNotices({ inputs }, output, options)
    const notices = await readFile(output, 'utf8')
    assert.equal(notices.split('Prebundled browser runtime:').length - 1, 1)
    assert.ok(notices.includes(grant.toString('utf8')))
    await writeBundleNotices({ inputs: {} }, output, options)
    assert.equal((await readFile(output, 'utf8')).trim(), '')
    await writeFile(output, 'unchanged on failed verification')
    await writeFile(join(dist, 'first.js'), 'changed SDK bytes\n')
    await assert.rejects(
      () => writeBundleNotices({ inputs }, output, options),
      /SDK input (?:size|bytes) changed/
    )
    assert.equal(await readFile(output, 'utf8'), 'unchanged on failed verification')
    await writeFile(join(dist, 'first.js'), first)
    await writeFile(join(dist, 'THIRD_PARTY_LICENSES.txt'), 'replacement grant')
    await assert.rejects(
      () => writeBundleNotices({ inputs }, output, options),
      /SDK (?:notice size|original grants) changed/
    )
    assert.equal(await readFile(output, 'utf8'), 'unchanged on failed verification')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
