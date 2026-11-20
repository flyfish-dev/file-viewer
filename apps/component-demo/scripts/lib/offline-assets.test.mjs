import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, cp, rm, chmod, rename, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { sanitizeOfflineViewerAssetTree } from '../../../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'
import { copyComponentHelperLegalMaterials, verifyComponentHelperLegalMaterials } from './helper-legal-materials.mjs'
import { createComponentDemoOfflineAssetSanitizerPlugin, sanitizeComponentDemoOfflineAssetTree,
  prepareComponentDemoLegalData, isComponentDemoLegalData, verifyComponentDemoLegalData } from './offline-assets.mjs'

const sourceOffer = 'https://api.github.com/repos/upstream/library/tarball/fixed-source'
const runtimeUrl = 'https://api.github.com/repos/runtime/data'
const expectedOfflineUrl = 'file-viewer-offline-github-api/repos/runtime/data'

async function fixture(t) {
  const sourceRoot = await mkdtemp(join(tmpdir(), 'component-offline-legal-'))
  t.after(() => rm(sourceRoot, { recursive: true, force: true }))
  const outputDir = join(sourceRoot, 'site-dist')
  const outputRoot = join(outputDir, 'file-viewer')
  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(sourceRoot, 'package.json'), JSON.stringify({ version: '3.3.4' }))
  await writeFile(join(sourceRoot, 'LICENSE'), `Original grant\r\nSource: ${sourceOffer}\r\n`)
  for (const [name, owner, files] of [
    ['@file-viewer/web', 'web', ['flyfish-file-viewer-web.iife.js', 'flyfish-file-viewer-web.amd.js']],
    ['@file-viewer/web-full', 'web-full', ['flyfish-file-viewer-web-full.iife.js', 'flyfish-file-viewer-web-full.amd.js', 'renderers/word.iife.js']]
  ]) {
    const directory = join(sourceRoot, 'packages/components', owner)
    await mkdir(join(directory, 'dist/renderers'), { recursive: true })
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name, version: '3.3.4' }))
    await writeFile(join(directory, 'dist/THIRD_PARTY_LICENSES.txt'), `Complete ${name} grants\r\nCorresponding source: ${sourceOffer}\r\n`)
    for (const path of files) {
      await mkdir(join(outputRoot, path, '..'), { recursive: true })
      await writeFile(join(directory, 'dist', path), `globalThis.fixtureOwner = ${JSON.stringify(name)};\n`)
      await cp(join(directory, 'dist', path), join(outputRoot, path))
    }
  }
  await copyComponentHelperLegalMaterials({ sourceRoot, outputRoot })
  await writeFile(join(outputDir, 'runtime.js'), `fetch(${JSON.stringify(runtimeUrl)});\n`)
  await writeFile(join(outputDir, 'settings.json'), JSON.stringify({ endpoint: runtimeUrl }))
  await writeFile(join(outputDir, 'UNVERIFIED_LEGAL.txt'), `Unverified document ${runtimeUrl}\n`)
  const plugin = () => createComponentDemoOfflineAssetSanitizerPlugin(outputDir, { sourceRoot, log: false })
  return { sourceRoot, outputDir, outputRoot, plugin }
}

test('ordinary sanitizer reproduces the original copied legal-byte rejection', async t => {
  const f = await fixture(t)
  await sanitizeOfflineViewerAssetTree(f.outputDir)
  await assert.rejects(verifyComponentHelperLegalMaterials(f), /Copied helper legal material differs/)
})

