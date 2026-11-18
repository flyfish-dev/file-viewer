import type { FileRenderContext, FileViewerRenderedInstance } from '../../contracts/types'

export interface FileViewerPdfSignatureDictionary {
  id: string
  contents?: Uint8Array
  byteRange?: number[]
  revisionEnd?: number
  fields: Readonly<Record<string, string | number | boolean | undefined>>
  warnings: string[]
}

export interface FileViewerDocumentInspectionRequest {
  /** Copied before the preview runs, so font repair and Worker transfer cannot alter it. */
  originalBytes: Uint8Array
  target: HTMLElement
  type: string
  context?: FileRenderContext
  signal: AbortSignal
  readPdfSignatures?: (bytes: Uint8Array, signal: AbortSignal) => Promise<{
    signatures: FileViewerPdfSignatureDictionary[]
    warnings: string[]
  }>
}

export type FileViewerDocumentInspector = (request: FileViewerDocumentInspectionRequest) => Promise<{ dispose(): void } | null>
// Independently bundled Full renderer scripts share the same optional capability
// registration without importing each other's parsers or framework runtimes.
interface InspectionRegistry {
  inspectors: Map<string, FileViewerDocumentInspector>
  pdfReader?: FileViewerDocumentInspectionRequest['readPdfSignatures']
  inspectorRegistrations?: Map<string, Array<Registration<FileViewerDocumentInspector>>>
  pdfReaderRegistrations?: Array<Registration<NonNullable<FileViewerDocumentInspectionRequest['readPdfSignatures']>>>
}
interface Registration<T> { value: T; active: boolean }
const registryKey = Symbol.for('file-viewer.document-inspection.v1')
const host = globalThis as unknown as Record<symbol, InspectionRegistry | undefined>
const registry: InspectionRegistry = host[registryKey] || (host[registryKey] = { inspectors: new Map() })
const inspectors = registry.inspectors
// Tokens belong to the shared registry, rather than one module instance. An
// unsubscribe must never restore an earlier registration already unsubscribed
// through another independently bundled copy of Core.
const registrations = registry.inspectorRegistrations ||= new Map([...inspectors].map(([id, value]) => [id, [{ value, active: true }]]))
registry.pdfReaderRegistrations ||= registry.pdfReader ? [{ value: registry.pdfReader, active: true }] : []

/** The PDF package's explicit optional entry supplies its own existing parser peer. */
export const registerFileViewerPdfSignatureReader = (reader: NonNullable<FileViewerDocumentInspectionRequest['readPdfSignatures']>) => {
  const token = { value: reader, active: true }
  registry.pdfReaderRegistrations!.push(token)
  registry.pdfReader = reader
  return () => {
    if (!token.active) return
    token.active = false
    const active = registry.pdfReaderRegistrations!.filter(entry => entry.active)
    registry.pdfReaderRegistrations = active
    registry.pdfReader = active[active.length - 1]?.value
  }
}

/** Optional capabilities register here; Core imports no signature, XML or PDF parser. */
export const registerFileViewerDocumentInspector = (id: string, inspect: FileViewerDocumentInspector) => {
  const token = { value: inspect, active: true }
  registrations.set(id, [...(registrations.get(id) || []), token])
  inspectors.set(id, inspect)
  return () => {
    if (!token.active) return
    token.active = false
    const active = (registrations.get(id) || []).filter(entry => entry.active)
    if (active.length) {
      registrations.set(id, active)
      inspectors.set(id, active[active.length - 1]!.value)
    } else { registrations.delete(id); inspectors.delete(id) }
  }
}

export const renderWithFileViewerDocumentInspection = async (
  buffer: ArrayBuffer,
  target: HTMLElement,
  type: string,
  context: FileRenderContext | undefined,
  render: () => FileViewerRenderedInstance | Promise<FileViewerRenderedInstance>,
  readPdfSignatures?: FileViewerDocumentInspectionRequest['readPdfSignatures']
): Promise<FileViewerRenderedInstance> => {
  const selected = [...inspectors.values()]
  if (!selected.length || context?.options?.signature?.documentInspection === false) return render()
  // Inspection is bounded by the capability; avoid copying oversized or unavailable sources.
  let originalBytes = buffer.byteLength > 0 && buffer.byteLength <= 64 * 1024 * 1024
    ? new Uint8Array(buffer.slice(0)) : new Uint8Array()
  // A caller-owned File/Blob is an original source, unlike a URL re-fetch or
  // PDF.js getData() after preview repair. Never acquire a new network source.
  const sourceFile = context?.sourceFile
  if (!originalBytes.length && !buffer.byteLength && sourceFile?.size && sourceFile.size <= 64 * 1024 * 1024 && !context?.signal?.aborted) {
    try {
      const source = await sourceFile.arrayBuffer()
      if (!context?.signal?.aborted && source.byteLength <= 64 * 1024 * 1024) originalBytes = new Uint8Array(source.slice(0))
    } catch { /* The optional inspector reports unavailable; preview keeps its own source. */ }
  }
  const rendered = await render()
  const controller = new AbortController()
  const abort = () => controller.abort()
  context?.signal?.addEventListener('abort', abort, { once: true })
  if (context?.signal?.aborted) abort()
  let disposed = false
  const attachments: Array<{ dispose(): void }> = []
  void (async () => { try {
    for (const inspect of selected) {
      if (controller.signal.aborted) return
      try {
        const result = await inspect({ originalBytes, target, type, context, signal: controller.signal, readPdfSignatures: readPdfSignatures || registry.pdfReader })
        if (result) {
          if (disposed) result.dispose()
          else attachments.push(result)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          try { context?.options?.onDiagnostic?.({ code: 'document-inspection-unavailable', level: 'warning', message: error instanceof Error ? error.message : 'Document inspection is unavailable.' }) } catch { /* Preview remains available. */ }
        }
      }
    }
  } finally { originalBytes = new Uint8Array() }
  })()
  const dispose = async () => {
    if (disposed) return
    disposed = true
    controller.abort()
    context?.signal?.removeEventListener('abort', abort)
    originalBytes = new Uint8Array()
    try {
      let failure: unknown
      for (const attachment of attachments.splice(0)) {
        try { attachment.dispose() } catch (error) { failure ||= error }
      }
      if (failure) throw failure
    }
    finally {
      if ('unmount' in rendered) await rendered.unmount()
      else if ('$destroy' in rendered) await rendered.$destroy()
      else if ('destroy' in rendered) await rendered.destroy()
    }
  }
  return { ...rendered, unmount: dispose,
    ...('$destroy' in rendered ? { $destroy: dispose } : {}),
    ...('destroy' in rendered ? { destroy: dispose } : {}) }
}
