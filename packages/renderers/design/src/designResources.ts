import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'
import { parseAdobePaletteInWorker } from './adobeContainerWorkerClient.js'
import { resolvePhotoshopParseLimits } from './limits.js'
import {
  type AdobePaletteColor,
  type AdobePaletteFormat,
} from './designResourceParser.js'

const resourceStyle = `
.adobe-resource-viewer{height:100%;min-height:360px;overflow:auto;background:#eef1f4;color:#132235;--resource-border:rgba(15,23,42,.1);--resource-surface:#fff;--resource-muted:#64748b;--resource-accent:#0f766e;box-sizing:border-box}.adobe-resource-viewer [hidden]{display:none!important}
.adobe-resource-toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:58px;padding:10px 18px;border-bottom:1px solid var(--resource-border);background:rgba(255,255,255,.94);backdrop-filter:blur(12px);box-sizing:border-box}.adobe-resource-title{min-width:0}.adobe-resource-title strong{display:block;overflow:hidden;font-size:15px;text-overflow:ellipsis;white-space:nowrap}.adobe-resource-title span{display:block;margin-top:3px;color:var(--resource-muted);font-size:11px;font-weight:700}.adobe-resource-search{width:min(260px,42vw);height:34px;padding:0 11px;border:1px solid rgba(100,116,139,.32);border-radius:8px;background:var(--resource-surface);color:inherit;font:inherit;box-sizing:border-box}.adobe-resource-search:focus{border-color:var(--resource-accent);outline:2px solid rgba(15,118,110,.16);outline-offset:1px}
.adobe-resource-content{max-width:1280px;margin:0 auto;padding:20px}.adobe-resource-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1px;overflow:hidden;margin-bottom:18px;border:1px solid var(--resource-border);border-radius:10px;background:var(--resource-border)}.adobe-resource-summary div{padding:13px 15px;background:var(--resource-surface)}.adobe-resource-summary span{display:block;color:var(--resource-muted);font-size:11px;font-weight:700}.adobe-resource-summary strong{display:block;margin-top:4px;font-size:14px}.adobe-resource-group{margin:0 0 22px}.adobe-resource-group h3{margin:0 0 10px;font-size:13px}.adobe-resource-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.adobe-color-card{display:grid;min-width:0;grid-template-columns:64px minmax(0,1fr);overflow:hidden;border:1px solid var(--resource-border);border-radius:9px;background:var(--resource-surface);box-shadow:0 6px 18px rgba(15,23,42,.06)}.adobe-color-swatch{min-height:78px;border-right:1px solid var(--resource-border)}.adobe-color-copy{min-width:0;padding:11px}.adobe-color-copy strong,.adobe-color-copy span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adobe-color-copy strong{font-size:12px}.adobe-color-copy span{margin-top:4px;color:var(--resource-muted);font-size:10px}.adobe-color-copy code{display:block;margin-top:7px;color:var(--resource-accent);font:800 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}.adobe-resource-empty{padding:48px 20px;color:var(--resource-muted);text-align:center;font-weight:700}
[data-viewer-theme='dark'] .adobe-resource-viewer{background:#0d1117;color:#e6edf3;--resource-border:rgba(139,148,158,.24);--resource-surface:#161b22;--resource-muted:#8b949e}[data-viewer-theme='dark'] .adobe-resource-toolbar{background:rgba(13,17,23,.94)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .adobe-resource-viewer{background:#0d1117;color:#e6edf3;--resource-border:rgba(139,148,158,.24);--resource-surface:#161b22;--resource-muted:#8b949e}[data-viewer-theme='system'] .adobe-resource-toolbar{background:rgba(13,17,23,.94)}}
@media (max-width:600px){.adobe-resource-toolbar{align-items:flex-start;flex-direction:column;gap:8px;padding:9px 12px}.adobe-resource-search{width:100%}.adobe-resource-content{padding:12px}.adobe-resource-grid{grid-template-columns:1fr 1fr;gap:8px}.adobe-color-card{grid-template-columns:46px minmax(0,1fr)}.adobe-color-swatch{min-height:74px}.adobe-color-copy{padding:9px}.adobe-color-copy span{white-space:normal}.adobe-resource-summary{grid-template-columns:1fr 1fr}}
@media (max-width:390px){.adobe-resource-grid{grid-template-columns:1fr}}
`

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName)
  if (className) element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

const byteSize = (value: number) => value < 1024
  ? `${value} B`
  : value < 1024 * 1024
    ? `${(value / 1024).toFixed(1)} KiB`
    : `${(value / 1024 / 1024).toFixed(1)} MiB`

const swatchCss = (color: AdobePaletteColor) => `rgb(${color.rgb.map(value => Math.round(value * 255)).join(' ')})`

