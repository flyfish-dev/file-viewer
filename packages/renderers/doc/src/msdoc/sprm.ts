import { HIGHLIGHT_COLORS } from './constants.js';
import type {
  BorderSpec,
  DecodedProperty,
  HighlightInfo,
  ItcRange,
  PropertyKind,
  RangeBorderOperand,
  RangeValueOperand,
  RangeWidthOperand,
  ShadingSpec,
  TDefTableOperand,
  TInsertOperand,
  TableBorders,
  TableWidthOperand,
  Tcgrf,
} from '../types.js';

export const SprmCodes = {
  sprmCFRMarkDel: 0x0800,
  sprmCFRMark: 0x0801,
  sprmCFFldVanish: 0x0802,
  sprmCPicLocation: 0x6a03,
  sprmCIbstRMark: 0x4804,
  sprmCDttmRMark: 0x6805,
  sprmCFData: 0x0806,
  sprmCFOle2: 0x080a,
  sprmCHighlight: 0x2a0c,
  sprmCIstd: 0x4a30,
  sprmCPlain: 0x2a33,
  sprmCFBold: 0x0835,
  sprmCFItalic: 0x0836,
  sprmCFStrike: 0x0837,
  sprmCFOutline: 0x0838,
  sprmCFShadow: 0x0839,
  sprmCFSmallCaps: 0x083a,
  sprmCFCaps: 0x083b,
  sprmCFVanish: 0x083c,
  sprmCKul: 0x2a3e,
  sprmCDxaSpace: 0x8840,
  sprmCIco: 0x2a42,
  sprmCHps: 0x4a43,
  sprmCHpsPos: 0x4845,
  sprmCSymbol: 0x6a09,
  sprmCHpsKern: 0x484b,
  sprmCRgFtc0: 0x4a4f,
  sprmCRgFtc1: 0x4a50,
  sprmCRgFtc2: 0x4a51,
  sprmCCharScale: 0x4852,
  sprmCFDStrike: 0x2a53,
  sprmCFImprint: 0x0854,
  sprmCFSpec: 0x0855,
  sprmCFObj: 0x0856,
  sprmCFEmboss: 0x0858,
  sprmCFBiDi: 0x085a,
  sprmCFBoldBi: 0x085c,
  sprmCFItalicBi: 0x085d,
  sprmCFtcBi: 0x4a5e,
  sprmCIcoBi: 0x4a60,
  sprmCHpsBi: 0x4a61,
  sprmPIstd: 0x4600,
  sprmPIstdPermute: 0xc601,
  sprmPIncLvl: 0x2602,
  sprmPJc80: 0x2403,
  sprmPFKeep: 0x2405,
  sprmPFKeepFollow: 0x2406,
  sprmPFPageBreakBefore: 0x2407,
  sprmPIlvl: 0x260a,
  sprmPIlfo: 0x460b,
  sprmPChgTabsPapx: 0xc60d,
  sprmPDxaRight80: 0x840e,
  sprmPDxaLeft80: 0x840f,
  sprmPNest80: 0x4610,
  sprmPDxaLeft180: 0x8411,
  sprmPDyaLine: 0x6412,
  sprmPDyaBefore: 0xa413,
  sprmPDyaAfter: 0xa414,
  sprmPChgTabs: 0xc615,
  sprmPFInTable: 0x2416,
  sprmPFTtp: 0x2417,
  sprmPDxaAbs: 0x8418,
  sprmPDyaAbs: 0x8419,
  sprmPDxaWidth: 0x841a,
  sprmPPc: 0x261b,
  sprmPWr: 0x2423,
  sprmPBrcTop80: 0x6424,
  sprmPBrcLeft80: 0x6425,
  sprmPBrcBottom80: 0x6426,
  sprmPBrcRight80: 0x6427,
  sprmPBrcBetween80: 0x6428,
  sprmPBrcBar80: 0x6629,
  sprmPWHeightAbs: 0x442b,
  sprmPDcs: 0x442c,
  sprmPShd80: 0x442d,
  sprmPDyaFromText: 0x842e,
  sprmPDxaFromText: 0x842f,
  sprmPFLocked: 0x2430,
  sprmPFWidowControl: 0x2431,
  sprmPFBiDi: 0x2441,
  sprmPHugePapx: 0x6646,
  sprmPFAdjustRight: 0x2448,
  sprmPItap: 0x6649,
  sprmPDtap: 0x664a,
  sprmPFInnerTableCell: 0x244b,
  sprmPFInnerTtp: 0x244c,
  sprmPShd: 0xc64d,
  sprmPBrcTop: 0xc64e,
  sprmPBrcLeft: 0xc64f,
  sprmPBrcBottom: 0xc650,
  sprmPBrcRight: 0xc651,
  sprmPBrcBetween: 0xc652,
  sprmPBrcBar: 0xc653,
  sprmPDxcRight: 0x4455,
  sprmPDxcLeft: 0x4456,
  sprmPDxcLeft1: 0x4457,
  sprmPDylBefore: 0x4458,
  sprmPDylAfter: 0x4459,
  sprmPFDyaBeforeAuto: 0x245b,
  sprmPFDyaAfterAuto: 0x245c,
  sprmPDxaRight: 0x845d,
  sprmPDxaLeft: 0x845e,
  sprmPNest: 0x465f,
  sprmPDxaLeft1: 0x8460,
  sprmPJc: 0x2461,
  sprmTJc90: 0x5400,
  sprmTDxaLeft: 0x9601,
  sprmTDxaGapHalf: 0x9602,
  sprmTFCantSplit90: 0x3403,
  sprmTTableHeader: 0x3404,
  sprmTTableBorders80: 0xd605,
  sprmTDyaRowHeight: 0x9407,
  sprmTDefTable: 0xd608,
  sprmTDefTableShd80: 0xd609,
  sprmTTlp: 0x740a,
  sprmTFBiDi: 0x560b,
  sprmTDefTableShd3rd: 0xd60c,
  sprmTPc: 0x360d,
  sprmTDxaAbs: 0x940e,
  sprmTDyaAbs: 0x940f,
  sprmTDxaFromText: 0x9410,
  sprmTDyaFromText: 0x9411,
  sprmTDefTableShd: 0xd612,
  sprmTTableBorders: 0xd613,
  sprmTTableWidth: 0xf614,
  sprmTFAutofit: 0x3615,
  sprmTDefTableShd2nd: 0xd616,
  sprmTWidthBefore: 0xf617,
  sprmTWidthAfter: 0xf618,
  sprmTSetBrc80: 0xd620,
  sprmTInsert: 0x7621,
  sprmTDelete: 0x5622,
  sprmTDxaCol: 0x7623,
  sprmTMerge: 0x5624,
  sprmTSplit: 0x5625,
  sprmTTextFlow: 0x7629,
  sprmTVertMerge: 0xd62b,
  sprmTVertAlign: 0xd62c,
  sprmTSetShd: 0xd62d,
  sprmTSetShdOdd: 0xd62e,
  sprmTSetBrc: 0xd62f,
  sprmTCellPadding: 0xd632,
  sprmTCellSpacingDefault: 0xd633,
  sprmTCellPaddingDefault: 0xd634,
  sprmTCellWidth: 0xd635,
  sprmTFitText: 0xf636,
  sprmTFCellNoWrap: 0xd639,
  sprmTIstd: 0x563a,
  sprmTDefTableShdRaw: 0xd670,
  sprmTDefTableShdRaw2nd: 0xd671,
  sprmTDefTableShdRaw3rd: 0xd672,
} as const;

