import { describe, expect, it } from 'vitest'
import {
  genGlobalCSS,
  setTextByPathList,
} from '../packages/renderers/pptx/src/engine/support/vendor'

describe('PPTX generated style registry', () => {
  it('caches nested resources without extending Object.prototype', () => {
    const prototypeDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'set')
    const target: Record<string, unknown> = {}
    const image = 'data:image/png;base64,AA=='

    setTextByPathList(target, ['loaded-images', 'ppt/media/image1.png'], image)

    expect((target['loaded-images'] as Record<string, unknown>)['ppt/media/image1.png']).toBe(image)
    expect(Object.getOwnPropertyDescriptor(Object.prototype, 'set')).toEqual(prototypeDescriptor)
  })

  it('never serializes inherited properties as CSS rules', () => {
    const inheritedKey = '__pptxInheritedStyleForTest__'
    Object.defineProperty(Object.prototype, inheritedKey, {
      value: { name: '_css_inherited', text: 'color:#ff0000;' },
      enumerable: true,
      configurable: true,
      writable: true,
    })

    try {
      expect(genGlobalCSS()).not.toContain('_css_inherited')
      expect(genGlobalCSS()).not.toContain('undefined')
    } finally {
      delete (Object.prototype as Record<string, unknown>)[inheritedKey]
    }
  })

  it('stores prototype-like resource names as ordinary own keys', () => {
    const target: Record<string, unknown> = {}

    setTextByPathList(target, ['loaded-images', '__proto__'], 'cached')

    const cache = target['loaded-images'] as Record<string, unknown>
    expect(Object.getPrototypeOf(cache)).toBeNull()
    expect(Object.prototype.hasOwnProperty.call(cache, '__proto__')).toBe(true)
    expect(cache['__proto__']).toBe('cached')
  })
})
