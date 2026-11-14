import type {
  FibRgFcLcb,
  MsDocDrawingProperty,
  MsDocDrawingShape,
  MsDocWarning,
} from "../types.js";
import {
  layoutWarning,
  MAX_LAYOUT_RECORDS,
  tableSlice,
} from "./layout-binary.js";

interface RecordNode {
  type: number;
  instance: number;
  version: number;
  at: number;
  end: number;
  children: RecordNode[];
}
/** Strict OfficeArtContent reader (MS-DOC 2.9.171). Separate from inline picture recovery. */
export function readFloatingDrawings(
  table: Uint8Array,
  pairs: FibRgFcLcb,
  warnings: MsDocWarning[],
): MsDocDrawingShape[] {
  try {
    const input = tableSlice(table, pairs, "DggInfo");
    if (!input) return [];
    const b = input.bytes,
      v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let count = 0,
      propertyCount = 0,
      emittedProperties = 0;
    const read = (at: number, limit: number, depth: number): RecordNode => {
      if (++count > MAX_LAYOUT_RECORDS || depth > 32 || at + 8 > limit)
        throw new Error("OfficeArt record bounds or budget");
      const vi = v.getUint16(at, true),
        len = v.getUint32(at + 4, true);
      const r: RecordNode = {
        type: v.getUint16(at + 2, true),
        version: vi & 15,
        instance: vi >>> 4,
        at,
        end: at + 8 + len,
        children: [],
      };
      if (len > limit - at - 8)
        throw new Error("OfficeArt record exceeds parent");
      // Unknown containers are opaque. Only these documented container kinds
      // contain records this reader owns; do not inspect unknown payload bytes.
      if (r.version === 15 && [0xf000, 0xf002, 0xf003, 0xf004].includes(r.type))
        for (let p = at + 8; p < r.end;) {
          const child = read(p, r.end, depth + 1);
          r.children.push(child);
          p = child.end;
        }
      return r;
    };
    const root = read(0, b.length, 0);
    if (root.type !== 0xf000 || root.version !== 15)
      throw new Error("OfficeArt missing DggContainer");
    const properties = (
      r: RecordNode,
      source: MsDocDrawingProperty["source"],
    ): MsDocDrawingProperty[] => {
      if (
        r.version !== 3 ||
        r.instance * 6 > r.end - r.at - 8 ||
        (propertyCount += r.instance) > MAX_LAYOUT_RECORDS * 8
      )
        throw new Error("FOPT count/version/budget");
      let complexAt = r.at + 8 + r.instance * 6;
      const result: MsDocDrawingProperty[] = [];
      let previousId = -1;
      for (let i = 0; i < r.instance; i++) {
        const at = r.at + 8 + i * 6,
          opid = v.getUint16(at, true),
          value = v.getUint32(at + 2, true);
        const prop: MsDocDrawingProperty = {
          id: opid & 0x3fff,
          complex: !!(opid & 0x8000),
          blip: !!(opid & 0x4000),
          value,
          source,
          recordType: r.type,
          offset: input.offset + at,
        };
        if (prop.id <= previousId)
          throw new Error("FOPT duplicate or unsorted property ID");
        previousId = prop.id;
        if (prop.complex) {
          if (value > r.end - complexAt)
            throw new Error("FOPT complex data exceeds parent");
          complexAt += value;
        } else if (prop.id % 64 === 63) prop.useMask = value >>> 16;
        result.push(prop);
      }
      if (complexAt !== r.end) throw new Error("FOPT trailing data");
      return result;
    };
    const isFopt = (r: RecordNode) => [0xf00b, 0xf121, 0xf122].includes(r.type);
    const defaults = root.children
      .filter(isFopt)
      .flatMap((r) => properties(r, "document-default"));
    const merge = (own: MsDocDrawingProperty[]): MsDocDrawingProperty[] => {
      const map = new Map<number, MsDocDrawingProperty>();
      for (const prop of [...defaults, ...own]) {
        const prior = map.get(prop.id);
        if (prop.useMask != null && prior?.useMask != null) {
          const mask = prop.useMask;
          const use = mask | prior.useMask;
          const value =
            ((prior.value & ~mask & 0xffff) |
              (prop.value & mask) |
              (use << 16)) >>>
            0;
          map.set(prop.id, { ...prop, value, useMask: use });
        } else map.set(prop.id, prop);
      }
      return Array.from(map.values());
    };
    const shapes: MsDocDrawingShape[] = [];
    const walk = (
      r: RecordNode,
      storyKind: MsDocDrawingShape["storyKind"],
      parentShapeId?: number,
    ) => {
      if (r.type === 0xf003 && r.version === 15) {
        const group = r.children.find((c) => c.type === 0xf004);
        const fsp = group?.children.find((c) => c.type === 0xf00a);
        // The drawing's patriarch is a coordinate root, not an authored group.
        const id =
          fsp &&
          fsp.end - fsp.at === 16 &&
          !(v.getUint32(fsp.at + 12, true) & 0x4)
            ? v.getUint32(fsp.at + 8, true)
            : undefined;
        for (const child of r.children)
          walk(child, storyKind, child === group ? parentShapeId : id);
      } else if (r.type === 0xf004 && r.version === 15) {
        const fsps = r.children.filter((c) => c.type === 0xf00a);
        if (
          fsps.length !== 1 ||
          fsps[0]!.end - fsps[0]!.at !== 16 ||
          fsps[0]!.version !== 2
        )
          throw new Error("FSP missing, duplicate or invalid");
        const fsp = fsps[0]!;
        const own = r.children
          .filter(isFopt)
          .flatMap((c) => properties(c, "shape"));
        if (
          (emittedProperties += defaults.length + own.length) >
          MAX_LAYOUT_RECORDS * 8
        )
          throw new Error("FOPT inherited property budget");
        const shape: MsDocDrawingShape = {
          shapeId: v.getUint32(fsp.at + 8, true),
          storyKind,
          shapeType: fsp.instance,
          flags: v.getUint32(fsp.at + 12, true),
          fileOrder: shapes.length,
          offset: input.offset + r.at,
          properties: merge(own),
          rawProperties: [...defaults, ...own],
          reasons: [],
        };
        const seen = new Map<number, MsDocDrawingProperty>();
        for (const p of own) {
          const prior = seen.get(p.id);
          if (prior?.useMask != null && p.useMask != null) {
            // Two FOPT records may explicitly set disjoint boolean bits.
            // Only contradictory values in overlapping use bits conflict.
            if (((prior.value ^ p.value) & prior.useMask & p.useMask) !== 0)
              shape.reasons.push("conflicting-shape-property");
            const useMask = prior.useMask | p.useMask;
            seen.set(p.id, {
              ...p,
              useMask,
              value:
                ((prior.value & ~p.useMask & 0xffff) |
                  (p.value & p.useMask) |
                  (useMask << 16)) >>>
                0,
            });
          } else {
            if (
              prior &&
              (prior.value !== p.value ||
                prior.complex !== p.complex ||
                prior.blip !== p.blip)
            )
              shape.reasons.push(
                p.id === 128
                  ? "conflicting-text-id-properties"
                  : "conflicting-shape-property",
              );
            seen.set(p.id, p);
          }
        }
        if (parentShapeId != null) shape.parentShapeId = parentShapeId;
        const txid = shape.properties.find((p) => p.id === 128);
        if (txid && !txid.complex) shape.textId = txid.value;
        const clients = r.children.filter((c) => c.type === 0xf00d);
        if (
          clients.length > 1 ||
          clients.some((c) => c.end - c.at !== 12 || c.version !== 0)
        )
          shape.reasons.push("invalid-client-textbox");
        else if (clients[0])
          shape.clientTextId = v.getUint32(clients[0].at + 8, true);
        if (shape.flags & 0x3 || parentShapeId != null)
          shape.reasons.push("group-shape");
        if (shape.flags & 0xc0) shape.reasons.push("flipped-shape");
        if (shape.flags & 0x10) shape.reasons.push("deleted-shape");
        if (shape.properties.some((p) => p.id === 4 && p.value !== 0))
          shape.reasons.push("rotated-shape");
        if (shape.properties.some((p) => p.id === 138 && p.value !== 0))
          shape.reasons.push("linked-shape");
        if (
          r.children.some(
            (c) =>
              ![
                0xf00a, 0xf00b, 0xf121, 0xf122, 0xf00d, 0xf00f, 0xf010, 0xf011,
                0xf009,
              ].includes(c.type),
          )
        )
          shape.reasons.push("unknown-shape-record");
        shapes.push(shape);
      } else if (r.type === 0xf002 && r.version === 15)
        for (const child of r.children) walk(child, storyKind, parentShapeId);
      // Unknown containers are skipped; do not discover shapes in opaque records.
    };
    const labels = new Set<number>();
    for (let at = root.end; at < b.length;) {
      const label = b[at]!;
      if (label > 1 || labels.has(label))
        throw new Error("OfficeArt drawing story label");
      labels.add(label);
      const r = read(at + 1, b.length, 0);
      if (r.type !== 0xf002 || r.version !== 15)
        throw new Error("OfficeArt missing DgContainer");
      walk(r, label === 0 ? "main" : "header");
      at = r.end;
    }
    return shapes;
  } catch (e) {
    layoutWarning(
      warnings,
      "MSDOC_TEXTBOX_MAPPING_INVALID",
      String((e as Error).message),
      { table: "DggInfo" },
    );
    return [];
  }
}
