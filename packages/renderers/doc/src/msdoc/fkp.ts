import { BinaryReader } from '../core/binary.js';
import { decodeGrpprl, SprmCodes } from './sprm.js';
import { fcToCp } from './clx.js';
import type { DecodedProperty, ParsedClx, ParsedFib } from '../types.js';

interface PlcBte {
  aFC: number[];
  pages: number[];
}

interface ChpxFkp {
  crun: number;
  rgfc: number[];
  rgb: number[];
  chpxOffsets: number[];
}

interface PapxFkp {
  cpara: number;
  rgfc: number[];
  bOffsets: number[];
  papxOffsets: number[];
}

export interface ChpxRun {
  cpStart: number;
  cpEnd: number;
  fcStart: number;
  fcEnd: number;
  properties: DecodedProperty[];
}

export interface PapxRun extends ChpxRun {
  styleId: number;
  rawOffset: number;
}

function u32(bytes: Uint8Array, offset = 0): number {
  if (offset + 4 > bytes.length) return 0;
  return ((bytes[offset] ?? 0)
    | ((bytes[offset + 1] ?? 0) << 8)
    | ((bytes[offset + 2] ?? 0) << 16)
    | (((bytes[offset + 3] ?? 0) << 24) >>> 0)) >>> 0;
}

function readPlcBte(tableBytes: Uint8Array, fc: number | undefined, lcb: number | undefined): PlcBte {
  if (fc == null || lcb == null || lcb <= 0) return { aFC: [], pages: [] };
  const bytes = tableBytes.subarray(fc, fc + lcb);
  const reader = new BinaryReader(bytes);
  const count = Math.floor((lcb - 4) / 8);
  if (count <= 0) return { aFC: [], pages: [] };
  const aFC: number[] = [];
  for (let i = 0; i <= count; i += 1) aFC.push(reader.u32(i * 4) >>> 0);
  const pages: number[] = [];
  const pnOffset = (count + 1) * 4;
  for (let i = 0; i < count; i += 1) pages.push(reader.u32(pnOffset + i * 4) & 0x3fffff);
  return { aFC, pages };
}

function readChpxFkp(wordBytes: Uint8Array, pn: number): ChpxFkp | null {
  const offset = pn * 512;
  const page = wordBytes.subarray(offset, offset + 512);
  if (page.length < 512) return null;
  const reader = new BinaryReader(page);
  const crun = reader.u8(511);
  if (!crun || crun > 100) return null;
  const rgfc: number[] = [];
  for (let i = 0; i <= crun; i += 1) rgfc.push(reader.u32(i * 4) >>> 0);
  const rgb: number[] = [];
  const chpxOffsets: number[] = [];
  const rgbStart = (crun + 1) * 4;
  for (let i = 0; i < crun; i += 1) {
    const b = reader.u8(rgbStart + i);
    rgb.push(b);
    chpxOffsets.push(b ? offset + b * 2 : 0);
  }
  return { crun, rgfc, rgb, chpxOffsets };
}

function readPapxFkp(wordBytes: Uint8Array, pn: number): PapxFkp | null {
  const offset = pn * 512;
  const page = wordBytes.subarray(offset, offset + 512);
  if (page.length < 512) return null;
  const reader = new BinaryReader(page);
  const cpara = reader.u8(511);
  if (cpara > 0x1d) return null;
  const rgfc: number[] = [];
  for (let i = 0; i <= cpara; i += 1) rgfc.push(reader.u32(i * 4) >>> 0);
  const bxStart = (cpara + 1) * 4;
  const bOffsets: number[] = [];
  const papxOffsets: number[] = [];
  for (let i = 0; i < cpara; i += 1) {
    const bOffset = reader.u8(bxStart + i * 13);
    bOffsets.push(bOffset);
    papxOffsets.push(bOffset ? offset + bOffset * 2 : 0);
  }
  return { cpara, rgfc, bOffsets, papxOffsets };
}

export function readChpxRuns(wordBytes: Uint8Array, tableBytes: Uint8Array, fib: ParsedFib, clx: ParsedClx): ChpxRun[] {
  const fcPlcfBteChpx = fib.fibRgFcLcb.fcPlcfBteChpx as number | undefined;
  const lcbPlcfBteChpx = fib.fibRgFcLcb.lcbPlcfBteChpx as number | undefined;
  const plc = readPlcBte(tableBytes, fcPlcfBteChpx, lcbPlcfBteChpx);
  const runs: ChpxRun[] = [];
  for (const pn of plc.pages) {
    const fkp = readChpxFkp(wordBytes, pn);
    if (!fkp) continue;
    for (let i = 0; i < fkp.crun; i += 1) {
      const fcStart = fkp.rgfc[i] ?? 0;
      const fcEnd = fkp.rgfc[i + 1] ?? fcStart;
      const cpStart = fcToCp(clx, fcStart);
      const cpEnd = fcToCp(clx, fcEnd);
      if (cpStart == null || cpEnd == null || cpEnd <= cpStart) continue;
      const properties = fkp.chpxOffsets[i] ? readChpxProperties(wordBytes, fkp.chpxOffsets[i]) : [];
      runs.push({ cpStart, cpEnd, fcStart, fcEnd, properties });
    }
  }
  runs.sort((a, b) => a.cpStart - b.cpStart || a.cpEnd - b.cpEnd);
  return runs;
}

