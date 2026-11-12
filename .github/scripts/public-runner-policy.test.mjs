import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const workflows = new URL('../workflows/', import.meta.url)
const allowed = new Set(['ubuntu-latest', 'ubuntu-24.04', 'ubuntu-24.04-arm'])

for (const name of readdirSync(workflows).filter((name) => /\.ya?ml$/.test(name))) {
  test(`${name} uses standard GitHub-hosted Linux runners only`, () => {
    const source = readFileSync(new URL(name, workflows), 'utf8')
    const selectors = [...source.matchAll(/^\s*runs-on:\s*(.+)$/gm)]
    assert.ok(selectors.length > 0, `${name} has no reviewed runner selection`)
    for (const [, label] of selectors) {
      assert.ok(allowed.has(label.trim()), `${name} selects a nonstandard runner: ${label}`)
    }
  })
}

test('release source evidence uses the disposable hosted runner directory', () => {
  const source = readFileSync(new URL('release-artifacts.yml', workflows), 'utf8')
  assert.match(source, /FILE_VIEWER_SOURCE_CACHE: \$\{\{ runner\.temp \}\}\/source-archives/)
  assert.match(source, /path: \$\{\{ runner\.temp \}\}\/source-archives\//)
  assert.doesNotMatch(source, /\/work\/source-archives/)
})

test('frozen consumers do not depend on a private host provisioning flag', () => {
  const source = readFileSync(new URL('./runtime-ci-consumers.mjs', import.meta.url), 'utf8')
  assert.match(source, /'install',\s*'--with-deps',\s*'chromium',\s*'webkit'/)
  assert.doesNotMatch(source, /ORACLE_FILE_VIEWER_RUNNER/)
})