const VARIABLE_OPERAND_CODES = new Set<number>([
  SprmCodes.sprmPChgTabs,
  SprmCodes.sprmPChgTabsPapx,
  SprmCodes.sprmTDefTable,
  SprmCodes.sprmTTableBorders80,
  SprmCodes.sprmTTableBorders,
  SprmCodes.sprmTDefTableShd,
  SprmCodes.sprmTDefTableShd80,
  SprmCodes.sprmTDefTableShd3rd,
  SprmCodes.sprmTDefTableShd2nd,
  SprmCodes.sprmTDefTableShdRaw,
  SprmCodes.sprmTDefTableShdRaw2nd,
  SprmCodes.sprmTDefTableShdRaw3rd,
  SprmCodes.sprmTSetBrc80,
  SprmCodes.sprmTSetBrc,
  SprmCodes.sprmTSetShd,
  SprmCodes.sprmTSetShdOdd,
  SprmCodes.sprmTCellPadding,
  SprmCodes.sprmTCellSpacingDefault,
  SprmCodes.sprmTCellPaddingDefault,
  SprmCodes.sprmTCellWidth,
  SprmCodes.sprmTVertAlign,
  SprmCodes.sprmTVertMerge,
]);

export function getSprmGroup(sprm: number): number {
  return (sprm >> 13) & 0x7;
}

