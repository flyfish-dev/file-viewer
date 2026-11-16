import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fullWorkspaceLicensePackages, verifyFullWorkspaceNotices } from './full-workspace-notices.mjs'
import { writeBundleNotices } from './bundle-notices.mjs'

test('HEIC image notice retains every fixed original byte and complete source/recombination references', async () => {
  const notice = await readFile(new URL('../renderers/image/THIRD_PARTY_NOTICES.md', import.meta.url))
  for (const [filename, source, bytes, sha256] of [
    ['LICENSE.heic2any-0.0.4-MIT.txt', 'https://github.com/alexcorvi/heic2any/blob/3428539e643e112323a5b8a2c77c6402cb1372f6/LICENSE.md', 1088, '17e4c847dac6cf3ba1f6846464160a749e020accf7dd9f412c6c55bc96285009'],
    ['NOTICE.gifshot-Yahoo-original-header.txt', 'https://github.com/alexcorvi/heic2any/blob/3428539e643e112323a5b8a2c77c6402cb1372f6/src/gifshot.js', 1152, '6eb1bc439a13bbcceabbda6475855bd49e08cb489d66413b6b99658f8c021e4a'],
    ['NOTICE.libheif-1.10.0-pre-js-original-header.txt', 'https://github.com/strukturag/libheif/blob/667eeabb553ce73094eb29faea3f31fb8610fec2/pre.js', 846, '5f20e2bbf3d196d73033ac312ea0171af482509b14338bba91fc30fc88853601'],
    ['LICENSE.libheif-1.10.0-COPYING.txt', 'https://github.com/strukturag/libheif/blob/667eeabb553ce73094eb29faea3f31fb8610fec2/COPYING', 44338, 'b2eb4f6588b005bebac44cfb2dfd23f6a16c5ca9b8a619a315158b0215a917a3'],
    ['NOTICE.libde265-1.0.2-original-header.txt', 'https://github.com/strukturag/libde265/blob/299f27103d501693ee0b517f7ec6badeb377ab4b/libde265/de265.h', 793, '268805a715ec84e5fbaa1030a1a5c6780f422a76fb29e550973d95402c8e096c'],
    ['LICENSE.libde265-1.0.2-COPYING.txt', 'https://github.com/strukturag/libde265/blob/299f27103d501693ee0b517f7ec6badeb377ab4b/COPYING', 43284, 'f286b0832b81e06777c2a6bb4b895dc87608df4870d0fb14abe142ebbccf02e3']
  ]) {
    const marker = Buffer.from(`===== ${filename} =====\nSource: ${source}\n\n`)
    const start = notice.indexOf(marker)
    assert.notEqual(start, -1, `Missing immutable original material: ${filename}`)
    const original = notice.subarray(start + marker.length, start + marker.length + bytes)
    assert.equal(original.length, bytes, filename)
    assert.equal(createHash('sha256').update(original).digest('hex'), sha256, filename)
  }
  const text = notice.toString()
  for (const [url, sha256] of [
    ['https://api.github.com/repos/strukturag/libheif/tarball/667eeabb553ce73094eb29faea3f31fb8610fec2', '6e088fb41eb014255b73a46a1bcc7d8c9ccc2ddb08ca947a5dd928771163e2bd'],
    ['https://api.github.com/repos/strukturag/libde265/tarball/299f27103d501693ee0b517f7ec6badeb377ab4b', '40d36ee1d2d8f71fdf1bd33beaeaf5532319d9829c42625965622c9043f70a0c']
  ]) {
    assert.ok(text.includes(url), 'Complete fixed native source must remain available by reference')
    assert.ok(text.includes(sha256), 'The actual source archive checksum must accompany its reference')
  }
  assert.match(text, /ordinary provenance assessment with a disclosed inference/)
  assert.match(text, /exact historical native compiler invocation and flags have not been recovered/)
  assert.match(text, /build-emscripten\.sh/)
  assert.match(text, /window\.__heic2any__worker/)
  assert.match(text, /replacement failure recovery is not qualified/)
})

