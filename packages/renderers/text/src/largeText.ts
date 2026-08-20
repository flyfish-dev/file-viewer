import {
  DEFAULT_FILE_VIEWER_SEARCH_MAX_MATCHES,
  createFileViewerTextDecoder,
  createEmptyFileViewerSearchState,
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  normalizeFileViewerSearchOptions,
  resolveFileViewerTextEncoding,
  registerFileViewerSearchProvider,
  registerFileViewerZoomProvider,
  unregisterFileViewerSearchProvider,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerSearchMatch,
  type FileViewerSearchOptions,
  type FileViewerSearchState,
  type ResolvedFileViewerTextEncoding,
  type FileViewerZoomState
} from '@file-viewer/core'
import { codeStyle } from './codeStyle.js'

export const DEFAULT_LARGE_TEXT_THRESHOLD_BYTES = 512 * 1024
export const DEFAULT_LARGE_TEXT_LINE_SEGMENT_BYTES = 16 * 1024
export const DEFAULT_LARGE_TEXT_OVERSCAN_LINES = 12

const LARGE_TEXT_LINE_CHECKPOINT_STRIDE = 256
const LARGE_TEXT_INDEX_YIELD_BYTES = 4 * 1024 * 1024
const LARGE_TEXT_SEARCH_CHUNK_BYTES = 256 * 1024
const LARGE_TEXT_MAX_SCROLL_HEIGHT = 8_000_000
const LARGE_TEXT_BASE_LINE_HEIGHT = 22.1

interface LargeTextIndex {
  bytes: Uint8Array;
  checkpoints: number[];
  encoding: ResolvedFileViewerTextEncoding;
  lineCount: number;
}

interface LargeTextLineBounds {
  lineIndex: number;
  start: number;
  end: number;
}

interface LargeTextSearchMatch extends FileViewerSearchMatch {
  byteOffset: number;
  lineIndex: number;
}

const clamp = (value: number, minimum: number, maximum: number) => {
  return Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, value))
    : minimum
}

const clampZoom = (value: number) => {
  return Math.min(2.6, Math.max(0.6, Number(value.toFixed(2))))
}

const getWindow = (target: HTMLElement) => target.ownerDocument.defaultView

const nextBrowserTurn = (target: HTMLElement) => {
  const view = getWindow(target)
  return new Promise<void>(resolve => {
    if (view?.setTimeout) {
      view.setTimeout(resolve, 0)
      return
    }
    setTimeout(resolve, 0)
  })
}

const isUtf8ContinuationByte = (value: number) => (value & 0xc0) === 0x80

const alignUtf8Start = (bytes: Uint8Array, offset: number, limit: number) => {
  let nextOffset = clamp(offset, 0, limit)
  while (nextOffset < limit && isUtf8ContinuationByte(bytes[nextOffset])) {
    nextOffset += 1
  }
  return nextOffset
}

const alignUtf8End = (bytes: Uint8Array, offset: number, limit: number) => {
  let nextOffset = clamp(offset, 0, limit)
  while (nextOffset < limit && isUtf8ContinuationByte(bytes[nextOffset])) {
    nextOffset += 1
  }
  return nextOffset
}

const gb18030UnitLength = (bytes: Uint8Array, offset: number, limit: number) => {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]
  const fourth = bytes[offset + 3]
  if (first === undefined || first <= 0x7f) {
    return 1
  }
  if (first >= 0x81 && first <= 0xfe) {
    if (
      second !== undefined && second >= 0x30 && second <= 0x39 &&
      third !== undefined && third >= 0x81 && third <= 0xfe &&
      fourth !== undefined && fourth >= 0x30 && fourth <= 0x39 &&
      offset + 4 <= limit
    ) {
      return 4
    }
    if (
      second !== undefined &&
      ((second >= 0x40 && second <= 0x7e) || (second >= 0x80 && second <= 0xfe)) &&
      offset + 2 <= limit
    ) {
      return 2
    }
  }
  return 1
}

