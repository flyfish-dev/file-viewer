import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertPptxOnlyBundle } from './presentation-bundle-boundary.mjs'

const registry = process.env.FILE_VIEWER_NPM_REGISTRY || 'https://registry.npmjs.org/'
const currentReleaseVersion = JSON.parse(
  await readFile(new URL('../../../package.json', import.meta.url), 'utf8')
).version
const rendererVersion = process.env.FILE_VIEWER_PRESENTATION_VERSION || currentReleaseVersion
const pluginVersion = process.env.FILE_VIEWER_VITE_PLUGIN_VERSION || currentReleaseVersion
const fixtureRoot = await realpath(
  await mkdtemp(join(await realpath(tmpdir()), 'file-viewer-pptx-registry-'))
)

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: fixtureRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_registry: registry
    }
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`)
  }
}

try {
  await writeFile(
    join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'file-viewer-pptx-registry-cold',
        private: true,
        type: 'module',
        scripts: {
          build: 'vite build'
        },
        dependencies: {
          '@file-viewer/renderer-presentation': rendererVersion,
          '@file-viewer/vite-plugin': pluginVersion,
          vite: '6.1.0'
        }
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(fixtureRoot, 'index.html'),
    '<script type="module" src="/src.js"></script>\n'
  )
  await writeFile(
    join(fixtureRoot, 'src.js'),
    "import { pptxRenderer } from '@file-viewer/renderer-presentation/pptx';\nconsole.log(pptxRenderer.id);\n"
  )
  await writeFile(
    join(fixtureRoot, 'presentation-bundle-boundary.mjs'),
    await readFile(new URL('./presentation-bundle-boundary.mjs', import.meta.url), 'utf8')
  )
  await writeFile(
    join(fixtureRoot, 'vite.config.mjs'),
    "import { defineConfig } from 'vite';\nimport fileViewerRenderers from '@file-viewer/vite-plugin';\nimport { presentationModuleGraph } from './presentation-bundle-boundary.mjs';\nexport default defineConfig({ plugins: [fileViewerRenderers({ formats: ['pptx'], autoPresets: false }), presentationModuleGraph()], worker: { plugins: () => [presentationModuleGraph('pptx-worker-module-graph.json')] }, build: { manifest: true } });\n"
  )

  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'])

  const presentationPackage = JSON.parse(
    await readFile(
      join(fixtureRoot, 'node_modules/@file-viewer/renderer-presentation/package.json'),
      'utf8'
    )
  )
  assert.equal(presentationPackage.version, rendererVersion)
  assert.equal(presentationPackage.exports['./ppt']?.import, './dist/ppt.js')
  assert.equal(presentationPackage.exports['./pptx']?.import, './dist/pptx.js')

  const pluginEntry = pathToFileURL(
    join(fixtureRoot, 'node_modules/@file-viewer/vite-plugin/dist/index.js')
  ).href
  const { resolveFileViewerRendererSelection } = await import(pluginEntry)
  const selection = resolveFileViewerRendererSelection({ formats: ['pptx'] })
  assert.deepEqual(selection.packages, ['@file-viewer/renderer-pptx'])
  assert.deepEqual(selection.rendererIds, ['office-presentation'])

  run('npm', ['run', 'build'])

  const outputFiles = await readdir(join(fixtureRoot, 'dist'), { recursive: true })
  const outputRecords = []
  for (const file of outputFiles) {
    const path = join(fixtureRoot, 'dist', file)
    const info = await stat(path)
    if (!info.isFile()) continue
    outputRecords.push({ file, body: await readFile(path) })
  }

  assertPptxOnlyBundle(outputRecords,
    await readFile(join(fixtureRoot, 'node_modules/@file-viewer/pptx/dist/worker/pptx.worker.js')))

  console.log(
    `Registry-cold PPTX-only build passed with @file-viewer/renderer-presentation@${rendererVersion} and @file-viewer/vite-plugin@${pluginVersion}.`
  )
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}
