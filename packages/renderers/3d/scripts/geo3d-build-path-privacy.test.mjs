import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { buildPointAdapters } from './build-geo3d-point-adapters.mjs'
import { buildRasterAdapters } from './build-geo3d-raster-adapters.mjs'

const root = resolve(import.meta.dirname, '..')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const paths = ['geo3dPointFactories.js', 'geo3dRasterFactories.js',
  'geo3d-workers/las-worker.js', 'geo3d-workers/geotiff-worker.js', 'geo3d-workers/texture-worker.js']
const physicalPath = /(?:\/Users\/[^/\s"']+\/|\/home\/[^/\s"']+\/|[A-Za-z]:\\Users\\)/

// Use the actual pinned builders/SDK in both profiles; no mock bundler or
// comment exemption can satisfy this check. Restore the caller's build profile.
test('source and runtime Geo3D builds preserve path privacy, SDK inputs and deterministic runtime bytes', async () => {
  const prior = process.env.FILE_VIEWER_DISTRIBUTION_MODE
  const require = createRequire(join(root, 'package.json'))
  const sdkInputs = ['sources/LASSource.js', 'sources/COPCSource.js',
    'sources/GeoTIFFSource.js', 'utils/TextureGenerator.js']
    .map(path => require.resolve('@giro3d/giro3d/' + path))
  const original = await Promise.all(sdkInputs.map(async path => hash(await readFile(path))))
  let firstRuntime
  try {
    for (const mode of ['source', 'runtime-only', 'runtime-only']) {
      process.env.FILE_VIEWER_DISTRIBUTION_MODE = mode
      await buildPointAdapters()
      await buildRasterAdapters()
      const records = []
      for (const path of paths) {
        const bytes = await readFile(join(root, 'dist', path))
        assert(!physicalPath.test(bytes.toString('latin1')), `${mode}/${path} includes a local absolute path`)
        if (path === 'geo3d-workers/las-worker.js')
          assert.doesNotMatch(bytes.toString('utf8'), /https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|api\.github\.com)/,
            'The installed LAS Worker must not retain a public decoder fallback')
        records.push({ path, bytes: bytes.length, sha256: hash(bytes) })
      }
      const manifest = JSON.parse(await readFile(join(root, 'dist/geo3d-workers/manifest.json')))
      assert.equal(manifest.workerSha256, records.find(record => record.path === 'geo3d-workers/las-worker.js').sha256,
        'The Worker receipt must bind the final offline bytes')
      for (const type of ['point', 'raster']) {
        const inventory = JSON.parse(await readFile(join(root, `.build/geo3d-${type}-inputs.json`)))
        assert(inventory.virtualInputs.filter(path => /^owned-/.test(path))
          .every(path => !/^owned-[^:]+:(?:[\/]|[A-Za-z]:)/.test(path)), 'Virtual module identity must not be a physical path')
        assert(inventory.files.length > 0, 'Physical source/license ownership evidence must remain complete')
      }
      if (mode === 'runtime-only') {
        if (firstRuntime) assert.deepEqual(records, firstRuntime, 'Repeated runtime outputs must be byte-identical')
        firstRuntime = records
      }
      assert.deepEqual(await Promise.all(sdkInputs.map(async path => hash(await readFile(path)))), original,
        'Builders must not edit installed SDK sources')
      console.log('[geo3d-build-path-privacy]', mode, JSON.stringify(records))
    }
  } finally {
    if (prior === undefined) delete process.env.FILE_VIEWER_DISTRIBUTION_MODE
    else process.env.FILE_VIEWER_DISTRIBUTION_MODE = prior
    await buildPointAdapters()
    await buildRasterAdapters()
  }
})
