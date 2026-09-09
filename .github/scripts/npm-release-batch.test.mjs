import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  captureCommand,
  mapLimit,
  positiveInteger,
  publicationLayers,
  registryMetadata,
  verifyRegistryIntegrity,
  waitForRegistry
} from './npm-release-batch.mjs'

const record = { packageName: '@test/core', version: '3.0.3', integrity: 'sha512-frozen' }
const metadata = {
  name: record.packageName,
  version: record.version,
  'dist.integrity': record.integrity,
  'dist.tarball': 'https://registry.npmjs.org/@test/core/-/core-3.0.3.tgz'
}
const result = (status, stdout = '', stderr = '') => ({ status, stdout, stderr })

test('standard release packs built output without repeating the ecosystem build', async (t) => {
  const { scripts } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url)))
  if (!scripts['release:standard:pack:non-frozen']) {
    t.skip('Private release commands are intentionally absent from the public checkout')
    return
  }
  assert.equal(
    scripts['release:ecosystem:pack'],
    'pnpm release:ecosystem:build && pnpm release:ecosystem:pack:built'
  )
  assert(!scripts['release:ecosystem:pack:built'].includes('build'))
  assert(
    scripts['release:standard:pack:non-frozen'].startsWith(
      'pnpm release:standard:build && pnpm release:ecosystem:pack:built &&'
    )
  )
  assert(!scripts['release:ecosystem:build'].includes('pnpm build:viewer-assets &&'))
  assert(scripts['release:ecosystem:build'].includes('pnpm build:viewer-assets:built &&'))
  for (const gate of [
    'verify:release-tarballs',
    'verify:npm-install-smoke',
    'verify:npm-full-install-smoke',
    'verify:copy-assets-cli',
    'verify:issue-consumer'
  ]) {
    assert(
      scripts['release:standard:pack:non-frozen'].includes(gate),
      `Missing frozen package gate: ${gate}`
    )
  }
})

test('bounded map preserves order and overlaps only the configured work', async () => {
  let active = 0
  let maximum = 0
  const values = await mapLimit([5, 4, 3, 2, 1], 2, async (value) => {
    maximum = Math.max(maximum, ++active)
    await sleep(value)
    active--
    return value * 2
  })
  assert.deepEqual(values, [10, 8, 6, 4, 2])
  assert.equal(maximum, 2)
  assert.equal(active, 0)
})

test('bounded map stops scheduling on failure and drains active work', async () => {
  const started = []
  let drained = false
  await assert.rejects(
    mapLimit([0, 1, 2, 3], 2, async (value) => {
      started.push(value)
      if (value === 0) throw new Error('stop')
      await sleep(20)
      drained = true
    }),
    /stop/
  )
  assert.deepEqual(started, [0, 1])
  assert.equal(drained, true)
  assert.deepEqual(await mapLimit([], 2, () => assert.fail()), [])
})

test('concurrency rejects fractional, zero, negative and excessive values', () => {
  for (const value of [0, -1, 1.2, 'NaN', Infinity, 17, '']) {
    assert.throws(() => positiveInteger(value, 'jobs'), /integer/)
  }
  assert.equal(positiveInteger('4', 'jobs'), 4)
})

test('dependency layers include peers and optional dependencies, not dev tools', () => {
  const entries = [
    {
      packageName: 'full',
      packageJson: { dependencies: { preset: '*' }, peerDependencies: { ui: '*' } }
    },
    { packageName: 'preset', packageJson: { optionalDependencies: { renderer: '*' } } },
    {
      packageName: 'ui',
      packageJson: { dependencies: { core: '*' }, devDependencies: { full: '*' } }
    },
    { packageName: 'renderer', packageJson: { dependencies: { core: '*', external: '*' } } },
    { packageName: 'core', packageJson: {} },
    { packageName: 'legacy' }
  ]
  assert.deepEqual(
    publicationLayers(entries).map((layer) => layer.map((r) => r.packageName)),
    [['core', 'legacy'], ['ui', 'renderer'], ['preset'], ['full']]
  )
})

