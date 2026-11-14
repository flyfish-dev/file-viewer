import type {
  MsDocTextboxLayout,
  MsDocTextboxFrame,
  MsDocWarning,
  ParsedFib,
  MsDocDrawingShape,
} from "../types.js";
import { layoutWarning, readLayoutPlc, tableSlice } from "./layout-binary.js";
import { readFloatingDrawings } from "./floating-drawings.js";
import { readTextboxSections } from "./sections.js";

export interface LayoutStory {
  kind: string;
  cpStart: number;
  cpEnd: number;
}
interface Anchor {
  cp: number;
  shapeId: number;
  raw: NonNullable<MsDocTextboxFrame["raw"]>;
}
export function readTextboxLayout(
  word: Uint8Array,
  table: Uint8Array,
  fib: ParsedFib,
  stories: LayoutStory[],
  documentText: string,
  isSpecialAnchor: (cp: number) => boolean,
  warnings: MsDocWarning[],
): MsDocTextboxLayout | undefined {
  const pairs = fib.fibRgFcLcb;
  if (
    !fib.fibRgLw.ccpTxbx &&
    !fib.fibRgLw.ccpHdrTxbx &&
    !pairs.lcbPlcftxbxTxt &&
    !pairs.lcbPlcfHdrtxbxTxt
  )
    return undefined;
  const shapes = readFloatingDrawings(table, pairs, warnings);
  const layout: MsDocTextboxLayout = {
    schemaVersion: 1,
    frames: [],
    sections: readTextboxSections(word, table, pairs, warnings),
    anchorParagraphs: [],
  };
  for (const storyKind of ["textbox", "header-textbox"] as const) {
    const story = stories.find((s) => s.kind === storyKind);
    if (!story) continue;
    const anchorKind = storyKind === "textbox" ? "main" : "header";
    const anchorStory = stories.find((s) => s.kind === anchorKind);
    const txTable = storyKind === "textbox" ? "PlcftxbxTxt" : "PlcfHdrtxbxTxt";
    const spaTable = storyKind === "textbox" ? "PlcSpaMom" : "PlcSpaHdr";
    const bkdTable = storyKind === "textbox" ? "PlcfTxbxBkd" : "PlcfTxbxHdrBkd";
    const anchors: Anchor[] = [];
    try {
      const input = tableSlice(table, pairs, spaTable);
      if (input)
        for (const r of readLayoutPlc(input.bytes, 26, input.offset)) {
          if (r.end <= r.start) throw new Error("SPA duplicate anchor CP");
          const flags = r.bytes.getUint16(20, true);
          anchors.push({
            cp: r.start,
            shapeId: r.bytes.getUint32(0, true),
            raw: {
              rectTwips: {
                left: r.bytes.getInt32(4, true),
                top: r.bytes.getInt32(8, true),
                right: r.bytes.getInt32(12, true),
                bottom: r.bytes.getInt32(16, true),
              },
              flags,
              bx: (flags >>> 1) & 3,
              by: (flags >>> 3) & 3,
              wrap: (flags >>> 5) & 15,
              wrapSide: (flags >>> 9) & 15,
              belowText: !!(flags & 0x4000),
              anchorLocked: !!(flags & 0x8000),
              spaOffset: r.offset,
            },
          });
        }
    } catch (e) {
      layoutWarning(
        warnings,
        "MSDOC_TEXTBOX_MAPPING_INVALID",
        (e as Error).message,
        { table: spaTable, storyKind },
      );
    }
    try {
      const input = tableSlice(table, pairs, txTable);
      if (!input) {
        if (story.cpEnd > story.cpStart)
          layoutWarning(
            warnings,
            "MSDOC_TEXTBOX_MAPPING_INVALID",
            "missing textbox PLC",
            { table: txTable, storyKind },
          );
        continue;
      }
      const records = readLayoutPlc(input.bytes, 22, input.offset);
      const storyShapes = shapes.filter((s) => s.storyKind === anchorKind);
      const anchorMap = groupBy(anchors, (a) => a.shapeId),
        shapeMap = groupBy(storyShapes, (s) => s.shapeId);
      const actual = records.filter(
        (r) =>
          r.index !== records.length - 1 && r.bytes.getUint16(8, true) === 0,
      );
      const actualMap = groupBy(actual, (r) => r.bytes.getUint32(14, true));
      for (const r of records) {
        // MS-DOC 2.9.106: last entry is reusable regardless of fReusable.
        if (r.index === records.length - 1 || r.bytes.getUint16(8, true) !== 0)
          continue;
        const shapeId = r.bytes.getUint32(14, true),
          chainCount = r.bytes.getInt32(0, true);
        const f: MsDocTextboxFrame = {
          id: `${storyKind}-${r.index}`,
          textboxIndex: r.index,
          storyKind,
          storyRange: { start: r.start, end: r.end },
          globalRange: {
            start: story.cpStart + r.start,
            end: story.cpStart + r.end,
          },
          shapeId,
          chainCount,
          contentBlockIds: [],
          mapping: "unmapped",
          layoutEligibility: "pending-evidence",
          reasons: [],
          tableOffset: r.offset,
        };
        layout.frames.push(f);
        const invalid = (reason: string) => {
          f.mapping = "invalid";
          f.reasons.push(reason);
        };
        if (r.end - r.start <= 1 || r.end > story.cpEnd - story.cpStart)
          invalid("invalid-textbox-range");
        if (chainCount < 1) invalid("invalid-chain-count");
        if (actualMap.get(shapeId)?.length !== 1)
          invalid("duplicate-textbox-shape-id");
        const matchedAnchors = anchorMap.get(shapeId) || [],
          matchedShapes = shapeMap.get(shapeId) || [];
        if (matchedAnchors.length > 1 || matchedShapes.length > 1)
          invalid("duplicate-shape-anchor");
        else if (!matchedAnchors.length || !matchedShapes.length)
          f.reasons.push(
            matchedShapes[0]?.parentShapeId != null
              ? "unresolved-group-child-anchor"
              : "missing-shape-anchor",
          );
        const a = matchedAnchors[0],
          shape = matchedShapes[0];
        if (a && matchedAnchors.length === 1) {
          f.raw = { ...a.raw };
          const globalCp = (anchorStory?.cpStart || 0) + a.cp;
          f.anchor = { storyKind: anchorKind, cp: a.cp, globalCp };
          if (
            !anchorStory ||
            a.cp >= anchorStory.cpEnd - anchorStory.cpStart ||
            documentText[globalCp] !== "\u0008" ||
            !isSpecialAnchor(globalCp)
          )
            invalid("invalid-anchor-character");
          const rect = a.raw.rectTwips;
          if (rect.right < rect.left || rect.bottom < rect.top)
            f.reasons.push("reversed-raw-rectangle");
          if (
            a.raw.bx > 2 ||
            a.raw.by > 2 ||
            a.raw.wrap > 5 ||
            a.raw.wrapSide > 3
          )
            f.reasons.push("unknown-spa-position-or-wrap");
          if (a.raw.wrap !== 3) f.reasons.push("unsupported-wrap");
        }
        if (shape && matchedShapes.length === 1) {
          if (f.raw) f.raw.drawing = shape;
          const expectedIndex = r.index + 1;
          if (
            shape.textId == null ||
            shape.textId >>> 16 !== expectedIndex ||
            (shape.textId & 0xffff) >= Math.max(chainCount, 1)
          )
            invalid("text-id-conflict");
          if (shape.clientTextId != null && shape.clientTextId !== shape.textId)
            invalid("client-text-id-conflict");
          if (shape.reasons.includes("conflicting-text-id-properties"))
            invalid("conflicting-text-id-properties");
          if (shape.reasons.includes("invalid-client-textbox"))
            invalid("invalid-client-textbox");
          f.reasons.push(
            ...shape.reasons.filter((x) => x !== "invalid-client-textbox"),
          );
          if (shape.shapeType !== 202)
            f.reasons.push("non-rectangular-textbox-shape");
          recordPositionUncertainty(shape, f);
        }
        if (chainCount > 1) f.reasons.push("linked-textbox-chain");
        if (storyKind === "header-textbox") f.reasons.push("header-textbox");
        if (f.mapping !== "invalid" && a && shape) f.mapping = "mapped";
        f.reasons = [...new Set(f.reasons)];
        if (
          f.mapping !== "mapped" ||
          f.reasons.some((x) => x !== "unverified-coordinate-semantics")
        )
          f.layoutEligibility = "unsupported";
      }
      try {
        const inputBkd = tableSlice(table, pairs, bkdTable);
        const frameMap = new Map(
          layout.frames
            .filter((f) => f.storyKind === storyKind)
            .map((f) => [f.textboxIndex, f]),
        );
        if (inputBkd)
          for (const r of readLayoutPlc(inputBkd.bytes, 6, inputBkd.offset)) {
            const index = r.bytes.getInt16(0, true);
            // A trailing BKD/spare range is not an actual textbox's text range.
            if (r.index === (inputBkd.bytes.length - 4) / 10 - 1) continue;
            const frame = frameMap.get(index);
            if (
              !frame ||
              r.start < frame.storyRange.start ||
              r.end > frame.storyRange.end
            ) {
              if (frame) {
                frame.mapping = "invalid";
                frame.layoutEligibility = "unsupported";
                frame.reasons.push("bkd-range-conflict");
              } else
                layoutWarning(
                  warnings,
                  "MSDOC_TEXTBOX_MAPPING_INVALID",
                  "BKD textbox index conflict",
                  { table: bkdTable, storyKind, textboxIndex: index },
                );
            }
          }
      } catch (e) {
        // BKD failure invalidates linked allocation, never discards story text.
        for (const f of layout.frames.filter(
          (f) => f.storyKind === storyKind,
        )) {
          f.layoutEligibility = "unsupported";
          f.reasons.push("invalid-bkd");
        }
        layoutWarning(
          warnings,
          "MSDOC_TEXTBOX_MAPPING_INVALID",
          (e as Error).message,
          { table: bkdTable, storyKind },
        );
      }
    } catch (e) {
      layoutWarning(
        warnings,
        "MSDOC_TEXTBOX_MAPPING_INVALID",
        (e as Error).message,
        { table: txTable, storyKind },
      );
    }
  }
  validateTextboxBoundaries(layout.frames, stories, documentText);
  for (const f of layout.frames) {
    const details = {
      storyKind: f.storyKind,
      textboxIndex: f.textboxIndex,
      shapeId: f.shapeId,
      globalRange: f.globalRange,
      tableOffset: f.tableOffset,
    };
    if (f.mapping !== "mapped")
      layoutWarning(
        warnings,
        "MSDOC_TEXTBOX_MAPPING_INVALID",
        f.reasons.join(", ") || "unmapped frame",
        details,
      );
    else
      layoutWarning(
        warnings,
        "MSDOC_TEXTBOX_POSITION_AMBIGUOUS",
        "coordinate semantics and page mapping are unverified",
        details,
      );
    if (f.layoutEligibility === "unsupported")
      layoutWarning(
        warnings,
        "MSDOC_TEXTBOX_LAYOUT_UNSUPPORTED",
        f.reasons.join(", "),
        details,
      );
  }
  return layout;
}
function recordPositionUncertainty(
  shape: MsDocDrawingShape,
  frame: MsDocTextboxFrame,
): void {
  // posrelh/v are deliberately raw. Conflicting spec/interop enum evidence is
  // not resolved by filename, producer, text, or matching an expected screenshot.
  frame.reasons.push("unverified-coordinate-semantics");
  if (
    shape.properties.some(
      (p) => [912, 914].includes(p.id) && (p.complex || p.value > 4),
    )
  )
    frame.reasons.push("unknown-officeart-origin");
}

