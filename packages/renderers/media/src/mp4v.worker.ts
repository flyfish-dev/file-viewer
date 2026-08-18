import { extractMp4vSoftwareTrack, type Mp4VideoSample, type Mp4vSoftwareTrack } from './mp4.js'
import createDecoderModule, {
  type Mp4vDecoderModule
} from './vendor/mp4v/mp4v-decoder.mjs'

interface InitMessage {
  type: 'init'
  buffer: ArrayBuffer
  canvas: OffscreenCanvas
}

interface ClockMessage {
  type: 'play' | 'pause' | 'seek' | 'sync'
  time: number
}

interface DisposeMessage {
  type: 'dispose'
}

type Mp4vWorkerMessage = InitMessage | ClockMessage | DisposeMessage

type WorkerResponse =
  | { type: 'ready'; width: number; height: number; duration: number; frames: number }
  | { type: 'frame'; index: number; time: number; decodeMs: number }
  | { type: 'error'; message: string }

interface WorkerScope {
  onmessage: ((event: MessageEvent<Mp4vWorkerMessage>) => void) | null
  postMessage(message: WorkerResponse): void
  close(): void
}

const scope = self as unknown as WorkerScope
let sourceBuffer: ArrayBuffer | undefined
let track: Mp4vSoftwareTrack | undefined
let canvasContext: OffscreenCanvasRenderingContext2D | null = null
let module: Mp4vDecoderModule | undefined
let decoder = 0
let packetPointer = 0
let packetCapacity = 0
let decodedIndex = -1
let playing = false
let clockMediaTime = 0
let clockStartedAt = 0
let scheduleId: ReturnType<typeof setTimeout> | undefined
let disposed = false

const getSampleTime = (sample: Mp4VideoSample) => (
  track ? sample.cts / track.timescale : 0
)

