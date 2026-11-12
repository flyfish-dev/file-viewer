import { onScopeDispose, ref, watch } from 'vue'
import { createFileViewerI18n, type FileViewerOptions } from '@file-viewer/core'

/** Language-only invalidation: do not include it in the document-render watch. */
export const useViewerI18n = (
  getOptions: () => FileViewerOptions | undefined,
  getOwnerDocument: () => Document | undefined,
  onError: (error: unknown) => void,
) => {
  const revision = ref(0)
  const input = () => {
    const options = getOptions()
    return { locale: options?.locale, messages: options?.messages, i18n: options?.i18n }
  }
  const i18n = createFileViewerI18n(input(), { ownerDocument: getOwnerDocument, onError })
  const unsubscribe = i18n.subscribe(() => { revision.value += 1 })
  const stop = watch(() => [input(), getOwnerDocument()], () => i18n.update(input()), { deep: true, flush: 'sync' })
  onScopeDispose(() => {
    stop()
    unsubscribe()
    i18n.destroy()
  })
  return { i18n, revision }
}
