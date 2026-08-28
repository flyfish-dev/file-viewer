import {
  createFileViewerTranslator,
  type FileRenderContext,
  type FileViewerRenderedInstance
} from '@file-viewer/core'
import type Hls from 'hls.js'
import { getFileViewerHlsLoader } from './optionalCapabilities.js'
import {
  extractMp4vSoftwareTrack,
  inspectMp4VideoTrack,
  type Mp4VideoTrackInfo
} from './mp4.js'
import {
  mountMp4vSoftwarePlayer,
  type Mp4vSoftwarePlayerInstance
} from './mp4vPlayer.js'

const videoStyle = `
.fv-video-viewer{width:100%;min-height:100%;display:flex;align-items:center;justify-content:center;padding:28px;background:#eef1f4;box-sizing:border-box}
.fv-video-shell{width:min(100%,960px);border-radius:8px;border:1px solid rgba(15,23,42,.1);background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.14);overflow:hidden}
.fv-video-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;border-bottom:1px solid rgba(15,23,42,.08)}
.fv-video-heading span{color:#0f766e;font-size:12px;font-weight:800}
.fv-video-heading strong{color:#132235;font-size:16px}
.fv-video-player{display:block;width:100%;aspect-ratio:16/9;background:#05070a}
.fv-video-hint{margin:0;padding:12px 18px 16px;color:#64748b;font-size:13px;line-height:1.7}
.fv-video-software-player{position:relative;width:100%;max-height:min(72vh,720px);overflow:hidden;background:#05070a;color:#fff;outline:none}
.fv-video-software-canvas{display:block;width:100%;height:100%;object-fit:contain;background:#05070a;cursor:pointer}
.fv-video-audio-clock{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.fv-video-software-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(2,6,12,.74);color:#f8fafc;font-size:14px;text-align:center;box-sizing:border-box;z-index:2}
.fv-video-software-loading[hidden]{display:none}
.fv-video-software-badge{position:absolute;top:12px;right:12px;padding:4px 8px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(2,6,12,.68);color:#e2e8f0;font-size:11px;font-weight:700;z-index:1}
.fv-video-software-controls{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:40px auto minmax(80px,1fr) auto 40px 40px;gap:8px;align-items:center;padding:28px 12px 10px;background:linear-gradient(transparent,rgba(2,6,12,.9));box-sizing:border-box;z-index:1}
.fv-video-software-button{width:36px;height:32px;padding:0;border:0;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font:700 15px/1 system-ui;cursor:pointer}
.fv-video-software-button:hover,.fv-video-software-button:focus-visible{background:rgba(255,255,255,.2);outline:2px solid rgba(45,212,191,.8);outline-offset:1px}
.fv-video-software-time{min-width:42px;color:#f8fafc;font-size:12px;font-variant-numeric:tabular-nums;text-align:center}
.fv-video-software-seek{width:100%;accent-color:#14b8a6;cursor:pointer}
.fv-video-compatibility{min-height:320px;display:flex;align-items:center;justify-content:center;padding:32px;background:linear-gradient(135deg,rgba(245,158,11,.12),transparent 46%),#f8fafc;box-sizing:border-box}
.fv-video-compatibility-card{width:min(100%,620px);padding:24px;border:1px solid rgba(217,119,6,.24);border-radius:8px;background:#fff7ed;color:#7c2d12;box-sizing:border-box}
.fv-video-compatibility-card span{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#ffedd5;color:#9a3412;font-size:12px;font-weight:800}
.fv-video-compatibility-card strong{display:block;margin-top:12px;color:#7c2d12;font-size:20px;line-height:1.3}
.fv-video-compatibility-card p{margin:9px 0 0;color:#9a3412;font-size:14px;line-height:1.7}
.fv-video-compatibility-card code{display:inline-block;margin-top:14px;padding:5px 8px;border-radius:6px;background:rgba(124,45,18,.08);color:#7c2d12;font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
[data-viewer-theme='dark'] .fv-video-viewer{background:#101820;color:#e5eef8}
[data-viewer-theme='dark'] .fv-video-shell{border-color:rgba(148,163,184,.18);background:#111827;box-shadow:0 22px 56px rgba(0,0,0,.32)}
[data-viewer-theme='dark'] .fv-video-heading{border-color:rgba(148,163,184,.18)}
[data-viewer-theme='dark'] .fv-video-heading strong{color:#f8fafc}
[data-viewer-theme='dark'] .fv-video-hint{color:#94a3b8}
[data-viewer-theme='dark'] .fv-video-compatibility{background:linear-gradient(135deg,rgba(251,146,60,.13),transparent 46%),#0f172a}
[data-viewer-theme='dark'] .fv-video-compatibility-card{border-color:rgba(251,146,60,.3);background:#28170f;color:#fed7aa}
[data-viewer-theme='dark'] .fv-video-compatibility-card span{background:#431d0b;color:#fdba74}
[data-viewer-theme='dark'] .fv-video-compatibility-card strong,[data-viewer-theme='dark'] .fv-video-compatibility-card p,[data-viewer-theme='dark'] .fv-video-compatibility-card code{color:#fed7aa}
[data-viewer-theme='dark'] .fv-video-compatibility-card code{background:rgba(251,146,60,.12)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .fv-video-viewer{background:#101820;color:#e5eef8}[data-viewer-theme='system'] .fv-video-shell{border-color:rgba(148,163,184,.18);background:#111827;box-shadow:0 22px 56px rgba(0,0,0,.32)}[data-viewer-theme='system'] .fv-video-heading{border-color:rgba(148,163,184,.18)}[data-viewer-theme='system'] .fv-video-heading strong{color:#f8fafc}[data-viewer-theme='system'] .fv-video-hint{color:#94a3b8}[data-viewer-theme='system'] .fv-video-compatibility{background:linear-gradient(135deg,rgba(251,146,60,.13),transparent 46%),#0f172a}[data-viewer-theme='system'] .fv-video-compatibility-card{border-color:rgba(251,146,60,.3);background:#28170f;color:#fed7aa}[data-viewer-theme='system'] .fv-video-compatibility-card span{background:#431d0b;color:#fdba74}[data-viewer-theme='system'] .fv-video-compatibility-card strong,[data-viewer-theme='system'] .fv-video-compatibility-card p,[data-viewer-theme='system'] .fv-video-compatibility-card code{color:#fed7aa}[data-viewer-theme='system'] .fv-video-compatibility-card code{background:rgba(251,146,60,.12)}}
@media (max-width:640px){.fv-video-viewer{padding:10px}.fv-video-software-controls{grid-template-columns:36px minmax(72px,1fr) 36px 36px}.fv-video-software-time{display:none}.fv-video-software-badge{top:8px;right:8px}}
`