const findTargetSample = (time: number) => {
  if (!track?.samples.length) return -1
  const target = Math.max(0, time) * track.timescale
  let low = 0
  let high = track.samples.length - 1
  let result = 0
  while (low <= high) {
    const middle = (low + high) >> 1
    if (track.samples[middle].cts <= target) {
      result = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return result
}

const findSyncSample = (target: number) => {
  if (!track) return 0
  for (let index = Math.min(target, track.samples.length - 1); index > 0; index -= 1) {
    if (track.samples[index].isSync) return index
  }
  return 0
}

const resetDecoder = (target: number) => {
  if (!module || !decoder || !module._mp4v_reset(decoder)) {
    throw new Error('Unable to reset the MP4V software decoder.')
  }
  decodedIndex = findSyncSample(target) - 1
}

const drawDecodedFrame = (sample: Mp4VideoSample) => {
  if (!module || !decoder || !canvasContext) return
  const output = module._mp4v_output(decoder)
  const width = module._mp4v_width(decoder)
  const height = module._mp4v_height(decoder)
  const bufferWidth = module._mp4v_buffer_width(decoder)
  const bufferHeight = module._mp4v_buffer_height(decoder)
  if (!output || !width || !height || !bufferWidth || !bufferHeight) {
    throw new Error('The MP4V decoder returned an empty video frame.')
  }

  const ySize = bufferWidth * bufferHeight
  const frameSize = ySize * 3 / 2
  const frame = new VideoFrame(
    module.HEAPU8.subarray(output, output + frameSize),
    {
      format: 'I420',
      codedWidth: bufferWidth,
      codedHeight: bufferHeight,
      visibleRect: { x: 0, y: 0, width, height },
      displayWidth: width,
      displayHeight: height,
      timestamp: Math.round(getSampleTime(sample) * 1_000_000),
      layout: [
        { offset: 0, stride: bufferWidth },
        { offset: ySize, stride: bufferWidth / 2 },
        { offset: ySize * 5 / 4, stride: bufferWidth / 2 }
      ]
    }
  )
  canvasContext.drawImage(frame, 0, 0, width, height)
  frame.close()
}

const decodeTo = (target: number) => {
  if (!track || !module || !decoder || !sourceBuffer || target < 0) return
  if (target < decodedIndex || target - decodedIndex > 240) resetDecoder(target)
  const startedAt = performance.now()
  for (let index = decodedIndex + 1; index <= target; index += 1) {
    const sample = track.samples[index]
    module.HEAPU8.set(
      new Uint8Array(sourceBuffer, sample.offset, sample.size),
      packetPointer
    )
    if (!module._mp4v_decode(decoder, packetPointer, sample.size, sample.dts)) {
      throw new Error(`MP4V frame ${index + 1} could not be decoded.`)
    }
    decodedIndex = index
  }
  const sample = track.samples[decodedIndex]
  drawDecodedFrame(sample)
  scope.postMessage({
    type: 'frame',
    index: decodedIndex,
    time: getSampleTime(sample),
    decodeMs: Math.round((performance.now() - startedAt) * 10) / 10
  })
}

const stopScheduler = () => {
  if (scheduleId !== undefined) clearTimeout(scheduleId)
  scheduleId = undefined
}

const getClockTime = () => (
  playing ? clockMediaTime + (performance.now() - clockStartedAt) / 1000 : clockMediaTime
)

const schedulePlayback = () => {
  stopScheduler()
  if (!playing || !track || disposed) return
  const time = getClockTime()
  const target = findTargetSample(time)
  decodeTo(target)
  const next = track.samples[Math.min(target + 1, track.samples.length - 1)]
  const delay = Math.max(4, Math.min(50, (getSampleTime(next) - getClockTime()) * 1000))
  scheduleId = setTimeout(schedulePlayback, delay)
}

const updateClock = (time: number, shouldPlay: boolean) => {
  clockMediaTime = Math.max(0, time)
  clockStartedAt = performance.now()
  playing = shouldPlay
}

const initialize = async (message: InitMessage) => {
  if (typeof VideoFrame === 'undefined') {
    throw new Error('This browser does not expose raw VideoFrame rendering.')
  }
  sourceBuffer = message.buffer
  track = extractMp4vSoftwareTrack(sourceBuffer)
  if (!track) throw new Error('The MP4V track could not be extracted from this MP4 file.')
  message.canvas.width = track.width
  message.canvas.height = track.height
  canvasContext = message.canvas.getContext('2d', { alpha: false, desynchronized: true })
  if (!canvasContext) throw new Error('OffscreenCanvas 2D rendering is unavailable.')

  module = await createDecoderModule()
  const configPointer = module._malloc(track.decoderConfig.length)
  if (!configPointer) throw new Error('The MP4V decoder could not allocate its configuration.')
  try {
    module.HEAPU8.set(track.decoderConfig, configPointer)
    decoder = module._mp4v_create(
      configPointer,
      track.decoderConfig.length,
      track.width,
      track.height
    )
  } finally {
    module._free(configPointer)
  }
  if (!decoder) throw new Error('The Apache-2.0 MP4V decoder rejected this stream.')
  packetCapacity = track.samples.reduce(
    (maximum, sample) => Math.max(maximum, sample.size),
    0
  )
  packetPointer = module._malloc(packetCapacity)
  if (!packetPointer) throw new Error('The MP4V decoder could not allocate its packet buffer.')
  decodeTo(0)
  scope.postMessage({
    type: 'ready',
    width: track.width,
    height: track.height,
    duration: track.duration / track.timescale,
    frames: track.samples.length
  })
}

const dispose = () => {
  if (disposed) return
  disposed = true
  stopScheduler()
  if (module && packetPointer) module._free(packetPointer)
  if (module && decoder) module._mp4v_destroy(decoder)
  packetPointer = 0
  decoder = 0
  sourceBuffer = undefined
  track = undefined
  canvasContext = null
}

scope.onmessage = (event) => {
  const message = event.data
  Promise.resolve().then(async () => {
    if (message.type === 'init') {
      await initialize(message)
      return
    }
    if (message.type === 'dispose') {
      dispose()
      scope.close()
      return
    }
    if (!track) return
    if (message.type === 'play') {
      updateClock(message.time, true)
      schedulePlayback()
      return
    }
    if (message.type === 'pause') {
      updateClock(message.time, false)
      stopScheduler()
      decodeTo(findTargetSample(message.time))
      return
    }
    if (message.type === 'seek') {
      updateClock(message.time, playing)
      decodeTo(findTargetSample(message.time))
      if (playing) schedulePlayback()
      return
    }
    if (message.type === 'sync') {
      const drift = Math.abs(getClockTime() - message.time)
      updateClock(message.time, playing)
      if (!playing || drift > 0.08) decodeTo(findTargetSample(message.time))
      if (playing) schedulePlayback()
    }
  }).catch((error) => {
    scope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
    dispose()
  })
}
