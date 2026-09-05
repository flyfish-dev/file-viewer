import {
  createFileViewerZoomChangeEmitter,
  registerFileViewerZoomProvider,
  resolveFileViewerIllustratorWorkerUrl,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerDesignOptions,
  type FileViewerRenderedInstance,
  type FileViewerZoomState,
} from '@file-viewer/core'
import {
  WorkerIllustratorEngine,
  type IllustratorArtboard,
  type IllustratorDiagnostic,
  type IllustratorDocument,
  type IllustratorDocumentSummary,
  type IllustratorEngine,
  type IllustratorFidelity,
  type IllustratorLayerNode,
  type IllustratorLimits,
  type IllustratorSupportReport,
} from 'illustrator-pgf'
import { inspectIllustratorPdfSurface } from './illustratorPreflight.js'

const illustratorStyle = `
.ai-viewer{display:grid;width:100%;max-width:100%;height:100%;min-width:0;min-height:460px;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);overflow:hidden;--ai-bg:#eceff3;--ai-surface:#fff;--ai-border:rgba(15,23,42,.12);--ai-text:#182235;--ai-muted:#64748b;--ai-accent:#c65a05;background:var(--ai-bg);color:var(--ai-text);box-sizing:border-box}.ai-modebar{position:relative;z-index:8;display:flex;min-width:0;min-height:42px;align-items:center;justify-content:space-between;gap:12px;padding:6px 12px;border-bottom:1px solid var(--ai-border);background:rgba(255,255,255,.95);box-sizing:border-box}.ai-mode-copy{min-width:0;overflow:hidden;color:var(--ai-muted);font-size:11px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.ai-mode-actions{display:flex;flex-shrink:0;gap:5px}.ai-mode-actions button{height:29px;padding:0 10px;border:1px solid rgba(100,116,139,.28);border-radius:7px;background:var(--ai-surface);color:var(--ai-text);cursor:pointer;font-size:11px;font-weight:850}.ai-mode-actions button[data-active='true']{border-color:rgba(198,90,5,.5);background:rgba(255,154,0,.12);color:#a34600}.ai-mode-actions button:disabled{cursor:wait;opacity:.55}.ai-content{width:100%;max-width:100%;min-width:0;min-height:0;overflow:hidden;box-sizing:border-box}.ai-native{display:grid;width:100%;max-width:100%;height:100%;min-width:0;min-height:0;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);overflow:hidden;background:var(--ai-bg);box-sizing:border-box}.ai-toolbar{display:flex;min-width:0;min-height:52px;align-items:center;justify-content:space-between;gap:12px;padding:8px 13px;overflow:hidden;border-bottom:1px solid var(--ai-border);background:rgba(255,255,255,.92);box-sizing:border-box}.ai-title{min-width:0}.ai-title strong,.ai-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai-title strong{font-size:14px}.ai-title span{margin-top:3px;color:var(--ai-muted);font-size:10px;font-weight:750}.ai-actions{display:flex;flex-shrink:0;align-items:center;gap:5px}.ai-actions button{height:32px;min-width:34px;padding:0 8px;border:1px solid rgba(100,116,139,.28);border-radius:7px;background:var(--ai-surface);color:inherit;cursor:pointer;font-size:12px;font-weight:850}.ai-actions button:disabled{cursor:not-allowed;opacity:.45}.ai-actions span{min-width:48px;color:var(--ai-muted);font-size:11px;font-weight:800;text-align:center}.ai-layout{position:relative;display:grid;min-width:0;min-height:0;grid-template-columns:260px minmax(0,1fr);overflow:hidden}.ai-sidebar{min-width:0;min-height:0;overflow:auto;border-right:1px solid var(--ai-border);background:rgba(248,250,252,.92)}.ai-panel-title{position:sticky;top:0;z-index:2;padding:9px 11px;border-bottom:1px solid var(--ai-border);background:rgba(248,250,252,.97);color:var(--ai-muted);font-size:10px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.ai-artboards,.ai-layers{display:grid;gap:5px;margin:0;padding:8px;list-style:none}.ai-artboard{display:block;width:100%;min-height:36px;padding:6px 8px;border:1px solid transparent;border-radius:7px;background:var(--ai-surface);color:inherit;cursor:pointer;text-align:left}.ai-artboard[data-active='true']{border-color:rgba(198,90,5,.42);background:rgba(255,154,0,.08)}.ai-artboard strong,.ai-artboard span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai-artboard strong{font-size:11px}.ai-artboard span{margin-top:2px;color:var(--ai-muted);font-size:9px}.ai-layer{display:grid;min-height:34px;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:7px;padding:5px 7px;border-radius:7px;background:var(--ai-surface);box-sizing:border-box}.ai-layer input{accent-color:var(--ai-accent)}.ai-layer label{min-width:0;cursor:pointer}.ai-layer strong,.ai-layer span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai-layer strong{font-size:11px}.ai-layer span{margin-top:2px;color:var(--ai-muted);font-size:9px}.ai-layer-actions{display:flex;gap:5px;padding:0 8px 8px}.ai-layer-actions button{flex:1;min-height:28px;border:1px solid var(--ai-border);border-radius:7px;background:var(--ai-surface);color:inherit;cursor:pointer;font-size:10px;font-weight:800}.ai-stage{position:relative;min-width:0;min-height:0;overflow:auto;padding:26px;cursor:grab;overscroll-behavior:contain;touch-action:none}.ai-stage[data-panning='true']{cursor:grabbing}.ai-canvas-wrap{position:relative;display:block;transform-origin:top left}.ai-canvas-shell{position:absolute;top:0;left:0;display:inline-block;padding:15px;border:1px solid var(--ai-border);border-radius:7px;background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.18);transform-origin:top left}.ai-canvas-shell canvas{display:block;max-width:none;background:#fff}.ai-status{position:sticky;left:10px;bottom:10px;z-index:3;display:inline-flex;max-width:min(90%,760px);padding:5px 9px;border:1px solid var(--ai-border);border-radius:999px;background:rgba(255,255,255,.91);color:var(--ai-muted);font-size:10px;font-weight:800;backdrop-filter:blur(8px)}.ai-layer-toggle{display:none}
[data-viewer-theme='dark'] .ai-viewer{--ai-bg:#0d1117;--ai-surface:#161b22;--ai-border:rgba(139,148,158,.24);--ai-text:#e6edf3;--ai-muted:#8b949e}[data-viewer-theme='dark'] .ai-modebar,[data-viewer-theme='dark'] .ai-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='dark'] .ai-sidebar,[data-viewer-theme='dark'] .ai-panel-title{background:rgba(22,27,34,.96)}[data-viewer-theme='dark'] .ai-status{background:rgba(22,27,34,.92)}
@media(prefers-color-scheme:dark){[data-viewer-theme='system'] .ai-viewer{--ai-bg:#0d1117;--ai-surface:#161b22;--ai-border:rgba(139,148,158,.24);--ai-text:#e6edf3;--ai-muted:#8b949e}[data-viewer-theme='system'] .ai-modebar,[data-viewer-theme='system'] .ai-toolbar{background:rgba(13,17,23,.94)}[data-viewer-theme='system'] .ai-sidebar,[data-viewer-theme='system'] .ai-panel-title{background:rgba(22,27,34,.96)}}
@media(max-width:760px){.ai-viewer{min-height:360px}.ai-modebar{padding:6px 8px}.ai-mode-copy{font-size:10px}.ai-toolbar{align-items:flex-start;padding:7px 8px}.ai-title span{max-width:145px}.ai-actions{flex-wrap:wrap;justify-content:flex-end}.ai-actions button{height:30px;min-width:31px;padding:0 7px}.ai-layout{grid-template-columns:1fr}.ai-sidebar{position:absolute;inset:0 auto 0 0;z-index:6;width:min(84vw,320px);border-right:1px solid var(--ai-border);box-shadow:15px 0 40px rgba(15,23,42,.22);transform:translateX(-105%);transition:transform .2s ease}.ai-native[data-layers-open='true'] .ai-sidebar{transform:translateX(0)}.ai-layer-toggle{position:absolute;right:12px;bottom:calc(12px + var(--file-viewer-mobile-overlay-bottom,0px));z-index:7;display:inline-flex;min-height:44px;align-items:center;padding:0 13px;border:1px solid var(--ai-border);border-radius:999px;background:rgba(255,255,255,.92);color:var(--ai-text);font-size:11px;font-weight:850;box-shadow:0 10px 28px rgba(15,23,42,.18)}.ai-stage{padding:13px}.ai-status{bottom:calc(60px + var(--file-viewer-mobile-overlay-bottom,0px))}}
`

