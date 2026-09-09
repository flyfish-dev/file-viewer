import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  pdfJsAssetDirectories,
  pdfJsProvenanceSchemaVersion,
  pdfJsRuntimePaths,
  pdfJsRuntimeVersion,
  pdfJsSourcePatchPath,
  verifyPdfJsRuntimeProvenance
} from '../packages/renderers/pdf/scripts/pdfjs-runtime-provenance.mjs'
import {
  isolatePdfJsWebpackRuntime,
  pdfJsRuntimeIsolationTransform
} from '../packages/renderers/pdf/scripts/pdfjs-runtime-transform.mjs'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const record = (path: string, content: string) => ({
  path,
  sha256: digest(content),
  size: Buffer.byteLength(content)
})
const put = async (path: string, content: string) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}
let root: string
let sourceRoot: string
let vendorRoot: string
let patchFile: string
const worker = 'legacy/build/pdf.worker.mjs'
const manifestPath = () => join(vendorRoot, 'provenance.json')
const verify = () => verifyPdfJsRuntimeProvenance(vendorRoot, { sourceRoot, patchFile })

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pdfjs-provenance-'))
  sourceRoot = join(root, 'source')
  vendorRoot = join(root, 'installed')
  patchFile = join(root, 'locked.patch')
  const patch = 'Pinned document initialization cancellation patch\n'
  await put(patchFile, patch)
  await put(join(vendorRoot, pdfJsSourcePatchPath), patch)
  await put(
    join(sourceRoot, 'package.json'),
    JSON.stringify({
      name: 'pdfjs-dist',
      version: pdfJsRuntimeVersion
    })
  )
  const runtimeFiles = []
  for (const path of pdfJsRuntimePaths) {
    const source = `const __webpack_exports__ = {};\n${
      path === worker ? '// File Viewer modification: canceled initialization\n' : ''
    }`
    const transformed = isolatePdfJsWebpackRuntime(source)
    await put(join(sourceRoot, path), source)
    await put(join(vendorRoot, path), transformed.output)
    runtimeFiles.push({
      ...record(path, transformed.output),
      sourceSha256: digest(source),
      sourceSize: Buffer.byteLength(source),
      runtimeBindingReplacements: transformed.replacements
    })
  }
  await put(join(vendorRoot, 'LICENSE'), 'Apache-2.0\n')
  await put(join(vendorRoot, 'NOTICE'), 'PDF.js runtime\n')
  await put(
    manifestPath(),
    JSON.stringify({
      schemaVersion: pdfJsProvenanceSchemaVersion,
      packageName: 'pdfjs-dist',
      version: pdfJsRuntimeVersion,
      runtimeTransform: pdfJsRuntimeIsolationTransform,
      sourcePatches: [record(pdfJsSourcePatchPath, patch)],
      assetDirectories: pdfJsAssetDirectories,
      runtimeFiles,
      license: record('LICENSE', 'Apache-2.0\n'),
      notice: record('NOTICE', 'PDF.js runtime\n')
    })
  )
})
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

describe('PDF.js installed runtime provenance', () => {
  it('accepts the exact pinned source, transform and cancellation patch', async () => {
    await expect(verify()).resolves.toMatchObject({ schemaVersion: 4 })
  })

  it('rejects the old schema even if every payload hash matches', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    manifest.schemaVersion = 3
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('schema 4')
  })

  it('rejects a missing patch declaration', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    delete manifest.sourcePatches
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('pinned document cancellation patch')
  })

  it('rejects a changed source patch even if its declared digest is rewritten', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    const changed = 'unrelated patch\n'
    await put(join(vendorRoot, pdfJsSourcePatchPath), changed)
    manifest.sourcePatches = [record(pdfJsSourcePatchPath, changed)]
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('pinned document cancellation patch')
  })

  it('rejects changed patch bytes behind an unchanged declaration', async () => {
    await put(join(vendorRoot, pdfJsSourcePatchPath), 'stale patch\n')
    await expect(verify()).rejects.toThrow('locked workspace patch')
  })

  it.each(['payload', 'payload-and-manifest'])('rejects changed worker bytes: %s', async (mode) => {
    const changed = `${await readFile(join(vendorRoot, worker), 'utf8')}\nthrow new Error('stale');\n`
    await put(join(vendorRoot, worker), changed)
    if (mode === 'payload-and-manifest') {
      const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
      const workerRecord = manifest.runtimeFiles.find(
        (item: { path: string }) => item.path === worker
      )
      Object.assign(workerRecord, record(worker, changed))
      await put(manifestPath(), JSON.stringify(manifest))
    }
    await expect(verify()).rejects.toThrow(`runtime hash mismatch: ${worker}`)
  })

  it('rejects a patch declaration without the applied Worker patch', async () => {
    const source = 'const __webpack_exports__ = {};\n'
    const transformed = isolatePdfJsWebpackRuntime(source)
    await put(join(sourceRoot, worker), source)
    await put(join(vendorRoot, worker), transformed.output)
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    const workerRecord = manifest.runtimeFiles.find(
      (item: { path: string }) => item.path === worker
    )
    Object.assign(workerRecord, record(worker, transformed.output), {
      sourceSha256: digest(source),
      sourceSize: Buffer.byteLength(source),
      runtimeBindingReplacements: transformed.replacements
    })
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('cancellation patch was not applied')
  })

  it('rejects duplicated entries that leave another runtime uncovered', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    manifest.runtimeFiles[1] = manifest.runtimeFiles[0]
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow(`provenance is missing ${worker}`)
  })

  it('rejects an out-of-tree license reference before reading it', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    manifest.license.path = '../LICENSE'
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('license or notice metadata')
  })

  it('rejects a stale runtime isolation transform', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    manifest.runtimeTransform = 'untransformed'
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('runtime isolation transform')
  })
})