const alignGb18030Boundary = (
  bytes: Uint8Array,
  knownBoundary: number,
  requestedOffset: number,
  limit: number
) => {
  let cursor = clamp(knownBoundary, 0, limit)
  const requested = clamp(requestedOffset, cursor, limit)
  while (cursor < requested) {
    cursor = Math.min(limit, cursor + gb18030UnitLength(bytes, cursor, limit))
  }
  return cursor
}

const alignTextBoundary = (
  index: Pick<LargeTextIndex, 'bytes' | 'encoding'>,
  knownBoundary: number,
  requestedOffset: number,
  limit: number
) => {
  return index.encoding === 'gb18030'
    ? alignGb18030Boundary(index.bytes, knownBoundary, requestedOffset, limit)
    : alignUtf8End(index.bytes, requestedOffset, limit)
}

const isLineBreak = (bytes: Uint8Array, offset: number) => {
  const byte = bytes[offset]
  if (byte === 13) {
    return bytes[offset + 1] === 10 ? 2 : 1
  }
  return byte === 10 ? 1 : 0
}

const buildLargeTextIndex = async (
  bytes: Uint8Array,
  encoding: ResolvedFileViewerTextEncoding,
  target: HTMLElement,
  onProgress: (progress: number) => void
): Promise<LargeTextIndex> => {
  const checkpoints = [0]
  let lineIndex = 0
  let offset = 0
  let nextYieldOffset = LARGE_TEXT_INDEX_YIELD_BYTES

  while (offset < bytes.byteLength) {
    const lineBreakSize = isLineBreak(bytes, offset)
    if (lineBreakSize) {
      offset += lineBreakSize
      lineIndex += 1
      if (lineIndex % LARGE_TEXT_LINE_CHECKPOINT_STRIDE === 0) {
        checkpoints.push(offset)
      }
    } else {
      offset += 1
    }

    if (offset >= nextYieldOffset) {
      onProgress(Math.min(99, Math.round((offset / Math.max(1, bytes.byteLength)) * 100)))
      nextYieldOffset = offset + LARGE_TEXT_INDEX_YIELD_BYTES
      await nextBrowserTurn(target)
    }
  }

  onProgress(100)
  return {
    bytes,
    checkpoints,
    encoding,
    lineCount: lineIndex + 1
  }
}

const locateLargeTextLineStart = (index: LargeTextIndex, requestedLine: number) => {
  const lineIndex = clamp(Math.trunc(requestedLine), 0, index.lineCount - 1)
  const checkpointIndex = Math.floor(lineIndex / LARGE_TEXT_LINE_CHECKPOINT_STRIDE)
  let currentLine = checkpointIndex * LARGE_TEXT_LINE_CHECKPOINT_STRIDE
  let offset = index.checkpoints[checkpointIndex] ?? 0

  while (currentLine < lineIndex && offset < index.bytes.byteLength) {
    const lineBreakSize = isLineBreak(index.bytes, offset)
    offset += lineBreakSize || 1
    if (lineBreakSize) {
      currentLine += 1
    }
  }
  return offset
}

const readLargeTextLineBounds = (
  index: LargeTextIndex,
  startLine: number,
  count: number
): LargeTextLineBounds[] => {
  const lines: LargeTextLineBounds[] = []
  let lineIndex = clamp(Math.trunc(startLine), 0, index.lineCount - 1)
  let offset = locateLargeTextLineStart(index, lineIndex)

  while (lines.length < count && lineIndex < index.lineCount) {
    const start = offset
    while (offset < index.bytes.byteLength && !isLineBreak(index.bytes, offset)) {
      offset += 1
    }
    lines.push({ lineIndex, start, end: offset })
    const lineBreakSize = isLineBreak(index.bytes, offset)
    offset += lineBreakSize
    lineIndex += 1
  }

  return lines
}

