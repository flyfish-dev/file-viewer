import { describe, expect, it } from 'vitest'
import { isResolvedPptxWorkerLocation } from '../packages/renderers/pptx/src/worker-location'

describe('PPTX package Worker asset resolution', () => {
  it.each([
    ['https://example.test/ui/assets/main-a.js', 'https://example.test/ui/assets/pptx.worker-b.js'],
    ['https://example.test/ui/main.js', 'https://example.test/ui/9ef857.js'],
    ['https://example.test/ui/assets/main.js', 'https://example.test/ui/assets/pptx.worker.js'],
    [
      'https://example.test/@fs/work/packages/pptx/src/worker.ts',
      'https://example.test/@fs/work/packages/pptx/dist/worker/pptx.worker.js'
    ],
    [
      'https://example.test/node_modules/@file-viewer/pptx/dist/worker.js',
      'https://example.test/node_modules/@file-viewer/pptx/dist/worker/pptx.worker.js'
    ],
    ['file:///packages/pptx/dist/worker.js', 'file:///packages/pptx/dist/worker/pptx.worker.js']
  ])(
    'uses a rewritten asset or direct distribution module without manifest probes: %s',
    (module, asset) => {
      expect(isResolvedPptxWorkerLocation(new URL(module), new URL(asset))).toBe(true)
    }
  )

  it.each([
    ['https://example.test/ui/main.js', 'https://example.test/ui/worker/pptx.worker.js'],
    ['https://example.test/ui/chunk-a.js', 'https://example.test/ui/worker/pptx.worker.js'],
    [
      'https://example.test/node_modules/.vite/deps/worker.js',
      'https://example.test/node_modules/.vite/deps/worker/pptx.worker.js'
    ]
  ])('does not assume an untouched dependency-relative URL was emitted: %s', (module, asset) => {
    expect(isResolvedPptxWorkerLocation(new URL(module), new URL(asset))).toBe(false)
  })
})
