import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const manifestPath = 'packages/renderers/word/package.json'
const factsPaths = [
  'apps/official-site/public/llms.txt',
  'apps/official-site/public/llms-full.txt',
  'docs/guide/faq.md',
  'docs/zh/guide/faq.md'
]
export function prepareDocxTexts(texts, version) {
  assert.match(
    version,
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
    'Pass an exact published stable DOCX version, not a range, URL or tag'
  )
  const manifest = JSON.parse(texts[manifestPath])
  const previous = manifest.dependencies['@file-viewer/docx']
  assert.match(previous, /^\d+\.\d+\.\d+$/)
  const result = { ...texts }
  manifest.dependencies['@file-viewer/docx'] = version
  result[manifestPath] = JSON.stringify(manifest, null, 2) + '\n'
  const path = 'packages/core/src/platform/assets.ts'
  const before = `DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '${previous}'`
  assert.ok(texts[path].includes(before), 'Core Worker provenance differs from the Word package')
  result[path] = texts[path].replace(
    before,
    `DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '${version}'`
  )
  result['pnpm-workspace.yaml'] = texts['pnpm-workspace.yaml'].replace(
    `'@file-viewer/docx@${previous}'`,
    `'@file-viewer/docx@${version}'`
  )
  for (const path of factsPaths) {
    result[path] = texts[path]
      .replaceAll(`@file-viewer/docx@${previous}`, `@file-viewer/docx@${version}`)
      .replaceAll(`file-viewer-docx=${previous}`, `file-viewer-docx=${version}`)
      .replaceAll(`@file-viewer/docx\` ${previous}`, `@file-viewer/docx\` ${version}`)
    assert.notEqual(result[path], texts[path], `Missing current DOCX version reference in ${path}`)
  }
  return { previous, result }
}
function run(command, args, capture = false) {
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
async function main() {
  const version = process.argv[2]
  assert.equal(process.argv.length, 3, 'Usage: pnpm release:prepare-docx <published-version>')
  assert.match(version || '', /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  const paths = [
    manifestPath,
    'packages/core/src/platform/assets.ts',
    'pnpm-workspace.yaml',
    ...factsPaths,
    'pnpm-lock.yaml'
  ]
  assert.equal(
    run('git', ['status', '--porcelain', '--', ...paths], true).trim(),
    '',
    'Commit or stash release metadata edits before updating DOCX'
  )
  // Registry presence is checked before touching source files. This never publishes.
  const actual = JSON.parse(
    run(
      'npm',
      [
        'view',
        `@file-viewer/docx@${version}`,
        'version',
        '--json',
        '--registry=https://registry.npmjs.org/'
      ],
      true
    )
  )
  assert.equal(actual, version, 'The requested upstream version is not published')
  const texts = Object.fromEntries(
    await Promise.all(
      paths.map(async (path) => [path, await readFile(resolve(root, path), 'utf8')])
    )
  )
  const current = JSON.parse(texts[manifestPath]).dependencies['@file-viewer/docx']
  if (current === version) {
    run(process.execPath, ['.github/scripts/verify-docx-upstream.mjs'])
    return
  }
  const { previous, result } = prepareDocxTexts(texts, version)
  try {
    await Promise.all(
      Object.entries(result)
        .filter(([path]) => path !== 'pnpm-lock.yaml')
        .map(([path, text]) => writeFile(resolve(root, path), text))
    )
    run('pnpm', ['install', '--lockfile-only', '--ignore-scripts'])
    run('pnpm', ['install', '--frozen-lockfile'])
    run(process.execPath, ['.github/scripts/verify-docx-upstream.mjs'])
    run(process.execPath, ['.github/scripts/verify-public-release-facts.mjs'])
    console.log(
      `[release-docx] ${previous} -> ${version}; manifest, lockfile, Worker provenance and current documentation synchronized. Run pnpm release:verify, then commit the changes. Nothing was published.`
    )
  } catch (error) {
    await Promise.all(
      Object.entries(texts).map(([path, text]) => writeFile(resolve(root, path), text))
    )
    console.error(
      '[release-docx] Source metadata restored after failure. Run pnpm install --frozen-lockfile to restore installed dependencies.'
    )
    throw error
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
