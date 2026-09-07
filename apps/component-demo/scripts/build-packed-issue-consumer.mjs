import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export async function buildPackedIssueConsumer(packageDirectory) {
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
  await cp(resolve(root, 'apps/component-demo/test/webpack5-issues'), project, { recursive: true })
  const manifest = JSON.parse(await readFile(resolve(project, 'package.json'), 'utf8'))
  const version =
    process.env.PACKED_ISSUE_BASE_VERSION ||
    JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version
  for (const name of Object.keys(manifest.dependencies)) {
    if (name.startsWith('@file-viewer/') || name === 'file-viewer-copy-assets')
      manifest.dependencies[name] = version
  }
  manifest.overrides = {}
  const candidates = []
  for (const filename of (await readdir(packages)).filter((name) => name.endsWith('.tgz')).sort()) {
    const path = resolve(packages, filename)
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
    candidates.push({ name: metadata.name, version: metadata.version, filename })
  }
  for (const name of [
    '@file-viewer/core',
    '@file-viewer/vue3',
    '@file-viewer/react-full',
    '@file-viewer/renderer-word',
    '@file-viewer/renderer-spreadsheet'
  ]) {
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
  run('node', [
    resolve(project, 'node_modules/file-viewer-copy-assets/dist/cli.js'),
    'public/file-viewer',
    '--renderers',
    'office-word-openxml,spreadsheet-openxml,model,office-presentation-binary'
  ])
  run('npm', ['run', 'build'])
  console.log(`PACKED_ISSUE_CONSUMER_DIR=${project}`)
  return project
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildPackedIssueConsumer(process.env.PACKED_ISSUE_PACKAGE_DIR)
}
