import type { IworkParseLimits } from './model.js';

export const DEFAULT_IWORK_PARSE_LIMITS: IworkParseLimits = {
  maxUncompressedBytes: 256 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxObjects: 250_000,
  maxImagePixels: 80_000_000,
  maxNestingDepth: 128,
};
