import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pnpmInvocation } from './lib/pinned-pnpm.mjs'
import { verifyCodecArtifact, verifyCodecLockIntegrity } from './lib/verified-codec-artifacts.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../..')
const pnpm = pnpmInvocation()
const packageDir = join(sourceRoot, 'packages/renderers/dicom')
const ledgerPath = join(packageDir, 'THIRD_PARTY_LICENSES.json')
const noticesPath = join(packageDir, 'THIRD_PARTY_NOTICES.md')
const capabilityPath = join(packageDir, 'file-viewer.capability.json')
const write = process.argv.includes('--write')
const allowedLicenses = new Set([
  '(MIT AND Zlib)',
  '(WTFPL OR MIT)',
  'Apache-2.0',
  'BSD-3-Clause',
  'CC-BY-4.0',
  'ISC',
  'MIT',
  'Python-2.0'
])
const licenseSelections = new Map([
  [
    'dompurify',
    {
      declaredLicense: '(MPL-2.0 OR Apache-2.0)',
      selectedLicense: 'Apache-2.0',
      licenseFile: 'LICENSE',
      note: "File Viewer elects DOMPurify's Apache-2.0 option; the installed LICENSE file is the complete Apache-2.0 text."
    }
  ]
])
// pnpm lists the Linux-only optional package on macOS without installing it.
// Its official registry metadata and lockfile integrity are version-pinned;
// an installed package must still supply its own license declaration.
const knownPlatformOptionalPackages = new Map([
  [
    '@rollup/rollup-linux-x64-gnu@4.13.0',
    {
      package: '@rollup/rollup-linux-x64-gnu@4.13.0',
      integrity:
        'sha512-yUD/8wMffnTKuiIsl6xU+4IA8UNhQ/f1sAnQebmE/lyQ8abjsVyDkyRkWop0kdMhKMprpNIhPmYlCxgHrPoXoA==',
      author: 'Lukas Taegert-Atkinson',
      license: 'MIT',
      repository: 'https://github.com/rollup/rollup'
    }
  ]
])
const repositoryOverrides = new Map([
  ['@cornerstonejs/calculate-suv', 'https://github.com/cornerstonejs/calculate-suv'],
  ['@cornerstonejs/codec-libjpeg-turbo-8bit', 'https://github.com/cornerstonejs/codecs'],
  ['@cornerstonejs/codec-openjpeg', 'https://github.com/cornerstonejs/codecs']
])
const nativeProvenance = JSON.parse(
  readFileSync(join(packageDir, 'third-party/native-codecs/PROVENANCE.json'), 'utf8')
)
const nativeCodecComponents = nativeProvenance.components
const nativeWrapperArtifacts = new Map(
  nativeProvenance.wrapperArtifacts.map((artifact) => [artifact.name, artifact])
)
assert(nativeProvenance.schemaVersion === 1, 'Unsupported native codec provenance schema')
assert(nativeWrapperArtifacts.size === 4, 'Expected all four reviewed native codec wrappers')
const lockfile = readFileSync(join(sourceRoot, 'pnpm-lock.yaml'), 'utf8')
for (const artifact of nativeWrapperArtifacts.values()) verifyCodecLockIntegrity(lockfile, artifact)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function normalizeLicense(packageJson) {
  if (typeof packageJson.license === 'string') return packageJson.license.trim()
  if (packageJson.license?.type) return String(packageJson.license.type).trim()
  if (Array.isArray(packageJson.licenses)) {
    return packageJson.licenses
      .map((entry) => (typeof entry === 'string' ? entry : entry?.type))
      .filter(Boolean)
      .join(' OR ')
  }
  return ''
}

function normalizeRepository(repository) {
  const value = typeof repository === 'string' ? repository : repository?.url
  if (!value) return ''
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) return `https://github.com/${value}`
  const normalized = String(value)
    .replace(/^git\+/, '')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/^ssh:\/\/(?:git@)?github\.com\//, 'https://github.com/')
    .replace(/^git:\/\/github\.com\//, 'https://github.com/')
    .replace(/\.git$/, '')
  return normalized === 'https://localhost' ? '' : normalized
}

