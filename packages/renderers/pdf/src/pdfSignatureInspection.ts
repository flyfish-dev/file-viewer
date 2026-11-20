import { registerFileViewerPdfSignatureReader, type FileViewerPdfSignatureDictionary } from '@file-viewer/core';
import { PDFArray, PDFContext, PDFDict, PDFHexString, PDFName, PDFNumber, PDFObjectParser, PDFParser, PDFRawStream, PDFRef, PDFString, decodePDFRawStream, type PDFObject } from 'pdf-lib';

// The optional peer is pinned to 1.17.1. Limits wrap individual parser instances,
// never library prototypes or the preview's PDF document/font-repair path.
const MAX_INPUT = 64 * 1024 * 1024;
const MAX_STREAM = 4 * 1024 * 1024;
const MAX_DECODED = 16 * 1024 * 1024;
const MAX_OBJECTS = 50000;
const MAX_NODES = 200000;
const MAX_DEPTH = 64;
const MAX_SIGNATURES = 64;
const name = (key: string) => PDFName.of(key);
const cursor = (parser: PDFObjectParser) => (parser as unknown as { bytes: { offset(): number } }).bytes.offset();

/** Explicit opt-in: importing the normal PDF renderer never requires pdf-lib. */
export const enableFileViewerPdfSignatureInspection = () => registerFileViewerPdfSignatureReader(readPdfSignatureDictionaries);

