import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const owners = [
  { name: '@file-viewer/web', directory: 'packages/components/web', label: 'WEB',
    runtimes: ['flyfish-file-viewer-web.iife.js', 'flyfish-file-viewer-web.amd.js'] },
  { name: '@file-viewer/web-full', directory: 'packages/components/web-full', label: 'WEB_FULL',
    runtimes: ['flyfish-file-viewer-web-full.iife.js', 'flyfish-file-viewer-web-full.amd.js'], tree: 'renderers' }
]
const fingerprint = bytes => ({ bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })

async function regularBytes(path) {
  assert.ok((await lstat(path)).isFile(), `Expected a regular helper material or runtime: ${path}`)
  return readFile(path)
}

async function treeFiles(root, prefix = '') {
  const result = []
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) result.push(...await treeFiles(root, path))
    else {
      assert.ok(entry.isFile(), `Expected a regular copied renderer input: ${path}`)
      result.push(path)
    }
  }
  return result.sort()
}

async function expectedMaterials({ sourceRoot, outputRoot }) {
  const version = JSON.parse(await regularBytes(join(sourceRoot, 'package.json'))).version
  const result = []
  for (const owner of owners) {
    const packageRoot = join(sourceRoot, owner.directory)
    const metadata = JSON.parse(await regularBytes(join(packageRoot, 'package.json')))
    assert.equal(metadata.name, owner.name, 'Copied helper package owner changed')
    assert.equal(metadata.version, version, `Copied helper version differs from the workspace: ${owner.name}`)
    const paths = [...owner.runtimes]
    if (owner.tree) {
      const sourceFiles = await treeFiles(join(packageRoot, 'dist', owner.tree))
      assert.ok(sourceFiles.length, `Missing compiled renderer inputs: ${owner.name}`)
      assert.deepEqual(await treeFiles(join(outputRoot, owner.tree)), sourceFiles,
        `Copied renderer input set differs from its helper owner: ${owner.name}`)
      paths.push(...sourceFiles.map(path => `${owner.tree}/${path}`))
    }
    const runtimeFiles = []
    for (const path of paths) {
      const bytes = await regularBytes(join(packageRoot, 'dist', path))
      assert.ok(bytes.length, `Empty compiled helper input: ${path}`)
      assert.ok(bytes.equals(await regularBytes(join(outputRoot, path))),
        `Copied helper runtime differs from its original notice owner: ${owner.name}:${path}`)
      runtimeFiles.push({ path, ...fingerprint(bytes) })
    }
    const ownLicense = join(packageRoot, 'LICENSE')
    const licenseSource = await lstat(ownLicense).then(() => ownLicense).catch(error => {
      if (error.code !== 'ENOENT') throw error
      // This is the normal workspace publication fallback for packages whose
      // original own grant is retained at the workspace root.
      return join(sourceRoot, 'LICENSE')
    })
    const legal = []
    for (const [source, path] of [
      [licenseSource, `${owner.label}_LICENSE.txt`],
      [join(packageRoot, 'dist/THIRD_PARTY_LICENSES.txt'), `${owner.label}_THIRD_PARTY_LICENSES.txt`]
    ]) {
      const bytes = await regularBytes(source)
      assert.ok(bytes.length, `Missing complete helper legal material: ${owner.name}:${path}`)
      legal.push({ path, bytes })
    }
    result.push({ owner: owner.name, version: metadata.version, runtimeFiles, legal })
  }
  return result
}

export async function copyComponentHelperLegalMaterials(options) {
  // Validate both actual copied owners before attaching either owner's grants.
  const expected = await expectedMaterials(options)
  for (const owner of expected) {
    for (const material of owner.legal) await writeFile(join(options.outputRoot, material.path), material.bytes)
  }
  return verifyComponentHelperLegalMaterials(options)
}

export async function verifyComponentHelperLegalMaterials(options) {
  const expected = await expectedMaterials(options)
  const result = []
  for (const owner of expected) {
    for (const material of owner.legal) {
      assert.ok(material.bytes.equals(await regularBytes(join(options.outputRoot, material.path))),
        `Copied helper legal material differs from its original owner: ${owner.owner}:${material.path}`)
    }
    result.push({ ...owner, legal: owner.legal.map(material => ({ path: material.path, ...fingerprint(material.bytes) })) })
  }
  return result
}
