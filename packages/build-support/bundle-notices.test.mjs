import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { writeBundleNotices } from './bundle-notices.mjs'
import { prebundledRuntimePathsFromInputs, writePrebundledNoticeReceipt } from './prebundled-notices.mjs'
import { correspondingSourceNotice } from './corresponding-source-notices.mjs'
import {
  fullWorkspaceLicensePackages,
  verifyFullWorkspaceNotices
} from './full-workspace-notices.mjs'

test('ELK corresponding source keeps legacy outputs and binds the current release to its own original materials', async () => {
  for (const [name, version, expected] of [
    ['elkjs', '0.9.3', '331c182bcc6181c249ce0656310f06a3442b6e11f436bfb23a0f4ffbb0f1b3a1'],
    ['occt-import-js', '0.0.23', '2e5d27593ec529c32eb26e42b324febe9b57e3809a694638b16a267cb76b7c27']
  ]) {
    const notice = await correspondingSourceNotice({ name, version })
    assert.equal(createHash('sha256').update(notice.text).digest('hex'), expected)
  }
  const registry = JSON.parse(await readFile(new URL('./licenses/corresponding-sources.json', import.meta.url)))
  const entry = registry['elkjs@0.12.1']
  const notice = await correspondingSourceNotice({ name: 'elkjs', version: '0.12.1' })
  assert.equal(notice.license, 'EPL-2.0')
  assert.equal(entry.originalNoticeBook.file, 'elk-java-original-notices-0.12.1.json')
  const raw = await readFile(new URL('./licenses/' + entry.originalNoticeBook.file, import.meta.url))
  assert.equal(createHash('sha256').update(raw).digest('hex'), entry.originalNoticeBook.sha256)
  const book = JSON.parse(raw)
  assert.equal(book.length, entry.sources.length)
  for (const source of entry.sources) {
    assert.ok(notice.text.includes(`Source: ${source.url}\nBytes: ${source.bytes}\nSHA-256: ${source.sha256}`))
    const original = book.find(archive => archive.artifact === source.name)
    assert.equal(original.sha256, source.sha256)
    for (const [expected, material] of Object.entries(original.materials)) {
      const bytes = Buffer.from(material.text, material.encoding)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), expected)
      assert.ok(Buffer.from(notice.text).includes(bytes), `Complete original material absent: ${material.sourcePath}`)
    }
  }
  assert.ok(notice.text.includes(entry.upstreamBuildLimitation))
  assert.ok(!notice.text.includes('org.eclipse.xtext-2.28.0-sources.jar'))
  assert.ok(!notice.text.includes('gwt-user-2.10.0-sources.jar'))
  assert.equal(await correspondingSourceNotice({ name: 'elkjs', version: '0.12.2' }), null)
})

