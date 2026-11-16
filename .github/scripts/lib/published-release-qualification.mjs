import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sha = (value) => assert.match(value || '', /^[a-f0-9]{64}$/)
const commit = (value) => assert.match(value || '', /^[a-f0-9]{40}$/)
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort())
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])])
        )
      : value
const inventoryDigest = (value) => digest(Buffer.from(JSON.stringify(canonical(value)) + '\n'))
const contexts = new WeakMap()
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !ArrayBuffer.isView(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}
function assertContext(context) {
  const snapshot = contexts.get(context)
  assert(snapshot, 'Unregistered published release context')
  assert.equal(
    digest(context.contractBytes),
    snapshot.contractBytes,
    'Published contract bytes drifted'
  )
  assert.equal(
    digest(context.manifestBytes),
    snapshot.manifestBytes,
    'Published manifest bytes drifted'
  )
  assert.equal(JSON.stringify(context.contract), snapshot.contract, 'Published contract drifted')
  assert.equal(
    JSON.stringify(context.manifest),
    snapshot.manifest,
    'Published verification context drifted'
  )
}
async function assertContextFiles(context) {
  assertContext(context)
  for (const [path, expected] of contexts.get(context).files) {
    const info = await lstat(path)
    assert(info.isFile() && !info.isSymbolicLink(), 'Published source input must be a regular file')
    assert.equal(digest(await readFile(path)), expected, 'Published source file drifted')
  }
  assertContext(context)
}
export const publishedAssetFields = ['id', 'name', 'size', 'digest', 'content_type', 'state']
export const productionCaseIds = [
  'web',
  'vue3',
  'vue2.7',
  'vue2.6',
  'react',
  'react-legacy',
  'svelte',
  'jquery'
].flatMap((framework) => ['standard', 'full'].map((profile) => `${framework}-${profile}`))