const findLargeTextLineAtOffset = (index: LargeTextIndex, requestedOffset: number) => {
  const offset = clamp(Math.trunc(requestedOffset), 0, index.bytes.byteLength)
  let low = 0
  let high = index.checkpoints.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((index.checkpoints[middle] ?? 0) <= offset) {
      low = middle
    } else {
      high = middle - 1
    }
  }

  let lineIndex = low * LARGE_TEXT_LINE_CHECKPOINT_STRIDE
  let cursor = index.checkpoints[low] ?? 0
  while (cursor < offset && cursor < index.bytes.byteLength) {
    const lineBreakSize = isLineBreak(index.bytes, cursor)
    cursor += lineBreakSize || 1
    if (lineBreakSize) {
      lineIndex += 1
    }
  }
  return clamp(lineIndex, 0, index.lineCount - 1)
}

const decodeLargeTextSegment = (
  index: LargeTextIndex,
  line: LargeTextLineBounds,
  segmentIndex: number,
  segmentBytes: number
) => {
  const segmentCount = Math.max(1, Math.ceil((line.end - line.start) / segmentBytes))
  const normalizedSegment = clamp(Math.trunc(segmentIndex), 0, segmentCount - 1)
  const rawStart = line.start + (normalizedSegment * segmentBytes)
  const rawEnd = Math.min(line.end, rawStart + segmentBytes)
  const start = index.encoding === 'gb18030'
    ? alignTextBoundary(index, line.start, rawStart, line.end)
    : alignUtf8Start(index.bytes, rawStart, line.end)
  const end = alignTextBoundary(index, start, rawEnd, line.end)
  return {
    text: createFileViewerTextDecoder(index.encoding).decode(index.bytes.subarray(start, end)),
    segmentCount,
    segmentIndex: normalizedSegment
  }
}