test('WordPerfect retains both independently pinned POLE source grants verbatim in its root notice', async () => {
  const notice = await readFile(new URL('../renderers/wordperfect/THIRD_PARTY_NOTICES.md', import.meta.url))
  const registry = JSON.parse(await readFile(new URL('./licenses/asset-family-materials.json', import.meta.url)))
  for (const [filename, bytes, sha256] of [
    ['LICENSE.POLE-RVNGOLEStream.h.txt', 1633, 'b64785f0016b464ab95671932f2b000cab1d792d822afbd3a4975b720c3becd4'],
    ['LICENSE.POLE-RVNGOLEStream.cpp.txt', 1869, '1a04bf9e2eeb4b0fa2ac5e21fb414417b1afc0d444881b893e0c6a4a3e3fde41']
  ]) {
    const sourcePath = 'packages/renderers/wordperfect/vendor/libwpd-src/' + filename
    const original = await readFile(new URL('../../' + sourcePath, import.meta.url))
    assert.equal(original.length, bytes)
    assert.equal(createHash('sha256').update(original).digest('hex'), sha256)
    assert.ok(notice.includes(original), filename)
    const material = registry.materials.find(entry => entry.sourcePath === sourcePath)
    assert.ok(material, filename)
    assert.equal(material.kind, 'original-license-grant')
    assert.equal(material.declaredLicense, 'BSD-3-Clause')
    assert.equal(material.bytes, bytes)
    assert.equal(material.sha256, sha256)
  }
})

