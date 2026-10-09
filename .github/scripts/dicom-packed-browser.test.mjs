import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import {
  assertNoAncestorNodeModules,
  cleanEnvironment,
  installedPackage,
  retainEvidence
} from '../../packages/renderers/dicom/scripts/verify-packed-browser.mjs'

const temporary = (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dicom-packed-control-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  return directory
}

test('a failed consumer retains its report, command log and lockfile before cleanup', async (t) => {
  const directory = temporary(t)
  const output = join(directory, 'evidence')
  const consumer = join(directory, 'consumer')
  mkdirSync(consumer)
  const lock = '{"lockfileVersion":3}\n'
  writeFileSync(join(consumer, 'package-lock.json'), lock)
  const report = { status: 'running', results: [] }
  await assert.rejects(
    retainEvidence(output, consumer, report, async () => {
      writeFileSync(join(output, 'cold-install.log'), 'negative-control install failure\n')
      throw new Error('negative-control install failure')
    }),
    /negative-control install failure/
  )
  assert.equal(existsSync(consumer), false)
  const retained = JSON.parse(readFileSync(join(output, 'report.json'), 'utf8'))
  assert.equal(retained.status, 'failed')
  assert.match(retained.error, /negative-control install failure/)
  assert.ok(retained.finishedAt)
  assert.equal(readFileSync(join(output, 'package-lock.json'), 'utf8'), lock)
  assert.match(readFileSync(join(output, 'cold-install.log'), 'utf8'), /install failure/)
})

test('installed identity checks reject a correct-name package linked outside the consumer', (t) => {
  const directory = temporary(t)
  const consumer = join(directory, 'consumer')
  const packageRoot = join(consumer, 'node_modules', 'packed-control')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(join(consumer, 'package.json'), '{}')
  const manifest = { name: 'packed-control', version: '1.0.0', main: 'index.js' }
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify(manifest))
  writeFileSync(join(packageRoot, 'index.js'), 'module.exports = {}')
  assert.equal(installedPackage(consumer, 'packed-control', '1.0.0').name, 'packed-control')
  assert.throws(() => installedPackage(consumer, 'packed-control', '2.0.0'), /version drifted/)
  // Use another package name so Node's resolution cache cannot conceal the link.
  const escaped = join(directory, 'escaped')
  mkdirSync(escaped)
  writeFileSync(join(escaped, 'package.json'), JSON.stringify({ ...manifest, name: 'escaped' }))
  writeFileSync(join(escaped, 'index.js'), 'module.exports = {}')
  symlinkSync(escaped, join(consumer, 'node_modules', 'escaped'), 'dir')
  assert.throws(() => installedPackage(consumer, 'escaped', '1.0.0'), /escaped consumer/)
})

test('ancestor resolution contamination fails before install and retains its setup classification', async (t) => {
  const directory = temporary(t)
  const consumer = join(directory, 'consumer')
  const output = join(directory, 'evidence')
  mkdirSync(consumer)
  writeFileSync(join(consumer, 'package.json'), '{}')
  assertNoAncestorNodeModules(consumer)
  const ancestorPackage = join(directory, 'node_modules', 'undeclared-control')
  mkdirSync(ancestorPackage, { recursive: true })
  writeFileSync(
    join(ancestorPackage, 'package.json'),
    JSON.stringify({
      name: 'undeclared-control',
      version: '1.0.0',
      main: 'index.js'
    })
  )
  writeFileSync(join(ancestorPackage, 'index.js'), 'module.exports = {}')
  const require = createRequire(join(consumer, 'package.json'))
  assert.equal(require.resolve('undeclared-control'), join(ancestorPackage, 'index.js'))
  const report = { status: 'running', results: [] }
  await assert.rejects(
    retainEvidence(output, consumer, report, async () => {
      assertNoAncestorNodeModules(consumer)
      assert.fail('Contaminated consumer must never reach installation')
    }),
    { code: 'CONTAMINATED_VALIDATION_SETUP' }
  )
  const retained = JSON.parse(readFileSync(join(output, 'report.json'), 'utf8'))
  assert.equal(retained.status, 'failed')
  assert.equal(retained.failureKind, 'CONTAMINATED_VALIDATION_SETUP')
  assert.match(retained.error, /Contaminated validation setup: ancestor/)
})

test('clean child startup removes effective preload and lookup contamination, retaining network settings', (t) => {
  const directory = temporary(t)
  const preload = join(directory, 'preload.cjs')
  writeFileSync(preload, 'globalThis.dicomPreloaded = true')
  const environment = {
    ...process.env,
    NODE_PATH: directory,
    NODE_OPTIONS: `--require=${preload}`,
    HTTPS_PROXY: 'http://proxy.invalid:1234'
  }
  const probe = `console.log(JSON.stringify({ preloaded: Boolean(globalThis.dicomPreloaded), paths: require('node:module').globalPaths, options: process.env.NODE_OPTIONS, proxy: process.env.HTTPS_PROXY }))`
  const contaminated = spawnSync(process.execPath, ['-e', probe], {
    env: environment,
    encoding: 'utf8'
  })
  assert.equal(contaminated.status, 0)
  assert.equal(JSON.parse(contaminated.stdout).preloaded, true)
  assert.ok(JSON.parse(contaminated.stdout).paths.includes(directory))
  const clean = spawnSync(process.execPath, ['-e', probe], {
    env: cleanEnvironment(environment),
    encoding: 'utf8'
  })
  assert.equal(clean.status, 0)
  const result = JSON.parse(clean.stdout)
  assert.equal(result.preloaded, false)
  assert.equal(result.paths.includes(directory), false)
  assert.equal(result.options, undefined)
  assert.equal(result.proxy, environment.HTTPS_PROXY)
})

test('full Public CI runs both installed browser engines after inspection and always retains compact evidence', () => {
  const workflow = readFileSync(resolve(import.meta.dirname, '../workflows/public-ci.yml'), 'utf8')
  const install = workflow.indexOf('pnpm exec playwright install --with-deps chromium webkit')
  const inspection = workflow.indexOf('pnpm --filter @file-viewer/renderer-dicom verify:inspection')
  const gate = workflow.indexOf('pnpm --filter @file-viewer/renderer-dicom verify:packed-browser')
  assert.ok(install >= 0 && inspection > install && gate > inspection)
  const retention = workflow
    .split('- name: Retain packed DICOM browser evidence')[1]
    ?.split('- name:')[0]
  assert.ok(retention)
  assert.match(retention, /if: always\(\) && steps\.impact\.outputs\.runtime != 'false'/)
  assert.match(retention, /retention-days: 7/)
  for (const extension of ['json', 'log', 'png']) {
    assert.ok(retention.includes(`output/dicom-packed-browser/**/*.${extension}`))
  }
  assert.equal(retention.includes('**/*.tgz'), false)
  assert.equal(retention.includes('node_modules'), false)
})
