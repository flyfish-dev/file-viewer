import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { prepareDocxTexts } from './prepare-docx-upstream.mjs'
const paths = [
  'packages/renderers/word/package.json',
  'packages/core/src/platform/assets.ts',
  'pnpm-workspace.yaml',
  'apps/official-site/public/llms.txt',
  'apps/official-site/public/llms-full.txt',
  'docs/guide/faq.md',
  'docs/zh/guide/faq.md'
]
const texts = Object.fromEntries(
  await Promise.all(paths.map(async (path) => [path, await readFile(path, 'utf8')]))
)
test('upstream update keeps package, Worker provenance and current version facts synchronized', () => {
  const { result, previous } = prepareDocxTexts(texts, '99.88.77')
  assert.match(previous, /^\d+\.\d+\.\d+$/)
  assert.equal(JSON.parse(result[paths[0]]).dependencies['@file-viewer/docx'], '99.88.77')
  assert.match(result[paths[1]], /DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '99.88.77'/)
  for (const path of paths.slice(2)) assert.ok(result[path].includes('99.88.77'), path)
  assert.notEqual(texts[paths[0]], result[paths[0]], 'inputs remain immutable')
})
test('upstream update rejects ranges, URLs, tags and shell syntax', () => {
  for (const value of [
    'latest',
    '^0.3.32',
    'file:./x.tgz',
    '1.2.3;echo bad',
    '1.2.3-rc.1',
    '01.2.3'
  ])
    assert.throws(() => prepareDocxTexts(texts, value))
})
test('mismatched Worker version fails instead of changing unrelated release facts', () => {
  assert.throws(
    () => prepareDocxTexts({ ...texts, [paths[1]]: '' }, '99.88.77'),
    /Worker provenance/
  )
})
test('a compatibility cache suffix is accepted only for the exact installed engine', () => {
  const previous = JSON.parse(texts[paths[0]]).dependencies['@file-viewer/docx']
  const withRuntime = (runtime) => ({
    ...texts,
    [paths[1]]: `export const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION =\n  '${runtime}';`
  })
  const prepared = prepareDocxTexts(withRuntime(`${previous}+compat.sections`), '99.88.77')
  assert.match(prepared.result[paths[1]], /DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '99.88.77'/)
  const doubleQuoted = {
    ...texts,
    [paths[1]]: `export const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = "${previous}+compat.sections";`
  }
  assert.match(
    prepareDocxTexts(doubleQuoted, '99.88.77').result[paths[1]],
    /DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '99.88.77'/
  )
  assert.throws(
    () => prepareDocxTexts(withRuntime('99.99.99+compat.sections'), '99.88.77'),
    /Worker provenance/
  )
})

// Small public fixtures exercise the complete transaction without installing or
// publishing any engine, or carrying an owning repository's implementation.
const { mkdtemp, mkdir, writeFile, rm, readdir, symlink } = await import('node:fs/promises')
const { tmpdir } = await import('node:os')
const { dirname, join } = await import('node:path')
const { prepareDocxRelease, docxReleasePaths } = await import('./prepare-docx-upstream.mjs')
const { docxCompatibilityPath, docxPatchEntries, prepareDocxWorkspace } =
  await import('./lib/docx-release-state.mjs')
