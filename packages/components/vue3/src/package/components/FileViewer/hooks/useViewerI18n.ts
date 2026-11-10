import { computed, onScopeDispose, ref, watch } from 'vue'
import { createFileViewerI18n, type FileViewerOptions } from '@file-viewer/core'

/** Keep renderer options stable while exposing every update to Vue consumers. */
export const useViewerI18n = (getInput: () => FileViewerOptions | undefined) => {
  const viewerI18n = createFileViewerI18n(getInput())
  const languageRevision = ref(0)
  viewerI18n.subscribe(() => { languageRevision.value++ })
  watch(getInput, value => viewerI18n.update(value), { deep: true, flush: 'sync' })
  onScopeDispose(() => viewerI18n.destroy())

  // A computed returning viewerI18n.options would suppress downstream updates
  // because the context deliberately retains the same object for renderers.
  const getOptions = () => {
    void languageRevision.value
    return viewerI18n.options
  }
  const resolvedLocale = computed(() => {
    void languageRevision.value
    return viewerI18n.locale
  })
  return { viewerI18n, languageRevision, resolvedLocale, getOptions }
}
