import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileViewerRenderers, resolveFileViewerCopyAssetsTarget } from '../dist/index.js'

const root = await mkdtemp(join(tmpdir(), 'file-viewer-257-'))
async function json(path, data) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(data))
}
try {
  await json(join(root, 'package.json'), { dependencies: { '@file-viewer/vue3-full': '3.0.2' } })
  await json(join(root, 'node_modules/@file-viewer/vue3-full/package.json'), { name: '@file-viewer/vue3-full', version: '3.0.2' })
  const nested = join(root, 'apps/preview')
  await json(join(nested, 'package.json'), { name: 'nested-preview', type: 'module', devDependencies: { '@file-viewer/vite-plugin': '3.0.2' } })
  for (const mode of ['dev', 'build']) {
    const config = { projectRoot: nested, publicDir: 'static', outDir: 'build' }
    const target = resolveFileViewerCopyAssetsTarget(mode, true, config)
    assert.equal(target.baseDir, 'file-viewer', 'An ancestor-owned full dependency must not be mistaken for a light app')
    assert.deepEqual(target.installedFullPackages, ['@file-viewer/vue3-full'])
    assert.equal(target.targetRoot, join(nested, mode === 'dev' ? 'static' : 'build', 'file-viewer'))
    assert.equal(resolveFileViewerCopyAssetsTarget(mode, { baseDir: '' }, config).baseDir, '')
    assert.equal(resolveFileViewerCopyAssetsTarget(mode, { baseDir: 'custom/viewer' }, config).baseDir, 'custom/viewer')
  }
  await json(join(nested, 'package.json'), { dependencies: { '@file-viewer/vue3': '3.0.2', '@file-viewer/preset-office': '3.0.2' } })
  assert.equal(resolveFileViewerCopyAssetsTarget('dev', true, { projectRoot: nested }).baseDir, '', 'An explicitly light app must not inherit a parent full layout')
  await json(join(nested, 'package.json'), { dependencies: { '@file-viewer/react-full': '3.0.2' } })
  assert.deepEqual(resolveFileViewerCopyAssetsTarget('dev', true, { projectRoot: nested }).installedFullPackages, [], 'An uninstalled nearer runtime must not select unrelated ancestor packages')
  const plugin = fileViewerRenderers({ copyAssets: true })
  plugin.configResolved({ root, command: 'serve', base: '/', publicDir: join(root, 'static'), build: { outDir: 'build' } })
  await plugin.closeBundle()
  await assert.rejects(access(join(root, 'build')), { code: 'ENOENT' }, 'Closing a development server must not publish build assets')
  console.log('[issue-257] ancestor-owned full dependency, nearer light/runtime boundaries, dev/build and explicit asset roots passed')
} finally { await rm(root, { recursive: true, force: true }) }
