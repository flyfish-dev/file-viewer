import {
  createFileViewerTranslator,
  assertFileViewerMermaidSourceHasNoExternalResources,
  type FileViewerDrawingOptions,
  type FileViewerOptions,
  type FileViewerThemeMode
} from '@file-viewer/core'
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import { sanitizeDrawingSvg } from './sanitize.js'

export type DiagramKind = 'mermaid' | 'plantuml'

export interface DiagramController {
  setZoom: (scale: number) => void
  reset: () => void
  getScale: () => number
  destroy: () => void
}

interface RenderDiagramParams {
  documentRef: Document
  text: string
  target: HTMLElement
  kind: DiagramKind
  options?: FileViewerDrawingOptions
  theme?: FileViewerThemeMode
  viewerOptions?: FileViewerOptions
}

type DiagramTranslator = ReturnType<typeof createFileViewerTranslator>

const getOwnerWindow = (documentRef: Document) => {
  return documentRef.defaultView || (typeof window !== 'undefined' ? window : undefined)
}

const isDarkTheme = (documentRef: Document, theme?: FileViewerThemeMode) => {
  if (theme === 'dark') {
    return true
  }
  if (theme === 'light') {
    return false
  }
  return Boolean(getOwnerWindow(documentRef)?.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: TagName,
  className?: string
) => {
  const element = documentRef.createElement(tagName)
  if (className) {
    element.className = className
  }
  return element
}

const normalizePlantumlServer = (documentRef: Document, value: string) => {
  const base = value
  const normalized = base.endsWith('/') ? base : `${base}/`
  try {
    return new URL(normalized, documentRef.baseURI).href
  } catch {
    return normalized
  }
}

const renderMermaidSvg = async (
  documentRef: Document,
  text: string,
  theme: FileViewerThemeMode | undefined,
  t: DiagramTranslator
) => {
  assertFileViewerMermaidSourceHasNoExternalResources(text)
  const mermaidModule = await import('mermaid')
  const mermaid = mermaidModule.default
  const id = `file-viewer-mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    theme: isDarkTheme(documentRef, theme) ? 'dark' : 'default'
  })
  const rendered = await mermaid.render(id, text)
  return sanitizeDrawingSvg(documentRef, rendered.svg, t('drawing.error.svgParseFailed'))
}

const appendSvgText = (
  documentRef: Document,
  parent: SVGTextElement,
  text: string,
  x: number,
  dy: string,
  weight = '500'
) => {
  const line = documentRef.createElementNS('http://www.w3.org/2000/svg', 'tspan')
  line.setAttribute('x', String(x))
  line.setAttribute('dy', dy)
  line.setAttribute('font-weight', weight)
  line.textContent = text
  parent.appendChild(line)
}

const renderPlantumlFallbackSvg = (
  documentRef: Document,
  text: string,
  message: string
) => {
  const width = 1100
  const height = 720
  const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))

  const background = documentRef.createElementNS('http://www.w3.org/2000/svg', 'rect')
  background.setAttribute('width', '100%')
  background.setAttribute('height', '100%')
  background.setAttribute('rx', '28')
  background.setAttribute('fill', '#f8fbff')
  svg.appendChild(background)

  const panel = documentRef.createElementNS('http://www.w3.org/2000/svg', 'rect')
  panel.setAttribute('x', '42')
  panel.setAttribute('y', '42')
  panel.setAttribute('width', String(width - 84))
  panel.setAttribute('height', String(height - 84))
  panel.setAttribute('rx', '22')
  panel.setAttribute('fill', '#ffffff')
  panel.setAttribute('stroke', '#cbd5e1')
  svg.appendChild(panel)

  const title = documentRef.createElementNS('http://www.w3.org/2000/svg', 'text')
  title.setAttribute('x', '74')
  title.setAttribute('y', '92')
  title.setAttribute('fill', '#0f766e')
  title.setAttribute('font-family', 'Inter, Arial, sans-serif')
  title.setAttribute('font-size', '24')
  title.setAttribute('font-weight', '800')
  title.textContent = 'PlantUML source preview'
  svg.appendChild(title)

  const note = documentRef.createElementNS('http://www.w3.org/2000/svg', 'text')
  note.setAttribute('x', '74')
  note.setAttribute('y', '128')
  note.setAttribute('fill', '#64748b')
  note.setAttribute('font-family', 'Inter, Arial, sans-serif')
  note.setAttribute('font-size', '15')
  note.textContent = message
  svg.appendChild(note)

  const source = documentRef.createElementNS('http://www.w3.org/2000/svg', 'text')
  source.setAttribute('x', '74')
  source.setAttribute('y', '172')
  source.setAttribute('fill', '#172033')
  source.setAttribute('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
  source.setAttribute('font-size', '16')
  source.setAttribute('xml:space', 'preserve')

  const lines = text.replace(/\r\n?/g, '\n').split('\n').slice(0, 26)
  lines.forEach((line, index) => {
    appendSvgText(
      documentRef,
      source,
      line.slice(0, 110),
      74,
      index === 0 ? '0' : '24',
      /^\s*@/.test(line) ? '800' : '500'
    )
  })
  if (lines.length < text.split('\n').length) {
    appendSvgText(documentRef, source, '... truncated for preview ...', 74, '24', '700')
  }
  svg.appendChild(source)

  return svg
}

const renderPlantumlSvg = async (
  documentRef: Document,
  text: string,
  options: FileViewerDrawingOptions | undefined,
  t: DiagramTranslator
) => {
  if (!options?.plantumlServerUrl) {
    return renderPlantumlFallbackSvg(
      documentRef,
      text,
      'Offline mode is active. Configure options.drawing.plantumlServerUrl for server-rendered PlantUML SVG.'
    )
  }
  const { encode } = await import('plantuml-encoder')
  const url = `${normalizePlantumlServer(documentRef, options.plantumlServerUrl)}${encode(text)}`
  const ownerWindow = getOwnerWindow(documentRef)
  const controller = new AbortController()
  const timeout = ownerWindow?.setTimeout(
    () => controller.abort(),
    Math.max(1000, options?.plantumlTimeoutMs || 8000)
  )
  try {
    const response = await fetch(url, {
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(t('drawing.error.plantumlRenderFailed', { status: response.status }))
    }
    return sanitizeDrawingSvg(documentRef, await response.text(), t('drawing.error.svgParseFailed'))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    return renderPlantumlFallbackSvg(documentRef, text, 'Configure options.drawing.plantumlServerUrl for full PlantUML SVG rendering.')
  } finally {
    if (timeout !== undefined) {
      ownerWindow?.clearTimeout(timeout)
    }
  }
}

const applySvgDefaults = (svg: SVGSVGElement, kind: DiagramKind) => {
  svg.classList.add('drawing-svg', 'drawing-diagram-svg')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `${kind} diagram preview`)
  if (!svg.getAttribute('width') && svg.viewBox.baseVal.width) {
    svg.setAttribute('width', String(Math.ceil(svg.viewBox.baseVal.width)))
  }
  if (!svg.getAttribute('height') && svg.viewBox.baseVal.height) {
    svg.setAttribute('height', String(Math.ceil(svg.viewBox.baseVal.height)))
  }
}

export const renderDiagram = async ({
  documentRef,
  text,
  target,
  kind,
  options,
  theme,
  viewerOptions
}: RenderDiagramParams): Promise<DiagramController> => {
  const t = createFileViewerTranslator(viewerOptions)
  const shell = createElement(documentRef, 'div', 'drawing-diagram-shell')
  const panTarget = createElement(documentRef, 'div', 'drawing-diagram-pan')
  shell.appendChild(panTarget)
  target.replaceChildren(shell)

  const svg = kind === 'mermaid'
    ? await renderMermaidSvg(documentRef, text, theme, t)
    : await renderPlantumlSvg(documentRef, text, options, t)
  applySvgDefaults(svg, kind)
  panTarget.replaceChildren(svg)

  const panzoom: PanzoomObject = Panzoom(panTarget, {
    minScale: 0.4,
    maxScale: 4,
    contain: 'outside',
    canvas: true
  })
  const wheelTarget = shell.parentElement || shell
  const handleWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      return
    }
    event.preventDefault()
    panzoom.zoomWithWheel(event)
  }
  wheelTarget.addEventListener('wheel', handleWheel, { passive: false })

  return {
    setZoom(scale) {
      panzoom.zoom(scale, { animate: true })
    },
    reset() {
      panzoom.reset({ animate: true })
    },
    getScale() {
      return panzoom.getScale()
    },
    destroy() {
      wheelTarget.removeEventListener('wheel', handleWheel)
      panzoom.destroy()
    }
  }
}
