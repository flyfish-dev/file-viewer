import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPackedIssueConsumer } from './build-packed-issue-consumer.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const packages = process.env.PACKED_ISSUE_PACKAGE_DIR
  ? resolve(process.env.PACKED_ISSUE_PACKAGE_DIR)
  : resolve(root, 'output/packed-issue-candidates', new Date().toISOString().replaceAll(':', '-'))

if (!process.env.PACKED_ISSUE_PACKAGE_DIR) {
  await mkdir(packages, { recursive: true })
  // CI packs the built dependency closure. Release rehearsal instead supplies
  // its frozen tarball directory, so that path never rebuilds or repacks it.
  execFileSync(
    'pnpm',
    [
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
      'file-viewer-copy-assets',
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
