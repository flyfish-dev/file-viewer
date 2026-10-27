import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  officialRegistryUrl,
  registryMetadataUrl,
  startFrozenValidationRegistry
} from './frozen-validation-registry.mjs'

test('upstream URLs are reconstructed with a constant official receiver', () => {
  assert.equal(
    officialRegistryUrl('https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz').href,
    'https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz'
  )
  for (const url of [
    'http://registry.npmjs.org/pkg',
    'https://example.com/pkg',
    'https://user:password@registry.npmjs.org/pkg',
    'https://registry.npmjs.org/pkg?next=http://127.0.0.1',
    'https://registry.npmjs.org/pkg#fragment'
  ])
    assert.throws(() => officialRegistryUrl(url))
})
test('metadata proxy accepts only normalized npm names and optional exact versions', () => {
  assert.equal(registryMetadataUrl('/@vue%2fshared').origin, 'https://registry.npmjs.org')
  assert.equal(
    decodeURIComponent(registryMetadataUrl('/@vue%2fshared/3.5.42').pathname),
    '/@vue/shared/3.5.42'
  )
  for (const path of [
    '//example.com/pkg',
    '/-/npm/v1/security/advisories/bulk',
    '/pkg/../../secret',
    '/pkg%3Fnext=http://127.0.0.1',
    '/pkg%00',
    '/https:%2f%2fexample.com'
  ])
    assert.throws(() => registryMetadataUrl(path))
})
test('both metadata and archive proxy requests enforce the official receiver and reject redirects', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'frozen-registry-receiver-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const clientFetch = globalThis.fetch
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input)
    assert.equal(url.origin, 'https://registry.npmjs.org')
    assert.equal(options.redirect, 'error')
    calls.push(url.href)
    if (url.pathname.endsWith('.tgz')) return new Response('synthetic archive bytes')
    return new Response(
      JSON.stringify({
        name: 'example-runtime',
        version: '1.0.0',
        dist: {
          tarball: 'https://registry.npmjs.org/example-runtime/-/example-runtime-1.0.0.tgz'
        }
      }),
      { headers: { 'content-type': 'application/json' } }
    )
  })
  const registry = await startFrozenValidationRegistry({ archives: [], cacheDirectory: directory })
  t.after(() => registry.close())
  const metadata = await clientFetch(registry.url + '/example-runtime/1.0.0')
  assert.equal(metadata.status, 200)
  const value = await metadata.json()
  assert.ok(value.dist.tarball.startsWith(registry.url + '/external/'))
  const archive = await clientFetch(value.dist.tarball)
  assert.equal(archive.status, 200)
  assert.equal(await archive.text(), 'synthetic archive bytes')
  assert.equal(calls.length, 2)
  assert.equal(registry.requests.upstreamMetadata, 1)
  assert.equal(registry.requests.upstreamTarballs, 1)
})

test('local registry ping handles GET/HEAD without proxying and retains write/audit refusal', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'frozen-registry-ping-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const registry = await startFrozenValidationRegistry({ archives: [], cacheDirectory: directory })
  t.after(() => registry.close())
  const get = await fetch(registry.url + '/-/ping')
  assert.equal(get.status, 200)
  assert.deepEqual(await get.json(), { ok: true })
  const head = await fetch(registry.url + '/-/ping', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.equal(registry.requests.upstreamMetadata, 0)
  assert.equal(registry.requests.upstreamTarballs, 0)
  assert.equal((await fetch(registry.url + '/-/ping', { method: 'POST' })).status, 405)
  assert.equal(
    (await fetch(registry.url + '/-/npm/v1/security/advisories/bulk', { method: 'POST' })).status,
    403
  )
  assert.equal((await fetch(registry.url + '/@file-viewer/missing')).status, 404)
  assert.equal(registry.requests.blockedWrites, 1)
  assert.equal(registry.requests.blockedAudits, 1)
})

test('successful package metadata supports a real npm offline cache without caching denials or health responses', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'frozen-registry-offline-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const clientFetch = globalThis.fetch
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.equal(new URL(input).origin, 'https://registry.npmjs.org')
    assert.equal(options.redirect, 'error')
    return new Response(
      JSON.stringify({
        name: 'synthetic-cache-probe',
        'dist-tags': { latest: '1.0.0' },
        versions: { '1.0.0': { name: 'synthetic-cache-probe', version: '1.0.0' } }
      }),
      { headers: { 'content-type': 'application/json' } }
    )
  })
  const registry = await startFrozenValidationRegistry({
    archives: [],
    cacheDirectory: join(directory, 'proxy')
  })
  t.after(() => registry.close())
  const emptyConfig = join(directory, 'empty-user.npmrc')
  const emptyGlobalConfig = join(directory, 'empty-global.npmrc')
  await writeFile(emptyConfig, '')
  await writeFile(emptyGlobalConfig, '')
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/token|password|secret|cookie|auth|proxy|^(?:npm_config_|pnpm_config_)/i.test(key)
    )
  )
  environment.npm_config_update_notifier = 'false'
  const args = [
    'view',
    'synthetic-cache-probe',
    'version',
    '--json',
    '--registry',
    registry.url,
    '--cache',
    join(directory, 'npm-cache'),
    '--userconfig',
    emptyConfig,
    '--globalconfig',
    emptyGlobalConfig
  ]
  const run = promisify(execFile)
  const online = await run('npm', args, { env: environment, timeout: 30_000 })
  assert.equal(JSON.parse(online.stdout), '1.0.0')
  const before = structuredClone(registry.requests)
  const offline = await run('npm', [...args, '--offline'], { env: environment, timeout: 30_000 })
  assert.equal(JSON.parse(offline.stdout), '1.0.0')
  assert.deepEqual(registry.requests, before, 'Offline lookup must use the real local npm cache')
  for (const path of ['/-/ping', '/@file-viewer/missing']) {
    const result = await clientFetch(registry.url + path)
    assert.equal(result.headers.get('cache-control'), 'no-store')
  }
})