test('cycles and duplicates fail before any publication', () => {
  assert.throws(() => publicationLayers([{ packageName: 'a' }, { packageName: 'a' }]), /duplicate/)
  assert.throws(() => publicationLayers([{}]), /Missing/)
  assert.throws(
    () =>
      publicationLayers([
        { packageName: 'a', packageJson: { dependencies: { b: '*' } } },
        { packageName: 'b', packageJson: { dependencies: { a: '*' } } }
      ]),
    /cycle/
  )
})

test('registry reads validate identity and normalize npm metadata', async () => {
  const actual = await registryMetadata(record, {
    command: async (command, args) => {
      assert.equal(command, 'npm')
      assert.equal(args[1], '@test/core@3.0.3')
      assert(args.includes('--fetch-retries=0'))
      return result(0, JSON.stringify(metadata))
    }
  })
  assert.equal(actual.integrity, record.integrity)
  verifyRegistryIntegrity(record, actual)
})

test('confirmed missing versions are distinct from registry failures', async () => {
  assert.equal(
    await registryMetadata(record, {
      command: async () => result(1, '', 'npm error E404 No match found for version 3.0.3')
    }),
    null
  )
  for (const response of [
    result(1, '', 'E404 proxy route failed'),
    result(null, '', 'command killed'),
    result(1, '', 'ETIMEDOUT'),
    result(1, '', 'E401 unauthorized'),
    result(1, '', 'E403 forbidden')
  ]) {
    await assert.rejects(
      registryMetadata(record, {
        attempts: 1,
        command: async () => response
      }),
      /Registry/
    )
  }
})

test('transient lookups retry with bounded backoff, not a publish retry', async () => {
  let calls = 0
  const delays = []
  await registryMetadata(record, {
    command: async () =>
      ++calls < 3 ? result(1, '', 'E429') : result(0, JSON.stringify(metadata)),
    sleep: async (ms) => delays.push(ms)
  })
  assert.equal(calls, 3)
  assert.deepEqual(delays, [1000, 2000])
})

test('malformed, missing or wrong registry metadata is never accepted', async () => {
  for (const value of [
    null,
    {},
    { ...metadata, name: 'other' },
    { ...metadata, version: '3.0.2' },
    { ...metadata, 'dist.integrity': null },
    { ...metadata, 'dist.tarball': null }
  ]) {
    await assert.rejects(
      registryMetadata(record, {
        command: async () => result(0, JSON.stringify(value))
      })
    )
  }
})

test('an existing version with different frozen bytes fails immediately', () => {
  assert.throws(
    () =>
      verifyRegistryIntegrity(record, {
        name: record.packageName,
        version: record.version,
        integrity: 'sha512-other'
      }),
    /integrity mismatch/
  )
})

test('visibility waits for exact integrity before releasing dependents', async () => {
  let calls = 0
  const answer = { name: record.packageName, version: record.version, integrity: record.integrity }
  assert.equal(
    await waitForRegistry(record, {
      query: async () => (++calls < 3 ? null : answer),
      sleep: async () => {},
      attempts: 3
    }),
    answer
  )
  assert.equal(calls, 3)
  await assert.rejects(
    waitForRegistry(record, {
      query: async () => null,
      sleep: async () => {},
      attempts: 2
    }),
    /pending registry propagation/
  )
  calls = 0
  await assert.rejects(
    waitForRegistry(record, {
      query: async () => {
        calls++
        return { ...answer, integrity: 'different' }
      },
      sleep: async () => assert.fail(),
      attempts: 5
    }),
    /integrity mismatch/
  )
  assert.equal(calls, 1)
})

test('asynchronous command capture returns exit codes and drains output', async () => {
  const answer = await captureCommand(process.execPath, ['-e', 'console.log("ok");process.exit(7)'])
  assert.equal(answer.status, 7)
  assert.equal(answer.stdout.trim(), 'ok')
  await assert.rejects(captureCommand('/nonexistent-file-viewer-command', []), /ENOENT/)
})
