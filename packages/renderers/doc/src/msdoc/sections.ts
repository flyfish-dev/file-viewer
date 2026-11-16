import type {
  FibRgFcLcb,
  MsDocSectionGeometry,
  MsDocWarning,
} from "../types.js";
import { layoutWarning, readLayoutPlc, tableSlice } from "./layout-binary.js";

/** Aggregate per-document limits, charged again for every SED reference.
 * They bound both work and structured-clone output; offset caching is not a budget.
 */
export const SECTION_GEOMETRY_LIMITS = {
  scannedBytes: 1024 * 1024,
  sprms: 131072,
  unknownSprms: 65536,
} as const;
type BudgetKind = keyof typeof SECTION_GEOMETRY_LIMITS;
class SectionBudgetExceeded extends Error {
  constructor(readonly kind: BudgetKind) {
    super(`SEPX aggregate ${kind} budget exhausted`);
  }
}

/** Explicit SEPX subset only, no inferred Letter/A4/default margins or pagination. */
export function readTextboxSections(
  word: Uint8Array,
  table: Uint8Array,
  pairs: FibRgFcLcb,
  warnings: MsDocWarning[],
): MsDocSectionGeometry[] {
  try {
    const input = tableSlice(table, pairs, "PlcfSed");
    if (!input) return [];
    const v = new DataView(word.buffer, word.byteOffset, word.byteLength);
    const totals = { scannedBytes: 0, sprms: 0, unknownSprms: 0 };
    let exhausted: BudgetKind | undefined;
    const charge = (kind: BudgetKind, amount = 1) => {
      if (amount > SECTION_GEOMETRY_LIMITS[kind] - totals[kind])
        throw new SectionBudgetExceeded(kind);
      totals[kind] += amount;
    };
    return readLayoutPlc(input.bytes, 12, input.offset).map((r) => {
      const s: MsDocSectionGeometry = {
        id: `section-${r.index}`,
        mainCpRange: { start: r.start, end: r.end },
        tableOffset: r.offset,
        marginsTwips: {},
        status: "partial",
        unknownSprms: [],
      };
      const fc = r.bytes.getUint32(2, true);
      if (fc === 0xffffffff) return s;
      s.sepxOffset = fc;
      if (exhausted) {
        s.budgetExceeded = exhausted;
        return s;
      }
      try {
        if (fc > word.length - 2) throw new Error("SEPX offset");
        const cb = v.getInt16(fc, true);
        if (cb < 0 || cb > word.length - fc - 2)
          throw new Error("SEPX signed length/bounds");
        charge("scannedBytes", cb + 2);
        const end = fc + 2 + cb;
        const unknown = new Set<number>();
        for (let at = fc + 2; at < end;) {
          charge("sprms");
          if (at + 2 > end) throw new Error("SEPX opcode truncated");
          const code = v.getUint16(at, true),
            spra = code >>> 13;
          at += 2;
          let size = [1, 1, 2, 4, 2, 2, -1, 3][spra]!;
          if (size < 0) {
            if (at >= end) throw new Error("SEPX variable length");
            size = v.getUint8(at++);
          }
          if (size > end - at) throw new Error("SEPX operand exceeds parent");
          const u16 = () => v.getUint16(at, true),
            i16 = () => v.getInt16(at, true);
          switch (code) {
            case 0xb01f:
              s.pageWidthTwips = u16();
              break;
            case 0xb020:
              s.pageHeightTwips = u16();
              break;
            case 0xb021:
              s.marginsTwips.left = u16();
              break;
            case 0xb022:
              s.marginsTwips.right = u16();
              break;
            case 0x9023:
              s.marginsTwips.top = i16();
              break;
            case 0x9024:
              s.marginsTwips.bottom = i16();
              break;
            case 0xb025:
              s.marginsTwips.gutter = u16();
              break;
            case 0x500b:
              s.columnsMinusOne = u16();
              break;
            case 0x900c:
              s.columnSpaceTwips = i16();
              break;
            case 0x3009:
              s.breakKind = v.getUint8(at);
              break;
            case 0x301d:
              s.orientation = v.getUint8(at);
              break;
            default:
              if (!unknown.has(code)) {
                charge("unknownSprms");
                unknown.add(code);
                s.unknownSprms.push(code);
              }
          }
          at += size;
        }
        const m = s.marginsTwips;
        if (
          (s.pageWidthTwips != null && s.pageWidthTwips <= 0) ||
          (s.pageHeightTwips != null && s.pageHeightTwips <= 0)
        )
          throw new Error("SEPX page extent");
        if (
          s.pageWidthTwips &&
          s.pageHeightTwips &&
          [m.left, m.right, m.top, m.bottom].every((x) => x != null) &&
          !s.unknownSprms.length
        )
          s.status = "explicit";
      } catch (e) {
        if (e instanceof SectionBudgetExceeded) {
          exhausted = e.kind;
          s.budgetExceeded = e.kind;
          // The parsed prefix remains evidence, never a complete geometry claim.
          s.status = "partial";
          layoutWarning(
            warnings,
            "MSDOC_SECTION_GEOMETRY_BUDGET_EXCEEDED",
            e.message,
            {
              sectionIndex: r.index,
              sepxOffset: fc,
              budget: e.kind,
              totals: { ...totals },
              limits: { ...SECTION_GEOMETRY_LIMITS },
            },
          );
          return s;
        }
        s.status = "invalid";
        layoutWarning(
          warnings,
          "MSDOC_SECTION_GEOMETRY_INVALID",
          (e as Error).message,
          { sectionIndex: r.index, sepxOffset: fc },
        );
      }
      return s;
    });
  } catch (e) {
    layoutWarning(
      warnings,
      "MSDOC_SECTION_GEOMETRY_INVALID",
      (e as Error).message,
      { table: "PlcfSed" },
    );
    return [];
  }
}