export default async function renderAdobeDesignResource(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type: AdobePaletteFormat,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('Adobe resource rendering was aborted.', 'AbortError')
  const documentRef = target.ownerDocument || document
  const limits = resolvePhotoshopParseLimits(context?.options?.design)
  const parsed = await parseAdobePaletteInWorker(
    buffer,
    type,
    limits,
    context?.options?.design,
    context?.signal
  )
  if (context?.signal?.aborted) throw new DOMException('Adobe resource rendering was aborted.', 'AbortError')
  const isChinese = (context?.options?.locale || documentRef.documentElement.lang || '').toLowerCase().startsWith('zh')
  const copy = isChinese ? {
    ase: 'Adobe 交换色板', aco: 'Adobe Photoshop 色板', colors: '颜色', groups: '分组', version: '版本', size: '文件大小',
    search: '筛选名称、色值或模型', ungrouped: '未分组', empty: '没有匹配的颜色',
  } : {
    ase: 'Adobe Swatch Exchange', aco: 'Adobe Photoshop Color Swatch', colors: 'Colors', groups: 'Groups', version: 'Version', size: 'File size',
    search: 'Filter names, values, or models', ungrouped: 'Ungrouped', empty: 'No matching colors',
  }

  const style = createElement(documentRef, 'style')
  style.textContent = resourceStyle
  const root = createElement(documentRef, 'section', 'adobe-resource-viewer')
  root.dataset.adobeResource = type
  root.dataset.colorCount = String(parsed.colors.length)
  const toolbar = createElement(documentRef, 'header', 'adobe-resource-toolbar')
  const title = createElement(documentRef, 'div', 'adobe-resource-title')
  title.append(
    createElement(documentRef, 'strong', undefined, type === 'ase' ? copy.ase : copy.aco),
    createElement(documentRef, 'span', undefined, `${parsed.colors.length} ${copy.colors.toLowerCase()} · ${type.toUpperCase()} ${parsed.version}`)
  )
  const search = createElement(documentRef, 'input', 'adobe-resource-search')
  search.type = 'search'
  search.placeholder = copy.search
  search.setAttribute('aria-label', copy.search)
  toolbar.append(title, search)

  const content = createElement(documentRef, 'div', 'adobe-resource-content')
  const summary = createElement(documentRef, 'div', 'adobe-resource-summary')
  ;[
    [copy.colors, String(parsed.colors.length)],
    [copy.groups, String(parsed.groups.length)],
    [copy.version, parsed.version],
    [copy.size, byteSize(buffer.byteLength)],
  ].forEach(([label, value]) => {
    const cell = createElement(documentRef, 'div')
    cell.append(createElement(documentRef, 'span', undefined, label), createElement(documentRef, 'strong', undefined, value))
    summary.appendChild(cell)
  })
  const empty = createElement(documentRef, 'div', 'adobe-resource-empty', copy.empty)
  empty.hidden = true
  const groups = new Map<string, AdobePaletteColor[]>()
  parsed.colors.forEach(color => {
    const groupName = color.groupPath.join(' / ') || copy.ungrouped
    const values = groups.get(groupName) || []
    values.push(color)
    groups.set(groupName, values)
  })
  const groupElements: Array<{ section: HTMLElement; cards: HTMLElement[] }> = []
  for (const [groupName, colors] of groups) {
    const section = createElement(documentRef, 'section', 'adobe-resource-group')
    section.dataset.groupName = groupName
    if (groups.size > 1 || groupName !== copy.ungrouped) section.appendChild(createElement(documentRef, 'h3', undefined, groupName))
    const grid = createElement(documentRef, 'div', 'adobe-resource-grid')
    const cards = colors.map(color => {
      const card = createElement(documentRef, 'article', 'adobe-color-card')
      card.dataset.searchText = `${color.name} ${color.hex} ${color.model} ${color.componentText} ${color.kind}`.toLocaleLowerCase()
      const swatch = createElement(documentRef, 'div', 'adobe-color-swatch')
      swatch.style.background = swatchCss(color)
      swatch.setAttribute('role', 'img')
      swatch.setAttribute('aria-label', `${color.name}: ${color.hex}`)
      const details = createElement(documentRef, 'div', 'adobe-color-copy')
      details.append(
        createElement(documentRef, 'strong', undefined, color.name),
        createElement(documentRef, 'span', undefined, `${color.model} · ${color.componentText}`),
        createElement(documentRef, 'code', undefined, color.hex)
      )
      card.append(swatch, details)
      grid.appendChild(card)
      return card
    })
    section.appendChild(grid)
    content.appendChild(section)
    groupElements.push({ section, cards })
  }
  content.prepend(summary)
  content.appendChild(empty)
  root.append(toolbar, content)
  target.replaceChildren(style, root)

  const applyFilter = () => {
    const query = search.value.trim().toLocaleLowerCase()
    let visible = 0
    for (const group of groupElements) {
      let groupVisible = 0
      group.cards.forEach(card => {
        const match = !query || (card.dataset.searchText || '').includes(query)
        card.hidden = !match
        if (match) groupVisible += 1
      })
      group.section.hidden = groupVisible === 0
      visible += groupVisible
    }
    empty.hidden = visible !== 0
  }
  search.addEventListener('input', applyFilter)

  if (parsed.unknownBlocks || parsed.trailingBytes) {
    context?.options?.onDiagnostic?.({
      code: 'adobe-palette-forward-compatible-data',
      level: 'warning',
      message: 'The Adobe palette contains bounded data outside the recognized color records; recognized colors were still rendered.',
      detail: { format: type, unknownBlocks: parsed.unknownBlocks, trailingBytes: parsed.trailingBytes },
    })
  }
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    getPrintMaskPages: () => [content],
    printStyle: resourceStyle,
    toHtml: () => root.outerHTML,
  })
  context?.registerThumbnailAdapter?.({ getTarget: () => content })
  return {
    $el: root,
    unmount() {
      search.removeEventListener('input', applyFilter)
      context?.registerExportAdapter?.(null)
      context?.registerThumbnailAdapter?.(null)
      target.replaceChildren()
    },
  }
}