function u16(bytes: Uint8Array, offset = 0): number {
  if (offset + 2 > bytes.length) return 0;
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function i16(bytes: Uint8Array, offset = 0): number {
  const value = u16(bytes, offset);
  return value > 0x7fff ? value - 0x10000 : value;
}

function u32(bytes: Uint8Array, offset = 0): number {
  if (offset + 4 > bytes.length) return 0;
  return ((bytes[offset] ?? 0)
    | ((bytes[offset + 1] ?? 0) << 8)
    | ((bytes[offset + 2] ?? 0) << 16)
    | (((bytes[offset + 3] ?? 0) << 24) >>> 0)) >>> 0;
}

function parseItcFirstLim(bytes: Uint8Array, offset = 0): ItcRange {
  return {
    first: bytes[offset] ?? 0,
    lim: bytes[offset + 1] ?? 0,
  };
}

function parseBrc80(bytes: Uint8Array, offset = 0): BorderSpec | null {
  if (offset + 4 > bytes.length) return null;
  const brc = u32(bytes, offset) >>> 0;
  if (brc === 0xffffffff) return { raw: brc, nil: true };
  const lineWidth = brc & 0xff;
  const borderType = (brc >> 8) & 0xff;
  const color = (brc >> 16) & 0xff;
  const flags = (brc >>> 24) & 0xff;
  return {
    raw: brc,
    lineWidth,
    borderType,
    color,
    space: flags & 0x1f,
    shadow: Boolean(flags & 0x20),
    frame: Boolean(flags & 0x40),
  };
}

function parseBrc(bytes: Uint8Array, offset = 0): BorderSpec | null {
  if (offset + 8 > bytes.length) return null;
  const colorRef = u32(bytes, offset) >>> 0;
  const packed = u32(bytes, offset + 4) >>> 0;
  if (packed === 0xffffffff) return { raw: packed, colorRef, nil: true };
  return {
    raw: packed,
    colorRef,
    lineWidth: packed & 0xff,
    borderType: (packed >>> 8) & 0xff,
    space: (packed >>> 16) & 0x1f,
    shadow: Boolean(packed & (1 << 21)),
    frame: Boolean(packed & (1 << 22)),
  };
}

function parseTcgrf(bytes: Uint8Array, offset = 0): Tcgrf {
  const value = u16(bytes, offset);
  return {
    raw: value,
    horzMerge: value & 0x3,
    textFlow: (value >> 2) & 0x7,
    vertMerge: (value >> 5) & 0x3,
    vertAlign: (value >> 7) & 0x3,
    ftsWidth: (value >> 9) & 0x7,
    fitText: Boolean(value & (1 << 12)),
    noWrap: Boolean(value & (1 << 13)),
    hideMark: Boolean(value & (1 << 14)),
  };
}

function parseTc80(bytes: Uint8Array, offset = 0): { tcgrf: Tcgrf; wWidth: number; borders: Record<string, BorderSpec> } | null {
  if (offset + 20 > bytes.length) return null;
  return {
    tcgrf: parseTcgrf(bytes, offset),
    wWidth: u16(bytes, offset + 2),
    borders: {
      top: parseBrc80(bytes, offset + 4) || {},
      left: parseBrc80(bytes, offset + 8) || {},
      bottom: parseBrc80(bytes, offset + 12) || {},
      right: parseBrc80(bytes, offset + 16) || {},
    },
  };
}

function parseShd80(bytes: Uint8Array, offset = 0): ShadingSpec | null {
  if (offset + 2 > bytes.length) return null;
  const raw = u16(bytes, offset);
  const foregroundColorIndex = raw & 0x1f;
  const backgroundColorIndex = (raw >>> 5) & 0x1f;
  const pattern = (raw >>> 10) & 0x3f;
  return {
    foregroundColorIndex,
    backgroundColorIndex,
    pattern,
    auto: pattern === 0,
    nil: raw === 0xffff,
    legacy: true,
  };
}

function parseShd(bytes: Uint8Array, offset = 0): ShadingSpec | null {
  if (offset + 10 > bytes.length) return null;
  const foregroundColorRef = u32(bytes, offset) >>> 0;
  const backgroundColorRef = u32(bytes, offset + 4) >>> 0;
  const pattern = u16(bytes, offset + 8);
  return {
    foregroundColorRef,
    backgroundColorRef,
    pattern,
    auto: pattern === 0,
    nil: pattern === 0xffff,
  };
}

function parseTableBorders(bytes: Uint8Array, legacy: boolean): TableBorders | null {
  const borderSize = legacy ? 4 : 8;
  if (!bytes.length || bytes.length < 1 + borderSize * 6) return null;
  const parse = legacy ? parseBrc80 : parseBrc;
  const names: Array<keyof TableBorders> = [
    'top', 'left', 'bottom', 'right', 'horizontalInside', 'verticalInside',
  ];
  const borders: TableBorders = {};
  names.forEach((name, index) => {
    const border = parse(bytes, 1 + index * borderSize);
    if (border) borders[name] = border;
  });
  return borders;
}

function parseDefaultShading(bytes: Uint8Array, start: number, legacy: boolean) {
  const size = legacy ? 2 : 10;
  const count = Math.floor(Math.min(bytes[0] ?? 0, Math.max(0, bytes.length - 1)) / size);
  const values: ShadingSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const shading = legacy ? parseShd80(bytes, 1 + index * size) : parseShd(bytes, 1 + index * size);
    if (shading) values.push(shading);
  }
  return { start, values };
}

