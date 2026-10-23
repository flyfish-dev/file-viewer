import assert from 'node:assert/strict'
import test from 'node:test'
import { packageReadmeHeader, readmeLanguageLinks } from './readme-locales.mjs'

test('language synchronization preserves maintained content and is idempotent', () => {
  const header = '<!-- FILE_VIEWER_PACKAGE_HEADER -->\n<p>Badge and screenshot</p>\n\n> ⭐ Maintained project link.\n'
  const original = '# @example/full\n\n' + header + '\nDescription.\n\n```bash\nnpm install @example/full\n```\n'
  const result = readmeLanguageLinks(original, 'packages/example')
  assert.equal(packageReadmeHeader(result), header.trimEnd())
  assert.ok(result.endsWith('Description.\n\n```bash\nnpm install @example/full\n```\n'))
  assert.ok(result.includes('/packages/example/README.zh-CN.md'))
  assert.equal(readmeLanguageLinks(result, 'packages/example'), result)
  assert.throws(() => packageReadmeHeader('# Name\n<!-- FILE_VIEWER_PACKAGE_HEADER -->\nunknown'), /safely preserve/)
})
