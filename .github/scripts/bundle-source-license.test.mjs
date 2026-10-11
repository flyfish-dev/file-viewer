import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readReviewedSourceLicense,
  writeBundleNotices
} from '../../packages/build-support/bundle-notices.mjs'
import { verifyCodecSourceLicenses } from './lib/verified-codec-artifacts.mjs'

const packageRoot = resolve(import.meta.dirname, '../../packages/renderers/dicom')
const provenance = JSON.parse(
  await readFile(join(packageRoot, 'third-party/native-codecs/PROVENANCE.json'), 'utf8')
)
const bindings = verifyCodecSourceLicenses(packageRoot, provenance)
const binding = bindings[0]
const metadata = { name: binding.name, version: binding.version, license: binding.declaredLicense }

test('bundle notices retain the complete source text and separate its license from npm metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'file-viewer-bundle-license-'))
  try {
    const installed = join(directory, 'node_modules', metadata.name)
    await mkdir(installed, { recursive: true })
    await writeFile(join(installed, 'package.json'), JSON.stringify(metadata))
    const input = join(installed, 'index.js')
    await writeFile(input, '')
    const output = join(directory, 'THIRD_PARTY_LICENSES.txt')
    const metafile = { inputs: { [input]: {} } }
    await assert.rejects(writeBundleNotices(metafile, output), /Missing license text/)
    await writeBundleNotices(metafile, output, { reviewedSourceLicenses: bindings })
    const notices = await readFile(output, 'utf8')
    assert.ok(notices.includes(await readFile(binding.filePath, 'utf8')))
    assert.ok(notices.includes('Retained source license: MIT; npm declaration: ISC'))
    assert.ok(notices.includes(`/blob/${binding.gitCommit}/LICENSE`))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('source license cannot authorize another version, changed metadata or missing full text', async () => {
  await assert.rejects(
    readReviewedSourceLicense({ ...metadata, version: '0.0.0' }, bindings),
    /version drifted/
  )
  await assert.rejects(
    readReviewedSourceLicense({ ...metadata, license: 'UNLICENSED' }, bindings),
    /declaration drifted/
  )
  await assert.rejects(
    readReviewedSourceLicense(metadata, [{ ...binding, sha256: '0'.repeat(64) }]),
    /hash drifted/
  )
  const directory = await mkdtemp(join(tmpdir(), 'file-viewer-missing-license-'))
  try {
    await assert.rejects(
      readReviewedSourceLicense(metadata, [{ ...binding, filePath: join(directory, 'absent') }]),
      /Missing retained full source license/
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
