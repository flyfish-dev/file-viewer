import {
  createFileViewerTranslator,
  type FileViewerI18nContext,
  type FileViewerOptions,
  type FileViewerSignatureDetailsPanelOptions
} from '@file-viewer/core'
import { createSignaturePanelReadingState } from './detailsPanelReadingState.js'

export const FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT = 'file-viewer-signature-panel-change'

export interface FileViewerSignaturePanelChangeDetail {
  expanded: boolean
  position: 'top' | 'left'
  openingBehavior: 'overlay' | 'push'
}

export const normalizeSignatureDetailsPanelOptions = (
  options?: FileViewerSignatureDetailsPanelOptions
): FileViewerSignaturePanelChangeDetail => ({
  expanded: options?.initialState !== 'collapsed',
  position: options?.position === 'left' ? 'left' : 'top',
  openingBehavior: options?.openingBehavior === 'push' ? 'push' : 'overlay'
})

let panelSequence = 0

export const signatureDetailsPanelStyle = `
.signature-shell{container:signature-shell / inline-size}
.signature-header{flex-wrap:wrap}
@container signature-shell (max-width:860px){.signature-content{grid-template-columns:1fr}.signature-header{position:relative}.signature-preview-target{height:520px}}
.signature-panel-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:100%}
.signature-panel-button{max-width:100%;padding:7px 10px;border:1px solid #9aabba;border-radius:7px;background:#fff;color:#172033;font:inherit;font-size:12px;line-height:1.4;text-align:start;white-space:normal;overflow-wrap:anywhere;cursor:pointer}
.signature-panel-button:focus-visible{outline:3px solid #1d71bf;outline-offset:2px}
.signature-panel-validation{font-size:12px;overflow-wrap:anywhere}
.signature-panel-validation[data-state='failed']{color:#991b1b}
.signature-panel-validation[data-state='incomplete']{color:#854d0e}
.signature-details-panel{min-width:0;display:flex;flex-direction:column;gap:12px}
.signature-details-panel[hidden]{display:none!important}
.signature-details-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.signature-details-heading h3{margin:0;font-size:14px;overflow-wrap:anywhere}
.signature-details-body{display:flex;flex-direction:column;gap:12px;min-width:0}
.signature-main[data-panel-position='left']{position:relative;display:grid;grid-template-columns:minmax(0,1fr);align-content:start;align-items:start;gap:0}
.signature-main[data-panel-position='left']>.signature-preview{grid-column:1;grid-row:1;min-width:0}
.signature-main[data-panel-position='left']>.signature-details-panel{position:absolute;left:0;top:0;z-index:2;width:45%;max-width:340px;max-height:min(65vh,720px);overflow:auto;overscroll-behavior:contain;padding:6px;border:1px solid #9aabba;border-radius:10px;background:#edf2f7;box-shadow:4px 4px 18px #17203333;container:signature-details / inline-size}
.signature-main[data-panel-position='left'][data-panel-behavior='push'][data-panel-expanded='true']{grid-template-columns:min(340px,45%) minmax(0,1fr);column-gap:12px}
.signature-main[data-panel-position='left'][data-panel-behavior='push'][data-panel-expanded='true']>.signature-preview{grid-column:2}
.signature-main[data-panel-position='left'][data-panel-behavior='push']>.signature-details-panel{position:relative;grid-column:1;grid-row:1;width:auto;max-width:none;box-shadow:none}
.signature-main[data-panel-position='left']:not(:has(>.signature-preview)){grid-template-columns:minmax(0,1fr)}
.signature-main[data-panel-position='left']:not(:has(>.signature-preview))>.signature-details-panel{position:relative;grid-row:1;grid-column:1;width:100%;max-width:none}
.signature-shell[data-signature-panel-position='left']{scrollbar-gutter:stable}
@container signature-details (max-width:240px){.signature-details-panel .signature-card h3,.signature-details-panel .signature-grid dt,.signature-details-panel .signature-item-head strong,.signature-details-panel .signature-item-head span{overflow-wrap:anywhere;min-width:0;max-width:100%}.signature-details-panel .signature-status{max-width:100%;min-width:0;overflow-wrap:anywhere;flex-wrap:wrap}.signature-details-panel .signature-grid{display:block}.signature-details-panel .signature-grid dt{margin-top:7px}.signature-details-panel .signature-grid dd{margin-top:3px}.signature-details-panel .signature-item-head{flex-wrap:wrap}.signature-details-panel .signature-card{padding:6px}.signature-details-panel .signature-item{padding:4px}}
[data-viewer-theme='dark'] .signature-details-panel{background:#182233;border-color:#64748b}
[data-viewer-theme='dark'] .signature-panel-button{background:#182233;color:#e5edf7;border-color:#64748b}
[data-viewer-theme='dark'] .signature-panel-validation[data-state='failed']{color:#fca5a5}
[data-viewer-theme='dark'] .signature-panel-validation[data-state='incomplete']{color:#fcd34d}
`

