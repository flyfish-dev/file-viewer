import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { sanitizeOfflineViewerAssetTree } from '../../../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'
import { verifyComponentHelperLegalMaterials } from './helper-legal-materials.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../../../..')
const legalProofs = new WeakMap()
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

async function unlinkedParents(outputDir, path, checked = new Set()) {
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    if (checked.has(parent)) break
    const info = await lstat(parent)
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Copied legal data cannot use linked parents')
    checked.add(parent)
    if (parent === outputDir) break
    assert.notEqual(parent, dirname(parent), 'Copied legal data must remain inside its output root')
  }
}

async function unlinkedRuntimeParents(outputDir, owners) {
  const checked = new Set()
  for (const owner of owners) {
    for (const file of owner.runtimeFiles) {
      await unlinkedParents(outputDir, join(outputDir, 'file-viewer', file.path), checked)
    }
  }
}

async function legalFingerprint(outputDir, path) {
  await unlinkedParents(outputDir, path)
  const info = await lstat(path)
  assert.ok(info.isFile() && !info.isSymbolicLink() && !(info.mode & 0o111),
    'Copied legal data must be a non-executable regular document')
  const bytes = await readFile(path)
  return { bytes: bytes.length, mode: info.mode & 0o777, sha256: hash(bytes) }
}

// Only the two actual helper owners and their complete copied runtime trees can
// certify these four aliases. Callers cannot supply their own legal hashes.
export async function prepareComponentDemoLegalData(outputDir, options = {}) {
  outputDir = resolve(outputDir)
  try {
    const info = await lstat(join(outputDir, 'file-viewer'))
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Copied helper root must be an unlinked directory')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  const sourceRoot = options.sourceRoot || repositoryRoot
  const owners = await verifyComponentHelperLegalMaterials({ sourceRoot, outputRoot: join(outputDir, 'file-viewer') })
  await unlinkedRuntimeParents(outputDir, owners)
  const aliases = new Map()
  for (const owner of owners) {
    for (const material of owner.legal) {
      const path = join(outputDir, 'file-viewer', material.path)
      const actual = await legalFingerprint(outputDir, path)
      assert.equal(actual.bytes, material.bytes)
      assert.equal(actual.sha256, material.sha256)
      assert.ok(!aliases.has(path), 'Duplicate copied legal alias')
      aliases.set(path, actual)
    }
  }
  assert.equal(aliases.size, 4, 'Both copied helper owners require their complete legal materials')
  const proof = Object.freeze({})
  legalProofs.set(proof, { sourceRoot, outputDir, owners, aliases })
  return proof
}

export async function isComponentDemoLegalData(proof, file, bytes, mode) {
  if (proof === null) return false
  const state = legalProofs.get(proof)
  assert.ok(state, 'Verified copied helper owners are required')
  const expected = state.aliases.get(resolve(file))
  if (mode !== 'asset' || !expected) return false
  assert.deepEqual(await legalFingerprint(state.outputDir, resolve(file)), expected,
    'Copied legal data changed before asset classification')
  assert.equal(bytes.length, expected.bytes)
  assert.equal(hash(bytes), expected.sha256, 'Scanned copied legal bytes differ from their verified owner')
  return true
}

export async function verifyComponentDemoLegalData(proof) {
  if (proof === null) return
  const state = legalProofs.get(proof)
  assert.ok(state, 'Verified copied helper owners are required')
  assert.deepEqual(await verifyComponentHelperLegalMaterials({
    sourceRoot: state.sourceRoot, outputRoot: join(state.outputDir, 'file-viewer')
  }), state.owners, 'Copied helper owners or complete runtime inputs changed during asset verification')
  await unlinkedRuntimeParents(state.outputDir, state.owners)
  for (const [path, expected] of state.aliases) {
    assert.deepEqual(await legalFingerprint(state.outputDir, path), expected,
      'Copied legal data changed during asset verification')
  }
}

export async function sanitizeComponentDemoOfflineAssetTree(outputDir, options = {}) {
  // Bind retained documents to both actual copied helper owners and their
  // complete runtime trees before preserving any original legal bytes.
  const owners = await verifyComponentHelperLegalMaterials({
    sourceRoot: options.sourceRoot || repositoryRoot,
    outputRoot: join(outputDir, 'file-viewer')
  })
  const retainedLegalFiles = owners.flatMap(owner => owner.legal.map(material => ({
    path: `file-viewer/${material.path}`,
    bytes: material.bytes,
    sha256: material.sha256
  })))
  return sanitizeOfflineViewerAssetTree(outputDir, { retainedLegalFiles })
}

export function createComponentDemoOfflineAssetSanitizerPlugin(outputDir, options = {}) {
  return {
    name: 'file-viewer-component-demo-offline-asset-sanitizer',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      const result = await sanitizeComponentDemoOfflineAssetTree(outputDir, options)
      if (options.log === false) return
      console.log(
        `[${options.label || 'component-demo-offline-assets'}] Sanitized ${result.checkedFiles} shipped text assets; ` +
        `localized ${result.replacementCount} public runtime fallback markers in ` +
        `${result.touchedFiles.length} files`
      )
    }
  }
}
