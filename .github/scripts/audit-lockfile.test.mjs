import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { classifyAudit } from './audit-lockfile.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const directory = 'node_modules/.pnpm/minimatch@3.1.5/node_modules/minimatch'
const advisory = () => ({
  module_name: 'minimatch',
  github_advisory_id: 'GHSA-g3hv-75wg-m249',
  title: 'minimatch has potential denial of service via globparts amplification',
  vulnerable_versions: '<11.0.1',
  patched_versions: '>=11.0.1',
  severity: 'moderate',
  findings: [{ version: '3.1.5', paths: ['consumer>minimatch'] }]
})
const report = (value) => ({
  advisories: value ? { finding: value } : {},
  metadata: { vulnerabilities: { moderate: value ? 1 : 0 } }
})

test('only the exact legacy finding with upstream-identical installed code is non-actionable', () => {
  const result = classifyAudit(report(advisory()), root)
  assert.equal(result.passed, true)
  assert.equal(result.exceptions.length, 1)
  assert.equal(result.exceptions[0].version, '3.1.5')
})
test('modern minimatch versions remain blocking even when legacy v3 is installed', () => {
  for (const version of ['9.0.9', '10.2.5', '11.0.0']) {
    const value = advisory()
    value.findings.push({ version, paths: ['another>minimatch'] })
    assert.equal(classifyAudit(report(value), root).passed, false)
  }
})
test('different advisory identity, package, range or missing findings remain blocking', () => {
  for (const delta of [
    { github_advisory_id: 'GHSA-other' },
    { module_name: 'another' },
    { vulnerable_versions: '<3.1.6' },
    { patched_versions: '>=3.1.6' },
    { findings: [] }
  ]) {
    assert.equal(classifyAudit(report({ ...advisory(), ...delta }), root).passed, false)
  }
})
test('one demonstrated false positive cannot hide another actionable finding', () => {
  const value = report(advisory())
  value.advisories.other = { ...advisory(), github_advisory_id: 'GHSA-other' }
  assert.equal(classifyAudit(value, root).passed, false)
})
test('missing or substituted installed source cannot satisfy the exception', (t) => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'legacy-audit-'))
  t.after(() => rmSync(temporary, { recursive: true, force: true }))
  assert.throws(() => classifyAudit(report(advisory()), temporary))
  mkdirSync(resolve(temporary, directory), { recursive: true })
  copyFileSync(
    resolve(root, directory, 'package.json'),
    resolve(temporary, directory, 'package.json')
  )
  writeFileSync(resolve(temporary, directory, 'minimatch.js'), 'module.exports = {}')
  assert.throws(() => classifyAudit(report(advisory()), temporary), /differs from upstream/)
  copyFileSync(
    resolve(root, directory, 'minimatch.js'),
    resolve(temporary, directory, 'minimatch.js')
  )
  const manifest = JSON.parse(readFileSync(resolve(temporary, directory, 'package.json')))
  manifest.version = '9.0.9'
  writeFileSync(resolve(temporary, directory, 'package.json'), JSON.stringify(manifest))
  assert.throws(() => classifyAudit(report(advisory()), temporary))
})
test('malformed audit output fails closed and an empty successful report is accepted', () => {
  for (const value of [
    {},
    { error: 'registry unavailable' },
    { advisories: null },
    { advisories: [] }
  ]) {
    assert.throws(() => classifyAudit(value, root))
  }
  assert.equal(classifyAudit(report(), root).passed, true)
})