/** All branches supply existing cards. No inspection, input reading, or nested rendering is done here. */
export const createSignatureDetailsPanel = ({
  shell,
  header,
  sidebar,
  main,
  state,
  options,
  i18n,
  checks,
  onExpandedChange
}: {
  shell: HTMLElement
  header: HTMLElement
  sidebar: HTMLElement
  main: HTMLElement
  state: FileViewerSignaturePanelChangeDetail
  options?: FileViewerOptions
  i18n?: FileViewerI18nContext
  /** Existing applicable check results only. Empty is neutral, never valid. */
  checks: readonly (boolean | undefined)[]
  onExpandedChange: (expanded: boolean) => void
}) => {
  const doc = shell.ownerDocument
  const t = createFileViewerTranslator(i18n || options)
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string | (() => string)
  ) => {
    return t.element(doc, tag, className, text)
  }
  const button = (text: string | (() => string)) => {
    const node = make('button', 'signature-panel-button', text)
    node.type = 'button'
    return node
  }
  const panel = make('section', 'signature-details-panel')
  panel.id = `signature-details-${++panelSequence}`
  const heading = make('div', 'signature-details-heading')
  const title = make('h3', '', () => t('signature.panel.title'))
  title.id = `${panel.id}-title`
  panel.setAttribute('aria-labelledby', title.id)
  const close = button(() => t('signature.panel.close'))
  heading.append(title, close)
  const body = make('div', 'signature-details-body')
  const details = Array.from(main.children).filter(
    (node) => !node.classList.contains('signature-preview')
  )
  body.append(...details)
  panel.append(heading, body)
  main.prepend(panel)
  const preview = main.querySelector<HTMLElement>('.signature-preview-target') || undefined
  const reading = createSignaturePanelReadingState(shell, preview)
  const actions = make('div', 'signature-panel-actions')
  const toggle = button('')
  toggle.setAttribute('aria-controls', panel.id)
  const failed = checks.some((value) => value === false)
  const incomplete = !failed && checks.some((value) => value === undefined)
  const review = button(() => t('signature.panel.reviewValidation'))
  const summary = make(
    'span',
    'signature-panel-validation',
    failed || incomplete
      ? () => t(failed ? 'signature.panel.checksFailed' : 'signature.panel.checksIncomplete')
      : ''
  )
  summary.dataset.state = failed ? 'failed' : incomplete ? 'incomplete' : 'neutral'
  const notices = Array.from(sidebar.querySelectorAll<HTMLElement>('.signature-warning'))
  const warnings = button(
    notices.length ? () => t('signature.panel.validationNotices', { count: notices.length }) : ''
  )
  actions.append(toggle)
  if (failed || incomplete) actions.append(summary)
  actions.append(review)
  if (notices.length) actions.append(warnings)
  header.append(actions)
  let expanded = state.expanded
  let disposed = false
  const sync = () => {
    panel.hidden = !expanded
    shell.dataset.signaturePanelPosition = state.position
    main.dataset.panelPosition = state.position
    main.dataset.panelBehavior = state.openingBehavior
    main.dataset.panelExpanded = String(expanded)
    toggle.setAttribute('aria-expanded', String(expanded))
    t.bind(toggle, (node) => {
      node.textContent = t(expanded ? 'signature.panel.hide' : 'signature.panel.show')
    })
  }
  const activeElement = () => {
    let active = (shell.getRootNode() as Document | ShadowRoot).activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    return active
  }
  const setExpanded = (next: boolean) => {
    if (disposed || next === expanded) return
    const afterChange = reading.beforeChange(state.position, state.openingBehavior)
    if (!next && panel.contains(activeElement())) toggle.focus({ preventScroll: true })
    expanded = next
    sync()
    afterChange()
    onExpandedChange(expanded)
    const Constructor = doc.defaultView?.CustomEvent
    if (Constructor)
      shell.dispatchEvent(
        new Constructor<FileViewerSignaturePanelChangeDetail>(
          FILE_VIEWER_SIGNATURE_PANEL_CHANGE_EVENT,
          {
            bubbles: true,
            composed: true,
            detail: {
              expanded,
              position: state.position,
              openingBehavior: state.openingBehavior
            }
          }
        )
      )
  }
  const onToggle = () => setExpanded(!expanded)
  const onClose = () => setExpanded(false)
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    event.stopPropagation()
    setExpanded(false)
  }
  const focus = (node: HTMLElement) => {
    if (disposed || !shell.isConnected || !shell.contains(node)) return
    node.tabIndex = -1
    node.focus({ preventScroll: true })
    if (disposed || !shell.isConnected || !shell.contains(node)) return
    const view = doc.defaultView
    if (!view) return
    const nearestDelta = (start: number, end: number, low: number, high: number) => {
      if (high <= low || (start >= low && end <= high)) return 0
      // Oversized targets cannot be shown in full. Keep their already-visible
      // portion, otherwise bring the closest edge into this owned scrollport.
      if (start < low && end > high) return 0
      if (end - start > high - low)
        return Math.abs(start - low) < Math.abs(end - high) ? start - low : end - high
      return start < low ? start - low : end - high
    }
    const reveal = (scroller: HTMLElement) => {
      const style = view.getComputedStyle(scroller)
      const bounds = scroller.getBoundingClientRect()
      const left = bounds.left + scroller.clientLeft
      let top = bounds.top + scroller.clientTop
      const right = left + scroller.clientWidth
      const bottom = top + scroller.clientHeight
      if (scroller === shell && view.getComputedStyle(header).position === 'sticky') {
        const headerBounds = header.getBoundingClientRect()
        if (headerBounds.top <= top && headerBounds.bottom > top)
          top = Math.min(bottom, headerBounds.bottom)
      }
      const rect = node.getBoundingClientRect()
      // Engines may quantize scroll offsets to CSS pixels. Round outward so a
      // subpixel edge is not left clipped after the nearest-position adjustment.
      const pixels = (delta: number) => (delta < 0 ? Math.floor(delta) : Math.ceil(delta))
      if (['auto', 'scroll', 'overlay'].includes(style.overflowY)) {
        const delta = pixels(nearestDelta(rect.top, rect.bottom, top, bottom))
        if (delta) scroller.scrollTop += delta
      }
      if (['auto', 'scroll', 'overlay'].includes(style.overflowX)) {
        const delta = pixels(nearestDelta(rect.left, rect.right, left, right))
        if (delta) scroller.scrollLeft += delta
      }
    }
    // Reveal inside-out, and stop at this signature's owned shell. Never use
    // scrollIntoView: it can scroll the host page, an ancestor viewer or preview.
    if (panel.contains(node)) reveal(panel)
    reveal(shell)
  }
  const onReview = () => {
    setExpanded(true)
    const finding = panel.querySelector<HTMLElement>(
      "[data-state='invalid'],[data-state='pending']"
    )
    focus(finding || title)
  }
  const onWarnings = () => {
    if (notices[0]) focus(notices[0])
  }
  sync()
  toggle.addEventListener('click', onToggle)
  close.addEventListener('click', onClose)
  panel.addEventListener('keydown', onKey)
  review.addEventListener('click', onReview)
  warnings.addEventListener('click', onWarnings)
  return {
    cancelReading: reading.cancel,
    dispose() {
      disposed = true
      reading.dispose()
      toggle.removeEventListener('click', onToggle)
      close.removeEventListener('click', onClose)
      panel.removeEventListener('keydown', onKey)
      review.removeEventListener('click', onReview)
      warnings.removeEventListener('click', onWarnings)
      t.release(panel)
      t.release(actions)
    }
  }
}
