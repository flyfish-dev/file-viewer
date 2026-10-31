import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const legacyMinimatchSha256 =
  '746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d'
const advisoryId = 'GHSA-g3hv-75wg-m249'

export function verifyLegacyMinimatch(root) {
  const directory = resolve(root, 'node_modules/.pnpm/minimatch@3.1.5/node_modules/minimatch')
  const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'))
  assert.equal(manifest.name, 'minimatch')
  assert.equal(manifest.version, '3.1.5')
  const source = readFileSync(resolve(directory, 'minimatch.js'))
  const sha256 = createHash('sha256').update(source).digest('hex')
  assert.equal(
    sha256,
    legacyMinimatchSha256,
    'Legacy minimatch source differs from upstream v3.1.5'
  )
  assert.doesNotMatch(source.toString(), /firstPhasePreProcess|optimizationLevel/)
  return { version: manifest.version, sha256 }
}

export function classifyAudit(report, root) {
  assert(
    report &&
      typeof report.advisories === 'object' &&
      report.advisories !== null &&
      !Array.isArray(report.advisories),
    'Missing audit advisories'
  )
  assert(report.metadata?.vulnerabilities, 'Missing audit metadata')
  const exceptions = [],
    blocking = []
  for (const advisory of Object.values(report.advisories)) {
    // Upstream's broad range includes v3, whose verified source does not contain
    // the optimizationLevel >= 2 / firstPhasePreProcess feature in this advisory.
    // https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249
    // https://github.com/isaacs/minimatch/blob/v3.1.5/minimatch.js
    const findings = advisory.findings
    const legacyOnly =
      advisory.github_advisory_id === advisoryId &&
      advisory.module_name === 'minimatch' &&
      advisory.title === 'minimatch has potential denial of service via globparts amplification' &&
      advisory.vulnerable_versions === '<11.0.1' &&
      advisory.patched_versions === '>=11.0.1' &&
      Array.isArray(findings) &&
      findings.length > 0 &&
      findings.every(
        (finding) =>
          finding.version === '3.1.5' &&
          Array.isArray(finding.paths) &&
          finding.paths.length > 0 &&
          finding.paths.every(
            (path) => typeof path === 'string' && path.split('>').at(-1) === 'minimatch'
          )
      )
    if (legacyOnly)
      exceptions.push({
        advisory: advisoryId,
        reason: 'Verified legacy v3 source has no affected preprocessing feature',
        ...verifyLegacyMinimatch(root)
      })
    else blocking.push(advisory)
  }
  return { passed: blocking.length === 0, exceptions, blocking }
}

export function runAudit(root = process.cwd()) {
  const result = spawnSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['audit', '--json', '--registry=https://registry.npmjs.org', '--audit-level=low'],
    { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )
  assert.ifError(result.error)
  assert([0, 1].includes(result.status), 'Audit command failed: ' + result.stderr)
  const report = JSON.parse(result.stdout)
  const classification = classifyAudit(report, root)
  assert(
    result.status === 0 || Object.keys(report.advisories).length > 0,
    'Nonzero audit returned no findings'
  )
  const directory = resolve(root, 'output/security')
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(directory, 'npm-audit.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(
    resolve(directory, 'npm-audit-classification.json'),
    JSON.stringify(classification, null, 2) + '\n'
  )
  console.log(JSON.stringify(classification, null, 2))
  return classification.passed ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2, 'Unexpected audit argument')
  process.exitCode = runAudit()
}
