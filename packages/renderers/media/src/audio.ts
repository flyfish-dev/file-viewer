import {
  createFileViewerTranslator,
  type FileRenderContext,
  type FileViewerRenderedInstance
} from '@file-viewer/core'
import { getFileViewerMidiLoader } from './optionalCapabilities.js'

const AUDIO_MIME_MAP: Record<string, string> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg; codecs=opus',
  wav: 'audio/wav',
  weba: 'audio/webm'
}

interface MidiTrackSummary {
  name: string
  instrument: string
  channel: number
  notes: number
  duration: number
}

const audioStyle = `
.fv-audio-viewer{width:100%;min-height:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:linear-gradient(135deg,rgba(14,116,144,.1),transparent 34%),linear-gradient(180deg,#f5f8fb 0%,#edf2f7 100%);box-sizing:border-box}
.fv-audio-card{width:min(100%,640px);display:grid;grid-template-columns:86px minmax(0,1fr);gap:18px;align-items:center;padding:24px;border-radius:8px;border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.92);box-shadow:0 20px 52px rgba(15,23,42,.13);box-sizing:border-box}
.fv-audio-art{position:relative;width:86px;height:86px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#2dd4bf);box-shadow:inset 0 0 0 1px rgba(255,255,255,.24)}
.fv-audio-art span{position:absolute;inset:18px;border-radius:999px;border:8px solid rgba(255,255,255,.88)}
.fv-audio-art i{position:absolute;right:18px;bottom:20px;width:18px;height:36px;border-radius:10px 10px 4px 4px;background:rgba(255,255,255,.9)}
.fv-audio-copy{min-width:0}
.fv-audio-kicker{color:#0f766e;font-size:12px;font-weight:800;letter-spacing:0}
.fv-audio-copy strong{display:block;margin-top:5px;color:#132235;font-size:23px;line-height:1.15}
.fv-audio-copy p{margin:8px 0 0;color:#64748b;font-size:13px;line-height:1.7}
.fv-audio-meter{grid-column:1/-1;display:grid;grid-template-columns:48px minmax(0,1fr) 48px;align-items:center;gap:10px;color:#64748b;font-size:12px;font-variant-numeric:tabular-nums}
.fv-audio-progress{height:6px;overflow:hidden;border-radius:999px;background:rgba(15,118,110,.12)}
.fv-audio-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0f766e,#2dd4bf);transition:width .18s ease}
.fv-audio-control{grid-column:1/-1;width:100%;height:42px}
.fv-midi-viewer{min-height:100%;padding:28px;background:#eef1f4;box-sizing:border-box}
.fv-midi-card{max-width:960px;margin:0 auto;border-radius:8px;border:1px solid rgba(15,23,42,.08);background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.12);overflow:hidden}
.fv-midi-card header{padding:18px 22px;border-bottom:1px solid rgba(15,23,42,.08)}
.fv-midi-card header span{display:block;color:#0f766e;font-size:12px;font-weight:800}
.fv-midi-card header strong{display:block;margin-top:6px;color:#132235;font-size:22px}
.fv-midi-state{padding:28px 22px;color:#64748b}
.fv-midi-error{color:#b42318}
.fv-midi-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:rgba(15,23,42,.08)}
.fv-midi-stats div{padding:16px;background:#f8fafc}
.fv-midi-stats span{display:block;color:#64748b;font-size:12px}
.fv-midi-stats strong{display:block;margin-top:4px;color:#132235;font-size:20px}
.fv-midi-table-wrap{overflow:auto}
.fv-midi-table{width:100%;border-collapse:collapse;color:#132235;font-size:14px}
.fv-midi-table th,.fv-midi-table td{padding:12px 16px;border-top:1px solid rgba(15,23,42,.08);text-align:left}
.fv-midi-table th{color:#64748b;background:#f8fafc;font-weight:700}
[data-viewer-theme='dark'] .fv-audio-viewer{background:linear-gradient(135deg,rgba(45,212,191,.12),transparent 34%),linear-gradient(180deg,#111827 0%,#101820 100%);color:#e5eef8}
[data-viewer-theme='dark'] .fv-audio-card,[data-viewer-theme='dark'] .fv-midi-card{border-color:rgba(148,163,184,.18);background:#111827;color:#e5eef8;box-shadow:0 22px 56px rgba(0,0,0,.32)}
[data-viewer-theme='dark'] .fv-audio-copy strong,[data-viewer-theme='dark'] .fv-midi-card header strong,[data-viewer-theme='dark'] .fv-midi-stats strong,[data-viewer-theme='dark'] .fv-midi-table{color:#f8fafc}
[data-viewer-theme='dark'] .fv-audio-copy p,[data-viewer-theme='dark'] .fv-audio-meter,[data-viewer-theme='dark'] .fv-midi-state,[data-viewer-theme='dark'] .fv-midi-stats span,[data-viewer-theme='dark'] .fv-midi-table th{color:#94a3b8}
[data-viewer-theme='dark'] .fv-midi-viewer{background:#101820}
[data-viewer-theme='dark'] .fv-midi-card header,[data-viewer-theme='dark'] .fv-midi-table th,[data-viewer-theme='dark'] .fv-midi-stats div{border-color:rgba(148,163,184,.18);background:#151f2b}
[data-viewer-theme='dark'] .fv-midi-stats,[data-viewer-theme='dark'] .fv-midi-table th,[data-viewer-theme='dark'] .fv-midi-table td{border-color:rgba(148,163,184,.18)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .fv-audio-viewer{background:linear-gradient(135deg,rgba(45,212,191,.12),transparent 34%),linear-gradient(180deg,#111827 0%,#101820 100%);color:#e5eef8}[data-viewer-theme='system'] .fv-audio-card,[data-viewer-theme='system'] .fv-midi-card{border-color:rgba(148,163,184,.18);background:#111827;color:#e5eef8;box-shadow:0 22px 56px rgba(0,0,0,.32)}[data-viewer-theme='system'] .fv-audio-copy strong,[data-viewer-theme='system'] .fv-midi-card header strong,[data-viewer-theme='system'] .fv-midi-stats strong,[data-viewer-theme='system'] .fv-midi-table{color:#f8fafc}[data-viewer-theme='system'] .fv-audio-copy p,[data-viewer-theme='system'] .fv-audio-meter,[data-viewer-theme='system'] .fv-midi-state,[data-viewer-theme='system'] .fv-midi-stats span,[data-viewer-theme='system'] .fv-midi-table th{color:#94a3b8}[data-viewer-theme='system'] .fv-midi-viewer{background:#101820}[data-viewer-theme='system'] .fv-midi-card header,[data-viewer-theme='system'] .fv-midi-table th,[data-viewer-theme='system'] .fv-midi-stats div{border-color:rgba(148,163,184,.18);background:#151f2b}[data-viewer-theme='system'] .fv-midi-stats,[data-viewer-theme='system'] .fv-midi-table th,[data-viewer-theme='system'] .fv-midi-table td{border-color:rgba(148,163,184,.18)}}
@media (max-width:700px){.fv-midi-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
`

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className?: string,
  text?: string
) => {
  const element = document.createElement(tagName)
  if (className) {
    element.className = className
  }
  if (typeof text === 'string') {
    element.textContent = text
  }
  return element
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00'
  }
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const createStyle = () => {
  const style = document.createElement('style')
  style.textContent = audioStyle
  return style
}

