import type { SignatureWorkerRequest, SignatureWorkerResponse } from '../workerProtocol.js'
import type {
  OpenPgpInspectionResult,
  OpenPgpVerificationResult,
  SignatureParseLimits
} from './types.js'

export const DEFAULT_SIGNATURE_PARSE_LIMITS: SignatureParseLimits = {
  maxInputBytes: 32 * 1024 * 1024,
  maxOutputBytes: 16 * 1024 * 1024,
  maxPacketCount: 4096,
  maxNestingDepth: 16,
  maxUserIds: 128,
  maxSubkeys: 128,
  maxSignatures: 256
}

const ABSOLUTE_SIGNATURE_PARSE_LIMITS: SignatureParseLimits = {
  maxInputBytes: 64 * 1024 * 1024,
  maxOutputBytes: 32 * 1024 * 1024,
  maxPacketCount: 8192,
  maxNestingDepth: 32,
  maxUserIds: 256,
  maxSubkeys: 256,
  maxSignatures: 512
}

let nextRequestId = 0

const boundedInteger = (value: unknown, fallback: number, ceiling: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? Math.min(value, ceiling)
    : fallback

export const normalizeSignatureParseLimits = (
  limits?: Partial<SignatureParseLimits>
): SignatureParseLimits => {
  const result = Object.fromEntries(
    Object.entries(DEFAULT_SIGNATURE_PARSE_LIMITS).map(([key, fallback]) => [
      key,
      boundedInteger(
        limits?.[key as keyof SignatureParseLimits],
        fallback,
        ABSOLUTE_SIGNATURE_PARSE_LIMITS[key as keyof SignatureParseLimits]
      )
    ])
  ) as unknown as SignatureParseLimits
  result.maxOutputBytes = Math.min(result.maxOutputBytes, result.maxInputBytes)
  return result
}

export class OpenPgpWorkerClient {
  private worker?: Worker
  private readonly pending = new Map<
    string,
    {
      resolve(value: OpenPgpInspectionResult | OpenPgpVerificationResult): void
      reject(reason?: unknown): void
      timer: ReturnType<typeof setTimeout>
    }
  >()

  constructor(private readonly workerFactory?: () => Worker) {}

  private ensureWorker() {
    if (this.worker) return this.worker
    if (typeof Worker === 'undefined') {
      throw new Error('OpenPGP inspection requires Web Worker support.')
    }
    const worker = this.workerFactory
      ? this.workerFactory()
      : new Worker(new URL('../signature.worker.js', import.meta.url), {
          type: 'module',
          name: 'file-viewer-signature-openpgp'
        })
    worker.addEventListener('message', (event: MessageEvent<SignatureWorkerResponse>) => {
      const pending = this.pending.get(event.data.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pending.delete(event.data.id)
      if (event.data.ok) pending.resolve(event.data.result)
      else
        pending.reject(
          Object.assign(new Error(event.data.error.message), { code: event.data.error.code })
        )
    })
    worker.addEventListener('error', (event) => {
      this.failWorker(new Error(event.message || 'Signature Worker failed.'))
    })
    worker.addEventListener('messageerror', () =>
      this.failWorker(new Error('Signature Worker returned an unreadable response.'))
    )
    this.worker = worker
    return worker
  }

  private failWorker(error: Error) {
    this.worker?.terminate()
    this.worker = undefined
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }

  private request<T extends OpenPgpInspectionResult | OpenPgpVerificationResult>(
    request: Record<string, unknown>,
    transfers: Transferable[]
  ): Promise<T> {
    if (this.pending.size >= 2)
      return Promise.reject(new Error('Signature Worker request limit exceeded.'))
    const worker = this.ensureWorker()
    const id = `signature-${++nextRequestId}`
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failWorker(new DOMException('Signature Worker request timed out.', 'TimeoutError'))
      }, 20_000)
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject, timer })
      try {
        worker.postMessage({ ...request, id } as SignatureWorkerRequest, transfers)
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error)
      }
    })
  }

  inspect(
    input: ArrayBuffer,
    limits?: Partial<SignatureParseLimits>,
    publicKeys: ArrayBuffer[] = []
  ) {
    const normalized = normalizeSignatureParseLimits(limits)
    if (input.byteLength === 0 || input.byteLength > normalized.maxInputBytes) {
      return Promise.reject(
        new Error(`OpenPGP input exceeds the ${normalized.maxInputBytes}-byte boundary.`)
      )
    }
    if (publicKeys.length > 64) {
      return Promise.reject(new Error('At most 64 OpenPGP verification keys may be supplied.'))
    }
    const keyBytes = publicKeys.reduce((sum, key) => sum + key.byteLength, 0)
    if (!Number.isSafeInteger(keyBytes) || keyBytes > normalized.maxInputBytes) {
      return Promise.reject(
        new Error(
          `OpenPGP public keys exceed the aggregate ${normalized.maxInputBytes}-byte boundary.`
        )
      )
    }
    const transferable = input.slice(0)
    const keyTransfers = publicKeys.map((key) => key.slice(0))
    return this.request<OpenPgpInspectionResult>(
      { type: 'inspect', input: transferable, publicKeys: keyTransfers, limits: normalized },
      [transferable, ...keyTransfers]
    )
  }

  classify(input: ArrayBuffer, limits?: Partial<SignatureParseLimits>) {
    const normalized = normalizeSignatureParseLimits(limits)
    if (input.byteLength === 0 || input.byteLength > normalized.maxInputBytes) {
      return Promise.reject(
        new Error(`OpenPGP input exceeds the ${normalized.maxInputBytes}-byte boundary.`)
      )
    }
    const transferable = input.slice(0)
    return this.request<OpenPgpInspectionResult>(
      { type: 'classify', input: transferable, limits: normalized },
      [transferable]
    )
  }

  verifyDetached(
    content: ArrayBuffer,
    signature: ArrayBuffer,
    publicKeys: ArrayBuffer[],
    limits?: Partial<SignatureParseLimits>
  ) {
    const normalized = normalizeSignatureParseLimits(limits)
    if (
      signature.byteLength === 0 ||
      signature.byteLength > normalized.maxInputBytes ||
      content.byteLength > normalized.maxInputBytes
    ) {
      return Promise.reject(
        new Error(
          `OpenPGP verification input exceeds the ${normalized.maxInputBytes}-byte boundary.`
        )
      )
    }
    if (publicKeys.length === 0 || publicKeys.length > 64) {
      return Promise.reject(
        new Error('OpenPGP verification requires between 1 and 64 public-key files.')
      )
    }
    const keyBytes = publicKeys.reduce((sum, key) => sum + key.byteLength, 0)
    if (!Number.isSafeInteger(keyBytes) || keyBytes > normalized.maxInputBytes) {
      return Promise.reject(
        new Error(
          `OpenPGP public keys exceed the aggregate ${normalized.maxInputBytes}-byte boundary.`
        )
      )
    }
    const contentTransfer = content.slice(0)
    const signatureTransfer = signature.slice(0)
    const keyTransfers = publicKeys.map((key) => key.slice(0))
    return this.request<OpenPgpVerificationResult>(
      {
        type: 'verify-detached',
        content: contentTransfer,
        signature: signatureTransfer,
        publicKeys: keyTransfers,
        limits: normalized
      },
      [contentTransfer, signatureTransfer, ...keyTransfers]
    )
  }

  dispose() {
    this.failWorker(new DOMException('Signature Worker was terminated.', 'AbortError'))
  }
}
