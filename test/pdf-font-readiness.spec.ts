import { describe, expect, it } from 'vitest'
import { createPdfCjkFontFallbackManager } from '../packages/renderers/pdf/src/pdfFontFallback'

const content = (str = '中文') => ({
  items: [{ str, fontName: 'f1' }],
  styles: { f1: { fontSubstitution: '"Readiness CJK", sans-serif' } }
})
let fixtureId = 0
const fixture = (load: () => Promise<unknown[]>, fetchCss?: () => Promise<unknown>) => {
  const documentRef = {
    defaultView: {
      fetch:
        fetchCss ||
        (async () => ({
          ok: true,
          text: async () =>
            "@font-face {font-family: 'Noto Sans SC Variable';src: url('./files/test.woff2');}"
        }))
    },
    createElement: () => ({ dataset: {}, textContent: '' }),
    head: { append: () => {} },
    fonts: { load }
  } as unknown as Document
  return createPdfCjkFontFallbackManager({
    documentRef,
    fontAssetPath: `https://reading.test/${++fixtureId}/fonts/`
  })
}

describe('PDF shared offline CJK font readiness', () => {
  it('does not treat a scheduled font shard as loaded for a concurrent consumer', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const manager = fixture(async () => {
      calls += 1
      await gate
      return [{}]
    })
    let firstReady = false,
      secondReady = false
    const first = manager.ensureTextContent(content()).then(() => {
      firstReady = true
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    const second = manager.ensureTextContent(content()).then(() => {
      secondReady = true
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect({ firstReady, secondReady }).toEqual({ firstReady: false, secondReady: false })
    release()
    await Promise.all([first, second])
    expect(calls).toBe(2)
    expect(await manager.ensureTextContent(content())).toBe(false)
  })

  it('retries failed shards instead of caching false readiness', async () => {
    let fail = true
    const manager = fixture(async () => {
      if (fail) throw new Error('controlled cold font failure')
      return [{}]
    })
    expect(await manager.ensureTextContent(content())).toBe(false)
    fail = false
    expect(await manager.ensureTextContent(content())).toBe(true)
    expect(await manager.ensureTextContent(content())).toBe(false)
  })

  it('keeps later-page characters loadable after the initial subset is ready', async () => {
    let calls = 0
    const manager = fixture(async () => {
      calls += 1
      return [{}]
    })
    expect(await manager.ensureTextContent(content('中文'))).toBe(true)
    expect(await manager.ensureTextContent(content('中文阅读'))).toBe(true)
    expect(await manager.ensureTextContent(content('中文阅读'))).toBe(false)
    expect(calls).toBe(4)
  })

  it('retries a failed stylesheet fetch on the next inspection', async () => {
    let calls = 0
    const manager = fixture(
      async () => [{}],
      async () => {
        if (++calls === 1) throw new Error('controlled stylesheet failure')
        return {
          ok: true,
          text: async () =>
            "@font-face {font-family: 'Noto Sans SC Variable';src: url('./files/test.woff2');}"
        }
      }
    )
    expect(await manager.prepare()).toBe(false)
    expect(await manager.ensureTextContent(content())).toBe(true)
    expect(calls).toBe(2)
  })

  it('loads supplementary-plane Han characters instead of silently skipping their font', async () => {
    const manager = fixture(async () => [{}])
    expect(await manager.ensureTextContent(content('\u{2000b}\u{20bb7}'))).toBe(true)
  })
})
