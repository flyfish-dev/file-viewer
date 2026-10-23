import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { link, lstat, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  packageReadmeFiles,
  readmeContract,
  readPackageReadmes,
  verifyPackageReadmes
} from '../../packages/build-support/package-readmes.mjs'

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export async function command(program, args, { cwd, env = process.env, timeout = 900_000 } = {}) {
  return new Promise((done, reject) => {
    const child = spawn(program, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '',
      stderr = ''
    child.stdout.on('data', (value) => {
      stdout += value
    })
    child.stderr.on('data', (value) => {
      stderr += value
    })
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout)
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      code === 0
        ? done(stdout)
        : reject(new Error(`${program} failed (${code}): ${stderr || stdout}`))
    })
  })
}

const text = (bytes) =>
  bytes.subarray(0, bytes.indexOf(0) < 0 ? bytes.length : bytes.indexOf(0)).toString('utf8')
const octal = (bytes) => {
  const value = text(bytes).trim()
  assert(/^[0-7]+$/.test(value), 'Invalid TAR number')
  const parsed = Number.parseInt(value, 8)
  assert(Number.isSafeInteger(parsed) && parsed >= 0)
  return parsed
}
const safePath = (path) => {
  assert(path.startsWith('package/'), 'TAR member is outside package/')
  const value = path.slice(8)
  assert(value && !value.includes('\\') && !/[\x00-\x1f\x7f]/.test(value))
  assert(
    value.split('/').every((part) => part && part !== '.' && part !== '..'),
    'Unsafe TAR path'
  )
  assert(
    !/\.(?:map|tsbuildinfo|patch|diff|vue|svelte|rs|c|cpp|h)$/i.test(value),
    'Maintenance source or map is not a runtime asset'
  )
  assert(!/(?<!\.d)\.(?:ts|mts|cts|tsx)$/i.test(value), 'TypeScript source is not a declaration')
  assert(!/^(?:src|source|test|tests|fixtures|evidence|reports|node_modules|\.git)\//.test(value))
  assert(!/(?:^|\/)(?:test|tests|fixtures|evidence|reports|\.git|node_modules)\//.test(value))
  assert(!/(?:^|\/)(?:viewer|file-viewer)\/(?:example|examples|sample|samples)\//.test(value))
  return value
}

/** Inspect TAR members before any package manager is allowed to install them. */
export async function inspectFrozenTarball(path, expected, { sourceReadmes } = {}) {
  const info = await lstat(path)
  assert(info.isFile() && !info.isSymbolicLink())
  assert.equal(info.size, expected.tarballSize, 'Archive size changed')
  const inputHash = createHash('sha256'),
    integrity = createHash('sha512')
  for await (const chunk of createReadStream(path)) {
    inputHash.update(chunk)
    integrity.update(chunk)
  }
  assert.equal(inputHash.digest('hex'), expected.sha256, 'Archive SHA-256 changed')
  assert.equal(
    `sha512-${integrity.digest('base64')}`,
    expected.integrity,
    'Archive integrity changed'
  )
  const input = createReadStream(path),
    expanded = input.pipe(createGunzip())
  input.on('error', (error) => expanded.destroy(error))
  const iterator = expanded[Symbol.asyncIterator]()
  let buffer = Buffer.alloc(0),
    expandedBytes = 0,
    pax = {},
    ended = false,
    packageJson
  const readmes = {}
  const files = [],
    seen = new Set()
  const take = async (count, allowEnd = false) => {
    while (buffer.length < count) {
      const next = await iterator.next()
      if (next.done) {
        if (allowEnd && !buffer.length) return null
        throw new Error('Truncated TAR')
      }
      expandedBytes += next.value.length
      assert(expandedBytes <= 512 * 1024 * 1024, 'TAR expansion limit exceeded')
      buffer = Buffer.concat([buffer, next.value])
    }
    const value = buffer.subarray(0, count)
    buffer = buffer.subarray(count)
    return value
  }
  try {
    for (;;) {
      const header = await take(512, true)
      if (!header) break
      if (header.every((byte) => byte === 0)) {
        assert(
          (await take(512)).every((byte) => byte === 0),
          'Invalid TAR terminator'
        )
        assert.equal(Object.keys(pax).length, 0, 'Unused TAR metadata')
        ended = true
        for (;;) {
          const trailer = await take(512, true)
          if (!trailer) break
          assert(
            trailer.every((byte) => byte === 0),
            'Unexpected TAR trailer'
          )
        }
        break
      }
      let checksum = 0
      for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i]
      assert.equal(checksum, octal(header.subarray(148, 156)), 'TAR checksum changed')
      let size = octal(header.subarray(124, 136))
      const prefix = text(header.subarray(345, 500))
      let name = prefix
        ? `${prefix}/${text(header.subarray(0, 100))}`
        : text(header.subarray(0, 100))
      if (header[156] === 120) {
        assert(size <= 65536 && !Object.keys(pax).length)
        const values = await take(size)
        for (let offset = 0; offset < values.length;) {
          const space = values.indexOf(32, offset)
          assert(space > offset)
          const length = Number(values.subarray(offset, space).toString())
          assert(
            Number.isSafeInteger(length) &&
              length > space - offset + 2 &&
              offset + length <= values.length
          )
          assert.equal(values[offset + length - 1], 10)
          const line = values.subarray(space + 1, offset + length - 1).toString('utf8')
          const equals = line.indexOf('=')
          assert(equals > 0)
          const key = line.slice(0, equals)
          assert(
            ['path', 'size', 'mtime', 'atime', 'ctime'].includes(key) && !Object.hasOwn(pax, key),
            'Unsupported TAR metadata'
          )
          pax[key] = line.slice(equals + 1)
          offset += length
        }
        if (size % 512) await take(512 - (size % 512))
        continue
      }
      assert([0, 48].includes(header[156]), 'TAR links and special members are forbidden')
      name = pax.path || name
      if (pax.size !== undefined) {
        assert(/^\d+$/.test(pax.size))
        size = Number(pax.size)
      }
      pax = {}
      assert(Number.isSafeInteger(size) && size <= 256 * 1024 * 1024)
      const file = safePath(name)
      assert(file !== 'package.json' || size <= 1024 * 1024, 'Package metadata is too large')
      assert(
        !packageReadmeFiles.includes(file) || size <= 2 * 1024 * 1024,
        'Package README is too large'
      )
      assert(
        !seen.has(file) && seen.size < 10000,
        'Duplicate TAR member or file-count limit exceeded'
      )
      assert.equal(octal(header.subarray(100, 108)) & 0o6000, 0, 'Privileged TAR mode is forbidden')
      const hash = createHash('sha256'),
        content = []
      let remaining = size,
        previous = ''
      const inspectText = /\.(?:js|mjs|cjs|json|d\.ts|d\.mts|d\.cts)$/i.test(file)
      while (remaining) {
        const chunk = await take(Math.min(remaining, 65536))
        remaining -= chunk.length
        hash.update(chunk)
        if (file === 'package.json' || packageReadmeFiles.includes(file)) content.push(chunk)
        if (inspectText) {
          const value = previous + chunk.toString('utf8')
          assert(
            !/(?:\/Users\/|\/Documents\/Codex\/|\/\.release\/|(?:^|\n)\s*\/\/[#@]\s*sourceMappingURL=)/.test(
              value
            ),
            'Runtime contains private paths or source maps'
          )
          previous = value.slice(-1024)
        }
      }
      if (file === 'package.json') packageJson = JSON.parse(Buffer.concat(content).toString('utf8'))
      if (packageReadmeFiles.includes(file)) readmes[file] = Buffer.concat(content)
      if (size % 512) await take(512 - (size % 512))
      files.push({ path: file, bytes: size, sha256: hash.digest('hex') })
      seen.add(file)
    }
    assert(ended && packageJson, 'Incomplete runtime TAR')
    assert.equal(files.length, expected.fileCount)
    assert.equal(packageJson.name, expected.packageName)
    assert.equal(packageJson.version, expected.version)
    assert.equal(packageJson.license, expected.license)
    assert.notEqual(packageJson.private, true)
    assert(
      files.some((file) => file.path === 'LICENSE' && file.bytes > 20),
      'Package license is absent'
    )
    verifyPackageReadmes(readmes, expected.readmes, sourceReadmes)
    const hooks = Object.keys(packageJson.scripts || {})
    assert(
      hooks.every((hook) => ['preinstall', 'install', 'postinstall'].includes(hook)),
      'Maintenance scripts must stay private'
    )
    assert(
      !hooks.length || packageJson.name === '@flyfish-group/file-viewer-web',
      'Unexpected runtime install hook'
    )
    const visit = (value) =>
      typeof value === 'string'
        ? [value]
        : value && typeof value === 'object'
          ? Object.values(value).flatMap(visit)
          : []
    for (const entry of [
      packageJson.main,
      packageJson.module,
      packageJson.types,
      ...visit(packageJson.exports),
      ...visit(packageJson.bin)
    ].filter(Boolean)) {
      const value = entry.replace(/^\.\//, '')
      assert(
        value.includes('*')
          ? files.some(
              (file) =>
                file.path.startsWith(value.split('*')[0]) &&
                file.path.endsWith(value.split('*')[1] || '')
            )
          : seen.has(value),
        'Runtime entrypoint is absent'
      )
    }
    return {
      packageJson,
      files,
      readmes: readmeContract(readmes),
      unpackedBytes: files.reduce((sum, file) => sum + file.bytes, 0)
    }
  } finally {
    expanded.destroy()
    input.destroy()
  }
}

export async function verifyFrozenArtifacts(
  directory,
  manifest,
  { sourceRoot = fileURLToPath(new URL('../../', import.meta.url)) } = {}
) {
  assert.equal(manifest.mode, 'runtime-only')
  assert.equal(manifest.packages.length, manifest.packageCount)
  assert(manifest.packageCount > 0)
  const names = new Set(),
    archives = new Set(),
    results = []
  for (const entry of manifest.packages) {
    assert.equal(basename(entry.tarball), entry.tarball)
    assert(
      !names.has(entry.packageName) && !archives.has(entry.tarball),
      'Duplicate release identity'
    )
    names.add(entry.packageName)
    archives.add(entry.tarball)
    results.push({
      ...entry,
      ...(await inspectFrozenTarball(join(directory, entry.tarball), entry, {
        sourceReadmes: await readPackageReadmes(
          sourceRoot,
          entry.packageDir,
          entry.packageName,
          Object.keys(entry.readmes || {})
        )
      }))
    })
  }
  return results
}

export async function downloadFrozenCandidate({ root, directory }) {
  const manifestBytes = await readFile(join(root, 'artifacts/npm-release-manifest.json'))
  const manifest = JSON.parse(manifestBytes)
  const candidate = JSON.parse(
    await readFile(join(root, 'artifacts/runtime-ci-candidate.json'), 'utf8')
  )
  assert.equal(candidate.schemaVersion, 1)
  assert.equal(candidate.manifestSha256, sha256(manifestBytes))
  assert.equal(candidate.sourceCommit, manifest.sourceCommit)
  assert.equal(
    candidate.tag,
    `v${manifest.version}-candidate-${candidate.manifestSha256.slice(0, 12)}`
  )
  assert.deepEqual(
    Object.keys(candidate).sort(),
    [
      'schemaVersion',
      'manifestSha256',
      'sourceCommit',
      'tag',
      'registrySupport',
      'productionAuditPayloadSha256'
    ].sort()
  )
  assert.equal(Object.keys(candidate.productionAuditPayloadSha256).length, 16)
  assert.ok(
    Object.values(candidate.productionAuditPayloadSha256).every((value) =>
      /^[a-f0-9]{64}$/.test(value)
    )
  )
  const release = JSON.parse(
    await command('gh', [
      'release',
      'view',
      candidate.tag,
      '--repo',
      'flyfish-dev/file-viewer',
      '--json',
      'isDraft,isPrerelease,assets'
    ])
  )
  assert.equal(release.isDraft, false)
  assert.equal(release.isPrerelease, true)
  await mkdir(directory, { recursive: false })
  await command('gh', [
    'release',
    'download',
    candidate.tag,
    '--repo',
    'flyfish-dev/file-viewer',
    '--dir',
    directory,
    '--pattern',
    '*.tgz',
    '--pattern',
    'npm-release-manifest.json'
  ])
  assert.deepEqual(
    await readFile(join(directory, 'npm-release-manifest.json')),
    manifestBytes,
    'Candidate manifest changed'
  )
  await verifyFrozenArtifacts(directory, manifest)
  await downloadRegistrySupport(directory, candidate.registrySupport)
  return manifest
}

/** Unchanged upstream engines are hash-pinned, not repacked into the owned release. */
export async function downloadRegistrySupport(directory, records) {
  assert(Array.isArray(records))
  const identities = new Set(),
    filenames = new Set()
  for (const item of records) {
    assert.deepEqual(
      Object.keys(item).sort(),
      ['packageName', 'version', 'tarball', 'tarballSize', 'sha256', 'integrity'].sort()
    )
    assert(/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(item.packageName))
    assert(/^\d+\.\d+\.\d+$/.test(item.version))
    assert(/^[a-zA-Z0-9._-]+\.tgz$/.test(item.tarball))
    assert(
      /^[a-f0-9]{64}$/.test(item.sha256) && /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(item.integrity)
    )
    assert(
      Number.isSafeInteger(item.tarballSize) &&
        item.tarballSize > 0 &&
        item.tarballSize < 64 * 1024 * 1024
    )
    assert(
      !identities.has(item.packageName) && !filenames.has(item.tarball),
      'Duplicate registry support input'
    )
    identities.add(item.packageName)
    filenames.add(item.tarball)
    const metadataResponse = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(item.packageName)}/${item.version}`,
      { signal: AbortSignal.timeout(60_000) }
    )
    assert(metadataResponse.ok, 'A frozen upstream version is unavailable')
    const metadata = await metadataResponse.json()
    assert.equal(metadata.name, item.packageName)
    assert.equal(metadata.version, item.version)
    assert.equal(metadata.dist.integrity, item.integrity, 'Upstream engine integrity changed')
    assert.equal(new URL(metadata.dist.tarball).origin, 'https://registry.npmjs.org')
    const path = join(directory, item.tarball)
    const temporaryDirectory = await mkdtemp(join(directory, '.registry-support-download-'))
    const temporaryPath = join(temporaryDirectory, item.tarball)
    try {
      const response = await fetch(metadata.dist.tarball, { signal: AbortSignal.timeout(60_000) })
      assert(response.ok)
      let received = 0
      const bounded = new Transform({
        transform(chunk, _encoding, callback) {
          received += chunk.length
          callback(
            received > item.tarballSize
              ? new Error('Upstream archive exceeds its frozen size')
              : null,
            chunk
          )
        }
      })
      await pipeline(
        Readable.fromWeb(response.body),
        bounded,
        createWriteStream(temporaryPath, { flags: 'wx', mode: 0o600 })
      )
      const info = await lstat(temporaryPath)
      assert.equal(info.size, item.tarballSize)
      const hash = createHash('sha256'),
        integrity = createHash('sha512')
      for await (const chunk of createReadStream(temporaryPath)) {
        hash.update(chunk)
        integrity.update(chunk)
      }
      assert.equal(hash.digest('hex'), item.sha256)
      assert.equal(`sha512-${integrity.digest('base64')}`, item.integrity)
      // Atomic create without replacing an existing frozen asset.
      await link(temporaryPath, path)
    } finally {
      await rm(temporaryDirectory, { recursive: true })
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args[0] === '--verify') {
    assert.equal(args.length, 3)
    const manifestBytes = await readFile(
      join(resolve(args[1]), 'artifacts/npm-release-manifest.json')
    )
    assert.deepEqual(
      await readFile(join(resolve(args[2]), 'npm-release-manifest.json')),
      manifestBytes
    )
    await verifyFrozenArtifacts(resolve(args[2]), JSON.parse(manifestBytes))
  } else {
    assert.equal(args.length, 2)
    await downloadFrozenCandidate({ root: resolve(args[0]), directory: resolve(args[1]) })
  }
  console.log('Frozen archives, package identities, entrypoints and runtime boundaries verified.')
}
