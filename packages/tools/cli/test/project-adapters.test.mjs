import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  assertFileViewerProjectAdapterCanWrite,
  inspectFileViewerProjectAdapter,
} from '../dist/project-adapters.js'

const fixture = async ({ manifest, files = {} }) => {
  const root = await mkdtemp(join(tmpdir(), 'file-viewer-project-adapter-'))
  await writeFile(join(root, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}

test('resolves a literal publicDir from the custom Vite --config used by package scripts', async () => {
  const root = await fixture({
    manifest: {
      scripts: { build: 'cross-env NODE_ENV=production vite build --config ./config/vite.client.ts' },
      devDependencies: { vite: '^8.0.0' },
    },
    files: {
      'config/vite.client.ts': `// publicDir: 'ignored-comment'\nexport default { publicDir: 'web-public' }\n`,
    },
  })
  try {
    const result = await inspectFileViewerProjectAdapter(root)
    assert.equal(result.buildSystem, 'vite')
    assert.equal(result.selectedConfigPath, 'config/vite.client.ts')
    assert.equal(result.publicDirectory, 'web-public')
    assert.equal(result.assetTarget, 'web-public/file-viewer')
    assert.equal(result.safeAutomaticConfiguration, true)
    assert.equal(result.failClosed, false)
    assert.equal(assertFileViewerProjectAdapterCanWrite(result), result)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('Vite defaults to public but dynamic, disabled, missing, and multiple configs fail closed', async () => {
  const defaultRoot = await fixture({ manifest: { scripts: { build: 'vite build' }, devDependencies: { vite: '^8.0.0' } } })
  const dynamicRoot = await fixture({
    manifest: { scripts: { build: 'vite build' }, devDependencies: { vite: '^8.0.0' } },
    files: { 'vite.config.ts': `export default { publicDir: process.env.PUBLIC_DIR }\n` },
  })
  const disabledRoot = await fixture({
    manifest: { scripts: { build: 'vite build' }, devDependencies: { vite: '^8.0.0' } },
    files: { 'vite.config.ts': `export default { publicDir: false }\n` },
  })
  const missingRoot = await fixture({ manifest: { scripts: { build: 'vite build --config config/missing.ts' }, devDependencies: { vite: '^8.0.0' } } })
  const multipleRoot = await fixture({
    manifest: { scripts: { build: 'vite build' }, devDependencies: { vite: '^8.0.0' } },
    files: { 'vite.config.ts': 'export default {}\n', 'vite.config.mjs': 'export default {}\n' },
  })
  try {
    assert.equal((await inspectFileViewerProjectAdapter(defaultRoot)).assetTarget, 'public/file-viewer')
    for (const root of [dynamicRoot, disabledRoot, missingRoot, multipleRoot]) {
      const result = await inspectFileViewerProjectAdapter(root)
      assert.equal(result.failClosed, true)
      assert.equal(result.manualSteps.length > 0, true)
      assert.throws(() => assertFileViewerProjectAdapterCanWrite(result), /cannot safely complete/)
    }
  } finally {
    await Promise.all([defaultRoot, dynamicRoot, disabledRoot, missingRoot, multipleRoot].map(root => rm(root, { recursive: true, force: true })))
  }
})

test('Vue CLI, Next, and Nuxt choose their deterministic public source directories', async () => {
  const cases = [
    {
      expected: ['vue-cli', 'public/file-viewer'],
      manifest: { scripts: { build: 'vue-cli-service build' }, devDependencies: { '@vue/cli-service': '^5.0.8' } },
      files: { 'vue.config.js': 'module.exports = { publicPath: "/app/" }\n' },
    },
    {
      expected: ['next', 'public/file-viewer'],
      manifest: { scripts: { build: 'next build' }, dependencies: { next: '^15.4.0' } },
      files: { 'next.config.mjs': 'export default { basePath: "/app" }\n' },
    },
    {
      expected: ['nuxt', 'static/file-viewer'],
      manifest: { scripts: { build: 'nuxt build' }, dependencies: { nuxt: '^2.18.1' } },
      files: { 'nuxt.config.js': 'export default { head: {}, runtimeConfig: { public: { apiBase: "/api" } } }\n' },
    },
    {
      expected: ['nuxt', 'site-public/file-viewer'],
      manifest: { scripts: { build: 'nuxt build' }, dependencies: { nuxt: '^3.17.0' } },
      files: { 'nuxt.config.ts': `export default defineNuxtConfig({ dir: { public: 'site-public' } })\n` },
    },
  ]
  for (const item of cases) {
    const root = await fixture(item)
    try {
      const result = await inspectFileViewerProjectAdapter(root)
      assert.deepEqual([result.buildSystem, result.assetTarget], item.expected)
      assert.equal(result.safeAutomaticConfiguration, true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test('generic Webpack and ambiguous build systems provide manual steps instead of claiming success', async () => {
  const webpackRoot = await fixture({
    manifest: { scripts: { build: 'webpack --config config/webpack.prod.js' }, devDependencies: { webpack: '^5.0.0' } },
    files: { 'config/webpack.prod.js': 'module.exports = {}\n' },
  })
  const ambiguousRoot = await fixture({
    manifest: {
      scripts: { build: 'vite build', start: 'next start' },
      dependencies: { next: '^15.0.0' },
      devDependencies: { vite: '^8.0.0' },
    },
  })
  try {
    const webpack = await inspectFileViewerProjectAdapter(webpackRoot)
    assert.equal(webpack.buildSystem, 'webpack')
    assert.equal(webpack.assetTarget, undefined)
    assert.match(webpack.manualSteps[0], /CopyWebpackPlugin/)
    const ambiguous = await inspectFileViewerProjectAdapter(ambiguousRoot)
    assert.equal(ambiguous.buildSystem, 'unknown')
    assert.match(ambiguous.manualSteps[0], /Multiple build systems/)
  } finally {
    await Promise.all([webpackRoot, ambiguousRoot].map(root => rm(root, { recursive: true, force: true })))
  }
})

test('unsafe shell-expanded Vite config paths never become filesystem paths', async () => {
  const root = await fixture({
    manifest: { scripts: { build: 'vite build --config "$VITE_CONFIG"' }, devDependencies: { vite: '^8.0.0' } },
  })
  try {
    const result = await inspectFileViewerProjectAdapter(root)
    assert.equal(result.failClosed, true)
    assert.equal(result.configPaths.length, 0)
    assert.match(result.manualSteps.join('\n'), /shell expansion/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