function groupBy<T>(values: T[], key: (value: T) => number): Map<number, T[]> {
  const result = new Map<number, T[]>();
  for (const value of values) {
    const k = key(value),
      group = result.get(k);
    if (group) group.push(value);
    else result.set(k, [value]);
  }
  return result;
}

/** Metadata is not allowed to change the interpretation of Unicode or fields.
 * A canonical flow may be split only at a Word paragraph/cell delimiter (or
 * story endpoint), outside every nested field and outside a surrogate pair.
 * Scan each story once in CP order; never search for field instruction words.
 */
function validateTextboxBoundaries(
  frames: MsDocTextboxFrame[],
  stories: LayoutStory[],
  text: string,
): void {
  for (const story of stories) {
    const candidates = frames.filter(
      (f) => f.mapping === "mapped" && f.storyKind === story.kind,
    );
    const boundaries = [
      ...new Set(
        candidates.flatMap((f) => [f.globalRange.start, f.globalRange.end]),
      ),
    ].sort((a, b) => a - b);
    const unsafe = new Map<number, string[]>();
    let cursor = story.cpStart,
      fieldDepth = 0;
    for (const cp of boundaries) {
      while (cursor < cp) {
        const ch = text.charCodeAt(cursor++);
        if (ch === 0x13) fieldDepth++;
        else if (ch === 0x15 && fieldDepth) fieldDepth--;
      }
      const reasons: string[] = [];
      const previous = text.charCodeAt(cp - 1),
        next = text.charCodeAt(cp);
      if (
        previous >= 0xd800 &&
        previous <= 0xdbff &&
        next >= 0xdc00 &&
        next <= 0xdfff
      )
        reasons.push("unsafe-utf16-boundary");
      if (fieldDepth) reasons.push("unsafe-field-boundary");
      if (
        cp !== story.cpStart &&
        cp !== story.cpEnd &&
        previous !== 0x0d &&
        previous !== 0x07
      )
        reasons.push("unsafe-flow-boundary");
      if (reasons.length) unsafe.set(cp, reasons);
    }
    for (const frame of candidates) {
      const reasons = [
        ...(unsafe.get(frame.globalRange.start) || []),
        ...(unsafe.get(frame.globalRange.end) || []),
      ];
      if (!reasons.length) continue;
      frame.mapping = "invalid";
      frame.layoutEligibility = "unsupported";
      frame.reasons = [...new Set([...frame.reasons, ...reasons])];
    }
  }
}
