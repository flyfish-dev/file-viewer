import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'

const repo = 'flyfish-dev/file-viewer'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const safeName = (name) => typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(name)
const sha = (value) => /^[a-f0-9]{64}$/.test(value || '')

export function verifyTransferPlan(plan, phase, manifest) {
  assert.equal(plan.schemaVersion, 1)
  assert.equal(plan.releaseTag, 'v3.3.2')
  assert.equal(plan.releaseId, 428968345)
  assert.ok(['main', 'legacy'].includes(phase))
  const spec = plan.manifests[phase]
  assert.equal(spec.sourceTag, phase === 'main' ? 'v3.3.2' : 'v3.3.2-legacy-web')
  assert.equal(
    spec.asset,
    phase === 'main' ? 'npm-release-manifest.json' : 'npm-legacy-web-release-manifest.json'
  )
  assert.match(spec.sourceCommit, /^[a-f0-9]{40}$/)
  assert.ok(sha(spec.sha256))
  assert.equal(manifest.version, '3.3.2')
  assert.equal(manifest.packageCount, manifest.packages.length)
  const recipes = plan.archives.filter((row) => row.phase === phase)
  assert.equal(recipes.length, phase === 'main' ? 2 : 1)
  const names = new Set()
  for (const row of recipes) {
    assert.equal(row.baseTag, 'v3.3.1')
    for (const name of [row.baseArchive, row.targetArchive, row.deltaAsset])
      assert.ok(safeName(name))
    assert.ok(row.baseArchive.endsWith('-3.3.1.tgz'))
    assert.ok(row.targetArchive.endsWith('-3.3.2.tgz'))
    assert.equal(row.deltaAsset, row.targetArchive + '.transfer.zst')
    for (const value of [
      row.baseSha256,
      row.baseTarSha256,
      row.targetSha256,
      row.targetTarSha256,
      row.deltaSha256
    ])
      assert.ok(sha(value))
    assert.equal(row.gzipHeaderHex, '1f8b08000000000002ff')
    assert.ok(
      Number.isSafeInteger(row.targetBytes) && row.targetBytes > 0 && row.targetBytes < 150_000_000
    )
    assert.ok(
      Number.isSafeInteger(row.deltaBytes) && row.deltaBytes > 0 && row.deltaBytes < 2_000_000
    )
    assert.ok(!names.has(row.targetArchive))
    names.add(row.targetArchive)
    const entry = manifest.packages.find((item) => item.packageName === row.packageName)
    assert.ok(entry)
    assert.equal(entry.version, '3.3.2')
    assert.equal(entry.tarball, row.targetArchive)
    assert.equal(entry.sha256, row.targetSha256)
    assert.equal(entry.tarballSize, row.targetBytes)
  }
  return recipes
}

export function recoverFrozenArchive(row, baseBytes, deltaBytes, directory) {
  assert.equal(hash(baseBytes), row.baseSha256)
  assert.equal(hash(deltaBytes), row.deltaSha256)
  assert.equal(deltaBytes.length, row.deltaBytes)
  const baseTar = gunzipSync(baseBytes)
  assert.equal(hash(baseTar), row.baseTarSha256)
  const basePath = join(directory, 'base.tar'),
    deltaPath = join(directory, 'delta.zst'),
    targetTar = join(directory, 'restored.tar')
  writeFileSync(basePath, baseTar)
  writeFileSync(deltaPath, deltaBytes)
  execFileSync(
    'zstd',
    ['-d', '--long=29', '--patch-from=' + basePath, deltaPath, '-o', targetTar],
    { stdio: 'inherit' }
  )
  const bytes = readFileSync(targetTar)
  assert.equal(hash(bytes), row.targetTarSha256)
  const compressed = gzipSync(bytes, { level: 9 })
  Buffer.from(row.gzipHeaderHex, 'hex').copy(compressed)
  assert.equal(compressed.length, row.targetBytes)
  assert.equal(
    hash(compressed),
    row.targetSha256,
    'Recovered archive is not byte-identical to the frozen package'
  )
  const output = join(directory, row.targetArchive)
  writeFileSync(output, compressed)
  return output
}

