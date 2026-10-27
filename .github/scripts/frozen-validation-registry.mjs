import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { lstat, mkdir, rename, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const registryMetadataAccept = (version) =>
  version ? 'application/json' : 'application/vnd.npm.install-v1+json'

export function officialRegistryUrl(value) {
  const input = new URL(value)
  assert.equal(input.origin, 'https://registry.npmjs.org')
  assert.equal(input.username + input.password + input.search + input.hash, '')
  const target = new URL('https://registry.npmjs.org/')
  target.pathname = input.pathname
  return target
}

export function registryMetadataUrl(rawPath) {
  const path = decodeURIComponent(rawPath)
  const match =
    /^\/((?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)(?:\/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?))?$/.exec(path)
  assert.ok(match, 'Only npm package metadata paths may be proxied')
  const target = new URL('https://registry.npmjs.org/')
  target.pathname = `/${encodeURIComponent(match[1])}${match[2] ? '/' + match[2] : ''}`
  return target
}

export async function verifyFrozenArchive(path, expected) {
  const info = await lstat(path)
  assert(info.isFile() && !info.isSymbolicLink(), 'Frozen archive must be a regular file')
  assert.equal(info.size, expected.bytes)
  const sha256 = createHash('sha256'),
    sha512 = createHash('sha512')
  for await (const chunk of createReadStream(path)) {
    sha256.update(chunk)
    sha512.update(chunk)
  }
  assert.equal(sha256.digest('hex'), expected.sha256, 'Frozen archive SHA-256 changed')
  assert.equal(
    `sha512-${sha512.digest('base64')}`,
    expected.integrity,
    'Frozen archive integrity changed'
  )
  const result = spawnSync('tar', ['-xOf', path, 'package/package.json'], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  })
  assert.equal(result.status, 0, result.stderr)
  const manifest = JSON.parse(result.stdout)
  assert.equal(manifest.name, expected.packageName)
  assert.equal(manifest.version, expected.version)
  return manifest
}

