import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { browserCoreAliases, browserCorePlugin, browserLibraryDefines, browserRuntimeOptions } from './browser-runtime-options.mjs'

test('browser Core aliases cover exactly the executable public exports in one selected tree', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const manifest = JSON.parse(await readFile(join(root, 'packages/core/package.json'), 'utf8'))
  const names = Object.keys(manifest.exports).filter(name => name !== './package.json')
    .map(name => '@file-viewer/core' + (name === '.' ? '' : name.slice(1)))
  for (const built of [false, true]) {
    const aliases = browserCoreAliases(root, { built })
    assert.equal(aliases.length, names.length)
    for (const name of names) {
      const matches = aliases.filter(alias => alias.find.test(name))
      assert.equal(matches.length, 1, name)
      const entry = name === '@file-viewer/core' ? 'index' : name.split('/').at(-1)
      assert.equal(matches[0].replacement, join(root, 'packages/core', built ? 'dist' : 'src', entry + (built ? '.js' : '.ts')))
    }
    for (const name of ['@file-viewer/core/headless/nested', '@file-viewer/core/private', '@file-viewer/coreish', '@file-viewer/core/package.json']) {
      assert.equal(aliases.filter(alias => alias.find.test(name)).length, 0, name)
    }
  }
})

test('real source Core public entries bundle with a single physical Core identity', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const names = browserCoreAliases(root).map(alias => alias.find.source.replace(/^\^|\$$/g, '').replaceAll('\\/', '/'))
  const result = await build({
    absWorkingDir: root,
    stdin: { contents: names.map((name, index) => `import * as entry${index} from ${JSON.stringify(name)}; console.log(entry${index});`).join('\n'), resolveDir: root },
    plugins: [browserCorePlugin(root)], bundle: true, write: false, metafile: true,
    platform: 'browser', format: 'esm', logLevel: 'silent'
  })
  const coreRoot = join(root, 'packages/core/src')
  const coreInputs = Object.keys(result.metafile.inputs).filter(input => /packages\/core\/(?:src|dist)\//.test(input))
  assert.ok(coreInputs.length >= 6)
  const identities = new Set()
  for (const input of coreInputs) {
    const physical = await realpath(resolve(root, input))
    assert.ok(!relative(coreRoot, physical).startsWith('..'), input)
    assert.ok(!identities.has(physical), `Duplicate Core identity: ${input}`)
    identities.add(physical)
  }
  for (const entry of ['index', 'assets', 'headless', 'browser', 'export', 'print-mask']) {
    assert.ok(identities.has(await realpath(join(coreRoot, entry + '.ts'))), entry)
  }
  await assert.rejects(build({
    absWorkingDir: root, stdin: { contents: 'import "@file-viewer/core/headless/nested"', resolveDir: root },
    plugins: [browserCorePlugin(root)], bundle: true, write: false, logLevel: 'silent'
  }))
})

test('runtime-only browser options preserve original legal comments and source mode defaults', () => {
  assert.deepEqual(browserRuntimeOptions('source'), { minify: false, legalComments: 'eof' })
  assert.deepEqual(browserRuntimeOptions('runtime-only'), { minify: true, legalComments: 'eof' })
})

test('identical dependencies in different physical stores produce identical executable runtime bytes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'browser-runtime-paths-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const outputs = []
  const unminified = []
  for (const name of ['first-private-worktree', 'second-private-worktree']) {
    const project = join(root, 'project-' + name)
    const dependency = join(root, name, 'dependency-store', 'fixture-library')
    await mkdir(join(project, 'node_modules'), { recursive: true })
    await mkdir(dependency, { recursive: true })
    await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: 'fixture-library', version: '1.0.0', main: 'index.cjs' }))
    await writeFile(join(dependency, 'index.cjs'), '/*! Copyright Fixture Author; MIT license. */\nmodule.exports = value => value + 1\n')
    await symlink(dependency, join(project, 'node_modules/fixture-library'))
    const options = { absWorkingDir: project, stdin: { contents: 'import add from "fixture-library"; export const result = add(41)', resolveDir: project },
      bundle: true, platform: 'browser', format: 'cjs', target: 'es2018', write: false }
    outputs.push((await build({ ...options, ...browserRuntimeOptions('runtime-only') })).outputFiles[0].text)
    unminified.push((await build({ ...options, ...browserRuntimeOptions('source') })).outputFiles[0].text)
  }
  assert.notEqual(unminified[0], unminified[1], 'Baseline must reproduce physical path-dependent bytes')
  assert.equal(outputs[0], outputs[1])
  assert.ok(outputs[0].includes('Copyright Fixture Author; MIT license.'))
  assert.ok(!/private-worktree|dependency-store/.test(outputs[0]))
  const module = { exports: {} }
  new Function('module', outputs[0])(module)
  assert.equal(module.exports.result, 42)
})

test('browser SDK URLs keep explicit public configuration without application environment APIs', async () => {
  const contents = `
function environmentPath() { try { return process.env.PUBLIC_URL || undefined } catch { return undefined } }
export function assetBase() { return globalThis.PUBLIC_URL || globalThis.config?.path || environmentPath() || '/' }
`
  const output = (await build({ stdin: { contents }, bundle: true, format: 'cjs',
    platform: 'browser', target: 'es2020', write: false, define: browserLibraryDefines() })).outputFiles[0].text
  assert.doesNotMatch(output, /process\.env\.PUBLIC_URL/)
  for (const [globals, expected] of [[{}, '/'], [{ PUBLIC_URL: '/explicit/' }, '/explicit/'],
    [{ config: { path: '/configured/' } }, '/configured/']]) {
    const module = { exports: {} }
    new Function('globalThis', 'module', 'exports', output)(globals, module, module.exports)
    assert.equal(module.exports.assetBase(), expected)
  }
})
