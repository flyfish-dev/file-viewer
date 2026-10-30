import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { declaredSpdxNotice } from './declared-spdx-notices.mjs'
import { correspondingSourceNotice } from './corresponding-source-notices.mjs'

export async function readReviewedSourceLicense(metadata, reviewedSourceLicenses = []) {
  const matches = reviewedSourceLicenses.filter((entry) => entry.name === metadata.name)
  if (!matches.length) return null
  assert.equal(matches.length, 1, `Ambiguous retained source license: ${metadata.name}`)
  const entry = matches[0]
  assert.equal(metadata.version, entry.version, `Retained source license version drifted: ${metadata.name}`)
  const declared = typeof metadata.license === 'string' ? metadata.license : metadata.license?.type
  assert.equal(declared, entry.declaredLicense, `Retained source license declaration drifted: ${metadata.name}`)
  const bytes = await readFile(entry.filePath)
  assert.equal(bytes.length, entry.bytes, `Retained source license size drifted: ${metadata.name}`)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256,
    `Retained source license hash drifted: ${metadata.name}`)
  const { filePath, ...source } = entry
  return { source, text: bytes.toString('utf8') }
}

// These exact releases omit LICENSE from npm. Retain the complete original
// text from the matching public upstream tag, verified against its Git blob.
export async function retainedBundleLicense(metadata) {
  let file, expectedLicense, expectedHash, source, selectedLicense
  if (['@myriaddreamin/typst-ts-renderer', '@myriaddreamin/typst-ts-web-compiler'].includes(metadata.name) && metadata.version === '0.7.0') {
    file = 'typst-ts-0.7.0-Apache-2.0.txt'
    expectedLicense = 'Apache-2.0'
    expectedHash = '06292ffcdd7d313747999255a8411e14933df33e24427a46d169cc5ff845227c'
    source = 'https://raw.githubusercontent.com/Myriad-Dreamin/typst.ts/0501ced21131dccc68d12c5602cdb20909a52541/LICENSE'
  } else if (metadata.name === '@paged-media/introspect-wasm' && ['0.63.0', '0.70.2', '0.73.4'].includes(metadata.version)) {
    file = `introspect-wasm-${metadata.version}-MPL-2.0.txt`
    expectedLicense = 'MPL-2.0 OR LicenseRef-PMEL'
    expectedHash = '3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04'
    const commit = metadata.version === '0.73.4'
      ? '8eb9e21febaffbf5bb15e5158bb83896141682b2'
      : metadata.version === '0.70.2'
      ? 'c7a4b788cc24acd7d5af8843655ec3806ad613a1'
      : '08fb4b14e3d2bfcb7e67f0b768ba196f82f3e80e'
    source = `https://raw.githubusercontent.com/paged-media/core/${commit}/LICENSE`
    selectedLicense = 'MPL-2.0'
  } else if (metadata.name === 'saxes' && metadata.version === '6.0.0') {
    file = 'saxes-6.0.0-LICENSE.txt'
    expectedLicense = 'ISC'
    expectedHash = '0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e'
    source = 'https://raw.githubusercontent.com/lddubeau/saxes/211fa0ebec9b628affc09219199639887174bfc3/LICENSE'
  } else return null
  if (metadata.license !== expectedLicense) throw new Error('Retained upstream license election changed')
  const path = new URL('./licenses/' + file, import.meta.url)
  const bytes = await readFile(path)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== expectedHash) throw new Error('Retained upstream license changed')
  const result = { path, bytes, sha256, source, selectedLicense }
  if (selectedLicense) {
    const noticeBytes = await readFile(new URL(`./licenses/introspect-wasm-${metadata.version}-LICENSE.md`, import.meta.url))
    const noticeHash = createHash('sha256').update(noticeBytes).digest('hex')
    if (noticeHash !== '0f2f360ee7ab3daa36362fdf07ae6dfcf8a7e1b6987050ef1ffd0b9f6708bfa6') throw new Error('Retained upstream license grant changed')
    result.notice = { bytes: noticeBytes, sha256: noticeHash, source: source.replace(/LICENSE$/, 'LICENSE.md') }
    if (['0.70.2', '0.73.4'].includes(metadata.version)) {
      const book = JSON.parse(await readFile(new URL('../renderers/design/LICENSES/Introspect_NATIVE_THIRD_PARTY_LICENSES.json', import.meta.url)))
      assert.equal(book.source.npmPackage, metadata.name)
      assert.equal(book.source.npmVersion, metadata.version)
      assert.equal(book.source.commit, metadata.version === '0.73.4'
        ? '8eb9e21febaffbf5bb15e5158bb83896141682b2'
        : 'c7a4b788cc24acd7d5af8843655ec3806ad613a1')
      assert.equal(book.source.archiveSha256, metadata.version === '0.73.4'
        ? 'd7ebd70f16ce8f0b5936ec3daa0174b093122d5a0af728f01a16e7596cdce1a0'
        : '58f8eb6e1a0f06b8e2c8babf27d1ae0bad37a21db1ff8243298bdc647eee34a7')
      assert.equal(book.licenseReview.status, 'reviewed')
      result.correspondingSource = book.licenseReview.correspondingSourceArchives
      assert.ok(result.correspondingSource.every(entry => entry.status === 'verified' && entry.matchesInstalledInput && !entry.includesCoveredModifications))
    }
  }
  return result
}

