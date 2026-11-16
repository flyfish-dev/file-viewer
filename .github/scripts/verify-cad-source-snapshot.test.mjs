import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./verify-cad-source-snapshot.mjs', import.meta.url))
for (const [commit, version, revision, error] of [
  ['main', '3.3.3', '', /immutable source commit/],
  ['a'.repeat(40), '../../outside', '', /explicit source version/],
  ['a'.repeat(40), '3.3.4', '../../outside', /safe CAD source revision/],
  ['a'.repeat(40), '3.3.4', 'r1/', /safe CAD source revision/]
]) {
  test(`source snapshot rejects ${commit}/${version}/${revision} before side effects`, () => {
    const root = mkdtempSync(join(tmpdir(), 'cad-source-dispatch-'))
    const cache = join(root, 'cache')
    try {
      const result = spawnSync(process.execPath, [script], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10_000,
        env: {
          ...process.env,
          CAD_SOURCE_COMMIT: commit,
          CAD_SOURCE_VERSION: version,
          CAD_SOURCE_REVISION: revision,
          FILE_VIEWER_SOURCE_CACHE: cache
        }
      })
      assert.equal(result.status, 1)
      assert.match(result.stderr, error)
      assert.equal(existsSync(cache), false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
}
