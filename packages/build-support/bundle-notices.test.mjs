import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { writeBundleNotices } from './bundle-notices.mjs'
import {
  fullWorkspaceLicensePackages,
  verifyFullWorkspaceNotices
} from './full-workspace-notices.mjs'

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
  assert.equal((await verifyFullWorkspaceNotices(root)).checked.length, 4)
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
