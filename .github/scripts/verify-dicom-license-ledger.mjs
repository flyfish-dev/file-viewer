import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../..')
const packageDir = join(sourceRoot, 'packages/renderers/dicom')
const ledgerPath = join(packageDir, 'THIRD_PARTY_LICENSES.json')
const noticesPath = join(packageDir, 'THIRD_PARTY_NOTICES.md')
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
const knownPlatformOptionalPackages = new Map([
  [
    '@rollup/rollup-linux-x64-gnu@4.13.0',
    {
      author: 'Rollup contributors',
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
const cornerstoneCodecsGitHead = '8634194b68ab43bde8f35fcc466a36d91ac700b4'
const nativeCodecComponents = [
  {
    name: 'CharLS',
    wrapperPackage: '@cornerstonejs/codec-charls@1.2.5',
    repository: 'https://github.com/cornerstonejs/charls',
    sourceSha: '38d95d00671f4cddfa61f3f51eaf81b8bac34543',
    license: 'BSD-3-Clause',
    linkedTarget: 'charls',
    files: [
      {
        path: 'third-party/native-codecs/charls/LICENSE.md',
        sha256: 'e293ccc327ee42f4e723e73aac39b23ffc40655cc6f8baec5c046f2e7d093695'
      }
    ]
  },
  {
    name: 'libjpeg-turbo',
    wrapperPackage: '@cornerstonejs/codec-libjpeg-turbo-8bit@1.2.4',
    repository: 'https://github.com/cornerstonejs/libjpeg-turbo',
    sourceSha: 'dc4a93fab38b42d29b89a533409e012570180e28',
    license: 'IJG AND BSD-3-Clause AND Zlib',
    linkedTarget: 'turbojpeg-static',
    files: [
      {
        path: 'third-party/native-codecs/libjpeg-turbo/LICENSE.md',
        sha256: 'ee1eaf194d5924b6360af8a6ba6a4e1554037091f7505943300cdeec65f1aebb'
      },
      {
        path: 'third-party/native-codecs/libjpeg-turbo/README.ijg',
        sha256: '4b7b9f8c03bb8d60270dfd12684e70ab21e4abfd27e73905cd1a7c4cae6f5cdb'
      }
    ]
  },
  {
    name: 'OpenJPEG',
    wrapperPackage: '@cornerstonejs/codec-openjpeg@1.3.2',
    repository: 'https://github.com/cornerstonejs/openjpeg',
    sourceSha: '2d606701e8b7aa83f657d113c3367508e99bd12b',
    license: 'BSD-2-Clause',
    linkedTarget: 'openjp2',
    files: [
      {
        path: 'third-party/native-codecs/openjpeg/LICENSE',
        sha256: 'a6af136f3e15038a666b61f376612a07d9a4e48cb7c01adbf3e33b3f14ab49b6'
      }
    ]
  },
  {
    name: 'OpenJPH',
    wrapperPackage: '@cornerstonejs/codec-openjph@2.4.9',
    repository: 'https://github.com/cornerstonejs/OpenJPH',
    sourceSha: 'e01c7b7f9e7ecbb15cf13bb45661c9a41ab7fec6',
    license: 'BSD-2-Clause',
    linkedTarget: 'openjphsimd',
    files: [
      {
        path: 'third-party/native-codecs/openjph/LICENSE',
        sha256: '5ddf5177863dfc9ab65fa129d587db651241f00e21ed2427b218bea997591f98'
      }
    ]
  }
]
const nativeWrapperNames = new Set(
  nativeCodecComponents.map((entry) => entry.wrapperPackage.replace(/@\d[^@]*$/, ''))
)

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
  'pnpm',
  ['--filter', '@file-viewer/renderer-dicom', 'list', '--prod', '--depth', 'Infinity', '--json'],
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
  const fallback = knownPlatformOptionalPackages.get(key)
  const declaredLicense = packageJson ? normalizeLicense(packageJson) : fallback?.license || ''
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
  if (nativeWrapperNames.has(name)) {
    assert(
      packageJson?.gitHead === cornerstoneCodecsGitHead,
      `${key} codec gitHead drifted from ${cornerstoneCodecsGitHead}`
    )
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
    author: normalizeAuthor(packageJson?.author) || fallback?.author || '',
    repository:
      repositoryOverrides.get(name) ||
      normalizeRepository(packageJson?.repository) ||
      fallback?.repository ||
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

const sortedPackages = [...packages.values()].sort(
  (left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version)
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
    cornerstoneCodecsGitHead,
    note: 'The npm wrapper license describes JavaScript glue; these entries describe native libraries statically linked into the shipped WebAssembly codecs.',
    components: nativeCodecComponents
  },
  packages: sortedPackages
}
const ledgerText = `${JSON.stringify(ledger, null, 2)}\n`

const thirdPartyPackages = sortedPackages.filter((entry) => !entry.firstParty)
const grouped = Map.groupBy(thirdPartyPackages, (entry) => entry.license)
const noticeLines = [
  '# Third-party notices',
  '',
  'This file records the complete production dependency closure of the optional `@file-viewer/renderer-dicom` package, including the Linux-only optional codec dependency. Exact machine-readable versions, SPDX expressions, source repositories, and packaged license/notice filenames are in `THIRD_PARTY_LICENSES.json`.',
  '',
  'The DICOM renderer is not part of any standard/full package or preset. These dependencies are installed only when this capability is selected, and its Cornerstone implementation is loaded only when a DICOM file is opened.',
  '',
  '## Required attribution',
  '',
  '- `caniuse-lite@1.0.30001810` data is by Ben Briggs and contributors, from <https://github.com/browserslist/caniuse-lite>, licensed under CC-BY-4.0. The renderer does not modify that upstream data. The complete CC-BY-4.0 text is retained as `caniuse-lite/LICENSE` in the installed dependency.',
  '- `pako@1.0.11` and `pako@2.1.0` contain zlib-derived code by Jean-loup Gailly and Mark Adler under `(MIT AND Zlib)`; their installed source retains the zlib notices and license terms.',
  '- `spark-md5@3.0.2` is available under `(WTFPL OR MIT)` as declared by the package. Its installed package retains the upstream license file.',
  '- `argparse@2.0.1` is licensed under Python-2.0 and retains the complete Python Software Foundation license in its installed `LICENSE` file.',
  '- `dompurify@3.4.13` is dual-licensed as `(MPL-2.0 OR Apache-2.0)`. File Viewer elects Apache-2.0, and the installed `LICENSE` file retains the complete Apache-2.0 text.',
  '',
  '### Native libraries statically linked into codec WebAssembly',
  '',
  `All four codec wrapper packages were built from \`cornerstonejs/codecs\` commit \`${cornerstoneCodecsGitHead}\`. The wrapper package license is not used as a substitute for the linked native library terms:`,
  '',
  ...nativeCodecComponents.flatMap((component) => [
    `- \`${component.name}\` (\`${component.wrapperPackage}\`): \`${component.license}\`; source \`${component.sourceSha}\` at ${component.repository}; linked target \`${component.linkedTarget}\`; retained files ${component.files.map((file) => `\`${file.path}\``).join(', ')}.`
  ]),
  '',
  '**libjpeg-turbo attribution:** This software is based in part on the work of the Independent JPEG Group.',
  '',
  'The complete libjpeg-turbo `LICENSE.md` and unmodified `README.ijg` are shipped with the package, together with the exact CharLS, OpenJPEG, and OpenJPH license texts. These native components use BSD-style, IJG, and zlib terms; none is LGPL or strong copyleft.',
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
}

const counts = Object.fromEntries(
  [...grouped].map(([license, entries]) => [license, entries.length])
)
console.log(
  `[dicom-license-ledger] Verified ${sortedPackages.length} production packages (${thirdPartyPackages.length} third-party, ${sortedPackages.filter((entry) => entry.optional).length} platform-optional): ${JSON.stringify(counts)}`
)