const oldVersion = '0.3.33'
const nextVersion = '0.3.34'
const patchPath = `patches/@file-viewer__docx@${oldVersion}.patch`
const pptPatchPath = 'patches/@file-viewer__ppt@0.3.4.patch'
const otherPatchPath = 'patches/illustrator-pgf@0.1.0.patch'
const workspaceFixture = `minimumReleaseAgeExclude:
  - '@file-viewer/docx@${oldVersion}'
  - 'styled-exceljs@0.21.6'

patchedDependencies:
  '@file-viewer/docx@${oldVersion}': ${patchPath}
  '@file-viewer/ppt@0.3.4': ${pptPatchPath}
  illustrator-pgf@0.1.0: ${otherPatchPath}
`
function fixtureTexts() {
  return {
    [paths[0]]:
      JSON.stringify(
        { dependencies: { '@file-viewer/docx': oldVersion, jszip: '3.10.2' } },
        null,
        2
      ) + '\n',
    [paths[1]]: `export const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '${oldVersion}+compat.source.reviewed'\n`,
    'pnpm-workspace.yaml': workspaceFixture,
    [paths[3]]: `DOCX: \`@file-viewer/docx\` ${oldVersion}\n`,
    [paths[4]]: `DOCX: \`@file-viewer/docx\` ${oldVersion}\n`,
    [paths[5]]: `@file-viewer/docx@${oldVersion}; file-viewer-docx=${oldVersion}\n`,
    [paths[6]]: `@file-viewer/docx@${oldVersion}; file-viewer-docx=${oldVersion}\n`,
    'pnpm-lock.yaml': 'original locked dependency graph\n',
    [patchPath]: 'public DOCX patch fixture\n',
    [docxCompatibilityPath]: JSON.stringify({ package: '@file-viewer/docx', version: oldVersion }),
    [pptPatchPath]: 'preserve the PPT patch exactly\n',
    [otherPatchPath]: 'preserve this unrelated patch exactly\n',
    'docs/regressions/evidence/historical.json': '{"version":"0.3.33","historical":true}\n'
  }
}
async function project(t, fixture = fixtureTexts()) {
  const root = await mkdtemp(join(tmpdir(), 'docx-preparation-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const [path, text] of Object.entries(fixture)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  return { root, fixture }
}
async function assertOriginal(root, fixture) {
  for (const [path, text] of Object.entries(fixture))
    assert.equal(await readFile(join(root, path), 'utf8'), text, path)
  const leftovers = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.includes('.release-')) leftovers.push(entry.name)
      if (entry.isDirectory()) await walk(join(directory, entry.name))
    }
  }
  await walk(root)
  assert.deepEqual(leftovers, [], 'No temporary source writes survive a transaction')
}
function commands(root, { version = nextVersion, failAt, absent = false, dirty = false } = {}) {
  const calls = []
  return {
    calls,
    run: async (command, args) => {
      calls.push([command, args])
      if (command === 'git') return dirty ? ` M ${patchPath}\n` : ''
      if (command === 'npm') {
        if (absent) throw new Error('E404: version not published')
        return JSON.stringify(version)
      }
      const stage = args.includes('--lockfile-only')
        ? 'lockfile'
        : args.includes('--frozen-lockfile')
          ? 'install'
          : args[0].includes('distribution')
            ? 'distribution'
            : args[0].includes('upstream')
              ? 'engine'
              : 'facts'
      if (stage === 'lockfile')
        await writeFile(join(root, 'pnpm-lock.yaml'), 'updated ordinary registry lock\n')
      assert.equal(
        docxPatchEntries(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')).length,
        0
      )
      await assert.rejects(readFile(join(root, patchPath)), { code: 'ENOENT' })
      await assert.rejects(readFile(join(root, docxCompatibilityPath)), { code: 'ENOENT' })
      if (stage === failAt) throw new Error(`injected ${stage} failure`)
      return ''
    }
  }
}

test('workspace migration removes the patch independently of section order and quoting', () => {
  for (const quote of ["'", '"'])
    for (const patchFirst of [false, true]) {
      const parts = workspaceFixture.trimEnd().split('\n\n')
      const workspace =
        (patchFirst ? parts.reverse() : parts).join('\n\n').replaceAll("'", quote) + '\n'
      const { text, patchPaths } = prepareDocxWorkspace(workspace, nextVersion)
      assert.deepEqual(patchPaths, [patchPath])
      assert.equal(
        docxPatchEntries(text).length,
        0,
        'The first-match release-age bug must not survive'
      )
      assert.ok(text.includes(`${quote}@file-viewer/docx@${nextVersion}${quote}`))
      assert.ok(text.includes(`${quote}@file-viewer/ppt@0.3.4${quote}: ${pptPatchPath}`))
      assert.ok(text.includes(`  illustrator-pgf@0.1.0: ${otherPatchPath}\n`))
      assert.ok(!text.includes(patchPath))
    }
})

test('workspace migration accepts quoted patch paths and preserves trailing comments', () => {
  const workspace = workspaceFixture
    .replace(`: ${patchPath}`, `: "${patchPath}" # source candidate`)
    .replace(
      `  - '@file-viewer/docx@${oldVersion}'`,
      `  - "@file-viewer/docx@${oldVersion}" # newest owned engine`
    )
  assert.ok(
    prepareDocxWorkspace(workspace, nextVersion).text.includes(
      `  - "@file-viewer/docx@${nextVersion}" # newest owned engine`
    )
  )
})

test('unsafe or shared patch paths and unsupported YAML fail closed', () => {
  for (const value of [
    '../escape.patch',
    '/tmp/escape.patch',
    pptPatchPath,
    'patches/../escape.patch',
    '{ path: patches/escape.patch }',
    'patches\\escape.patch'
  ]) {
    assert.throws(
      () =>
        prepareDocxWorkspace(workspaceFixture.replace(`: ${patchPath}`, `: ${value}`), nextVersion),
      /Unsafe|Unsupported/
    )
  }
  assert.throws(
    () => prepareDocxWorkspace(workspaceFixture + `  other@1.0.0: ${patchPath}\n`, nextVersion),
    /shared/
  )
  assert.throws(
    () =>
      prepareDocxWorkspace(
        `patchedDependencies: { '@file-viewer/docx@${oldVersion}': '${patchPath}' }\n`,
        nextVersion
      ),
    /block/
  )
  assert.throws(
    () => prepareDocxWorkspace(workspaceFixture + 'patchedDependencies:\n', nextVersion),
    /Duplicate/
  )
})

test('successful preparation removes DOCX compatibility files and preserves all other patches and historical evidence', async (t) => {
  const { root, fixture } = await project(t)
  const stub = commands(root)
  const result = await prepareDocxRelease({ root, version: nextVersion, run: stub.run })
  assert.deepEqual(new Set(result.deletedPaths), new Set([patchPath, docxCompatibilityPath]))
  assert.equal(
    JSON.parse(await readFile(join(root, paths[0]), 'utf8')).dependencies['@file-viewer/docx'],
    nextVersion
  )
  for (const path of paths.slice(1))
    assert.ok((await readFile(join(root, path), 'utf8')).includes(nextVersion), path)
  for (const path of [pptPatchPath, otherPatchPath, 'docs/regressions/evidence/historical.json'])
    assert.equal(await readFile(join(root, path), 'utf8'), fixture[path])
  assert.equal(stub.calls.length, 7)
  assert.deepEqual(
    stub.calls.slice(2).map(([, args]) => args),
    [
      ['install', '--lockfile-only', '--ignore-scripts'],
      ['install', '--frozen-lockfile'],
      ['.github/scripts/verify-docx-distribution.mjs', '--published'],
      ['.github/scripts/verify-docx-upstream.mjs'],
      ['.github/scripts/verify-public-release-facts.mjs']
    ]
  )
})

for (const stage of ['lockfile', 'install', 'distribution', 'engine', 'facts']) {
  test(`a ${stage} failure restores every edited and deleted source byte`, async (t) => {
    const { root, fixture } = await project(t)
    const stub = commands(root, { failAt: stage })
    await assert.rejects(
      prepareDocxRelease({ root, version: nextVersion, run: stub.run }),
      (error) => {
        assert.match(
          error.message,
          /all release source files and patch distributions were restored/
        )
        assert.equal(error.cause.message, `injected ${stage} failure`)
        return true
      }
    )
    await assertOriginal(root, fixture)
  })
}

test('registry absence fails before all writes and installations', async (t) => {
  const { root, fixture } = await project(t)
  const stub = commands(root, { absent: true })
  await assert.rejects(prepareDocxRelease({ root, version: nextVersion, run: stub.run }), /E404/)
  assert.deepEqual(
    stub.calls.map(([command]) => command),
    ['git', 'npm']
  )
  await assertOriginal(root, fixture)
})

test('a mismatched registry response cannot update release facts', async (t) => {
  const { root, fixture } = await project(t)
  await assert.rejects(
    prepareDocxRelease({
      root,
      version: nextVersion,
      run: commands(root, { version: oldVersion }).run
    }),
    /not published/
  )
  await assertOriginal(root, fixture)
})

test('same-version preparation must remove compatibility state and perform every gate', async (t) => {
  const { root } = await project(t)
  const stub = commands(root, { version: oldVersion })
  await prepareDocxRelease({ root, version: oldVersion, run: stub.run })
  assert.equal(
    stub.calls.length,
    7,
    'Same-version requests must never bypass migration verification'
  )
  assert.equal(
    docxPatchEntries(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')).length,
    0
  )
  assert.match(await readFile(join(root, paths[1]), 'utf8'), /VERSION = '0\.3\.33'\n/)
})

test('dirty patch distributions are protected along with the release metadata', async (t) => {
  const { root, fixture } = await project(t)
  const stub = commands(root, { dirty: true })
  await assert.rejects(
    prepareDocxRelease({ root, version: nextVersion, run: stub.run }),
    /Commit or stash/
  )
  assert.equal(stub.calls.length, 1)
  assert.ok(stub.calls[0][1].includes(patchPath))
  assert.ok(stub.calls[0][1].includes(docxCompatibilityPath))
  await assertOriginal(root, fixture)
})

test('orphan DOCX patch distributions are removed but unrelated patch files survive', async (t) => {
  const orphan = 'patches/@file-viewer__docx@0.3.32.patch'
  const { root, fixture } = await project(t, {
    ...fixtureTexts(),
    [orphan]: 'old DOCX distribution\n'
  })
  await prepareDocxRelease({ root, version: nextVersion, run: commands(root).run })
  await assert.rejects(readFile(join(root, orphan)), { code: 'ENOENT' })
  assert.equal(await readFile(join(root, pptPatchPath), 'utf8'), fixture[pptPatchPath])
})

test('symlinked patch files or source parents cannot escape the release transaction', async (t) => {
  const { root } = await project(t)
  const outside = await mkdtemp(join(tmpdir(), 'docx-outside-test-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(join(outside, 'protected.patch'), 'never touch this\n')
  await rm(join(root, patchPath))
  await symlink(join(outside, 'protected.patch'), join(root, patchPath))
  const stub = commands(root)
  await assert.rejects(
    prepareDocxRelease({ root, version: nextVersion, run: stub.run }),
    /symlinks/
  )
  assert.equal(stub.calls.length, 0)
  assert.equal(await readFile(join(outside, 'protected.patch'), 'utf8'), 'never touch this\n')
  await rm(join(root, patchPath))
  await rm(join(root, 'patches'), { recursive: true })
  await symlink(outside, join(root, 'patches'))
  await assert.rejects(
    prepareDocxRelease({ root, version: nextVersion, run: stub.run }),
    /symlinks/
  )
  assert.equal(await readFile(join(outside, 'protected.patch'), 'utf8'), 'never touch this\n')
})

test('a previously clean same-version release still runs registry, installation and verification gates', async (t) => {
  const fixture = fixtureTexts()
  fixture['pnpm-workspace.yaml'] = prepareDocxWorkspace(
    fixture['pnpm-workspace.yaml'],
    oldVersion
  ).text
  delete fixture[patchPath]
  delete fixture[docxCompatibilityPath]
  const { root } = await project(t, fixture)
  const stub = commands(root, { version: oldVersion })
  await prepareDocxRelease({ root, version: oldVersion, run: stub.run })
  assert.equal(stub.calls.length, 7)
})

test('escaped YAML package keys and quoted section names cannot hide DOCX compatibility state', () => {
  const workspace = workspaceFixture
    .replaceAll(`'@file-viewer/docx@${oldVersion}'`, `"\\u0040file-viewer\\/docx@${oldVersion}"`)
    .replace('patchedDependencies:', '"\\u0070atchedDependencies":')
    .replace('minimumReleaseAgeExclude:', "'minimumReleaseAgeExclude':")
  assert.equal(docxPatchEntries(workspace).length, 1)
  const result = prepareDocxWorkspace(workspace, nextVersion)
  assert.deepEqual(result.patchPaths, [patchPath])
  assert.equal(docxPatchEntries(result.text).length, 0)
  assert.ok(result.text.includes(`"@file-viewer/docx@${nextVersion}"`))
  for (const merged of [
    workspaceFixture + '  <<: *hidden\n',
    '<<: *hidden\n' + workspaceFixture,
    workspaceFixture.replace('patchedDependencies:', 'patchedDependencies: *hidden')
  ]) {
    assert.throws(() => prepareDocxWorkspace(merged, nextVersion), /Merged|block/)
  }
  const shared =
    workspaceFixture + `  another@1.0.0: "patches/\\u0040file-viewer__docx@${oldVersion}.patch"\n`
  assert.throws(() => prepareDocxWorkspace(shared, nextVersion), /shared/)
})

test('source changes during registry lookup are rejected without overwriting the newer edit', async (t) => {
  const { root, fixture } = await project(t)
  const stub = commands(root)
  const changedPath = 'docs/guide/faq.md'
  const newText = fixture[changedPath] + 'A concurrent user edit.\n'
  const run = async (command, args) => {
    const result = await stub.run(command, args)
    if (command === 'npm') await writeFile(join(root, changedPath), newText)
    return result
  }
  await assert.rejects(
    prepareDocxRelease({ root, version: nextVersion, run }),
    /Release source changed during registry lookup/
  )
  assert.equal(stub.calls.length, 2)
  await assertOriginal(root, { ...fixture, [changedPath]: newText })
})

test('a new DOCX patch during registry lookup is preserved and blocks a stale transaction', async (t) => {
  const { root, fixture } = await project(t)
  const added = 'patches/@file-viewer__docx@0.3.32.patch'
  const stub = commands(root)
  const run = async (command, args) => {
    const result = await stub.run(command, args)
    if (command === 'npm') await writeFile(join(root, added), 'new concurrent patch\n')
    return result
  }
  await assert.rejects(
    prepareDocxRelease({ root, version: nextVersion, run }),
    /DOCX patch files changed during registry lookup/
  )
  assert.equal(stub.calls.length, 2)
  await assertOriginal(root, { ...fixture, [added]: 'new concurrent patch\n' })
})

test('an orphan DOCX-named file used by another patch is never deleted', async (t) => {
  const orphan = 'patches/@file-viewer__docx@0.3.32.patch'
  const fixture = { ...fixtureTexts(), [orphan]: 'Another package still uses these bytes.\n' }
  fixture['pnpm-workspace.yaml'] += `  another@1.0.0: ${orphan}\n`
  const { root } = await project(t, fixture)
  await assert.rejects(
    prepareDocxRelease({ root, version: nextVersion, run: commands(root).run }),
    /still used by another package/
  )
  await assertOriginal(root, fixture)
})
