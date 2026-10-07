import {
  createFileViewerZoomChangeEmitter,
  decodeFileViewerTextBuffer,
  registerFileViewerZoomProvider,
  resolveFileViewerLocale,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState
} from '@file-viewer/core'
import { formatLrcTimestamp, parseLrc } from './lrcParser.js'
import renderCode from './code.js'

const labels = {
  'en-US': ['Annotated', 'Lyrics', 'Source', 'Wrap lines', 'Static lyrics preview; no audio playback.'],
  'zh-CN': ['时间标注', '歌词', '原文', '自动换行', '静态歌词预览，不播放音频。'],
  'ja-JP': ['時間付き', '歌詞', '原文', '折り返し', '歌詞の静的プレビューです。音声は再生しません。'],
  'de-DE': ['Mit Zeitangaben', 'Liedtext', 'Quelltext', 'Zeilenumbruch', 'Statische Liedtextvorschau ohne Audiowiedergabe.']
} as const
const css = `
.fv-lrc{--lrc-bg:#fff;--lrc-fg:#1f2937;height:100%;min-height:0;display:flex;flex-direction:column;color:var(--lrc-fg);background:var(--lrc-bg);font:14px/1.65 system-ui,sans-serif}
.fv-lrc .lrc-toolbar{display:flex;flex-wrap:wrap;gap:6px;padding:10px;border-bottom:1px solid #8885;align-items:center}
.fv-lrc .lrc-toolbar[hidden]{display:none}
.fv-lrc button{font:inherit;color:inherit;background:transparent;border:1px solid #8887;border-radius:5px;padding:4px 10px;cursor:pointer}
.fv-lrc button[aria-pressed=true]{background:#8883;font-weight:600}
.fv-lrc .lrc-scroll{flex:1;min-height:0;overflow:auto;padding:14px;scrollbar-gutter:stable}
.fv-lrc .lrc-content{font-size:var(--lrc-font-size,16px);min-width:0}
.fv-lrc .lrc-cue{display:flex;gap:1em;min-height:1.8em;align-items:baseline}
.fv-lrc .lrc-time{font:0.8em ui-monospace,monospace;white-space:nowrap;flex:0 0 8.5em;position:sticky;left:0;background:var(--lrc-bg);z-index:1}
.fv-lrc .lrc-phrase{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;flex:1}
.fv-lrc .lrc-role{font-size:.65em;margin-right:.6em}
.fv-lrc ruby{display:inline-flex;flex-direction:column-reverse;vertical-align:bottom;white-space:pre}.fv-lrc rt{display:block;font:0.55em ui-monospace,monospace;opacity:.72}
.fv-lrc .lrc-source{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.fv-lrc[data-wrap=false] .lrc-content{width:max-content;min-width:100%}
.fv-lrc[data-wrap=false] .lrc-source,.fv-lrc[data-wrap=false] .lrc-phrase{white-space:pre;overflow-wrap:normal}
.fv-lrc .lrc-metadata{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85em;opacity:.8;margin-bottom:1em}
.fv-lrc .lrc-note{font-size:.85em;opacity:.75}
[data-viewer-theme=dark] .fv-lrc,.fv-lrc[data-viewer-theme=dark]{--lrc-bg:#101820;--lrc-fg:#e5e7eb;color-scheme:dark}
@media (prefers-color-scheme:dark){[data-viewer-theme=system] .fv-lrc,.fv-lrc[data-viewer-theme=system]{--lrc-bg:#101820;--lrc-fg:#e5e7eb;color-scheme:dark}}
@media print{.fv-lrc{--lrc-bg:#fff;--lrc-fg:#1f2937;height:auto}.fv-lrc .lrc-toolbar{display:none}.fv-lrc .lrc-scroll{overflow:visible}.fv-lrc .lrc-time{position:static}}
`

