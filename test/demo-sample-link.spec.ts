import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  DEMO_SAMPLE_ALIASES,
  demoSampleParamFor,
  demoSampleShareUrl,
  resolveDemoSampleParam,
  syncDemoSampleParam
} from '../apps/viewer-demo/src/composables/useDemoSampleLink'
import { DEFAULT_DEMO_URL_BY_LOCALE, normalizeDemoUrl, sampleUrlKey } from '../apps/viewer-demo/src/composables/useDemoSamples'
import { allDemoPresetFiles } from '../apps/viewer-demo/src/data/demoSamples'

describe('viewer demo ?sample= links', () => {
  it('resolves every alias to a bundled catalog sample in every locale', () => {
    const catalog = new Set(allDemoPresetFiles.map(item => item.url))
    for (const name of Object.keys(DEMO_SAMPLE_ALIASES)) {
      for (const locale of ['zh-CN', 'en-US', 'ja-JP', 'de-DE'] as const) {
        const resolved = resolveDemoSampleParam(name, locale)
        expect(resolved, `${name} (${locale})`).toBeDefined()
        expect(catalog.has(resolved as string)).toBe(true)
        expect(existsSync(fileURLToPath(new URL(`../apps/viewer-demo/public${resolved}`, import.meta.url))),
          `Missing actual bundled fixture: ${resolved}`).toBe(true)
      }
    }
  })

  it('accepts catalog paths and bare file names, case-insensitive aliases', () => {
    expect(resolveDemoSampleParam('DWG')).toBe('/example/sample.dwg')
    expect(resolveDemoSampleParam('fox')).toBe('/example/fox.glb')
    expect(resolveDemoSampleParam('glb', 'zh-CN')).toBe('/example/fox.glb')
    expect(resolveDemoSampleParam('/example/model.step')).toBe('/example/model.step')
    expect(resolveDemoSampleParam('model.step')).toBe('/example/model.step')
    expect(resolveDemoSampleParam('%2Fexample%2Fpdf.pdf')).toBe('/example/pdf.pdf')
    expect(resolveDemoSampleParam('pptx', 'zh-CN')).toBe('/example/ppt.pptx')
    expect(resolveDemoSampleParam('pptx', 'en-US')).toBe('/example/en/sample-presentation.pptx')
  })

  it('rejects anything outside the bundled catalog', () => {
    for (const value of [
      '', '   ', 'https://evil.example/x.pdf', '//evil.example/x.pdf',
      '/example/../index.html', '/example/not-a-sample.docx', 'javascript:alert(1)', '%E0%A4%A',
      '__proto__', 'constructor', 'toString', '/example/..\\index.html',
      '%252Fexample%252Fpdf.pdf', '/example/pdf.pdf?token=private', 'data:application/pdf;base64,eA=='
    ]) {
      expect(resolveDemoSampleParam(value), value).toBeUndefined()
    }
  })

  it('round-trips catalog URLs to the shortest share parameter', () => {
    expect(demoSampleParamFor('/example/sample.dwg')).toBe('dwg')
    expect(demoSampleParamFor('/example/en/sample-presentation.pptx')).toBe('pptx')
    expect(demoSampleParamFor('/example/ppt.pptx', 'zh-CN')).toBe('pptx')
    expect(demoSampleParamFor('https://evil.example/a.pdf')).toBeUndefined()
    expect(demoSampleShareUrl('/example/sample.dwg', 'en-US', 'https://viewer.example.com')).toBe('https://viewer.example.com/?sample=dwg&lang=en-US')
    const shared = new URL(demoSampleShareUrl('/example/ppt.pptx', 'zh-CN',
      'https://viewer.example.com/team/demo/index.html?token=private&url=customer.docx#private')!)
    expect(shared.pathname).toBe('/team/demo/index.html')
    expect([...shared.searchParams.keys()]).toEqual(['sample', 'lang'])
    expect(shared.searchParams.get('lang')).toBe('zh-CN')
    expect(shared.hash).toBe('')
    expect(resolveDemoSampleParam(shared.searchParams.get('sample'), 'zh-CN')).toBe('/example/ppt.pptx')
    expect(demoSampleShareUrl('/example/sample.dwg', 'en-US', 'file:///tmp/demo/')).toBeUndefined()
    expect(demoSampleShareUrl('/example/sample.dwg', 'en-US', 'not a URL')).toBeUndefined()
  })

  it('updates only the sample and explicit locale, preserving unrelated query values and hash', () => {
    const state = { existing: true }
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'https://viewer.example/team/demo/?theme=dark&sample=pdf#page-2' },
      history: { state, replaceState } })
    try {
      syncDemoSampleParam('dwg', 'de-DE')
      const [nextState, , address] = replaceState.mock.calls[0]!
      const next = new URL(address)
      expect(nextState).toBe(state)
      expect(next.pathname).toBe('/team/demo/')
      expect(next.searchParams.get('theme')).toBe('dark')
      expect(next.searchParams.get('sample')).toBe('dwg')
      expect(next.searchParams.get('lang')).toBe('de-DE')
      expect(next.hash).toBe('#page-2')
      syncDemoSampleParam(undefined)
      expect(new URL(replaceState.mock.calls[1]![2]).searchParams.has('sample')).toBe(false)
    } finally { vi.unstubAllGlobals() }
  })

  it('loads catalog samples below a self-hosted base path without rewriting external files', () => {
    vi.stubGlobal('window', { location: { href: 'https://viewer.example/team/demo/index.html', origin: 'https://viewer.example' } })
    try {
      expect(normalizeDemoUrl('/example/pdf.pdf?download=1#page-2')).toBe('/team/demo/example/pdf.pdf?download=1#page-2')
      expect(normalizeDemoUrl('/team/demo/example/pdf.pdf')).toBe('/team/demo/example/pdf.pdf')
      expect(sampleUrlKey('/team/demo/example/pdf.pdf')).toBe('/example/pdf.pdf')
      expect(demoSampleParamFor('/team/demo/example/pdf.pdf', 'zh-CN')).toBe('pdf')
      expect(normalizeDemoUrl('https://private.example/example/pdf.pdf')).toBe('https://private.example/example/pdf.pdf')
      expect(normalizeDemoUrl('/customer/private.pdf')).toBe('/customer/private.pdf')
    } finally { vi.unstubAllGlobals() }
  })

  it('uses a visual presentation as the English-locale default sample', () => {
    expect(DEFAULT_DEMO_URL_BY_LOCALE['en-US']).toBe('/example/en/sample-presentation.pptx')
    expect(DEFAULT_DEMO_URL_BY_LOCALE['zh-CN']).toBe('/example/word.docx')
  })
})
