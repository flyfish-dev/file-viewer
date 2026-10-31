import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { CAD_SOURCE_ARCHIVE_NAME, readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'

// This public snapshot was read back and cold-built on Oracle. Its standalone
// preferred sources reproduce the canonical and actual Full owner runtimes.
export const CAD_PUBLIC_CORRESPONDING_SOURCE = Object.freeze({
  sourceCommit: '77fd41b331f3576b27f1414918051196fba3e57b',
  url: 'https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/77fd41b331f3576b27f1414918051196fba3e57b',
  sha256: 'aefaf6b781102034095406a095026c3edd5cb4572eaadfd78e7f4833f2bd4a9b',
  bytes: 189976130,
  buildDirectory: 'packages/build-support/cad-source-snapshots/3.3.3',
  runtimeSha256: '97010ad2adb3e12f5264ac32eefdfbdf01d4f67271c8db43b5a417fed0e6969f'
})

// Native preferred sources are distinct from the File Viewer integration source.
// Keep them in the common notice as well as the optional native asset layer:
// the Full bundle includes owner JavaScript even when assets are separate deps.
export const CAD_NATIVE_CORRESPONDING_SOURCES = Object.freeze([
  Object.freeze({ name: '@flyfish-dev/cad-viewer 0.8.3',
    url: 'https://codeload.github.com/flyfish-dev/cad-viewer/tar.gz/6366d2f7b1013cd5c300008c3c3fbf017ca9aace',
    sha256: '65d00f07230553734262d671abf45be94d83d3068318c0f25f8665494ec82bcb' }),
  Object.freeze({ name: 'dwf-viewer 0.6.7',
    url: 'https://codeload.github.com/flyfish-dev/dwf-viewer/tar.gz/72783571e2cd744862d8eb32f7d3455906c76226',
    sha256: 'd246d61b914475412fdc33ea250646710c4a3431bfecad9c9a7700602923afb1' }),
  Object.freeze({ name: '@mlightcad/libredwg-web 0.7.9',
    url: 'https://codeload.github.com/mlightcad/libredwg-web/tar.gz/b70b5573a6bf2345e5fb10f2adff7fb74a8123c5',
    sha256: 'af350d628535a2842262af5b49d50568b6dae62854667e13bb9f161b26c00431' })
])

export const CAD_INTEGRATION_SOURCE = Object.freeze({
  // This release includes its complete current integration source, independently
  // rebuilt against the ordinary Full runtime. Native owner versions stay fixed.
  releaseVersion: '3.3.3',
  cadVersion: '0.8.3',
  dwfVersion: '0.6.7',
  url: CAD_PUBLIC_CORRESPONDING_SOURCE.url,
  sha256: '778a5d0aae54cc731d362155e4679338a1404383d57c0f4464d28ce20203737f',
  bytes: 354745,
  files: 86,
  runtimeBytes: 627662,
  runtimeSha256: '97010ad2adb3e12f5264ac32eefdfbdf01d4f67271c8db43b5a417fed0e6969f'
})

export function cadIntegrationSourceNotice(releaseVersion) {
  assert.equal(releaseVersion, CAD_INTEGRATION_SOURCE.releaseVersion,
    'The CAD integration source offer must be reviewed for a different release')
  return [
    'File Viewer CAD integration corresponding source',
    '',
    'Package release: ' + releaseVersion,
    'Corresponding source (immutable HTTPS): ' + CAD_PUBLIC_CORRESPONDING_SOURCE.url,
    'HTTPS archive SHA-256: ' + CAD_PUBLIC_CORRESPONDING_SOURCE.sha256,
    '',
    'The public archive contains the exact standalone preferred-source snapshot at ' + CAD_PUBLIC_CORRESPONDING_SOURCE.buildDirectory + '.',
    'Use Node.js 24.20.0 and npm 11.19.0. From that directory run: npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/; npm run build.',
    'The standalone lock pins its canonical build tools; the normal workspace-toolchain reconstruction also verifies the actual Full runtime bytes.',
    'A standalone current preferred-source archive is also retained in the complete public source checkout and CAD asset directories as ' + CAD_SOURCE_ARCHIVE_NAME + '.',
    'Standalone archive SHA-256: ' + CAD_INTEGRATION_SOURCE.sha256,
    'Runtime-only npm archives do not include source ZIPs; retain this notice and its immutable HTTPS source reference.',
    'It retains complete original license texts and identifies the exact public CAD, DWF and LibreDWG bindings sources in upstream-sources.json.',
    'The integration output is ' + CAD_INTEGRATION_SOURCE.runtimeBytes + ' bytes with SHA-256 ' + CAD_INTEGRATION_SOURCE.runtimeSha256 + '.',
    'Native owner preferred sources and their build inputs (in addition to the integration source):',
    ...CAD_NATIVE_CORRESPONDING_SOURCES.flatMap(source => [source.name, source.url, 'SHA-256: ' + source.sha256, '']),
    'The original component grants, attribution and native source notices remain applicable.',
    ''
  ].join('\n')
}

export async function writeCadIntegrationSourceNotice(packageDir) {
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
  assert.equal(manifest.name, '@file-viewer/renderer-cad',
    'This generator writes only the CAD renderer source notice')
  assert.equal(manifest.dependencies['@flyfish-dev/cad-viewer'], CAD_INTEGRATION_SOURCE.cadVersion,
    'The CAD source offer must be reviewed for a different runtime')
  const notice = cadIntegrationSourceNotice(manifest.version)
  const sourceRoot = resolve(packageDir, '../../..')
  const archive = await readCadCorrespondingSource(sourceRoot, CAD_INTEGRATION_SOURCE)
  await verifyCadPreferredSourceInputs(sourceRoot, archive.manifest)
  await writeFile(join(packageDir, 'CORRESPONDING_SOURCE_NOTICE.txt'), notice)
}

export async function appendCadIntegrationSourceNotice(noticePath, releaseVersion) {
  const originalBytes = await readFile(noticePath)
  const original = originalBytes.toString('utf8')
  assert.ok(original.includes('@flyfish-dev/cad-viewer@' + CAD_INTEGRATION_SOURCE.cadVersion) &&
    original.includes('dwf-viewer@' + CAD_INTEGRATION_SOURCE.dwfVersion),
  'The combined CAD source offer requires both exact normal bundled owner notices')
  const offer = cadIntegrationSourceNotice(releaseVersion)
  const headings = original.split('File Viewer CAD integration corresponding source').length - 1
  if (headings) {
    assert.equal(headings, 1, 'The integration source offer must occur exactly once')
    assert.equal(original.split(offer).length - 1, 1,
      'The retained integration source offer differs from the exact reviewed release')
    return
  }
  await writeFile(noticePath, Buffer.concat([originalBytes, Buffer.from('\n\n' + offer)]))
}
