import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { packCompatibilityEngines } from './pack-compatibility-engines.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
// Only the consumer fixture owns application-level dependency policy. Workspace
// pnpm overrides must not leak into this isolated npm consumer.
export function preparePackedConsumerManifest(fixtureManifest, version) {
  const manifest = structuredClone(fixtureManifest)
  for (const name of Object.keys(manifest.dependencies)) {
    if (name.startsWith('@file-viewer/') || name === 'file-viewer-copy-assets')
      manifest.dependencies[name] = version
  }
  manifest.overrides ??= {}
  return manifest
}

export function summarizeConsumerAudit(report, status) {
  assert.ok(status === 0 || status === 1, `npm audit failed with status ${status}`)
  assert.ok(!report.error, `npm audit error: ${JSON.stringify(report.error)}`)
  assert.ok(report.vulnerabilities && report.metadata?.vulnerabilities, 'Missing npm audit data')
  const affectedEntries = report.metadata.vulnerabilities
  assert.equal(affectedEntries.total, Object.keys(report.vulnerabilities).length)
  const advisories = new Set()
  for (const vulnerability of Object.values(report.vulnerabilities))
    for (const via of vulnerability.via) if (typeof via === 'object') advisories.add(via.url)
  return { affectedEntries, distinctAdvisories: [...advisories].sort() }
}

async function recordConsumerAudits(project, fixture) {
  const summaries = {}
  for (const scope of ['full', 'production']) {
    const result = spawnSync(
      'npm',
      [
        'audit',
        '--json',
        '--registry=https://registry.npmjs.org',
        ...(scope === 'production' ? ['--omit=dev'] : [])
      ],
      { cwd: project, encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
    )
    if (result.error) throw result.error
    await writeFile(resolve(project, `audit-${scope}.json`), result.stdout)
    const report = JSON.parse(result.stdout)
    summaries[scope] = summarizeConsumerAudit(report, result.status)
    // npm's total counts affected dependency entries, including propagated findings.
    // Keep the distinct advisory identities separate; neither count proves exploitability.
    console.log(`PACKED_CONSUMER_AUDIT=${JSON.stringify({ fixture, scope, ...summaries[scope] })}`)
  }
  await writeFile(resolve(project, 'audit-summary.json'), JSON.stringify(summaries, null, 2) + '\n')
}

export async function buildPackedIssueConsumer(
  packageDirectory,
  {
    fixture = 'webpack5-issues',
    required = [
      '@file-viewer/core',
      '@file-viewer/vue3',
      '@file-viewer/react-full',
      '@file-viewer/renderer-word',
      '@file-viewer/renderer-spreadsheet',
      '@file-viewer/renderer-cad'
    ],
    renderers = 'office-word-openxml,spreadsheet-openxml,model,office-presentation-binary,cad'
  } = {}
) {
  assert.ok(
    packageDirectory,
    'Set PACKED_ISSUE_PACKAGE_DIR to the verified release tarball directory'
  )
  const packages = resolve(packageDirectory)
  const project = resolve(
    root,
    'output/packed-issue-consumer',
    new Date().toISOString().replaceAll(':', '-')
  )
  await mkdir(project, { recursive: true })
  assert.ok(['webpack5-issues', 'angular-pptx'].includes(fixture), 'Unknown consumer fixture')
  await cp(resolve(root, 'apps/component-demo/test', fixture), project, { recursive: true })
  const fixtureManifest = JSON.parse(await readFile(resolve(project, 'package.json'), 'utf8'))
  const version =
    process.env.PACKED_ISSUE_BASE_VERSION ||
    JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version
  const manifest = preparePackedConsumerManifest(fixtureManifest, version)
  const candidates = []
  // Independently versioned engines are built in their owning repositories.
  // A release rehearsal can supply their verified tarballs without relying on
  // workspace-only patchedDependencies in the physical npm consumer.
  const packageDirectories = [packages]
  if (process.env.PACKED_ISSUE_ENGINE_DIR)
    packageDirectories.push(resolve(process.env.PACKED_ISSUE_ENGINE_DIR))
  else packageDirectories.push(await packCompatibilityEngines(root, project))
  const tarballs = []
  for (const directory of packageDirectories)
    for (const filename of (await readdir(directory))
      .filter((name) => name.endsWith('.tgz'))
      .sort())
      tarballs.push({ filename, path: resolve(directory, filename) })
  for (const { filename, path } of tarballs) {
    const metadata = JSON.parse(
      execFileSync('tar', ['-xOf', path, 'package/package.json'], { encoding: 'utf8' })
    )
    assert.ok(
      !candidates.some((candidate) => candidate.name === metadata.name),
      `Duplicate candidate ${metadata.name}`
    )
    const spec = `file:${path}`
    if (manifest.dependencies[metadata.name]) {
      manifest.dependencies[metadata.name] = spec
      manifest.overrides[metadata.name] = `$${metadata.name}`
    } else manifest.overrides[metadata.name] = spec
    const bytes = await readFile(path)
    candidates.push({
      name: metadata.name,
      version: metadata.version,
      filename,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    })
  }
  for (const name of required) {
    assert.ok(
      candidates.some((candidate) => candidate.name === name),
      `Missing candidate ${name}`
    )
  }
  await writeFile(resolve(project, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  await writeFile(
    resolve(project, 'candidate-packages.json'),
    JSON.stringify(candidates, null, 2) + '\n'
  )
  function run(command, args) {
    execFileSync(command, args, { cwd: project, stdio: 'inherit', timeout: 600_000 })
  }
  run('npm', ['install', '--ignore-scripts', '--registry=https://registry.npmjs.org'])
  await recordConsumerAudits(project, fixture)
  run('node', [
    resolve(project, 'node_modules/file-viewer-copy-assets/dist/cli.js'),
    'public/file-viewer',
    '--renderers',
    renderers
  ])
  if (fixture === 'angular-pptx') {
    await cp(
      resolve(root, 'apps/viewer-demo/public/example/ppt.pptx'),
      resolve(project, 'public/sample.pptx')
    )
  }
  run('npm', ['run', 'build'])
  console.log(`PACKED_ISSUE_CONSUMER_DIR=${project}`)
  return project
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildPackedIssueConsumer(process.env.PACKED_ISSUE_PACKAGE_DIR)
}
