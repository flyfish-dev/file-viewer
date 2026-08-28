import assert from 'node:assert/strict'
import { test } from 'node:test'

import { normalizeFileViewerConfig, normalizeFileViewerRegistryUrl } from '../dist/index.js'

test('registry URLs reject embedded secrets and insecure remote transport', () => {
  assert.equal(
    normalizeFileViewerRegistryUrl('https://registry.example.test/npm'),
    'https://registry.example.test/npm/'
  )
  assert.equal(normalizeFileViewerRegistryUrl('http://localhost:4873'), 'http://localhost:4873/')
  assert.equal(normalizeFileViewerRegistryUrl('http://127.4.3.2:4873'), 'http://127.4.3.2:4873/')
  assert.equal(normalizeFileViewerRegistryUrl('http://[::1]:4873'), 'http://[::1]:4873/')

  for (const unsafe of [
    'https://user:password@registry.example.test/',
    'https://registry.example.test/?token=do-not-log-this',
    'https://registry.example.test/#credential',
    'http://registry.example.test/'
  ]) {
    assert.throws(
      () => normalizeFileViewerRegistryUrl(unsafe),
      (error) =>
        error instanceof Error &&
        !error.message.includes('do-not-log-this') &&
        !error.message.includes('password')
    )
  }
})

test('asset base URLs reject query secrets, fragments, credentials, and remote HTTP', () => {
  assert.equal(
    normalizeFileViewerConfig({ assetBaseUrl: 'https://cdn.example.test/file-viewer' })
      .assetBaseUrl,
    'https://cdn.example.test/file-viewer/'
  )
  assert.equal(
    normalizeFileViewerConfig({ assetBaseUrl: 'http://127.0.0.1:4173/file-viewer' }).assetBaseUrl,
    'http://127.0.0.1:4173/file-viewer/'
  )
  assert.equal(
    normalizeFileViewerConfig({ assetBaseUrl: '/viewer-assets' }).assetBaseUrl,
    '/viewer-assets/'
  )

  for (const unsafe of [
    'https://cdn.example.test/file-viewer?token=do-not-log-this',
    'https://cdn.example.test/file-viewer#secret',
    'https://user:password@cdn.example.test/file-viewer',
    'http://cdn.example.test/file-viewer'
  ]) {
    assert.throws(
      () => normalizeFileViewerConfig({ assetBaseUrl: unsafe }),
      (error) =>
        error instanceof Error &&
        !error.message.includes('do-not-log-this') &&
        !error.message.includes('password')
    )
  }
})
