import { describe, expect, it } from 'vitest'
import { DEFAULT_SUPPORTED_EXTENSIONS } from '../packages/core/src'
import { resolveFileViewerLoadingVisual } from '../packages/components/vue3/src/package/components/FileViewer/loadingVisual'

describe('Vue FileViewer loading visuals', () => {
  it('assigns a personalized visual family to every registered format', () => {
    const unresolved = DEFAULT_SUPPORTED_EXTENSIONS.filter(extension =>
      resolveFileViewerLoadingVisual(extension).family === 'generic'
    )

    expect(DEFAULT_SUPPORTED_EXTENSIONS.length).toBeGreaterThan(200)
    expect(unresolved).toEqual([])
  })

  it.each([
    ['docx', 'word'],
    ['xlsx', 'sheet'],
    ['pptx', 'slide'],
    ['pdf', 'pdf'],
    ['dcm', 'medical'],
    ['p7s', 'security'],
    ['ofd', 'layout'],
    ['dwg', 'cad'],
    ['geojson', 'geo'],
    ['xmind', 'mindmap'],
    ['bundle', 'repository'],
    ['ipynb', 'notebook'],
    ['mp3', 'audio'],
    ['mp4', 'video'],
    ['ttf', 'font'],
    ['psd', 'design'],
    ['parquet', 'data'],
    ['wasm', 'binary']
  ])('maps .%s to the %s visual family', (extension, family) => {
    expect(resolveFileViewerLoadingVisual(extension)).toMatchObject({
      family,
      extensionLabel: extension.toUpperCase()
    })
  })

  it('keeps unknown formats graceful without presenting them as DOC', () => {
    expect(resolveFileViewerLoadingVisual('custom')).toMatchObject({
      family: 'generic',
      extensionLabel: 'CUSTOM',
      rendererId: 'fallback'
    })
  })
})
