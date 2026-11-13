import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { CAD_SOURCE_ARCHIVE_NAME, readCadCorrespondingSource, verifyCadPreferredSourceInputs } from './cad-corresponding-source.mjs'

// This immutable public snapshot was read back and cold-built on Linux ARM64.
// The normal release verifier separately compares its canonical and actual Full runtimes.
export const CAD_PUBLIC_CORRESPONDING_SOURCE = Object.freeze({
  sourceCommit: '7028fe51d5bce7dc0262ccac9d6eb7f8386d5512',
  url: 'https://codeload.github.com/flyfish-dev/file-viewer/tar.gz/7028fe51d5bce7dc0262ccac9d6eb7f8386d5512',
  sha256: '2cdcc33e9f1e6f6d3291a2c891563576443bfcea1586c430927b1097710964bc',
  bytes: 191004348,
  buildDirectory: 'packages/build-support/cad-source-snapshots/3.3.4',
  runtimeSha256: 'aaaebd43c94467e686ab8320f817df07fba69b2e5610b35c2d010056aab81143'
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
  // Complete preferred inputs with a measured standalone reproduction. Normal
  // Full/HTTPS verification remains mandatory; native owner versions stay fixed.
  releaseVersion: '3.3.4',
  cadVersion: '0.8.3',
  dwfVersion: '0.6.7',
  url: CAD_PUBLIC_CORRESPONDING_SOURCE.url,
  sha256: '84c1a5f780755aba6e9d109a8995356b66bf554516da38499607db43f32c80a8',
  bytes: 457569,
  files: 100,
  runtimeBytes: 926335,
  runtimeSha256: 'aaaebd43c94467e686ab8320f817df07fba69b2e5610b35c2d010056aab81143'
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
