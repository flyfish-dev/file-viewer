import type { SignatureContainerLimits } from './limits.js'
import type { AsicInspection } from './types.js'

export interface AsicWorkerRequest {
  id: string
  type: 'inspect-asic'
  input: ArrayBuffer
  limits: SignatureContainerLimits
}

export type AsicWorkerResponse =
  | { id: string; ok: true; result: AsicInspection }
  | {
      id: string
      ok: false
      error: { code: 'invalid-input' | 'unsafe-archive' | 'internal-parser-error'; message: string }
    }
