import createDOMPurify, { type WindowLike } from 'dompurify'
import {
  createFileViewerTranslator,
  decodeFileViewerTextBuffer,
  disposeFileViewerRendered,
  type FileRenderContext,
  type FileViewerRenderedInstance
} from '@file-viewer/core'
import renderCode from './code.js'

const previewPolicy =
  "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"

export function createHtmlPreviewDocument(documentRef: Document, source: string): string {
  const windowRef = documentRef.defaultView
  if (!windowRef) throw new Error('HTML preview requires a browser document')
  const purifier = createDOMPurify(windowRef as unknown as WindowLike)
  const sanitized = purifier.sanitize(source, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    ADD_TAGS: ['style'],
    FORBID_TAGS: [
      'script',
      'base',
      'meta',
      'link',
      'iframe',
      'frame',
      'frameset',
      'object',
      'embed',
      'form',
      'template'
    ],
    FORBID_ATTR: ['srcdoc', 'action', 'formaction', 'target', 'ping', 'srcset']
  })
  const preview = new windowRef.DOMParser().parseFromString(sanitized, 'text/html')
  for (const element of preview.querySelectorAll('*')) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) element.removeAttribute(attribute.name)
      if (name === 'href' && !attribute.value.trim().startsWith('#'))
        element.removeAttribute(attribute.name)
      if (
        name === 'src' &&
        !/^data:image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon|svg\+xml)[;,]/i.test(
          attribute.value.trim()
        )
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  // CSP is first, before any retained inline CSS. The containing iframe also has
  // an opaque origin and no sandbox permissions, even if sanitization regresses.
  const policy = preview.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  policy.content = previewPolicy
  const viewport = preview.createElement('meta')
  viewport.name = 'viewport'
  viewport.content = 'width=device-width, initial-scale=1'
  preview.head.prepend(policy, viewport)
  return `<!doctype html>\n${preview.documentElement.outerHTML}`
}

export default async function renderHtml(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument
  const t = createFileViewerTranslator(context?.options)
  const root = documentRef.createElement('div')
  root.className = 'html-viewer'
  const style = documentRef.createElement('style')
  style.textContent = `
.html-viewer{height:100%;min-height:0;display:flex;flex-direction:column}
.html-viewer-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #dbe2e8;background:var(--file-viewer-panel,#f8fafc);color:var(--file-viewer-text,#172033)}
.html-viewer-toolbar button{border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;background:transparent;color:inherit;cursor:pointer;min-height:36px}
.html-viewer-toolbar button[aria-pressed="true"]{border-color:#0f766e;background:#0f766e;color:white}
.html-viewer-hint{font-size:12px;flex:1 1 160px}
.html-preview-frame,.html-source-view{flex:1;width:100%;min-height:0;border:0}
.html-preview-frame{background:white}
.html-source-view{overflow:auto}
.html-viewer [hidden]{display:none!important}
@media(max-width:600px){.html-viewer-toolbar button{min-height:44px}}
`
  const toolbar = documentRef.createElement('div')
  toolbar.className = 'html-viewer-toolbar'
  const previewButton = documentRef.createElement('button')
  previewButton.type = 'button'
  previewButton.textContent = t('text.html.preview')
  previewButton.dataset.htmlView = 'preview'
  const sourceButton = documentRef.createElement('button')
  sourceButton.type = 'button'
  sourceButton.textContent = t('text.html.source')
  sourceButton.dataset.htmlView = 'source'
  const hint = documentRef.createElement('span')
  hint.className = 'html-viewer-hint'
  hint.textContent = t('text.html.safePreview')
  toolbar.append(previewButton, sourceButton, hint)
  const frame = documentRef.createElement('iframe')
  frame.className = 'html-preview-frame'
  frame.title = t('text.html.preview')
  frame.setAttribute('sandbox', '')
  frame.referrerPolicy = 'no-referrer'
  const sourceTarget = documentRef.createElement('div')
  sourceTarget.className = 'html-source-view'
  if (context?.options?.text?.toolbar !== false) root.append(toolbar)
  root.append(frame, sourceTarget)
  target.replaceChildren(style, root)
  let sourceInstance: FileViewerRenderedInstance | undefined
  let sourcePending: Promise<void> | undefined
  let disposed = false
  const select = async (view: 'source' | 'preview') => {
    if (disposed) return
    root.dataset.htmlView = view
    previewButton.setAttribute('aria-pressed', String(view === 'preview'))
    sourceButton.setAttribute('aria-pressed', String(view === 'source'))
    frame.hidden = view !== 'preview'
    sourceTarget.hidden = view !== 'source'
    hint.hidden = view !== 'preview'
    if (view === 'preview' && !frame.hasAttribute('srcdoc')) {
      frame.srcdoc = createHtmlPreviewDocument(
        documentRef,
        decodeFileViewerTextBuffer(buffer, context?.options?.text?.encoding).text
      )
    }
    if (view === 'source' && !sourcePending) {
      sourcePending = renderCode(buffer, sourceTarget, type, context).then((instance) => {
        if (disposed) disposeFileViewerRendered(instance)
        else sourceInstance = instance
      })
    }
    await sourcePending
  }
  const showPreview = () => {
    void select('preview')
  }
  const showSource = () => {
    void select('source')
  }
  previewButton.addEventListener('click', showPreview)
  sourceButton.addEventListener('click', showSource)
  await select(context?.options?.text?.htmlView || 'preview')
  return {
    $el: target,
    unmount() {
      disposed = true
      previewButton.removeEventListener('click', showPreview)
      sourceButton.removeEventListener('click', showSource)
      disposeFileViewerRendered(sourceInstance)
      target.replaceChildren()
    }
  }
}
