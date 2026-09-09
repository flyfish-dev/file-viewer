import { describe, expect, it } from 'vitest'
import { parseHTML } from 'linkedom'
import { createFileViewerCadExportAdapter } from '../packages/renderers/cad/src/export'
import { applyCadViewerColorMode, resolveFileViewerCadCanvasOptions } from '../packages/renderers/cad/src/colorMode'

describe('CAD view and portable output', () => {
  it('pairs authored colors with a dark canvas and monochrome with white paper', () => {
    expect(resolveFileViewerCadCanvasOptions({}, 'source').background).toBe('#05070d')
    expect(resolveFileViewerCadCanvasOptions({}, 'monochrome').background).toBe('#ffffff')
    const options = { canvasOptions: { background: '#123456' }, dwfBackground: '#abcdef' }
    expect(resolveFileViewerCadCanvasOptions(options, 'monochrome').background).toBe('#123456')
    const calls: unknown[] = []
    applyCadViewerColorMode({
      setColorMode: (...args) => calls.push(args),
      isNativeRendererActive: () => true,
      setCanvasOptions: options => calls.push(options.background)
    }, 'monochrome', '#000000', options)
    expect(calls).toEqual([['monochrome', '#000000'], '#abcdef'])
  })

  it('exports the engine snapshot rather than a cleared WebGL canvas or live controls', async () => {
    const { document } = parseHTML('<html><body></body></html>')
    const snapshot = { ownerDocument: document, width: 800, height: 600, toDataURL: () => 'data:image/png;base64,c25hcHNob3Q=' }
    const viewer = { captureCanvas: async () => snapshot as unknown as HTMLCanvasElement }
    const adapter = createFileViewerCadExportAdapter(() => viewer, 'drawing"<.dxf')
    const html = await adapter.toHtml!({ mode: 'export' } as any)
    const image = parseHTML(`<html><body>${html}</body></html>`).document.querySelector('img')!
    expect(image.getAttribute('src')).toBe('data:image/png;base64,c25hcHNob3Q=')
    expect(image.getAttribute('alt')).toBe('drawing"<.dxf')
    expect(image.getAttribute('width')).toBe('800')
    expect(image.parentElement?.getAttribute('data-viewer-print-page-index')).toBe('0')
    expect(html).not.toContain('canvas')
  })

  it('scopes print masks to the live drawing rather than sidebars and toolbars', () => {
    const { document } = parseHTML('<html><body><div id="stage"></div></body></html>')
    const page = document.getElementById('stage')!
    const adapter = createFileViewerCadExportAdapter(() => null, 'drawing.dxf', () => page)
    expect(adapter.getPrintMaskPages?.()).toEqual([page])
    expect(adapter.includeDocumentStyles).toBe(false)
  })

  it('refuses a stale capture after the user changes or closes the document', async () => {
    let current: any
    current = { captureCanvas: async () => { current = null; return {} as HTMLCanvasElement } }
    const adapter = createFileViewerCadExportAdapter(() => current)
    await expect(adapter.toHtml!({ mode: 'print' })).rejects.toThrow('changed during export')
  })
})
