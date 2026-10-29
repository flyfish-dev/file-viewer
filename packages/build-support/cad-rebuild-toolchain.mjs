import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {readFile} from 'node:fs/promises'
import {fileURLToPath, pathToFileURL} from 'node:url'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

export async function readCadBuildToolchain(packageJsonPath) {
  const require = createRequire(packageJsonPath)
  const versions = {}, entries = {}
  let viteRequire
  for (const name of ['typescript', 'vite']) {
    const manifestPath = require.resolve(name + '/package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    assert.equal(manifest.name, name)
    versions[name] = manifest.version
    entries[name] = pathToFileURL(require.resolve(name)).href
    if (name === 'vite') viteRequire = createRequire(manifestPath)
  }
  for (const name of ['rolldown', 'esbuild']) {
    const manifest = JSON.parse(await readFile(viteRequire.resolve(name + '/package.json'), 'utf8'))
    assert.equal(manifest.name, name)
    versions[name] = manifest.version
  }
  return {versions, entries}
}

/** Select installed build tools without altering any archived preferred source. */
export function workspaceCadBuildRecipe(source, toolchain) {
  let result = source
  for (const name of ['typescript', 'vite']) {
    const url = new URL(toolchain.entries[name])
    assert.equal(url.protocol, 'file:', 'CAD build tools must be installed local modules')
    assert.equal(url.hostname, '', 'CAD build tools must use a local file URL')
    fileURLToPath(url)
    const pattern = new RegExp('\\bfrom\\s+([\\x27"])' + name + '\\1', 'g')
    assert.equal([...result.matchAll(pattern)].length, 1, 'Unexpected CAD build-tool import: ' + name)
    result = result.replace(pattern, 'from ' + JSON.stringify(url.href))
  }
  return result
}

/** Keep the pinned-source proof and require a byte-exact rebuild of the shipped output. */
export async function verifyCadRebuiltRuntime({
  canonical, distributed, expected, sourceToolchain, workspaceToolchain, rebuildWithWorkspace
}) {
  assert.equal(canonical.length, expected.runtimeBytes, 'Pinned CAD rebuild size changed')
  assert.equal(digest(canonical), expected.runtimeSha256, 'Pinned CAD rebuild fingerprint changed')
  const proof = {
    canonical: {bytes: canonical.length, sha256: digest(canonical)},
    distributed: {bytes: distributed.length, sha256: digest(distributed)},
    sourceToolchain: sourceToolchain.versions
  }
  if (canonical.equals(distributed)) return {...proof, matchedBy: 'archive-pinned-toolchain'}
  assert.ok(workspaceToolchain, 'CAD workspace toolchain is required for this different output')
  assert.notDeepEqual(sourceToolchain.versions, workspaceToolchain.versions,
    'CAD output differs despite identical declared build tools')
  assert.equal(typeof rebuildWithWorkspace, 'function')
  const rebuilt = await rebuildWithWorkspace()
  assert.ok(Buffer.isBuffer(rebuilt), 'CAD workspace rebuild did not return file bytes')
  assert.ok(rebuilt.equals(distributed), 'CAD preferred source does not reconstruct the actual Full runtime with its build tools')
  return {...proof, workspaceToolchain: workspaceToolchain.versions, matchedBy: 'workspace-toolchain'}
}