const VIDEO_MIME_MAP: Record<string, string> = {
  m3u8: 'application/vnd.apple.mpegurl',
  mp4: 'video/mp4',
  webm: 'video/webm'
}

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

const createStyle = () => {
  const style = document.createElement('style')
  style.textContent = videoStyle
  return style
}

const createRenderedInstance = (
  target: HTMLDivElement,
  cleanup: () => void
): FileViewerRenderedInstance => ({
  $el: target,
  unmount() {
    cleanup()
    target.replaceChildren()
  }
})

const getMimeType = (type: string) => {
  return VIDEO_MIME_MAP[type] || 'video/*'
}

const createLocalUrl = (buffer: ArrayBuffer, type: string) => {
  return URL.createObjectURL(new Blob([buffer], { type: getMimeType(type) }))
}

class UnsupportedVideoCodecError extends Error {
  readonly track: Mp4VideoTrackInfo

  constructor(track: Mp4VideoTrackInfo) {
    super(`The browser could not decode the ${track.label} video track.`)
    this.name = 'UnsupportedVideoCodecError'
    this.track = track
  }
}

const createCompatibilityNotice = (
  track: Mp4VideoTrackInfo,
  t: ReturnType<typeof createFileViewerTranslator>
) => {
  const notice = createElement('div', 'fv-video-compatibility')
  notice.setAttribute('role', 'alert')
  notice.dataset.codec = track.codec

  const card = createElement('div', 'fv-video-compatibility-card')
  card.append(
    createElement('span', '', t('media.video.codecUnsupportedBadge')),
    createElement('strong', '', t('media.video.codecUnsupportedTitle')),
    createElement(
      'p',
      '',
      t('media.video.codecUnsupportedDescription', { codec: track.label })
    ),
    createElement('code', '', track.contentType),
    createElement('p', '', t('media.video.codecUnsupportedAction'))
  )
  notice.append(card)
  return notice
}

