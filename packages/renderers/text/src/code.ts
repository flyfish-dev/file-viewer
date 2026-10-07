import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  decodeFileViewerTextBuffer,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState
} from '@file-viewer/core'
import {
  escapeHtml,
  loadHighlighter,
  registerLanguageOnce,
  resolveLanguage
} from './syntaxHighlight.js'
import { codeStyle } from './codeStyle.js'
import renderLargeText, { shouldVirtualizeTextBuffer } from './largeText.js'
import {
  formatFileViewerTextForDisplay,
  resolveFileViewerPrettyPrintMaxBytes,
  supportsFileViewerPrettyPrint,
  type FileViewerPrettyPrintResult
} from './prettyPrint.js'

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: TagName,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName)
  if (className) {
    element.className = className
  }
  if (typeof text === 'string') {
    element.textContent = text
  }
  return element
}

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style')
  style.textContent = codeStyle
  return style
}

const clampZoom = (value: number) => {
  return Math.min(2.6, Math.max(0.6, Number(value.toFixed(2))))
}

const lineCountOf = (value: string) => {
  return value.split(/\r\n|\r|\n/).length
}

const createLineNumberText = (lineCount: number) => {
  return Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n')
}

interface WrappedSourceLine {
  row: HTMLSpanElement
  content: HTMLSpanElement
}

const createWrappedSourceLine = (documentRef: Document, lineNumber: number): WrappedSourceLine => {
  const row = createElement(documentRef, 'span', 'code-source-line')
  row.dataset.line = String(lineNumber)
  const number = createElement(documentRef, 'span', 'code-source-line-number', String(lineNumber))
  number.setAttribute('aria-hidden', 'true')
  const content = createElement(documentRef, 'span', 'code-source-line-content')
  row.append(number, content)
  return { row, content }
}

/**
 * Splits trusted highlight.js markup into logical source-line wrappers while
 * recreating active token spans after every newline. This keeps multiline
 * comments and strings highlighted without coupling visual wrapping to source
 * line numbers.
 */
const mountWrappedHighlightedLines = (
  code: HTMLElement,
  highlightedHtml: string,
  expectedLineCount: number
) => {
  const documentRef = code.ownerDocument
  const staging = createElement(documentRef, 'span')
  staging.innerHTML = highlightedHtml
  const lines: WrappedSourceLine[] = [createWrappedSourceLine(documentRef, 1)]
  let lineIndex = 0
  const activeElements: Element[] = []
  let activeClones: Element[] = []

  const currentContent = () => lines[lineIndex].content
  const currentParent = () => activeClones[activeClones.length - 1] ?? currentContent()

  const continueOnNextLine = () => {
    lineIndex += 1
    lines.push(createWrappedSourceLine(documentRef, lineIndex + 1))
    let parent: Element = currentContent()
    activeClones = activeElements.map((element) => {
      const clone = element.cloneNode(false) as Element
      parent.append(clone)
      parent = clone
      return clone
    })
  }

  const visit = (node: Node) => {
    if (node.nodeType === 3) {
      const parts = (node.textContent ?? '').split(/\r\n|\r|\n/)
      parts.forEach((part, index) => {
        if (part) {
          currentParent().append(documentRef.createTextNode(part))
        }
        if (index < parts.length - 1) {
          continueOnNextLine()
        }
      })
      return
    }
    if (node.nodeType !== 1) {
      return
    }

    const element = node as Element
    const clone = element.cloneNode(false) as Element
    currentParent().append(clone)
    activeElements.push(element)
    activeClones.push(clone)
    Array.from(element.childNodes).forEach(visit)
    activeElements.pop()
    activeClones.pop()
  }

  Array.from(staging.childNodes).forEach(visit)
  while (lines.length < expectedLineCount) {
    lines.push(createWrappedSourceLine(documentRef, lines.length + 1))
  }
  code.replaceChildren(...lines.map((line) => line.row))
}