function normalizeAuthor(author) {
  if (typeof author === 'string') return author
  if (!author || typeof author !== 'object') return ''
  return [author.name, author.email ? `<${author.email}>` : '', author.url]
    .filter(Boolean)
    .join(' ')
}

function licenseFilesFor(packagePath) {
  if (!packagePath || !existsSync(packagePath)) return { licenseFiles: [], noticeFiles: [] }
  const files = readdirSync(packagePath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
  return {
    licenseFiles: files.filter((file) => /^(licen[cs]e|copying)(?:[._-].*)?$/i.test(file)).sort(),
    noticeFiles: files.filter((file) => /^notice(?:[._-].*)?$/i.test(file)).sort()
  }
}

function loadPackageJson(packagePath) {
  if (!packagePath || !existsSync(join(packagePath, 'package.json'))) return null
  return JSON.parse(readFileSync(join(packagePath, 'package.json'), 'utf8'))
}

const listResult = spawnSync(
  pnpm.command,
  [
    ...pnpm.args,
    '--filter',
    '@file-viewer/renderer-dicom',
    'list',
    '--prod',
    '--depth',
    'Infinity',
    '--json'
  ],
  { cwd: sourceRoot, encoding: 'utf8', env: process.env }
)
assert(
  listResult.status === 0,
  `Unable to inspect DICOM production closure:\n${listResult.stderr || listResult.stdout}`
)
const roots = JSON.parse(listResult.stdout)
assert(Array.isArray(roots) && roots.length === 1, 'Expected one DICOM package dependency tree')

const packages = new Map()
function visit(node, nameHint, state) {
  const packageJson = loadPackageJson(node?.path)
  const name = packageJson?.name || nameHint || node?.name
  const version = packageJson?.version || String(node?.version || '').replace(/^link:/, '')
  assert(name && version, `Dependency tree entry is missing name/version: ${JSON.stringify(node)}`)
  const key = `${name}@${version}`
  const installedLicense = packageJson ? normalizeLicense(packageJson) : ''
  const fallback = !packageJson && state.optional ? knownPlatformOptionalPackages.get(key) : null
  if (fallback) verifyCodecLockIntegrity(lockfile, fallback)
  const declaredLicense = fallback?.license || installedLicense
  const selection = licenseSelections.get(name)
  if (selection) {
    assert(
      declaredLicense === selection.declaredLicense,
      `${key} license selection drifted from ${selection.declaredLicense}`
    )
    assert(
      packageFilesForSelection(node?.path, selection.licenseFile),
      `${key} is missing selected ${selection.selectedLicense} text in ${selection.licenseFile}`
    )
  }
  const license = selection?.selectedLicense || declaredLicense
  assert(license, `${key} has no declared SPDX license`)
  assert(
    allowedLicenses.has(license),
    `${key} uses unapproved license expression ${declaredLicense}`
  )
  if (nativeWrapperArtifacts.has(name)) {
    verifyCodecArtifact(node.path, nativeWrapperArtifacts.get(name))
  }
  const previous = packages.get(key)
  const packageFiles = licenseFilesFor(node?.path)
  const record = {
    name,
    version,
    license,
    ...(selection ? { declaredLicense } : {}),
    direct: Boolean(state.direct || previous?.direct),
    optional: previous ? Boolean(previous.optional && state.optional) : Boolean(state.optional),
    firstParty: name.startsWith('@file-viewer/'),
    author: fallback?.author || normalizeAuthor(packageJson?.author) || '',
    repository:
      fallback?.repository ||
      repositoryOverrides.get(name) ||
      normalizeRepository(packageJson?.repository) ||
      '',
    licenseFiles: previous?.licenseFiles?.length
      ? previous.licenseFiles
      : packageFiles.licenseFiles,
    noticeFiles: previous?.noticeFiles?.length ? previous.noticeFiles : packageFiles.noticeFiles
  }
  packages.set(key, record)

  const required = node?.dependencies || {}
  const optionalNames = new Set(Object.keys(packageJson?.optionalDependencies || {}))
  for (const [dependencyName, child] of Object.entries(required)) {
    visit(child, dependencyName, {
      direct: state.root,
      root: false,
      optional: state.optional || optionalNames.has(dependencyName)
    })
  }
  for (const [dependencyName, child] of Object.entries(node?.optionalDependencies || {})) {
    visit(child, dependencyName, { direct: state.root, root: false, optional: true })
  }
}

function packageFilesForSelection(packagePath, filename) {
  return Boolean(packagePath && existsSync(join(packagePath, filename)))
}
visit(roots[0], roots[0].name, { direct: false, root: true, optional: false })

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

const sortedPackages = [...packages.values()].sort(
  (left, right) => compareAscii(left.name, right.name) || compareAscii(left.version, right.version)
)
assert(
  sortedPackages.some((entry) => entry.name === '@rollup/rollup-linux-x64-gnu' && entry.optional),
  'Linux codec optional dependency is missing'
)
assert(
  sortedPackages.some((entry) => entry.license === 'CC-BY-4.0'),
  'CC-BY-4.0 data attribution is missing'
)
assert(
  !sortedPackages.some((entry) => /(?:^|[^A-Z])(AGPL|GPL|LGPL|SSPL)(?:-|\b)/i.test(entry.license)),
  'Strong-copyleft dependency detected'
)
for (const component of nativeCodecComponents) {
  assert(
    sortedPackages.some((entry) => `${entry.name}@${entry.version}` === component.wrapperPackage),
    `${component.wrapperPackage} wrapper is missing from production closure`
  )
  assert(
    !/(?:^|[^A-Z])(AGPL|GPL|LGPL|SSPL)(?:-|\b)/i.test(component.license),
    `${component.name} native codec uses strong copyleft ${component.license}`
  )
  for (const file of component.files) {
    const absolutePath = join(packageDir, file.path)
    assert(existsSync(absolutePath), `Missing packaged native codec notice ${file.path}`)
    assert(sha256(absolutePath) === file.sha256, `Native codec notice hash drifted: ${file.path}`)
  }
}
const libjpegLicense = readFileSync(
  join(packageDir, 'third-party/native-codecs/libjpeg-turbo/LICENSE.md'),
  'utf8'
)
const libjpegReadme = readFileSync(
  join(packageDir, 'third-party/native-codecs/libjpeg-turbo/README.ijg'),
  'utf8'
)
assert(
  libjpegLicense.includes('This software is based in part on the work of the Independent JPEG'),
  'libjpeg-turbo binary attribution guidance is missing'
)
assert(
  libjpegReadme.includes('LEGAL ISSUES') && libjpegReadme.includes('Independent JPEG Group'),
  'libjpeg-turbo IJG license text is incomplete'
)
const packageManifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
assert(
  packageManifest.files?.includes('third-party/native-codecs'),
  'Native codec notices are excluded from npm pack files'
)

const ledger = {
  schemaVersion: 1,
  generatedFrom: {
    packageName: '@file-viewer/renderer-dicom',
    packageVersion: roots[0].version,
    packageManager: 'pnpm',
    command: 'pnpm --filter @file-viewer/renderer-dicom list --prod --depth Infinity --json'
  },
  policy: {
    allowedSpdxExpressions: [...allowedLicenses].sort(),
    licenseSelections: Object.fromEntries(licenseSelections),
    closureIncludesPlatformOptionalDependencies: true
  },
  nativeCodecBuild: {
    wrapperArtifacts: nativeProvenance.wrapperArtifacts,
    note: nativeProvenance.note,
    components: nativeCodecComponents
  },
  packages: sortedPackages
}
const ledgerText = `${JSON.stringify(ledger, null, 2)}\n`

const thirdPartyPackages = sortedPackages.filter((entry) => !entry.firstParty)
const grouped = Map.groupBy(thirdPartyPackages, (entry) => entry.license)
const packageVersionList = (name) => {
  const entries = sortedPackages.filter((entry) => entry.name === name)
  assert(entries.length > 0, `Expected ${name} in the DICOM production closure`)
  return entries.map((entry) => `\`${entry.name}@${entry.version}\``).join(', ')
}
const capability = JSON.parse(readFileSync(capabilityPath, 'utf8'))
capability.license.notices = [
  ...['@cornerstonejs/core', '@cornerstonejs/dicom-image-loader', '@cornerstonejs/metadata'].map(
    (name) => ({
      packageName: name,
      spdx: 'MIT',
      notice: `${packageVersionList(name)}; complete JavaScript and native codec provenance and license closure are recorded in THIRD_PARTY_LICENSES.json.`
    })
  ),
  ...nativeCodecComponents.map((component) => ({
    packageName: `${component.name} native codec`,
    spdx: component.license,
    notice: `Release source gitlink ${component.sourceSha}; linked target ${component.linkedTarget}; unmodified license files are packaged under third-party/native-codecs. See PROVENANCE.json for official artifact hashes and release-source provenance.${component.name === 'libjpeg-turbo' ? ' This software is based in part on the work of the Independent JPEG Group.' : ''}`
  })),
  {
    packageName: 'dicom-parser',
    spdx: 'MIT',
    notice: `${packageVersionList('dicom-parser')}; used for bounded Part 10 inspection before runtime initialization.`
  },
  {
    packageName: '@kitware/vtk.js',
    spdx: 'BSD-3-Clause',
    notice: `${packageVersionList('@kitware/vtk.js')}; transitive Cornerstone runtime dependency.`
  },
  {
    packageName: 'caniuse-lite',
    spdx: 'CC-BY-4.0',
    notice: `${packageVersionList('caniuse-lite')} data by Ben Briggs and contributors; source https://github.com/browserslist/caniuse-lite; unmodified by this renderer.`
  },
  {
    packageName: 'pako',
    spdx: '(MIT AND Zlib)',
    notice: `${packageVersionList('pako')} contain zlib-derived code by Jean-loup Gailly and Mark Adler.`
  },
  {
    packageName: 'argparse',
    spdx: 'Python-2.0',
    notice: `${packageVersionList('argparse')} retains the Python Software Foundation license in its installed LICENSE file.`
  },
  {
    packageName: 'spark-md5',
    spdx: '(WTFPL OR MIT)',
    notice: `${packageVersionList('spark-md5')} retains its upstream license file.`
  }
]
const capabilityText = `${JSON.stringify(capability, null, 2)}\n`
const noticeLines = [
  '# Third-party notices',
  '',
  'This file records the complete production dependency closure of the optional `@file-viewer/renderer-dicom` package, including any platform-optional dependencies. Exact machine-readable versions, SPDX expressions, source repositories, and packaged license/notice filenames are in `THIRD_PARTY_LICENSES.json`.',
  '',
  'The DICOM renderer is not part of any standard/full package or preset. These dependencies are installed only when this capability is selected, and its Cornerstone implementation is loaded only when a DICOM file is opened.',
  '',
  '## Required attribution',
  '',
  `- ${packageVersionList('caniuse-lite')} data is by Ben Briggs and contributors, from <https://github.com/browserslist/caniuse-lite>, licensed under CC-BY-4.0. The renderer does not modify that upstream data. The complete CC-BY-4.0 text is retained as \`caniuse-lite/LICENSE\` in the installed dependency.`,
  `${packageVersionList('pako')} contain zlib-derived code by Jean-loup Gailly and Mark Adler under \`(MIT AND Zlib)\`; their installed source retains the zlib notices and license terms.`,
  '- `spark-md5@3.0.2` is available under `(WTFPL OR MIT)` as declared by the package. Its installed package retains the upstream license file.',
  '- `argparse@2.0.1` is licensed under Python-2.0 and retains the complete Python Software Foundation license in its installed `LICENSE` file.',
  `${packageVersionList('dompurify')} is dual-licensed as \`(MPL-2.0 OR Apache-2.0)\`. File Viewer elects Apache-2.0, and the installed \`LICENSE\` file retains the complete Apache-2.0 text.`,
  '',
  '### Native libraries statically linked into codec WebAssembly',
  '',
  'The four wrappers share the reviewed npm gitHead and release-source tree. Exact official tarball integrities, all installed-file hashes and native source gitlinks are retained in `third-party/native-codecs/PROVENANCE.json` and checked against the installed artifacts. These releases have verified registry signatures but no npm build attestations; this is release-source provenance rather than a signed build or independent rebuild claim. The wrapper package license is not used as a substitute for the linked native library terms:',
  '',
  ...nativeCodecComponents.flatMap((component) => [
    `- \`${component.name}\` (\`${component.wrapperPackage}\`): \`${component.license}\`; release source gitlink \`${component.sourceSha}\` at ${component.repository}; linked target \`${component.linkedTarget}\`; retained files ${component.files.map((file) => `\`${file.path}\``).join(', ')}.${component.sourceNote ? ` ${component.sourceNote}` : ''}`
  ]),
  '',
  '**libjpeg-turbo attribution:** This software is based in part on the work of the Independent JPEG Group.',
  '',
  'The complete libjpeg-turbo `LICENSE.md` and unmodified `README.ijg` are shipped with the package, together with the CharLS, OpenJPEG, OpenJPH, JPEG XL, Brotli, Highway and skcms license texts. JPEG XL authors and patent grant are retained as well. Highway elects Apache-2.0 and retains its alternative BSD text. These native components use permissive terms; none is LGPL or strong copyleft.',
  '',
  'None of the Apache-2.0 dependencies in this closure publishes a top-level `NOTICE` file. All top-level license and notice files found in each installed package are recorded in the ledger.',
  '',
  '## Exact third-party closure by SPDX expression',
  ''
]
for (const license of [...grouped.keys()].sort()) {
  noticeLines.push(`### ${license}`, '')
  for (const entry of grouped.get(license)) {
    const optional = entry.optional ? ' (platform-optional)' : ''
    const source = entry.repository ? ` — ${entry.repository}` : ''
    noticeLines.push(`- \`${entry.name}@${entry.version}\`${optional}${source}`)
  }
  noticeLines.push('')
}
const noticesText = `${noticeLines.join('\n').trimEnd()}\n`

if (write) {
  writeFileSync(ledgerPath, ledgerText)
  writeFileSync(noticesPath, noticesText)
  writeFileSync(capabilityPath, capabilityText)
} else {
  assert(existsSync(ledgerPath), `Missing ${relative(sourceRoot, ledgerPath)}; run with --write`)
  assert(existsSync(noticesPath), `Missing ${relative(sourceRoot, noticesPath)}; run with --write`)
  assert(
    readFileSync(ledgerPath, 'utf8') === ledgerText,
    'DICOM production license ledger is stale; run verifier with --write'
  )
  assert(
    readFileSync(noticesPath, 'utf8') === noticesText,
    'DICOM third-party notices are stale; run verifier with --write'
  )
  assert(
    readFileSync(capabilityPath, 'utf8') === capabilityText,
    'DICOM capability license metadata is stale; run verifier with --write'
  )
}

const counts = Object.fromEntries(
  [...grouped].map(([license, entries]) => [license, entries.length])
)
console.log(
  `[dicom-license-ledger] Verified ${sortedPackages.length} production packages (${thirdPartyPackages.length} third-party, ${sortedPackages.filter((entry) => entry.optional).length} platform-optional): ${JSON.stringify(counts)}`
)
