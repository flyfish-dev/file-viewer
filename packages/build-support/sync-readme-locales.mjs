import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { readmeLanguageLinks } from './readme-locales.mjs'

// This contributor command works in both canonical and public source checkouts;
// it only needs the public package catalog, never release receipts or credentials.
const root = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
assert(args.every(arg => ['--check', '--migrate'].includes(arg)) && new Set(args).size === args.length,
  'Usage: node packages/build-support/sync-readme-locales.mjs [--check | --migrate]')
assert(!(args.includes('--check') && args.includes('--migrate')), 'Migration and check are separate operations')
const catalog = JSON.parse(await readFile(join(root, 'ecosystem/wrappers.json'), 'utf8'))
const entries = [{ packageDir: 'packages/core' },
  ...['utilityPackages', 'renderers', 'presets', 'compatibilityPackages', 'wrappers']
    .flatMap(group => catalog[group] || [])]
assert.equal(new Set(entries.map(entry => entry.packageDir)).size, entries.length,
  'README catalog contains duplicate package directories')
for (const { packageDir } of entries) {
  assert(typeof packageDir === 'string' && packageDir.startsWith('packages/') &&
    !packageDir.includes('\\') && packageDir.split('/').every(part => part && part !== '.' && part !== '..'),
  'README catalog packageDir must stay within packages/')
}
let changed = 0
for (const entry of entries) {
  const read = name => readFile(join(root, entry.packageDir, name), 'utf8')
  const current = await read('README.md')
  let chinese
  let migrating = false
  try { chinese = await read('README.zh-CN.md') } catch (error) {
    if (error.code !== 'ENOENT' || !args.includes('--migrate')) throw error
    chinese = current
    migrating = true
  }
  const english = readmeLanguageLinks(migrating ? await read('README.en.md') : current, entry.packageDir)
  const documents = { 'README.md': english, 'README.en.md': english,
    'README.zh-CN.md': readmeLanguageLinks(chinese, entry.packageDir) }
  for (const [name, content] of Object.entries(documents)) {
    const before = await read(name).catch(error => {
      if (error.code !== 'ENOENT') throw error
      return undefined
    })
    if (before === content) continue
    assert(!args.includes('--check'), `${entry.packageDir}/${name} is out of sync; run pnpm docs:packages:sync`)
    await writeFile(join(root, entry.packageDir, name), content)
    changed++
  }
  const manifestPath = join(root, entry.packageDir, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (Array.isArray(manifest.files) && !manifest.files.includes('README.zh-CN.md')) {
    assert(!args.includes('--check'), `${entry.packageDir}/package.json must include the Chinese README`)
    manifest.files.push('README.zh-CN.md')
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    changed++
  }
}
console.log(`Verified ${entries.length} packages: English default, English compatibility alias and complete Chinese README; ${changed} files updated.`)
