import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { CAD_INTEGRATION_SOURCE, CAD_PUBLIC_CORRESPONDING_SOURCE } from './cad-source-offer.mjs'
import { readCadRemoteSource } from './cad-source-reference.mjs'
import { readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'

const root = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
assert.ok(new Set(args).size === args.length && args.every(arg => ['--rebuild', '--remote'].includes(arg)),
  'Only --rebuild and --remote are supported')
const archive = await readCadCorrespondingSource(root, CAD_INTEGRATION_SOURCE)
await verifyCadPreferredSourceInputs(root, archive.manifest)
const result = { sourceArchiveSha256: CAD_INTEGRATION_SOURCE.sha256,
  preferredInputs: archive.manifest.preferredSourceInputs.length, files: archive.files.size,
  runtimeBytes: CAD_INTEGRATION_SOURCE.runtimeBytes, runtimeSha256: CAD_INTEGRATION_SOURCE.runtimeSha256 }
if (args.includes('--rebuild')) {
  const temporary = await mkdtemp(join(tmpdir(), 'file-viewer-cad-source-rebuild-'))
  let passed = false
  try {
    for (const [relative, bytes] of archive.files) {
      const path = join(temporary, relative)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes, { flag: 'wx', mode: 0o644 })
    }
    const npmCli = [
      resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
      join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    ].find(path => existsSync(path))
    assert.ok(npmCli, 'Cannot locate the npm CLI for this Node runtime')
    for (const commandArgs of [
      ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/'],
      ['run', 'build']
    ]) {
      const child = spawnSync(process.execPath, [npmCli, ...commandArgs], { cwd: temporary, stdio: 'inherit',
        env: process.env, timeout: 600_000, shell: false })
      if (child.error) throw child.error
      assert.equal(child.status, 0, 'CAD corresponding-source cold rebuild failed')
    }
    const rebuilt = await readFile(join(temporary, 'dist/cad.iife.js'))
    const distributed = await readFile(join(root, 'packages/components/web-full/dist/renderers/cad.iife.js'))
    assert.equal(rebuilt.length, CAD_INTEGRATION_SOURCE.runtimeBytes)
    assert.equal(createHash('sha256').update(rebuilt).digest('hex'), CAD_INTEGRATION_SOURCE.runtimeSha256)
    assert.ok(rebuilt.equals(distributed), 'CAD archive does not reconstruct the actual Full runtime')
    result.coldRebuildMatchesActualFullRuntime = true
    passed = true
  } finally {
    if (passed) await rm(temporary, { recursive: true, force: true })
    else console.error(`CAD rebuild evidence retained at ${temporary}`)
  }
}
if (args.includes('--remote')) {
  assert.equal(CAD_PUBLIC_CORRESPONDING_SOURCE.runtimeSha256, CAD_INTEGRATION_SOURCE.runtimeSha256,
    'The existing public source no longer corresponds to the current CAD integration')
  const remote = readCadRemoteSource(CAD_PUBLIC_CORRESPONDING_SOURCE)
  result.httpsReadback = { ...remote.proof, status: 'verified-public-source-bytes' }
}
console.log('[cad-corresponding-source]', JSON.stringify(result))
