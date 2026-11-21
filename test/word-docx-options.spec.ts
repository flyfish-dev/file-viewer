import { describe, expect, it, vi } from 'vitest'
import type { FileRenderContext } from '@file-viewer/core'
import { createDocxOptions } from '../packages/renderers/word/src/wordDocx'
import { parseHTML } from 'linkedom'

describe('DOCX external hyperlink policy options', () => {
  it('defaults File Viewer to block and supports an explicit allow override', () => {
    const { document } = parseHTML('<!doctype html><html><body><div></div></body></html>')
    const target = document.querySelector('div') as unknown as HTMLDivElement
    const notify = vi.fn()

    expect(createDocxOptions(target, undefined, notify).externalLinkPolicy).toBe('block')
    expect(createDocxOptions(target, undefined, notify).externalResourcePolicy).toBe('block')
    const context = {
      options: { docx: { externalLinkPolicy: 'allow', externalResourcePolicy: 'allow' } }
    } as unknown as FileRenderContext
    expect(createDocxOptions(target, context, notify).externalLinkPolicy).toBe('allow')
    expect(createDocxOptions(target, context, notify).externalResourcePolicy).toBe('allow')
  })
})

describe('DOCX authored page boundaries', () => {
  it('preserves explicit breaks in flow mode without enabling measured pagination', () => {
    const { document } = parseHTML('<html><body><div></div></body></html>')
    const target = document.querySelector('div') as unknown as HTMLDivElement
    const options = createDocxOptions(target, undefined, vi.fn())
    expect(options.breakPages).toBe(true)
    expect(options.fixedPageHeight).toBe(false)
    expect(options.ignoreLastRenderedPageBreak).toBe(true)
    const paged = createDocxOptions(target, {
      options: { docx: { visualPagination: true } }
    } as FileRenderContext, vi.fn())
    expect(paged.fixedPageHeight).toBe(true)
  })
})

describe('DOCX preview comments', () => {
  it('shows comment markers in all-markup view and hides them in final and original views', () => {
    const { document } = parseHTML('<html><body><div></div></body></html>')
    const target = document.querySelector('div') as unknown as HTMLDivElement
    const notify = vi.fn()

    expect(createDocxOptions(target, undefined, notify).renderComments).toBe(true)
    for (const reviewMode of ['all', 'final', 'original'] as const) {
      const context = { options: { docx: { reviewMode } } } as FileRenderContext
      expect(createDocxOptions(target, context, notify).renderComments).toBe(reviewMode === 'all')
    }
  })
})
