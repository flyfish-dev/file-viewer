import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { useViewerPreviewLifecycle } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerPreviewLifecycle'

vi.mock('vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue')>()),
  onBeforeUnmount: vi.fn()
}))

describe('Vue document render options', () => {
  it('rerenders for semantic render-option changes, not equivalent option objects', async () => {
    const scope = effectScope()
    const props = reactive({ file: 'contract.docx', docx: { reviewMode: 'all' } })
    const refreshPreview = vi.fn()
    scope.run(() =>
      useViewerPreviewLifecycle({
        getFile: () => props.file,
        getUrl: () => undefined,
        getRenderOptions: () => props.docx,
        refreshPreview,
        cancelPreview: vi.fn(),
        clearRenderedContent: vi.fn(),
        resetLoading: vi.fn(),
        stopZoomObserver: vi.fn(),
        stopFitObserver: vi.fn(),
        stopViewStateObserver: vi.fn()
      })
    )
    expect(refreshPreview).toHaveBeenCalledTimes(1)
    props.docx = { reviewMode: 'all' }
    await nextTick()
    expect(refreshPreview).toHaveBeenCalledTimes(1)
    props.docx.reviewMode = 'final'
    await nextTick()
    expect(refreshPreview).toHaveBeenCalledTimes(2)
    props.file = 'other.doc'
    props.docx = { reviewMode: 'original' }
    await nextTick()
    expect(refreshPreview).toHaveBeenCalledTimes(3)
    scope.stop()
    props.docx.reviewMode = 'all'
    await nextTick()
    expect(refreshPreview).toHaveBeenCalledTimes(3)
  })
})