test('app plugin preserves all four verified original grants and source URLs including CRLF', async t => {
  const f = await fixture(t)
  const owners = await verifyComponentHelperLegalMaterials(f)
  const legal = await Promise.all(owners.flatMap(owner => owner.legal.map(async material => ({
    path: join(f.outputRoot, material.path), bytes: await readFile(join(f.outputRoot, material.path))
  }))))
  assert.equal(legal.length, 4)
  const plugin = f.plugin()
  assert.equal(plugin.apply, 'build')
  assert.equal(plugin.enforce, 'post')
  await plugin.closeBundle()
  for (const material of legal) {
    assert.deepEqual(await readFile(material.path), material.bytes)
    assert.ok(material.bytes.includes(Buffer.from(sourceOffer)))
    assert.ok(material.bytes.includes(Buffer.from('\r\n')))
  }
  await verifyComponentHelperLegalMaterials(f)
  for (const [path, expected] of [
    ['runtime.js', `fetch(${JSON.stringify(expectedOfflineUrl)});\n`],
    ['settings.json', JSON.stringify({ endpoint: expectedOfflineUrl })],
    ['UNVERIFIED_LEGAL.txt', `Unverified document ${expectedOfflineUrl}\n`]
  ]) {
    const text = await readFile(join(f.outputDir, path), 'utf8')
    assert.equal(text, expected)
    assert.ok(text.includes('file-viewer-offline-github-api'))
  }
})

