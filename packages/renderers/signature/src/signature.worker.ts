/// <reference lib="webworker" />
import type { SignatureWorkerRequest, SignatureWorkerResponse } from './workerProtocol.js'
import type { OpenPgpInspectionResult } from './openpgp/types.js'

type RpgpWasmModule = {
  default(input?: {
    module_or_path?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module
  }): Promise<unknown>
  classify_openpgp(input: Uint8Array, limits: unknown): unknown
  inspect_openpgp(input: Uint8Array, publicKeys: Uint8Array[], limits: unknown): unknown
  verify_detached_signature(
    content: Uint8Array,
    signature: Uint8Array,
    publicKeys: Uint8Array[],
    limits: unknown
  ): unknown
}

const scope = self as unknown as DedicatedWorkerGlobalScope
let wasmPromise: Promise<RpgpWasmModule> | undefined

const loadWasm = async () => {
  if (wasmPromise) return wasmPromise
  wasmPromise = (async () => {
    try {
      const wasmUrl = new URL('./rpgp-wasm/rpgp_wrapper_bg.wasm', import.meta.url)
      const module = (await import('./rpgp-wasm/rpgp_wrapper.js')) as RpgpWasmModule
      await module.default({ module_or_path: wasmUrl })
      return module
    } catch (error) {
      wasmPromise = undefined
      throw Object.assign(new Error(error instanceof Error ? error.message : String(error)), {
        code: 'wasm-initialization-failed'
      })
    }
  })()
  return wasmPromise
}

const errorResponse = (id: string, error: unknown): SignatureWorkerResponse => ({
  id,
  ok: false,
  error: {
    code:
      typeof error === 'object' && error && 'code' in error
        ? (String((error as { code?: unknown }).code) as never)
        : 'internal-parser-error',
    message: error instanceof Error ? error.message : String(error)
  }
})

const normalizeInspectionResult = (value: unknown): OpenPgpInspectionResult => {
  const result = value as OpenPgpInspectionResult & {
    literalData?: { data: Uint8Array | number[] }
  }
  if (result.literalData && !(result.literalData.data instanceof Uint8Array)) {
    result.literalData.data = Uint8Array.from(result.literalData.data)
  }
  return result as OpenPgpInspectionResult
}

scope.addEventListener('message', async (event: MessageEvent<SignatureWorkerRequest>) => {
  const request = event.data
  if (
    !request ||
    typeof request.id !== 'string' ||
    !['classify', 'inspect', 'verify-detached'].includes(request.type)
  ) {
    scope.postMessage(
      errorResponse(
        typeof request?.id === 'string' ? request.id : 'unknown',
        Object.assign(new Error('Invalid signature Worker request.'), { code: 'invalid-input' })
      )
    )
    return
  }
  try {
    if (
      (request.type === 'classify' || request.type === 'inspect') &&
      !(request.input instanceof ArrayBuffer)
    ) {
      throw Object.assign(new Error('Signature Worker input must be an ArrayBuffer.'), {
        code: 'invalid-input'
      })
    }
    if (
      request.type === 'inspect' &&
      (!Array.isArray(request.publicKeys) ||
        !request.publicKeys.every((value) => value instanceof ArrayBuffer))
    ) {
      throw Object.assign(new Error('OpenPGP inspection public keys are malformed.'), {
        code: 'invalid-input'
      })
    }
    if (
      request.type === 'verify-detached' &&
      (!(request.content instanceof ArrayBuffer) ||
        !(request.signature instanceof ArrayBuffer) ||
        !Array.isArray(request.publicKeys) ||
        !request.publicKeys.every((value) => value instanceof ArrayBuffer))
    ) {
      throw Object.assign(new Error('Detached verification request is malformed.'), {
        code: 'invalid-input'
      })
    }
    const wasm = await loadWasm()
    let response: SignatureWorkerResponse
    switch (request.type) {
      case 'classify':
        response = {
          id: request.id,
          ok: true,
          type: 'classify',
          result: wasm.classify_openpgp(new Uint8Array(request.input), request.limits) as never
        }
        break
      case 'inspect':
        response = {
          id: request.id,
          ok: true,
          type: 'inspect',
          result: normalizeInspectionResult(
            wasm.inspect_openpgp(
              new Uint8Array(request.input),
              request.publicKeys.map((value) => new Uint8Array(value)),
              request.limits
            )
          )
        }
        break
      case 'verify-detached':
        response = {
          id: request.id,
          ok: true,
          type: 'verify-detached',
          result: wasm.verify_detached_signature(
            new Uint8Array(request.content),
            new Uint8Array(request.signature),
            request.publicKeys.map((value) => new Uint8Array(value)),
            request.limits
          ) as never
        }
        break
      default:
        throw Object.assign(new Error('Unknown signature Worker request.'), {
          code: 'invalid-input'
        })
    }
    scope.postMessage(response)
  } catch (error) {
    scope.postMessage(errorResponse(request.id, error))
  }
})
