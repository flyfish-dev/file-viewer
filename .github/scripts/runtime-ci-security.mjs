import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { command, verifyFrozenArtifacts } from './runtime-ci-artifacts.mjs'
import { consumerFrameworks } from './runtime-ci-consumers.mjs'
import { startFrozenValidationRegistry } from './frozen-validation-registry.mjs'
import { assessRuntimeAudit } from './runtime-audit-policy.mjs'
const { resolvedAuditScope } = createRequire(import.meta.url)('./runtime-audit-scope.cjs')

// Disclosure must be approved before creating any audit payload or contacting its endpoint.
assert.equal(
  process.env.RUNTIME_AUDIT_DISCLOSURE_APPROVED,
  'true',
  'Expanded runtime dependency audit disclosure is not authorized; no audit was submitted'
)
const published = process.argv[2] === '--published-release'
if (published) assert.equal(process.argv.length, 5)
else assert.equal(process.argv.length, 4)
const root = resolve(process.argv[published ? 3 : 2]),
  directory = resolve(process.argv[published ? 4 : 3])
const context = published
  ? await (
      await import('./lib/published-release-qualification.mjs')
    ).readPublishedReleaseContext(root, { requireAudit: true })
  : null
if (context)
  await (
    await import('./lib/published-release-qualification.mjs')
  ).verifyPublishedReleaseDownloads(directory, context)
const manifest = context
  ? context.manifest
  : JSON.parse(await readFile(join(root, 'artifacts/npm-release-manifest.json'), 'utf8'))
const verified = await verifyFrozenArtifacts(directory, manifest)
const candidate = context
  ? context.contract
  : JSON.parse(await readFile(join(root, 'artifacts/runtime-ci-candidate.json'), 'utf8'))
const approvedAuditDigests = candidate.productionAuditPayloadSha256
assert.ok(
  approvedAuditDigests && Object.keys(approvedAuditDigests).length === 16,
  'Exact approved production audit case digests are required; no payload was sent'
)
const archives = verified.map((item) => ({
  packageName: item.packageName,
  version: item.version,
  filename: item.tarball,
  path: join(directory, item.tarball),
  bytes: item.tarballSize,
  integrity: item.integrity,
  sha256: item.sha256,
  unpackedBytes: item.unpackedBytes
}))
for (const item of candidate.registrySupport)
  archives.push({
    ...item,
    filename: item.tarball,
    path: join(directory, item.tarball),
    bytes: item.tarballSize
  })