/**
 * Pure TypeScript video renderer.
 *
 * MP4/WebM use the native `<video>` element. HLS uses native browser support
 * first and imports `hls.js` only when the current browser needs it.
 */
export default async function renderVideo(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) {
  const t = createFileViewerTranslator(context?.options)
  const normalizedType = (type || 'mp4').toLowerCase()
  const mp4VideoTrack = normalizedType === 'mp4'
    ? inspectMp4VideoTrack(buffer)
    : undefined
  const mp4vSoftwareTrack = mp4VideoTrack?.codec === 'mp4v'
    ? extractMp4vSoftwareTrack(buffer)
    : undefined
  let disposed = false
  let objectUrl = ''
  let hls: Hls | null = null
  let softwarePlayer: Mp4vSoftwarePlayerInstance | null = null

  const root = createElement('div', 'fv-video-viewer')
  const shell = createElement('section', 'fv-video-shell')
  const heading = createElement('div', 'fv-video-heading')
  heading.append(
    createElement('span', '', normalizedType.toUpperCase() || 'VIDEO'),
    createElement('strong', '', t('media.video.title'))
  )

  const video = createElement('video', 'fv-video-player')
  video.controls = true
  video.preload = 'metadata'
  video.textContent = t('media.video.unsupported')
  shell.append(heading, video)

  if (normalizedType === 'm3u8') {
    shell.append(createElement(
      'p',
      'fv-video-hint',
      t('media.video.hlsHint')
    ))
  }

  root.append(shell)
  target.replaceChildren(createStyle(), root)

  const resolveSource = () => {
    if (normalizedType === 'm3u8' && context?.url) {
      return context.url
    }
    objectUrl = createLocalUrl(buffer, normalizedType)
    return objectUrl
  }

  const mountVideo = async () => {
    const source = resolveSource()
    if (normalizedType === 'm3u8') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source
        video.load()
        await waitForVideoMetadata(video, context?.signal)
        return
      }
      const loadHls = getFileViewerHlsLoader()
      if (!loadHls) {
        throw new Error('HLS fallback support is opt-in. Run `npx file-viewer-cli add streaming-media --write`, then `npx file-viewer-cli install --yes`.')
      }
      const { default: HlsConstructor } = await loadHls()
      if (disposed) {
        return
      }
      if (HlsConstructor.isSupported()) {
        hls = new HlsConstructor({ enableWorker: true, lowLatencyMode: false })
        if (context?.signal?.aborted) {
          throw new DOMException('The video request was aborted.', 'AbortError')
        }
        await new Promise<void>((resolve, reject) => {
          const events = HlsConstructor.Events
          const timeoutId = window.setTimeout(() => {
            cleanupListeners()
            reject(new Error('Timed out while loading the HLS manifest.'))
          }, 30000)
          const onManifest = () => {
            cleanupListeners()
            resolve()
          }
          const onError = (_event: string, data: { fatal?: boolean; details?: string }) => {
            if (!data?.fatal) return
            cleanupListeners()
            reject(new Error(data.details || 'Unable to load the HLS video stream.'))
          }
          const onAbort = () => {
            cleanupListeners()
            reject(new DOMException('The video request was aborted.', 'AbortError'))
          }
          const cleanupListeners = () => {
            window.clearTimeout(timeoutId)
            hls?.off(events.MANIFEST_PARSED, onManifest)
            hls?.off(events.ERROR, onError)
            context?.signal?.removeEventListener('abort', onAbort)
          }
          hls?.on(events.MANIFEST_PARSED, onManifest)
          hls?.on(events.ERROR, onError)
          context?.signal?.addEventListener('abort', onAbort, { once: true })
          hls?.attachMedia(video)
          hls?.loadSource(source)
        })
        await waitForVideoMetadata(video, context?.signal)
        return
      }
      throw new Error('This browser cannot play HLS video.')
    }
    video.src = source
    video.load()
    await waitForVideoMetadata(video, context?.signal)
    if (mp4VideoTrack) {
      await ensureVideoTrackDecoded(video, mp4VideoTrack, context?.signal)
    }
  }

  const releasePlaybackResources = () => {
    hls?.destroy()
    hls = null
    video.pause()
    video.removeAttribute('src')
    video.load()
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = ''
    }
  }

  const cleanup = () => {
    disposed = true
    softwarePlayer?.cleanup()
    softwarePlayer = null
    releasePlaybackResources()
  }

  try {
    await mountVideo()
    root.dataset.videoState = 'ready'
  } catch (error) {
    if (error instanceof UnsupportedVideoCodecError) {
      if (error.track.codec === 'mp4v' && mp4vSoftwareTrack) {
        try {
          softwarePlayer = await mountMp4vSoftwarePlayer(
            buffer,
            video,
            mp4vSoftwareTrack,
            context
          )
          root.dataset.videoState = 'software-decoder'
        } catch (softwareError) {
          releasePlaybackResources()
          root.dataset.videoState = 'unsupported-codec'
          root.dataset.videoError = softwareError instanceof Error
            ? softwareError.message
            : String(softwareError)
          const failedPlayer = shell.querySelector('.fv-video-software-player')
          const failedElement = failedPlayer || video
          failedElement.replaceWith(createCompatibilityNotice(error.track, t))
        }
      } else {
        releasePlaybackResources()
        root.dataset.videoState = 'unsupported-codec'
        video.replaceWith(createCompatibilityNotice(error.track, t))
      }
    } else {
      cleanup()
      target.replaceChildren()
      throw error
    }
  }

  return createRenderedInstance(target, () => {
    cleanup()
  })
}