const formatLargeNumber = (value: number) => {
  try {
    return new Intl.NumberFormat().format(value)
  } catch {
    return String(value)
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const createLargeTextSearchRegExp = (query: string, options: FileViewerSearchOptions) => {
  const escaped = escapeRegExp(query)
  return new RegExp(options.wholeWord ? `\\b${escaped}\\b` : escaped, options.caseSensitive ? 'g' : 'gi')
}

const cloneLargeTextSearchState = (state: FileViewerSearchState): FileViewerSearchState => ({
  ...state,
  current: state.current ? { ...state.current } : null,
  matches: state.matches.map(match => ({ ...match }))
})

export const shouldVirtualizeTextBuffer = (buffer: ArrayBuffer, context?: FileRenderContext) => {
  const configured = context?.options?.text?.virtualizeAboveBytes
  const threshold = Number.isFinite(configured)
    ? Math.max(0, Number(configured))
    : DEFAULT_LARGE_TEXT_THRESHOLD_BYTES
  if (buffer.byteLength <= threshold) {
    return false
  }
  const bytes = new Uint8Array(buffer)
  const { encoding } = resolveFileViewerTextEncoding(bytes, context?.options?.text?.encoding)
  return encoding !== 'utf-16le' && encoding !== 'utf-16be'
}

export const shouldVirtualizeMarkdownBuffer = (buffer: ArrayBuffer, context?: FileRenderContext) => {
  const configured = context?.options?.text?.markdownVirtualizeAboveBytes
  if (!Number.isFinite(configured)) {
    return false
  }
  if (buffer.byteLength <= Math.max(0, Number(configured))) {
    return false
  }
  const bytes = new Uint8Array(buffer)
  const { encoding } = resolveFileViewerTextEncoding(bytes, context?.options?.text?.encoding)
  return encoding !== 'utf-16le' && encoding !== 'utf-16be'
}

const largeTextStyle = `
.code-viewer--virtual{height:100%;min-height:240px;display:flex;flex-direction:column;overflow:hidden}
.code-viewer--virtual .code-toolbar{flex:0 0 42px}
.code-toolbar-meta{display:inline-flex;min-width:0;align-items:center;justify-content:flex-end;gap:10px;white-space:nowrap}
.code-toolbar-meta span{overflow:hidden;text-overflow:ellipsis}
.code-virtual-scroll{position:relative;flex:1 1 auto;min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;contain:strict;background:var(--code-bg)}
.code-virtual-spacer{position:relative;min-width:100%}
.code-virtual-window{position:absolute;top:0;left:0;min-width:100%;will-change:transform}
.code-virtual-line{display:flex;height:var(--code-line-height,22.1px);min-width:max-content;align-items:stretch;color:var(--code-text);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:var(--code-font-size,13px);line-height:var(--code-line-height,22.1px);white-space:pre;contain:layout paint style}
.code-virtual-line--match{background:rgba(255,215,0,.18)}
.code-virtual-number{position:sticky;left:0;z-index:1;display:inline-block;width:var(--code-line-number-width,7ch);flex:0 0 var(--code-line-number-width,7ch);padding:0 1.25ch 0 .75ch;border-right:1px solid var(--code-border);background:var(--code-bg);color:var(--code-muted);text-align:right;user-select:none;box-sizing:border-box}
.code-virtual-content{display:inline-block;padding:0 18px;white-space:pre}
.code-virtual-content mark{border-radius:2px;background:#ffd54f;color:#1f2328}
.code-line-segments{position:sticky;left:var(--code-line-number-offset,var(--code-line-number-width,7ch));z-index:1;display:inline-flex;height:100%;align-items:center;gap:2px;padding:0 4px;border-right:1px solid var(--code-border);background:var(--code-toolbar-bg)}
.code-line-segments button{width:22px;height:18px;padding:0;border:1px solid var(--code-border);border-radius:4px;background:var(--code-bg);color:var(--code-muted);font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}
.code-line-segments button:disabled{cursor:not-allowed;opacity:.4}
.code-line-segments span{min-width:64px;color:var(--code-muted);font-size:11px;line-height:1;text-align:center}
`

export default async function renderLargeText(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'txt',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options)
  const documentRef = target.ownerDocument
  const sourceBytes = new Uint8Array(buffer)
  const source = resolveFileViewerTextEncoding(sourceBytes, context?.options?.text?.encoding)
  const bytes = sourceBytes.subarray(source.bomLength)
  const configuredSegmentBytes = context?.options?.text?.maxRenderedLineBytes
  const segmentBytes = Number.isFinite(configuredSegmentBytes)
    ? clamp(Math.trunc(Number(configuredSegmentBytes)), 1024, 256 * 1024)
    : DEFAULT_LARGE_TEXT_LINE_SEGMENT_BYTES
  const configuredOverscan = context?.options?.text?.virtualOverscanLines
  const overscan = Number.isFinite(configuredOverscan)
    ? clamp(Math.trunc(Number(configuredOverscan)), 2, 100)
    : DEFAULT_LARGE_TEXT_OVERSCAN_LINES
  const showToolbar = context?.options?.text?.toolbar !== false
  // Undefined preserves the large-text renderer's pre-option behavior. An
  // explicit boolean has the same meaning in both regular and virtual views.
  const showLineNumbers = context?.options?.text?.lineNumbers !== false
  let disposed = false
  let zoom = 1
  let scheduledFrame = 0
  let lastWindowStart = -1
  let activeLine = -1
  let searchGeneration = 0
  const lineSegments = new Map<number, number>()
  const zoomEmitter = createZoomChangeEmitter()

  const style = documentRef.createElement('style')
  style.textContent = `${codeStyle}\n${largeTextStyle}`
  const root = documentRef.createElement('div')
  root.className = showLineNumbers
    ? 'code-viewer code-viewer--virtual code-viewer--line-numbers'
    : 'code-viewer code-viewer--virtual'
  root.dataset.viewerZoomProvider = 'code'
  root.dataset.viewerSearchProvider = 'code-virtual'
  root.dataset.textToolbar = String(showToolbar)
  root.dataset.lineNumbers = String(showLineNumbers)
  root.dataset.textEncoding = source.encoding
  const toolbar = documentRef.createElement('div')
  toolbar.className = 'code-toolbar'
  const extensionLabel = documentRef.createElement('span')
  extensionLabel.textContent = type.toUpperCase()
  const toolbarMeta = documentRef.createElement('div')
  toolbarMeta.className = 'code-toolbar-meta'
  const status = documentRef.createElement('span')
  const lineSummary = documentRef.createElement('strong')
  status.textContent = t('text.code.indexingLargeFile', { progress: 0 })
  toolbarMeta.append(status, lineSummary)
  toolbar.append(extensionLabel, toolbarMeta)
  if (showToolbar) {
    root.append(toolbar)
  }
  target.replaceChildren(style, root)
  context?.onProgressiveRender?.()

  const index = await buildLargeTextIndex(bytes, source.encoding, target, progress => {
    if (!disposed) {
      status.textContent = t('text.code.indexingLargeFile', { progress })
    }
  })
  if (disposed) {
    return { $el: target, unmount() {} }
  }

  status.textContent = t('text.code.virtualized')
  root.dataset.totalLines = String(index.lineCount)
  lineSummary.textContent = `${formatLargeNumber(index.lineCount)} lines`
  root.style.setProperty('--code-line-number-width', `${Math.max(6, String(index.lineCount).length + 2)}ch`)
  root.style.setProperty('--code-line-number-offset', showLineNumbers ? 'var(--code-line-number-width)' : '0px')

  const viewport = documentRef.createElement('div')
  viewport.className = 'code-virtual-scroll'
  viewport.dataset.viewerScrollContainer = 'true'
  viewport.tabIndex = 0
  const spacer = documentRef.createElement('div')
  spacer.className = 'code-virtual-spacer'
  const windowElement = documentRef.createElement('div')
  windowElement.className = 'code-virtual-window'
  spacer.append(windowElement)
  viewport.append(spacer)
  root.append(viewport)

  const getLineHeight = () => LARGE_TEXT_BASE_LINE_HEIGHT * zoom
  const getViewportHeight = () => Math.max(240, viewport.clientHeight || 600)
  const getWindowLineCount = () => Math.min(
    index.lineCount,
    Math.ceil(getViewportHeight() / getLineHeight()) + (overscan * 2) + 2
  )
  const getSpacerHeight = () => Math.min(
    LARGE_TEXT_MAX_SCROLL_HEIGHT,
    Math.max(getViewportHeight(), index.lineCount * getLineHeight())
  )
  const usesCappedScrollHeight = () => index.lineCount * getLineHeight() > LARGE_TEXT_MAX_SCROLL_HEIGHT

  const updateSpacerHeight = () => {
    root.style.setProperty('--code-font-size', `${13 * zoom}px`)
    root.style.setProperty('--code-line-height', `${getLineHeight()}px`)
    spacer.style.height = `${getSpacerHeight()}px`
  }

  const getFirstVisibleLine = () => {
    if (!usesCappedScrollHeight()) {
      return clamp(Math.floor(viewport.scrollTop / getLineHeight()), 0, index.lineCount - 1)
    }
    const maxScrollTop = Math.max(1, getSpacerHeight() - getViewportHeight())
    return clamp(
      Math.round((viewport.scrollTop / maxScrollTop) * (index.lineCount - 1)),
      0,
      index.lineCount - 1
    )
  }

  const getWindowOffset = (startLine: number, renderedLineCount: number) => {
    if (!usesCappedScrollHeight()) {
      return startLine * getLineHeight()
    }
    const maxStart = Math.max(1, index.lineCount - renderedLineCount)
    const maxOffset = Math.max(0, getSpacerHeight() - (renderedLineCount * getLineHeight()))
    return (startLine / maxStart) * maxOffset
  }

  const appendHighlightedContent = (
    content: HTMLElement,
    text: string,
    query: string
  ) => {
    if (!query) {
      content.textContent = text || ' '
      return
    }
    const position = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
    if (position < 0) {
      content.textContent = text || ' '
      return
    }
    content.append(
      documentRef.createTextNode(text.slice(0, position)),
      Object.assign(documentRef.createElement('mark'), { textContent: text.slice(position, position + query.length) }),
      documentRef.createTextNode(text.slice(position + query.length))
    )
  }

  let searchState = createEmptyFileViewerSearchState()

  const renderWindow = (force = false) => {
    if (disposed) {
      return
    }
    const firstVisibleLine = getFirstVisibleLine()
    const visibleCount = getWindowLineCount()
    const startLine = clamp(firstVisibleLine - overscan, 0, Math.max(0, index.lineCount - visibleCount))
    if (!force && startLine === lastWindowStart) {
      return
    }
    lastWindowStart = startLine
    const lines = readLargeTextLineBounds(index, startLine, visibleCount)
    const fragment = documentRef.createDocumentFragment()

    for (const line of lines) {
      const row = documentRef.createElement('div')
      row.className = 'code-virtual-line'
      row.dataset.line = String(line.lineIndex + 1)
      if (line.lineIndex === activeLine) {
        row.classList.add('code-virtual-line--match')
      }
      if (showLineNumbers) {
        const number = documentRef.createElement('span')
        number.className = 'code-virtual-number'
        number.setAttribute('aria-hidden', 'true')
        number.textContent = String(line.lineIndex + 1)
        row.append(number)
      }

      const currentSegment = lineSegments.get(line.lineIndex) ?? 0
      const decoded = decodeLargeTextSegment(index, line, currentSegment, segmentBytes)
      if (decoded.segmentCount > 1) {
        const segments = documentRef.createElement('span')
        segments.className = 'code-line-segments'
        const actions = [
          ['first', '⇤', t('text.code.firstSegment')],
          ['previous', '‹', t('text.code.previousSegment')],
          ['next', '›', t('text.code.nextSegment')],
          ['last', '⇥', t('text.code.lastSegment')]
        ] as const
        for (const [action, label, title] of actions.slice(0, 2)) {
          const button = documentRef.createElement('button')
          button.type = 'button'
          button.dataset.segmentAction = action
          button.dataset.lineIndex = String(line.lineIndex)
          button.title = title
          button.setAttribute('aria-label', title)
          button.textContent = label
          button.disabled = decoded.segmentIndex === 0
          segments.append(button)
        }
        const segmentLabel = documentRef.createElement('span')
        segmentLabel.textContent = `${decoded.segmentIndex + 1}/${decoded.segmentCount}`
        segments.append(segmentLabel)
        for (const [action, label, title] of actions.slice(2)) {
          const button = documentRef.createElement('button')
          button.type = 'button'
          button.dataset.segmentAction = action
          button.dataset.lineIndex = String(line.lineIndex)
          button.title = title
          button.setAttribute('aria-label', title)
          button.textContent = label
          button.disabled = decoded.segmentIndex === decoded.segmentCount - 1
          segments.append(button)
        }
        row.append(segments)
      }

      const content = documentRef.createElement('span')
      content.className = 'code-virtual-content'
      appendHighlightedContent(
        content,
        decoded.text,
        line.lineIndex === activeLine ? searchState.query : ''
      )
      row.append(content)
      fragment.append(row)
    }

    windowElement.replaceChildren(fragment)
    windowElement.style.transform = `translateY(${getWindowOffset(startLine, lines.length)}px)`
  }

  const scheduleRender = () => {
    if (scheduledFrame || disposed) {
      return
    }
    const view = getWindow(target)
    if (view?.requestAnimationFrame) {
      scheduledFrame = view.requestAnimationFrame(() => {
        scheduledFrame = 0
        renderWindow()
      })
      return
    }
    scheduledFrame = Number(view?.setTimeout?.(() => {
      scheduledFrame = 0
      renderWindow()
    }, 0) ?? setTimeout(() => {
      scheduledFrame = 0
      renderWindow()
    }, 0))
  }

  const scrollToLine = (requestedLine: number) => {
    const lineIndex = clamp(Math.trunc(requestedLine), 0, index.lineCount - 1)
    if (usesCappedScrollHeight()) {
      const maxScrollTop = Math.max(0, getSpacerHeight() - getViewportHeight())
      viewport.scrollTop = index.lineCount > 1
        ? (lineIndex / (index.lineCount - 1)) * maxScrollTop
        : 0
    } else {
      viewport.scrollTop = lineIndex * getLineHeight()
    }
    lastWindowStart = -1
    renderWindow(true)
  }

  const setActiveSearchMatch = (requestedIndex: number) => {
    const matches = searchState.matches as LargeTextSearchMatch[]
    if (!matches.length) {
      activeLine = -1
      searchState.currentIndex = -1
      searchState.current = null
      renderWindow(true)
      return cloneLargeTextSearchState(searchState)
    }
    const currentIndex = ((requestedIndex % matches.length) + matches.length) % matches.length
    const match = matches[currentIndex]
    searchState.currentIndex = currentIndex
    searchState.current = match
    activeLine = match.lineIndex
    const lineStart = locateLargeTextLineStart(index, match.lineIndex)
    lineSegments.set(match.lineIndex, Math.max(0, Math.floor((match.byteOffset - lineStart) / segmentBytes)))
    scrollToLine(match.lineIndex)
    return cloneLargeTextSearchState(searchState)
  }

  const clearSearch = () => {
    searchGeneration += 1
    searchState = createEmptyFileViewerSearchState()
    activeLine = -1
    renderWindow(true)
    return cloneLargeTextSearchState(searchState)
  }

  const searchLargeText = async (rawQuery: string, rawOptions?: FileViewerSearchOptions) => {
    const query = rawQuery.replace(/\s+/g, ' ').trim()
    const options = normalizeFileViewerSearchOptions(rawOptions)
    if (!query || options.enabled === false) {
      return clearSearch()
    }

    const generation = searchGeneration + 1
    searchGeneration = generation
    const matches: LargeTextSearchMatch[] = []
    const maxMatches = Math.max(1, options.maxMatches || DEFAULT_FILE_VIEWER_SEARCH_MAX_MATCHES)
    const expression = createLargeTextSearchRegExp(query, options)
    const encoder = new TextEncoder()
    const encodedQueryBytes = index.encoding === 'gb18030'
      ? query.length * 4
      : encoder.encode(query).byteLength
    const overlap = clamp(encodedQueryBytes * 2, 256, 64 * 1024)

    const advanceBytesForCharacters = (
      start: number,
      end: number,
      characterCount: number
    ) => {
      if (index.encoding !== 'gb18030') {
        const decoded = createFileViewerTextDecoder(index.encoding).decode(index.bytes.subarray(start, end))
        return encoder.encode(decoded.slice(0, characterCount)).byteLength
      }
      let cursor = start
      let characters = 0
      while (cursor < end && characters < characterCount) {
        const size = gb18030UnitLength(index.bytes, cursor, end)
        characters += size === 4
          ? createFileViewerTextDecoder('gb18030').decode(index.bytes.subarray(cursor, cursor + size)).length
          : 1
        cursor += size
      }
      return cursor - start
    }

    for (let primaryStart = 0; primaryStart < index.bytes.byteLength && matches.length < maxMatches;) {
      const primaryEnd = alignTextBoundary(
        index,
        primaryStart,
        Math.min(index.bytes.byteLength, primaryStart + LARGE_TEXT_SEARCH_CHUNK_BYTES),
        index.bytes.byteLength
      )
      const decodeStart = primaryStart
      const decodeEnd = alignTextBoundary(
        index,
        primaryStart,
        Math.min(index.bytes.byteLength, primaryEnd + overlap),
        index.bytes.byteLength
      )
      const text = createFileViewerTextDecoder(index.encoding).decode(index.bytes.subarray(decodeStart, decodeEnd))
      let lastCharacterOffset = 0
      let byteCursor = decodeStart
      expression.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = expression.exec(text)) && matches.length < maxMatches) {
        if (!match[0]) {
          expression.lastIndex += 1
          continue
        }
        byteCursor += advanceBytesForCharacters(
          byteCursor,
          decodeEnd,
          match.index - lastCharacterOffset
        )
        const matchByteOffset = byteCursor
        byteCursor += advanceBytesForCharacters(byteCursor, decodeEnd, match[0].length)
        lastCharacterOffset = match.index + match[0].length
        if (matchByteOffset < primaryStart || matchByteOffset >= primaryEnd) {
          continue
        }
        const lineIndex = findLargeTextLineAtOffset(index, matchByteOffset)
        matches.push({
          id: `code-virtual-search-${matches.length + 1}`,
          index: matches.length,
          text: match[0],
          anchor: null,
          line: lineIndex + 1,
          byteOffset: matchByteOffset,
          lineIndex
        })
      }

      primaryStart = primaryEnd
      await nextBrowserTurn(target)
      if (disposed || generation !== searchGeneration) {
        return cloneLargeTextSearchState(searchState)
      }
    }

    searchState = {
      query,
      total: matches.length,
      currentIndex: matches.length ? 0 : -1,
      current: matches[0] || null,
      matches
    }
    return matches.length ? setActiveSearchMatch(0) : cloneLargeTextSearchState(searchState)
  }

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
    const firstVisibleLine = getFirstVisibleLine()
    zoom = clampZoom(scale)
    updateSpacerHeight()
    scrollToLine(firstVisibleLine)
    zoomEmitter.emit()
    return getZoomState()
  }

  registerFileViewerSearchProvider(root, {
    search: searchLargeText,
    next: () => setActiveSearchMatch(searchState.currentIndex + 1),
    previous: () => setActiveSearchMatch(searchState.currentIndex - 1),
    clear: clearSearch,
    getState: () => cloneLargeTextSearchState(searchState)
  })
  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })
  context?.registerExportAdapter?.({ print: false, exportHtml: false })

  viewport.addEventListener('scroll', scheduleRender, { passive: true })
  viewport.addEventListener('click', event => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button[data-segment-action]')
    if (!button) {
      return
    }
    const lineIndex = Number(button.dataset.lineIndex)
    const line = readLargeTextLineBounds(index, lineIndex, 1)[0]
    if (!line) {
      return
    }
    const segmentCount = Math.max(1, Math.ceil((line.end - line.start) / segmentBytes))
    const current = lineSegments.get(lineIndex) ?? 0
    const action = button.dataset.segmentAction
    const next = action === 'first'
      ? 0
      : action === 'last'
        ? segmentCount - 1
        : action === 'previous'
          ? current - 1
          : current + 1
    lineSegments.set(lineIndex, clamp(next, 0, segmentCount - 1))
    renderWindow(true)
  })

  const ResizeObserverCtor = getWindow(target)?.ResizeObserver
  const resizeObserver = ResizeObserverCtor
    ? new ResizeObserverCtor(() => {
        updateSpacerHeight()
        renderWindow(true)
      })
    : null
  resizeObserver?.observe(viewport)

  updateSpacerHeight()
  renderWindow(true)

  return {
    $el: target,
    unmount() {
      disposed = true
      searchGeneration += 1
      const view = getWindow(target)
      if (scheduledFrame && view?.cancelAnimationFrame) {
        view.cancelAnimationFrame(scheduledFrame)
      } else if (scheduledFrame) {
        view?.clearTimeout?.(scheduledFrame)
      }
      resizeObserver?.disconnect()
      viewport.removeEventListener('scroll', scheduleRender)
      unregisterFileViewerSearchProvider(root)
      unregisterFileViewerZoomProvider(root)
      context?.registerExportAdapter?.(null)
      target.replaceChildren()
    }
  }
}
