import { checkXmlAbort, XmlProfileError } from './xmlSafety.js'
import { limitXmlWasmMemory } from './xmlWasmMemory.js'

interface EngineModule {
  wasmMemory: WebAssembly.Memory
  _malloc(size: number): number
  _free(pointer: number): void
  cwrap(name: string, result: string, args: string[], options: { async: boolean }): (...args: number[]) => Promise<number>
}
declare const createXSLTTransformModule: (options: Record<string, unknown>) => Promise<EngineModule>
declare const Module: (options: Record<string, unknown>) => Promise<unknown>

interface XmlWorkerTask {
  xml: string
  resource: string
  wasm?: Uint8Array
  maxOutputBytes: number
}
interface XmlEngineResult {
  valid?: boolean
  html?: string
  message?: string
  error?: string
}

// This function is serialized into an isolated worker alongside the unmodified,
// pinned upstream factory. Keep it self-contained (no module-scope references).
function runXsltWorker() {
  const scope = globalThis as unknown as {
    onmessage: (event: MessageEvent<XmlWorkerTask>) => void
    postMessage: (result: XmlEngineResult) => void
    __fileViewerLimitXmlWasmMemory: typeof limitXmlWasmMemory
  }
  const NativeModule = WebAssembly.Module
  WebAssembly.Module = class extends NativeModule {
    constructor(bytes: BufferSource) {
      super(scope.__fileViewerLimitXmlWasmMemory(bytes))
      if (NativeModule.imports(this).some(entry => entry.kind === 'memory')) {
        throw new Error('Imported XML WASM memory is not supported.')
      }
    }
  }
  let networkAttempt = false
  const deny = () => { networkAttempt = true; throw new Error('External XML resources are disabled.') }
  Object.defineProperty(globalThis, 'fetch', { value: async () => deny(), writable: false, configurable: false })
  for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts']) {
    Object.defineProperty(globalThis, name, { value: deny, writable: false, configurable: false })
  }
  scope.onmessage = async ({ data }) => {
    let engine: EngineModule | undefined
    const pointers: number[] = []
    try {
      engine = await createXSLTTransformModule({ print: () => undefined, printErr: () => undefined })
      const encoder = new TextEncoder()
      const allocate = (bytes: Uint8Array) => {
        const pointer = engine!._malloc(bytes.length + 1)
        if (!pointer) throw new Error('XSLT memory allocation failed.')
        pointers.push(pointer)
        const heap = new Uint8Array(engine!.wasmMemory.buffer)
        heap.set(bytes, pointer)
        heap[pointer + bytes.length] = 0
        return pointer
      }
      const xml = encoder.encode(data.xml)
      const style = encoder.encode(data.resource)
      const xmlPointer = allocate(xml)
      const stylePointer = allocate(style)
      const urlPointer = allocate(encoder.encode('stylesheet.xsl'))
      const mimePointer = allocate(new Uint8Array(32))
      const transform = engine.cwrap('transform', 'number', Array(7).fill('number'), { async: true })
      const result = await transform(xmlPointer, xml.length, stylePointer, style.length, 0, urlPointer, mimePointer)
      if (!result) throw new Error('The XSLT engine could not transform this document.')
      pointers.push(result)
      if (networkAttempt) throw new Error('The XSLT engine attempted to read a blocked external resource.')
      const heap = new Uint8Array(engine.wasmMemory.buffer)
      let end = result
      const bound = Math.min(heap.length, result + data.maxOutputBytes + 1)
      while (end < bound && heap[end] !== 0) end++
      if (end === bound) throw new Error('XSLT output exceeds its byte limit.')
      const mime = new TextDecoder().decode(heap.subarray(mimePointer, mimePointer + 32)).split('\0')[0]
      // A fragment without xsl:output is commonly serialized as application/xml.
      // Both serializations are sanitized as inert HTML by the host, never executed.
      if (mime !== 'text/html' && mime !== 'application/xml') throw new Error('XSLT did not produce HTML-compatible output.')
      scope.postMessage({ html: new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(result, end)) })
    } catch (error) {
      scope.postMessage({ error: error instanceof Error ? error.message.slice(0, 1024) : 'XSLT engine failed.' })
    } finally {
      for (const pointer of pointers) engine?._free(pointer)
    }
  }
}