/** Read-only LRC renderer. All markup is built from DOM text nodes. */
export default async function renderLrc(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<FileViewerRenderedInstance> {
  if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (buffer.byteLength > 4_000_000) return renderCode(buffer, target, type, context)
  const source = decodeFileViewerTextBuffer(buffer, context?.options?.text?.encoding).text
  let model: ReturnType<typeof parseLrc>
  try { model = parseLrc(source) } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return renderCode(buffer, target, type, context)
  }
  const doc = target.ownerDocument
  const words = labels[resolveFileViewerLocale(context?.options)]
  const root = doc.createElement('div'); root.className = 'fv-lrc'; root.dataset.wrap = String(context?.options?.text?.wrapLongLines !== false); root.dataset.viewerTheme = context?.options?.theme || 'system'
  const style = doc.createElement('style'); style.textContent = css
  const toolbar = doc.createElement('div'); toolbar.className = 'lrc-toolbar'; toolbar.hidden = context?.options?.text?.toolbar === false
  const scroller = doc.createElement('div'); scroller.className = 'lrc-scroll'
  const content = doc.createElement('div'); content.className = 'lrc-content'
  scroller.append(content)
  const buttons = words.slice(0, 3).map((text, index) => {
    const button = doc.createElement('button'); button.type = 'button'; button.textContent = text
    button.dataset.lrcMode = String(index); toolbar.append(button); return button
  })
  const wrap = doc.createElement('button'); wrap.type = 'button'; wrap.textContent = words[3]
  wrap.dataset.lrcWrap = ''; wrap.setAttribute('aria-pressed', root.dataset.wrap); toolbar.append(wrap)
  const note = doc.createElement('span'); note.className = 'lrc-note'; note.textContent = words[4]; toolbar.append(note)
  root.append(style, toolbar, scroller)
  target.replaceChildren(root)
  let disposed = false
  let mode = 0
  let zoom = 1
  const emitter = createFileViewerZoomChangeEmitter()
  function getState(): FileViewerZoomState {
    return {scale:zoom,label:`${Math.round(zoom * 100)}%`,canZoomIn:zoom < 2.6,canZoomOut:zoom > 0.6,canReset:zoom !== 1,minScale:0.6,maxScale:2.6}
  }
  function setZoom(scale: number) {
    if (!disposed && Number.isFinite(scale)) {
      zoom = Math.max(0.6, Math.min(2.6, Math.round(scale * 100) / 100))
      root.style.setProperty('--lrc-font-size', `${16 * zoom}px`); emitter.emit()
    }
    return getState()
  }
  function show() {
    if (disposed) return
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(mode === index)))
    const fragment = doc.createDocumentFragment()
    if (mode === 2) {
      const pre = doc.createElement('pre'); pre.className = 'lrc-source'; pre.textContent = source; fragment.append(pre)
    } else {
      const metadata = doc.createElement('div'); metadata.className = 'lrc-metadata'
      metadata.textContent = model.metadata.map(entry => `${entry.key}: ${entry.value}`).join('\n'); fragment.append(metadata)
      for (const cue of model.cues) {
        const row = doc.createElement('div'); row.className = 'lrc-cue'; row.dataset.sourceLine = String(cue.line)
        if (cue.timeMs !== null) row.dataset.timeMs = String(cue.timeMs)
        if (mode === 0) {
          const time = doc.createElement('span'); time.className = 'lrc-time'; time.textContent = cue.timeMs === null ? '·' : formatLrcTimestamp(cue.timeMs); row.append(time)
        }
        const phrase = doc.createElement('span'); phrase.className = 'lrc-phrase'; phrase.dir = 'auto'
        if (cue.role) { const role = doc.createElement('sup'); role.className = 'lrc-role'; role.textContent = cue.role; phrase.append(role) }
        for (const word of cue.words) {
          if (mode === 0 && word.timeMs !== null) {
            const ruby = doc.createElement('ruby'); ruby.dataset.wordTimeMs = String(word.timeMs); ruby.append(doc.createTextNode(word.text))
            const rt = doc.createElement('rt'); rt.textContent = formatLrcTimestamp(word.timeMs); ruby.append(rt); phrase.append(ruby)
          } else phrase.append(doc.createTextNode(word.text))
        }
        row.append(phrase); fragment.append(row)
      }
    }
    content.replaceChildren(fragment)
  }
  function click(event: Event) {
    const element = event.target as HTMLElement | null
    const button = element?.closest<HTMLButtonElement>('button')
    if (!button || !toolbar.contains(button)) return
    if (button === wrap) {
      root.dataset.wrap = String(root.dataset.wrap !== 'true'); wrap.setAttribute('aria-pressed', root.dataset.wrap)
    } else if (button.dataset.lrcMode !== undefined) { mode = Number(button.dataset.lrcMode); show() }
  }
  function unmount() {
    if (disposed) return
    disposed = true; toolbar.removeEventListener('click', click)
    context?.signal?.removeEventListener('abort', unmount)
    unregisterFileViewerZoomProvider(root); emitter.clear(); root.remove()
  }
  toolbar.addEventListener('click', click); context?.signal?.addEventListener('abort', unmount, {once:true})
  registerFileViewerZoomProvider(root, {getState, setZoom,zoomIn:() => setZoom(zoom + .1),zoomOut:() => setZoom(zoom - .1),resetZoom:() => setZoom(1),subscribe:emitter.subscribe})
  show()
  return {$el:root, unmount}
}
