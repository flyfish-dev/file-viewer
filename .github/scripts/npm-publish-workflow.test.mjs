import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const workflows = join(dirname(fileURLToPath(import.meta.url)), '..', 'workflows')

test('manual npm publisher recovery checks out its reviewed workflow revision', async () => {
  const workflow = await readFile(join(workflows, 'npm-publish.yml'), 'utf8')
  assert.match(
    workflow,
    /ref: \$\{\{ github\.event_name == 'workflow_dispatch' && github\.sha \|\| github\.event\.release\.tag_name \}\}/
  )
})