export const readPdfSignatureDictionaries = async (bytes: Uint8Array, signal: AbortSignal): Promise<{ signatures: FileViewerPdfSignatureDictionary[]; warnings: string[] }> => {
  if (!bytes.length || bytes.length > MAX_INPUT) throw new Error('PDF signature inspection input exceeds its boundary.');
  const deadline = Date.now() + 20000;
  let objects = 0, nodes = 0, decodedBytes = 0;
  const guard = () => {
    if (signal.aborted) throw signal.reason || new Error('PDF metadata inspection cancelled.');
    if (Date.now() > deadline) throw new Error('PDF metadata inspection timed out.');
    if (objects > MAX_OBJECTS || nodes > MAX_NODES) throw new Error('PDF metadata object/node limit exceeded.');
  };
  const candidates: Array<{ ref: string; dictionary: PDFDict; sequence: number }> = [];
  const captured = new WeakMap<PDFDict, typeof candidates[number]>();
  const capture = (dictionary: PDFDict, ref?: PDFRef) => {
    if (!dictionary.has(name('ByteRange')) && dictionary.get(name('Type')) !== name('Sig')) return;
    const previous = captured.get(dictionary);
    if (previous) { if (ref) previous.ref = ref.toString(); return; }
    if (candidates.length >= MAX_SIGNATURES) throw new Error('PDF signature dictionary count exceeds its limit.');
    const candidate = { ref: ref?.toString() || 'direct dictionary', dictionary, sequence: candidates.length + 1 };
    captured.set(dictionary, candidate); candidates.push(candidate);
  };
  const parser = PDFParser.forBytesWithOptions(bytes, 25, true);
  const context = (parser as unknown as { context: PDFContext }).context;
  const assign = context.assign.bind(context);
  context.assign = (ref, object) => {
    objects++; guard();
    if (object instanceof PDFDict) capture(object, ref);
    assign(ref, object);
  };
  const number = (object: PDFObject | undefined, max: number) => {
    if (!(object instanceof PDFNumber)) throw new Error('Unsupported indirect or non-numeric PDF metadata parameter.');
    const value = object.asNumber();
    if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error('PDF metadata numeric parameter exceeds its boundary.');
    return value;
  };
  const trailingWhitespace = (source: Uint8Array, offset: number) => {
    while (offset < source.length) {
      const value = source[offset++]!;
      if ([0, 9, 10, 12, 13, 32].includes(value)) continue;
      if (value === 37) { while (offset < source.length && source[offset] !== 10 && source[offset] !== 13) offset++; continue; }
      throw new Error('Unsupported trailing tokens in a PDF object stream.');
    }
  };
  const decodedStream = (stream: PDFRawStream) => {
    const filter = stream.dict.get(name('Filter'));
    if (filter && (!(filter instanceof PDFName) || !['FlateDecode', 'Fl'].includes(filter.decodeText()))) throw new Error('PDF metadata supports only a single bounded FlateDecode structural stream filter.');
    const decoded = decodePDFRawStream(stream) as ReturnType<typeof decodePDFRawStream> & { ensureBuffer?: (length: number) => Uint8Array };
    if (decoded.ensureBuffer) {
      const ensure = decoded.ensureBuffer.bind(decoded);
      decoded.ensureBuffer = length => {
        guard();
        if (length > MAX_STREAM + 1) throw new Error('Decoded PDF structural stream exceeds its limit.');
        return ensure(length);
      };
    }
    const output = decoded.getBytes(MAX_STREAM + 1);
    decodedBytes += output.length;
    if (output.length > MAX_STREAM || decodedBytes > MAX_DECODED || output.length > Math.max(1, stream.contents.length) * 200) throw new Error('PDF structural stream expansion exceeds its boundary.');
    return new Uint8Array(output.buffer, output.byteOffset, output.byteLength);
  };
  const boundedParser = (reader: PDFObjectParser, allowStreams: boolean) => {
    const parse = reader.parseObject.bind(reader);
    let depth = 0;
    reader.parseObject = () => {
      nodes++; guard();
      if (++depth > MAX_DEPTH) { depth--; throw new Error('PDF metadata nesting limit exceeded.'); }
      try {
        const object = parse();
        if (object instanceof PDFDict) capture(object);
        if (!(object instanceof PDFRawStream)) return object;
        if (!allowStreams) throw new Error('Nested streams in a PDF object stream are unsupported.');
        const type = object.dict.get(name('Type'));
        // PDFParser.lookup(Type) would otherwise dereference this and invoke
        // its own unbounded ObjStm/XRef decoder after our direct-name branch.
        if (type instanceof PDFRef) throw new Error('Indirect PDF stream Type is unsupported for bounded metadata inspection.');
        if (type !== name('ObjStm') && type !== name('XRef')) return object;
        if (type === name('XRef')) {
          // The bounded sequential parser already records source objects. Offset
          // tables cannot contribute signature metadata, so do not inflate or
          // iterate attacker-controlled xref counts merely to inspect signatures.
          for (const key of ['Root', 'Encrypt', 'Info', 'ID'] as const) {
            const value = object.dict.get(name(key));
            if (value) context.trailerInfo[key] = value;
          }
          return object.dict;
        }
        const decoded = decodedStream(object);
        if (type === name('ObjStm')) {
          const count = number(object.dict.get(name('N')), 1024);
          const first = number(object.dict.get(name('First')), decoded.length);
          const header = boundedParser(PDFObjectParser.forBytes(decoded.subarray(0, first), context), false);
          const entries: Array<{ number: number; offset: number }> = [];
          const seen = new Set<number>();
          for (let index = 0; index < count; index++) {
            const objectNumber = number(header.parseObject(), 0x7fffffff);
            const offset = number(header.parseObject(), decoded.length - first);
            if (!objectNumber || seen.has(objectNumber) || (index && offset < entries[index - 1]!.offset)) throw new Error('Unsupported duplicate or unordered PDF object-stream entries.');
            seen.add(objectNumber); entries.push({ number: objectNumber, offset });
          }
          trailingWhitespace(decoded.subarray(0, first), cursor(header));
          for (let index = 0; index < entries.length; index++) {
            guard();
            const entry = entries[index]!;
            const part = decoded.subarray(first + entry.offset, first + (entries[index + 1]?.offset ?? decoded.length - first));
            const nested = boundedParser(PDFObjectParser.forBytes(part, context), false);
            const value = nested.parseObject();
            trailingWhitespace(part, cursor(nested));
            context.assign(PDFRef.of(entry.number, 0), value);
          }
          // This structural stream is already decoded and parsed under the same
          // per-document budgets. Do not let PDFParser decode it a second time.
          return object.dict;
        }
        return object.dict;
      } finally { depth--; }
    };
    return reader;
  };
  boundedParser(parser, true);
  try { await parser.parseDocument(); }
  catch (error) { if (signal.aborted) throw signal.reason || new Error('PDF metadata inspection cancelled.'); throw error; }
  guard();
  if (context.trailerInfo.Encrypt) throw new Error('Encrypted PDF metadata is unsupported; no decryption was performed.');
  const signatures: FileViewerPdfSignatureDictionary[] = [];
  const text = (object: PDFObject | undefined) => {
    if (object instanceof PDFName) return object.decodeText();
    if (object instanceof PDFString || object instanceof PDFHexString) {
      if (object.asBytes().length > 32768) throw new Error('PDF signature text field exceeds its limit.');
      return object.decodeText();
    }
    return undefined;
  };
  for (const candidate of candidates) {
    guard();
    const dictionary = candidate.dictionary;
    const contentsObject = dictionary.get(name('Contents'));
    const contents = contentsObject instanceof PDFString || contentsObject instanceof PDFHexString ? contentsObject.asBytes() : undefined;
    const rangeObject = dictionary.get(name('ByteRange'));
    // Blank, unsigned signature widgets are not signed documents.
    if ((!contents?.length || contents.every(value => value === 0)) && (!rangeObject || (rangeObject instanceof PDFArray && rangeObject.asArray().every(value => value instanceof PDFNumber && value.asNumber() === 0)))) continue;
    if (!contentsObject && !rangeObject) continue;
    if (contents && contents.length > 8 * 1024 * 1024) throw new Error('PDF CMS contents exceed the metadata limit.');
    const warnings: string[] = [];
    let byteRange: number[] | undefined;
    if (rangeObject instanceof PDFArray && rangeObject.size() >= 4 && rangeObject.size() <= 16 && rangeObject.size() % 2 === 0) {
      try {
        const ranges = rangeObject.asArray().map(value => number(value, bytes.length));
        let end = 0;
        if (ranges[0] !== 0) throw new Error('ByteRange does not start at the original source.');
        for (let index = 0; index < ranges.length; index += 2) {
          const start = ranges[index]!, length = ranges[index + 1]!;
          if (start < end || start + length > bytes.length) throw new Error('ByteRange is outside the source or overlaps.');
          end = start + length;
        }
        byteRange = ranges;
      } catch { warnings.push('ByteRange is unsupported or incomplete; signature validity is not checked.'); }
    } else warnings.push('ByteRange is missing or unsupported; signature validity is not checked.');
    if (!contents) warnings.push('Direct CMS contents are missing or unsupported.');
    const revisionEnd = byteRange ? byteRange[byteRange.length - 2]! + byteRange[byteRange.length - 1]! : undefined;
    signatures.push({
      id: `${candidate.ref} / source definition ${candidate.sequence}`, contents, byteRange, revisionEnd,
      fields: Object.fromEntries(['Filter', 'SubFilter', 'Name', 'M', 'Reason', 'Location', 'ContactInfo'].map(key => [key, text(dictionary.get(name(key)))])),
      warnings: [...warnings, 'Original-source dictionary metadata only; active-field ownership, signed revision coverage and integrity were not verified.', ...(revisionEnd !== undefined && revisionEnd < bytes.length ? ['Bytes follow the declared ByteRange; later changes were not checked.'] : [])],
    });
  }
  return { signatures, warnings: [] };
};
