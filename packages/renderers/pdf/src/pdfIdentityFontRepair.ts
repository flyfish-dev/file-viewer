import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFString,
} from 'pdf-lib';
import { normalizePdfIdentityFontFamily } from './pdfIdentityFontName.js';

const MAX_REPAIR_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_TTF_TABLES = 256;
const MAX_CMAP_GLYPHS = 0xffff;
const MAX_CMAP_CODEPOINT_VISITS = 0x10000;
const MAX_DECODED_FONT_BYTES = 64 * 1024 * 1024;
const CMAP_BFCHAR_CHUNK_SIZE = 100;

const BASE_FONT = PDFName.of('BaseFont');
const CID_TO_GID_MAP = PDFName.of('CIDToGIDMap');
const DESCENDANT_FONTS = PDFName.of('DescendantFonts');
const ENCODING = PDFName.of('Encoding');
const FONT = PDFName.of('Font');
const FONT_DESCRIPTOR = PDFName.of('FontDescriptor');
const FONT_FAMILY = PDFName.of('FontFamily');
const FONT_FILE_2 = PDFName.of('FontFile2');
const LENGTH_1 = PDFName.of('Length1');
const RESOURCES = PDFName.of('Resources');
const SUBTYPE = PDFName.of('Subtype');
const TO_UNICODE = PDFName.of('ToUnicode');
const X_OBJECT = PDFName.of('XObject');

const CJK_FONT_FAMILY_ALIASES: Readonly<Record<string, string>> = {
  '微软雅黑': 'microsoftyahei',
  '宋体': 'simsun',
  '黑体': 'simhei',
  '楷体': 'kaiti',
  '仿宋': 'fangsong',
};

const CJK_FONT_FAMILY_MARKERS = [
  'microsoftyahei',
  'simsun',
  'nsimsun',
  'simhei',
  'kaiti',
  'fangsong',
  'pingfang',
  'songti',
  'heiti',
  'hiragino',
  'notosanscjk',
  'sourcehansans',
  'sourcehanserif',
];

type FontRecord = {
  font: PDFDict;
  descendant: PDFDict;
  familyKeys: Set<string>;
  baseFont: string;
  identityCidToGidMap: boolean;
  embeddedFont?: PDFRawStream;
};

export type PdfIdentityFontRepairResult = {
  bytes: Uint8Array;
  repairedFonts: number;
  repairedFamilies: string[];
};

const readUint16 = (bytes: Uint8Array, offset: number) => {
  if (offset < 0 || offset + 2 > bytes.length) {
    throw new Error('Unexpected end of TrueType font data.');
  }
  return (bytes[offset] << 8) | bytes[offset + 1];
};

const readUint32 = (bytes: Uint8Array, offset: number) => {
  if (offset < 0 || offset + 4 > bytes.length) {
    throw new Error('Unexpected end of TrueType font data.');
  }
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  ) >>> 0;
};

const readTag = (bytes: Uint8Array, offset: number) => {
  if (offset < 0 || offset + 4 > bytes.length) {
    return '';
  }
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );
};

const normalizeFontFamily = (value: string) => {
  const normalized = normalizePdfIdentityFontFamily(value);
  return CJK_FONT_FAMILY_ALIASES[normalized] || normalized;
};

const isCjkFontFamily = (family: string) => {
  const key = normalizeFontFamily(family);
  return CJK_FONT_FAMILY_MARKERS.some(marker => key.includes(marker)) ||
    /[\u3400-\u9fff]/.test(family);
};

const readFontName = (font: PDFDict) => {
  return font.lookupMaybe(BASE_FONT, PDFName)?.decodeText() || '';
};

const readFontFamily = (descriptor: PDFDict | undefined) => {
  if (!descriptor) {
    return '';
  }
  return descriptor.lookupMaybe(FONT_FAMILY, PDFString, PDFHexString)?.decodeText() || '';
};

const getDescendantFont = (font: PDFDict) => {
  return font.lookupMaybe(DESCENDANT_FONTS, PDFArray)?.lookupMaybe(0, PDFDict);
};

const getEmbeddedTrueTypeFont = (descriptor: PDFDict | undefined) => {
  if (!descriptor) {
    return undefined;
  }
  const fontFile = descriptor.get(FONT_FILE_2);
  if (!fontFile) {
    return undefined;
  }
  const resolved = descriptor.context.lookup(fontFile);
  if (!(resolved instanceof PDFRawStream)) {
    return undefined;
  }
  const declaredLength = resolved.dict.lookupMaybe(LENGTH_1, PDFNumber)?.asNumber();
  if (
    typeof declaredLength !== 'number' ||
    !Number.isSafeInteger(declaredLength) ||
    declaredLength < 1 ||
    declaredLength > MAX_DECODED_FONT_BYTES ||
    resolved.contents.byteLength > MAX_DECODED_FONT_BYTES
  ) {
    return undefined;
  }
  return resolved;
};

