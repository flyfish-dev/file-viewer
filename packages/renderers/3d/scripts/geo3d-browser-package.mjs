/** Shared test paths: the same browser assertions run against workspace or installed bytes. */
import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const repositoryRoot = resolve(here, '../../../..')
export const installedConsumer = Boolean(process.env.GEO3D_TEST_PACKAGE_ROOT)
export const rendererPackageRoot = installedConsumer
  ? realpathSync(resolve(process.env.GEO3D_TEST_PACKAGE_ROOT))
  : resolve(here, '..')
export const browserOutput = resolve(
  process.env.GEO3D_TEST_OUTPUT || join(repositoryRoot, 'output/geo3d-browser')
)
const consumerRoot = installedConsumer
  ? realpathSync(resolve(process.env.GEO3D_TEST_CONSUMER_ROOT || '.'))
  : null
const inside = (path, directory) => path === directory || path.startsWith(directory + sep)
if (installedConsumer) {
  assert.ok(
    !inside(consumerRoot, repositoryRoot),
    'Installed consumer must be outside the checkout'
  )
  assert.ok(
    inside(rendererPackageRoot, join(consumerRoot, 'node_modules')),
    'Runtime must be physically installed in consumer node_modules'
  )
  assert.ok(
    inside(browserOutput, consumerRoot),
    'Installed test output must be isolated from the workspace report'
  )
}
export const rendererFile = (relative) => resolve(rendererPackageRoot, relative)
const resolver = createRequire(rendererFile('package.json'))
export const coreEntry = resolver.resolve('@file-viewer/core')
export const engineFile = (relative) => resolver.resolve('@giro3d/giro3d/' + relative)
export const { copyGeo3dAssets } = await import(
  pathToFileURL(rendererFile('bin/copy-geo3d-assets.mjs')).href
)

/** Permit test instrumentation, never workspace runtime/dependencies, in a cold build. */
export function verifyRuntimeModules(moduleIds) {
  const files = new Set()
  const harness = realpathSync(join(here, 'geo3d-concurrent-client.mjs'))
  // esbuild uses (disabled):fs/path/etc for empty browser-disabled modules.
  // The metafile caller resolves relative IDs against cwd, so preserve that
  // precise synthetic prefix. Never ignore ENOENT for an actual file path.
  const disabledPrefix = resolve(process.cwd(), '(disabled):')
  for (const id of moduleIds) {
    if (id.includes('\0') || !isAbsolute(id) || id.startsWith(disabledPrefix)) continue
    const file = realpathSync(id.split('?')[0])
    files.add(file)
    if (installedConsumer) {
      assert.ok(
        inside(file, consumerRoot) || file === harness,
        `Installed browser build reached outside its consumer: ${file}`
      )
    }
  }
  return [...files].sort()
}

export function runtimeGraphPlugin(suite) {
  return {
    name: 'geo3d-physical-runtime-graph',
    async generateBundle() {
      const modules = verifyRuntimeModules([...this.getModuleIds()])
      assert.ok(
        modules.some((path) => path === realpathSync(rendererFile('dist/geo3d.js'))),
        'Browser must use the selected renderer'
      )
      assert.ok(
        modules.some((path) => path === realpathSync(engineFile('core/Instance.js'))),
        'Browser must use the selected real engine'
      )
      await writeFile(
        join(browserOutput, `${suite}-module-graph.json`),
        JSON.stringify(
          {
            installedConsumer,
            rendererPackageRoot,
            consumerRoot,
            modules
          },
          null,
          2
        ) + '\n'
      )
    }
  }
}
