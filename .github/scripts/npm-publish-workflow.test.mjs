import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import './download-npm-release-assets.test.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const workflowPath = join(scriptsDir, '..', 'workflows', 'npm-publish.yml')

test('manual publishing checks out the dispatcher SHA while release events use the immutable tag', async () => {
  const workflow = await readFile(workflowPath, 'utf8')
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(
    workflow,
    /ref: \$\{\{ github\.event_name == 'workflow_dispatch' && github\.sha \|\| github\.event\.release\.tag_name \}\}/
  )
  assert.match(
    workflow,
    /FILE_VIEWER_RELEASE_TAG: \$\{\{ github\.event\.release\.tag_name \|\| inputs\.release_tag \}\}/
  )
})

test('supplemental publishing uses the same trusted workflow and exact manifest asset selection', async () => {
  const workflow = await readFile(workflowPath, 'utf8')
  assert.match(workflow, /manifest_asset:/)
  assert.match(workflow, /npm-legacy-web-release-manifest\.json/)
  assert.match(workflow, /run: node \.github\/scripts\/download-npm-release-assets\.mjs/)
  assert.match(
    workflow,
    /FILE_VIEWER_RELEASE_MANIFEST: \$\{\{ inputs\.manifest_asset \|\| 'npm-release-manifest\.json' \}\}/
  )
  assert.doesNotMatch(workflow, /--pattern '\*\.tgz'/)
})
