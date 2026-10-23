import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { sanitizeOfflineAssetText, sanitizeOfflineViewerAssetTree } from '../scripts/offline-asset-sanitize.mjs'

test('preserves selected CDN hostname comparisons while localizing actual runtime fallbacks and Draw.io paths', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'file-viewer-offline-sanitizer-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const file = join(directory, 'runtime.js')
  await writeFile(file, `
const selected = url.hostname === 'unpkg.com';
const minified = url.hostname==="unpkg.com";
const fallback = 'https://unpkg.com/runtime.js';
const bareFallbackHost = 'unpkg.com';
const styles = 'https://viewer.diagrams.net/styles/default.xml';
const stencils = 'https://viewer.diagrams.net/stencils/general.xml';
`)
  const result = await sanitizeOfflineViewerAssetTree(directory)
  const actual = await readFile(file, 'utf8')
  assert.match(actual, /url\.hostname === 'unpkg\.com'/)
  assert.match(actual, /url\.hostname==="unpkg\.com"/)
  assert.match(actual, /fallback = 'file-viewer-offline-cdn\/runtime\.js'/)
  assert.match(actual, /bareFallbackHost = 'file-viewer-offline-cdn'/)
  assert.match(actual, /styles = '\.\/styles\/default\.xml'/)
  assert.match(actual, /stencils = '\.\/stencils\/general\.xml'/)
  assert.doesNotMatch(actual, /https:\/\/unpkg\.com|https:\/\/viewer\.diagrams\.net|\$1/)
  assert.ok(result.replacementCount >= 4)
  assert.equal((await sanitizeOfflineViewerAssetTree(directory)).replacementCount, 0)
})

test('demo opt-in retains exact product navigation while localizing runtime resource URLs', () => {
  const source = `const zh='https://file-viewer.app/';const en="https://file-viewer.app/en/";
const asset='https://file-viewer.app/en/runtime.wasm';const worker='https://demo.file-viewer.app/worker.js';
const docs='https://doc.file-viewer.app/';const suffix='https://file-viewer.app/en/?runtime=1';`
  const strict = sanitizeOfflineAssetText(source, '/tmp/runtime.js').output
  assert.doesNotMatch(strict, /https:\/\/(?:demo\.|doc\.)?file-viewer\.app/)
  const demo = sanitizeOfflineAssetText(source, '/tmp/runtime.js', { preserveProductNavigation: true }).output
  assert.match(demo, /zh='https:\/\/file-viewer\.app\/'/)
  assert.match(demo, /en="https:\/\/file-viewer\.app\/en\/"/)
  assert.match(demo, /asset='\.\/en\/runtime\.wasm'/)
  assert.match(demo, /worker='\.\/worker\.js'/)
  assert.doesNotMatch(demo, /https:\/\/(?:demo\.|doc\.)file-viewer\.app/)
  assert.doesNotMatch(demo, /https:\/\/file-viewer\.app\/en\/\?runtime/)
})
