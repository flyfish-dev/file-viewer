import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rustDir = resolve(packageDir, 'rust')
const outputPath = resolve(packageDir, 'THIRD_PARTY_LICENSES.json')
const checkOnly = process.argv.includes('--check')
const forbiddenLicense = /(?:^|[^A-Z])(?:AGPL|LGPL|GPL)(?:-|$)/iu
const permissiveLicense = /(?:Apache-2\.0|BSD|MIT|ISC|Zlib|0BSD|Unlicense)/iu
const licenseFilename = /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/iu
const licenseTexts = new Map()

const selectLicense = (declaredLicense) => {
  if (!forbiddenLicense.test(declaredLicense)) return declaredLicense
  const permissiveChoice = declaredLicense
    .replace(/[()]/gu, '')
    .split(/\s+OR\s+/iu)
    .map((value) => value.trim())
    .find((value) => permissiveLicense.test(value) && !forbiddenLicense.test(value))
  assert(permissiveChoice, `No permissive branch is available in ${declaredLicense}`)
  return permissiveChoice
}

const collectLicenseFiles = async (directory) => {
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && licenseFilename.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
  const hashes = []
  for (const name of names) {
    const text = await readFile(resolve(directory, name), 'utf8')
    const sha256 = createHash('sha256').update(text).digest('hex')
    if (!licenseTexts.has(sha256)) licenseTexts.set(sha256, text)
    hashes.push({ path: name, sha256 })
  }
  return hashes
}

const cargoMetadata = JSON.parse(
  execFileSync('cargo', ['metadata', '--locked', '--format-version', '1'], {
    cwd: rustDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
)
const cargoRoot = cargoMetadata.packages.find(
  (candidate) => candidate.name === 'file-viewer-rpgp-wrapper'
)
assert(cargoRoot, 'Unable to locate the signature renderer Rust package in cargo metadata.')
const cargoNodes = new Map(cargoMetadata.resolve.nodes.map((node) => [node.id, node]))
const cargoPackages = new Map(cargoMetadata.packages.map((candidate) => [candidate.id, candidate]))
const reachableCargoIds = new Set()
const cargoQueue = [cargoRoot.id]
while (cargoQueue.length) {
  const id = cargoQueue.pop()
  if (!id || reachableCargoIds.has(id)) continue
  reachableCargoIds.add(id)
  for (const dependency of cargoNodes.get(id)?.dependencies || []) cargoQueue.push(dependency)
}

const entries = []
for (const id of [...reachableCargoIds].sort()) {
  if (id === cargoRoot.id) continue
  const dependency = cargoPackages.get(id)
  assert(dependency?.license, `Rust dependency ${dependency?.name || id} has no declared license.`)
  const selectedLicense = selectLicense(dependency.license)
  entries.push({
    ecosystem: 'cargo',
    name: dependency.name,
    version: dependency.version,
    declaredLicense: dependency.license,
    selectedLicense,
    repository: dependency.repository || null,
    source: dependency.source || null,
    licenseFiles: await collectLicenseFiles(dirname(dependency.manifest_path))
  })
}

const packageRequire = createRequire(resolve(packageDir, 'package.json'))
const npmQueue = [packageRequire.resolve('jszip/package.json')]
const seenNpmPaths = new Set()
while (npmQueue.length) {
  const packageJsonPath = npmQueue.pop()
  if (!packageJsonPath || seenNpmPaths.has(packageJsonPath)) continue
  seenNpmPaths.add(packageJsonPath)
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  assert(
    manifest.name && manifest.version && manifest.license,
    `Incomplete npm license metadata in ${packageJsonPath}`
  )
  const selectedLicense = selectLicense(manifest.license)
  const dependencyRequire = createRequire(packageJsonPath)
  for (const dependencyName of Object.keys(manifest.dependencies || {}).sort()) {
    npmQueue.push(dependencyRequire.resolve(`${dependencyName}/package.json`))
  }
  entries.push({
    ecosystem: 'npm',
    name: manifest.name,
    version: manifest.version,
    declaredLicense: manifest.license,
    selectedLicense,
    repository:
      typeof manifest.repository === 'string'
        ? manifest.repository
        : manifest.repository?.url || null,
    source: `https://registry.npmjs.org/${manifest.name}/-/${manifest.name.split('/').pop()}-${manifest.version}.tgz`,
    licenseFiles: await collectLicenseFiles(dirname(packageJsonPath))
  })
}

entries.sort(
  (left, right) =>
    left.ecosystem.localeCompare(right.ecosystem) ||
    left.name.localeCompare(right.name) ||
    left.version.localeCompare(right.version)
)
const ledger = {
  schemaVersion: 1,
  runtimeBoundary: 'Optional @file-viewer/renderer-signature JSZip and rPGP WebAssembly closure',
  policy: 'Permissive licenses only; LGPL, AGPL and GPL runtime source are prohibited.',
  entries,
  licenseTexts: [...licenseTexts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sha256, text]) => ({ sha256, text }))
}
const serialized = `${JSON.stringify(ledger, null, 2)}\n`

if (checkOnly) {
  const current = await readFile(outputPath, 'utf8')
  assert.equal(
    current,
    serialized,
    'THIRD_PARTY_LICENSES.json is stale; run pnpm generate:licenses.'
  )
  console.log(
    `Verified ${entries.length} permissively licensed signature-renderer runtime dependencies.`
  )
} else {
  await writeFile(outputPath, serialized)
  console.log(
    `Wrote ${outputPath} with ${entries.length} runtime dependencies and ${licenseTexts.size} unique license texts.`
  )
}