/** Loopback-only frozen inputs: no publication writes, audit disclosure or product fallback. */
export async function startFrozenValidationRegistry({ archives, cacheDirectory }) {
  const upstream = 'https://registry.npmjs.org'
  const packages = new Map(),
    files = new Map()
  for (const archive of archives) {
    assert.equal(basename(archive.filename), archive.filename)
    assert(!files.has(archive.filename), 'Duplicate frozen archive filename')
    const manifest = await verifyFrozenArchive(archive.path, archive)
    const versions = packages.get(manifest.name) || new Map()
    assert(!versions.has(manifest.version), 'Duplicate frozen package version')
    versions.set(manifest.version, { manifest, archive })
    packages.set(manifest.name, versions)
    files.set(archive.filename, archive)
  }
  await mkdir(cacheDirectory, { recursive: true })
  const metadata = new Map(),
    downloads = new Map(),
    tarballUrls = new Map()
  const requests = {
    frozenMetadata: 0,
    frozenTarballs: 0,
    upstreamMetadata: 0,
    upstreamTarballs: 0,
    blockedAudits: 0,
    blockedWrites: 0
  }
  let origin
  const cacheTarball = async (url) => {
    assert.equal(new URL(url).origin, upstream)
    const path = join(cacheDirectory, `${digest(Buffer.from(url))}.tgz`)
    if ((await stat(path).catch(() => null))?.isFile()) return path
    if (!downloads.has(url))
      downloads.set(
        url,
        (async () => {
          const response = await fetch(officialRegistryUrl(url), {
            redirect: 'error',
            signal: AbortSignal.timeout(60_000)
          })
          assert(response.ok, `Registry tarball returned ${response.status}`)
          const temporary = `${path}.${process.pid}.partial`
          try {
            await pipeline(
              Readable.fromWeb(response.body),
              createWriteStream(temporary, { flags: 'wx', mode: 0o600 })
            )
            await rename(temporary, path)
          } catch (error) {
            await rm(temporary, { force: true })
            throw error
          }
          return path
        })().finally(() => downloads.delete(url))
      )
    return downloads.get(url)
  }
  const rewriteDist = (value) => {
    if (!value?.dist?.tarball) return value
    const url = value.dist.tarball
    assert.equal(new URL(url).origin, upstream)
    const key = digest(Buffer.from(url))
    tarballUrls.set(key, url)
    return { ...value, dist: { ...value.dist, tarball: `${origin}/external/${key}.tgz` } }
  }
  const sendFile = async (response, path) => {
    const info = await lstat(path)
    assert(info.isFile() && !info.isSymbolicLink())
    response.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': info.size
    })
    await pipeline(createReadStream(path), response)
  }
  const sendJson = (response, status, value, cacheableMetadata = false) => {
    // This process freezes successful metadata. Normal npm clients must be able
    // to retain it for the required offline rehearsal. Errors, health and access
    // denials remain uncacheable; audit and write guards still run first.
    response.writeHead(status, {
      'content-type': 'application/json',
      'cache-control': status === 200 && cacheableMetadata ? 'public, max-age=600' : 'no-store'
    })
    response.end(JSON.stringify(value))
  }
  const server = createServer(
    (request, response) =>
      void (async () => {
        const raw = new URL(request.url, 'http://127.0.0.1').pathname
        const path = decodeURIComponent(raw)
        if (path.startsWith('/-/npm/')) {
          requests.blockedAudits++
          sendJson(response, 403, { error: 'Audit disclosure is outside this local registry' })
          return
        }
        if (!['GET', 'HEAD'].includes(request.method)) {
          requests.blockedWrites++
          sendJson(response, 405, { error: 'This validation registry is read-only' })
          return
        }
        // Package managers and the real CLI use the registry's own health
        // endpoint. It is not upstream package metadata and performs no writes.
        if (path === '/-/ping') {
          sendJson(response, 200, { ok: true })
          return
        }
        if (path.startsWith('/frozen/')) {
          const file = files.get(path.slice('/frozen/'.length))
          if (!file) {
            sendJson(response, 404, { error: 'Unknown frozen tarball' })
            return
          }
          requests.frozenTarballs++
          await sendFile(response, file.path)
          return
        }
        const external = /^\/external\/([a-f0-9]{64})\.tgz$/.exec(path)
        if (external) {
          const url = tarballUrls.get(external[1])
          if (!url) {
            sendJson(response, 404, { error: 'Unknown registry tarball' })
            return
          }
          requests.upstreamTarballs++
          await sendFile(response, await cacheTarball(url))
          return
        }
        const name = path.startsWith('/@')
          ? path.split('/').slice(1, 3).join('/')
          : path.split('/')[1]
        const version = path.slice(name.length + 2)
        const local = packages.get(name)
        if (path.includes('/-/') && path.endsWith('.tgz')) {
          if (local) {
            const filename = basename(path)
            const item = [...local.values()].find(
              ({ manifest, archive }) =>
                filename === archive.filename ||
                filename === `${manifest.name.split('/').at(-1)}-${manifest.version}.tgz`
            )
            if (!item) {
              sendJson(response, 404, { error: 'Unknown frozen package tarball' })
              return
            }
            requests.frozenTarballs++
            await sendFile(response, item.archive.path)
          } else {
            assert(!name.startsWith('@file-viewer/') && !name.startsWith('@flyfish-group/'))
            requests.upstreamTarballs++
            await sendFile(response, await cacheTarball(`${upstream}${raw}`))
          }
          return
        }
        if (local) {
          requests.frozenMetadata++
          const values = [...local.values()]
            .map(({ manifest, archive }) => ({
              ...manifest,
              dist: {
                tarball: `${origin}/frozen/${archive.filename}`,
                integrity: archive.integrity,
                unpackedSize: archive.unpackedBytes
              }
            }))
            .sort((a, b) => a.version.localeCompare(b.version, 'en', { numeric: true }))
          const selected = version ? values.find((value) => value.version === version) : null
          if (version && !selected) {
            sendJson(response, 404, { error: 'Frozen package version is absent' })
            return
          }
          sendJson(
            response,
            200,
            selected || {
              name,
              'dist-tags': { latest: values.at(-1).version },
              versions: Object.fromEntries(values.map((value) => [value.version, value]))
            },
            true
          )
          return
        }
        if (
          name.startsWith('@file-viewer/') ||
          name.startsWith('@flyfish-group/') ||
          /^(?:file-viewer|create-file-viewer|msdoc-viewer)/.test(name)
        ) {
          sendJson(response, 404, { error: 'Product package is absent from the frozen closure' })
          return
        }
        assert(!path.includes('..') && name && !path.startsWith('/-'), 'Invalid registry path')
        if (!metadata.has(raw))
          metadata.set(
            raw,
            (async () => {
              requests.upstreamMetadata++
              const result = await fetch(registryMetadataUrl(raw), {
                redirect: 'error',
                headers: { accept: registryMetadataAccept(version) },
                signal: AbortSignal.timeout(60_000)
              })
              if (!result.ok)
                return { status: result.status, value: { error: 'Registry metadata unavailable' } }
              const value = await result.json()
              if (value.versions)
                value.versions = Object.fromEntries(
                  Object.entries(value.versions).map(([key, item]) => [key, rewriteDist(item)])
                )
              else if (value.version) return { status: 200, value: rewriteDist(value) }
              return { status: 200, value }
            })().catch((error) => {
              metadata.delete(raw)
              throw error
            })
          )
        const result = await metadata.get(raw)
        sendJson(response, result.status, result.value, true)
      })().catch((error) => {
        if (!response.headersSent) sendJson(response, 502, { error: error.message })
        else response.destroy(error)
      })
  )
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', done)
  })
  origin = `http://127.0.0.1:${server.address().port}`
  return {
    url: origin,
    requests,
    archives,
    close: () =>
      new Promise((done) => {
        server.close(done)
        server.closeIdleConnections()
      })
  }
}