export async function resolveBundleLicense(directory, metadata) {
  const declared = typeof metadata.license === 'string' ? metadata.license : metadata.license?.type
  if (declared) return declared
  // This exact upstream release omits license metadata but ships its full MIT
  // text. Pin the reviewed text instead of leaving its bundled SPDX entry blank.
  if (metadata.name === 'khroma' && metadata.version === '2.1.0') {
    const text = await readFile(join(directory, 'license'))
    const hash = createHash('sha256').update(text).digest('hex')
    if (hash === '66b333b0f66759a0b710459e03f7029abe17f4358114a128d2c972e642961b49') return 'MIT'
  }
  throw new Error(`Missing reviewed license declaration for bundled ${metadata.name}@${metadata.version}`)
}

export async function writeBundleNotices(metafile, output, { readmeLicensePackages = [], reviewedSourceLicenses = [], includeWorkspacePackages = [], includePrebundledSdkPackages = [] } = {}) {
  const packages = new Map()
  const prebundled = new Map()
  for (const input of Object.keys(metafile.inputs)) {
    const installedPackage = input.includes('node_modules/')
    let directory = dirname(resolve(input))
    while (dirname(directory) !== directory) {
      try {
        const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
        if (metadata.name && metadata.version) {
          const sdkInput = relative(join(directory, 'dist'), resolve(input)).replaceAll('\\', '/')
          if (includePrebundledSdkPackages.includes(metadata.name) && !sdkInput.startsWith('../') && /\.[cm]?js$/.test(sdkInput)) {
            const id = `${metadata.name}@${metadata.version}`
            if (!prebundled.has(id)) prebundled.set(id, { directory, metadata, inputs: new Set() })
            prebundled.get(id).inputs.add(sdkInput)
          }
          // A workspace dependency may carry a different license from the host.
          // Retain its original grant when it is physically included in the bundle.
          if (installedPackage || includeWorkspacePackages.includes(metadata.name)) {
            packages.set(`${metadata.name}@${metadata.version}`, { directory, metadata })
          }
          break
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      directory = dirname(directory)
    }
  }
  const notices = []
  for (const [id, { directory, metadata }] of [...packages].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const filenames = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /(?:^|[._-])(?:licen[cs]es?|copying|notices?)(?:[._-]|$)/i.test(entry.name))
      .map((entry) => entry.name)
      .sort()
    const sections = [id, `License: ${await resolveBundleLicense(directory, metadata)}`]
    if (metadata.repository)
      sections.push(`Source: ${metadata.repository.url || metadata.repository}`)
    for (const filename of filenames) {
      sections.push(`--- ${filename} ---\n${await readFile(join(directory, filename), 'utf8')}`)
    }
    const corresponding = await correspondingSourceNotice(metadata)
    if (corresponding) sections.push(corresponding.text)
    const sourceLicense = await readReviewedSourceLicense(metadata, reviewedSourceLicenses)
    if (sourceLicense) {
      sections.push(`Retained source license: ${sourceLicense.source.sourceLicense}; npm declaration: ${sourceLicense.source.declaredLicense}`)
      sections.push(`Exact source: ${sourceLicense.source.repository}/blob/${sourceLicense.source.gitCommit}/${sourceLicense.source.sourcePath}`)
      sections.push(`--- Retained upstream ${sourceLicense.source.sourcePath} ---\n${sourceLicense.text}`)
    }
    if (!filenames.length && !sourceLicense) {
      const retained = await retainedBundleLicense(metadata)
      if (retained) {
        if (retained.selectedLicense) sections.push(`Distributed under: ${retained.selectedLicense}`)
        sections.push(`--- Complete upstream LICENSE ---\nSource: ${retained.source}\nSHA-256: ${retained.sha256}\n\n${retained.bytes.toString('utf8')}`)
        for (const offer of retained.correspondingSource || []) {
          sections.push(`--- Unmodified corresponding source ---\nSource: ${offer.url}\nCommit: ${offer.commit}\nSHA-256: ${offer.sha256}\nThis exact public source matches the retained official input; no bit-identical WASM rebuild is asserted.`)
        }
        if (retained.notice) sections.push(`--- Complete upstream license grant and attribution ---\nSource: ${retained.notice.source}\nSHA-256: ${retained.notice.sha256}\n\n${retained.notice.bytes.toString('utf8')}`)
        notices.push(sections.join('\n\n'))
        continue
      }
      const supplement = await declaredSpdxNotice(metadata, { directory })
      if (supplement) {
        sections.push(supplement.text)
        notices.push(sections.join('\n\n'))
        continue
      }
      if (!readmeLicensePackages.includes(metadata.name))
        throw new Error(`Missing license text for bundled ${id}`)
      // This published package declares MIT only in its metadata and README.
      // Preserve that actual declaration and attribution rather than inventing a license file.
      sections.push(
        `Author: ${typeof metadata.author === 'string' ? metadata.author : metadata.author?.name}`
      )
      sections.push(
        `--- Upstream README (no separate license file was published) ---\n${await readFile(join(directory, 'README.md'), 'utf8')}`
      )
    }
    notices.push(sections.join('\n\n'))
  }
  for (const [id, { directory, metadata, inputs }] of [...prebundled].sort(([a], [b]) => a.localeCompare(b))) {
    // A second bundler sees SDK chunks as workspace input files. Retain the
    // first build's complete grants only after binding its exact emitted bytes.
    const sdkRoot = join(directory, 'dist')
    const receiptBytes = await readFile(join(sdkRoot, 'bundled-runtime.json'))
    const receipt = JSON.parse(receiptBytes)
    assert.equal(receipt.schemaVersion, 1, `Unknown prebundled SDK receipt: ${id}`)
    assert.equal(receipt.packageName, metadata.name, `Prebundled SDK owner changed: ${id}`)
    assert.equal(receipt.packageVersion, metadata.version, `Prebundled SDK version changed: ${id}`)
    for (const input of [...inputs].sort()) {
      const expected = receipt.files[input]
      assert.ok(expected, `Prebundled SDK input lacks an exact build receipt: ${id}/${input}`)
      const bytes = await readFile(join(sdkRoot, input))
      assert.equal(bytes.length, expected.bytes, `Prebundled SDK input size changed: ${id}/${input}`)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256,
        `Prebundled SDK input bytes changed: ${id}/${input}`)
    }
    const original = await readFile(join(sdkRoot, 'THIRD_PARTY_LICENSES.txt'))
    const expected = receipt.files['THIRD_PARTY_LICENSES.txt']
    assert.ok(expected, `Prebundled SDK original grants lack an exact receipt: ${id}`)
    assert.equal(original.length, expected.bytes, `Prebundled SDK notice size changed: ${id}`)
    assert.equal(createHash('sha256').update(original).digest('hex'), expected.sha256,
      `Prebundled SDK original grants changed: ${id}`)
    notices.push(`Prebundled browser runtime: ${id}\n\nExact build receipt SHA-256: ${createHash('sha256').update(receiptBytes).digest('hex')}\n\n--- Complete original SDK third-party grants ---\n${original.toString('utf8')}`)
  }
  await writeFile(output, notices.join('\n\n========================================\n\n') + '\n')
}