function parseTDefTableOperand(bytes: Uint8Array): TDefTableOperand | null {
  if (bytes.length < 3) return null;
  const cb = u16(bytes, 0);
  const numberOfColumns = bytes[2] ?? 0;
  let offset = 3;
  const rgdxaCenter: number[] = [];
  for (let i = 0; i < numberOfColumns + 1 && offset + 2 <= bytes.length; i += 1) {
    rgdxaCenter.push(i16(bytes, offset));
    offset += 2;
  }
  const cells: TDefTableOperand['cells'] = [];
  for (let i = 0; i < numberOfColumns && offset + 20 <= bytes.length; i += 1) {
    const cell = parseTc80(bytes, offset);
    if (cell) cells.push(cell);
    offset += 20;
  }
  return { cb, numberOfColumns, rgdxaCenter, cells } as TDefTableOperand;
}

function parseRangeValueOperand(bytes: Uint8Array): RangeValueOperand | null {
  if (!bytes.length) return null;
  const cb = bytes[0] ?? 0;
  return {
    cb,
    range: parseItcFirstLim(bytes, 1),
    value: bytes[3] ?? 0,
    extra: bytes.subarray(4),
  } as RangeValueOperand;
}

function parseRangeWidthOperand(bytes: Uint8Array): RangeWidthOperand | null {
  if (!bytes.length) return null;
  const cb = bytes[0] ?? 0;
  const width = u16(bytes, 4);
  return {
    cb,
    range: parseItcFirstLim(bytes, 1),
    ftsWidth: bytes[3] ?? 0,
    width,
    wWidth: width,
  };
}

function parseCssaOperand(bytes: Uint8Array): RangeWidthOperand | null {
  if (bytes.length < 7) return null;
  const width = u16(bytes, 5);
  return {
    cb: bytes[0] ?? 0,
    range: parseItcFirstLim(bytes, 1),
    sides: bytes[3] ?? 0,
    ftsWidth: bytes[4] ?? 0,
    width,
    wWidth: width,
  };
}

