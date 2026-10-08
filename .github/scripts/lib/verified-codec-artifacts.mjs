import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export function verifyCodecArtifact(packagePath, artifact) {
  const manifest = JSON.parse(readFileSync(join(packagePath, 'package.json'), 'utf8'))
  assert.equal(manifest.name, artifact.name, 'Native codec package name drifted')
  assert.equal(manifest.version, artifact.version, 'Native codec version drifted')
  // Modern tarballs omit gitHead. Their metadata, glue and WASM bytes still
  // have to match the complete reviewed official artifact, including this file.
  if (manifest.gitHead !== undefined) {
    assert.equal(manifest.gitHead, artifact.gitHead, 'Native codec gitHead drifted')
  }
  const filesIn = (directory, prefix = '') =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = prefix + entry.name
      if (entry.isDirectory()) return filesIn(join(directory, entry.name), path + '/')
      assert.ok(entry.isFile(), `${artifact.package}: unreviewed non-file entry: ${path}`)
      return [path]
    })
  assert.deepEqual(
    filesIn(packagePath).sort(),
    artifact.files.map((file) => file.path).sort(),
    `${artifact.package}: artifact file inventory drifted`
  )
  for (const file of artifact.files) {
    const actual = createHash('sha256')
      .update(readFileSync(join(packagePath, file.path)))
      .digest('hex')
    assert.equal(actual, file.sha256, `${artifact.package}: artifact bytes drifted: ${file.path}`)
  }
}

export function verifyCodecLockIntegrity(lockfile, artifact) {
  const packages = lockfile.slice(lockfile.indexOf('\npackages:\n'))
  const marker = `\n  '${artifact.package}':\n`
  const start = packages.indexOf(marker)
  assert.ok(start >= 0, `Missing reviewed lockfile codec: ${artifact.package}`)
  const remaining = packages.slice(start + marker.length)
  const nextEntry = remaining.search(/\n  \S/)
  const entry = nextEntry < 0 ? remaining : remaining.slice(0, nextEntry)
  const integrity = entry.match(/integrity:\s*([^\s,}]+)/)?.[1]
  assert.equal(integrity, artifact.integrity, `${artifact.package}: lockfile integrity drifted`)
}