const temporary = await mkdtemp(join(tmpdir(), 'runtime-security-'))
let registry
try {
  registry = await startFrozenValidationRegistry({
    archives,
    cacheDirectory: join(temporary, 'registry-cache')
  })
  const cli = verified.find((item) => item.packageName === '@file-viewer/cli')
  assert(cli)
  const { spawnSync } = await import('node:child_process')
  const globalRoot = (await command('npm', ['root', '-g'])).trim()
  const npmRequire = createRequire(join(globalRoot, 'npm/package.json'))
  const Arborist = npmRequire('@npmcli/arborist')
  const AuditReport = npmRequire('@npmcli/arborist/lib/audit-report.js')
  const extracted = spawnSync(
    'tar',
    ['-xOf', join(directory, cli.tarball), 'package/catalog/catalog.json'],
    { encoding: 'utf8' }
  )
  assert.equal(extracted.status, 0)
  if (context) {
    const { createHash } = await import('node:crypto')
    assert.equal(
      createHash('sha256').update(extracted.stdout).digest('hex'),
      context.contract.auditApproval.catalogSha256,
      'Published CLI catalog differs from approved production body inputs'
    )
  }
  const catalog = JSON.parse(extracted.stdout)
  const env = {
    ...process.env,
    npm_config_audit: 'false',
    npm_config_fund: 'false'
  }
  for (const framework of consumerFrameworks)
    for (const profile of ['standard', 'full']) {
      const project = join(temporary, `${framework}-${profile}`)
      await mkdir(project)
      const dependencies = {
        ...catalog.frameworkTemplates[framework].runtimeDependencies
      }
      if (profile === 'full')
        dependencies[catalog.frameworkOverrides.full[framework].packageName] = manifest.version
      else
        Object.assign(dependencies, {
          [catalog.frameworks[framework].packageName]: manifest.version,
          '@file-viewer/core': manifest.version,
          '@file-viewer/preset-standard': manifest.version,
          '@file-viewer/assets-standard': manifest.version
        })
      await writeFile(
        join(project, 'package.json'),
        JSON.stringify({ private: true, dependencies }) + '\n'
      )
      await command(
        'npm',
        [
          'install',
          '--package-lock-only',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--registry',
          registry.url
        ],
        { cwd: project, env }
      )
      const caseId = `${framework}-${profile}`
      assert.ok(/^[a-f0-9]{64}$/.test(approvedAuditDigests[caseId] || ''))
      // Resolve the normal virtual lock offline before any authorized audit disclosure.
      const virtual = await new Arborist({
        path: project,
        audit: false
      }).loadVirtual()
      const payload = new AuditReport(virtual, {
        omit: ['dev']
      }).prepareBulkData()
      // Standing permission enables these cases; it must never broaden the
      // exact approved body if registry resolution changes.
      const scope = resolvedAuditScope(payload, approvedAuditDigests[caseId])
      console.log(JSON.stringify({ caseId, auditScope: scope }))
      const auditHome = join(project, '.audit-home')
      await mkdir(auditHome)
      await writeFile(join(auditHome, 'user.npmrc'), '')
      await writeFile(join(auditHome, 'global.npmrc'), '')
      const auditEnv = Object.fromEntries(
        Object.entries(env).filter(
          ([name]) =>
            !/token|password|passwd|secret|cookie|auth|proxy/i.test(name) &&
            !/^(?:npm_config_|pnpm_config_)/i.test(name)
        )
      )
      Object.assign(auditEnv, {
        HOME: auditHome,
        XDG_CONFIG_HOME: auditHome,
        NPM_CONFIG_USERCONFIG: join(auditHome, 'user.npmrc'),
        NPM_CONFIG_GLOBALCONFIG: join(auditHome, 'global.npmrc'),
        NODE_OPTIONS: `--require=${join(import.meta.dirname, 'runtime-audit-preload.cjs')}`,
        FILE_VIEWER_AUDIT_EXPECTED_PAYLOAD_SHA256: scope.actualSha256
      })
      const audit = spawnSync(
        'npm',
        [
          'audit',
          '--omit=dev',
          '--audit-level=low',
          '--registry=https://registry.npmjs.org',
          '--json',
          '--fetch-retries=0'
        ],
        {
          cwd: project,
          env: auditEnv,
          encoding: 'utf8',
          maxBuffer: 8 * 1024 * 1024
        }
      )
      await writeFile(join(project, 'normal-npm-audit.json'), audit.stdout || '')
      assert.ok([0, 1].includes(audit.status), 'Normal npm audit could not complete')
      const auditReport = JSON.parse(audit.stdout)
      assert.ok(
        !auditReport.error,
        JSON.stringify({
          caseId,
          error: auditReport.error,
          stderr: audit.stderr
        })
      )
      const lock = JSON.parse(await readFile(join(project, 'package-lock.json'), 'utf8'))
      const policy = assessRuntimeAudit(auditReport, {
        framework,
        vueVersion: lock.packages?.['node_modules/vue']?.version
      })
      assert.notEqual(policy.status, 'failed', `Unexpected production vulnerability in ${caseId}`)
      console.log(
        JSON.stringify({
          caseId,
          status: policy.status,
          retainedExceptions: policy.retainedExceptions
        })
      )
      await rm(project, { recursive: true })
    }
  console.log(
    'All sixteen frozen production dependency closures passed the approved security audit.'
  )
} finally {
  if (registry) await registry.close()
  await rm(temporary, { recursive: true, force: true })
}
