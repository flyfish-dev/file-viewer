import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '../../../..')
const require = createRequire(import.meta.url)

test('the tracked copy-assets bin rebuilds identically in every distribution mode', async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'web-full-copy-assets-build-'))
  t.after(() => rm(fixture, { recursive: true, force: true }))
  const scripts = join(fixture, 'packages/components/web-full/scripts')
  for (const path of [
    'packages/components/web-full/package.json',
    'packages/components/web-full/scripts/build-copy-assets.mjs',
    'packages/components/web-full/scripts/copy-assets-entry.mjs',
    'packages/components/web-full/scripts/full-asset-dependencies.mjs',
    'packages/tools/copy-assets/src/index.ts',
  ]) {
    await mkdir(dirname(join(fixture, path)), { recursive: true })
    await copyFile(join(root, path), join(fixture, path))
  }
  await mkdir(join(fixture, 'node_modules'))
  await symlink(dirname(require.resolve('esbuild/package.json')), join(fixture, 'node_modules/esbuild'), 'dir')
  const expected = await readFile(join(scriptDir, 'copy-assets.mjs'))
  const version = JSON.parse(await readFile(join(fixture, 'packages/components/web-full/package.json'), 'utf8')).version
  const output = join(scripts, 'copy-assets.mjs')
  for (const mode of [undefined, 'source', 'runtime-only']) {
    const env = { ...process.env }
    if (mode === undefined) delete env.FILE_VIEWER_DISTRIBUTION_MODE
    else env.FILE_VIEWER_DISTRIBUTION_MODE = mode
    const built = spawnSync(process.execPath, [join(scripts, 'build-copy-assets.mjs')], { cwd: fixture, env, encoding: 'utf8' })
    assert.equal(built.status, 0, built.stderr)
    const bytes = await readFile(output)
    t.diagnostic(JSON.stringify({ mode: mode ?? '(unset)', bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      gitBlob: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') }))
    assert.ok(bytes.equals(expected), `Tracked bin changed for distribution mode ${mode ?? '(unset)'}`)
    assert.ok(bytes.toString().startsWith('#!/usr/bin/env node\n'))
    assert.equal((await stat(output)).mode & 0o777, 0o755)
    const executable = spawnSync(process.execPath, [output, '--version'], { cwd: fixture, env, encoding: 'utf8' })
    assert.equal(executable.status, 0, executable.stderr)
    assert.equal(executable.stdout, version + '\n')
  }
})