for (const [name, mutate, error] of [
  ['tampered original legal document', f => writeFile(join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt'), 'tampered'), /Copied helper legal material differs/],
  ['copied helper runtime mismatch', f => writeFile(join(f.outputRoot, 'flyfish-file-viewer-web.iife.js'), 'tampered'), /Copied helper runtime differs/],
  ['copied renderer runtime mismatch', f => writeFile(join(f.outputRoot, 'renderers/word.iife.js'), 'tampered'), /Copied helper runtime differs/],
  ['copied renderer inventory mismatch', f => writeFile(join(f.outputRoot, 'renderers/extra.js'), 'extra'), /Copied renderer input set differs/],
  ['helper owner name mismatch', f => writeFile(join(f.sourceRoot, 'packages/components/web/package.json'), JSON.stringify({ name: '@file-viewer/foreign', version: '3.3.4' })), /Copied helper package owner changed/],
  ['helper owner version mismatch', f => writeFile(join(f.sourceRoot, 'packages/components/web-full/package.json'), JSON.stringify({ name: '@file-viewer/web-full', version: '3.3.3' })), /Copied helper version differs/]
]) {
  test(`app plugin rejects ${name} before sanitizing any runtime output`, async t => {
    const f = await fixture(t)
    const runtimeBefore = await readFile(join(f.outputDir, 'runtime.js'))
    await mutate(f)
    await assert.rejects(f.plugin().closeBundle(), error)
    assert.deepEqual(await readFile(join(f.outputDir, 'runtime.js')), runtimeBefore)
  })
}

test('shared release sanitizer preserves four original legal documents across two passes and still localizes runtime URLs', async t => {
  const f = await fixture(t)
  const owners = await verifyComponentHelperLegalMaterials(f)
  const legal = await Promise.all(owners.flatMap(owner => owner.legal.map(async material => ({
    path: join(f.outputRoot, material.path), bytes: await readFile(join(f.outputRoot, material.path))
  }))))
  assert.equal(legal.length, 4)
  const first = await sanitizeComponentDemoOfflineAssetTree(f.outputDir, { sourceRoot: f.sourceRoot })
  assert.equal(first.replacementCount, 3)
  for (const [path, expected] of [
    ['runtime.js', `fetch(${JSON.stringify(expectedOfflineUrl)});\n`],
    ['settings.json', JSON.stringify({ endpoint: expectedOfflineUrl })],
    ['UNVERIFIED_LEGAL.txt', `Unverified document ${expectedOfflineUrl}\n`]
  ]) assert.equal(await readFile(join(f.outputDir, path), 'utf8'), expected)
  for (const material of legal) assert.deepEqual(await readFile(material.path), material.bytes)
  const second = await sanitizeComponentDemoOfflineAssetTree(f.outputDir, { sourceRoot: f.sourceRoot })
  assert.equal(second.replacementCount, 0)
  assert.deepEqual(second.touchedFiles, [])
  for (const material of legal) assert.deepEqual(await readFile(material.path), material.bytes)
  await verifyComponentHelperLegalMaterials(f)
  assert.equal(await f.plugin().closeBundle(), undefined)
})

for (const [name, mutate, error] of [
  ['tampered copied grant', f => writeFile(join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt'), 'tampered'), /Copied helper legal material differs/],
  ['changed original source notice', f => writeFile(join(f.sourceRoot, 'packages/components/web-full/dist/THIRD_PARTY_LICENSES.txt'), 'changed source notice'), /Copied helper legal material differs/],
  ['mismatched copied helper runtime', f => writeFile(join(f.outputRoot, 'flyfish-file-viewer-web.iife.js'), 'tampered'), /Copied helper runtime differs/],
  ['changed original runtime input', f => writeFile(join(f.sourceRoot, 'packages/components/web-full/dist/flyfish-file-viewer-web-full.iife.js'), 'changed source runtime'), /Copied helper runtime differs/],
  ['extra copied renderer member', f => writeFile(join(f.outputRoot, 'renderers/extra.js'), 'extra'), /Copied renderer input set differs/],
  ['foreign source owner', f => writeFile(join(f.sourceRoot, 'packages/components/web/package.json'), JSON.stringify({ name: '@file-viewer/foreign', version: '3.3.4' })), /Copied helper package owner changed/]
]) {
  test(`shared release sanitizer rejects ${name} before changing runtime bytes`, async t => {
    const f = await fixture(t), runtimeBefore = await readFile(join(f.outputDir, 'runtime.js'))
    await mutate(f)
    await assert.rejects(sanitizeComponentDemoOfflineAssetTree(f.outputDir, { sourceRoot: f.sourceRoot }), error)
    assert.deepEqual(await readFile(join(f.outputDir, 'runtime.js')), runtimeBefore)
  })
}

test('offline verification recognizes exactly four owner-bound legal aliases with unchanged original bytes', async t => {
  const f = await fixture(t), proof = await prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot })
  const owners = await verifyComponentHelperLegalMaterials(f)
  let count = 0
  for (const owner of owners) {
    for (const material of owner.legal) {
      const file = join(f.outputRoot, material.path), bytes = await readFile(file)
      assert.ok(bytes.includes(Buffer.from(sourceOffer)))
      assert.ok(bytes.includes(Buffer.from('\r\n')))
      assert.equal(await isComponentDemoLegalData(proof, file, bytes, 'asset'), true)
      assert.equal(await isComponentDemoLegalData(proof, file, bytes, 'source'), false)
      assert.deepEqual(await readFile(file), bytes)
      count += 1
    }
  }
  assert.equal(count, 4)
  await verifyComponentDemoLegalData(proof)
})

test('runtime URLs and unverified or neighboring documents never gain a legal-data exemption', async t => {
  const f = await fixture(t), proof = await prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot })
  for (const path of ['runtime.js', 'settings.json', 'UNVERIFIED_LEGAL.txt']) {
    const file = join(f.outputDir, path), bytes = await readFile(file)
    assert.ok(bytes.includes(Buffer.from(runtimeUrl)))
    assert.equal(await isComponentDemoLegalData(proof, file, bytes, 'asset'), false)
  }
  const original = await readFile(join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt'))
  const neighbor = join(f.outputDir, 'WEB_FULL_THIRD_PARTY_LICENSES.txt')
  await writeFile(neighbor, original)
  assert.equal(await isComponentDemoLegalData(proof, neighbor, original, 'asset'), false)
  await assert.rejects(isComponentDemoLegalData({}, neighbor, original, 'asset'), /Verified copied helper owners/)
})

test('unbuilt or absent helper roots issue no legal-data proof', async t => {
  const f = await fixture(t)
  await rm(f.outputRoot, { recursive: true })
  assert.equal(await prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot }), null)
  assert.equal(await prepareComponentDemoLegalData(join(f.sourceRoot, 'missing'), { sourceRoot: f.sourceRoot }), null)
  assert.equal(await isComponentDemoLegalData(null, join(f.outputDir, 'UNVERIFIED_LEGAL.txt'), Buffer.from(sourceOffer), 'asset'), false)
  await verifyComponentDemoLegalData(null)
})

