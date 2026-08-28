import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

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
    join(fixtureRoot, 'vite.config.mjs'),
    "import { defineConfig } from 'vite';\nimport fileViewerRenderers from '@file-viewer/vite-plugin';\nexport default defineConfig({ plugins: [fileViewerRenderers({ formats: ['pptx'], autoPresets: false })], build: { manifest: true } });\n"
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

  const legacyPptAssets = outputFiles.filter((file) =>
    /(?:ppt-font-cjk|ppt-native|file-viewer-presentation-ppt\b)/i.test(file)
  )
  assert.deepEqual(
    legacyPptAssets,
    [],
    `Registry-cold PPTX build emitted PPT assets: ${legacyPptAssets}`
  )

  const legacyPptReferences = outputRecords.filter(({ file, body }) =>
    /(?:ppt-font-cjk|ppt-native\.wasm|Flyfish PPT Viewer)/i.test(
      `${file}\n${body.toString('utf8')}`
    )
  )
  assert.deepEqual(
    legacyPptReferences.map(({ file }) => file),
    [],
    `Registry-cold PPTX build retained PPT references: ${legacyPptReferences.map(({ file }) => file)}`
  )
  assert.ok(
    outputFiles.some((file) => /pptx\.worker/i.test(file)),
    `Registry-cold PPTX build did not emit a PPTX worker: ${outputFiles.join(', ')}`
  )

  console.log(
    `Registry-cold PPTX-only build passed with @file-viewer/renderer-presentation@${rendererVersion} and @file-viewer/vite-plugin@${pluginVersion}.`
  )
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}
