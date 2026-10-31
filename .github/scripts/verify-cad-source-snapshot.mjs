import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'

const commit = process.env.CAD_SOURCE_COMMIT || ''
const version = process.env.CAD_SOURCE_VERSION || ''
assert.match(commit, /^[a-f0-9]{40}$/, 'An immutable source commit is required')
assert.match(version, /^\d+\.\d+\.\d+$/, 'An explicit source version is required')
const sourceDirectory = `packages/build-support/cad-source-snapshots/${version}`
const workspace = resolve(process.env.GITHUB_WORKSPACE || '.')
const cache = resolve(
  process.env.FILE_VIEWER_SOURCE_CACHE || process.env.RUNNER_TEMP || '.source-cache'
)
const expectedRoot = join(workspace, sourceDirectory)
const archivePath = join(cache, `${commit}.tar.gz`)
const downloadReceipt = join(cache, `${commit}.download.json`)
const url = `https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/${commit}`
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const hashFile = async (path) => {
  const hash = createHash('sha256')
  let bytes = 0
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk)
    bytes += chunk.length
  }
  return { sha256: hash.digest('hex'), bytes }
}
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false, timeout: 600_000 })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${command} failed`)
}
const files = async (root, prefix = '') => {
  const result = []
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) result.push(...(await files(root, path)))
    else {
      assert.ok(entry.isFile(), `Non-regular snapshot entry: ${path}`)
      result.push(path)
    }
  }
  return result.sort()
}

await mkdir(cache, { recursive: true })
let download
try {
  download = JSON.parse(await readFile(downloadReceipt, 'utf8'))
  const info = await lstat(archivePath)
  assert.ok(info.isFile() && !info.isSymbolicLink())
  assert.equal(download.url, url)
  assert.equal(download.sourceCommit, commit)
  assert.deepEqual(await hashFile(archivePath), { sha256: download.sha256, bytes: download.bytes })
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  const temporary = join(cache, `${commit}.${process.pid}.part`)
  const child = spawn('gh', ['api', url, '--method', 'GET'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: false
  })
  const finished = new Promise((accept, reject) => {
    child.once('error', reject)
    child.once('exit', (code) =>
      code === 0 ? accept() : reject(new Error(`GitHub download failed: ${code}`))
    )
  })
  await Promise.all([
    pipeline(child.stdout, createWriteStream(temporary, { flags: 'wx', mode: 0o600 })),
    finished
  ])
  const fingerprint = await hashFile(temporary)
  assert.ok(
    fingerprint.bytes > 0 && fingerprint.bytes <= 256_000_000,
    'Source archive exceeds the reviewed bound'
  )
  await rename(temporary, archivePath)
  download = {
    sourceCommit: commit,
    url,
    ...fingerprint,
    downloadedAt: new Date().toISOString(),
    transport: 'gh-api'
  }
  await writeFile(downloadReceipt, JSON.stringify(download, null, 2) + '\n', { flag: 'wx' })
}

const manifest = JSON.parse(await readFile(join(expectedRoot, 'SOURCE_MANIFEST.json'), 'utf8'))
assert.equal(manifest.releaseVersion, version)
const expectedPaths = [...manifest.files.map((file) => file.path), 'SOURCE_MANIFEST.json'].sort()
assert.deepEqual(
  await files(expectedRoot),
  expectedPaths,
  'Checkout snapshot contains missing or additional files'
)
const temporary = await mkdtemp(join(cache, `${commit}-build-`))
let passed = false
try {
  const archivePrefix = `file-viewer-${commit}/${sourceDirectory}/`
  run(
    'tar',
    ['-xzf', archivePath, '-C', temporary, '--strip-components=5', '--', archivePrefix],
    workspace
  )
  assert.deepEqual(
    await files(temporary),
    expectedPaths,
    'Public source snapshot membership differs from the checkout'
  )
  for (const path of expectedPaths) {
    const [actual, expected] = await Promise.all([
      readFile(join(temporary, path)),
      readFile(join(expectedRoot, path))
    ])
    assert.ok(actual.equals(expected), `Public preferred-source bytes differ: ${path}`)
  }
  for (const file of manifest.files) {
    assert.equal(
      digest(await readFile(join(temporary, file.path))),
      file.sha256,
      `Source manifest differs: ${file.path}`
    )
  }
  run(
    'npm',
    ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/'],
    temporary
  )
  run('npm', ['run', 'build'], temporary)
  const runtime = await hashFile(join(temporary, 'dist/cad.iife.js'))
  assert.deepEqual(
    runtime,
    { bytes: manifest.runtime.bytes, sha256: manifest.runtime.sha256 },
    'Public source does not reproduce its declared runtime'
  )
  const proof = {
    ...download,
    sourceDirectory,
    sourceFiles: expectedPaths.length,
    runtime,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    workflowRun: process.env.GITHUB_RUN_ID,
    workflowHead: process.env.GITHUB_SHA,
    completedAt: new Date().toISOString(),
    status: 'verified-public-source-and-cold-rebuild'
  }
  await writeFile(join(cache, `${commit}.proof.json`), JSON.stringify(proof, null, 2) + '\n')
  console.log(JSON.stringify(proof))
  passed = true
} finally {
  if (passed) await rm(temporary, { recursive: true, force: true })
}
