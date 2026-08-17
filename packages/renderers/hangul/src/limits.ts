import type { HangulParseLimits } from './model.js';

export const DEFAULT_HANGUL_PARSE_LIMITS: HangulParseLimits = {
  maxUncompressedBytes: 256 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxEntries: 25_000,
  maxRecords: 250_000,
};