const ensureVideoTrackDecoded = async (
  video: HTMLVideoElement,
  track: Mp4VideoTrackInfo,
  signal?: AbortSignal
) => {
  if (video.videoWidth > 0 && video.videoHeight > 0) return
  if (!video.canPlayType(track.contentType)) {
    throw new UnsupportedVideoCodecError(track)
  }
  if (signal?.aborted) throw new DOMException('The video request was aborted.', 'AbortError')

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new UnsupportedVideoCodecError(track))
    }, 1500)
    const cleanup = () => {
      window.clearTimeout(timeoutId)
      video.removeEventListener('resize', onReady)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }
    const onReady = () => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(video.error || new UnsupportedVideoCodecError(track))
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('The video request was aborted.', 'AbortError'))
    }
    video.addEventListener('resize', onReady)
    video.addEventListener('loadeddata', onReady)
    video.addEventListener('error', onError, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

const waitForVideoMetadata = async (video: HTMLVideoElement, signal?: AbortSignal) => {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return
  if (signal?.aborted) throw new DOMException('The video request was aborted.', 'AbortError')
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out while loading video metadata.'))
    }, 30000)
    const cleanup = () => {
      window.clearTimeout(timeoutId)
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('canplay', onReady)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }
    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(video.error?.message || 'The browser could not decode this video.'))
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('The video request was aborted.', 'AbortError'))
    }
    video.addEventListener('loadedmetadata', onReady, { once: true })
    video.addEventListener('canplay', onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
