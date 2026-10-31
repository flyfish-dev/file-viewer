import { createFileViewerTranslator, type FileViewerI18nInput } from '../i18n/messages'
import { createFileViewerErrorState } from '../viewer/state'

export type ViewerSourcePhase = 'downloading' | 'reading' | 'streamingPdf'

/** The shell owns acquisition feedback; renderers retain their own error surface. */
export const createViewerSourceFeedback = (shell: HTMLElement, content: HTMLElement) => {
  let surface: HTMLElement | null = null
  let title: HTMLElement | null = null
  let message: HTMLElement | null = null
  return (
    phase: ViewerSourcePhase | null,
    error: unknown,
    extension: string,
    options?: FileViewerI18nInput,
    rendererHasError = false
  ) => {
    content.setAttribute('aria-busy', String(Boolean(phase)))
    content.toggleAttribute('inert', Boolean(phase))
    if (!phase && (error == null || rendererHasError)) {
      surface?.remove()
      surface = title = message = null
      return
    }
    if (!surface) {
      surface = shell.ownerDocument.createElement('div')
      surface.className = 'file-viewer-web-source-status'
      surface.setAttribute('part', 'source-status')
      title = shell.ownerDocument.createElement('strong')
      message = shell.ownerDocument.createElement('p')
      surface.append(title, message)
      shell.append(surface)
    }
    surface.dataset.fileViewerSourceState = phase ? 'loading' : 'error'
    surface.setAttribute('role', phase ? 'status' : 'alert')
    surface.setAttribute('aria-live', phase ? 'polite' : 'assertive')
    surface.setAttribute('aria-atomic', 'true')
    const failure = phase ? null : createFileViewerErrorState(extension, error, undefined, options)
    const nextTitle = failure?.title || ''
    const nextMessage = phase
      ? createFileViewerTranslator(options)(`preview.${phase}`)
      : failure!.message
    title!.hidden = Boolean(phase)
    if (title!.textContent !== nextTitle) title!.textContent = nextTitle
    if (message!.textContent !== nextMessage) message!.textContent = nextMessage
  }
}
