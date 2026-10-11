import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, readdir, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertPublishedEngineLock } from './lib/docx-release-state.mjs'
import { verifyPublishedEngineFiles } from './verify-docx-distribution.mjs'
import {
  PPT_RUNTIME_REQUIRED_FILES,
  PPT_RUNTIME_VERSION,
  verifyPptRuntimeDirectory
} from '../../packages/components/web-full/scripts/ppt-runtime-integrity.mjs'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packageName = '@file-viewer/ppt'
const manifestPath = 'packages/renderers/presentation-ppt/package.json'

export async function verifyPptDistribution(root = defaultRoot) {
  const manifest = JSON.parse(await readFile(join(root, manifestPath), 'utf8'))
  const version = manifest.dependencies?.[packageName]
  assert.equal(version, PPT_RUNTIME_VERSION, 'The ordinary PPT dependency must match its verifier')
  const require = createRequire(join(root, manifestPath))
  const directory = await realpath(join(root, dirname(manifestPath), 'node_modules', packageName))
  const physicalRoot = await realpath(root)
  const ownedPath = relative(physicalRoot, directory)
  assert.ok(
    ownedPath &&
      !isAbsolute(ownedPath) &&
      ownedPath !== '..' &&
      !ownedPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`),
    'Installed PPT must physically belong to this checkout'
  )
  assert.equal(
    await realpath(require.resolve(packageName)),
    join(directory, 'index.mjs'),
    'PPT resolution must use the renderer installation'
  )
  const obsoleteFiles = (await readdir(join(root, 'patches'))).filter(
    (name) => name === 'ppt-http-compatibility.json' || /^@file-viewer__ppt@.*\.patch$/.test(name)
  )
  assert.deepEqual(obsoleteFiles, [], 'Remove obsolete PPT compatibility metadata and patches')
  assertPublishedEngineLock(await readFile(join(root, 'pnpm-lock.yaml'), 'utf8'), version, {
    packageName,
    manifestPath,
    label: 'PPT',
    owner: 'PPT renderer'
  })
  await verifyPptRuntimeDirectory(directory)
  const run = (command, args, binary = false) => {
    const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command
    const result = spawnSync(executable, args, {
      cwd: root,
      encoding: binary ? undefined : 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 600_000,
      shell: false
    })
    if (result.error) throw result.error
    assert.equal(
      result.status,
      0,
      `${command} failed: ${result.stderr || result.signal || result.status}`
    )
    return result.stdout
  }
  return verifyPublishedEngineFiles({
    directory,
    version,
    run,
    packageName,
    requiredEntries: PPT_RUNTIME_REQUIRED_FILES
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'Usage: node .github/scripts/verify-ppt-distribution.mjs')
  console.log('[ppt-distribution]', JSON.stringify(await verifyPptDistribution()))
}
