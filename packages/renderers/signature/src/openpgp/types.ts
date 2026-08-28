export type OpenPgpClassification =
  | 'message'
  | 'encrypted-message'
  | 'detached-signature'
  | 'cleartext-signed-message'
  | 'signed-message'
  | 'public-key'
  | 'private-key'
  | 'literal-data'
  | 'compressed-data'
  | 'unknown-openpgp'
  | 'invalid-openpgp'

export interface SignatureParseLimits {
  maxInputBytes: number
  maxOutputBytes: number
  maxPacketCount: number
  maxNestingDepth: number
  maxUserIds: number
  maxSubkeys: number
  maxSignatures: number
}

export interface OpenPgpKeySummary {
  kind: 'public' | 'private'
  version?: string
  fingerprint?: string
  keyId?: string
  algorithm?: string
  createdAt?: string
  userIds: string[]
  subkeys: Array<{
    fingerprint?: string
    keyId?: string
    algorithm?: string
    createdAt?: string
  }>
}

export interface OpenPgpSignatureSummary {
  signatureType?: string
  hashAlgorithm?: string
  publicKeyAlgorithm?: string
  createdAt?: string
  expiresAt?: string
  issuerKeyIds: string[]
  issuerFingerprints: string[]
  cryptographicValid?: boolean
  verificationKeyFingerprint?: string
  verificationKeyId?: string
  verificationError?: string
}

export interface ExtractedLiteralData {
  filename?: string
  format?: string
  mediaType?: string
  data: Uint8Array
}

export interface OpenPgpInspectionResult {
  classification: OpenPgpClassification
  armored: boolean
  armorType?: string
  packetTypes: string[]
  packetCount: number
  encrypted: boolean
  integrityProtected?: boolean
  symmetricAlgorithm?: string
  aeadMode?: string
  compressed: boolean
  keys: OpenPgpKeySummary[]
  signatures: OpenPgpSignatureSummary[]
  recipients: string[]
  literalData?: ExtractedLiteralData
  warnings: string[]
}

export interface OpenPgpVerificationResult {
  status:
    | 'signature-valid'
    | 'signature-invalid'
    | 'public-key-required'
    | 'original-content-required'
    | 'unsupported-algorithm'
  valid?: boolean
  keyFingerprint?: string
  keyId?: string
  error?: string
}

export interface OpenPgpWorkerError {
  code:
    | 'invalid-input'
    | 'unsupported-format'
    | 'unsupported-algorithm'
    | 'input-too-large'
    | 'output-too-large'
    | 'packet-limit-exceeded'
    | 'nesting-limit-exceeded'
    | 'decompression-required'
    | 'encrypted-content'
    | 'public-key-required'
    | 'original-content-required'
    | 'malformed-packet'
    | 'wasm-initialization-failed'
    | 'internal-parser-error'
  message: string
}
