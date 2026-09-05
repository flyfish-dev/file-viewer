import { Decompress } from 'fzstd'
import { IllustratorError } from 'illustrator-pgf'

/**
 * Bounded browser-side zstd decoding for Illustrator 24+ private source.
 *
 * fzstd's streaming API lets us reject decompression bombs before retaining
 * output beyond the parser's configured byte budget. The caller runs this in
 * the terminable Illustrator Worker, never on the UI thread.
 */
export async function decodeIllustratorZstd(
  input: Uint8Array,
  maxOutputBytes: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) {
    throw new IllustratorError('AI_DECODE_OUTPUT_LIMIT', 'decode', 'The zstd output limit must be a positive safe integer.')
  }
  if (signal?.aborted === true) {
    throw new IllustratorError('AI_ABORTED', 'decode', 'The Illustrator zstd decode operation was aborted.')
  }

  const chunks: Uint8Array[] = []
  let total = 0
  let finished = false
  try {
    const decoder = new Decompress((chunk, final) => {
      if (signal?.aborted === true) {
        throw new IllustratorError('AI_ABORTED', 'decode', 'The Illustrator zstd decode operation was aborted.')
      }
      if (chunk.byteLength > maxOutputBytes - total) {
        throw new IllustratorError(
          'AI_DECODE_OUTPUT_LIMIT',
          'decode',
          `Zstd output exceeds the ${maxOutputBytes}-byte limit.`,
        )
      }
      total += chunk.byteLength
      if (chunk.byteLength > 0) chunks.push(chunk)
      finished = final === true
    })
    decoder.push(input, true)
  } catch (error) {
    if (error instanceof IllustratorError) throw error
    throw new IllustratorError(
      'AI_CODEC_FAILED',
      'decode',
      `Zstd decompression failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (!finished) {
    throw new IllustratorError('AI_CODEC_FAILED', 'decode', 'Zstd decompression ended without a complete frame.')
  }

  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}