const clearTarget = (target: HTMLDivElement) => {
  target.replaceChildren()
}

const createRenderedInstance = (
  target: HTMLDivElement,
  cleanup: () => void
): FileViewerRenderedInstance => ({
  $el: target,
  unmount() {
    cleanup()
    clearTarget(target)
  }
})

const renderAudioElement = (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type: string,
  context?: FileRenderContext
): FileViewerRenderedInstance => {
  const t = createFileViewerTranslator(context?.options)
  const normalizedType = type.trim().toLowerCase() || 'mp3'
  const mimeType = AUDIO_MIME_MAP[normalizedType] || 'audio/*'
  const sourceUrl = URL.createObjectURL(new Blob([buffer], { type: mimeType }))

  const root = createElement('div', 'fv-audio-viewer')
  const card = createElement('section', 'fv-audio-card')
  const art = createElement('div', 'fv-audio-art')
  art.append(createElement('span'), createElement('i'))

  const copy = createElement('div', 'fv-audio-copy')
  copy.append(
    createElement('span', 'fv-audio-kicker', normalizedType.toUpperCase() || 'AUDIO'),
    createElement('strong', '', t('media.audio.title')),
    createElement('p', '', t('media.audio.description'))
  )

  const currentTimeText = createElement('span', '', '00:00')
  const durationText = createElement('span', '', '--:--')
  const progressFill = createElement('i')
  const progress = createElement('div', 'fv-audio-progress')
  progress.setAttribute('aria-hidden', 'true')
  progress.append(progressFill)

  const meter = createElement('div', 'fv-audio-meter')
  meter.append(currentTimeText, progress, durationText)

  const audio = createElement('audio', 'fv-audio-control')
  audio.src = sourceUrl
  audio.controls = true
  audio.preload = 'metadata'
  audio.textContent = t('media.audio.unsupported')

  const handleLoadedMetadata = () => {
    durationText.textContent = Number.isFinite(audio.duration) && audio.duration > 0
      ? formatDuration(audio.duration)
      : '--:--'
  }
  const handleTimeUpdate = () => {
    currentTimeText.textContent = formatDuration(audio.currentTime)
    const percent = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(100, Math.max(0, audio.currentTime / audio.duration * 100))
      : 0
    progressFill.style.width = `${percent}%`
  }

  audio.addEventListener('loadedmetadata', handleLoadedMetadata)
  audio.addEventListener('timeupdate', handleTimeUpdate)

  card.append(art, copy, meter, audio)
  root.append(card)
  target.replaceChildren(createStyle(), root)

  return createRenderedInstance(target, () => {
    audio.pause()
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    audio.removeEventListener('timeupdate', handleTimeUpdate)
    URL.revokeObjectURL(sourceUrl)
  })
}

