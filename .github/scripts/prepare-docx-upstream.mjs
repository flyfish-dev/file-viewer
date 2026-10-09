import assert from 'node:assert/strict'
import { lstat, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertSafeSourcePath,
  assertDocxPatchDeletions,
  docxCompatibilityPath,
  docxManifestPath,
  docxPackage,
  docxPatchFiles,
  prepareDocxWorkspace,
  stableVersion
} from './lib/docx-release-state.mjs'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const runtimePath = 'packages/core/src/platform/assets.ts'
const factsPaths = [
  'apps/official-site/public/llms.txt',
  'apps/official-site/public/llms-full.txt',
  'docs/guide/faq.md',
  'docs/zh/guide/faq.md'
]
export const docxReleasePaths = [
  docxManifestPath,
  runtimePath,
  'pnpm-workspace.yaml',
  ...factsPaths,
  'pnpm-lock.yaml'
]

export function prepareDocxTexts(texts, version) {
  assert.match(
    version || '',
    stableVersion,
    'Pass an exact published stable DOCX version, not a range, URL or tag'
  )
  const manifest = JSON.parse(texts[docxManifestPath])
  const previous = manifest.dependencies[docxPackage]
  assert.match(previous, stableVersion)
  const result = { ...texts }
  manifest.dependencies[docxPackage] = version
  result[docxManifestPath] = JSON.stringify(manifest, null, 2) + '\n'
  const runtime = /DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION\s*=\s*(['"])([^'"]+)\1/.exec(
    texts[runtimePath]
  )
  assert.ok(
    runtime && (runtime[2] === previous || runtime[2].startsWith(`${previous}+compat.`)),
    'Core Worker provenance differs from the Word package'
  )
  result[runtimePath] = texts[runtimePath].replace(
    runtime[0],
    `DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '${version}'`
  )
  const workspace = prepareDocxWorkspace(texts['pnpm-workspace.yaml'], version)
  result['pnpm-workspace.yaml'] = workspace.text
  const deletedPaths = new Set(workspace.patchPaths)
  for (const path of Object.keys(texts)) {
    if (
      path === docxCompatibilityPath ||
      /^patches\/@file-viewer__docx@\d+\.\d+\.\d+\.patch$/.test(path)
    )
      deletedPaths.add(path)
  }
  assertDocxPatchDeletions(texts['pnpm-workspace.yaml'], [...deletedPaths])
  for (const path of deletedPaths) delete result[path]
  for (const path of factsPaths) {
    const references = [
      `@file-viewer/docx@${previous}`,
      `file-viewer-docx=${previous}`,
      `@file-viewer/docx\` ${previous}`
    ]
    assert.ok(
      references.some((reference) => texts[path].includes(reference)),
      `Missing current DOCX version reference in ${path}`
    )
    result[path] = references.reduce(
      (text, reference) => text.replaceAll(reference, reference.replace(previous, version)),
      texts[path]
    )
  }
  return { previous, result, deletedPaths: [...deletedPaths] }
}

function commandRunner(root) {
  return (command, args, capture = false) => {
    const executable =
      process.platform === 'win32' && ['npm', 'pnpm'].includes(command) ? command + '.cmd' : command
    const result = spawnSync(executable, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
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
}

async function snapshot(root, paths) {
  const files = new Map()
  for (const path of paths) {
    await assertSafeSourcePath(root, path)
    try {
      files.set(path, {
        bytes: await readFile(resolve(root, path)),
        mode: (await lstat(resolve(root, path))).mode
      })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      files.set(path, null)
    }
  }
  return files
}

async function replaceFile(root, path, bytes, mode) {
  await assertSafeSourcePath(root, path)
  const target = resolve(root, path)
  const temporary = `${target}.release-${randomUUID()}.tmp`
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode })
    await rename(temporary, target)
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function prepareDocxRelease({
  root = defaultRoot,
  version,
  run = commandRunner(root)
}) {
  assert.match(version || '', stableVersion, 'Pass an exact published stable DOCX version')
  const workspace = await readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
  const patchPaths = prepareDocxWorkspace(workspace, version).patchPaths
  const patchFiles = await docxPatchFiles(root)
  const paths = [
    ...new Set([...docxReleasePaths, docxCompatibilityPath, ...patchPaths, ...patchFiles])
  ]
  const original = await snapshot(root, paths)
  assert.equal(
    original.get('pnpm-workspace.yaml')?.bytes.toString('utf8'),
    workspace,
    'Workspace changed while taking the release snapshot; retry from the current source'
  )
  for (const path of [...docxReleasePaths, ...patchPaths])
    assert.ok(original.get(path), `Missing release source: ${path}`)
  assert.equal(
    (await run('git', ['status', '--porcelain', '--', ...paths], true)).trim(),
    '',
    'Commit or stash release metadata edits before updating DOCX'
  )
  // Registry presence is checked before any source write. This never publishes.
  const actual = JSON.parse(
    await run(
      'npm',
      [
        'view',
        `${docxPackage}@${version}`,
        'version',
        '--json',
        '--registry=https://registry.npmjs.org/'
      ],
      true
    )
  )
  assert.equal(actual, version, 'The requested upstream version is not published')
  const texts = Object.fromEntries(
    [...original]
      .filter(([, value]) => value)
      .map(([path, value]) => [path, value.bytes.toString('utf8')])
  )
  const { previous, result, deletedPaths } = prepareDocxTexts(texts, version)
  // Registry I/O may take time. Reject concurrent edits before any writes and
  // outside the rollback handler, so another editor's new bytes stay intact.
  assert.deepEqual(
    await docxPatchFiles(root),
    patchFiles,
    'DOCX patch files changed during registry lookup; retry from the current source'
  )
  assert.deepEqual(
    await snapshot(root, paths),
    original,
    'Release source changed during registry lookup; retry from the current source'
  )
  try {
    // Sequential atomic writes ensure rollback cannot race outstanding writes.
    for (const [path, text] of Object.entries(result)) {
      if (path !== 'pnpm-lock.yaml') await replaceFile(root, path, text, original.get(path)?.mode)
    }
    for (const path of deletedPaths) {
      await assertSafeSourcePath(root, path)
      await rm(resolve(root, path), { force: true })
    }
    await run('pnpm', ['install', '--lockfile-only', '--ignore-scripts'])
    await run('pnpm', ['install', '--frozen-lockfile'])
    await run(process.execPath, ['.github/scripts/verify-docx-distribution.mjs', '--published'])
    await run(process.execPath, ['.github/scripts/verify-docx-upstream.mjs'])
    await run(process.execPath, ['.github/scripts/verify-public-release-facts.mjs'])
  } catch (error) {
    const restored = await Promise.allSettled(
      [...original].map(async ([path, saved]) => {
        if (saved) await replaceFile(root, path, saved.bytes, saved.mode)
        else {
          await assertSafeSourcePath(root, path)
          await rm(resolve(root, path), { force: true })
        }
      })
    )
    const failures = restored
      .filter((entry) => entry.status === 'rejected')
      .map((entry) => entry.reason)
    if (failures.length)
      throw new AggregateError(
        [error, ...failures],
        'DOCX preparation failed and source rollback was incomplete; inspect the listed paths before continuing'
      )
    throw new Error(
      'DOCX preparation failed; all release source files and patch distributions were restored. Run pnpm install --frozen-lockfile to restore installed dependencies.',
      { cause: error }
    )
  }
  return { previous, version, deletedPaths }
}

async function main() {
  assert.equal(process.argv.length, 3, 'Usage: pnpm release:prepare-docx <published-version>')
  const { previous, version } = await prepareDocxRelease({ version: process.argv[2] })
  console.log(
    `[release-docx] ${previous} -> ${version}; manifest, lockfile, Worker provenance and current documentation synchronized. DOCX patches and compatibility metadata removed; installed distribution matches the ordinary registry package. Installed-engine and public-release-fact checks passed. Run the relevant original-file browser gate and the normal frozen release rehearsal, then commit the changes. Nothing was published.`
  )
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