const createFontRecord = (font: PDFDict): FontRecord | null => {
  const descendant = getDescendantFont(font);
  if (!descendant) {
    return null;
  }
  const encoding = font.lookupMaybe(ENCODING, PDFName)?.decodeText();
  if (encoding !== 'Identity-H' && encoding !== 'Identity-V') {
    return null;
  }
  const descriptor = descendant.lookupMaybe(FONT_DESCRIPTOR, PDFDict);
  const baseFont = readFontName(font);
  const descriptorFamily = readFontFamily(descriptor);
  const cidToGidMapObject = descendant.get(CID_TO_GID_MAP);
  const cidToGidMap = cidToGidMapObject
    ? descendant.context.lookup(cidToGidMapObject)
    : undefined;
  const familyKeys = new Set(
    [baseFont, descriptorFamily]
      .filter(Boolean)
      .map(normalizeFontFamily)
      .filter(Boolean)
  );
  return {
    font,
    descendant,
    familyKeys,
    baseFont,
    identityCidToGidMap: !cidToGidMap ||
      (cidToGidMap instanceof PDFName && cidToGidMap.decodeText() === 'Identity'),
    embeddedFont: getEmbeddedTrueTypeFont(descriptor),
  };
};

const collectFontRecords = (pdfDocument: PDFDocument) => {
  const records = new Map<PDFDict, FontRecord>();
  const visitedResources = new Set<PDFDict>();
  const visitedXObjects = new Set<PDFRawStream>();

  const visitResources = (resources: PDFDict | undefined) => {
    if (!resources || visitedResources.has(resources)) {
      return;
    }
    visitedResources.add(resources);

    const fonts = resources.lookupMaybe(FONT, PDFDict);
    for (const fontObject of fonts?.values() || []) {
      const font = pdfDocument.context.lookup(fontObject);
      if (!(font instanceof PDFDict) || records.has(font)) {
        continue;
      }
      const record = createFontRecord(font);
      if (record) {
        records.set(font, record);
      }
    }

    const xObjects = resources.lookupMaybe(X_OBJECT, PDFDict);
    for (const xObjectRef of xObjects?.values() || []) {
      const xObject = pdfDocument.context.lookup(xObjectRef);
      if (!(xObject instanceof PDFRawStream) || visitedXObjects.has(xObject)) {
        continue;
      }
      visitedXObjects.add(xObject);
      if (xObject.dict.lookupMaybe(SUBTYPE, PDFName)?.decodeText() !== 'Form') {
        continue;
      }
      visitResources(xObject.dict.lookupMaybe(RESOURCES, PDFDict));
    }
  };

  for (const page of pdfDocument.getPages()) {
    visitResources(page.node.Resources());
  }
  return [...records.values()];
};

type CmapTable = {
  offset: number;
  format: 4 | 12;
  platformId: number;
  encodingId: number;
};

const findCmapTable = (fontBytes: Uint8Array): CmapTable => {
  if (fontBytes.length < 12) {
    throw new Error('Invalid TrueType font header.');
  }
  const tableCount = readUint16(fontBytes, 4);
  if (tableCount < 1 || tableCount > MAX_TTF_TABLES) {
    throw new Error(`Invalid TrueType table count: ${tableCount}.`);
  }
  let cmapOffset = -1;
  for (let index = 0; index < tableCount; index += 1) {
    const entryOffset = 12 + index * 16;
    if (entryOffset + 16 > fontBytes.length) {
      throw new Error('Invalid TrueType table directory.');
    }
    if (readTag(fontBytes, entryOffset) === 'cmap') {
      cmapOffset = readUint32(fontBytes, entryOffset + 8);
      break;
    }
  }
  if (cmapOffset < 0 || cmapOffset + 4 > fontBytes.length) {
    throw new Error('TrueType font does not contain a readable cmap table.');
  }

  const cmapCount = readUint16(fontBytes, cmapOffset + 2);
  const tables: CmapTable[] = [];
  for (let index = 0; index < cmapCount; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    if (recordOffset + 8 > fontBytes.length) {
      break;
    }
    const offset = cmapOffset + readUint32(fontBytes, recordOffset + 4);
    if (offset + 2 > fontBytes.length) {
      continue;
    }
    const format = readUint16(fontBytes, offset);
    if (format === 4 || format === 12) {
      tables.push({
        offset,
        format,
        platformId: readUint16(fontBytes, recordOffset),
        encodingId: readUint16(fontBytes, recordOffset + 2),
      });
    }
  }
  const score = (table: CmapTable) =>
    (table.format === 12 ? 100 : 0) +
    (table.platformId === 3 ? 20 : 0) +
    (table.platformId === 0 ? 10 : 0) +
    (table.encodingId === 10 ? 4 : 0) +
    (table.encodingId === 1 ? 2 : 0);
  const selected = tables.sort((left, right) => score(right) - score(left))[0];
  if (!selected) {
    throw new Error('TrueType font does not contain a supported Unicode cmap.');
  }
  return selected;
};

