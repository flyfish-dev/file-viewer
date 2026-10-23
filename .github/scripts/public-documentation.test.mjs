import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertPublicDocumentationCommands,
  isPathAtOrBelow,
  pnpmCommandsInMarkdown,
  publicWrapperManifest
} from './lib/public-documentation.mjs'

test('public documentation rejects unavailable maintainer commands and notices', () => {
  const scripts = { 'verify:browser-smoke': 'node smoke.mjs' }
  assert.doesNotThrow(() =>
    assertPublicDocumentationCommands('pnpm verify:browser-smoke', scripts, 'guide')
  )
  assert.throws(
    () => assertPublicDocumentationCommands('pnpm verify:offline-assets', scripts, 'guide'),
    /unavailable public command/
  )
  assert.throws(
    () =>
      assertPublicDocumentationCommands(
        '<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->',
        scripts,
        'guide'
      ),
    /stale maintainer notice/
  )
})

test('a private file exclusion is exact and a directory exclusion includes descendants', () => {
  assert(isPathAtOrBelow('BRANCHES.md', 'BRANCHES.md'))
  assert(isPathAtOrBelow('docs/regressions/evidence/a.json', 'docs/regressions'))
  assert(!isPathAtOrBelow('docs/regressions-guide.md', 'docs/regressions'))
})

test('command extraction excludes prose and shell comments without joining lines', () => {
  const markdown =
    'pnpm optional peer metadata\n```bash\n# Keep using pnpm\nrm -rf node_modules\npnpm test\n```\nUse `pnpm verify:offline-assets`.'
  assert.deepEqual(pnpmCommandsInMarkdown(markdown), ['test', 'verify:offline-assets'])
})

test('public package mappings omit only private core metadata and preserve every package', () => {
  const original = {
    corePackage: {
      packageName: '@file-viewer/core',
      aggregateRepository: 'private-source',
      note: 'internal',
      releaseVersion: '3.2.2'
    },
    wrappers: [{ packageName: '@file-viewer/web', packageDir: 'packages/components/web' }]
  }
  const projected = publicWrapperManifest(original)
  assert.deepEqual(projected.corePackage, {
    packageName: '@file-viewer/core',
    releaseVersion: '3.2.2'
  })
  assert.deepEqual(projected.wrappers, original.wrappers)
  assert.equal(original.corePackage.aggregateRepository, 'private-source')
})
