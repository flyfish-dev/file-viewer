import type { SignatureContainerLimits } from './limits.js'

export type AsicKind = 'ASiC-S' | 'ASiC-E'

export interface AsicArchiveMember {
  name: string
  compressedSize: number
  uncompressedSize: number
  mediaType?: string
  data?: Uint8Array
}

export interface AsicSignatureMember extends AsicArchiveMember {
  kind: 'cades' | 'xades-or-xml' | 'timestamp' | 'evidence-record' | 'jws' | 'unknown'
  referencedDocuments: string[]
}

export interface AsicInspection {
  kind: AsicKind
  mediaType: string
  sourceSize: number
  entryCount: number
  totalUncompressedBytes: number
  documents: AsicArchiveMember[]
  signatures: AsicSignatureMember[]
  metadata: AsicArchiveMember[]
  warnings: string[]
}

export interface JwsVerificationKey {
  key: CryptoKey | JsonWebKey
  kid?: string
}

export interface JwsSignatureInspection {
  index: number
  algorithm?: string
  keyId?: string
  protectedHeader: Readonly<Record<string, unknown>>
  unprotectedHeader: Readonly<Record<string, unknown>>
  signatureBytes: number
  cryptographicValid?: boolean
  verificationError?: string
  jadesProperties: string[]
}

export interface JwsInspection {
  serialization: 'compact' | 'json-general' | 'json-flattened'
  sourceSize: number
  detached: boolean
  payloadEncoded: boolean
  payload?: Uint8Array
  signatures: JwsSignatureInspection[]
  warnings: string[]
}

export interface InspectJwsOptions {
  detachedPayload?: ArrayBuffer | Uint8Array
  verificationKeys?: JwsVerificationKey[]
  limits?: Partial<SignatureContainerLimits>
}
