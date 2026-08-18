import {
  createFileViewerTranslator,
  type FileRenderContext
} from '@file-viewer/core'
import type { Mp4vSoftwareTrack } from './mp4.js'

interface Mp4vWorkerReady {
  type: 'ready'
  width: number
  height: number
  duration: number
  frames: number
}

interface Mp4vWorkerFrame {
  type: 'frame'
  index: number
  time: number
  decodeMs: number
}

interface Mp4vWorkerError {
  type: 'error'
  message: string
}

type Mp4vWorkerResponse = Mp4vWorkerReady | Mp4vWorkerFrame | Mp4vWorkerError

export interface Mp4vSoftwarePlayerInstance {
  cleanup(): void
}

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className?: string,
  text?: string
) => {
  const element = document.createElement(tagName)
  if (className) element.className = className
  if (typeof text === 'string') element.textContent = text
  return element
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const wholeSeconds = Math.floor(seconds)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const rest = wholeSeconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const mountMp4vSoftwarePlayer = async (
  buffer: ArrayBuffer,
  video: HTMLVideoElement,
  track: Mp4vSoftwareTrack,
  context?: FileRenderContext
): Promise<Mp4vSoftwarePlayerInstance> => {
  if (typeof Worker === 'undefined') throw new Error('Web Worker is unavailable.')
  if (typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== 'function') {
    throw new Error('OffscreenCanvas is unavailable.')
  }

  const t = createFileViewerTranslator(context?.options)
  const player = createElement('div', 'fv-video-software-player')
  player.tabIndex = 0
  player.dataset.state = 'loading'
  player.style.aspectRatio = `${track.width} / ${track.height}`

  const canvas = createElement('canvas', 'fv-video-software-canvas')
  canvas.width = track.width
  canvas.height = track.height
  const loading = createElement(
    'div',
    'fv-video-software-loading',
    t('media.video.softwareLoading')
  )
  loading.setAttribute('role', 'status')

  const badge = createElement('span', 'fv-video-software-badge', t('media.video.softwareBadge'))
  const controls = createElement('div', 'fv-video-software-controls')
  const playButton = createElement('button', 'fv-video-software-button', '▶')
  playButton.type = 'button'
  playButton.setAttribute('aria-label', t('media.video.play'))
  const currentTime = createElement('span', 'fv-video-software-time', '00:00')
  const seek = createElement('input', 'fv-video-software-seek')
  seek.type = 'range'
  seek.min = '0'
  seek.max = String(track.duration / track.timescale)
  seek.step = '0.01'
  seek.value = '0'
  seek.setAttribute('aria-label', t('media.video.seek'))
  const duration = createElement(
    'span',
    'fv-video-software-time',
    formatTime(track.duration / track.timescale)
  )
  const volumeButton = createElement('button', 'fv-video-software-button', '🔊')
  volumeButton.type = 'button'
  volumeButton.setAttribute('aria-label', t('media.video.mute'))
  const fullscreenButton = createElement('button', 'fv-video-software-button', '⛶')
  fullscreenButton.type = 'button'
  fullscreenButton.setAttribute('aria-label', t('media.video.fullscreen'))
  controls.append(playButton, currentTime, seek, duration, volumeButton, fullscreenButton)

  video.controls = false
  video.className = 'fv-video-audio-clock'
  video.replaceWith(player)
  player.append(canvas, loading, badge, controls, video)

  const worker = new Worker(new URL('./mp4v.worker.js', import.meta.url), {
    type: 'module',
    name: 'file-viewer-mp4v-decoder'
  })
  let disposed = false
  let ready = false
  let rejectReady: ((error: Error) => void) | undefined
  let resolveReady: (() => void) | undefined
  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  const sendClock = (type: 'play' | 'pause' | 'seek' | 'sync') => {
    if (disposed || !ready) return
    worker.postMessage({ type, time: video.currentTime || 0 })
  }

  const syncControls = () => {
    const value = Number.isFinite(video.currentTime) ? video.currentTime : 0
    currentTime.textContent = formatTime(value)
    seek.value = String(value)
    playButton.textContent = video.paused ? '▶' : '❚❚'
    playButton.setAttribute('aria-label', t(video.paused ? 'media.video.play' : 'media.video.pause'))
    volumeButton.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊'
    volumeButton.setAttribute(
      'aria-label',
      t(video.muted || video.volume === 0 ? 'media.video.unmute' : 'media.video.mute')
    )
  }

  const onPlay = () => {
    syncControls()
    sendClock('play')
  }
  const onPause = () => {
    syncControls()
    sendClock('pause')
  }
  const onSeeking = () => {
    syncControls()
    sendClock('seek')
  }
  const onTimeUpdate = () => {
    syncControls()
    sendClock('sync')
  }
  const onVolumeChange = () => syncControls()
  const onAbort = () => cleanup()
  const togglePlayback = () => {
    if (video.paused) {
      void video.play().catch((error) => {
        player.dataset.state = 'error'
        loading.textContent = error instanceof Error ? error.message : String(error)
      })
    } else {
      video.pause()
    }
  }
  const onSeekInput = () => {
    video.currentTime = Number(seek.value)
    onSeeking()
  }
  const onVolumeClick = () => {
    video.muted = !video.muted
  }
  const onFullscreenClick = () => {
    if (document.fullscreenElement === player) {
      void document.exitFullscreen()
    } else {
      void player.requestFullscreen()
    }
  }
  const onPlayerKeydown = (event: KeyboardEvent) => {
    if (event.target === seek) return
    if (event.key === ' ' || event.key === 'k') {
      event.preventDefault()
      togglePlayback()
    } else if (event.key === 'ArrowLeft') {
      video.currentTime = Math.max(0, video.currentTime - 5)
    } else if (event.key === 'ArrowRight') {
      video.currentTime = Math.min(Number(seek.max), video.currentTime + 5)
    }
  }

  const cleanup = () => {
    if (disposed) return
    disposed = true
    video.pause()
    worker.postMessage({ type: 'dispose' })
    worker.terminate()
    video.removeEventListener('play', onPlay)
    video.removeEventListener('pause', onPause)
    video.removeEventListener('ended', onPause)
    video.removeEventListener('seeking', onSeeking)
    video.removeEventListener('timeupdate', onTimeUpdate)
    video.removeEventListener('volumechange', onVolumeChange)
    playButton.removeEventListener('click', togglePlayback)
    canvas.removeEventListener('click', togglePlayback)
    seek.removeEventListener('input', onSeekInput)
    volumeButton.removeEventListener('click', onVolumeClick)
    fullscreenButton.removeEventListener('click', onFullscreenClick)
    player.removeEventListener('keydown', onPlayerKeydown)
    context?.signal?.removeEventListener('abort', onAbort)
  }

  worker.onmessage = (event: MessageEvent<Mp4vWorkerResponse>) => {
    const message = event.data
    if (message.type === 'ready') {
      ready = true
      player.dataset.state = 'ready'
      loading.hidden = true
      seek.max = String(Math.max(message.duration, video.duration || 0))
      duration.textContent = formatTime(Number(seek.max))
      syncControls()
      resolveReady?.()
      return
    }
    if (message.type === 'frame') {
      player.dataset.frame = String(message.index)
      player.dataset.frameTime = String(message.time)
      player.dataset.decodeMs = String(message.decodeMs)
      return
    }
    const error = new Error(message.message)
    player.dataset.state = 'error'
    loading.hidden = false
    loading.textContent = message.message
    if (!ready) rejectReady?.(error)
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || 'The MP4V decoder Worker failed.')
    player.dataset.state = 'error'
    loading.hidden = false
    loading.textContent = error.message
    if (!ready) rejectReady?.(error)
  }

  video.addEventListener('play', onPlay)
  video.addEventListener('pause', onPause)
  video.addEventListener('ended', onPause)
  video.addEventListener('seeking', onSeeking)
  video.addEventListener('timeupdate', onTimeUpdate)
  video.addEventListener('volumechange', onVolumeChange)
  playButton.addEventListener('click', togglePlayback)
  canvas.addEventListener('click', togglePlayback)
  seek.addEventListener('input', onSeekInput)
  volumeButton.addEventListener('click', onVolumeClick)
  fullscreenButton.addEventListener('click', onFullscreenClick)
  player.addEventListener('keydown', onPlayerKeydown)
  context?.signal?.addEventListener('abort', onAbort, { once: true })
  syncControls()

  const offscreen = canvas.transferControlToOffscreen()
  worker.postMessage({ type: 'init', buffer, canvas: offscreen }, [buffer, offscreen])
  try {
    await readyPromise
  } catch (error) {
    cleanup()
    throw error
  }
  return { cleanup }
}