const renderMidiElement = (
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): FileViewerRenderedInstance => {
  const t = createFileViewerTranslator(context?.options)
  let disposed = false
  const root = createElement('div', 'fv-midi-viewer')
  const card = createElement('section', 'fv-midi-card')
  const header = document.createElement('header')
  const title = createElement('strong', '', t('media.midi.title'))
  header.append(createElement('span', '', 'MIDI'), title)
  const body = createElement('div', 'fv-midi-state', t('media.midi.loading'))
  card.append(header, body)
  root.append(card)
  target.replaceChildren(createStyle(), root)

  const renderError = (message: string) => {
    body.className = 'fv-midi-state fv-midi-error'
    body.textContent = message
  }

  const renderTrackTable = (tracks: MidiTrackSummary[]) => {
    const wrap = createElement('div', 'fv-midi-table-wrap')
    const table = createElement('table', 'fv-midi-table')
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    for (const label of [
      t('media.midi.trackHeader'),
      t('media.midi.instrumentHeader'),
      t('media.midi.channelHeader'),
      t('media.midi.noteCountHeader'),
      t('media.midi.durationHeader')
    ]) {
      headerRow.append(createElement('th', '', label))
    }
    thead.append(headerRow)
    const tbody = document.createElement('tbody')
    for (const track of tracks) {
      const row = document.createElement('tr')
      row.append(
        createElement('td', '', track.name),
        createElement('td', '', track.instrument),
        createElement('td', '', String(track.channel + 1)),
        createElement('td', '', String(track.notes)),
        createElement('td', '', formatDuration(track.duration))
      )
      tbody.append(row)
    }
    table.append(thead, tbody)
    wrap.append(table)
    return wrap
  }

  const renderSummary = (input: {
    name: string
    duration: number
    ppq: number
    tracks: MidiTrackSummary[]
  }) => {
    title.textContent = input.name
    const totalNotes = input.tracks.reduce((sum, track) => sum + track.notes, 0)
    const stats = createElement('div', 'fv-midi-stats')
    for (const [label, value] of [
      [t('media.midi.durationStat'), formatDuration(input.duration)],
      ['PPQ', String(input.ppq)],
      [t('media.midi.trackStat'), String(input.tracks.length)],
      [t('media.midi.noteStat'), String(totalNotes)]
    ]) {
      const stat = document.createElement('div')
      stat.append(createElement('span', '', label), createElement('strong', '', value))
      stats.append(stat)
    }
    body.replaceWith(stats, renderTrackTable(input.tracks))
  }

  void (async () => {
    try {
      const loadMidi = getFileViewerMidiLoader()
      if (!loadMidi) {
        throw new Error('MIDI support is opt-in. Run `npx file-viewer-cli add midi --write`, then `npx file-viewer-cli install --yes`.')
      }
      const { Midi } = await loadMidi()
      const midi = new Midi(buffer)
      if (disposed) {
        return
      }
      renderSummary({
        name: midi.name || t('media.midi.title'),
        duration: midi.duration,
        ppq: midi.header.ppq,
        tracks: midi.tracks.map((track, index) => ({
          name: track.name || `Track ${index + 1}`,
          instrument: track.instrument?.name || track.instrument?.family || 'Unknown',
          channel: track.channel,
          notes: track.notes.length,
          duration: track.duration
        }))
      })
    } catch (error) {
      if (!disposed) {
        renderError(error instanceof Error ? error.message : t('media.midi.parseFailed'))
      }
    }
  })()

  return createRenderedInstance(target, () => {
    disposed = true
  })
}

/**
 * Pure TypeScript audio renderer.
 *
 * Regular audio files use the browser's native `<audio>` element. MIDI stays in
 * the same async chunk and lazily imports `@tonejs/midi` only for `.mid/.midi`.
 */
export default async function renderAudio(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) {
  const normalizedType = (type || 'mp3').toLowerCase()
  if (normalizedType === 'midi' || normalizedType === 'mid') {
    return renderMidiElement(buffer, target, context)
  }
  return renderAudioElement(buffer, target, normalizedType, context)
}