test('ELK current source notice rejects a mismatched release book, altered bytes and incomplete or foreign original materials', async t => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-current-elk-notices-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'licenses/native'), { recursive: true })
  await writeFile(join(root, 'corresponding-source-notices.mjs'),
    await readFile(new URL('./corresponding-source-notices.mjs', import.meta.url)))
  for (const file of ['EPL-1.0.html.txt', 'EPL-2.0.html.txt'])
    await writeFile(join(root, 'licenses/native', file),
      await readFile(new URL('./licenses/native/' + file, import.meta.url)))
  const registry = JSON.parse(await readFile(new URL('./licenses/corresponding-sources.json', import.meta.url)))
  const original = registry['elkjs@0.12.1']
  const originalBook = await readFile(new URL('./licenses/' + original.originalNoticeBook.file, import.meta.url))
  const load = (await import(pathToFileURL(join(root, 'corresponding-source-notices.mjs')).href)).correspondingSourceNotice
  const save = async (entry, bytes = originalBook) => {
    await writeFile(join(root, 'licenses/corresponding-sources.json'), JSON.stringify({ 'elkjs@0.12.1': entry }))
    await writeFile(join(root, 'licenses', original.originalNoticeBook.file), bytes)
  }
  await save(original)
  assert.equal((await load({ name: 'elkjs', version: '0.12.1' })).text,
    (await correspondingSourceNotice({ name: 'elkjs', version: '0.12.1' })).text)
  const missingBook = { ...original }
  delete missingBook.originalNoticeBook
  await save(missingBook)
  await assert.rejects(() => load({ name: 'elkjs', version: '0.12.1' }),
    /book is required for the selected release/)
  for (const [entry, bytes, expected] of [
    [{ ...original, originalNoticeBook: { ...original.originalNoticeBook, file: 'elk-java-original-notices-0.9.3.json' } },
      originalBook, /does not match the selected release/],
    [original, Buffer.concat([originalBook, Buffer.from('\n')]), /book byte identity changed/]
  ]) {
    await save(entry, bytes)
    await assert.rejects(() => load({ name: 'elkjs', version: '0.12.1' }), expected)
  }
  for (const mutate of [
    book => book.pop(),
    book => { book[0].sha256 = '0'.repeat(64) },
    book => { Object.values(book[0].materials)[0].text += '\n' }
  ]) {
    const book = JSON.parse(originalBook)
    mutate(book)
    const bytes = Buffer.from(JSON.stringify(book))
    await save({ ...original, originalNoticeBook: { ...original.originalNoticeBook,
      sha256: createHash('sha256').update(bytes).digest('hex') } }, bytes)
    await assert.rejects(() => load({ name: 'elkjs', version: '0.12.1' }),
      /must cover every selected source artifact once|not in the selected corresponding sources|notice byte identity changed/)
  }
})

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

test('split runtime paths derive from canonical bundled owner inputs rather than a producer receipt', () => {
  const owner = resolve('/normal/package-owner')
  const index = join(owner, 'dist/index.js')
  const chunk = join(owner, 'dist/chunks/parser-actual.js')
  assert.deepEqual(prebundledRuntimePathsFromInputs(new Set([
    chunk, index, chunk, join(owner, 'dist/index.d.ts'),
    join(owner, 'src/index.ts'), resolve('/normal/unrelated/dist/index.js')
  ]), owner), ['dist/chunks/parser-actual.js', 'dist/index.js'])
  for (const input of ['dist/index.js', owner + '/dist/../index.js',
    owner + '/dist/index.js?raw', owner + '/dist/index.js\0', owner + '/dist\\index.js']) {
    assert.throws(() => prebundledRuntimePathsFromInputs([index, input], owner), /canonical absolute/)
  }
  assert.throws(() => prebundledRuntimePathsFromInputs([chunk], owner), /normal owner index/)
  assert.throws(() => prebundledRuntimePathsFromInputs([index], resolve('/normal/wrong-owner')),
    /normal owner index/)
  assert.throws(() => prebundledRuntimePathsFromInputs([index], './relative-owner'),
    /canonical absolute/)
})

test('the actual split input set rejects a missing or extra runtime chunk without weakening receipt checks', async t => {
  const f = await prebundledProducerFixture(t)
  const index = join(f.packageRoot, 'dist/index.js')
  await writeFile(index, "export * from './vendor/first.js'; export * from './vendor/second.js';\n")
  const inputs = [index, ...Object.keys(f.inputs)]
  f.configuration.runtimePaths = prebundledRuntimePathsFromInputs(inputs, f.packageRoot)
  await writePrebundledNoticeReceipt({ packageRoot: f.packageRoot,
    runtimePaths: f.configuration.runtimePaths, noticePath: f.configuration.noticePath })
  const produce = actual => writeBundleNotices({ inputs: Object.fromEntries(actual.map(path => [path, {}])) },
    f.output, { includePrebundledRuntimeNotices: [{ ...f.configuration,
      runtimePaths: prebundledRuntimePathsFromInputs(actual, f.packageRoot) }] })
  await produce(inputs)
  assert.ok((await readFile(f.output)).includes(f.notice))
  await assert.rejects(() => produce(inputs.slice(0, -1)), /runtime paths changed/)
  await assert.rejects(() => produce([...inputs, f.plain]), /runtime paths changed/)
})

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