export function readPapxRuns(wordBytes: Uint8Array, tableBytes: Uint8Array, fib: ParsedFib, clx: ParsedClx, dataBytes?: Uint8Array): PapxRun[] {
  const fcPlcfBtePapx = fib.fibRgFcLcb.fcPlcfBtePapx as number | undefined;
  const lcbPlcfBtePapx = fib.fibRgFcLcb.lcbPlcfBtePapx as number | undefined;
  const plc = readPlcBte(tableBytes, fcPlcfBtePapx, lcbPlcfBtePapx);
  const runs: PapxRun[] = [];
  for (const pn of plc.pages) {
    const fkp = readPapxFkp(wordBytes, pn);
    if (!fkp) continue;
    for (let i = 0; i < fkp.cpara; i += 1) {
      const fcStart = fkp.rgfc[i] ?? 0;
      const fcEnd = fkp.rgfc[i + 1] ?? fcStart;
      const cpStart = fcToCp(clx, fcStart);
      const cpEnd = fcToCp(clx, fcEnd);
      if (cpStart == null || cpEnd == null || cpEnd < cpStart) continue;
      const papx = fkp.papxOffsets[i]
        ? readPapxProperties(wordBytes, fkp.papxOffsets[i], dataBytes)
        : { styleId: 0, properties: [] };
      runs.push({ cpStart, cpEnd, fcStart, fcEnd, styleId: papx.styleId, properties: papx.properties, rawOffset: fkp.papxOffsets[i] ?? 0 });
    }
  }
  runs.sort((a, b) => a.cpStart - b.cpStart || a.cpEnd - b.cpEnd);
  return runs;
}

export function readChpxProperties(wordBytes: Uint8Array, offset: number | null | undefined): DecodedProperty[] {
  if (offset == null || offset < 0 || offset >= wordBytes.length) return [];
  const cb = wordBytes[offset] ?? 0;
  if (!cb) return [];
  const start = offset + 1;
  const end = Math.min(wordBytes.length, start + cb);
  return decodeGrpprl(wordBytes, start, end);
}

function readHugePapxProperties(dataBytes: Uint8Array, offset: number): DecodedProperty[] {
  if (offset < 0 || offset + 2 > dataBytes.length) return [];
  const cb = (dataBytes[offset] ?? 0) | ((dataBytes[offset + 1] ?? 0) << 8);
  if (!cb || offset + 2 + cb > dataBytes.length) return [];
  return decodeGrpprl(dataBytes, offset + 2, offset + 2 + cb);
}

function expandHugePapxProperties(properties: DecodedProperty[], dataBytes?: Uint8Array): DecodedProperty[] {
  if (!dataBytes?.length) return properties;
  const expanded: DecodedProperty[] = [];
  for (const property of properties) {
    if (property.raw !== SprmCodes.sprmPHugePapx) {
      expanded.push(property);
      continue;
    }
    const operandBytes = property.operandBytes || (property.value instanceof Uint8Array ? property.value : null);
    if (!operandBytes || operandBytes.length < 4) {
      expanded.push(property);
      continue;
    }
    const hugeOffset = u32(operandBytes);
    const hugeProperties = readHugePapxProperties(dataBytes, hugeOffset);
    expanded.push(...(hugeProperties.length ? hugeProperties : [property]));
  }
  return expanded;
}

export function readPapxProperties(wordBytes: Uint8Array, offset: number | null | undefined, dataBytes?: Uint8Array): { styleId: number; properties: DecodedProperty[] } {
  if (offset == null || offset < 0 || offset >= wordBytes.length) return { styleId: 0, properties: [] };
  const reader = new BinaryReader(wordBytes);
  const cb = reader.u8(offset);
  if (cb === 0 && !reader.ensure(offset + 1, 1)) return { styleId: 0, properties: [] };

  let bodyStart: number;
  let bodySize: number;
  if (cb === 0) {
    bodySize = reader.u8(offset + 1) * 2;
    bodyStart = offset + 2;
  } else {
    // PapxInFkp.cb counts 2-byte words; the payload occupies (2 * cb) - 1 bytes.
    bodySize = cb * 2 - 1;
    bodyStart = offset + 1;
  }
  if (bodySize < 2 || !reader.ensure(bodyStart, Math.max(2, bodySize))) {
    return { styleId: 0, properties: [] };
  }

  const styleId = reader.u16(bodyStart);
  const propsStart = bodyStart + 2;
  const propsEnd = Math.min(wordBytes.length, bodyStart + bodySize);
  const properties = expandHugePapxProperties(decodeGrpprl(wordBytes, propsStart, propsEnd), dataBytes);
  return { styleId, properties };
}