/** This separate profile does not reinterpret or replace the historical candidate contract. */
export function validatePublishedReleaseContract(
  contract,
  manifestBytes,
  { requireAudit = false } = {}
) {
  keys(contract, [
    'schemaVersion',
    'mode',
    'repository',
    'releaseId',
    'version',
    'tag',
    'tagCommit',
    'sourceCommit',
    'manifestSha256',
    'assetCount',
    'assetBytes',
    'assets',
    'registrySupport',
    'ownedPackageVerification',
    'auditApproval',
    'productionAuditPayloadSha256'
  ])
  assert.equal(contract.schemaVersion, 1)
  assert.equal(contract.mode, 'published-release')
  assert.equal(contract.repository, 'flyfish-dev/file-viewer')
  assert.equal(contract.version, '3.3.4', 'Only the reviewed stable release is qualified')
  assert.equal(contract.tag, `v${contract.version}`)
  assert.equal(contract.releaseId, 446503317)
  assert.equal(contract.tagCommit, '41eb96d21b13d27233235a9360fa6612862c2c42')
  assert.equal(contract.sourceCommit, '488d8cd525210182362781f113df5ea3d03439c0')
  commit(contract.tagCommit)
  commit(contract.sourceCommit)
  sha(contract.manifestSha256)
  assert.equal(
    contract.manifestSha256,
    '092ba2cd4b7c107a60a97e509a2c36d8ff84fd13c56a29c22f9feee40d412514'
  )
  assert.equal(contract.manifestSha256, digest(manifestBytes), 'Published manifest bytes changed')
  const manifest = JSON.parse(manifestBytes)
  assert.equal(manifest.mode, 'runtime-only')
  assert.equal(manifest.version, contract.version)
  assert.equal(manifest.sourceCommit, contract.sourceCommit)
  assert.equal(manifest.packageCount, 89)
  assert.equal(manifest.packages.length, manifest.packageCount)
  assert.equal(contract.assetCount, 100)
  assert.equal(contract.assets.length, contract.assetCount)
  assert.equal(
    inventoryDigest(contract.assets),
    '0689b78edf78cb267bbb19b955964d9a87215d74df88fddf90ac563080b5b094',
    'The reviewed 100 asset inventory changed'
  )
  assert.equal(contract.assetBytes, 714752619)
  assert.equal(
    contract.assets.reduce((sum, asset) => sum + asset.size, 0),
    contract.assetBytes
  )
  const names = new Set(),
    ids = new Set()
  for (const asset of contract.assets) {
    keys(asset, publishedAssetFields)
    assert.equal(basename(asset.name), asset.name)
    assert.match(asset.name, /^[A-Za-z0-9._-]+$/)
    assert(Number.isSafeInteger(asset.id) && asset.id > 0)
    assert(Number.isSafeInteger(asset.size) && asset.size > 0)
    assert.match(asset.digest, /^sha256:[a-f0-9]{64}$/)
    assert.equal(asset.state, 'uploaded')
    assert.equal(typeof asset.content_type, 'string')
    assert(!names.has(asset.name) && !ids.has(asset.id), 'Duplicate published asset')
    names.add(asset.name)
    ids.add(asset.id)
  }
  const manifestAsset = contract.assets.find((asset) => asset.name === 'npm-release-manifest.json')
  assert.equal(manifestAsset?.digest, `sha256:${contract.manifestSha256}`)
  assert.equal(manifestAsset.size, manifestBytes.length)
  const packagePins = new Map()
  assert.equal(
    inventoryDigest(contract.ownedPackageVerification),
    'e9f03d9c352025f887cb2596de860d2d4cfe768da6fe61413346bc8f54fba851',
    'The reviewed owned archive verification changed'
  )
  for (const pin of contract.ownedPackageVerification) {
    keys(pin, ['packageName', 'integrity', 'license'])
    assert(!packagePins.has(pin.packageName), 'Duplicate owned package verification')
    assert.match(pin.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/)
    assert.equal(typeof pin.license, 'string')
    assert(pin.license.length > 0)
    packagePins.set(pin.packageName, pin)
  }
  assert.equal(packagePins.size, manifest.packageCount)
  const packageNames = new Set(),
    tarballs = new Set()
  const packages = manifest.packages.map((item) => {
    assert(!packageNames.has(item.packageName) && !tarballs.has(item.tarball))
    packageNames.add(item.packageName)
    tarballs.add(item.tarball)
    assert.match(item.version, /^\d+\.\d+\.\d+$/)
    assert.equal(item.version, item.releaseVersion)
    const asset = contract.assets.find((asset) => asset.name === item.tarball)
    assert.equal(asset?.size, item.tarballSize)
    assert.equal(asset?.digest, `sha256:${item.sha256}`)
    const pin = packagePins.get(item.packageName)
    assert(pin, 'Missing published package verification')
    // The source manifest omits these runtime-only verifier fields. Add reviewed
    // public archive facts; never weaken the original TAR verifier's assertions.
    return { ...item, integrity: pin.integrity, license: pin.license }
  })
  assert.equal(
    inventoryDigest(contract.registrySupport),
    '43d55528a05293227db863521db80074eca6b3a72e563c0a40d7c908f0a45d6d',
    'The reviewed frozen support inputs changed'
  )
  assert.deepEqual(
    contract.registrySupport.map((item) => [item.packageName, item.version]).sort(),
    [
      ['@file-viewer/docx', '0.3.39'],
      ['@file-viewer/ppt', '1.0.2'],
      ['styled-exceljs', '0.21.6']
    ].sort()
  )
  const supportNames = new Set(),
    supportArchives = new Set()
  for (const pin of contract.registrySupport) {
    keys(pin, ['packageName', 'version', 'tarball', 'tarballSize', 'sha256', 'integrity'])
    assert(!packageNames.has(pin.packageName) && !supportNames.has(pin.packageName))
    assert(!names.has(pin.tarball) && !supportArchives.has(pin.tarball))
    assert.equal(basename(pin.tarball), pin.tarball)
    assert.match(pin.tarball, /^[A-Za-z0-9._-]+\.tgz$/)
    assert(
      Number.isSafeInteger(pin.tarballSize) &&
        pin.tarballSize > 0 &&
        pin.tarballSize < 64 * 1024 * 1024
    )
    sha(pin.sha256)
    assert.match(pin.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/)
    supportNames.add(pin.packageName)
    supportArchives.add(pin.tarball)
  }
  keys(contract.auditApproval, [
    'status',
    'scope',
    'sourceLockSha256',
    'publicCatalogSha256',
    'catalogSha256'
  ])
  assert.equal(contract.auditApproval.scope, 'exact-public-production-bodies')
  sha(contract.auditApproval.sourceLockSha256)
  sha(contract.auditApproval.publicCatalogSha256)
  sha(contract.auditApproval.catalogSha256)
  assert.equal(
    contract.auditApproval.sourceLockSha256,
    '1a3045bef69ecbc94b59afefc4b9d282951d87a44081efdacdb36e431576df53'
  )
  assert.equal(
    contract.auditApproval.publicCatalogSha256,
    '057ace523addab488ce6d8cac48d00e109edd68e9dd569ce79d00e27e3f875d4'
  )
  assert.equal(
    contract.auditApproval.catalogSha256,
    'c93369ce7d4a20aef3fb6eb0036a7cc262ddcc092e878a7048abad48fa405c19'
  )
  assert(
    ['pending', 'approved-exact-public-production-bodies'].includes(contract.auditApproval.status)
  )
  if (contract.auditApproval.status === 'pending')
    assert.deepEqual(contract.productionAuditPayloadSha256, {})
  else {
    keys(contract.productionAuditPayloadSha256, productionCaseIds)
    for (const value of Object.values(contract.productionAuditPayloadSha256)) sha(value)
    assert.equal(
      inventoryDigest(contract.productionAuditPayloadSha256),
      '3c741c29fc06be0c6a240e1f98b3509d7aeee4621f2c1d5a3aa64265068ae04d',
      'The exact approved sixteen production bodies changed; no audit was submitted'
    )
  }
  if (requireAudit)
    assert.equal(
      contract.auditApproval.status,
      'approved-exact-public-production-bodies',
      'Exact 3.3.4 production bodies are not approved; no audit was submitted'
    )
  return { ...manifest, packages }
}

