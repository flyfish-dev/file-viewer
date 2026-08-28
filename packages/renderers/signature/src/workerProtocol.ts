import type {
  OpenPgpInspectionResult,
  OpenPgpVerificationResult,
  OpenPgpWorkerError,
  SignatureParseLimits
} from './openpgp/types.js'

export type SignatureWorkerRequest =
  | { id: string; type: 'classify'; input: ArrayBuffer; limits: SignatureParseLimits }
  | {
      id: string
      type: 'inspect'
      input: ArrayBuffer
      publicKeys: ArrayBuffer[]
      limits: SignatureParseLimits
    }
  | {
      id: string
      type: 'verify-detached'
      content: ArrayBuffer
      signature: ArrayBuffer
      publicKeys: ArrayBuffer[]
      limits: SignatureParseLimits
    }

export type SignatureWorkerResponse =
  | { id: string; ok: true; type: 'classify'; result: OpenPgpInspectionResult }
  | { id: string; ok: true; type: 'inspect'; result: OpenPgpInspectionResult }
  | { id: string; ok: true; type: 'verify-detached'; result: OpenPgpVerificationResult }
  | { id: string; ok: false; error: OpenPgpWorkerError }