function runXsdWorker() {
  const scope = globalThis as unknown as {
    onmessage: (event: MessageEvent<XmlWorkerTask>) => void
    postMessage: (result: XmlEngineResult) => void
  }
  const deny = () => { throw new Error('External XML resources are disabled.') }
  Object.defineProperty(globalThis, 'fetch', { value: async () => deny(), writable: false, configurable: false })
  for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts']) {
    Object.defineProperty(globalThis, name, { value: deny, writable: false, configurable: false })
  }
  scope.onmessage = async ({ data }) => {
    let errors = ''
    try {
      // Reject corrupt binaries inside the owned worker before Emscripten starts
      // an asynchronous instantiation that may also reject outside its factory.
      // This validates structure, not trust, and does not execute the module.
      if (!data.wasm || !WebAssembly.validate(data.wasm as BufferSource)) {
        throw new Error('Invalid XML Schema WASM binary.')
      }
      await Module({
        inputFiles: [
          { fileName: 'input.xml', contents: data.xml },
          { fileName: 'schema.xsd', contents: data.resource }
        ],
        arguments: ['--nonet', '--noout', '--schema', 'schema.xsd', 'input.xml'],
        wasmBinary: data.wasm,
        wasmMemory: new WebAssembly.Memory({ initial: 256, maximum: 1024 }),
        print: () => undefined,
        printErr: (message: string) => { errors = (errors + message + '\n').slice(0, 8192) },
        onExit: (exitCode: number) => {
          if (![0, 3, 4].includes(exitCode)) scope.postMessage({ error: errors || 'XML Schema engine failed.' })
          else scope.postMessage({ valid: exitCode === 0, message: errors })
        },
        onAbort: () => scope.postMessage({ error: 'XML Schema engine exhausted its memory or aborted.' })
      })
    } catch (error) {
      scope.postMessage({ error: error instanceof Error ? error.message.slice(0, 1024) : 'XML Schema engine failed.' })
    }
  }
}

async function runWorker(source: string, bootstrap: () => void, task: XmlWorkerTask, signal: AbortSignal, module: boolean): Promise<XmlEngineResult> {
  checkXmlAbort(signal)
  if (typeof Worker === 'undefined') throw new XmlProfileError('engine-error', 'XML profiles require Web Workers.')
  const memoryGuard = module ? '' : `\n;globalThis.__fileViewerLimitXmlWasmMemory = (${limitXmlWasmMemory.toString()});\n`
  const blobUrl = URL.createObjectURL(new Blob([source, memoryGuard, '\n;(', bootstrap.toString(), ')();'], { type: 'text/javascript' }))
  let worker: Worker | undefined
  let abort: (() => void) | undefined
  try {
    worker = new Worker(blobUrl, { type: module ? 'module' : 'classic', name: module ? 'file-viewer-xsd' : 'file-viewer-xslt' })
    return await new Promise<XmlEngineResult>((resolve, reject) => {
      abort = () => {
        try { checkXmlAbort(signal) } catch (error) { reject(error) }
      }
      signal.addEventListener('abort', abort, { once: true })
      worker!.onmessage = ({ data }: MessageEvent<XmlEngineResult>) => {
        if (data?.error) reject(new XmlProfileError(module ? 'engine-error' : 'transform-error', data.error))
        else if (module ? typeof data?.valid === 'boolean' : typeof data?.html === 'string') resolve(data)
        else reject(new XmlProfileError('engine-error', 'Invalid XML worker response.'))
      }
      worker!.onerror = event => {
        event.preventDefault()
        reject(new XmlProfileError('engine-error', `XML worker failed to load or execute: ${event.message?.slice(0, 1024) || 'unknown worker error'}`))
      }
      worker!.onmessageerror = () => reject(new XmlProfileError('engine-error', 'Invalid XML worker message.'))
      checkXmlAbort(signal)
      worker!.postMessage(task)
    })
  } finally {
    if (abort) signal.removeEventListener('abort', abort)
    worker?.terminate()
    URL.revokeObjectURL(blobUrl)
  }
}

export function validateXmlWithWasm(source: string, wasm: Uint8Array, xml: string, schema: string, signal: AbortSignal) {
  return runWorker(source, runXsdWorker, { xml, resource: schema, wasm, maxOutputBytes: 0 }, signal, true)
}

export function transformXmlWithWasm(source: string, xml: string, stylesheet: string, maxOutputBytes: number, signal: AbortSignal) {
  return runWorker(source, runXsltWorker, { xml, resource: stylesheet, maxOutputBytes }, signal, false)
}
