import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPackedIssueConsumer } from './build-packed-issue-consumer.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const packages = process.env.PACKED_ISSUE_PACKAGE_DIR
  ? resolve(process.env.PACKED_ISSUE_PACKAGE_DIR)
  : resolve(root, 'output/packed-issue-candidates', new Date().toISOString().replaceAll(':', '-'))
const workspaceClosureArgs = [
  '--recursive',
  '--workspace-concurrency=1',
  '--filter',
  '@file-viewer/vue3...',
  '--filter',
  '@file-viewer/web...',
  '--filter',
  '@file-viewer/react-full...',
  '--filter',
  '@file-viewer/preset-office...',
  '--filter',
  'file-viewer-copy-assets'
]

if (!process.env.PACKED_ISSUE_PACKAGE_DIR) {
  await mkdir(packages, { recursive: true })
  // A standalone run must not pack ignored, stale dist files. A release
  // rehearsal instead supplies frozen tarballs and never rebuilds or repacks.
  execFileSync('pnpm', [...workspaceClosureArgs, 'build'], {
    cwd: root,
    stdio: 'inherit'
  })
  execFileSync(
    'pnpm',
    [
      ...workspaceClosureArgs,
      'pack',
      '--pack-destination',
      packages
    ],
    { cwd: root, stdio: 'inherit', env: { ...process.env, npm_config_ignore_scripts: 'true' } }
  )
}
const project = await buildPackedIssueConsumer(packages)
execFileSync(
  process.execPath,
  [resolve(root, 'apps/component-demo/scripts/verify-packed-issue-regressions.mjs')],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PACKED_ISSUE_CONSUMER_DIR: project }
  }
)
execFileSync(
  process.execPath,
  [resolve(root, 'apps/component-demo/scripts/verify-angular-pptx-consumer.mjs')],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PACKED_ISSUE_PACKAGE_DIR: packages }
  }
)
