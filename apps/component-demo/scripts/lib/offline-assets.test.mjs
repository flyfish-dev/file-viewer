import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { sanitizeOfflineViewerAssetTree } from '../../../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'
import { copyComponentHelperLegalMaterials, verifyComponentHelperLegalMaterials } from './helper-legal-materials.mjs'
import { createComponentDemoOfflineAssetSanitizerPlugin } from './offline-assets.mjs'

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
