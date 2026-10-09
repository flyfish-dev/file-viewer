import { describe, expect, it } from 'vitest'
import { resolveFullAssetPackBaseUrl } from '../packages/components/web-full/src/asset-pack-base'

describe('Full asset pack locations', () => {
  it('pins jsDelivr asset packs to the built version for a range-based entry', () => {
    expect(resolveFullAssetPackBaseUrl('https://cdn.jsdelivr.net/npm/@file-viewer/web-full@latest/dist/', '@file-viewer/assets-cad', '3.2.0'))
      .toBe('https://cdn.jsdelivr.net/npm/@file-viewer/assets-cad@3.2.0/viewer/')
  })
  it('keeps unpkg as the explicitly selected provider', () => {
    expect(resolveFullAssetPackBaseUrl('https://unpkg.com/@file-viewer/web-full@3.2.0/dist/', '@file-viewer/assets-drawing', '3.2.0'))
      .toBe('https://unpkg.com/@file-viewer/assets-drawing@3.2.0/viewer/')
  })
  it.each([
    '/tenant/file-viewer/',
    'https://viewer.example/tenant/file-viewer/',
    'https://cdn.jsdelivr.net/gh/example/repo/dist/',
    'https://unpkg.com/custom/assets/',
    'https://cdn.jsdelivr.net.example/npm/@file-viewer/web-full@3.2.0/dist/',
    'http://cdn.jsdelivr.net/npm/@file-viewer/web-full@3.2.0/dist/'
  ])('preserves a self-hosted or unknown location: %s', base => {
    expect(resolveFullAssetPackBaseUrl(base, '@file-viewer/assets-cad', '3.2.0')).toBe(base)
  })
  it('does not invent a CDN version in an uncompiled test module', () => {
    const base = 'https://unpkg.com/@file-viewer/web-full/dist/'
    expect(resolveFullAssetPackBaseUrl(base, '@file-viewer/assets-cad', undefined)).toBe(base)
  })
})