function parseRangeBrcOperand(bytes: Uint8Array): RangeBorderOperand | null {
  if (bytes.length < 8) return null;
  return {
    cb: bytes[0] ?? 0,
    range: parseItcFirstLim(bytes, 1),
    bordersToApply: bytes[3] ?? 0,
    border: parseBrc80(bytes, 4) || { nil: true },
    extra: bytes.subarray(8),
  } as RangeBorderOperand;
}

function parseRangeBrcOperand97(bytes: Uint8Array): RangeBorderOperand | null {
  if (bytes.length < 12) return null;
  return {
    cb: bytes[0] ?? 0,
    range: parseItcFirstLim(bytes, 1),
    bordersToApply: bytes[3] ?? 0,
    border: parseBrc(bytes, 4) || { nil: true },
    extra: bytes.subarray(12),
  } as RangeBorderOperand;
}

function parseTableShadeOperand(bytes: Uint8Array, odd = false) {
  if (bytes.length < 13) return null;
  return {
    cb: bytes[0] ?? 0,
    range: parseItcFirstLim(bytes, 1),
    shading: parseShd(bytes, 3),
    odd,
  };
}

function parseVertMergeOperand(bytes: Uint8Array) {
  if (bytes.length < 3) return null;
  return { cb: bytes[0] ?? 0, index: bytes[1] ?? 0, value: bytes[2] ?? 0 };
}

function parseFixedRangeValueOperand(bytes: Uint8Array) {
  if (bytes.length < 3) return null;
  return { range: parseItcFirstLim(bytes, 0), value: bytes[2] ?? 0 };
}

function parseFixedRangeWidthOperand(bytes: Uint8Array): RangeWidthOperand | null {
  if (bytes.length < 4) return null;
  const width = i16(bytes, 2);
  return { range: parseItcFirstLim(bytes, 0), width, wWidth: width };
}

function parseTTableWidth(bytes: Uint8Array): TableWidthOperand | null {
  if (!bytes.length) return null;
  const width = u16(bytes, 1);
  return {
    ftsWidth: bytes[0] ?? 0,
    width,
    wWidth: width,
  };
}

function parseTInsertOperand(bytes: Uint8Array): TInsertOperand | null {
  if (bytes.length < 4) return null;
  return {
    itcFirst: bytes[0] ?? 0,
    ctc: bytes[1] ?? 0,
    dxaCol: u16(bytes, 2),
  };
}

export function getSprmOperandLength(buffer: Uint8Array, offset: number, sprm: number): number {
  const spra = (sprm >> 13) & 0x7;
  if (offset >= buffer.length) return 0;
  if (sprm === SprmCodes.sprmTDefTable) {
    const cb = u16(buffer, offset);
    return cb ? cb + 1 : 0;
  }
  if (VARIABLE_OPERAND_CODES.has(sprm)) {
    const cb = buffer[offset] ?? 0;
    return cb + 1;
  }
  switch (spra) {
    case 0: return 1;
    case 1: return 1;
    case 2: return 2;
    case 3: return 4;
    case 4: return 2;
    case 5: return 2;
    case 6: {
      const cb = buffer[offset] ?? 0;
      return cb + 1;
    }
    case 7: return 3;
    default: return 0;
  }
}

function boolValue(bytes: Uint8Array): boolean {
  return Boolean(bytes[0] ?? 0);
}

function setMeta<TValue>(kind: PropertyKind, name: string, value: TValue, raw: number, bytes: Uint8Array): DecodedProperty<TValue> {
  return { kind, name, value, raw, operandBytes: bytes };
}

