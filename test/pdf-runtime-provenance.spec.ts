import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
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
  pdfJsRuntimeIsolationTransform,
  pdfJsRuntimeModificationNotice,
  pdfJsMainRuntimePath,
  pdfJsMainRuntimeProjection,
  projectPdfJsRuntime
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
    const transformed = await projectPdfJsRuntime(source, path)
    await put(join(sourceRoot, path), source)
    await put(join(vendorRoot, path), transformed.output)
    runtimeFiles.push({
      ...record(path, transformed.output),
      sourceSha256: digest(source),
      sourceSize: Buffer.byteLength(source),
      runtimeBindingReplacements: transformed.replacements,
      ...(transformed.projection ? { projection: transformed.projection } : {})
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

describe('PDF.js main-only normal projection', () => {
  it('retains the complete leading grants and observable exports and string values', async () => {
    const leading = '/** Copyright Original Holder — complete grant\r\n * @license Apache-2.0\r\n */\r\n// original leading attribution\n'
    const source = `${leading}
      const __webpack_exports__ = { literal: '© 原字节', pattern: '\\\\s+' };
      export { __webpack_exports__ as payload };
      export const spaced = '  keep these spaces  ';
      export function message(value) {
        return \`x(\${value}) \` + \`translate(\${value})\`;
      }
    `
    const isolated = isolatePdfJsWebpackRuntime(source)
    const projected = await projectPdfJsRuntime(source, pdfJsMainRuntimePath)
    expect(projected.output.startsWith(pdfJsRuntimeModificationNotice + leading)).toBe(true)
    expect(projected.replacements).toBe(isolated.replacements)
    expect(projected.projection).toEqual(pdfJsMainRuntimeProjection)
    expect(Buffer.byteLength(projected.output)).toBeLessThan(Buffer.byteLength(isolated.output))
    const moduleUrl = (code: string) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    // Execute only this synthetic control module, never the real PDF runtime.
    const check = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      const before = await import(${JSON.stringify(moduleUrl(isolated.output))});
      const after = await import(${JSON.stringify(moduleUrl(projected.output))});
      const observed = module => ({ exports: Object.keys(module).sort(), payload: module.payload,
        spaced: module.spaced, message: module.message('原值') });
      assert.deepEqual(observed(after), observed(before));
      console.log('synthetic exports and string semantics preserved');
    `], { encoding: 'utf8' })
    expect(check.status, check.stderr).toBe(0)
    expect(check.stdout).toContain('synthetic exports and string semantics preserved')
  })

  it.each(['legacy/build/pdf.worker.mjs', 'legacy/web/pdf_viewer.mjs', 'other/pdf.mjs'])
    ('keeps the original isolate API and non-main bytes for %s', async (path) => {
      const source = '/** Copyright unchanged */\nconst __webpack_exports__ = { original: true };\n'
      expect(await projectPdfJsRuntime(source, path)).toEqual(isolatePdfJsWebpackRuntime(source))
    })

  it('rejects main source that the reviewed formatter cannot parse', async () => {
    await expect(projectPdfJsRuntime('const __webpack_exports__ = ;', pdfJsMainRuntimePath))
      .rejects.toThrow()
  })

  it('rejects a missing main projection recipe', async () => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    delete manifest.runtimeFiles.find((row: { path: string }) => row.path === pdfJsMainRuntimePath).projection
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('main projection recipe')
  })

  it.each(['id', 'version', 'options', 'extra'])('rejects a rewritten main recipe: %s', async (field) => {
    const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
    const recipe = manifest.runtimeFiles.find((row: { path: string }) => row.path === pdfJsMainRuntimePath).projection
    if (field === 'options') recipe.options.minifyIdentifiers = true
    else recipe[field] = 'unreviewed'
    await put(manifestPath(), JSON.stringify(manifest))
    await expect(verify()).rejects.toThrow('main projection recipe')
  })

  it.each(['legacy/build/pdf.worker.mjs', 'legacy/web/pdf_viewer.mjs'])
    ('rejects the main-only recipe on %s', async (path) => {
      const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
      manifest.runtimeFiles.find((row: { path: string }) => row.path === path).projection = pdfJsMainRuntimeProjection
      await put(manifestPath(), JSON.stringify(manifest))
      await expect(verify()).rejects.toThrow('must not change Worker or viewer')
    })

  it.each(['uncompacted', 'altered', 'leading-grant-removed'])
    ('rejects a self-consistent main payload and own hash: %s', async (mode) => {
      const source = await readFile(join(sourceRoot, pdfJsMainRuntimePath), 'utf8')
      const original = await projectPdfJsRuntime(source, pdfJsMainRuntimePath)
      const changed = mode === 'uncompacted' ? isolatePdfJsWebpackRuntime(source).output
        : mode === 'leading-grant-removed' ? original.output.slice(pdfJsRuntimeModificationNotice.length)
          : original.output + '\nthrow new Error("changed runtime");\n'
      await put(join(vendorRoot, pdfJsMainRuntimePath), changed)
      const manifest = JSON.parse(await readFile(manifestPath(), 'utf8'))
      Object.assign(manifest.runtimeFiles.find((row: { path: string }) => row.path === pdfJsMainRuntimePath),
        record(pdfJsMainRuntimePath, changed))
      await put(manifestPath(), JSON.stringify(manifest))
      await expect(verify()).rejects.toThrow(`runtime hash mismatch: ${pdfJsMainRuntimePath}`)
    })
})