test('the associated workspace grant and every required contributor notice remain byte-exact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fv-full-notices-'))
  try {
    const full = join(root, 'packages/components/web-full')
    const owner = join(root, 'packages/renderers/3d')
    await mkdir(join(full, '.build'), { recursive: true })
    await mkdir(join(full, 'dist'))
    await mkdir(owner, { recursive: true })
    await writeFile(join(owner, 'package.json'), JSON.stringify({ name: '@file-viewer/renderer-3d', version: '1.0.0' }))
    await writeFile(join(owner, 'LICENSE'), 'Original host grant\r\n')
    await writeFile(join(owner, 'GEO3D_THIRD_PARTY_NOTICES.md'), 'Original contributor notice\r\n')
    await writeFile(join(full, '.build/iife-inputs.json'), JSON.stringify({
      purpose: 'private-actual-bundle-input-evidence', packages: [{ name: '@file-viewer/renderer-3d' }]
    }))
    const notice = join(full, 'dist/THIRD_PARTY_LICENSES.txt')
    const section = '@file-viewer/renderer-3d@1.0.0\n\nOriginal host grant\r\n'
    await writeFile(notice, section)
    await assert.rejects(verifyFullWorkspaceNotices(root), /GEO3D_THIRD_PARTY_NOTICES/)
    await writeFile(notice, section + '\nOriginal contributor notice\r\n')
    assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, 1)
    await writeFile(notice, section + '\nOriginal contributor notice\n')
    await assert.rejects(verifyFullWorkspaceNotices(root), /GEO3D_THIRD_PARTY_NOTICES/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('normal Full collector preserves prior workspace grants and PDF attribution and rejects notice loss', async t => {
  const root = await mkdtemp(join(tmpdir(), 'fv-full-pdf-notices-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const pdf = { packageName: '@file-viewer/renderer-pdf', directory: 'packages/renderers/pdf',
    noticeFiles: ['THIRD_PARTY_NOTICES.md'] }
  const owners = [...fullWorkspaceLicensePackages.filter(owner => owner.packageName !== pdf.packageName), pdf]
  const pdfNotice = 'Original PDF upstream declaration\r\n'
  const expected = []
  const inputs = {}
  for (const owner of owners) {
    const directory = join(root, owner.directory)
    await mkdir(directory, { recursive: true })
    const original = await readFile(new URL('../../' + owner.directory + '/LICENSE', import.meta.url))
    const metadata = { name: owner.packageName, version: '1.0.0',
      license: owner.packageName === '@file-viewer/doc' ? 'MIT' : 'Apache-2.0' }
    await writeFile(join(directory, 'package.json'), JSON.stringify(metadata))
    await writeFile(join(directory, 'LICENSE'), original)
    const notices = []
    for (const filename of owner.noticeFiles || []) {
      const bytes = owner.packageName === pdf.packageName ? Buffer.from(pdfNotice) :
        await readFile(new URL('../../' + owner.directory + '/' + filename, import.meta.url))
      await writeFile(join(directory, filename), bytes)
      notices.push(bytes)
    }
    const entry = join(directory, 'index.js')
    await writeFile(entry, 'export const used = true\n')
    inputs[entry] = {}
    expected.push({ name: owner.packageName, version: metadata.version, original, notices })
  }
  const full = join(root, 'packages/components/web-full')
  await mkdir(join(full, '.build'), { recursive: true })
  await mkdir(join(full, 'dist'))
  await writeFile(join(full, '.build/iife-inputs.json'), JSON.stringify({
    purpose: 'private-actual-bundle-input-evidence', packages: expected.map(({ name, version }) => ({ name, version }))
  }))
  const output = join(full, 'dist/THIRD_PARTY_LICENSES.txt')
  await writeBundleNotices({ inputs }, output, {
    includeWorkspacePackages: fullWorkspaceLicensePackages.map(owner => owner.packageName)
  })
  const complete = await readFile(output)
  const sections = complete.toString().split('\n\n========================================\n\n')
  for (const owner of expected) {
    const matches = sections.filter(section => section.startsWith(owner.name + '@1.0.0\n\n'))
    assert.equal(matches.length, 1, 'Each physically bundled workspace owner needs its own section: ' + owner.name)
    const section = Buffer.from(matches[0])
    for (const original of [owner.original, ...owner.notices]) assert.ok(section.includes(original))
  }
  assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, owners.length)
  for (const replacement of ['', 'Changed PDF upstream declaration\r\n', pdfNotice.replaceAll('\r\n', '\n')]) {
    await writeFile(output, complete.toString().replace(pdfNotice, replacement))
    await assert.rejects(verifyFullWorkspaceNotices(root), /THIRD_PARTY_NOTICES/)
  }
})

test('normal Full collector includes WordPerfect upstream bytes and rejects notice removal, replacement or truncation', async t => {
  const root = await mkdtemp(join(tmpdir(), 'fv-full-wordperfect-notices-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const owner = fullWorkspaceLicensePackages.find(entry => entry.packageName === '@file-viewer/renderer-wordperfect')
  const directory = join(root, owner.directory)
  const full = join(root, 'packages/components/web-full')
  await mkdir(directory, { recursive: true })
  await mkdir(join(full, '.build'), { recursive: true })
  await mkdir(join(full, 'dist'))
  const notice = await readFile(new URL('../renderers/wordperfect/THIRD_PARTY_NOTICES.md', import.meta.url))
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: owner.packageName, version: '1.0.0', license: 'Apache-2.0' }))
  await writeFile(join(directory, 'LICENSE'), await readFile(new URL('../renderers/wordperfect/LICENSE', import.meta.url)))
  await writeFile(join(directory, 'THIRD_PARTY_NOTICES.md'), notice)
  const entry = join(directory, 'index.js')
  await writeFile(entry, 'export const used = true\n')
  await writeFile(join(full, '.build/iife-inputs.json'), JSON.stringify({ purpose: 'private-actual-bundle-input-evidence',
    packages: [{ name: owner.packageName, version: '1.0.0' }] }))
  const output = join(full, 'dist/THIRD_PARTY_LICENSES.txt')
  await writeBundleNotices({ inputs: { [entry]: {} } }, output, { includeWorkspacePackages: [owner.packageName] })
  const complete = await readFile(output)
  assert.ok(complete.includes(notice))
  assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, 1)
  for (const replacement of ['', 'Replaced upstream attribution\n', notice.subarray(0, Math.floor(notice.length / 2)).toString()]) {
    await writeFile(output, complete.toString().replace(notice.toString(), replacement))
    await assert.rejects(verifyFullWorkspaceNotices(root), /THIRD_PARTY_NOTICES/)
  }
})
