import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useLoading } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useLoading'

describe('Vue FileViewer loading hook', () => {
  it('syncs extension theme changes through the core loading controller', async () => {
    const extension = ref('pdf')
    const loading = useLoading(extension)

    expect(loading.theme.value).toMatchObject({
      badge: 'PDF',
      label: 'PDF 文档'
    })

    loading.startLoading('读取中')
    expect(loading.loading.value).toBe(true)
    expect(loading.message.value).toBe('读取中')

    extension.value = 'dwg'
    await nextTick()

    expect(loading.theme.value).toMatchObject({
      badge: 'CAD',
      label: 'CAD 图纸'
    })
    expect(loading.loading.value).toBe(true)
    expect(loading.message.value).toBe('读取中')
  })
})
