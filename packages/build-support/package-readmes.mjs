import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { maintainedReadmeFiles, legacyReadmeFiles } from './readme-locales.mjs'

export const packageReadmeFiles = maintainedReadmeFiles
const maximumBytes = 2 * 1024 * 1024
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

export function assertMaintainedReadme(bytes, label = 'Package README') {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= maximumBytes,
    `${label} must be a nonempty, bounded README`)
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  assert.ok(text.trim() && !text.includes('\0'), `${label} is empty or binary`)
  assert.ok(!/^Runtime package version \S+\.\s*$/m.test(text),
    `${label} is the generated runtime placeholder, not the maintained README`)
  assert.ok(!/^\s*(?:#+\s*)?(?:TODO|TBD|placeholder|readme placeholder)\s*[.!]?\s*$/i.test(text),
    `${label} is a placeholder`)
  return bytes
}

export function readmeContract(readmes) {
  const files = readmes['README.zh-CN.md'] ? maintainedReadmeFiles : legacyReadmeFiles
  assert.deepEqual(Object.keys(readmes).sort(), [...files].sort(), 'Unexpected maintained README set')
  return Object.fromEntries(files.map(name => {
    const bytes = assertMaintainedReadme(readmes[name], name)
    return [name, { bytes: bytes.length, sha256: hash(bytes) }]
  }))
}

export function verifyPackageReadmes(packed, expected, source) {
  const names = Object.keys(expected || {}).sort()
  const known = [maintainedReadmeFiles, legacyReadmeFiles].some(files =>
    [...files].sort().join(',') === names.join(','))
  assert.ok(known, 'Release entry must bind every maintained package README (both legacy READMEs for frozen releases)')
  for (const name of names) {
    const bytes = assertMaintainedReadme(packed[name], `Packed ${name}`)
    assert.ok(Number.isSafeInteger(expected[name]?.bytes) && expected[name].bytes > 0 &&
      expected[name].bytes <= maximumBytes && /^[a-f0-9]{64}$/.test(expected[name].sha256 || ''),
    `Invalid maintained README identity: ${name}`)
    assert.equal(bytes.length, expected[name].bytes, `Packed README size differs: ${name}`)
    assert.equal(hash(bytes), expected[name].sha256, `Packed README hash differs: ${name}`)
    if (source) assert.ok(bytes.equals(assertMaintainedReadme(source[name], `Source ${name}`)),
      `Packed README differs from maintained source: ${name}`)
  }
}

export async function readPackageReadmes(sourceRoot, packageDir, expectedPackageName, files = packageReadmeFiles) {
  assert.ok([maintainedReadmeFiles, legacyReadmeFiles].some(known =>
    [...known].sort().join(',') === [...files].sort().join(',')), 'Unknown maintained README source set')
  assert.ok(typeof packageDir === 'string' && packageDir && !isAbsolute(packageDir) &&
    !packageDir.includes('\\') && packageDir.split('/').every(part => part && part !== '.' && part !== '..'),
  'README source packageDir must be a normalized relative path')
  const root = await realpath(sourceRoot)
  const directory = await realpath(resolve(root, packageDir))
  const within = relative(root, directory)
  assert.ok(within && !isAbsolute(within) && within !== '..' && !within.startsWith('../'),
    'README source package must stay inside its source checkout')
  if (expectedPackageName) {
    const manifestPath = join(directory, 'package.json')
    const manifestInfo = await lstat(manifestPath)
    assert.ok(manifestInfo.isFile() && !manifestInfo.isSymbolicLink() && manifestInfo.size <= 1024 * 1024,
      'README source owner metadata must be a bounded regular file')
    const owner = JSON.parse(await readFile(manifestPath, 'utf8'))
    assert.equal(owner.name, expectedPackageName, 'README source package identity differs')
  }
  return Object.fromEntries(await Promise.all(files.map(async name => {
    const path = join(directory, name)
    const info = await lstat(path)
    assert.ok(info.isFile() && !info.isSymbolicLink() && info.size <= maximumBytes,
      `Maintained README must be a bounded regular file: ${name}`)
    return [name, assertMaintainedReadme(await readFile(path), `Source ${packageDir}/${name}`)]
  })))
}
