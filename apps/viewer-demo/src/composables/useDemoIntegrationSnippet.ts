import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import type { FileViewerFileRef } from '@file-viewer/core'
import type { DemoLocale } from './useDemoCopy'
import { DEFAULT_DEMO_URL_BY_LOCALE } from './useDemoSamples'

/** Own snippet text, bounded clipboard fallback and copy feedback cleanup. */
export function useDemoIntegrationSnippet({
  file,
  preview,
  url,
  locale
}: {
  file: Ref<FileViewerFileRef | undefined>
  preview: Ref<string>
  url: Ref<string>
  locale: Ref<DemoLocale>
}) {
  const snippetCopied = ref(false)
  const integrationSnippet = computed(() => {
    if (file.value) {
      return `import FileViewer from '@file-viewer/react-full'

export function Preview({ file }: { file: File }) {
  return <FileViewer file={file} locale="${locale.value}" style={{ height: 720 }} />
}`
    }
    const sampleUrl = preview.value || url.value || DEFAULT_DEMO_URL_BY_LOCALE[locale.value]
    return `import FileViewer from '@file-viewer/react-full'

export function Preview() {
  return <FileViewer url="${sampleUrl}" locale="${locale.value}" style={{ height: 720 }} />
}`
  })

  let copyResetTimer: number | undefined
  const clipboardWriteTimeoutMs = 800

  function copyIntegrationSnippetFallback() {
    const textarea = document.createElement('textarea')
    textarea.value = integrationSnippet.value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    if (!copied) {
      throw new Error('Clipboard copy was rejected')
    }
  }

  async function writeIntegrationSnippetToClipboard() {
    if (!navigator.clipboard?.writeText) {
      copyIntegrationSnippetFallback()
      return
    }
    let timeoutId: number | undefined
    try {
      await Promise.race([
        navigator.clipboard.writeText(integrationSnippet.value),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('Clipboard write timed out')),
            clipboardWriteTimeoutMs
          )
        })
      ])
    } catch {
      copyIntegrationSnippetFallback()
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }

  async function copyIntegrationSnippet() {
    snippetCopied.value = true
    if (copyResetTimer) {
      window.clearTimeout(copyResetTimer)
    }
    copyResetTimer = window.setTimeout(() => {
      snippetCopied.value = false
      copyResetTimer = undefined
    }, 1600)

    try {
      await writeIntegrationSnippetToClipboard()
    } catch {
      snippetCopied.value = false
    }
  }

  onBeforeUnmount(() => {
    if (copyResetTimer) window.clearTimeout(copyResetTimer)
  })
  return { integrationSnippet, snippetCopied, copyIntegrationSnippet }
}
