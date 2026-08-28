export interface SignatureContainerLimits {
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

export const DEFAULT_SIGNATURE_CONTAINER_LIMITS: Readonly<SignatureContainerLimits> = Object.freeze(
  {
    maxContainerBytes: 64 * 1024 * 1024,
    maxEntries: 1024,
    maxEntryBytes: 32 * 1024 * 1024,
    maxTotalUncompressedBytes: 128 * 1024 * 1024,
    maxCompressionRatio: 200,
    maxPathBytes: 1024,
    maxDocuments: 512,
    maxSignatureMembers: 128,
    maxXmlBytes: 4 * 1024 * 1024,
    maxJsonBytes: 8 * 1024 * 1024,
    maxJwsSignatures: 64,
    maxWorkerMs: 20_000
  }
)

const ABSOLUTE_SIGNATURE_CONTAINER_LIMITS: Readonly<SignatureContainerLimits> = Object.freeze({
  maxContainerBytes: 128 * 1024 * 1024,
  maxEntries: 4096,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalUncompressedBytes: 256 * 1024 * 1024,
  maxCompressionRatio: 500,
  maxPathBytes: 4096,
  maxDocuments: 2048,
  maxSignatureMembers: 512,
  maxXmlBytes: 16 * 1024 * 1024,
  maxJsonBytes: 32 * 1024 * 1024,
  maxJwsSignatures: 256,
  maxWorkerMs: 60_000
})

const boundedInteger = (value: unknown, fallback: number, ceiling: number) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return fallback
  return Math.min(value, ceiling)
}

/**
 * Host overrides may lower or moderately raise operational limits, but they can
 * never disable the package's absolute hostile-input boundary.
 */
export const normalizeSignatureContainerLimits = (
  requested?: Partial<SignatureContainerLimits>
): SignatureContainerLimits =>
  Object.fromEntries(
    Object.entries(DEFAULT_SIGNATURE_CONTAINER_LIMITS).map(([key, fallback]) => [
      key,
      boundedInteger(
        requested?.[key as keyof SignatureContainerLimits],
        fallback,
        ABSOLUTE_SIGNATURE_CONTAINER_LIMITS[key as keyof SignatureContainerLimits]
      )
    ])
  ) as unknown as SignatureContainerLimits
