import { computed, onScopeDispose, ref, watch } from 'vue'
import { createFileViewerI18n, type FileViewerOptions } from '@file-viewer/core'

/** Keep private options identity while separating language from document reloads. */
export const useViewerI18n = (
  getInput: () => FileViewerOptions | undefined,
  getOwnerDocument: () => Document | undefined = () => undefined,
  onError?: (error: unknown) => void,
) => {
  const viewerI18n = createFileViewerI18n(getInput(), { ownerDocument: getOwnerDocument, onError })
  const languageRevision = ref(0)
  const optionsRevision = ref(0)
  const unsubscribe = viewerI18n.subscribe(() => { languageRevision.value++ })
  const stop = watch(() => [getInput(), getOwnerDocument()], () => {
    viewerI18n.update(getInput())
    optionsRevision.value++
  }, { deep: true, flush: 'sync' })
  onScopeDispose(() => {
    stop()
    unsubscribe()
    viewerI18n.destroy()
  })
  const getOptions = () => {
    void languageRevision.value
    void optionsRevision.value
    return viewerI18n.options
  }
  const resolvedLocale = computed(() => {
    void languageRevision.value
    return viewerI18n.locale
  })
  return { viewerI18n, languageRevision, resolvedLocale, getOptions, i18n: viewerI18n, revision: languageRevision }
}