const element = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
  text?: string,
) => {
  const node = documentRef.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const clampZoom = (value: number) => Math.min(6, Math.max(0.05, Number(value.toFixed(3))))

const fidelityLabel = (fidelity: IllustratorFidelity) => ({
  exact: 'Exact',
  high: 'High',
  partial: 'Partial',
  'structure-only': 'Structure only',
  unsupported: 'Unsupported',
})[fidelity]

const diagnosticMessage = (error: unknown) => error instanceof Error ? error.message : String(error)

const layerChildren = (layer: IllustratorLayerNode): IllustratorLayerNode[] =>
  layer.children.filter((child): child is IllustratorLayerNode => child.type === 'Layer')

const flattenLayers = (
  layers: readonly IllustratorLayerNode[],
  depth = 0,
): Array<{ layer: IllustratorLayerNode; depth: number }> => layers.flatMap((layer) => [
  { layer, depth },
  ...flattenLayers(layerChildren(layer), depth + 1),
])

const nativeOptions = (options: FileViewerDesignOptions | undefined, documentBaseUrl: string) => ({
  workerUrl: resolveFileViewerIllustratorWorkerUrl(options, documentBaseUrl),
  limits: options?.illustratorLimits as Partial<IllustratorLimits> | undefined,
  fontResolver: options?.illustratorFontResolver,
  resourceResolver: options?.illustratorResourceResolver,
  defaultTimeoutMs: options?.workerTimeoutMs,
})

interface NativeMetadata {
  summary: IllustratorDocumentSummary
  artboards: readonly IllustratorArtboard[]
  layers: readonly IllustratorLayerNode[]
  support: IllustratorSupportReport
  diagnostics: readonly IllustratorDiagnostic[]
}

const renderNativeIllustrator = async (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext,
): Promise<FileViewerRenderedInstance> => {
  if (context?.signal?.aborted) throw new DOMException('Illustrator rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const design = context?.options?.design
  let engine: IllustratorEngine | undefined
  let illustrator: IllustratorDocument | undefined
  try {
    if (typeof Worker === 'undefined') throw new Error('Native Illustrator preview requires a Dedicated Worker.')
    const options = nativeOptions(design, documentRef.baseURI)
    engine = new WorkerIllustratorEngine(
      new Worker(options.workerUrl, { type: 'module', name: 'illustrator-pgf' }),
      options,
    )
    illustrator = await engine.open(buffer, {
      mode: 'native',
      limits: design?.illustratorLimits as Partial<IllustratorLimits> | undefined,
      signal: context?.signal,
      timeoutMs: design?.workerTimeoutMs,
    })
  } catch (error) {
    engine?.dispose()
    throw error
  }
  let metadata: NativeMetadata
  try {
    metadata = await Promise.all([
      illustrator.getSummary(),
      illustrator.getArtboards(),
      illustrator.getLayerTree(),
      illustrator.getSupportReport(),
      illustrator.getDiagnostics(),
    ]).then(([summary, artboards, layers, support, diagnostics]) => ({
      summary, artboards, layers, support, diagnostics,
    }))
  } catch (error) {
    illustrator.dispose()
    engine.dispose()
    throw error
  }
  if (metadata.artboards.length === 0) {
    illustrator.dispose()
    engine.dispose()
    throw new Error('The native Illustrator scene has no renderable artboard.')
  }

  let destroyed = false
  let cleaned = false
  let currentArtboard = 0
  let renderRevision = 0
  let renderQueue = Promise.resolve()
  let zoom = 1
  let userAdjustedZoom = false
  const hiddenLayerIds = new Set(
    flattenLayers(metadata.layers).filter(({ layer }) => !layer.visible).map(({ layer }) => layer.id),
  )
  const zoomEmitter = createFileViewerZoomChangeEmitter()
  const root = element(documentRef, 'section', 'ai-native')
  root.dataset.illustratorEngine = 'illustrator-pgf'
  root.dataset.illustratorFidelity = metadata.support.fidelity
  root.dataset.illustratorSource = metadata.summary.sourceKind
  if (metadata.summary.compression !== undefined) root.dataset.illustratorCompression = metadata.summary.compression
  const toolbar = element(documentRef, 'header', 'ai-toolbar')
  const title = element(documentRef, 'div', 'ai-title')
  title.append(
    element(documentRef, 'strong', undefined, 'Adobe Illustrator · native PGF'),
    element(
      documentRef,
      'span',
      undefined,
      `${metadata.artboards.length} artboard${metadata.artboards.length === 1 ? '' : 's'} · ${metadata.summary.layers} layers · ${metadata.summary.nodes} nodes · ${fidelityLabel(metadata.support.fidelity)}`,
    ),
  )
  const actions = element(documentRef, 'div', 'ai-actions')
  const previous = element(documentRef, 'button', undefined, '‹')
  const next = element(documentRef, 'button', undefined, '›')
  const zoomOut = element(documentRef, 'button', undefined, '−')
  const zoomLabel = element(documentRef, 'span', undefined, '100%')
  const zoomIn = element(documentRef, 'button', undefined, '+')
  const fit = element(documentRef, 'button', undefined, 'Fit')
  ;[previous, next, zoomOut, zoomIn, fit].forEach((button) => { button.type = 'button' })
  previous.setAttribute('aria-label', 'Previous Illustrator artboard')
  next.setAttribute('aria-label', 'Next Illustrator artboard')
  zoomOut.setAttribute('aria-label', 'Zoom out')
  zoomIn.setAttribute('aria-label', 'Zoom in')
  actions.append(previous, next, zoomOut, zoomLabel, zoomIn, fit)
  toolbar.append(title, actions)

  const layout = element(documentRef, 'div', 'ai-layout')
  const sidebar = element(documentRef, 'aside', 'ai-sidebar')
  const artboardTitle = element(documentRef, 'div', 'ai-panel-title', 'Artboards')
  const artboardList = element(documentRef, 'ol', 'ai-artboards')
  const layerTitle = element(documentRef, 'div', 'ai-panel-title', 'Layers')
  const layerActions = element(documentRef, 'div', 'ai-layer-actions')
  const showAll = element(documentRef, 'button', undefined, 'Show all')
  const hideAll = element(documentRef, 'button', undefined, 'Hide all')
  showAll.type = 'button'; hideAll.type = 'button'
  layerActions.append(showAll, hideAll)
  const layerList = element(documentRef, 'ul', 'ai-layers')
  sidebar.append(artboardTitle, artboardList, layerTitle, layerActions, layerList)
  const stage = element(documentRef, 'main', 'ai-stage')
  const wrap = element(documentRef, 'div', 'ai-canvas-wrap')
  const shell = element(documentRef, 'div', 'ai-canvas-shell')
  const canvas = element(documentRef, 'canvas')
  const status = element(documentRef, 'span', 'ai-status', 'Opening native Illustrator scene…')
  shell.appendChild(canvas)
  wrap.appendChild(shell)
  stage.append(wrap, status)
  const layerToggle = element(documentRef, 'button', 'ai-layer-toggle', 'Layers')
  layerToggle.type = 'button'
  layerToggle.setAttribute('aria-expanded', 'false')
  layout.append(sidebar, stage, layerToggle)
  root.append(toolbar, layout)
  target.replaceChildren(root)

  const artboardButtons = metadata.artboards.map((artboard, index) => {
    const item = element(documentRef, 'li')
    const button = element(documentRef, 'button', 'ai-artboard')
    button.type = 'button'
    const width = Math.max(0, artboard.bounds.right - artboard.bounds.left)
    const height = Math.max(0, artboard.bounds.top - artboard.bounds.bottom)
    button.append(
      element(documentRef, 'strong', undefined, artboard.name || `Artboard ${index + 1}`),
      element(documentRef, 'span', undefined, `${Math.round(width)} × ${Math.round(height)} pt`),
    )
    item.appendChild(button)
    artboardList.appendChild(item)
    return button
  })

  const layerCheckboxes = new Map<string, HTMLInputElement>()
  for (const { layer, depth } of flattenLayers(metadata.layers)) {
    const item = element(documentRef, 'li', 'ai-layer')
    item.style.marginInlineStart = `${Math.min(depth, 8) * 12}px`
    const checkbox = element(documentRef, 'input')
    checkbox.type = 'checkbox'
    checkbox.checked = !hiddenLayerIds.has(layer.id)
    const label = element(documentRef, 'label')
    label.append(
      element(documentRef, 'strong', undefined, layer.name || layer.id),
      element(documentRef, 'span', undefined, `${fidelityLabel(layer.fidelity)}${layer.locked ? ' · locked' : ''}`),
    )
    const checkboxId = `ai-layer-${layer.id.replace(/[^a-z0-9_-]/giu, '-')}`
    checkbox.id = checkboxId
    label.htmlFor = checkboxId
    item.append(checkbox, label)
    layerList.appendChild(item)
    layerCheckboxes.set(layer.id, checkbox)
  }

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 6,
    canZoomOut: zoom > 0.05,
    canReset: true,
    minScale: 0.05,
    maxScale: 6,
  })
  const setZoom = (value: number, source: 'user' | 'fit' = 'user') => {
    zoom = clampZoom(value)
    if (source === 'user') userAdjustedZoom = true
    shell.style.transform = `scale(${zoom})`
    wrap.style.width = `${Math.ceil((canvas.width + 30) * zoom)}px`
    wrap.style.height = `${Math.ceil((canvas.height + 30) * zoom)}px`
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`
    zoomEmitter.emit()
    return getZoomState()
  }
  const fitToStage = () => setZoom(Math.min(
    1,
    Math.max(1, stage.clientWidth - 56) / Math.max(1, canvas.width + 30),
    Math.max(1, stage.clientHeight - 56) / Math.max(1, canvas.height + 30),
  ), 'fit')

  const renderArtboard = (index = currentArtboard) => {
    currentArtboard = index
    const revision = ++renderRevision
    const artboard = metadata.artboards[index]!
    artboardButtons.forEach((button, buttonIndex) => {
      button.dataset.active = String(buttonIndex === index)
      button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false')
    })
    previous.disabled = index === 0
    next.disabled = index === metadata.artboards.length - 1
    const pointWidth = Math.max(1, artboard.bounds.right - artboard.bounds.left)
    const pointHeight = Math.max(1, artboard.bounds.top - artboard.bounds.bottom)
    const requestedScale = 96 / 72
    const maximumDimension = Math.max(256, design?.maxCanvasDimension ?? 8192)
    const maximumPixels = Math.max(65_536, Math.min(
      design?.maxCanvasPixels ?? 16_000_000,
      design?.illustratorLimits?.maxRenderPixels ?? Number.POSITIVE_INFINITY,
    ))
    const renderScale = Math.max(0.01, Math.min(
      requestedScale,
      maximumDimension / pointWidth,
      maximumDimension / pointHeight,
      Math.sqrt(maximumPixels / (pointWidth * pointHeight)),
    ))
    const width = Math.max(1, Math.round(pointWidth * renderScale))
    const height = Math.max(1, Math.round(pointHeight * renderScale))
    status.textContent = `Rendering ${artboard.name || `artboard ${index + 1}`} in Worker…`
    const task = renderQueue.catch(() => undefined).then(async () => {
      if (destroyed || revision !== renderRevision) return
      const result = await illustrator!.render(canvas, {
        artboardId: artboard.id,
        width,
        height,
        background: '#ffffff',
        hiddenLayerIds: [...hiddenLayerIds],
        maxPixels: maximumPixels,
        revision,
        signal: context?.signal,
      })
      if (destroyed || revision !== renderRevision) return
      status.textContent = `${artboard.name || `Artboard ${index + 1}`} · ${width} × ${height}px · ${fidelityLabel(result.fidelity)} · ${metadata.support.unsupportedFeatures.length} unsupported feature group(s)`
      if (!userAdjustedZoom) fitToStage()
      context?.onProgressiveRender?.()
      context?.registerThumbnailAdapter?.({ captureSource: 'rendered', getTarget: () => canvas })
    })
    renderQueue = task
    return task
  }

  const reportRenderError = (error: unknown) => {
    if (destroyed) return
    const message = diagnosticMessage(error)
    status.textContent = message
    context?.options?.onDiagnostic?.({
      code: 'illustrator-native-render-failed',
      level: 'error',
      message,
      detail: { artboard: currentArtboard, engine: 'illustrator-pgf' },
    })
  }
  artboardButtons.forEach((button, index) => button.addEventListener('click', () => {
    void renderArtboard(index).catch(reportRenderError)
  }))
  layerCheckboxes.forEach((checkbox, id) => checkbox.addEventListener('change', () => {
    if (checkbox.checked) hiddenLayerIds.delete(id)
    else hiddenLayerIds.add(id)
    void renderArtboard().catch(reportRenderError)
  }))
  showAll.addEventListener('click', () => {
    hiddenLayerIds.clear()
    layerCheckboxes.forEach((checkbox) => { checkbox.checked = true })
    void renderArtboard().catch(reportRenderError)
  })
  hideAll.addEventListener('click', () => {
    layerCheckboxes.forEach((checkbox, id) => { checkbox.checked = false; hiddenLayerIds.add(id) })
    void renderArtboard().catch(reportRenderError)
  })
  previous.addEventListener('click', () => {
    if (currentArtboard > 0) void renderArtboard(currentArtboard - 1).catch(reportRenderError)
  })
  next.addEventListener('click', () => {
    if (currentArtboard + 1 < metadata.artboards.length) void renderArtboard(currentArtboard + 1).catch(reportRenderError)
  })
  zoomOut.addEventListener('click', () => setZoom(zoom / 1.15))
  zoomIn.addEventListener('click', () => setZoom(zoom * 1.15))
  fit.addEventListener('click', () => { userAdjustedZoom = false; fitToStage() })
  layerToggle.addEventListener('click', () => {
    const open = root.dataset.layersOpen !== 'true'
    root.dataset.layersOpen = String(open)
    layerToggle.setAttribute('aria-expanded', String(open))
  })

  const pointers = new Map<number, { x: number; y: number }>()
  let panStart = { x: 0, y: 0, left: 0, top: 0 }
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button,input'))) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    panStart = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
    stage.dataset.panning = 'true'
    try { stage.setPointerCapture(event.pointerId) } catch { /* optional in embedded webviews */ }
    event.preventDefault()
  })
  stage.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return
    stage.scrollLeft = panStart.left - (event.clientX - panStart.x)
    stage.scrollTop = panStart.top - (event.clientY - panStart.y)
    event.preventDefault()
  })
  const stopPan = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (pointers.size === 0) stage.dataset.panning = 'false'
  }
  stage.addEventListener('pointerup', stopPan)
  stage.addEventListener('pointercancel', stopPan)

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom * 1.15),
    zoomOut: () => setZoom(zoom / 1.15),
    resetZoom: fitToStage,
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe,
  })
  context?.registerExportAdapter?.({ print: true, exportHtml: false, getPrintMaskPages: () => [shell] })
  const importantDiagnostics = metadata.diagnostics.filter((entry) => entry.severity !== 'info')
  if (importantDiagnostics.length > 0 || metadata.support.fidelity !== 'exact') {
    context?.options?.onDiagnostic?.({
      code: 'illustrator-native-fidelity',
      level: importantDiagnostics.some((entry) => entry.severity === 'error') ? 'error' : 'warning',
      message: `Native Illustrator preview fidelity is ${metadata.support.fidelity}; ${importantDiagnostics.length} parser diagnostic(s) and ${metadata.support.unsupportedFeatures.length} unsupported feature group(s) were reported.`,
      detail: {
        sourceKind: metadata.summary.sourceKind,
        fidelity: metadata.support.fidelity,
        diagnostics: importantDiagnostics,
        unsupportedFeatures: metadata.support.unsupportedFeatures,
      },
    })
  }
  const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
    if (!destroyed && !userAdjustedZoom) fitToStage()
  })
  resizeObserver?.observe(stage)
  const initialFrame = documentRef.defaultView?.requestAnimationFrame(() => {
    if (!destroyed) fitToStage()
  })
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    destroyed = true
    renderRevision += 1
    resizeObserver?.disconnect()
    if (initialFrame !== undefined) documentRef.defaultView?.cancelAnimationFrame(initialFrame)
    context?.registerThumbnailAdapter?.(null)
    context?.registerExportAdapter?.(null)
    unregisterFileViewerZoomProvider(root)
    illustrator?.dispose()
    engine?.dispose()
    canvas.width = 0
    canvas.height = 0
  }
  await renderArtboard().catch((error) => {
    reportRenderError(error)
    cleanup()
    throw error
  })
  return {
    $el: root,
    unmount() {
      cleanup()
      target.replaceChildren()
    },
  }
}

const unmountRendered = async (rendered: FileViewerRenderedInstance | undefined) => {
  if (!rendered) return
  if ('unmount' in rendered) await rendered.unmount()
  else if ('$destroy' in rendered) await rendered.$destroy()
  else await rendered.destroy()
}

export default async function renderIllustrator(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type: string,
  context?: FileRenderContext,
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument || document
  const surface = inspectIllustratorPdfSurface(buffer)
  const design = context?.options?.design
  const requestedMode = design?.illustratorMode ?? 'auto'
  const pdfAvailable = surface.pdfHeader && surface.illustratorEvidence && !surface.noPdfCompatibilityWarning
  const nativeCandidate = surface.illustratorEvidence || !surface.pdfHeader
  if (requestedMode === 'pdf' && !pdfAvailable) {
    throw new Error(`This .${type} file has no usable Illustrator PDF-compatible representation.`)
  }
  if (!nativeCandidate && !pdfAvailable) {
    throw new Error(`This .${type} file has neither verified Illustrator metadata nor a native Illustrator source signature.`)
  }
  // PDF.js may transfer its input buffer to its own Worker. Keep one immutable
  // source copy so PDF -> native -> PDF mode switches never reuse a detached
  // ArrayBuffer. The native SDK makes and transfers its own session copy.
  const sourceBuffer = buffer.slice(0)

  const style = element(documentRef, 'style')
  style.textContent = illustratorStyle
  const root = element(documentRef, 'section', 'ai-viewer')
  root.dataset.illustratorMode = requestedMode
  const modebar = element(documentRef, 'header', 'ai-modebar')
  const modeCopy = element(documentRef, 'span', 'ai-mode-copy', 'Adobe Illustrator · selecting preview representation')
  const modeActions = element(documentRef, 'div', 'ai-mode-actions')
  const pdfButton = element(documentRef, 'button', undefined, 'PDF surface')
  const nativeButton = element(documentRef, 'button', undefined, 'Native PGF')
  pdfButton.type = 'button'; nativeButton.type = 'button'
  pdfButton.hidden = !pdfAvailable
  nativeButton.hidden = !nativeCandidate
  modeActions.append(pdfButton, nativeButton)
  modebar.append(modeCopy, modeActions)
  const content = element(documentRef, 'div', 'ai-content')
  root.append(modebar, content)
  target.replaceChildren(style, root)

  let destroyed = false
  let activeMode: 'pdf' | 'native' | undefined
  let activeRendered: FileViewerRenderedInstance | undefined
  let switchRevision = 0
  const setBusy = (busy: boolean) => {
    pdfButton.disabled = busy
    nativeButton.disabled = busy
  }
  const mountPdf = async () => {
    if (!context?.renderNestedBuffer) {
      throw new Error(`PDF-compatible .${type} preview requires @file-viewer/renderer-pdf in the same renderer preset.`)
    }
    const rendered = await context.renderNestedBuffer(sourceBuffer.slice(0), 'pdf', content, {
      ...context,
      filename: context.filename || `illustrator.${type}`,
    })
    if (!rendered) throw new Error(`PDF-compatible .${type} preview was cancelled.`)
    return rendered
  }
  const switchMode = async (mode: 'pdf' | 'native', fallback = true) => {
    const revision = ++switchRevision
    setBusy(true)
    modeCopy.textContent = mode === 'native'
      ? 'Opening native PGF/private-source scene in a Dedicated Worker…'
      : 'Opening the saved PDF-compatible representation…'
    try {
      await unmountRendered(activeRendered)
      activeRendered = undefined
      content.replaceChildren()
      const rendered = mode === 'native'
        ? await renderNativeIllustrator(sourceBuffer, content, context)
        : await mountPdf()
      if (destroyed || revision !== switchRevision) {
        await unmountRendered(rendered)
        return
      }
      activeRendered = rendered
      activeMode = mode
      root.dataset.activeIllustratorMode = mode
      pdfButton.dataset.active = String(mode === 'pdf')
      nativeButton.dataset.active = String(mode === 'native')
      modeCopy.textContent = mode === 'native'
        ? 'Native PGF scene · layers and artboards come from illustrator-pgf'
        : nativeCandidate
          ? 'PDF-compatible surface · switch to Native PGF for parsed artboards and layers'
          : 'PDF-compatible Illustrator surface'
    } catch (error) {
      const message = diagnosticMessage(error)
      context?.options?.onDiagnostic?.({
        code: mode === 'native' ? 'illustrator-native-open-failed' : 'illustrator-pdf-open-failed',
        level: 'error',
        message,
        detail: { requestedMode, attemptedMode: mode, pdfAvailable, nativeCandidate },
      })
      if (fallback && requestedMode === 'auto' && mode === 'native' && pdfAvailable && !destroyed) {
        modeCopy.textContent = `Native PGF unavailable: ${message}. Falling back to the PDF-compatible surface.`
        await switchMode('pdf', false)
        return
      }
      throw error
    } finally {
      if (!destroyed && revision === switchRevision) setBusy(false)
    }
  }
  pdfButton.addEventListener('click', () => {
    if (activeMode !== 'pdf') void switchMode('pdf').catch(() => undefined)
  })
  nativeButton.addEventListener('click', () => {
    if (activeMode !== 'native') void switchMode('native', false).catch((error) => {
      if (!destroyed) modeCopy.textContent = `Native PGF unavailable: ${diagnosticMessage(error)}`
    })
  })
  const initialMode = requestedMode === 'native'
    ? 'native'
    : requestedMode === 'pdf'
      ? 'pdf'
      : pdfAvailable
        ? 'pdf'
        : 'native'
  let abort = () => {}
  const cleanup = async () => {
    if (destroyed) return
    destroyed = true
    switchRevision += 1
    context?.signal?.removeEventListener('abort', abort)
    await unmountRendered(activeRendered)
    activeRendered = undefined
  }
  abort = () => { void cleanup() }
  context?.signal?.addEventListener('abort', abort, { once: true })
  try {
    await switchMode(initialMode)
  } catch (error) {
    await cleanup()
    target.replaceChildren()
    throw error
  }
  return {
    $el: root,
    async unmount() {
      await cleanup()
      target.replaceChildren()
    },
  }
}
