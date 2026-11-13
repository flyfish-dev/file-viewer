/** Pure configuration for the opt-in signature renderer. No cryptographic runtime is imported. */
export interface FileViewerSignatureDetailsPanelOptions {
  /** Read once per document. Users can always override it with the panel toggle. Default: expanded. */
  initialState?: 'expanded' | 'collapsed'
  /** Initial placement relative to the document preview. Default: top. */
  position?: 'top' | 'left'
  /** Left placement only. Overlay preserves preview geometry; push respects its existing fit policy. Default: overlay. */
  openingBehavior?: 'overlay' | 'push'
}

export interface FileViewerSignatureParseLimits {
  maxInputBytes: number
  maxOutputBytes: number
  maxPacketCount: number
  maxNestingDepth: number
  maxUserIds: number
  maxSubkeys: number
  maxSignatures: number
}

export interface FileViewerSignatureContainerLimits {
  maxContainerBytes: number
  maxEntries: number
  maxEntryBytes: number
  maxTotalUncompressedBytes: number
  maxCompressionRatio: number
  maxPathBytes: number
  maxDocuments: number
  maxSignatureMembers: number
  maxXmlBytes: number
  maxJsonBytes: number
  maxJwsSignatures: number
  maxWorkerMs: number
}

export interface FileViewerSignatureJwsVerificationKey {
  key: CryptoKey | JsonWebKey
  kid?: string
}

export interface FileViewerSignatureOptions {
  detailsPanel?: FileViewerSignatureDetailsPanelOptions
  /** Original content used for detached CMS signatures and RFC 3161 imprint comparison. */
  originalContent?: ArrayBuffer | Blob
  originalFilename?: string
  /** Maximum cryptographic container size parsed in memory. Defaults to 64 MiB. */
  maxContainerSize?: number
  /** Maximum extracted or supplied original size sent to a nested renderer. Defaults to 32 MiB. */
  maxNestedPreviewSize?: number
  /** Public keys for detached, cleartext, and unencrypted embedded OpenPGP verification. Secret keys are not accepted. */
  openPgpPublicKeys?: Array<ArrayBuffer | Blob>
  /** Conservative parser/resource limits forwarded to the rPGP WebAssembly wrapper. */
  openPgpLimits?: Partial<FileViewerSignatureParseLimits>
  /** Bounded ASiC/JWS resource limits. Absolute hostile-input ceilings cannot be disabled. */
  containerLimits?: Partial<FileViewerSignatureContainerLimits>
  /** Host-provided public verification keys for JWS. Private and symmetric JWKs are rejected. */
  jwsVerificationKeys?: FileViewerSignatureJwsVerificationKey[]
  /** Trusted-Types/CSP-aware Worker factory for the optional parser Workers. */
  workerFactory?: (kind: 'openpgp' | 'container') => Worker
}
