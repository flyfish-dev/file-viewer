import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { sanitizeOfflineAssetText } from '../components/web-full/scripts/offline-asset-sanitize.mjs'
import { removeRuntimeSourceReferences } from './runtime-only-javascript.mjs'
import { resolveWorkspaceAsset } from './public-asset-mirror.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const workspace = resolve(import.meta.dirname, '../..')
const legalName = /(?:LICENSE|COPYING|COPYRIGHT|NOTICE|PROVENANCE|(?:^|[._-])(?:A?GPL|LGPL|MPL|OFL)-)/i
const registryUrl = new URL('./licenses/asset-family-materials.json', import.meta.url)

export function canonicalRuntimePath(path, sourceRoot) {
  if (path.startsWith('vendor/drawio/')) return resolveWorkspaceAsset(sourceRoot, `third_party/drawio/${path.slice(14)}`)
  if (path.startsWith('wasm/typst/fonts/')) return join(sourceRoot, 'packages/renderers/typst/assets/fonts', path.slice(17))
  if (path.startsWith('vendor/pdf/') && !path.startsWith('vendor/pdf/fonts/')) return join(sourceRoot, 'packages/renderers/pdf/dist/vendor/pdfjs', path.slice(11))
  if (path === 'vendor/design/stet_wasm_bg.wasm') return join(sourceRoot, 'packages/renderers/design/runtime/postscript/stet_wasm_bg.wasm')
  if (path.startsWith('vendor/design/') && path.endsWith('.worker.js')) return join(sourceRoot, 'packages/renderers/design/dist', path.slice(14))
  for (const renderer of ['chm', 'iwork', 'hangul']) {
    if (path.startsWith(`vendor/${renderer}/`) && /\.(?:wasm|js)$/.test(path)) return join(sourceRoot, `packages/renderers/${renderer}/dist`, path.slice(`vendor/${renderer}/`.length))
  }
  if (path === 'vendor/xlsx/sheet.worker.js') return join(sourceRoot, 'packages/renderers/spreadsheet/dist/worker/sheet.worker.js')
  // The normal installed-runtime stagers verify CAD, PPT, fonts and OCCT
  // sources before this common bootstrap tree is copied. Alias paths remain
  // aliases; they do not elect a component version from the directory name.
  return join(sourceRoot, 'apps/viewer-demo/public', path)
}

function appliesToRuntime(legalPath, runtimePath, identity) {
  const legal = legalPath.toLowerCase()
  const runtime = runtimePath.toLowerCase()
  if (identity.kind === 'generated-font-attribution') return /\.(?:woff2?|otf|ttf)$/.test(runtime)
  if (identity.kind.startsWith('generated-')) return true // attribution, never a grant election
  if (legal.includes('/design/')) {
    if (legal.includes('saxes')) return runtime.endsWith('/adobe-container.worker.js')
    return /\/stet_wasm(?:_bg)?\.(?:wasm|js)$/.test(runtime) || runtime.endsWith('/postscript.worker.js')
  }
  if (legal.includes('/pdf/')) {
    if (legal.includes('/cmaps/')) return runtime.endsWith('.bcmap')
    if (legal.includes('liberation')) return /\/liberationsans[^/]*\.ttf$/.test(runtime)
    if (legal.includes('jbig2')) return runtime.endsWith('/jbig2.wasm')
    if (legal.includes('openjpeg')) return /\/openjpeg(?:_nowasm_fallback)?\.(?:wasm|js)$/.test(runtime)
    if (legal.includes('qcms')) return runtime.endsWith('/qcms_bg.wasm')
    if (legal.includes('/fonts/')) return runtime.endsWith('.woff2')
  }
  if (legal.includes('architectsdaughter')) return runtime.endsWith('/architectsdaughter-regular.ttf')
  if (legal.includes('lppl')) return legal.includes('/typst/') ? /\/newcm[^/]*\.otf$/.test(runtime) : runtime.includes('/mhchem/') && runtime.endsWith('.woff2')
  if (legal.includes('gust')) return runtime.includes('/mhchem/') && runtime.endsWith('.woff2')
  if (legal.includes('bbm-upstream')) return runtime.includes('/bbm/') && runtime.endsWith('.woff2')
  if (legal.includes('doublestroke')) return runtime.includes('/dsfont/') && runtime.endsWith('.woff2')
  if (legal.includes('/math4/') && legal.includes('ofl')) return runtime.includes('/tex/') && runtime.endsWith('.woff2')
  if (legal.includes('/typst/') && legal.includes('notice.typst-assets')) return /\.(?:otf|ttf)$/.test(runtime)
  if (identity.component === 'LibreDWG native CAD binding') return /\/libredwg-web\.(?:wasm|js)$/.test(runtime)
  if (legal.includes('/cad/') || legal.includes('/model/')) return /\.(?:wasm|[cm]?js)$/.test(runtime)
  return true
}