const setGlyphMapping = (
  map: Map<number, number>,
  glyphId: number,
  codePoint: number
) => {
  if (
    glyphId > 0 &&
    glyphId <= MAX_CMAP_GLYPHS &&
    codePoint > 0 &&
    codePoint <= 0x10ffff &&
    !map.has(glyphId)
  ) {
    map.set(glyphId, codePoint);
  }
};

const parseFormat12Cmap = (
  fontBytes: Uint8Array,
  table: CmapTable,
  glyphToUnicode: Map<number, number>
) => {
  const tableLength = readUint32(fontBytes, table.offset + 4);
  const tableEnd = table.offset + tableLength;
  const groupCount = readUint32(fontBytes, table.offset + 12);
  if (
    tableLength < 16 ||
    tableEnd > fontBytes.length ||
    table.offset + 16 + groupCount * 12 > tableEnd
  ) {
    throw new Error('Invalid TrueType cmap format 12 groups.');
  }
  let visitedCodePoints = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const offset = table.offset + 16 + index * 12;
    const startCodePoint = readUint32(fontBytes, offset);
    const endCodePoint = readUint32(fontBytes, offset + 4);
    const startGlyphId = readUint32(fontBytes, offset + 8);
    const length = Math.min(
      endCodePoint - startCodePoint + 1,
      MAX_CMAP_GLYPHS - startGlyphId + 1
    );
    if (!Number.isSafeInteger(length) || length < 1) {
      continue;
    }
    for (let innerIndex = 0; innerIndex < length; innerIndex += 1) {
      if (visitedCodePoints >= MAX_CMAP_CODEPOINT_VISITS) {
        return;
      }
      visitedCodePoints += 1;
      setGlyphMapping(
        glyphToUnicode,
        startGlyphId + innerIndex,
        startCodePoint + innerIndex
      );
    }
  }
};

const parseFormat4Cmap = (
  fontBytes: Uint8Array,
  table: CmapTable,
  glyphToUnicode: Map<number, number>
) => {
  const tableLength = readUint16(fontBytes, table.offset + 2);
  const tableEnd = table.offset + tableLength;
  const segmentCount = readUint16(fontBytes, table.offset + 6) / 2;
  const endCodesOffset = table.offset + 14;
  const startCodesOffset = endCodesOffset + segmentCount * 2 + 2;
  const deltasOffset = startCodesOffset + segmentCount * 2;
  const rangeOffsetsOffset = deltasOffset + segmentCount * 2;
  if (
    !Number.isInteger(segmentCount) ||
    segmentCount < 1 ||
    tableLength < 16 ||
    tableEnd > fontBytes.length ||
    rangeOffsetsOffset + segmentCount * 2 > tableEnd
  ) {
    throw new Error('Invalid TrueType cmap format 4 segments.');
  }

  let visitedCodePoints = 0;
  for (let index = 0; index < segmentCount; index += 1) {
    const endCodePoint = readUint16(fontBytes, endCodesOffset + index * 2);
    const startCodePoint = readUint16(fontBytes, startCodesOffset + index * 2);
    const delta = readUint16(fontBytes, deltasOffset + index * 2);
    const rangeOffset = readUint16(fontBytes, rangeOffsetsOffset + index * 2);
    if (endCodePoint < startCodePoint) {
      continue;
    }
    for (
      let codePoint = startCodePoint;
      codePoint <= endCodePoint && codePoint !== 0xffff;
      codePoint += 1
    ) {
      if (visitedCodePoints >= MAX_CMAP_CODEPOINT_VISITS) {
        return;
      }
      visitedCodePoints += 1;
      let glyphId = 0;
      if (rangeOffset === 0) {
        glyphId = (codePoint + delta) & 0xffff;
      } else {
        const glyphOffset =
          rangeOffsetsOffset + index * 2 + rangeOffset +
          (codePoint - startCodePoint) * 2;
        if (glyphOffset + 2 <= tableEnd) {
          glyphId = readUint16(fontBytes, glyphOffset);
          if (glyphId) {
            glyphId = (glyphId + delta) & 0xffff;
          }
        }
      }
      setGlyphMapping(glyphToUnicode, glyphId, codePoint);
    }
  }
};

const parseTrueTypeGlyphToUnicode = (fontBytes: Uint8Array) => {
  const selected = findCmapTable(fontBytes);
  const glyphToUnicode = new Map<number, number>();
  if (selected.format === 12) {
    parseFormat12Cmap(fontBytes, selected, glyphToUnicode);
  } else {
    parseFormat4Cmap(fontBytes, selected, glyphToUnicode);
  }
  return glyphToUnicode;
};