test('classification requires the exact scanned raw bytes as well as the current document fingerprint', async t => {
  const f = await fixture(t), proof = await prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot })
  const file = join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt'), original = await readFile(file)
  const wrong = Buffer.from(original)
  wrong[0] ^= 1
  await assert.rejects(isComponentDemoLegalData(proof, file, wrong, 'asset'), /Scanned copied legal bytes differ/)
  await writeFile(file, wrong)
  await assert.rejects(isComponentDemoLegalData(proof, file, wrong, 'asset'), /Copied legal data changed/)
  await assert.rejects(verifyComponentDemoLegalData(proof), /Copied helper legal material differs/)
})

test('legal aliases must remain non-executable with their verified file mode', async t => {
  const f = await fixture(t), file = join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt')
  await chmod(file, 0o755)
  await assert.rejects(prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot }), /non-executable regular document/)
  await chmod(file, 0o644)
  const proof = await prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot })
  await chmod(file, 0o600)
  await assert.rejects(isComponentDemoLegalData(proof, file, await readFile(file), 'asset'), /Copied legal data changed/)
  await assert.rejects(verifyComponentDemoLegalData(proof), /Copied legal data changed/)
})

for (const target of ['document', 'helper root', 'renderer root']) {
  test(`legal proof rejects a linked ${target}`, async t => {
    const f = await fixture(t)
    const path = target === 'document' ? join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt')
      : target === 'helper root' ? f.outputRoot : join(f.outputRoot, 'renderers')
    const original = `${path}.original`
    await rename(path, original)
    await symlink(original, path)
    await assert.rejects(prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot }), /regular helper material|unlinked directory|linked parents/)
  })
}

for (const [name, mutate] of [
  ['matching source and copied runtime bytes', async f => {
    for (const path of [join(f.sourceRoot, 'packages/components/web/dist/flyfish-file-viewer-web.iife.js'),
      join(f.outputRoot, 'flyfish-file-viewer-web.iife.js')]) await writeFile(path, 'changed runtime on both sides')
  }],
  ['matching source and copied renderer membership', async f => {
    for (const path of [join(f.sourceRoot, 'packages/components/web-full/dist/renderers/extra.js'),
      join(f.outputRoot, 'renderers/extra.js')]) await writeFile(path, 'extra renderer on both sides')
  }]
]) {
  test(`end-of-scan verification rejects drift in ${name}`, async t => {
    const f = await fixture(t), proof = await prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot })
    await mutate(f)
    await assert.rejects(verifyComponentDemoLegalData(proof), /complete runtime inputs changed/)
  })
}

for (const [name, mutate, error] of [
  ['foreign owner', f => writeFile(join(f.sourceRoot, 'packages/components/web/package.json'), JSON.stringify({ name: '@file-viewer/foreign', version: '3.3.4' })), /Copied helper package owner changed/],
  ['tampered legal copy', f => writeFile(join(f.outputRoot, 'WEB_FULL_THIRD_PARTY_LICENSES.txt'), sourceOffer), /Copied helper legal material differs/],
  ['mismatched runtime copy', f => writeFile(join(f.outputRoot, 'flyfish-file-viewer-web.iife.js'), 'foreign runtime'), /Copied helper runtime differs/]
]) {
  test(`legal proof refuses ${name} before recognizing any alias`, async t => {
    const f = await fixture(t)
    await mutate(f)
    await assert.rejects(prepareComponentDemoLegalData(f.outputDir, { sourceRoot: f.sourceRoot }), error)
  })
}
