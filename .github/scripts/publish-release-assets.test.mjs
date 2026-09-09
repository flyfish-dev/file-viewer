import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { captureCommand } from './npm-release-batch.mjs'

const publisher = join(dirname(fileURLToPath(import.meta.url)), 'publish-release-assets.mjs')
const repository = 'https://github.com/flyfish-dev/file-viewer'

async function fixture(t, scenario = '', extraPackages = []) {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-publish-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const bin = join(root, 'bin')
  const assets = join(root, 'assets')
  await mkdir(bin)
  await mkdir(assets)
  const entries = []
  const existing = {}
  for (const [name, dependencies, version = '3.0.3'] of [
    ['full', { ui: '3.0.3' }],
    ['ui', { core: '3.0.3' }],
    ['core', {}],
    ...extraPackages
  ]) {
    const directory = join(root, name)
    await mkdir(join(directory, 'package'), { recursive: true })
    const pkg = {
      name,
      version,
      dependencies,
      repository: { type: 'git', url: repository }
    }
    await writeFile(join(directory, 'package/package.json'), JSON.stringify(pkg))
    const tarball = `${name}-${version}.tgz`
    assert.equal(
      (await captureCommand('tar', ['-czf', join(assets, tarball), '-C', directory, 'package']))
        .status,
      0
    )
    const bytes = await readFile(join(assets, tarball))
    existing[name] = {
      name,
      version,
      'dist.integrity': `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      'dist.tarball': `https://registry.npmjs.org/${name}/-/${tarball}`
    }
    entries.push({
      packageName: name,
      version,
      tarball,
      sha256: createHash('sha256').update(bytes).digest('hex')
    })
  }
  const manifest = { version: '3.0.3', packageCount: entries.length, packages: entries }
  await writeFile(join(assets, 'npm-release-manifest.json'), JSON.stringify(manifest))
  await writeFile(join(root, 'metadata.json'), JSON.stringify(existing))
  const mock = `#!${process.execPath}
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
const root = process.env.MOCK_ROOT
const args = process.argv.slice(2)
const data = JSON.parse(readFileSync(join(root, 'metadata.json'), 'utf8'))
const state = name => join(root, name + '.published.json')
if (args[0] === 'view') {
  const name = args[1].split('@')[0]
  if (existsSync(state(name))) { console.log(readFileSync(state(name), 'utf8')); process.exit(0) }
  console.error('npm error E404 No match found for version 3.0.3'); process.exit(1)
}
if (args[0] !== 'publish') throw new Error('Unexpected npm command: ' + args[0])
const pkg = JSON.parse(execFileSync('tar', ['-xOzf', args[1], 'package/package.json'], {encoding:'utf8'}))
appendFileSync(join(root, 'calls.txt'), pkg.name + '\\n')
if (args.includes('--dry-run')) process.exit(0)
if (process.env.MOCK_SCENARIO === 'failure' && pkg.name === 'ui') {
  console.error('npm error E403 forbidden'); process.exit(1)
}
for (const name of Object.keys(pkg.dependencies || {})) {
  if (!existsSync(state(name))) throw new Error('Dependency not verified: ' + name)
}
if (process.env.MOCK_SCENARIO === 'mismatch' && pkg.name === 'core') data.core['dist.integrity'] = 'sha512-wrong'
writeFileSync(state(pkg.name), JSON.stringify(data[pkg.name]))
if (process.env.MOCK_SCENARIO === 'conflict') { console.error('npm error EPUBLISHCONFLICT'); process.exit(1) }
`
  await writeFile(join(bin, 'npm'), mock)
  await chmod(join(bin, 'npm'), 0o755)
  const run = (extra = {}) =>
    captureCommand(process.execPath, [publisher], {
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'flyfish-dev/file-viewer',
        FILE_VIEWER_TRUSTED_REPOSITORY: repository,
        FILE_VIEWER_RELEASE_ASSETS_DIR: assets,
        FILE_VIEWER_RELEASE_TAG: 'v3.0.3',
        FILE_VIEWER_RELEASE_DRY_RUN: 'false',
        FILE_VIEWER_PUBLISH_VISIBILITY_ATTEMPTS: '2',
        FILE_VIEWER_PUBLISH_VISIBILITY_DELAY_MS: '1',
        MOCK_ROOT: root,
        MOCK_SCENARIO: scenario,
        ...extra
      }
    })
  const calls = async () =>
    (await readFile(join(root, 'calls.txt'), 'utf8').catch(() => ''))
      .trim()
      .split('\n')
      .filter(Boolean)
  return { root, assets, entries, existing, manifest, run, calls }
}

