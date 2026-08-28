import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  createFileViewerCarrierCommand,
  createFileViewerRegistryEnvironment,
  detectYarnGeneration,
} from '../dist/carrier-command.js'

const packageSpec = 'file-viewer-copy-assets@2.4.0'
const payloadCases = [
  ['--help'],
  ['--version'],
  ['public/file-viewer'],
  ['public/file-viewer', '--renderers', 'pdf,office-word-openxml'],
  ['public/file-viewer', '--clean', '--confirm'],
]

test('on-demand carrier commands preserve the legacy payload for npm, pnpm, Yarn Berry, Yarn Classic, and Bun', () => {
  for (const passthrough of payloadCases) {
    const plans = [
      createFileViewerCarrierCommand('npm', packageSpec, passthrough, { projectRoot: '/tmp' }),
      createFileViewerCarrierCommand('pnpm', packageSpec, passthrough, { projectRoot: '/tmp' }),
      createFileViewerCarrierCommand('yarn', packageSpec, passthrough, { projectRoot: '/tmp', yarnGeneration: 'berry' }),
      createFileViewerCarrierCommand('yarn', packageSpec, passthrough, { projectRoot: '/tmp', yarnGeneration: 'classic' }),
      createFileViewerCarrierCommand('bun', packageSpec, passthrough, { projectRoot: '/tmp' }),
    ]
    for (const plan of plans) assert.deepEqual(plan.args.slice(-passthrough.length), passthrough)
    assert.deepEqual(plans[0], {
      command: 'npm',
      args: ['exec', '--yes', '--package', packageSpec, '--', 'file-viewer-copy-assets', ...passthrough],
      compatibilityMode: 'native',
    })
    assert.deepEqual(plans[1], { command: 'pnpm', args: ['dlx', packageSpec, ...passthrough], compatibilityMode: 'native' })
    assert.deepEqual(plans[2], { command: 'yarn', args: ['dlx', packageSpec, ...passthrough], compatibilityMode: 'native' })
    assert.equal(plans[3].command, 'npm')
    assert.equal(plans[3].compatibilityMode, 'npm-exec-for-yarn-classic')
    assert.deepEqual(plans[4], { command: 'bunx', args: [packageSpec, ...passthrough], compatibilityMode: 'native' })
  }
})

test('Yarn generation comes from packageManager metadata or the Yarn config boundary', async () => {
  const classic = await mkdtemp(join(tmpdir(), 'file-viewer-yarn-classic-'))
  const berry = await mkdtemp(join(tmpdir(), 'file-viewer-yarn-berry-'))
  const berryConfig = await mkdtemp(join(tmpdir(), 'file-viewer-yarn-config-'))
  try {
    await writeFile(join(classic, 'package.json'), JSON.stringify({ packageManager: 'yarn@1.22.22' }))
    await writeFile(join(berry, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.9.2' }))
    await writeFile(join(berryConfig, 'package.json'), '{}')
    await writeFile(join(berryConfig, '.yarnrc.yml'), 'nodeLinker: node-modules\n')
    assert.equal(detectYarnGeneration(classic), 'classic')
    assert.equal(detectYarnGeneration(berry), 'berry')
    assert.equal(detectYarnGeneration(berryConfig), 'berry')
  } finally {
    await Promise.all([classic, berry, berryConfig].map(root => rm(root, { recursive: true, force: true })))
  }
})

test('explicit localhost registries are passed to every supported package manager without credentials', () => {
  assert.deepEqual(createFileViewerRegistryEnvironment('http://127.0.0.1:4873/'), {
    npm_config_registry: 'http://127.0.0.1:4873/',
    YARN_NPM_REGISTRY_SERVER: 'http://127.0.0.1:4873/',
    BUN_CONFIG_REGISTRY: 'http://127.0.0.1:4873/',
  })
})

test('carrier package specs are fail-closed', () => {
  assert.throws(
    () => createFileViewerCarrierCommand('npm', 'other-package@latest', [], { projectRoot: '/tmp' }),
    /Invalid file-viewer-copy-assets package spec/,
  )
})
