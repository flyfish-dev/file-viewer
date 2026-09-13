import type {
  BinaryInspectorAnalysis,
  BinaryInspectorLimits,
  BinaryInspectorNode,
  BinaryInspectorTemplate,
} from './types.js';

interface ParseState {
  limits: BinaryInspectorLimits;
  startedAt: number;
  nodes: number;
}

const hex = (value: number | bigint) => `0x${value.toString(16).toUpperCase()}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const has = (bytes: Uint8Array, offset: number, width: number) => offset >= 0 && width >= 0 && offset + width <= bytes.byteLength;
const end = (bytes: Uint8Array, offset: number, width: number) => clamp(offset + width, 0, bytes.byteLength);
const starts = (bytes: Uint8Array, signature: readonly number[], offset = 0) => (
  has(bytes, offset, signature.length) && signature.every((value, index) => bytes[offset + index] === value)
);

const checkBudget = (state: ParseState) => {
  if (Date.now() - state.startedAt > state.limits.maxParseMilliseconds) {
    throw new Error(`Binary structure parsing exceeded ${state.limits.maxParseMilliseconds}ms.`);
  }
};

const add = (
  parent: BinaryInspectorNode,
  bytes: Uint8Array,
  state: ParseState,
  depth: number,
  name: string,
  type: string,
  offset: number,
  width: number,
  value?: string
) => {
  checkBudget(state);
  if (depth > state.limits.maxStructureDepth || state.nodes >= state.limits.maxStructureNodes) return undefined;
  const child: BinaryInspectorNode = {
    name,
    type,
    start: clamp(offset, 0, bytes.byteLength),
    end: end(bytes, offset, width),
    ...(value === undefined ? {} : { value }),
  };
  parent.children ??= [];
  parent.children.push(child);
  state.nodes += 1;
  return child;
};

const u16 = (view: DataView, bytes: Uint8Array, offset: number, littleEndian: boolean) => (
  has(bytes, offset, 2) ? view.getUint16(offset, littleEndian) : undefined
);
const u32 = (view: DataView, bytes: Uint8Array, offset: number, littleEndian: boolean) => (
  has(bytes, offset, 4) ? view.getUint32(offset, littleEndian) : undefined
);
const u64 = (view: DataView, bytes: Uint8Array, offset: number, littleEndian: boolean) => (
  has(bytes, offset, 8) ? view.getBigUint64(offset, littleEndian) : undefined
);

const field = (
  parent: BinaryInspectorNode,
  bytes: Uint8Array,
  state: ParseState,
  name: string,
  type: string,
  offset: number,
  width: number,
  value?: string
) => add(parent, bytes, state, 1, name, type, offset, width, value);

const inspectPng = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  field(root, bytes, state, 'PNG signature', 'bytes', 0, 8, '89 50 4E 47 0D 0A 1A 0A');
  const length = u32(view, bytes, 8, false);
  if (length !== undefined) field(root, bytes, state, 'Chunk length', 'u32be', 8, 4, String(length));
  const kind = has(bytes, 12, 4) ? String.fromCharCode(...bytes.slice(12, 16)) : undefined;
  if (kind) field(root, bytes, state, 'Chunk type', 'ascii', 12, 4, kind);
  if (kind === 'IHDR' && length !== undefined && length >= 13 && has(bytes, 16, 13)) {
    const header = add(root, bytes, state, 1, 'IHDR', 'structure', 16, 13);
    if (!header) return;
    const width = u32(view, bytes, 16, false);
    const height = u32(view, bytes, 20, false);
    if (width !== undefined) field(header, bytes, state, 'Width', 'u32be', 16, 4, String(width));
    if (height !== undefined) field(header, bytes, state, 'Height', 'u32be', 20, 4, String(height));
    field(header, bytes, state, 'Bit depth', 'u8', 24, 1, String(bytes[24]));
    field(header, bytes, state, 'Color type', 'u8', 25, 1, String(bytes[25]));
  }
};

const inspectWasm = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  field(root, bytes, state, 'WASM magic', 'bytes', 0, 4, '00 61 73 6D');
  const version = u32(view, bytes, 4, true);
  if (version !== undefined) field(root, bytes, state, 'Version', 'u32le', 4, 4, String(version));
};

const inspectElf = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  field(root, bytes, state, 'ELF magic', 'bytes', 0, 4, '7F 45 4C 46');
  const elfClass = bytes[4] === 2 ? 'ELF64' : bytes[4] === 1 ? 'ELF32' : 'unknown';
  const littleEndian = bytes[5] !== 2;
  field(root, bytes, state, 'Class', 'u8', 4, 1, elfClass);
  field(root, bytes, state, 'Data encoding', 'u8', 5, 1, littleEndian ? 'little-endian' : 'big-endian');
  const header = add(root, bytes, state, 1, 'ELF header', 'structure', 16, elfClass === 'ELF64' ? 48 : 36);
  if (!header) return;
  const type = u16(view, bytes, 16, littleEndian);
  const machine = u16(view, bytes, 18, littleEndian);
  if (type !== undefined) field(header, bytes, state, 'Type', littleEndian ? 'u16le' : 'u16be', 16, 2, hex(type));
  if (machine !== undefined) field(header, bytes, state, 'Machine', littleEndian ? 'u16le' : 'u16be', 18, 2, hex(machine));
  const entry = elfClass === 'ELF64' ? u64(view, bytes, 24, littleEndian) : u32(view, bytes, 24, littleEndian);
  if (entry !== undefined) field(header, bytes, state, 'Entry point', elfClass === 'ELF64' ? (littleEndian ? 'u64le' : 'u64be') : (littleEndian ? 'u32le' : 'u32be'), 24, elfClass === 'ELF64' ? 8 : 4, hex(entry));
};

const inspectPe = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  field(root, bytes, state, 'DOS magic', 'bytes', 0, 2, '4D 5A');
  const peOffset = u32(view, bytes, 0x3c, true);
  if (peOffset === undefined) return;
  field(root, bytes, state, 'PE header offset', 'u32le', 0x3c, 4, hex(peOffset));
  if (!starts(bytes, [0x50, 0x45, 0x00, 0x00], peOffset)) {
    field(root, bytes, state, 'PE signature', 'missing', peOffset, 4, 'Not present');
    return;
  }
  field(root, bytes, state, 'PE signature', 'bytes', peOffset, 4, '50 45 00 00');
  const coff = add(root, bytes, state, 1, 'COFF header', 'structure', peOffset + 4, 20);
  if (!coff) return;
  const machine = u16(view, bytes, peOffset + 4, true);
  const sections = u16(view, bytes, peOffset + 6, true);
  const optionalSize = u16(view, bytes, peOffset + 20, true);
  if (machine !== undefined) field(coff, bytes, state, 'Machine', 'u16le', peOffset + 4, 2, hex(machine));
  if (sections !== undefined) field(coff, bytes, state, 'Number of sections', 'u16le', peOffset + 6, 2, String(sections));
  if (optionalSize !== undefined) field(coff, bytes, state, 'Optional header size', 'u16le', peOffset + 20, 2, String(optionalSize));
  const optionalMagic = u16(view, bytes, peOffset + 24, true);
  if (optionalMagic !== undefined) field(root, bytes, state, 'Optional header magic', 'u16le', peOffset + 24, 2, hex(optionalMagic));
};

const inspectMachO = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  const magic = u32(view, bytes, 0, false);
  if (magic === undefined) return;
  const littleEndian = magic === 0xcefaedfe || magic === 0xcffaedfe;
  const is64 = magic === 0xfeedfacf || magic === 0xcffaedfe;
  field(root, bytes, state, 'Mach-O magic', 'u32', 0, 4, hex(magic));
  const header = add(root, bytes, state, 1, is64 ? 'Mach-O 64 header' : 'Mach-O 32 header', 'structure', 4, is64 ? 28 : 24);
  if (!header) return;
  const cpu = u32(view, bytes, 4, littleEndian);
  const fileType = u32(view, bytes, 12, littleEndian);
  const commands = u32(view, bytes, 16, littleEndian);
  if (cpu !== undefined) field(header, bytes, state, 'CPU type', littleEndian ? 'u32le' : 'u32be', 4, 4, hex(cpu));
  if (fileType !== undefined) field(header, bytes, state, 'File type', littleEndian ? 'u32le' : 'u32be', 12, 4, hex(fileType));
  if (commands !== undefined) field(header, bytes, state, 'Load commands', littleEndian ? 'u32le' : 'u32be', 16, 4, String(commands));
};

const inspectZip = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  const local = starts(bytes, [0x50, 0x4b, 0x03, 0x04]);
  field(root, bytes, state, 'ZIP signature', 'bytes', 0, 4, local ? 'local file header' : starts(bytes, [0x50, 0x4b, 0x05, 0x06]) ? 'end of central directory' : 'data descriptor');
  if (!local) return;
  const header = add(root, bytes, state, 1, 'Local file header', 'structure', 4, 26);
  if (!header) return;
  const version = u16(view, bytes, 4, true);
  const flags = u16(view, bytes, 6, true);
  const compression = u16(view, bytes, 8, true);
  const compressed = u32(view, bytes, 18, true);
  const filename = u16(view, bytes, 26, true);
  if (version !== undefined) field(header, bytes, state, 'Version needed', 'u16le', 4, 2, String(version));
  if (flags !== undefined) field(header, bytes, state, 'Flags', 'u16le', 6, 2, hex(flags));
  if (compression !== undefined) field(header, bytes, state, 'Compression', 'u16le', 8, 2, String(compression));
  if (compressed !== undefined) field(header, bytes, state, 'Compressed size', 'u32le', 18, 4, String(compressed));
  if (filename !== undefined) field(header, bytes, state, 'Filename length', 'u16le', 26, 2, String(filename));
};

const inspectJavaClass = (bytes: Uint8Array, view: DataView, state: ParseState, root: BinaryInspectorNode) => {
  field(root, bytes, state, 'Class magic', 'bytes', 0, 4, 'CA FE BA BE');
  const minor = u16(view, bytes, 4, false);
  const major = u16(view, bytes, 6, false);
  const constants = u16(view, bytes, 8, false);
  if (minor !== undefined) field(root, bytes, state, 'Minor version', 'u16be', 4, 2, String(minor));
  if (major !== undefined) field(root, bytes, state, 'Major version', 'u16be', 6, 2, String(major));
  if (constants !== undefined) field(root, bytes, state, 'Constant pool count', 'u16be', 8, 2, String(constants));
};

export const analyzeBinary = (bytes: Uint8Array, limits: BinaryInspectorLimits): BinaryInspectorAnalysis => {
  if (bytes.byteLength > limits.maxFileBytes) {
    throw new Error(`Binary input exceeds the configured ${limits.maxFileBytes} byte limit.`);
  }
  const state: ParseState = { limits, startedAt: Date.now(), nodes: 1 };
  const root: BinaryInspectorNode = { name: 'Raw bytes', type: 'binary', start: 0, end: bytes.byteLength, value: `${bytes.byteLength} bytes` };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let template: BinaryInspectorTemplate = 'raw';
  let label = 'Raw bytes';

  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    template = 'png'; label = 'PNG'; root.name = 'PNG structure'; inspectPng(bytes, view, state, root);
  } else if (starts(bytes, [0x00, 0x61, 0x73, 0x6d])) {
    template = 'wasm'; label = 'WebAssembly'; root.name = 'WebAssembly structure'; inspectWasm(bytes, view, state, root);
  } else if (starts(bytes, [0x7f, 0x45, 0x4c, 0x46])) {
    template = 'elf'; label = 'ELF'; root.name = 'ELF structure'; inspectElf(bytes, view, state, root);
  } else if (starts(bytes, [0x4d, 0x5a])) {
    template = 'pe'; label = 'PE/COFF'; root.name = 'PE/COFF structure'; inspectPe(bytes, view, state, root);
  } else if (starts(bytes, [0xfe, 0xed, 0xfa, 0xce]) || starts(bytes, [0xce, 0xfa, 0xed, 0xfe]) || starts(bytes, [0xfe, 0xed, 0xfa, 0xcf]) || starts(bytes, [0xcf, 0xfa, 0xed, 0xfe])) {
    template = 'macho'; label = 'Mach-O'; root.name = 'Mach-O structure'; inspectMachO(bytes, view, state, root);
  } else if (starts(bytes, [0x50, 0x4b, 0x03, 0x04]) || starts(bytes, [0x50, 0x4b, 0x05, 0x06]) || starts(bytes, [0x50, 0x4b, 0x07, 0x08])) {
    template = 'zip'; label = 'ZIP'; root.name = 'ZIP structure'; inspectZip(bytes, view, state, root);
  } else if (starts(bytes, [0xca, 0xfe, 0xba, 0xbe])) {
    template = 'java-class'; label = 'Java class'; root.name = 'Java class structure'; inspectJavaClass(bytes, view, state, root);
  }
  checkBudget(state);
  return { template, label, byteLength: bytes.byteLength, root };
};

export const formatBinaryByte = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();