test('publisher obeys dependency order and resumes without republishing exact bytes', async (t) => {
  const f = await fixture(t)
  const first = await f.run()
  assert.equal(first.status, 0, first.stderr)
  assert.deepEqual(await f.calls(), ['core', 'ui', 'full'])
  assert.equal((await f.run()).status, 0)
  assert.deepEqual(await f.calls(), ['core', 'ui', 'full'])
  const report = JSON.parse(await readFile(join(f.assets, 'npm-publish-report.json'), 'utf8'))
  assert.equal(report.status, 'verified')
  assert(report.packages.every((r) => r.status === 'verified-existing'))
})

test('publisher accepts a manifest package version distinct from the GitHub release tag', async (t) => {
  const f = await fixture(t, '', [['compat', {}, '0.2.6']])
  const outcome = await f.run()
  assert.equal(outcome.status, 0, outcome.stderr)
  assert.deepEqual((await f.calls()).sort(), ['compat', 'core', 'full', 'ui'])
})

test('a later invalid tarball blocks all writes, not just its own layer', async (t) => {
  const f = await fixture(t)
  f.manifest.packages[0].sha256 = 'bad'
  await writeFile(join(f.assets, 'npm-release-manifest.json'), JSON.stringify(f.manifest))
  assert.notEqual((await f.run()).status, 0)
  assert.deepEqual(await f.calls(), [])
})

test('resume refuses an already existing version with different integrity', async (t) => {
  const f = await fixture(t)
  await writeFile(
    join(f.root, 'full.published.json'),
    JSON.stringify({ ...f.existing.full, 'dist.integrity': 'wrong' })
  )
  assert.match((await f.run()).stderr, /integrity mismatch/)
  assert.deepEqual(await f.calls(), [])
})

test('failed uploads and registry integrity mismatches do not release dependent layers', async (t) => {
  for (const scenario of ['failure', 'mismatch']) {
    const f = await fixture(t, scenario)
    assert.notEqual((await f.run()).status, 0)
    assert.deepEqual(await f.calls(), scenario === 'failure' ? ['core', 'ui'] : ['core'])
    const report = JSON.parse(await readFile(join(f.assets, 'npm-publish-report.json'), 'utf8'))
    assert.equal(report.status, 'failed')
  }
})

test('npm conflict is accepted only after exact registry verification', async (t) => {
  const f = await fixture(t, 'conflict')
  const outcome = await f.run()
  assert.equal(outcome.status, 0, outcome.stderr)
  assert.deepEqual(await f.calls(), ['core', 'ui', 'full'])
})

test('dry run never waits for simulated uploads to become published', async (t) => {
  const f = await fixture(t)
  const outcome = await f.run({ FILE_VIEWER_RELEASE_DRY_RUN: 'true', GITHUB_ACTIONS: 'false' })
  assert.equal(outcome.status, 0, outcome.stderr)
  const report = JSON.parse(await readFile(join(f.assets, 'npm-publish-report.json'), 'utf8'))
  assert.equal(report.status, 'dry-run-passed')
})

test('real publishing outside Actions is rejected before any write', async (t) => {
  const f = await fixture(t)
  assert.match((await f.run({ GITHUB_ACTIONS: 'false' })).stderr, /restricted to GitHub Actions/)
  assert.deepEqual(await f.calls(), [])
})
