import {
  decodeFileViewerTextBuffer, disposeFileViewerRendered,
  type FileRenderContext, type FileViewerRenderedInstance, type FileViewerXmlDiagnostic
} from '@file-viewer/core'
import renderCode from './code.js'
import { createHtmlPreviewDocument } from './html.js'
import { applyXmlProfiles } from './xmlProfiles.js'
import { checkXmlAbort, XmlProfileError } from './xmlSafety.js'

export type FileViewerXmlRenderedInstance = FileViewerRenderedInstance & {
  xml: {
    readonly diagnostics: readonly FileViewerXmlDiagnostic[]
    readonly profileId: string | undefined
    readonly view: 'source' | 'rendered'
    setView(view: 'source' | 'rendered'): void
  }
}

export default async function renderXml(
  buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext
): Promise<FileViewerXmlRenderedInstance> {
  const options = context?.options?.xml ?? {}
  const doc = target.ownerDocument
  const controller = new AbortController()
  const signal = controller.signal
  const diagnostics: FileViewerXmlDiagnostic[] = []
  const root = doc.createElement('div')
  root.className = 'xml-profile-viewer'
  root.dataset.xmlView = 'source'
  const style = doc.createElement('style')
  style.textContent = `
.xml-profile-viewer{height:100%;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;grid-template-columns:minmax(0,1fr)}
.xml-profile-controls{grid-row:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 10px;background:var(--file-viewer-panel,#f8fafc);color:var(--file-viewer-text,#172033);border-bottom:1px solid #dbe2e8}
.xml-profile-controls button{border:1px solid #94a3b8;border-radius:6px;min-height:36px;padding:4px 10px;background:transparent;color:inherit;cursor:pointer}
.xml-profile-controls button[aria-pressed="true"]{background:#0f766e;color:white;border-color:#0f766e}
.xml-profile-source,.xml-profile-rendered{grid-row:2;grid-column:1;min-height:0;height:100%;width:100%;border:0}
.xml-profile-source{position:relative;z-index:1;overflow:auto;background:var(--file-viewer-panel,#fff)}.xml-profile-rendered{background:white}
.xml-profile-diagnostics{grid-row:3;font-size:12px;max-height:140px;overflow:auto;padding:4px 10px;white-space:pre-wrap;overflow-wrap:anywhere}
.xml-profile-viewer [hidden]{display:none!important}
@media(max-width:600px){.xml-profile-controls button{min-height:44px}}
`
  const controls = doc.createElement('div')
  controls.className = 'xml-profile-controls'
  controls.hidden = true
  const sourceButton = doc.createElement('button')
  sourceButton.type = 'button'
  sourceButton.dataset.xmlView = 'source'
  sourceButton.textContent = options.labels?.viewSource ?? 'View Source'
  const renderedButton = doc.createElement('button')
  renderedButton.type = 'button'
  renderedButton.dataset.xmlView = 'rendered'
  renderedButton.textContent = options.labels?.viewRendered ?? 'View Rendered'
  controls.append(renderedButton, sourceButton)
  const sourceTarget = doc.createElement('div')
  sourceTarget.className = 'xml-profile-source'
  const details = doc.createElement('details')
  details.className = 'xml-profile-diagnostics'
  details.hidden = true
  const summary = doc.createElement('summary')
  summary.textContent = options.labels?.diagnostics ?? 'XML profile diagnostics'
  const diagnosticText = doc.createElement('div')
  details.append(summary, diagnosticText)
  root.append(controls, sourceTarget, details)
  target.replaceChildren(style, root)

  let disposed = false
  let sourceInstance: FileViewerRenderedInstance | undefined
  let frame: HTMLIFrameElement | undefined
  let profileId: string | undefined
  let view: 'source' | 'rendered' = 'source'
  const setView = (next: 'source' | 'rendered') => {
    if (disposed || !frame || !profileId) return
    view = next
    root.dataset.xmlView = next
    // Keep the sandbox's layout alive while the opaque source layer covers it.
    // Hiding an out-of-process iframe can leave a blank compositor surface on return.
    frame.inert = next !== 'rendered'
    frame.setAttribute('aria-hidden', String(next !== 'rendered'))
    frame.style.pointerEvents = next === 'rendered' ? '' : 'none'
    sourceTarget.hidden = next !== 'source'
    sourceButton.setAttribute('aria-pressed', String(next === 'source'))
    renderedButton.setAttribute('aria-pressed', String(next === 'rendered'))
  }
  const showSource = () => setView('source')
  const showRendered = () => setView('rendered')
  sourceButton.addEventListener('click', showSource)
  renderedButton.addEventListener('click', showRendered)
  const unmount = () => {
    if (disposed) return
    disposed = true
    controller.abort(new XmlProfileError('cancelled', 'XML profile processing was cancelled.'))
    context?.signal?.removeEventListener('abort', unmount)
    sourceButton.removeEventListener('click', showSource)
    renderedButton.removeEventListener('click', showRendered)
    void disposeFileViewerRendered(sourceInstance)
    sourceInstance = undefined
    frame?.removeAttribute('srcdoc')
    frame?.remove()
    frame = undefined
    // Only remove this render's DOM; a later render may already own the target.
    root.remove()
    root.replaceChildren()
    style.remove()
  }
  context?.signal?.addEventListener('abort', unmount, { once: true })
  if (context?.signal?.aborted) unmount()
  const instance: FileViewerXmlRenderedInstance = {
    $el: target, unmount,
    xml: {
      get diagnostics() { return diagnostics.map(item => ({ ...item })) },
      get profileId() { return profileId },
      get view() { return view },
      setView
    }
  }
  const emit = (diagnostic: FileViewerXmlDiagnostic) => {
    if (disposed) return
    const safe = { ...diagnostic, message: diagnostic.message.slice(0, 4096) }
    diagnostics.push(safe)
    diagnosticText.textContent = diagnostics.map(item => `${item.code}${item.profileId ? ` (${item.profileId})` : ''}: ${item.message}`).join('\n')
    details.hidden = false
    try { options.onDiagnostic?.({ ...safe }) } catch { /* Host callbacks do not control preview. */ }
    try {
      context?.options?.onDiagnostic?.({
        code: `xml-profile-${safe.code}`,
        level: ['profile-selected', 'root-mismatch', 'no-match'].includes(safe.code) ? 'info' : 'warning',
        message: safe.message, detail: { profileId: safe.profileId }
      })
    } catch { /* Host callbacks do not control preview. */ }
  }
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    checkXmlAbort(signal)
    // Pretty printing would change the displayed source. Pass the exact input
    // bytes to the existing renderer, with only that display option disabled.
    sourceInstance = await renderCode(buffer, sourceTarget, 'xml', {
      ...context, signal,
      options: { ...context?.options, text: { ...context?.options?.text, prettyPrint: false } }
    })
    if (disposed) { void disposeFileViewerRendered(sourceInstance); return instance }
    const milliseconds = options.timeoutMs ?? 15000
    if (!Number.isFinite(milliseconds) || milliseconds < 1) throw new XmlProfileError('invalid-manifest', 'XML timeout must be a positive number.')
    timeout = setTimeout(() => controller.abort(new XmlProfileError('timeout', 'XML profile processing timed out.')), Math.min(milliseconds, 60000))
    const source = decodeFileViewerTextBuffer(
      buffer,
      context?.options?.text?.encoding,
      context?.options?.text?.fallbackEncoding
    ).text
    const result = await applyXmlProfiles(source, buffer.byteLength, options, doc, signal, emit)
    checkXmlAbort(signal)
    if (result && !disposed) {
      const html = createHtmlPreviewDocument(doc, result.html)
      frame = doc.createElement('iframe')
      frame.className = 'xml-profile-rendered'
      frame.title = options.labels?.viewRendered ?? 'Rendered XML'
      frame.setAttribute('sandbox', '')
      frame.referrerPolicy = 'no-referrer'
      frame.srcdoc = html
      root.insertBefore(frame, sourceTarget)
      profileId = result.profileId
      root.dataset.xmlProfile = profileId
      controls.hidden = false
      setView(options.initialView ?? 'rendered')
    }
  } catch (error) {
    if (!disposed) {
      const failure = signal.aborted && signal.reason instanceof XmlProfileError ? signal.reason : error
      emit(failure instanceof XmlProfileError
        ? { code: failure.code, message: failure.message }
        : { code: 'resource-error', message: failure instanceof Error ? failure.message : 'XML profiles could not be loaded.' })
    }
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
  return instance
}
