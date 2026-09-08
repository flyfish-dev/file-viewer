import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  isolatePdfJsWebpackRuntime,
  pdfJsRuntimeIsolationTransform,
  pdfJsRuntimeModificationNotice
} from './pdfjs-runtime-transform.mjs'

export const pdfJsRuntimeVersion = '5.4.624'
export const pdfJsProvenanceSchemaVersion = 4
export const pdfJsSourcePatchPath = `patches/pdfjs-dist@${pdfJsRuntimeVersion}.patch`
export const pdfJsRuntimePaths = [
  'legacy/build/pdf.mjs',
  'legacy/build/pdf.worker.mjs',
  'legacy/web/pdf_viewer.mjs'
]
export const pdfJsAssetDirectories = ['cmaps', 'wasm', 'standard_fonts']
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

// Use an independent source tree and patch, not the installed manifest alone,
// so cold-install checks also detect stale or self-consistently altered payloads.
export async function verifyPdfJsRuntimeProvenance(vendorRoot, { sourceRoot, patchFile }) {
  const provenance = JSON.parse(await readFile(resolve(vendorRoot, 'provenance.json'), 'utf8'))
  if (
    provenance.schemaVersion !== pdfJsProvenanceSchemaVersion ||
    provenance.runtimeTransform !== pdfJsRuntimeIsolationTransform
  ) {
    throw new Error(
      'PDF.js provenance must use schema 4 with the webpack 4 runtime isolation transform.'
    )
  }
  const sourcePackage = JSON.parse(await readFile(resolve(sourceRoot, 'package.json'), 'utf8'))
  if (
    sourcePackage.name !== 'pdfjs-dist' ||
    sourcePackage.version !== pdfJsRuntimeVersion ||
    provenance.packageName !== 'pdfjs-dist' ||
    provenance.version !== pdfJsRuntimeVersion
  ) {
    throw new Error('PDF.js provenance package/version does not match the pinned runtime.')
  }
  const patchBytes = await readFile(patchFile)
  const sourcePatches = [
    { path: pdfJsSourcePatchPath, sha256: sha256(patchBytes), size: patchBytes.byteLength }
  ]
  if (JSON.stringify(provenance.sourcePatches) !== JSON.stringify(sourcePatches)) {
    throw new Error('PDF.js provenance is missing the pinned document cancellation patch.')
  }
  if (!(await readFile(resolve(vendorRoot, pdfJsSourcePatchPath))).equals(patchBytes)) {
    throw new Error('PDF.js staged source patch differs from the locked workspace patch.')
  }
  if (JSON.stringify(provenance.assetDirectories) !== JSON.stringify(pdfJsAssetDirectories)) {
    throw new Error('PDF.js staged asset provenance does not match the pinned offline payload.')
  }
  if (
    !Array.isArray(provenance.runtimeFiles) ||
    provenance.runtimeFiles.length !== pdfJsRuntimePaths.length
  ) {
    throw new Error('PDF.js provenance must cover the three staged browser runtime files.')
  }
  for (const target of pdfJsRuntimePaths) {
    const record = provenance.runtimeFiles.find((entry) => entry.path === target)
    if (!record) throw new Error(`PDF.js provenance is missing ${target}`)
    const content = await readFile(resolve(vendorRoot, target))
    const source = await readFile(resolve(sourceRoot, target))
    const expected = isolatePdfJsWebpackRuntime(source.toString('utf8'))
    if (
      record.sourceSha256 !== sha256(source) ||
      record.sourceSize !== source.byteLength ||
      record.runtimeBindingReplacements !== expected.replacements ||
      expected.replacements < 1 ||
      content.toString('utf8') !== expected.output ||
      record.sha256 !== sha256(content) ||
      record.size !== content.byteLength
    ) {
      throw new Error(`PDF.js staged runtime hash mismatch: ${target}`)
    }
    if (/\b__webpack_(modules|module_cache|exports|require)__\b/.test(content.toString('utf8'))) {
      throw new Error(`PDF.js staged runtime was not isolated for webpack 4: ${target}`)
    }
    if (!content.toString('utf8').startsWith(pdfJsRuntimeModificationNotice)) {
      throw new Error(`PDF.js staged runtime is missing its modification notice: ${target}`)
    }
    if (
      target.endsWith('/pdf.worker.mjs') &&
      !source.includes('File Viewer modification: canceled initialization')
    ) {
      throw new Error(
        'PDF.js startup cancellation patch was not applied; install with the frozen pnpm lockfile.'
      )
    }
  }
  for (const [name, record] of [
    ['LICENSE', provenance.license],
    ['NOTICE', provenance.notice]
  ]) {
    if (record?.path !== name || !record.sha256) {
      throw new Error('PDF.js provenance is missing license or notice metadata.')
    }
    const content = await readFile(resolve(vendorRoot, name))
    if (record.sha256 !== sha256(content) || record.size !== content.byteLength) {
      throw new Error(`PDF.js staged notice hash mismatch: ${name}`)
    }
  }
  return provenance
}
