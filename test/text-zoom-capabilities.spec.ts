import { describe, expect, it } from 'vitest'
import { DEFAULT_RENDERER_DEFINITIONS } from '../packages/core/src/registry/formats.generated'
import {
  applyFileViewerZoomAvailability,
  getRendererAvailability
} from '../packages/core/src/registry/capabilities'
import type { FileViewerZoomState } from '../packages/core/src/contracts/types'

describe.each(['code', 'markdown'])('%s provider zoom availability', (id) => {
  const definition = DEFAULT_RENDERER_DEFINITIONS.find((renderer) => renderer.id === id)!

  it.each([
    { scale: 1, canZoomIn: true, canZoomOut: true, canReset: false },
    { scale: 0.5, canZoomIn: true, canZoomOut: false, canReset: true },
    { scale: 3, canZoomIn: false, canZoomOut: true, canReset: true }
  ])('keeps each action bound to the real provider at scale $scale', (state) => {
    const zoomState: FileViewerZoomState = { ...state, label: `${state.scale * 100}%` }
    const availability = applyFileViewerZoomAvailability(
      getRendererAvailability(definition),
      zoomState
    )

    expect(availability).toMatchObject({
      zoom: true,
      zoomIn: state.canZoomIn,
      zoomOut: state.canZoomOut,
      zoomReset: state.canReset
    })
  })

  it('keeps zoom unavailable when no provider action is operational', () => {
    expect(
      applyFileViewerZoomAvailability(getRendererAvailability(definition), {
        scale: 1,
        label: '100%',
        canZoomIn: false,
        canZoomOut: false,
        canReset: false
      })
    ).toMatchObject({ zoom: false, zoomIn: false, zoomOut: false, zoomReset: false })
  })
})
