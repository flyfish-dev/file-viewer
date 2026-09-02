import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { parseInDesignExchangeInWorker } from './adobeContainerWorkerClient.js'
import { resolveInDesignExchangeLimits } from './indesignExchangeParser.js'
import type {
  InDesignExchangeColor,
  InDesignExchangeDocument,
  InDesignExchangeFormat,
  InDesignExchangeParagraph,
  InDesignExchangeStory,
  InDesignExchangeStyle,
  InDesignExchangeTextRun
} from './indesignExchangeProtocol.js'

const exchangeStyle = `
.indesign-exchange-viewer{height:100%;min-height:420px;overflow:auto;background:#e9edf2;color:#152033;--ix-border:rgba(15,23,42,.12);--ix-surface:#fff;--ix-muted:#64748b;--ix-accent:#b3265e;box-sizing:border-box}.indesign-exchange-viewer [hidden]{display:none!important}.ix-toolbar{position:sticky;top:0;z-index:5;display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;border-bottom:1px solid var(--ix-border);background:rgba(255,255,255,.94);backdrop-filter:blur(14px);box-sizing:border-box}.ix-title{min-width:0}.ix-title strong,.ix-title span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ix-title strong{font-size:14px}.ix-title span{margin-top:3px;color:var(--ix-muted);font-size:10px;font-weight:750}.ix-tools{display:flex;flex-shrink:0;align-items:center;gap:7px}.ix-tabs{display:flex;gap:3px;padding:3px;border:1px solid var(--ix-border);border-radius:9px;background:#f8fafc}.ix-tab{height:30px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--ix-muted);cursor:pointer;font:800 11px/1 inherit}.ix-tab[data-active='true']{background:var(--ix-surface);color:var(--ix-accent);box-shadow:0 2px 8px rgba(15,23,42,.1)}.ix-search{width:min(250px,32vw);height:36px;padding:0 11px;border:1px solid rgba(100,116,139,.32);border-radius:8px;background:var(--ix-surface);color:inherit;font:inherit;box-sizing:border-box}.ix-search:focus{border-color:var(--ix-accent);outline:2px solid rgba(179,38,94,.14)}.ix-body{max-width:1320px;margin:0 auto;padding:18px}.ix-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;overflow:hidden;margin-bottom:14px;border:1px solid var(--ix-border);border-radius:10px;background:var(--ix-border)}.ix-summary div{padding:12px 14px;background:var(--ix-surface)}.ix-summary span{display:block;color:var(--ix-muted);font-size:10px;font-weight:750}.ix-summary strong{display:block;margin-top:4px;font-size:14px}.ix-panel{min-height:180px}.ix-layout-stage{overflow:auto;padding:20px;border:1px solid var(--ix-border);border-radius:12px;background:#cfd5dd;overscroll-behavior:contain}.ix-layout-paper{display:block;width:min(100%,1000px);height:auto;margin:auto;background:#fff;box-shadow:0 18px 44px rgba(15,23,42,.2)}.ix-empty{display:grid;min-height:220px;place-items:center;padding:20px;border:1px dashed rgba(100,116,139,.4);border-radius:12px;background:rgba(255,255,255,.58);color:var(--ix-muted);font-weight:750;text-align:center}.ix-stories{display:grid;gap:14px}.ix-story{overflow:hidden;border:1px solid var(--ix-border);border-radius:11px;background:var(--ix-surface)}.ix-story-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--ix-border);background:#f8fafc}.ix-story-header strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.ix-story-header span{flex-shrink:0;color:var(--ix-muted);font-size:10px;font-weight:750}.ix-story-content{max-width:820px;padding:22px 24px;font-family:ui-serif,Georgia,Cambria,'Times New Roman',serif;font-size:15px;line-height:1.58}.ix-story-content p{margin:0 0 .75em;white-space:pre-wrap}.ix-story-content p:last-child{margin-bottom:0}.ix-structure{display:grid;gap:14px}.ix-card{overflow:hidden;border:1px solid var(--ix-border);border-radius:10px;background:var(--ix-surface)}.ix-card h3{margin:0;padding:10px 13px;border-bottom:1px solid var(--ix-border);background:#f8fafc;font-size:12px}.ix-list{margin:0;padding:0;list-style:none}.ix-list li{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(0,1.6fr);gap:10px;padding:8px 13px;border-top:1px solid rgba(100,116,139,.1);font-size:11px}.ix-list li:first-child{border-top:0}.ix-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ix-list span{min-width:0;overflow-wrap:anywhere;color:var(--ix-muted)}.ix-warnings{display:grid;gap:7px;margin-top:14px}.ix-warning{padding:9px 11px;border:1px solid rgba(180,83,9,.22);border-radius:8px;background:#fff7ed;color:#9a3412;font-size:10px;font-weight:700;line-height:1.45}.ix-footer{padding:10px 2px 0;color:var(--ix-muted);font-size:10px;font-weight:700}.ix-layout-label{font:700 10px/1.2 ui-sans-serif,system-ui,sans-serif;fill:#334155;pointer-events:none}.ix-layout-note{font:600 8px/1.2 ui-sans-serif,system-ui,sans-serif;fill:#64748b;pointer-events:none}
[data-viewer-theme='dark'] .indesign-exchange-viewer{background:#0d1117;color:#e6edf3;--ix-border:rgba(139,148,158,.24);--ix-surface:#161b22;--ix-muted:#8b949e}[data-viewer-theme='dark'] .ix-toolbar,[data-viewer-theme='dark'] .ix-story-header,[data-viewer-theme='dark'] .ix-card h3{background:rgba(13,17,23,.94)}[data-viewer-theme='dark'] .ix-tabs{background:#0d1117}[data-viewer-theme='dark'] .ix-layout-stage{background:#242a32}
@media(prefers-color-scheme:dark){[data-viewer-theme='system'] .indesign-exchange-viewer{background:#0d1117;color:#e6edf3;--ix-border:rgba(139,148,158,.24);--ix-surface:#161b22;--ix-muted:#8b949e}[data-viewer-theme='system'] .ix-toolbar,[data-viewer-theme='system'] .ix-story-header,[data-viewer-theme='system'] .ix-card h3{background:rgba(13,17,23,.94)}[data-viewer-theme='system'] .ix-tabs{background:#0d1117}[data-viewer-theme='system'] .ix-layout-stage{background:#242a32}}
@media(max-width:760px){.indesign-exchange-viewer{min-height:360px}.ix-toolbar{position:relative;align-items:stretch;flex-direction:column;padding:9px 10px}.ix-tools{align-items:stretch;flex-direction:column}.ix-tabs{overflow-x:auto}.ix-tab{flex:1;min-width:84px}.ix-search{width:100%}.ix-body{padding:10px}.ix-summary{grid-template-columns:1fr 1fr}.ix-layout-stage{padding:10px}.ix-story-content{padding:16px 14px;font-size:14px}.ix-list li{grid-template-columns:1fr;gap:3px}.ix-title span{white-space:normal}}
`

