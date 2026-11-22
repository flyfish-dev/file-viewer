import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { CAD_SOURCE_ARCHIVE_NAME, readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'

// This immutable public snapshot was read back and cold-built on Linux ARM64.
// The normal release verifier separately compares its canonical and actual Full runtimes.
export const CAD_PUBLIC_CORRESPONDING_SOURCE = Object.freeze({
  sourceCommit: 'c013bea0ab5dc21a7eb40cae9775638c40248268',
  url: 'https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/c013bea0ab5dc21a7eb40cae9775638c40248268',
  sha256: '343f7ae2f63d3157ab8b58eb7663c6f7c87498870bb4df7c472ad587a5edcbbf',
  bytes: 194674702,
  buildDirectory: 'packages/build-support/cad-source-snapshots/3.3.6',
  runtimeSha256: '22dc5b6f689adf96b3a3a439f6e16f2bb19ba7d8dc5f6bf2c6d917b2c120cacc'
})

// Native preferred sources are distinct from the File Viewer integration source.
// Keep them in the common notice as well as the optional native asset layer:
// the Full bundle includes owner JavaScript even when assets are separate deps.
export const CAD_NATIVE_CORRESPONDING_SOURCES = Object.freeze([
  Object.freeze({ name: '@flyfish-dev/cad-viewer 0.8.4',
    url: 'https://codeload.github.com/flyfish-dev/cad-viewer/tar.gz/6721a3dbcd5027a31006029243c505c460a521c6',
    sha256: '1de0f46746ccd832524c312e5760719941bbece19b693738d1bea408eee20434',
    npm: Object.freeze({ name: '@flyfish-dev/cad-viewer', version: '0.8.4', integrity: 'sha512-o95aj+Tvy79VRPVbp3xeeIYQs+EkGwNfWPXbPy5B1ZR9v4ISmA7q7IUuTN5Js28bktLStf7tGjMO889zkBogFA==' }) }),
  Object.freeze({ name: 'dwf-viewer 0.6.8',
    url: 'https://codeload.github.com/flyfish-dev/dwf-viewer/tar.gz/274e7c86af0c97c569176c43ff317e92b0e30584',
    sha256: 'e98577a7f4b5434d975d2e00c8560e3ba53e3890c89bb6f85c357709d630df7c',
    npm: Object.freeze({ name: 'dwf-viewer', version: '0.6.8', integrity: 'sha512-0t7uEq1U08bhJr79elRzX4UU0EuMHeHb+Q+P/O/6Q6qNL+97mN5DICopPYW7b7hbV+K2XAC29tWWR9/MRosqCA==' }) }),
  Object.freeze({ name: '@mlightcad/libredwg-web 0.7.9',
    url: 'https://codeload.github.com/mlightcad/libredwg-web/tar.gz/b70b5573a6bf2345e5fb10f2adff7fb74a8123c5',
    sha256: 'af350d628535a2842262af5b49d50568b6dae62854667e13bb9f161b26c00431' })
])

export const CAD_INTEGRATION_SOURCE = Object.freeze({
  releaseVersion: '3.3.6',
  sha256: 'ef168bd8138333bcf62a6065b942cb1b39ac0ee9c08d4e689d085f8dda503164',
  bytes: 473241,
  files: 118,
  runtimeBytes: 945926,
  runtimeSha256: '22dc5b6f689adf96b3a3a439f6e16f2bb19ba7d8dc5f6bf2c6d917b2c120cacc',
  cadVersion: '0.8.4',
  dwfVersion: '0.6.8',
  url: 'https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/c013bea0ab5dc21a7eb40cae9775638c40248268'
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
