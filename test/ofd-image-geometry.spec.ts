import { parseHTML } from 'linkedom'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  renderImageObject,
  renderImageOnDiv,
} from '../packages/renderers/ofd/vendor/dltech/ofd/ofd_render.js'
import {
  converterDpi,
  setPageScal,
} from '../packages/renderers/ofd/vendor/dltech/ofd/ofd_util.js'

const imageResources = {
  image: {
    format: 'png',
    img: 'data:image/png;base64,iVBORw0KGgo=',
  },
}

const readPixel = (style: string, property: string) => {
  const value = new RegExp(`${property}:\\s*(-?[\\d.]+)px`).exec(style)?.[1]
  return Number(value)
}

describe('OFD ImageObject geometry', () => {
  beforeEach(() => {
    const { document, window } = parseHTML('<!doctype html><html><body></body></html>')
    Object.assign(globalThis, {
      document,
      HTMLElement: window.HTMLElement,
    })
    setPageScal(1)
  })

  it('adds a zero-translation CTM to the ordinary image Boundary origin', () => {
    const element = renderImageObject('210px', '297px', imageResources, {
      '@_ID': '649',
      '@_ResourceID': 'image',
      '@_Boundary': '36.91467 27.51667 136.144 105.83334',
      '@_CTM': '136.144 0 0 105.83334 0 0',
      pfIndex: 8,
    }) as HTMLElement
    const style = element.getAttribute('style') || ''

    expect(readPixel(style, 'left')).toBeCloseTo(converterDpi(36.91467), 5)
    expect(readPixel(style, 'top')).toBeCloseTo(converterDpi(27.51667), 5)
    expect(readPixel(style, 'width')).toBeCloseTo(converterDpi(136.144), 5)
    expect(readPixel(style, 'height')).toBeCloseTo(converterDpi(105.83334), 5)
  })

  it('keeps OFD R&W CTM positioning relative to its shared full-page Boundary', () => {
    const element = renderImageObject('100px', '100px', imageResources, {
      '@_ID': '40',
      '@_ResourceID': 'image',
      '@_Boundary': '0 0 100 100',
      '@_CTM': '20 0 0 15 60 60',
      pfIndex: 12,
    }) as HTMLElement
    const style = element.getAttribute('style') || ''

    expect(readPixel(style, 'left')).toBeCloseTo(converterDpi(60), 5)
    expect(readPixel(style, 'top')).toBeCloseTo(converterDpi(60), 5)
    expect(readPixel(style, 'width')).toBeCloseTo(converterDpi(20), 5)
    expect(readPixel(style, 'height')).toBeCloseTo(converterDpi(15), 5)
  })

  it('adds the Boundary origin to rotated and skewed CTM translations', () => {
    const element = renderImageObject('100px', '100px', imageResources, {
      '@_ID': 'rotated',
      '@_ResourceID': 'image',
      '@_Boundary': '10 20 50 50',
      '@_CTM': '0 10 -5 0 3 4',
      pfIndex: 16,
    }) as HTMLElement
    const style = element.getAttribute('style') || ''
    const matrix = /transform:\s*matrix\(([^)]+)\)/.exec(style)?.[1]
      ?.split(/\s*,\s*/)
      .map(Number)

    expect(matrix).toHaveLength(6)
    expect(matrix?.[4]).toBeCloseTo(converterDpi(13), 5)
    expect(matrix?.[5]).toBeCloseTo(converterDpi(24), 5)
  })

  it('continues to preserve oversized and off-page seal geometry', () => {
    const seal = renderImageOnDiv(
      '210px',
      '297px',
      imageResources.image.img,
      { x: -10, y: 100, w: 400, h: 400 },
      false,
      true,
      {},
      {},
      20,
    ) as HTMLElement
    const style = seal.getAttribute('style') || ''

    expect(seal.getAttribute('name')).toBe('seal_img_div')
    expect(readPixel(style, 'left')).toBe(-10)
    expect(readPixel(style, 'top')).toBe(100)
    expect(readPixel(style, 'width')).toBe(400)
    expect(readPixel(style, 'height')).toBe(400)
  })
})