const element = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
  text?: string
) => {
  const node = documentRef.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const svgElement = <K extends keyof SVGElementTagNameMap>(documentRef: Document, tag: K) =>
  documentRef.createElementNS('http://www.w3.org/2000/svg', tag)

const byteSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MiB`

const colorMap = (colors: InDesignExchangeColor[]) =>
  new Map(
    colors.flatMap((color) => [[color.id, color.css] as const, [color.name, color.css] as const])
  )

const styleMap = (styles: InDesignExchangeStyle[], kind: InDesignExchangeStyle['kind']) =>
  new Map(
    styles
      .filter((style) => style.kind === kind)
      .flatMap((style) => [[style.id, style] as const, [style.name, style] as const])
  )

const readableStyleName = (value?: string) =>
  (value || '')
    .replace(/^(?:ParagraphStyle|CharacterStyle|ObjectStyle|Color)\//, '')
    .replace(/^\$ID\//, '')

const applyRunStyle = (
  node: HTMLSpanElement,
  run: InDesignExchangeTextRun,
  characterStyles: Map<string, InDesignExchangeStyle>,
  colors: Map<string, string>
) => {
  const style = run.characterStyle ? characterStyles.get(run.characterStyle) : undefined
  const family = run.fontFamily || style?.fontFamily
  const fontStyle =
    `${run.fontStyle || style?.fontStyle || ''} ${run.characterStyle || ''}`.toLowerCase()
  const pointSize = run.pointSize || style?.pointSize
  if (family && !/^\$ID\//.test(family))
    node.style.fontFamily = `${JSON.stringify(readableStyleName(family))}, ui-serif, serif`
  if (fontStyle.includes('bold')) node.style.fontWeight = '700'
  if (fontStyle.includes('italic') || fontStyle.includes('oblique')) node.style.fontStyle = 'italic'
  const decorations = [
    run.underline || fontStyle.includes('underline') ? 'underline' : '',
    run.strikeThrough || fontStyle.includes('strike') ? 'line-through' : ''
  ].filter(Boolean)
  if (decorations.length) node.style.textDecoration = decorations.join(' ')
  if (run.position?.toLowerCase().includes('super')) node.style.verticalAlign = 'super'
  if (run.position?.toLowerCase().includes('sub')) node.style.verticalAlign = 'sub'
  if (pointSize)
    node.style.fontSize = `${Math.max(7, Math.min(96, pointSize * 1.333)).toFixed(1)}px`
  const color = run.fillColor ? colors.get(run.fillColor) : undefined
  if (color && color !== 'transparent') node.style.color = color
}

const applyParagraphStyle = (
  node: HTMLParagraphElement,
  paragraph: InDesignExchangeParagraph,
  paragraphStyles: Map<string, InDesignExchangeStyle>
) => {
  const style = paragraph.paragraphStyle ? paragraphStyles.get(paragraph.paragraphStyle) : undefined
  const alignment = (paragraph.alignment || style?.alignment || '').toLowerCase()
  if (alignment.includes('center')) node.style.textAlign = 'center'
  else if (alignment.includes('right')) node.style.textAlign = 'right'
  else if (alignment.includes('justify')) node.style.textAlign = 'justify'
  if (paragraph.leftIndent !== undefined)
    node.style.marginInlineStart = `${Math.max(-200, Math.min(800, paragraph.leftIndent))}pt`
  if (paragraph.firstLineIndent !== undefined)
    node.style.textIndent = `${Math.max(-200, Math.min(800, paragraph.firstLineIndent))}pt`
  if (paragraph.spaceBefore !== undefined)
    node.style.marginTop = `${Math.min(300, paragraph.spaceBefore)}pt`
  if (paragraph.spaceAfter !== undefined)
    node.style.marginBottom = `${Math.min(300, paragraph.spaceAfter)}pt`
}

interface PanelDomBudget {
  remaining: number
  noticeReserve: number
  used: number
  truncated: boolean
}

interface RenderedPanel {
  container: HTMLElement
  thumbnail: HTMLElement | SVGElement
  nodes: number
  truncated: boolean
}

const createPanelBudget = (maximum: number): PanelDomBudget => {
  const boundedMaximum = Math.max(1, Math.floor(maximum))
  const noticeReserve = boundedMaximum >= 3 ? 2 : 0
  return {
    remaining: boundedMaximum - noticeReserve,
    noticeReserve,
    used: 0,
    truncated: false
  }
}

const claimPanelNodes = (budget: PanelDomBudget, count: number) => {
  if (count > budget.remaining) {
    budget.truncated = true
    return false
  }
  budget.remaining -= count
  budget.used += count
  return true
}

const storyTextPreview = (story: InDesignExchangeStory, maximumCharacters: number) => {
  let output = ''
  for (const paragraph of story.paragraphs) {
    if (output.length >= maximumCharacters) break
    if (output) output += '\n'
    for (const run of paragraph.runs) {
      if (output.length >= maximumCharacters) break
      output += run.text.slice(0, maximumCharacters - output.length)
    }
  }
  return output
}

const appendPanelLimitNotice = (
  documentRef: Document,
  container: HTMLElement,
  message: string,
  budget: PanelDomBudget
) => {
  if (!budget.truncated) return
  if (budget.noticeReserve < 2) return
  const notice = element(documentRef, 'div', 'ix-warning', message)
  notice.dataset.panelLimit = 'true'
  container.appendChild(notice)
  budget.used += 2
  budget.noticeReserve = 0
}

const renderStories = (
  documentRef: Document,
  parsed: InDesignExchangeDocument,
  copy: { story: string; characters: string; noStories: string; capped: string },
  maximumDomNodes: number
): RenderedPanel => {
  const budget = createPanelBudget(maximumDomNodes)
  const container = element(documentRef, 'section', 'ix-panel ix-stories')
  claimPanelNodes(budget, 1)
  const paragraphStyles = styleMap(parsed.styles, 'paragraph')
  const characterStyles = styleMap(parsed.styles, 'character')
  const colors = colorMap(parsed.colors)
  if (!parsed.stories.length) {
    if (claimPanelNodes(budget, 2))
      container.appendChild(element(documentRef, 'div', 'ix-empty', copy.noStories))
    appendPanelLimitNotice(documentRef, container, copy.capped, budget)
    return {
      container,
      thumbnail: container,
      nodes: budget.used,
      truncated: budget.truncated
    }
  }
  storyLoop: for (const [storyIndex, story] of parsed.stories.entries()) {
    if (!claimPanelNodes(budget, 7)) break
    const article = element(documentRef, 'article', 'ix-story')
    article.dataset.searchText =
      `${story.id} ${story.title || ''} ${storyTextPreview(story, 65_536)}`.toLocaleLowerCase()
    const header = element(documentRef, 'header', 'ix-story-header')
    header.append(
      element(documentRef, 'strong', undefined, story.title || `${copy.story} ${storyIndex + 1}`),
      element(documentRef, 'span', undefined, `${story.characterCount} ${copy.characters}`)
    )
    const content = element(documentRef, 'div', 'ix-story-content')
    for (const paragraph of story.paragraphs) {
      if (!claimPanelNodes(budget, 1)) {
        article.append(header, content)
        container.appendChild(article)
        break storyLoop
      }
      const paragraphNode = element(documentRef, 'p')
      applyParagraphStyle(paragraphNode, paragraph, paragraphStyles)
      for (const run of paragraph.runs) {
        if (!claimPanelNodes(budget, 2)) {
          content.appendChild(paragraphNode)
          article.append(header, content)
          container.appendChild(article)
          break storyLoop
        }
        const span = element(documentRef, 'span', undefined, run.text)
        applyRunStyle(span, run, characterStyles, colors)
        paragraphNode.appendChild(span)
      }
      content.appendChild(paragraphNode)
    }
    article.append(header, content)
    container.appendChild(article)
  }
  appendPanelLimitNotice(documentRef, container, copy.capped, budget)
  return { container, thumbnail: container, nodes: budget.used, truncated: budget.truncated }
}

const resolvedFill = (
  reference: string | undefined,
  colors: Map<string, string>,
  fallback: string
) => {
  if (!reference) return fallback
  if (/none/i.test(reference)) return 'transparent'
  return colors.get(reference) || fallback
}

const renderLayout = (
  documentRef: Document,
  parsed: InDesignExchangeDocument,
  copy: { noGeometry: string; capped: string },
  maximumDomNodes: number
): RenderedPanel => {
  const budget = createPanelBudget(maximumDomNodes)
  const container = element(documentRef, 'section', 'ix-panel')
  claimPanelNodes(budget, 1)
  const drawable = parsed.items.filter(
    (item) => item.bounds && item.bounds.width >= 0 && item.bounds.height >= 0
  )
  if (!drawable.length) {
    if (claimPanelNodes(budget, 2))
      container.appendChild(element(documentRef, 'div', 'ix-empty', copy.noGeometry))
    appendPanelLimitNotice(documentRef, container, copy.capped, budget)
    return {
      container,
      thumbnail: container,
      nodes: budget.used,
      truncated: budget.truncated
    }
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const item of drawable) {
    minX = Math.min(minX, item.bounds!.x)
    minY = Math.min(minY, item.bounds!.y)
    maxX = Math.max(maxX, item.bounds!.x + Math.max(1, item.bounds!.width))
    maxY = Math.max(maxY, item.bounds!.y + Math.max(1, item.bounds!.height))
  }
  const padding = Math.max(12, Math.min(48, Math.max(maxX - minX, maxY - minY) * 0.04))
  const viewBox = [
    minX - padding,
    minY - padding,
    Math.max(1, maxX - minX + padding * 2),
    Math.max(1, maxY - minY + padding * 2)
  ]
  if (!claimPanelNodes(budget, 3)) {
    appendPanelLimitNotice(documentRef, container, copy.capped, budget)
    return {
      container,
      thumbnail: container,
      nodes: budget.used,
      truncated: budget.truncated
    }
  }
  const stage = element(documentRef, 'div', 'ix-layout-stage')
  const svg = svgElement(documentRef, 'svg')
  svg.classList.add('ix-layout-paper')
  svg.setAttribute('viewBox', viewBox.join(' '))
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `${parsed.format.toUpperCase()} layout fragment`)
  const background = svgElement(documentRef, 'rect')
  background.setAttribute('x', String(viewBox[0]))
  background.setAttribute('y', String(viewBox[1]))
  background.setAttribute('width', String(viewBox[2]))
  background.setAttribute('height', String(viewBox[3]))
  background.setAttribute('fill', '#ffffff')
  svg.appendChild(background)
  const colors = colorMap(parsed.colors)
  const stories = new Map(parsed.stories.map((story) => [story.id, story]))
  for (const [index, item] of drawable.entries()) {
    if (!claimPanelNodes(budget, 4)) break
    const group = svgElement(documentRef, 'g')
    group.dataset.searchText =
      `${item.kind} ${item.name || ''} ${item.id} ${item.storyId || ''}`.toLocaleLowerCase()
    const fill = resolvedFill(
      item.fillColor,
      colors,
      item.kind === 'TextFrame' ? 'rgba(219,39,119,.06)' : 'rgba(148,163,184,.14)'
    )
    const stroke = resolvedFill(
      item.strokeColor,
      colors,
      item.kind === 'TextFrame' ? '#b3265e' : '#64748b'
    )
    const points = item.points.map((point) => `${point.x},${point.y}`).join(' ')
    let shape: SVGElement
    if (item.kind === 'Oval') {
      const ellipse = svgElement(documentRef, 'ellipse')
      ellipse.setAttribute('cx', String(item.bounds!.x + item.bounds!.width / 2))
      ellipse.setAttribute('cy', String(item.bounds!.y + item.bounds!.height / 2))
      ellipse.setAttribute('rx', String(Math.max(0.5, item.bounds!.width / 2)))
      ellipse.setAttribute('ry', String(Math.max(0.5, item.bounds!.height / 2)))
      shape = ellipse
    } else if (item.kind === 'GraphicLine' && item.points.length >= 2) {
      const line = svgElement(documentRef, 'line')
      line.setAttribute('x1', String(item.points[0].x))
      line.setAttribute('y1', String(item.points[0].y))
      line.setAttribute('x2', String(item.points[item.points.length - 1].x))
      line.setAttribute('y2', String(item.points[item.points.length - 1].y))
      shape = line
    } else if (item.points.length >= 3) {
      const polygon = svgElement(documentRef, 'polygon')
      polygon.setAttribute('points', points)
      shape = polygon
    } else {
      const rectangle = svgElement(documentRef, 'rect')
      rectangle.setAttribute('x', String(item.bounds!.x))
      rectangle.setAttribute('y', String(item.bounds!.y))
      rectangle.setAttribute('width', String(Math.max(0.5, item.bounds!.width)))
      rectangle.setAttribute('height', String(Math.max(0.5, item.bounds!.height)))
      shape = rectangle
    }
    shape.setAttribute('fill', item.kind === 'GraphicLine' ? 'none' : fill)
    shape.setAttribute('stroke', stroke === 'transparent' ? '#94a3b8' : stroke)
    shape.setAttribute('stroke-width', String(Math.max(0.5, Math.min(12, item.strokeWidth || 0.8))))
    shape.setAttribute('vector-effect', 'non-scaling-stroke')
    const title = svgElement(documentRef, 'title')
    title.textContent = `${item.kind} · ${item.name || item.id}`
    shape.appendChild(title)
    group.appendChild(shape)
    if (item.bounds!.width > 24 && item.bounds!.height > 12) {
      if (!claimPanelNodes(budget, 2)) {
        svg.appendChild(group)
        break
      }
      const label = svgElement(documentRef, 'text')
      label.classList.add('ix-layout-label')
      label.setAttribute('x', String(item.bounds!.x + 4))
      label.setAttribute('y', String(item.bounds!.y + 12))
      label.textContent = item.name || `${item.kind} ${index + 1}`
      group.appendChild(label)
      const story = item.storyId ? stories.get(item.storyId) : undefined
      const preview = story
        ? storyTextPreview(story, 256).replace(/\s+/g, ' ').trim().slice(0, 80)
        : ''
      if (preview && item.bounds!.height > 25) {
        if (!claimPanelNodes(budget, 2)) {
          svg.appendChild(group)
          break
        }
        const note = svgElement(documentRef, 'text')
        note.classList.add('ix-layout-note')
        note.setAttribute('x', String(item.bounds!.x + 4))
        note.setAttribute('y', String(item.bounds!.y + 24))
        note.textContent = preview
        group.appendChild(note)
      }
    }
    svg.appendChild(group)
  }
  stage.appendChild(svg)
  container.appendChild(stage)
  appendPanelLimitNotice(documentRef, container, copy.capped, budget)
  return { container, thumbnail: svg, nodes: budget.used, truncated: budget.truncated }
}

const listCard = (
  documentRef: Document,
  title: string,
  rows: Iterable<readonly [string, string]>,
  empty: string,
  budget: PanelDomBudget
) => {
  if (!claimPanelNodes(budget, 3)) return undefined
  const card = element(documentRef, 'section', 'ix-card')
  card.appendChild(element(documentRef, 'h3', undefined, title))
  const list = element(documentRef, 'ul', 'ix-list')
  let rendered = 0
  for (const [label, value] of rows) {
    if (!claimPanelNodes(budget, (rendered ? 0 : 1) + 5)) break
    const item = element(documentRef, 'li')
    item.dataset.searchText = `${label} ${value}`.toLocaleLowerCase()
    item.append(
      element(documentRef, 'strong', undefined, label),
      element(documentRef, 'span', undefined, value)
    )
    list.appendChild(item)
    rendered += 1
  }
  if (rendered) card.appendChild(list)
  else if (!budget.truncated && claimPanelNodes(budget, 2))
    card.appendChild(element(documentRef, 'div', 'ix-empty', empty))
  return card
}

const renderStructure = (
  documentRef: Document,
  parsed: InDesignExchangeDocument,
  copy: {
    items: string
    styles: string
    colors: string
    unresolved: string
    empty: string
    capped: string
  },
  maximumDomNodes: number
): RenderedPanel => {
  const budget = createPanelBudget(maximumDomNodes)
  const container = element(documentRef, 'section', 'ix-panel ix-structure')
  claimPanelNodes(budget, 1)
  const itemRows = function* (): Generator<readonly [string, string]> {
    for (const item of parsed.items) {
      yield [
        item.name || item.id,
        `${item.kind}${item.bounds ? ` · ${item.bounds.width.toFixed(1)} × ${item.bounds.height.toFixed(1)}` : ''}${item.externalResource ? ` · ${item.externalResource}` : ''}`
      ]
    }
  }
  const styleRows = function* (): Generator<readonly [string, string]> {
    for (const style of parsed.styles) {
      yield [style.name, `${style.kind}${style.fontFamily ? ` · ${style.fontFamily}` : ''}`]
    }
  }
  const colorRows = function* (): Generator<readonly [string, string]> {
    for (const color of parsed.colors)
      yield [color.name, `${color.space} · ${color.values.join(' ')}`]
  }
  const unknownRows = function* (): Generator<readonly [string, string]> {
    for (const name of parsed.unknownElementNames) yield [name, 'XML structure inventory']
  }
  const cards = [
    listCard(documentRef, copy.items, itemRows(), copy.empty, budget),
    listCard(documentRef, copy.styles, styleRows(), copy.empty, budget),
    listCard(documentRef, copy.colors, colorRows(), copy.empty, budget),
    listCard(documentRef, copy.unresolved, unknownRows(), copy.empty, budget)
  ]
  for (const card of cards) if (card) container.appendChild(card)
  appendPanelLimitNotice(documentRef, container, copy.capped, budget)
  return { container, thumbnail: container, nodes: budget.used, truncated: budget.truncated }
}

export default async function renderInDesignExchange(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  format: InDesignExchangeFormat,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted)
    throw new DOMException('InDesign exchange rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const design = context?.options?.design
  const limits = resolveInDesignExchangeLimits({
    maxFileBytes: design?.maxFileBytes,
    maxStories: design?.maxResourceItems,
    maxItems: design?.maxResourceItems ? design.maxResourceItems * 16 : undefined,
    maxStyles: design?.maxResourceItems ? design.maxResourceItems * 16 : undefined,
    maxColors: design?.maxResourceItems,
    maxResultBytes: design?.indesignExchangeMaxResultBytes ?? design?.maxDecodedBytes,
    maxPointsPerItem: design?.indesignExchangeMaxPointsPerItem,
    maxDomNodesPerPanel: design?.indesignExchangeMaxDomNodesPerPanel
  })
  const parsed = await parseInDesignExchangeInWorker(
    buffer,
    format,
    limits,
    design,
    context?.signal
  )
  if (context?.signal?.aborted)
    throw new DOMException('InDesign exchange rendering was aborted.', 'AbortError')
  const locale = (context?.options?.locale || documentRef.documentElement.lang || '').toLowerCase()
  const isChinese = locale.startsWith('zh')
  const copy = isChinese
    ? {
        title: {
          icml: 'Adobe InCopy 内容',
          idms: 'Adobe InDesign 片段',
          inx: 'Adobe InDesign 旧版交换'
        }[format],
        preview: '版面',
        stories: '内容',
        structure: '结构',
        search: '筛选故事、对象或样式',
        bytes: '文件',
        nodes: 'XML 节点',
        story: '故事',
        storiesLabel: '故事',
        characters: '字符',
        items: '页面对象',
        styles: '样式',
        colors: '颜色',
        unresolved: '未映射元素',
        empty: '没有记录',
        noStories: '该文件没有可显示的故事内容。',
        noGeometry: '该文件没有可验证的页面对象几何；请查看内容和结构清单。',
        capped: '该面板已达到安全 DOM 上限，仅显示前部内容；上方统计仍代表完整解析结果。'
      }
    : {
        title: {
          icml: 'Adobe InCopy Content',
          idms: 'Adobe InDesign Snippet',
          inx: 'Adobe InDesign Legacy Interchange'
        }[format],
        preview: 'Layout',
        stories: 'Content',
        structure: 'Structure',
        search: 'Filter stories, items, or styles',
        bytes: 'File',
        nodes: 'XML nodes',
        story: 'Story',
        storiesLabel: 'Stories',
        characters: 'characters',
        items: 'Page items',
        styles: 'Styles',
        colors: 'Colors',
        unresolved: 'Unmapped elements',
        empty: 'No records',
        noStories: 'This file does not contain a displayable story.',
        noGeometry:
          'No verified page-item geometry is present; use the content and structure views.',
        capped:
          'This panel reached its safe DOM budget and shows only the leading records; the summary still reports the complete parsed result.'
      }

  const style = element(documentRef, 'style')
  style.textContent = exchangeStyle
  const root = element(documentRef, 'section', 'indesign-exchange-viewer')
  root.dataset.indesignExchange = format
  root.dataset.indesignFidelity = parsed.fidelity
  root.dataset.storyCount = String(parsed.statistics.storyCount)
  root.dataset.itemCount = String(parsed.statistics.itemCount)
  const toolbar = element(documentRef, 'header', 'ix-toolbar')
  const title = element(documentRef, 'div', 'ix-title')
  title.append(
    element(documentRef, 'strong', undefined, copy.title),
    element(
      documentRef,
      'span',
      undefined,
      `${parsed.fidelity} · ${parsed.domVersion || parsed.rootElement}${parsed.product ? ` · ${parsed.product}` : ''}`
    )
  )
  const tools = element(documentRef, 'div', 'ix-tools')
  const tabs = element(documentRef, 'div', 'ix-tabs')
  tabs.setAttribute('role', 'tablist')
  const search = element(documentRef, 'input', 'ix-search')
  search.type = 'search'
  search.placeholder = copy.search
  search.setAttribute('aria-label', copy.search)
  const tabDefinitions = [
    ['layout', copy.preview],
    ['stories', copy.stories],
    ['structure', copy.structure]
  ] as const
  const tabButtons = new Map<string, HTMLButtonElement>()
  tabDefinitions.forEach(([id, label]) => {
    const button = element(documentRef, 'button', 'ix-tab', label)
    button.type = 'button'
    button.dataset.panel = id
    button.setAttribute('role', 'tab')
    tabs.appendChild(button)
    tabButtons.set(id, button)
  })
  tools.append(tabs, search)
  toolbar.append(title, tools)
  const body = element(documentRef, 'div', 'ix-body')
  const summary = element(documentRef, 'div', 'ix-summary')
  ;[
    [copy.bytes, byteSize(parsed.statistics.bytes)],
    [copy.nodes, String(parsed.statistics.nodes)],
    [copy.storiesLabel, String(parsed.statistics.storyCount)],
    [copy.items, String(parsed.statistics.itemCount)],
    [copy.styles, String(parsed.statistics.styleCount)],
    [copy.colors, String(parsed.statistics.colorCount)]
  ].forEach(([label, value]) => {
    const cell = element(documentRef, 'div')
    cell.append(
      element(documentRef, 'span', undefined, label),
      element(documentRef, 'strong', undefined, value)
    )
    summary.appendChild(cell)
  })
  const warnings = element(documentRef, 'div', 'ix-warnings')
  parsed.warnings.forEach((message) =>
    warnings.appendChild(element(documentRef, 'div', 'ix-warning', message))
  )
  const footer = element(
    documentRef,
    'div',
    'ix-footer',
    `Worker · UTF-8 XML · ${parsed.statistics.maxDepth} max depth · ${parsed.layers.length} layers`
  )
  type PanelId = (typeof tabDefinitions)[number][0]
  const renderPanel = (panel: PanelId): RenderedPanel => {
    if (panel === 'layout') {
      return renderLayout(documentRef, parsed, copy, limits.maxDomNodesPerPanel)
    }
    if (panel === 'stories') {
      return renderStories(documentRef, parsed, copy, limits.maxDomNodesPerPanel)
    }
    return renderStructure(documentRef, parsed, copy, limits.maxDomNodesPerPanel)
  }
  let activePanel: PanelId = format === 'icml' ? 'stories' : 'layout'
  let activeRender = renderPanel(activePanel)
  activeRender.container.dataset.panel = activePanel
  root.dataset.materializedPanel = activePanel
  root.dataset.materializedPanelNodes = String(activeRender.nodes)
  root.dataset.materializedPanelTruncated = String(activeRender.truncated)
  body.append(summary, activeRender.container, warnings, footer)
  root.append(toolbar, body)
  target.replaceChildren(style, root)

  const applyFilter = () => {
    const query = search.value.trim().toLocaleLowerCase()
    activeRender.container.querySelectorAll<HTMLElement>('[data-search-text]').forEach((node) => {
      node.hidden = Boolean(query) && !(node.dataset.searchText || '').includes(query)
    })
  }
  const selectPanel = (panel: PanelId) => {
    if (panel !== activePanel) {
      activeRender.container.remove()
      activePanel = panel
      activeRender = renderPanel(panel)
      activeRender.container.dataset.panel = panel
      body.insertBefore(activeRender.container, warnings)
      root.dataset.materializedPanel = panel
      root.dataset.materializedPanelNodes = String(activeRender.nodes)
      root.dataset.materializedPanelTruncated = String(activeRender.truncated)
    }
    tabButtons.forEach((button, id) => {
      const active = id === panel
      button.dataset.active = String(active)
      button.setAttribute('aria-selected', String(active))
    })
    applyFilter()
    context?.onProgressiveRender?.()
  }
  const tabHandlers = new Map<HTMLButtonElement, () => void>()
  tabButtons.forEach((button, id) => {
    const handler = () => selectPanel(id as PanelId)
    tabHandlers.set(button, handler)
    button.addEventListener('click', handler)
  })
  search.addEventListener('input', applyFilter)
  selectPanel(activePanel)

  context?.options?.onDiagnostic?.({
    code: `indesign-${format}-${parsed.fidelity}`,
    level: format === 'inx' ? 'warning' : 'info',
    message: parsed.warnings[0],
    detail: { format, fidelity: parsed.fidelity, statistics: parsed.statistics }
  })
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    getPrintMaskPages: () => [activeRender.container],
    printStyle: exchangeStyle,
    toHtml: () => root.outerHTML
  })
  context?.registerThumbnailAdapter?.({ getTarget: () => activeRender.thumbnail })
  context?.onProgressiveRender?.()

  return {
    $el: root,
    unmount() {
      tabHandlers.forEach((handler, button) => button.removeEventListener('click', handler))
      search.removeEventListener('input', applyFilter)
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      target.replaceChildren()
    }
  }
}
