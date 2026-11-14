import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { entries } from '../apps/viewer-demo/scripts/verify-traditional-chinese-i18n.mjs'

test('catalog extraction retains quoted keys, escaped values and placeholders', () => {
  const source = String.raw`
    'quoted.key': 'It\'s a \\path {count}',
    plain: '繁體中文',
    empty: '',
  `
  assert.deepEqual([...entries(source)], [
    ['quoted.key', String.raw`It\'s a \\path {count}`],
    ['plain', '繁體中文'],
    ['empty', ''],
  ])
})

test('long escaped or unterminated catalog values finish within a bounded subprocess', () => {
  const validator = new URL('../apps/viewer-demo/scripts/verify-traditional-chinese-i18n.mjs', import.meta.url).href
  const code = String.raw`
    import assert from 'node:assert/strict'
    const { entries } = await import(process.argv[1])
    for (const length of [64, 4096, 16384]) {
      const value = '\\&'.repeat(length)
      assert.equal(entries("0:'" + value).size, 0)
      assert.equal(entries("0:'" + value + "'").get('0'), value)
    }
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code, validator], {
    encoding: 'utf8',
    timeout: 5000,
  })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
})
