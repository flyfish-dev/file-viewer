import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { command, downloadFrozenCandidate } from '../runtime-ci-artifacts.mjs'
import {
  productionCaseIds,
  readPublishedReleaseContext,
  validatePublishedReleaseContract,
  verifyPublishedReleaseRemote,
  verifyPublishedReleaseDownloads,
  verifyDownloadedFile
} from './published-release-qualification.mjs'

const root = resolve(import.meta.dirname, '../../..')
const manifestBytes = await readFile(join(root, 'artifacts/npm-release-manifest.json'))
const contract = JSON.parse(
  await readFile(join(root, 'artifacts/published-release-qualification.json'))
)
const clone = (value) => structuredClone(value)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

test('published ancestry needs retained Git history and still rejects unrelated commits', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'published-release-history-test-'))
  const upstream = join(dir, 'upstream'),
    checkout = join(dir, 'checkout')
  const git = (cwd, ...args) => command('git', args, { cwd })
  const ancestry = (ancestor) => git(checkout, 'merge-base', '--is-ancestor', ancestor, 'HEAD')
  try {
    await mkdir(upstream)
    await git(upstream, 'init', '--initial-branch=main')
    await git(upstream, 'config', 'user.name', 'Control fixture')
    await git(upstream, 'config', 'user.email', 'control@example.invalid')
    await writeFile(join(upstream, 'release.txt'), 'immutable release\n')
    await git(upstream, 'add', 'release.txt')
    await git(upstream, 'commit', '-m', 'Retain a release ancestor')
    const release = (await git(upstream, 'rev-parse', 'HEAD')).trim()
    await writeFile(join(upstream, 'release.txt'), 'qualified control descendant\n')
    await git(upstream, 'commit', '-am', 'Add descendant release controls')
    await git(upstream, 'switch', '--orphan', 'unrelated')
    await writeFile(join(upstream, 'unrelated.txt'), 'independent history\n')
    await git(upstream, 'add', 'unrelated.txt')
    await git(upstream, 'commit', '-m', 'Keep unrelated ancestry rejected')
    const unrelated = (await git(upstream, 'rev-parse', 'HEAD')).trim()
    await git(upstream, 'switch', 'main')

    await git(dir, 'clone', '--depth=1', '--branch=main', pathToFileURL(upstream).href, checkout)
    assert.equal((await git(checkout, 'rev-parse', '--is-shallow-repository')).trim(), 'true')
    await assert.rejects(ancestry(release), /git failed \(128\)/)
    await ancestry('HEAD')

    await git(
      checkout,
      'fetch',
      '--unshallow',
      '--no-recurse-submodules',
      'origin',
      '+refs/heads/*:refs/remotes/origin/*'
    )
    assert.equal((await git(checkout, 'rev-parse', '--is-shallow-repository')).trim(), 'false')
    await ancestry(release)
    assert.equal((await git(checkout, 'cat-file', '-t', unrelated)).trim(), 'commit')
    await assert.rejects(ancestry(unrelated), /git failed \(1\)/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('the explicit profile retains all 89 original TAR checks and exact three support inputs', async () => {
  const context = await readPublishedReleaseContext(root)
  assert.equal(context.manifest.packages.length, 89)
  assert.equal(context.contract.assets.length, 100)
  assert.equal(context.contract.registrySupport.length, 3)
  for (const item of context.manifest.packages) {
    assert.match(item.integrity, /^sha512-/)
    assert(item.license)
    assert.deepEqual(
      item.readmes,
      JSON.parse(manifestBytes).packages.find((row) => row.packageName === item.packageName).readmes
    )
  }
})

for (const [name, mutate] of [
  [
    'source',
    (c) => {
      c.sourceCommit = '0'.repeat(40)
    }
  ],
  [
    'tag',
    (c) => {
      c.tag = 'v3.3.5'
    }
  ],
  [
    'tag commit',
    (c) => {
      c.tagCommit = '0'.repeat(40)
    }
  ],
  [
    'release id',
    (c) => {
      c.releaseId++
    }
  ],
  [
    'manifest digest',
    (c) => {
      c.manifestSha256 = '0'.repeat(64)
    }
  ],
  [
    'missing asset',
    (c) => {
      c.assets.pop()
    }
  ],
  [
    'extra asset',
    (c) => {
      c.assets.push(clone(c.assets[0]))
    }
  ],
  [
    'asset id',
    (c) => {
      c.assets[0].id++
    }
  ],
  [
    'asset SHA',
    (c) => {
      c.assets[0].digest = 'sha256:' + '0'.repeat(64)
    }
  ],
  [
    'support version',
    (c) => {
      c.registrySupport[0].version = '0.0.1'
    }
  ],
  [
    'support integrity',
    (c) => {
      c.registrySupport[0].integrity = 'sha512-' + 'A'.repeat(86) + '=='
    }
  ],
  [
    'owned integrity',
    (c) => {
      c.ownedPackageVerification[0].integrity = 'sha512-' + 'A'.repeat(86) + '=='
    }
  ],
  [
    'public lock binding',
    (c) => {
      c.auditApproval.sourceLockSha256 = '0'.repeat(64)
    }
  ],
  [
    'public catalog binding',
    (c) => {
      c.auditApproval.publicCatalogSha256 = '0'.repeat(64)
    }
  ],
  [
    'frozen CLI catalog binding',
    (c) => {
      c.auditApproval.catalogSha256 = '0'.repeat(64)
    }
  ],
  [
    'one approved body digest',
    (c) => {
      c.productionAuditPayloadSha256['web-standard'] = '0'.repeat(64)
    }
  ],
  [
    'all sixteen approved bodies',
    (c) => {
      c.productionAuditPayloadSha256 = Object.fromEntries(
        productionCaseIds.map((id) => [id, 'a'.repeat(64)])
      )
    }
  ],
  [
    'unknown field',
    (c) => {
      c.allowUnverified = true
    }
  ]
])
  test(`changed ${name} cannot broaden the reviewed published profile`, () => {
    const changed = clone(contract)
    mutate(changed)
    assert.throws(() => validatePublishedReleaseContract(changed, manifestBytes))
  })

test('pending or incomplete approval refuses before any production audit disclosure', () => {
  const pending = clone(contract)
  pending.auditApproval.status = 'pending'
  pending.productionAuditPayloadSha256 = {}
  assert.throws(
    () =>
      validatePublishedReleaseContract(pending, manifestBytes, {
        requireAudit: true
      }),
    /not approved/
  )
  const incomplete = clone(pending)
  incomplete.auditApproval.status = 'approved-exact-public-production-bodies'
  assert.throws(() =>
    validatePublishedReleaseContract(incomplete, manifestBytes, {
      requireAudit: true
    })
  )
  const unexpected = clone(incomplete)
  unexpected.productionAuditPayloadSha256 = Object.fromEntries(
    productionCaseIds.map((id) => [id, 'a'.repeat(64)])
  )
  unexpected.productionAuditPayloadSha256['extra-full'] = 'a'.repeat(64)
  assert.throws(() =>
    validatePublishedReleaseContract(unexpected, manifestBytes, {
      requireAudit: true
    })
  )
})

function remoteFixture(mutate = () => {}) {
  const release = {
    id: contract.releaseId,
    tag_name: contract.tag,
    draft: false,
    prerelease: false,
    assets: clone(contract.assets)
  }
  const ref = { object: { type: 'commit', sha: contract.tagCommit } }
  const contents = {
    encoding: 'base64',
    content: manifestBytes.toString('base64')
  }
  mutate({ release, ref, contents })
  return async (args) => {
    assert.equal(args[0], 'api')
    const path = args[1]
    if (path.endsWith(`/releases/tags/${contract.tag}`)) return JSON.stringify(release)
    if (path.endsWith(`/git/ref/tags/${contract.tag}`)) return JSON.stringify(ref)
    assert(path.endsWith(`/contents/artifacts/npm-release-manifest.json?ref=${contract.tagCommit}`))
    return JSON.stringify(contents)
  }
}

test('a stable remote release must retain its complete exact inventory, tag and manifest', async () => {
  const context = await readPublishedReleaseContext(root)
  await verifyPublishedReleaseRemote(context, remoteFixture())
  for (const mutate of [
    ({ release }) => {
      release.draft = true
    },
    ({ release }) => {
      release.prerelease = true
    },
    ({ release }) => {
      release.assets.pop()
    },
    ({ release }) => {
      release.assets[0].digest = 'sha256:' + '0'.repeat(64)
    },
    ({ release }) => {
      release.assets[0].id++
    },
    ({ ref }) => {
      ref.object.sha = '0'.repeat(40)
    },
    ({ contents }) => {
      contents.content = Buffer.from('{}').toString('base64')
    }
  ])
    await assert.rejects(verifyPublishedReleaseRemote(context, remoteFixture(mutate)))
})

test('individual downloaded bytes reject same-size corruption and symlinks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'published-release-download-test-'))
  const manifest = Buffer.from('{}\n'),
    bytes = Buffer.from('frozen')
  const asset = (name, body) => ({
    name,
    size: body.length,
    digest: `sha256:${hash(body)}`
  })
  const expected = asset('owned.tgz', bytes)
  try {
    await writeFile(join(dir, 'npm-release-manifest.json'), manifest)
    await writeFile(join(dir, 'owned.tgz'), bytes)
    await verifyDownloadedFile(join(dir, 'owned.tgz'), expected)
    await writeFile(join(dir, 'owned.tgz'), 'broken')
    await assert.rejects(verifyDownloadedFile(join(dir, 'owned.tgz'), expected), /SHA256 changed/)
    await rm(join(dir, 'owned.tgz'))
    await assert.rejects(verifyDownloadedFile(join(dir, 'owned.tgz'), expected), /ENOENT/)
    await symlink(join(dir, 'npm-release-manifest.json'), join(dir, 'owned.tgz'))
    await assert.rejects(verifyDownloadedFile(join(dir, 'owned.tgz'), expected), /regular file/)
    await rm(join(dir, 'owned.tgz'))
    await writeFile(join(dir, 'owned.tgz'), bytes)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('only registered immutable contexts qualify; byte drift during remote reads is rejected', async () => {
  const context = await readPublishedReleaseContext(root)
  await assert.rejects(
    verifyPublishedReleaseRemote({ ...context }, remoteFixture()),
    /Unregistered/
  )
  await assert.rejects(verifyPublishedReleaseDownloads('absent', { ...context }), /Unregistered/)
  assert.throws(() => {
    context.contract.assets[0].id++
  }, TypeError)
  assert.throws(() => {
    context.manifest.packages[0].integrity = 'forged'
  }, TypeError)
  const changedManifest = await readPublishedReleaseContext(root)
  changedManifest.manifestBytes[0] = 0
  await assert.rejects(
    verifyPublishedReleaseRemote(changedManifest, remoteFixture()),
    /bytes drifted/
  )
  const changedContract = await readPublishedReleaseContext(root)
  changedContract.contractBytes[0] = 0
  await assert.rejects(verifyPublishedReleaseDownloads('absent', changedContract), /bytes drifted/)
  const duringRead = await readPublishedReleaseContext(root)
  await assert.rejects(
    verifyPublishedReleaseRemote(duringRead, async (args) => {
      duringRead.manifestBytes[0] = 0
      return remoteFixture()(args)
    }),
    /bytes drifted/
  )
})

test('a qualified context still rejects missing or extra local input names', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'published-release-input-test-'))
  try {
    const context = await readPublishedReleaseContext(root)
    await assert.rejects(verifyPublishedReleaseDownloads(dir, context), /Unexpected or missing/)
    for (const name of [
      ...context.contract.assets.map((row) => row.name),
      ...context.contract.registrySupport.map((row) => row.tarball),
      'extra'
    ])
      await writeFile(join(dir, name), '')
    await assert.rejects(verifyPublishedReleaseDownloads(dir, context), /Unexpected or missing/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('source contract, manifest, public lock and catalog cannot drift after context creation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'published-release-source-drift-test-'))
  const inputs = [
    'artifacts/published-release-qualification.json',
    'artifacts/npm-release-manifest.json',
    'pnpm-lock.yaml',
    'packages/tools/cli/catalog/catalog.json'
  ]
  try {
    for (const path of inputs) {
      await mkdir(dirname(join(dir, path)), { recursive: true })
      await writeFile(join(dir, path), await readFile(join(root, path)))
    }
    for (const path of inputs) {
      const context = await readPublishedReleaseContext(dir)
      const before = await readFile(join(dir, path))
      await writeFile(join(dir, path), Buffer.concat([before, Buffer.from('\n')]))
      await assert.rejects(
        verifyPublishedReleaseDownloads('absent', context),
        /source file drifted/
      )
      await writeFile(join(dir, path), before)
    }
    const context = await readPublishedReleaseContext(dir)
    await assert.rejects(
      verifyPublishedReleaseRemote(context, async (args) => {
        await writeFile(join(dir, 'pnpm-lock.yaml'), 'changed during remote callback')
        return remoteFixture()(args)
      }),
      /source file drifted/
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('the historical candidate still rejects the current manifest before gh or downloads', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'old-candidate-rejection-test-'))
  try {
    await mkdir(join(dir, 'artifacts'))
    await writeFile(join(dir, 'artifacts/npm-release-manifest.json'), manifestBytes)
    await writeFile(
      join(dir, 'artifacts/runtime-ci-candidate.json'),
      await readFile(join(root, 'artifacts/runtime-ci-candidate.json'))
    )
    await assert.rejects(
      downloadFrozenCandidate({
        root: dir,
        directory: join(dir, 'not-created')
      }),
      /strictly equal/
    )
    await assert.rejects(readFile(join(dir, 'not-created/npm-release-manifest.json')), /ENOENT/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('default security still rejects missing disclosure authorization before reading inputs', () => {
  const env = { ...process.env }
  delete env.RUNTIME_AUDIT_DISCLOSURE_APPROVED
  const result = spawnSync(
    process.execPath,
    ['.github/scripts/runtime-ci-security.mjs', 'absent', 'absent'],
    { cwd: root, env, encoding: 'utf8' }
  )
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /no audit was submitted/)
  assert.doesNotMatch(result.stderr, /ENOENT/)
})