const mountCodeMarkup = (
  pre: HTMLPreElement,
  code: HTMLElement,
  highlightedHtml: string,
  lineCount: number,
  showLineNumbers: boolean,
  wrapLongLines: boolean
) => {
  code.replaceChildren()
  if (showLineNumbers && wrapLongLines) {
    pre.className = 'code-area code-area--wrapped-line-numbers'
    pre.replaceChildren(code)
    mountWrappedHighlightedLines(code, highlightedHtml, lineCount)
    return
  }

  pre.className = showLineNumbers ? 'code-area code-area--line-numbers' : 'code-area'
  if (showLineNumbers) {
    const gutter = createElement(
      pre.ownerDocument,
      'span',
      'code-line-numbers',
      createLineNumberText(lineCount)
    )
    gutter.setAttribute('aria-hidden', 'true')
    pre.replaceChildren(gutter, code)
  } else {
    pre.replaceChildren(code)
  }
  code.innerHTML = highlightedHtml
}

const canPossiblyFitDecodedPrettyPrintLimit = (buffer: ArrayBuffer, maxBytes: number) => {
  // UTF-16 ASCII is the widest supported source encoding relative to its
  // decoded UTF-8 representation. This fast guard avoids decoding enormous
  // structured files that cannot possibly fit the configured decoded limit.
  return buffer.byteLength <= maxBytes * 2 + 4
}

/**
 * Framework-neutral text/code renderer.
 *
 * highlight.js core, Prettier standalone, and parser definitions are loaded
 * lazily by format. HTML and XML are always mounted as escaped source text and
 * never executed as real DOM.
 */
