import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { prepareDocxTexts } from './prepare-docx-upstream.mjs'
const paths = [
  'packages/renderers/word/package.json',
  'packages/core/src/platform/assets.ts',
  'pnpm-workspace.yaml',
  'apps/official-site/public/llms.txt',
  'apps/official-site/public/llms-full.txt',
  'docs/guide/faq.md',
  'docs/zh/guide/faq.md'
]
const texts = Object.fromEntries(
  await Promise.all(paths.map(async (path) => [path, await readFile(path, 'utf8')]))
)
test('upstream update keeps package, Worker provenance and current version facts synchronized', () => {
  const { result, previous } = prepareDocxTexts(texts, '99.88.77')
  assert.match(previous, /^\d+\.\d+\.\d+$/)
  assert.equal(JSON.parse(result[paths[0]]).dependencies['@file-viewer/docx'], '99.88.77')
  assert.match(
    result[paths[1]],
    /DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = ['"]99.88.77(?:\+compat\.\d{8}\.[a-z0-9.-]+)?['"]/
  )
  for (const path of paths.slice(2)) assert.ok(result[path].includes('99.88.77'), path)
  assert.notEqual(texts[paths[0]], result[paths[0]], 'inputs remain immutable')
})
test('single and double quoted runtime versions preserve reviewed compatibility cache metadata', () => {
  const previous = JSON.parse(texts[paths[0]]).dependencies['@file-viewer/docx']
  for (const quote of ["'", '"']) {
    for (const suffix of ['', '+compat.20260925.axes']) {
      const source = `export const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = ${quote}${previous}${suffix}${quote};`
      const { result } = prepareDocxTexts({ ...texts, [paths[1]]: source }, '99.88.77')
      assert.equal(
        result[paths[1]],
        `export const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = ${quote}99.88.77${suffix}${quote};`
      )
    }
  }
})
test('mismatched bases, duplicate declarations and unknown build metadata fail closed', () => {
  const previous = JSON.parse(texts[paths[0]]).dependencies['@file-viewer/docx']
  for (const version of [
    '1.2.3+compat.20260925.axes',
    `${previous}+unreviewed`,
    `${previous}-rc.1`
  ]) {
    assert.throws(
      () =>
        prepareDocxTexts(
          {
            ...texts,
            [paths[1]]: `const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '${version}';`
          },
          '99.88.77'
        ),
      /Worker provenance/
    )
  }
  const declaration = `const DEFAULT_FILE_VIEWER_DOCX_RUNTIME_VERSION = '${previous}';`
  assert.throws(
    () => prepareDocxTexts({ ...texts, [paths[1]]: declaration + declaration }, '99.88.77'),
    /Worker provenance/
  )
})
test('upstream update rejects ranges, URLs, tags and shell syntax', () => {
  for (const value of [
    'latest',
    '^0.3.32',
    'file:./x.tgz',
    '1.2.3;echo bad',
    '1.2.3-rc.1',
    '01.2.3'
  ])
    assert.throws(() => prepareDocxTexts(texts, value))
})
test('mismatched Worker version fails instead of changing unrelated release facts', () => {
  assert.throws(
    () => prepareDocxTexts({ ...texts, [paths[1]]: '' }, '99.88.77'),
    /Worker provenance/
  )
})