export async function readPublishedReleaseContext(root, options = {}) {
  const [contractBytes, manifestBytes] = await Promise.all([
    readFile(join(root, 'artifacts/published-release-qualification.json')),
    readFile(join(root, 'artifacts/npm-release-manifest.json'))
  ])
  const contract = JSON.parse(contractBytes)
  const manifest = validatePublishedReleaseContract(contract, manifestBytes, options)
  const [publicLock, publicCatalog] = await Promise.all([
    readFile(join(root, 'pnpm-lock.yaml')),
    readFile(join(root, 'packages/tools/cli/catalog/catalog.json'))
  ])
  assert.equal(
    digest(publicLock),
    contract.auditApproval.sourceLockSha256,
    'Reviewed public lock changed'
  )
  assert.equal(
    digest(publicCatalog),
    contract.auditApproval.publicCatalogSha256,
    'Reviewed public catalog changed'
  )
  const context = deepFreeze({
    contract,
    contractBytes,
    manifestBytes,
    manifest
  })
  contexts.set(context, {
    contractBytes: digest(contractBytes),
    manifestBytes: digest(manifestBytes),
    contract: JSON.stringify(contract),
    manifest: JSON.stringify(manifest),
    files: [
      [join(root, 'artifacts/published-release-qualification.json'), digest(contractBytes)],
      [join(root, 'artifacts/npm-release-manifest.json'), digest(manifestBytes)],
      [join(root, 'pnpm-lock.yaml'), digest(publicLock)],
      [join(root, 'packages/tools/cli/catalog/catalog.json'), digest(publicCatalog)]
    ]
  })
  await assertContextFiles(context)
  return context
}

export async function verifyPublishedReleaseRemote(context, gh) {
  await assertContextFiles(context)
  const { contract, manifestBytes } = context
  const api = async (path) => {
    await assertContextFiles(context)
    const result = await gh(['api', `repos/${contract.repository}/${path}`])
    await assertContextFiles(context)
    return JSON.parse(result)
  }
  const release = await api(`releases/tags/${contract.tag}`)
  assert.equal(release.id, contract.releaseId)
  assert.equal(release.tag_name, contract.tag)
  assert.equal(release.draft, false)
  assert.equal(release.prerelease, false)
  const assets = release.assets.map((asset) =>
    Object.fromEntries(publishedAssetFields.map((key) => [key, asset[key]]))
  )
  const sorted = (items) => [...items].sort((a, b) => a.name.localeCompare(b.name))
  assert.equal(
    inventoryDigest(sorted(assets)),
    inventoryDigest(sorted(contract.assets)),
    'Published asset inventory changed'
  )
  let object = (await api(`git/ref/tags/${contract.tag}`)).object
  if (object.type === 'tag') object = (await api(`git/tags/${object.sha}`)).object
  assert.equal(object.type, 'commit')
  assert.equal(object.sha, contract.tagCommit, 'Published tag commit changed')
  const contents = await api(
    `contents/artifacts/npm-release-manifest.json?ref=${contract.tagCommit}`
  )
  assert.equal(contents.encoding, 'base64')
  const tagManifest = Buffer.from(contents.content, 'base64')
  assert.equal(digest(tagManifest), contract.manifestSha256, 'Tag manifest changed')
  assert.deepEqual(tagManifest, manifestBytes, 'Tag manifest changed')
  await assertContextFiles(context)
}

export async function verifyPublishedReleaseDownloads(
  directory,
  context,
  { supportPresent = true } = {}
) {
  await assertContextFiles(context)
  const { contract, manifestBytes } = context
  const allowed = [
    ...contract.assets.map((asset) => asset.name),
    ...(supportPresent ? contract.registrySupport.map((item) => item.tarball) : [])
  ].sort()
  assert.deepEqual(
    (await readdir(directory)).sort(),
    allowed,
    'Unexpected or missing release input'
  )
  for (const item of [
    ...contract.assets,
    ...(supportPresent
      ? contract.registrySupport.map((pin) => ({
          name: pin.tarball,
          size: pin.tarballSize,
          digest: `sha256:${pin.sha256}`
        }))
      : [])
  ]) {
    assertContext(context)
    await verifyDownloadedFile(join(directory, item.name), item)
  }
  assert.deepEqual(await readFile(join(directory, 'npm-release-manifest.json')), manifestBytes)
  await assertContextFiles(context)
}

/** One byte-level primitive; it does not create or qualify a release context. */
export async function verifyDownloadedFile(path, item) {
  const info = await lstat(path)
  assert(info.isFile() && !info.isSymbolicLink(), 'Published input must be a regular file')
  assert.equal(info.size, item.size, `Published input size changed: ${item.name}`)
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  assert.equal(
    `sha256:${hash.digest('hex')}`,
    item.digest,
    `Published input SHA256 changed: ${item.name}`
  )
}
