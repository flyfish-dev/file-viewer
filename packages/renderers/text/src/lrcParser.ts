/** Static LRC model. No media is opened and document text is never evaluated. */
export interface LrcWord { text: string; timeMs: number | null }
export interface LrcCue {
  line: number
  timeMs: number | null
  text: string
  role: 'M' | 'F' | 'D' | null
  words: LrcWord[]
}
export interface LrcDocument {
  source: string
  offsetMs: number
  metadata: { key: string; value: string }[]
  cues: LrcCue[]
}
const STAMP = /^(-?)(\d{1,8}):([0-5]\d)(?:[.:](\d{1,3}))?$/
export function parseLrcTimestamp(value: string): number | null {
  const match = STAMP.exec(value)
  if (!match) return null
  const ms = Number(match[2]) * 60000 + Number(match[3]) * 1000 + Number((match[4] || '').padEnd(3, '0'))
  return (match[1] ? -1 : 1) * ms
}
export function formatLrcTimestamp(ms: number): string {
  const absolute = Math.abs(ms)
  return `${ms < 0 ? '-' : ''}${String(Math.floor(absolute / 60000)).padStart(2, '0')}:${String(Math.floor(absolute / 1000) % 60).padStart(2, '0')}.${String(absolute % 1000).padStart(3, '0')}`
}

/** Preserve unknown/malformed markers as text; never silently discard content.
 * Bounds limit timestamp expansion, not just input bytes. The renderer falls back
 * to the existing source viewer when these limits are exceeded.
 */
export function parseLrc(source: string): LrcDocument {
  if (source.length > 2_000_000) throw new RangeError('LRC source preview required')
  const document: LrcDocument = { source, offsetMs: 0, metadata: [], cues: [] }
  let role: LrcCue['role'] = null
  let wordCount = 0
  const lines = source.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const metadata = /^\[([a-z][a-z0-9_-]*):(.*)\]\s*$/i.exec(line)
    if (metadata) {
      document.metadata.push({key: metadata[1], value: metadata[2]})
      if (metadata[1].toLowerCase() === 'offset' && /^[+-]?\d+$/.test(metadata[2].trim())) {
        const offset = Number(metadata[2])
        if (Number.isSafeInteger(offset) && Math.abs(offset) <= 1e12) document.offsetMs = offset
      }
      continue
    }
    let cursor = 0
    const timestamps: number[] = []
    while (line[cursor] === '[') {
      const end = line.indexOf(']', cursor + 1)
      if (end < 0 || end - cursor > 24) break
      const timestamp = parseLrcTimestamp(line.slice(cursor + 1, end))
      if (timestamp === null) break
      timestamps.push(timestamp)
      cursor = end + 1
      if (timestamps.length + document.cues.length > 10000) throw new RangeError('Too many LRC cues')
    }
    let body = line.slice(cursor)
    const speaker = timestamps.length ? /^([MFD]):/.exec(body) : null
    if (speaker) { role = speaker[1] as LrcCue['role']; body = body.slice(2) }
    const words: LrcWord[] = []
    const marker = /<(-?\d{1,8}:[0-5]\d(?:[.:]\d{1,3})?)>/g
    let wordStart = 0
    let timeMs: number | null = null
    for (let match = marker.exec(body); match; match = marker.exec(body)) {
      if (match.index > wordStart) words.push({text: body.slice(wordStart, match.index), timeMs})
      timeMs = parseLrcTimestamp(match[1])
      wordStart = match.index + match[0].length
    }
    if (wordStart < body.length || !words.length) words.push({text: body.slice(wordStart), timeMs})
    wordCount += words.length * Math.max(1, timestamps.length)
    if (wordCount > 50000 || document.cues.length >= 10000) throw new RangeError('LRC source preview required')
    const text = words.map(word => word.text).join('')
    // Repeated line timestamps repeat the phrase and shift its inline word clock.
    const times: (number | null)[] = timestamps.length ? timestamps : [null]
    for (const timestamp of times) {
      const shift = timestamp === null ? 0 : timestamp - timestamps[0]
      document.cues.push({line:index + 1, timeMs:timestamp, text, role:timestamps.length ? role : null,
        words:words.map(word => ({text:word.text, timeMs:word.timeMs === null ? null : word.timeMs + shift}))})
    }
  }
  // Positive offset advances the lyric; apply once to both line and word clocks.
  for (const cue of document.cues) {
    if (cue.timeMs !== null) cue.timeMs -= document.offsetMs
    for (const word of cue.words) if (word.timeMs !== null) word.timeMs -= document.offsetMs
  }
  return document
}