function main() {
  assert.equal(process.env.GITHUB_REPOSITORY, repo)
  assert.match(process.env.EXPECTED_SHA || '', /^[a-f0-9]{40}$/)
  assert.equal(
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    process.env.EXPECTED_SHA
  )
  const plan = JSON.parse(
    readFileSync(new URL('./frozen-assets-3.3.2-transfer.json', import.meta.url), 'utf8')
  )
  assert.equal(process.version, plan.node)
  assert.equal(process.versions.zlib, plan.zlib)
  const phase = process.env.TRANSFER_PHASE
  assert.ok(['main', 'legacy'].includes(phase))
  const command = (args) => execFileSync('gh', args, { maxBuffer: 512 * 1024 * 1024 })
  const api = (path) => JSON.parse(command(['api', `repos/${repo}/${path}`]))
  const spec = plan.manifests[phase]
  const tag = api(`git/ref/tags/${spec.sourceTag}`)
  assert.equal(tag.object.type, 'commit')
  assert.equal(tag.object.sha, spec.sourceCommit)
  const sourceBytes = command([
    'api',
    '-X',
    'GET',
    `repos/${repo}/contents/artifacts/${spec.asset}`,
    '-f',
    `ref=${spec.sourceTag}`,
    '-H',
    'Accept: application/vnd.github.raw+json'
  ])
  assert.equal(hash(sourceBytes), spec.sha256)
  const manifest = JSON.parse(sourceBytes)
  const recipes = verifyTransferPlan(plan, phase, manifest)
  const target = api(`releases/${plan.releaseId}`)
  assert.equal(target.tag_name, plan.releaseTag)
  const download = (release, name) => {
    const asset = release.assets.find((item) => item.name === name)
    assert.ok(asset && asset.state === 'uploaded', `Missing uploaded asset: ${name}`)
    return command([
      'api',
      `repos/${repo}/releases/assets/${asset.id}`,
      '-H',
      'Accept: application/octet-stream'
    ])
  }
  assert.ok(sourceBytes.equals(download(target, spec.asset)), 'Release and source manifests differ')
  const baseRelease = api('releases/tags/v3.3.1')
  const results = []
  for (const row of recipes) {
    const existing = target.assets.find((item) => item.name === row.targetArchive)
    if (existing) {
      assert.equal(existing.state, 'uploaded')
      assert.equal(existing.size, row.targetBytes)
      assert.equal(existing.digest, 'sha256:' + row.targetSha256)
      results.push({
        archive: row.targetArchive,
        status: 'verified-existing',
        sha256: row.targetSha256
      })
      continue
    }
    const directory = mkdtempSync(join(tmpdir(), 'file-viewer-asset-transfer-'))
    try {
      const output = recoverFrozenArchive(
        row,
        download(baseRelease, row.baseArchive),
        download(target, row.deltaAsset),
        directory
      )
      command(['release', 'upload', plan.releaseTag, '--repo', repo, output])
      const uploaded = api(`releases/${plan.releaseId}`).assets.find(
        (item) => item.name === row.targetArchive
      )
      assert.equal(uploaded?.size, row.targetBytes)
      assert.equal(uploaded.digest, 'sha256:' + row.targetSha256)
      results.push({
        archive: row.targetArchive,
        status: 'recovered-identical',
        sha256: row.targetSha256
      })
      console.log(JSON.stringify(results.at(-1)))
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }
  const report = { status: 'frozen-assets-recovered', phase, npmWrites: 0, results }
  console.log(JSON.stringify(report))
  if (process.env.GITHUB_STEP_SUMMARY)
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, JSON.stringify(report, null, 2) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