export default async function renderText(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options)
  const extension = type || 'txt'
  const normalizedExtension = extension.trim().toLowerCase()
  const textOptions = context?.options?.text

  let sourceText: string | undefined
  let prettyPrintResult: FileViewerPrettyPrintResult | undefined
  if (
    textOptions?.prettyPrint === true &&
    supportsFileViewerPrettyPrint(normalizedExtension) &&
    canPossiblyFitDecodedPrettyPrintLimit(buffer, resolveFileViewerPrettyPrintMaxBytes(textOptions))
  ) {
    sourceText = decodeFileViewerTextBuffer(buffer, textOptions.encoding).text
    prettyPrintResult = await formatFileViewerTextForDisplay(
      sourceText,
      normalizedExtension,
      textOptions,
      context?.signal
    )
  }

  if (
    !prettyPrintResult?.formatted &&
    normalizedExtension !== 'bundle' &&
    normalizedExtension !== 'bdl' &&
    shouldVirtualizeTextBuffer(buffer, context)
  ) {
    return renderLargeText(buffer, target, extension, context)
  }
  if (normalizedExtension === 'patch') {
    const { default: renderPatch } = await import('./patch.js')
    return renderPatch(buffer, target, extension, context)
  }
  if (normalizedExtension === 'bundle' || normalizedExtension === 'bdl') {
    const { default: renderGitBundle } = await import('./gitBundle.js')
    return renderGitBundle(buffer, target, extension, context)
  }

  const originalText = sourceText ?? decodeFileViewerTextBuffer(buffer, textOptions?.encoding).text
  const formattedText = prettyPrintResult?.formatted ? prettyPrintResult.text : null
  const language = resolveLanguage(extension)
  const showToolbar = textOptions?.toolbar !== false
  const showLineNumbers = textOptions?.lineNumbers === true
  const wrapLongLines = textOptions?.wrapLongLines === true
  const documentRef = target.ownerDocument
  let disposed = false
  let zoom = 1
  let showingFormatted = formattedText !== null
  let renderGeneration = 0
  const zoomEmitter = createZoomChangeEmitter()
  const root = createElement(
    documentRef,
    'div',
    wrapLongLines ? 'code-viewer code-viewer--wrap-lines' : 'code-viewer'
  )
  root.dataset.viewerZoomProvider = 'code'
  root.dataset.textToolbar = String(showToolbar)
  root.dataset.lineNumbers = String(showLineNumbers)
  root.dataset.wrapLongLines = String(wrapLongLines)
  root.dataset.prettyPrint = prettyPrintResult?.reason ?? 'disabled'

  const toolbar = createElement(documentRef, 'div', 'code-toolbar')
  const extensionLabel = createElement(documentRef, 'span', '', extension.toUpperCase())
  const toolbarMeta = createElement(documentRef, 'div', 'code-toolbar-meta')
  const representationStatus = createElement(documentRef, 'span', 'code-format-status')
  const representationToggle = createElement(documentRef, 'button', 'code-format-toggle')
  representationToggle.type = 'button'
  const lineSummary = createElement(documentRef, 'strong')
  toolbarMeta.append(representationStatus, representationToggle, lineSummary)
  toolbar.append(extensionLabel, toolbarMeta)

  const pre = createElement(documentRef, 'pre', 'code-area')
  const code = createElement(documentRef, 'code', `hljs language-${language}`)
  pre.append(code)
  if (showToolbar) {
    root.append(toolbar)
  }
  root.append(pre)
  root.style.setProperty('--code-font-size', `${13 * zoom}px`)
  target.replaceChildren(createStyle(documentRef), root)

  const currentText = () =>
    showingFormatted && formattedText !== null ? formattedText : originalText

  const syncRepresentationControls = (lineCount: number) => {
    const formatted = showingFormatted && formattedText !== null
    root.dataset.textRepresentation = formatted ? 'formatted' : 'source'
    lineSummary.textContent = `${lineCount} lines`
    representationStatus.hidden = !formatted
    representationStatus.textContent = formatted ? t('text.code.formattedPreview') : ''
    representationToggle.hidden = formattedText === null
    representationToggle.textContent = formatted
      ? t('text.code.showOriginal')
      : t('text.code.showFormatted')
    representationToggle.setAttribute('aria-pressed', String(formatted))
  }

  const renderCurrentRepresentation = async () => {
    const generation = renderGeneration + 1
    renderGeneration = generation
    const text = currentText()
    const lineCount = lineCountOf(text)
    syncRepresentationControls(lineCount)

    if (language === 'plaintext') {
      mountCodeMarkup(pre, code, escapeHtml(text), lineCount, showLineNumbers, wrapLongLines)
      return
    }

    code.textContent = t('text.code.loadingHighlight')
    try {
      const hljs = await loadHighlighter()
      const hasLanguage = await registerLanguageOnce(hljs, language)
      if (disposed || generation !== renderGeneration) {
        return
      }
      const highlighted = hasLanguage
        ? hljs.highlight(text, { language, ignoreIllegals: true }).value
        : escapeHtml(text)
      mountCodeMarkup(pre, code, highlighted, lineCount, showLineNumbers, wrapLongLines)
    } catch {
      if (!disposed && generation === renderGeneration) {
        mountCodeMarkup(pre, code, escapeHtml(text), lineCount, showLineNumbers, wrapLongLines)
      }
    }
  }

  const toggleRepresentation = () => {
    if (formattedText === null) {
      return
    }
    showingFormatted = !showingFormatted
    void renderCurrentRepresentation()
  }
  representationToggle.addEventListener('click', toggleRepresentation)
  await renderCurrentRepresentation()

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 2.6,
    canZoomOut: zoom > 0.6,
    canReset: zoom !== 1,
    minScale: 0.6,
    maxScale: 2.6
  })

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale)
    root.style.setProperty('--code-font-size', `${13 * zoom}px`)
    zoomEmitter.emit()
    return getZoomState()
  }

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })

  return {
    $el: target,
    unmount() {
      disposed = true
      renderGeneration += 1
      representationToggle.removeEventListener('click', toggleRepresentation)
      unregisterFileViewerZoomProvider(root)
      target.replaceChildren()
    }
  }
}
