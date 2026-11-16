import type { FibRgFcLcb, MsDocWarning } from "../types.js";

// Resource limits are independent of untrusted table counts. No resynchronizing scans.
export const MAX_LAYOUT_RECORDS = 16384;
export const MAX_LAYOUT_BYTES = 16 * 1024 * 1024;
export function layoutWarning(
  warnings: MsDocWarning[],
  code: string,
  reason: string,
  details: Record<string, unknown> = {},
): void {
  const isLayoutWarning = (w: MsDocWarning) =>
    (String(w.code || "").startsWith("MSDOC_TEXTBOX_") &&
      w.code !== "MSDOC_TEXTBOX_STORY_LINEARIZED") ||
    String(w.code || "").startsWith("MSDOC_SECTION_GEOMETRY_");
  const warning = {
    message: `Legacy Word textbox metadata: ${reason}. Linearized content is retained.`,
    code,
    reason,
    ...details,
  };
  if (warnings.filter(isLayoutWarning).length >= 256) {
    // Resource exhaustion must remain visible, even after malformed metadata
    // filled the ordinary diagnostic budget. Never replace legacy/#460 warnings.
    if (
      code === "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED" &&
      !warnings.some((w) => w.code === code)
    ) {
      for (let index = warnings.length - 1; index >= 0; index--) {
        if (isLayoutWarning(warnings[index]!)) {
          warnings[index] = warning;
          break;
        }
      }
    }
    return;
  }
  warnings.push(warning);
}
export function tableSlice(
  table: Uint8Array,
  pairs: FibRgFcLcb,
  name: string,
): { bytes: Uint8Array; offset: number } | undefined {
  const fc = pairs[`fc${name}`];
  const lcb = pairs[`lcb${name}`];
  if (!lcb) return undefined;
  if (
    typeof fc !== "number" ||
    typeof lcb !== "number" ||
    !Number.isInteger(fc) ||
    !Number.isInteger(lcb) ||
    fc < 0 ||
    lcb < 0 ||
    lcb > MAX_LAYOUT_BYTES ||
    fc > table.length - lcb
  )
    throw new Error(`${name}: table bounds or budget`);
  return { bytes: table.subarray(fc, fc + lcb), offset: fc };
}
export interface PlcRecord {
  index: number;
  start: number;
  end: number;
  bytes: DataView;
  offset: number;
}
/** CP terminal values are validated by each table's semantics, not as actual records. */
export function readLayoutPlc(
  bytes: Uint8Array,
  size: number,
  offset = 0,
): PlcRecord[] {
  const n = (bytes.length - 4) / (size + 4);
  if (!Number.isInteger(n) || n < 0 || n > MAX_LAYOUT_RECORDS)
    throw new Error("PLC size or budget");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const records: PlcRecord[] = [];
  for (let i = 0; i < n; i++) {
    const start = v.getInt32(i * 4, true),
      end = v.getInt32(i * 4 + 4, true);
    if (start < 0 || end < start) throw new Error("PLC nonmonotonic CP");
    const at = (n + 1) * 4 + i * size;
    records.push({
      index: i,
      start,
      end,
      offset: offset + at,
      bytes: new DataView(bytes.buffer, bytes.byteOffset + at, size),
    });
  }
  return records;
}