const toHex = (value: number, minLength = 4) =>
  value.toString(16).toUpperCase().padStart(minLength, '0');

const encodeUnicodeCodePoint = (codePoint: number) => {
  if (codePoint <= 0xffff) {
    return toHex(codePoint);
  }
  const offset = codePoint - 0x10000;
  const highSurrogate = 0xd800 + (offset >> 10);
  const lowSurrogate = 0xdc00 + (offset & 0x3ff);
  return `${toHex(highSurrogate)}${toHex(lowSurrogate)}`;
};

const createToUnicodeCmap = (glyphToUnicode: Map<number, number>) => {
  const entries = [...glyphToUnicode]
    .filter(([glyphId, codePoint]) =>
      glyphId > 0 && glyphId <= 0xffff &&
      codePoint > 0 && codePoint <= 0x10ffff
    )
    .sort(([left], [right]) => left - right);
  const sections: string[] = [];
  for (let index = 0; index < entries.length; index += CMAP_BFCHAR_CHUNK_SIZE) {
    const chunk = entries.slice(index, index + CMAP_BFCHAR_CHUNK_SIZE);
    sections.push([
      `${chunk.length} beginbfchar`,
      ...chunk.map(([glyphId, codePoint]) =>
        `<${toHex(glyphId)}> <${encodeUnicodeCodePoint(codePoint)}>`
      ),
      'endbfchar',
    ].join('\n'));
  }
  return [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    ...sections,
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end',
  ].join('\n');
};

const familiesOverlap = (left: Set<string>, right: Set<string>) => {
  for (const key of left) {
    if (right.has(key)) {
      return true;
    }
  }
  return false;
};

export const repairMalformedIdentityCjkFonts = async (
  sourceBytes: Uint8Array,
  candidateFamilies: readonly string[] = []
): Promise<PdfIdentityFontRepairResult> => {
  if (!sourceBytes.byteLength || sourceBytes.byteLength > MAX_REPAIR_SOURCE_BYTES) {
    return { bytes: sourceBytes, repairedFonts: 0, repairedFamilies: [] };
  }

  const candidateKeys = new Set(
    candidateFamilies.map(normalizeFontFamily).filter(Boolean)
  );
  const pdfDocument = await PDFDocument.load(sourceBytes, {
    updateMetadata: false,
  });
  const records = collectFontRecords(pdfDocument);
  const sourceMaps = new Map<FontRecord, Map<number, number>>();

  const getSourceMap = (record: FontRecord) => {
    const cached = sourceMaps.get(record);
    if (cached) {
      return cached;
    }
    if (!record.embeddedFont) {
      return undefined;
    }
    const decoded = decodePDFRawStream(record.embeddedFont).decode();
    if (decoded.byteLength > MAX_DECODED_FONT_BYTES) {
      throw new Error('Embedded TrueType font exceeds the Identity repair limit.');
    }
    const glyphMap = parseTrueTypeGlyphToUnicode(decoded);
    sourceMaps.set(record, glyphMap);
    return glyphMap;
  };

  let repairedFonts = 0;
  const repairedFamilies = new Set<string>();
  for (const target of records) {
    if (
      target.font.has(TO_UNICODE) ||
      target.embeddedFont ||
      !target.identityCidToGidMap ||
      ![...target.familyKeys].some(key => isCjkFontFamily(key)) ||
      (candidateKeys.size > 0 && ![...target.familyKeys].some(key => candidateKeys.has(key)))
    ) {
      continue;
    }

    let bestMap: Map<number, number> | undefined;
    for (const source of records) {
      if (!source.embeddedFont || !familiesOverlap(target.familyKeys, source.familyKeys)) {
        continue;
      }
      try {
        const sourceMap = getSourceMap(source);
        if (sourceMap && (!bestMap || sourceMap.size > bestMap.size)) {
          bestMap = sourceMap;
        }
      } catch {
        // A different same-family embedded font may still provide a valid cmap.
      }
    }
    if (!bestMap || bestMap.size < 2) {
      continue;
    }

    const cmap = createToUnicodeCmap(bestMap);
    const cmapRef = pdfDocument.context.register(pdfDocument.context.flateStream(cmap));
    target.font.set(TO_UNICODE, cmapRef);
    repairedFonts += 1;
    repairedFamilies.add(target.baseFont || [...target.familyKeys][0] || 'CJK font');
  }

  if (!repairedFonts) {
    return { bytes: sourceBytes, repairedFonts: 0, repairedFamilies: [] };
  }
  return {
    bytes: await pdfDocument.save({ useObjectStreams: true }),
    repairedFonts,
    repairedFamilies: [...repairedFamilies],
  };
};