export function decodeSprm(sprm: number, operandBytes: Uint8Array): DecodedProperty {
  const group = getSprmGroup(sprm);
  const bytes = operandBytes;
  const raw = sprm;
  switch (sprm) {
    case SprmCodes.sprmCFRMarkDel: return setMeta('char', 'revisionDeleted', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFRMark: return setMeta('char', 'revisionInserted', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCPicLocation: return setMeta('char', 'pictureOffset', u32(bytes, 0) >>> 0, raw, bytes);
    case SprmCodes.sprmCFData: return setMeta('char', 'data', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFOle2: return setMeta('char', 'ole2', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCIstd: return setMeta('char', 'charStyleId', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmCPlain: return setMeta('char', 'plain', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFBold: return setMeta('char', 'bold', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFItalic: return setMeta('char', 'italic', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFStrike: return setMeta('char', 'strike', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFOutline: return setMeta('char', 'outline', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFShadow: return setMeta('char', 'shadow', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFSmallCaps: return setMeta('char', 'smallCaps', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFCaps: return setMeta('char', 'caps', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFVanish: return setMeta('char', 'hidden', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCKul: return setMeta('char', 'underline', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmCDxaSpace: return setMeta('char', 'spacing', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmCIco:
    case SprmCodes.sprmCIcoBi: return setMeta('char', 'colorIndex', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmCHighlight: {
      const index = bytes[0] ?? 0;
      const highlight: HighlightInfo = { index, color: HIGHLIGHT_COLORS[index as keyof typeof HIGHLIGHT_COLORS] };
      return setMeta('char', 'highlight', highlight, raw, bytes);
    }
    case SprmCodes.sprmCHps:
    case SprmCodes.sprmCHpsBi: return setMeta('char', 'fontSizeHalfPoints', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmCHpsPos: return setMeta('char', 'positionHalfPoints', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmCSymbol: return setMeta('char', 'symbol', { font: u16(bytes, 0), charCode: u16(bytes, 2) }, raw, bytes);
    case SprmCodes.sprmCRgFtc0:
    case SprmCodes.sprmCRgFtc1:
    case SprmCodes.sprmCRgFtc2:
    case SprmCodes.sprmCFtcBi: return setMeta('char', 'fontFamilyId', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmCCharScale: return setMeta('char', 'scale', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmCFDStrike: return setMeta('char', 'doubleStrike', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFImprint: return setMeta('char', 'imprint', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFSpec: return setMeta('char', 'special', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFObj: return setMeta('char', 'object', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFEmboss: return setMeta('char', 'emboss', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFBiDi: return setMeta('char', 'rtl', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFBoldBi: return setMeta('char', 'boldBi', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmCFItalicBi: return setMeta('char', 'italicBi', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPIstd: return setMeta('para', 'styleId', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPJc80:
    case SprmCodes.sprmPJc: return setMeta('para', 'alignment', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmPFKeep: return setMeta('para', 'keepLines', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFKeepFollow: return setMeta('para', 'keepNext', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFPageBreakBefore: return setMeta('para', 'pageBreakBefore', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPIlvl: return setMeta('para', 'listLevel', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmPIlfo: return setMeta('para', 'listId', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDxaRight80:
    case SprmCodes.sprmPDxaRight: return setMeta('para', 'rightIndent', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDxaLeft80:
    case SprmCodes.sprmPDxaLeft: return setMeta('para', 'leftIndent', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDxaLeft180:
    case SprmCodes.sprmPDxaLeft1: return setMeta('para', 'firstLineIndent', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDyaLine: return setMeta('para', 'lineSpacing', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDyaBefore: return setMeta('para', 'spacingBefore', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDyaAfter: return setMeta('para', 'spacingAfter', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPFInTable: return setMeta('para', 'inTable', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFTtp: return setMeta('para', 'tableRowEnd', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPDxaAbs: return setMeta('para', 'frameLeft', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDyaAbs: return setMeta('para', 'frameTop', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDxaWidth: return setMeta('para', 'frameWidth', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPPc: return setMeta('para', 'framePosition', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmPWr: return setMeta('para', 'frameWrap', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmPBrcTop80: return setMeta('para', 'borderTop', parseBrc80(bytes, 0), raw, bytes);
    case SprmCodes.sprmPBrcTop: return setMeta('para', 'borderTop', parseBrc(bytes, 1), raw, bytes);
    case SprmCodes.sprmPBrcLeft80: return setMeta('para', 'borderLeft', parseBrc80(bytes, 0), raw, bytes);
    case SprmCodes.sprmPBrcLeft: return setMeta('para', 'borderLeft', parseBrc(bytes, 1), raw, bytes);
    case SprmCodes.sprmPBrcBottom80: return setMeta('para', 'borderBottom', parseBrc80(bytes, 0), raw, bytes);
    case SprmCodes.sprmPBrcBottom: return setMeta('para', 'borderBottom', parseBrc(bytes, 1), raw, bytes);
    case SprmCodes.sprmPBrcRight80: return setMeta('para', 'borderRight', parseBrc80(bytes, 0), raw, bytes);
    case SprmCodes.sprmPBrcRight: return setMeta('para', 'borderRight', parseBrc(bytes, 1), raw, bytes);
    case SprmCodes.sprmPBrcBetween80: return setMeta('para', 'borderBetween', parseBrc80(bytes, 0), raw, bytes);
    case SprmCodes.sprmPBrcBetween: return setMeta('para', 'borderBetween', parseBrc(bytes, 1), raw, bytes);
    case SprmCodes.sprmPBrcBar80: return setMeta('para', 'borderBar', parseBrc80(bytes, 0), raw, bytes);
    case SprmCodes.sprmPBrcBar: return setMeta('para', 'borderBar', parseBrc(bytes, 1), raw, bytes);
    case SprmCodes.sprmPWHeightAbs: return setMeta('para', 'frameHeight', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPShd80:
    case SprmCodes.sprmPShd: return setMeta('para', 'shading', bytes.slice(), raw, bytes);
    case SprmCodes.sprmPDyaFromText: return setMeta('para', 'distanceFromTextY', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDxaFromText: return setMeta('para', 'distanceFromTextX', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmPFLocked: return setMeta('para', 'locked', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFWidowControl: return setMeta('para', 'widowControl', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFBiDi: return setMeta('para', 'rtlPara', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFAdjustRight: return setMeta('para', 'adjustRight', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPItap: return setMeta('para', 'itap', u32(bytes, 0), raw, bytes);
    case SprmCodes.sprmPDtap: return setMeta('para', 'dtap', u32(bytes, 0), raw, bytes);
    case SprmCodes.sprmPFInnerTableCell: return setMeta('para', 'innerTableCell', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFInnerTtp: return setMeta('para', 'innerTableRowEnd', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFDyaBeforeAuto: return setMeta('para', 'spacingBeforeAuto', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmPFDyaAfterAuto: return setMeta('para', 'spacingAfterAuto', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmTJc90: return setMeta('table', 'alignment', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDxaLeft: return setMeta('table', 'leftIndent', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDxaGapHalf: return setMeta('table', 'gapHalf', u16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTFCantSplit90: return setMeta('table', 'cantSplit', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmTTableHeader: return setMeta('table', 'header', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmTDyaRowHeight: return setMeta('table', 'rowHeight', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDefTable: return setMeta('table', 'defTable', parseTDefTableOperand(bytes), raw, bytes);
    case SprmCodes.sprmTTableBorders80: return setMeta('table', 'tableBorders', parseTableBorders(bytes, true), raw, bytes);
    case SprmCodes.sprmTTableBorders: return setMeta('table', 'tableBorders', parseTableBorders(bytes, false), raw, bytes);
    case SprmCodes.sprmTDefTableShd80: return setMeta('table', 'defaultShading', parseDefaultShading(bytes, 0, true), raw, bytes);
    case SprmCodes.sprmTDefTableShd:
    case SprmCodes.sprmTDefTableShdRaw: return setMeta('table', 'defaultShading', parseDefaultShading(bytes, 0, false), raw, bytes);
    case SprmCodes.sprmTDefTableShd2nd:
    case SprmCodes.sprmTDefTableShdRaw2nd: return setMeta('table', 'defaultShading', parseDefaultShading(bytes, 22, false), raw, bytes);
    case SprmCodes.sprmTDefTableShd3rd:
    case SprmCodes.sprmTDefTableShdRaw3rd: return setMeta('table', 'defaultShading', parseDefaultShading(bytes, 44, false), raw, bytes);
    case SprmCodes.sprmTFBiDi: return setMeta('table', 'rtl', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmTPc: return setMeta('table', 'positionCode', bytes[0] ?? 0, raw, bytes);
    case SprmCodes.sprmTDxaAbs: return setMeta('table', 'absLeft', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDyaAbs: return setMeta('table', 'absTop', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDxaFromText: return setMeta('table', 'distanceLeft', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDyaFromText: return setMeta('table', 'distanceTop', i16(bytes, 0), raw, bytes);
    case SprmCodes.sprmTTableWidth: return setMeta('table', 'tableWidth', parseTTableWidth(bytes), raw, bytes);
    case SprmCodes.sprmTFAutofit: return setMeta('table', 'autoFit', boolValue(bytes), raw, bytes);
    case SprmCodes.sprmTWidthBefore: return setMeta('table', 'widthBefore', parseTTableWidth(bytes), raw, bytes);
    case SprmCodes.sprmTWidthAfter: return setMeta('table', 'widthAfter', parseTTableWidth(bytes), raw, bytes);
    case SprmCodes.sprmTInsert: return setMeta('table', 'insertCells', parseTInsertOperand(bytes), raw, bytes);
    case SprmCodes.sprmTDelete: return setMeta('table', 'deleteCells', parseItcFirstLim(bytes, 0), raw, bytes);
    case SprmCodes.sprmTDxaCol: return setMeta('table', 'columnWidth', parseFixedRangeWidthOperand(bytes), raw, bytes);
    case SprmCodes.sprmTMerge: return setMeta('table', 'merge', parseItcFirstLim(bytes, 0), raw, bytes);
    case SprmCodes.sprmTSplit: return setMeta('table', 'split', parseItcFirstLim(bytes, 0), raw, bytes);
    case SprmCodes.sprmTTextFlow: return setMeta('table', 'textFlow', {
      range: parseItcFirstLim(bytes, 0),
      value: u16(bytes, 2),
    }, raw, bytes);
    case SprmCodes.sprmTVertMerge: return setMeta('table', 'vertMerge', parseVertMergeOperand(bytes), raw, bytes);
    case SprmCodes.sprmTVertAlign: return setMeta('table', 'vertAlign', parseRangeValueOperand(bytes), raw, bytes);
    case SprmCodes.sprmTSetShd: return setMeta('table', 'setShading', parseTableShadeOperand(bytes), raw, bytes);
    case SprmCodes.sprmTSetShdOdd: return setMeta('table', 'setShading', parseTableShadeOperand(bytes, true), raw, bytes);
    case SprmCodes.sprmTSetBrc80: return setMeta('table', 'setBorder', parseRangeBrcOperand(bytes), raw, bytes);
    case SprmCodes.sprmTSetBrc: return setMeta('table', 'setBorder', parseRangeBrcOperand97(bytes), raw, bytes);
    case SprmCodes.sprmTCellPadding:
    case SprmCodes.sprmTCellPaddingDefault: return setMeta('table', 'cellPadding', parseCssaOperand(bytes), raw, bytes);
    case SprmCodes.sprmTCellSpacingDefault: return setMeta('table', 'cellSpacing', parseCssaOperand(bytes), raw, bytes);
    case SprmCodes.sprmTCellWidth: return setMeta('table', 'cellWidth', parseRangeWidthOperand(bytes), raw, bytes);
    case SprmCodes.sprmTFitText: return setMeta('table', 'fitText', parseFixedRangeValueOperand(bytes), raw, bytes);
    case SprmCodes.sprmTFCellNoWrap: return setMeta('table', 'cellNoWrap', parseRangeValueOperand(bytes), raw, bytes);
    case SprmCodes.sprmTIstd: return setMeta('table', 'styleId', u16(bytes, 0), raw, bytes);
    default: {
      const kind: PropertyKind = group === 1 ? 'para' : group === 2 ? 'char' : group === 5 ? 'table' : 'unknown';
      return { kind, name: `sprm_${sprm.toString(16)}`, value: bytes, raw: sprm, operandBytes: bytes };
    }
  }
}

export function decodeGrpprl(buffer: Uint8Array, startOffset: number, endOffset: number): DecodedProperty[] {
  const properties: DecodedProperty[] = [];
  let offset = startOffset;
  while (offset + 2 <= endOffset) {
    const sprm = u16(buffer, offset);
    offset += 2;
    const operandLength = getSprmOperandLength(buffer, offset, sprm);
    if (!operandLength || offset + operandLength > endOffset) break;
    const bytes = buffer.subarray(offset, offset + operandLength);
    offset += operandLength;
    properties.push(decodeSprm(sprm, bytes));
  }
  return properties;
}
