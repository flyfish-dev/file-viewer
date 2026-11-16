import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const fingerprint = bytes => ({ bytes: bytes.length, sha256: sha256(bytes) })

function publicPath(path) {
  assert.ok(typeof path === 'string' && path && !isAbsolute(path) && !path.includes('\\') &&
    !path.includes('\0') && path.split('/').every(part => part && part !== '.' && part !== '..'),
  'Prebundled producer paths must be normalized package-relative paths')
  return path
}

function runtimePaths(paths) {
  assert.ok(Array.isArray(paths) && paths.length && new Set(paths).size === paths.length,
    'Prebundled producer requires distinct runtime paths')
  for (const path of paths) {
    publicPath(path)
    assert.match(path, /\.[cm]?js$/, 'Prebundled producer must identify compiled JavaScript')
  }
  return [...paths].sort()
}

async function regularBytes(root, path) {
  publicPath(path)
  let current = root
  for (const part of path.split('/')) {
    current = join(current, part)
    assert.ok(!(await lstat(current)).isSymbolicLink(), 'Prebundled producer path contains a symlink')
  }
  assert.ok((await lstat(current)).isFile(), 'Prebundled producer input must be a regular file')
  return readFile(current)
}

function assertFingerprint(bytes, expected, label) {
  assert.ok(expected && Number.isSafeInteger(expected.bytes) && expected.bytes > 0 &&
    /^[a-f0-9]{64}$/.test(expected.sha256 || ''), `Invalid ${label} fingerprint`)
  assert.equal(bytes.length, expected.bytes, `${label} size changed`)
  assert.equal(sha256(bytes), expected.sha256, `${label} bytes changed`)
}

// This public receipt describes only final producer output bytes and their
// complete notice. It carries no maintenance paths, source commits or approval.
export async function writePrebundledNoticeReceipt({ packageRoot, runtimePaths: paths,
  noticePath, receiptPath = 'dist/prebundled-notices.json' }) {
  const root = await realpath(resolve(packageRoot))
  const metadata = JSON.parse(await regularBytes(root, 'package.json'))
  assert.ok(typeof metadata.name === 'string' && metadata.name &&
    typeof metadata.version === 'string' && metadata.version, 'Prebundled producer lacks an owner identity')
  const files = {}
  for (const path of runtimePaths(paths)) files[path] = fingerprint(await regularBytes(root, path))
  assert.ok(!Object.hasOwn(files, publicPath(noticePath)) &&
    !Object.hasOwn(files, publicPath(receiptPath)) && noticePath !== receiptPath,
  'Prebundled producer runtime, notice and receipt paths must be distinct')
  const receipt = { schemaVersion: 1, kind: 'prebundled-runtime-notice',
    packageName: metadata.name, packageVersion: metadata.version, runtimeFiles: files,
    notice: { path: noticePath, ...fingerprint(await regularBytes(root, noticePath)) } }
  // Existing ancestors must not redirect this normal output outside its owner.
  let parent = root
  for (const part of receiptPath.split('/').slice(0, -1)) {
    parent = join(parent, part)
    const info = await lstat(parent)
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Prebundled receipt parent must be a real output directory')
  }
  const destination = join(root, receiptPath)
  const existing = await lstat(destination).catch(error => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  assert.ok(!existing || existing.isFile() && !existing.isSymbolicLink(),
    'Prebundled receipt must be a regular file')
  await writeFile(destination, JSON.stringify(receipt, null, 2) + '\n')
  return receipt
}

export async function readPrebundledNoticeReceipt({ packageRoot, metadata, configuration, inputs }) {
  const root = await realpath(resolve(packageRoot))
  const paths = runtimePaths(configuration.runtimePaths)
  publicPath(configuration.noticePath)
  publicPath(configuration.receiptPath)
  assert.ok(inputs.length && inputs.every(path => paths.includes(path)),
    'Prebundled producer verification requires actual configured runtime inputs')
  const owner = JSON.parse(await regularBytes(root, 'package.json'))
  assert.equal(owner.name, configuration.packageName, 'Prebundled producer owner changed')
  assert.equal(owner.name, metadata.name, 'Prebundled producer owner changed')
  assert.equal(owner.version, metadata.version, 'Prebundled producer version changed')
  const receiptBytes = await regularBytes(root, configuration.receiptPath)
  const receipt = JSON.parse(receiptBytes)
  assert.equal(receipt.schemaVersion, 1, 'Unknown prebundled producer receipt')
  assert.equal(receipt.kind, 'prebundled-runtime-notice', 'Unknown prebundled producer receipt')
  assert.equal(receipt.packageName, owner.name, 'Prebundled producer owner changed')
  assert.equal(receipt.packageVersion, owner.version, 'Prebundled producer version changed')
  assert.deepEqual(Object.keys(receipt.runtimeFiles || {}).sort(), paths,
    'Prebundled producer runtime paths changed')
  assert.equal(receipt.notice?.path, configuration.noticePath, 'Prebundled producer notice path changed')
  for (const input of [...new Set(inputs)].sort()) {
    assertFingerprint(await regularBytes(root, input), receipt.runtimeFiles[input], 'Prebundled runtime input')
  }
  const original = await regularBytes(root, configuration.noticePath)
  assertFingerprint(original, receipt.notice, 'Prebundled producer notice')
  assert.ok(Buffer.from(original.toString('utf8')).equals(original),
    'Prebundled producer notice must preserve valid UTF-8 bytes')
  return { original, receiptSha256: sha256(receiptBytes) }
}