async function files(directory) {
  const result = []
  const visit = async path => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name)
      if (entry.isDirectory()) await visit(file)
      else if (entry.isFile()) result.push(file)
    }
  }
  await visit(directory)
  return result.sort()
}

/** Attach truthful material identities to copies made by the normal asset owner.
 * Original grants, generated inventories and source offers remain distinct.
 */
export async function stageSharedAssetAttribution(viewerRoot, { sourceRoot = workspace, externalAssetOwners = [] } = {}) {
  const assetOwners = {
    'vendor/drawio/': '@file-viewer/assets-drawing',
    'wasm/cad/': '@file-viewer/assets-cad',
    'vendor/design/': '@file-viewer/assets-design'
  }
  for (const owner of externalAssetOwners) {
    assert.ok(Object.hasOwn(assetOwners, owner.prefix), 'Only the established Full asset split can be delegated')
    assert.equal(owner.packageName, assetOwners[owner.prefix])
    assert.match(owner.version, /^\d+\.\d+\.\d+$/)
    assert.equal(owner.inventoryPath, 'viewer/THIRD_PARTY_LICENSES.assets.json')
  }
  const external = path => externalAssetOwners.some(owner => path.startsWith(owner.prefix))
  const registryBytes = await readFile(registryUrl)
  const registry = JSON.parse(registryBytes)
  const byDigest = new Map()
  for (const entry of registry.materials) {
    const source = await readFile(resolveWorkspaceAsset(sourceRoot, entry.sourcePath))
    assert.equal(hash(source), entry.sha256, `Shared legal source changed: ${entry.sourcePath}`)
    assert.equal(source.length, entry.bytes)
    const { sourcePath, initialOccurrences, ...publicIdentity } = entry
    byDigest.set(entry.sha256, publicIdentity)
  }
  // This separate known original grant was already retained by the normal
  // SQL stager; the initial 55-material backlog did not include it.
  byDigest.set('60a3f6e4d7b29b4321359e683b36cf198d24f58e24582070f56e6fa89d5ee2be', {
    sha256: '60a3f6e4d7b29b4321359e683b36cf198d24f58e24582070f56e6fa89d5ee2be',
    kind: 'original-license-grant', component: 'sql.js@1.15.2', declaredLicense: 'MIT',
    source: 'https://www.npmjs.com/package/sql.js/v/1.15.2',
  })
  // These original installed CAD materials were already retained by the
  // version-checked normal CAD stager, outside the initial unmapped backlog.
  byDigest.set('d8a6cc31abc16b6748c7a21f21611f5a1ec33f67d22ca23d7da1c19b95496bee', {
    sha256: 'd8a6cc31abc16b6748c7a21f21611f5a1ec33f67d22ca23d7da1c19b95496bee',
    kind: 'original-license-grant', component: '@flyfish-dev/cad-viewer@0.8.3', declaredLicense: 'AGPL-3.0-only',
    source: 'https://github.com/flyfish-dev/cad-viewer/tree/6366d2f7b1013cd5c300008c3c3fbf017ca9aace',
  })
  byDigest.set('a6f4f2d3dacfe44c2d3c9f8860aa3b8a1f64d4d61b749f4c53af247dd9df4a83', {
    sha256: 'a6f4f2d3dacfe44c2d3c9f8860aa3b8a1f64d4d61b749f4c53af247dd9df4a83',
    kind: 'original-attribution-notice', component: '@flyfish-dev/cad-viewer@0.8.3', declaredLicense: null,
    source: 'https://github.com/flyfish-dev/cad-viewer/tree/6366d2f7b1013cd5c300008c3c3fbf017ca9aace',
  })
  const attribution = []
  const payloads = new Map()
  for (const file of await files(viewerRoot)) {
    const path = relative(viewerRoot, file).replaceAll('\\', '/')
    if (path === 'THIRD_PARTY_LICENSES.assets.json') continue
    if (external(path)) continue
    if (!legalName.test(file.split('/').at(-1))) continue
    const bytes = await readFile(file)
    const identity = byDigest.get(hash(bytes))
    if (!identity) continue // Other legal books keep their own exact component receipts.
    const directory = dirname(file)
    const directoryFiles = await files(directory)
    const matchingRuntime = []
    for (const runtime of directoryFiles) {
      if (legalName.test(runtime.split('/').at(-1))) continue
      // licenses/ holds grants for its parent Worker/native runtime.
      matchingRuntime.push(runtime)
    }
    if (directory.endsWith('/licenses')) {
      for (const entry of await readdir(dirname(directory), { withFileTypes: true })) {
        if (entry.isFile() && !legalName.test(entry.name)) matchingRuntime.push(join(dirname(directory), entry.name))
      }
    }
    const references = []
    for (const runtime of [...new Set(matchingRuntime)].sort()) {
      const runtimePath = relative(viewerRoot, runtime).replaceAll('\\', '/')
      if (external(runtimePath)) continue
      if (!appliesToRuntime(path, runtimePath, identity)) continue
      if (!payloads.has(runtimePath)) {
        const value = await readFile(runtime)
        const canonical = await readFile(canonicalRuntimePath(runtimePath, sourceRoot))
        let sourceTransform = 'none'
        if (!value.equals(canonical) && /\.(?:js|mjs|css|html|json|svg|txt|xml)$/.test(runtimePath)) {
          const sourceText = canonical.toString('utf8')
          const sanitized = sanitizeOfflineAssetText(sourceText, runtime)
          const withoutMaps = /\.[cm]?js$/.test(runtimePath) ? removeRuntimeSourceReferences(sourceText, runtimePath).output.trimEnd() + '\n' : sourceText
          assert.ok([sanitized.output, withoutMaps, sanitizeOfflineAssetText(withoutMaps, runtime).output].some(text => value.equals(Buffer.from(text))),
            `Copied payload differs from its canonical owner and normal offline transforms: ${runtimePath}`)
          sourceTransform = 'exact-normal-offline-references-and-source-map-removal'
        } else assert.ok(value.equals(canonical), `Copied payload differs from its canonical owner: ${runtimePath}`)
        // The copier supplies current owner outputs. Preserve their actual bytes
        // rather than inventing a version from an asset directory's alias.
        payloads.set(runtimePath, { path: runtimePath, bytes: value.length, sha256: hash(value), sourceSha256: hash(canonical), sourceTransform })
      }
      references.push(runtimePath)
    }
    attribution.push({ path, ...identity, runtimePaths: references })
  }
  const receipt = {
    schemaVersion: 1, purpose: 'shared-runtime-material-attribution',
    scope: 'Material identity and actual copied payloads; not a source-availability or release approval.',
    registrySha256: hash(registryBytes), releaseApproval: false,
    ...(externalAssetOwners.length ? { externalAssetOwners } : {}),
    materials: attribution, runtimeFiles: [...payloads.values()].sort((a,b) => a.path.localeCompare(b.path)),
  }
  await mkdir(viewerRoot, { recursive: true })
  await writeFile(join(viewerRoot, 'THIRD_PARTY_LICENSES.assets.json'), JSON.stringify(receipt, null, 2) + '\n')
  return receipt
}
