import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { readFileSync } from 'node:fs'
import { useLoading } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useLoading'
import type { FileViewerEventMap } from '../packages/components/vue3/src/package/common/type'

// These tests use the workspace's real Vue reactivity and core loading controller.
const scopes: EffectScope[] = []
const createLoading = (onError?: (message: string) => void) => {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useLoading('docx', undefined, onError))!
}
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()))

describe('Vue3 error notifications (#299)', () => {
  it('keeps error notification optional', () => {
    const loading = createLoading()
    expect(() => loading.showError('Unsupported browser')).not.toThrow()
    expect(loading.error.value).toBe('Unsupported browser')
  })
  it('updates displayed state before invoking the host callback', () => {
    const observed: string[] = []
    const loading = createLoading(message => {
      observed.push(message)
      expect(loading.error.value).toBe(message)
    })
    loading.showError('Renderer failed')
    expect(observed).toEqual(['Renderer failed'])
  })
  it('notifies once for every occurrence, even when the message repeats', () => {
    const onError = vi.fn()
    const loading = createLoading(onError)
    loading.showError('Unable to load the document')
    loading.showError('Unable to load the document')
    expect(onError.mock.calls).toEqual([
      ['Unable to load the document'], ['Unable to load the document']
    ])
  })
  it('does not notify on normal progress, clear, or reset', () => {
    const onError = vi.fn()
    const loading = createLoading(onError)
    loading.startLoading('Reading')
    loading.setLoadingMessage('Rendering')
    loading.stopLoading()
    loading.clearError()
    loading.resetLoading()
    expect(onError).not.toHaveBeenCalled()
  })
  it('supports an error, recovery, and a later failed retry', () => {
    const onError = vi.fn()
    const loading = createLoading(onError)
    loading.showError('Failed')
    loading.clearError()
    expect(loading.error.value).toBe('')
    loading.showError('Failed')
    expect(onError).toHaveBeenCalledTimes(2)
  })
  it('preserves the localized message rather than manufacturing an Error', () => {
    const onError = vi.fn()
    const loading = createLoading(onError)
    loading.showError('读取文件异常：文件损坏')
    expect(onError).toHaveBeenCalledWith('读取文件异常：文件损坏')
    expectTypeOf<FileViewerEventMap['error']>().toEqualTypeOf<string>()
  })
})

describe('Vue3 event forwarding source contracts (#299)', () => {
  it('declares the Vue-specific typed emits in both component layers', () => {
    for (const file of ['FileViewer.vue', 'ShadowFileViewer.vue']) {
      const source = readFileSync(new URL(
        `../packages/components/vue3/src/package/components/FileViewer/${file}`, import.meta.url
      ), 'utf8')
      expect(source).toContain("import type { FileViewerEmits, FileViewerToolbarSlotProps } from '../../common/type'")
      expect(source).toContain('defineEmits<FileViewerEmits>()')
      expect(source).not.toContain('FileViewerComponentEmits as FileViewerEmits')
    }
  })
  it('forwards errors from BOTH shadow and light-DOM content instances', () => {
    const source = readFileSync(new URL(
      '../packages/components/vue3/src/package/components/FileViewer/ShadowFileViewer.vue', import.meta.url
    ), 'utf8')
    const contentInstances = source.split('<FileViewerContent').slice(1)
    expect(contentInstances).toHaveLength(2)
    for (const instance of contentInstances) {
      expect(instance).toContain('ref="contentViewer"')
      expect(instance).toContain('@error="message => emit(\'error\', message)"')
    }
    expect(source).toContain('v-bind="{ ...props, ...attrs }"')
  })
})
