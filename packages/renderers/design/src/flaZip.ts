import {
  DEFAULT_XD_ZIP_LIMITS,
  extractXdZipEntry,
  inspectXdZipCentralDirectory,
  resolveXdZipLimits,
  type XdZipDirectory,
  type XdZipEntry,
  type XdZipLimits,
} from './xdZip.js'

/**
 * Animate's compressed FLA container and Adobe XD both use ordinary bounded
 * ZIP records. Keep one audited ZIP implementation rather than growing a
 * second subtly different central-directory parser.
 *
 * The compatibility wrapper also rewrites legacy XD-specific diagnostics so
 * callers never report that an Animate file is an XD package.
 */
export type FlaZipLimits = XdZipLimits
export type FlaZipEntry = XdZipEntry
export type FlaZipDirectory = XdZipDirectory

export const DEFAULT_FLA_ZIP_LIMITS: Readonly<FlaZipLimits> = Object.freeze({
  ...DEFAULT_XD_ZIP_LIMITS,
  maxFileBytes: 256 * 1024 * 1024,
  maxEntries: 8_192,
  maxEntryUncompressedBytes: 96 * 1024 * 1024,
  maxTotalUncompressedBytes: 512 * 1024 * 1024,
  maxCompressionRatio: 120,
})

const rewriteZipError = (error: unknown): never => {
  if (!(error instanceof Error)) throw error
  const replacement = new Error(
    error.message
      .replaceAll('XD ZIP', 'FLA ZIP')
      .replaceAll('XD file', 'FLA file')
      .replaceAll('XD containers', 'FLA containers')
      .replaceAll('XD entries', 'FLA entries')
      .replaceAll('XD entry', 'FLA entry')
  )
  replacement.name = error.name
  throw replacement
}

export const resolveFlaZipLimits = (overrides?: Partial<FlaZipLimits>): FlaZipLimits => ({
  ...resolveXdZipLimits({ ...DEFAULT_FLA_ZIP_LIMITS, ...overrides }),
})

export const inspectFlaZipCentralDirectory = (
  buffer: ArrayBuffer,
  overrides?: Partial<FlaZipLimits>
): FlaZipDirectory => {
  try {
    return inspectXdZipCentralDirectory(buffer, resolveFlaZipLimits(overrides))
  } catch (error) {
    return rewriteZipError(error)
  }
}

export const extractFlaZipEntry = async (
  buffer: ArrayBuffer,
  directory: FlaZipDirectory,
  entryName: string,
  maxOutputBytes: number
) => {
  try {
    return await extractXdZipEntry(buffer, directory, entryName, maxOutputBytes)
  } catch (error) {
    return rewriteZipError(error)
  }
}
