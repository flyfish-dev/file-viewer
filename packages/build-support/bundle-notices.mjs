import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

export async function readReviewedSourceLicense(metadata, reviewedSourceLicenses = []) {
  const matches = reviewedSourceLicenses.filter((entry) => entry.name === metadata.name)
  if (!matches.length) return null
  assert.equal(matches.length, 1, `Ambiguous retained source license: ${metadata.name}`)
  const entry = matches[0]
  assert.equal(
    metadata.version,
    entry.version,
    `Retained source license version drifted: ${metadata.name}`
  )
  const declared = typeof metadata.license === 'string' ? metadata.license : metadata.license?.type
  assert.equal(
    declared,
    entry.declaredLicense,
    `Retained source license declaration drifted: ${metadata.name}`
  )
  let bytes
  try {
    bytes = await readFile(entry.filePath)
  } catch (cause) {
    throw new Error(`Missing retained full source license: ${metadata.name}`, { cause })
  }
  assert.equal(bytes.length, entry.bytes, `Retained source license size drifted: ${metadata.name}`)
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    entry.sha256,
    `Retained source license hash drifted: ${metadata.name}`
  )
  const { filePath, ...source } = entry
  return { source, text: bytes.toString('utf8') }
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
  throw new Error(
    `Missing reviewed license declaration for bundled ${metadata.name}@${metadata.version}`
  )
}

export async function writeBundleNotices(
  metafile,
  output,
  { readmeLicensePackages = [], reviewedSourceLicenses = [] } = {}
) {
  const packages = new Map()
  for (const input of Object.keys(metafile.inputs)) {
    if (!input.includes('node_modules/')) continue
    let directory = dirname(resolve(input))
    while (dirname(directory) !== directory) {
      try {
        const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
        if (metadata.name && metadata.version) {
          packages.set(`${metadata.name}@${metadata.version}`, { directory, metadata })
          break
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      directory = dirname(directory)
    }
  }
  const notices = []
  const missingLicenses = []
  for (const [id, { directory, metadata }] of [...packages].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const filenames = (await readdir(directory))
      .filter((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name))
      .sort()
    const sections = [id, `License: ${await resolveBundleLicense(directory, metadata)}`]
    if (metadata.repository)
      sections.push(`Source: ${metadata.repository.url || metadata.repository}`)
    for (const filename of filenames) {
      sections.push(`--- ${filename} ---\n${await readFile(join(directory, filename), 'utf8')}`)
    }
    const retained = await readReviewedSourceLicense(metadata, reviewedSourceLicenses)
    if (retained) {
      sections.push(
        `Retained source license: ${retained.source.sourceLicense}; npm declaration: ${retained.source.declaredLicense}`
      )
      sections.push(
        `Exact source: ${retained.source.repository}/blob/${retained.source.gitCommit}/${retained.source.sourcePath}`
      )
      sections.push(`--- Retained upstream ${retained.source.sourcePath} ---\n${retained.text}`)
    }
    if (!filenames.length && !retained) {
      if (!readmeLicensePackages.includes(metadata.name)) {
        missingLicenses.push(id)
        continue
      }
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
  if (missingLicenses.length)
    throw new Error(`Missing license text for bundled ${missingLicenses.join(', ')}`)
  await writeFile(output, notices.join('\n\n========================================\n\n') + '\n')
}
