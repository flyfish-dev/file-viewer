import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { verifySourceRetention } from '../../packages/build-support/source-retention.mjs'
import { verifyPublicDocumentation } from './lib/public-documentation.mjs'

const root = resolve(import.meta.dirname, '../..')
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
assert.equal(packageJson.name, '@flyfish-group/file-viewer-open-source')
const required = [
  'packages/core/src/index.ts',
  'packages/renderers/pdf/src/pdf.ts',
  'packages/renderers/word/src/index.ts',
  'packages/renderers/spreadsheet/src/spreadsheet/chartRenderer.ts',
  'packages/thumbnail/src/index.ts',
  'packages/build-support/build-browser-runtime.mjs',
  'apps/viewer-demo/package.json',
  'apps/component-demo/package.json',
  'docs/guide/faq.md',
  'test/core-options.spec.ts',
  'examples/vanilla-vite/package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml'
]
for (const path of required) assert(existsSync(join(root, path)), `Missing project source: ${path}`)
for (const framework of [
  'web',
  'vue3',
  'vue2.6',
  'vue2.7',
  'react',
  'react-legacy',
  'svelte',
  'jquery'
]) {
  assert(
    existsSync(join(root, 'packages/components', framework, 'src')),
    `Missing ${framework} component source`
  )
}
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 })
  .toString()
  .split('\0')
  .filter(Boolean)
const inventory = readFileSync(join(root, 'ecosystem/source-retention.json'))
assert.equal(
  createHash('sha256').update(inventory).digest('hex'),
  'a3a40af14e4de99826a089cf10ccae78a1c9a0e2ca4e2cfefe2a5a4b440ee2d6',
  'Source retention policy changed; review the complete baseline and each removal'
)
const policy = JSON.parse(inventory)
assert.equal(policy.schemaVersion, 1)
assert.equal(policy.baselineCommit, '7bb5e683784735d5ff6b8eb5ebcd4b98ffed8db3')
const retention = await verifySourceRetention({ root, tracked, policy })
const documentation = verifyPublicDocumentation(root, packageJson.scripts)
for (const path of tracked) {
  assert(!path.split('/').includes('.build'), `Local build receipt is tracked: ${path}`)
  assert(
    !/^(?:apps\/chrome-extension|\.release|\.agents|\.codex|\.aws|node_modules)(?:\/|$)/.test(path),
    `Private local material is tracked: ${path}`
  )
  if (/(?:^|\/)\.env(?:\.|$)/.test(path)) {
    assert(
      path.startsWith('examples/vue2.6-cli3-office/.env.'),
      `Private environment file is tracked: ${path}`
    )
    const allowed = new Set([
      'VUE_APP_PREVIEW_API=',
      'VUE_APP_PREVIEW_API=/api',
      'VUE_APP_PUBLIC_PATH=./',
      'NODE_ENV=production'
    ])
    const lines = readFileSync(join(root, path), 'utf8').trim().split(/\r?\n/)
    assert(
      lines.length >= 2 && lines.length <= 3 && lines.every((line) => allowed.has(line)),
      'Public CLI3 examples may contain only documented relative paths and build modes'
    )
  }
}
assert(
  !existsSync(join(root, '.github/runtime-distribution.json')),
  'An artifact-only control-tree policy cannot replace project source'
)
console.log(
  JSON.stringify({
    status: 'verified-complete-open-source-layout',
    trackedFiles: tracked.length,
    requiredSourceEntries: required.length,
    ...documentation,
    ...retention
  })
)
