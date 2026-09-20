/** Bounded structural validation before handing an untrusted CFB to MsgReader.
 * MS-CFB: header, FAT/DIFAT, directory and MiniFAT. This is not a second MSG parser.
 */
export const MAX_MSG_BYTES = 128 * 1024 * 1024;
const END = 0xfffffffe;
const FREE = 0xffffffff;
const MAX_DIRECTORY_ENTRIES = 32768;
const MAX_STORAGE_DEPTH = 24;
const MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export function inspectMsgContainer(buffer: ArrayBuffer): { messageCodepage?: number } {
  const fail = (reason: string): never => { throw new Error(`Invalid Outlook MSG: ${reason}`); };
  if (buffer.byteLength < 512 || buffer.byteLength > MAX_MSG_BYTES) fail('source size limit');
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (!MAGIC.every((value, index) => bytes[index] === value)) fail('missing CFB signature');
  const version = view.getUint16(26, true);
  const shift = view.getUint16(30, true);
  if (view.getUint16(28, true) !== 0xfffe || !((version === 3 && shift === 9) || (version === 4 && shift === 12)) || view.getUint16(32, true) !== 6) fail('unsupported CFB header');
  const sectorSize = 2 ** shift;
  if (bytes.length % sectorSize || bytes.length < sectorSize * 2) fail('truncated sector');
  const sectorCount = bytes.length / sectorSize - 1;
  const sectorOffset = (sector: number) => {
    if (!Number.isInteger(sector) || sector < 0 || sector >= sectorCount) fail('sector out of bounds');
    return (sector + 1) * sectorSize;
  };
  const fatCount = view.getUint32(44, true);
  const difatCount = view.getUint32(72, true);
  if (!fatCount || fatCount > sectorCount || difatCount > sectorCount) fail('invalid allocation table count');
  const reserved = new Set<number>();
  const fatSectors: number[] = [];
  const addFat = (sector: number) => {
    if (sector === FREE) return;
    sectorOffset(sector);
    if (reserved.has(sector)) fail('duplicate FAT/DIFAT sector');
    reserved.add(sector);
    fatSectors.push(sector);
  };
  for (let index = 0; index < 109; index++) addFat(view.getUint32(76 + index * 4, true));
  let difat = view.getUint32(68, true);
  for (let index = 0; index < difatCount; index++) {
    const start = sectorOffset(difat);
    if (reserved.has(difat)) fail('cyclic DIFAT');
    reserved.add(difat);
    for (let offset = 0; offset < sectorSize - 4; offset += 4) addFat(view.getUint32(start + offset, true));
    difat = view.getUint32(start + sectorSize - 4, true);
  }
  if (difatCount && difat !== END) fail('unterminated DIFAT');
  if (fatSectors.length !== fatCount || fatCount * (sectorSize / 4) < sectorCount) fail('incomplete FAT');
  const fat = new Uint32Array(fatCount * (sectorSize / 4));
  fatSectors.forEach((sector, index) => {
    const start = sectorOffset(sector);
    for (let offset = 0; offset < sectorSize / 4; offset++) fat[index * (sectorSize / 4) + offset] = view.getUint32(start + offset * 4, true);
  });
  const claimed = new Set(reserved);
  const chain = (start: number, table: Uint32Array, limit: number, owners: Set<number>, maxLength = limit) => {
    const result: number[] = [];
    for (let sector = start; sector !== END;) {
      if (sector >= limit || sector >= table.length || owners.has(sector) || result.length >= maxLength) fail('cyclic, shared or out-of-range allocation chain');
      owners.add(sector);
      result.push(sector);
      sector = table[sector];
    }
    return result;
  };
  const directory = chain(view.getUint32(48, true), fat, sectorCount, claimed, Math.ceil(MAX_DIRECTORY_ENTRIES * 128 / sectorSize));
  if (!directory.length) fail('missing directory');
  const dirBytes = new Uint8Array(directory.length * sectorSize);
  directory.forEach((sector, index) => dirBytes.set(bytes.subarray(sectorOffset(sector), sectorOffset(sector) + sectorSize), index * sectorSize));
  const dir = new DataView(dirBytes.buffer);
  const count = dirBytes.length / 128;
  const decoder = new TextDecoder('utf-16le');
  const entries = Array.from({ length: count }, (_, id) => {
    const offset = id * 128;
    const type = dir.getUint8(offset + 66);
    const length = dir.getUint16(offset + 64, true);
    if (type && (!([1, 2, 5].includes(type)) || length < 2 || length > 64 || length % 2)) fail('invalid directory entry');
    const low = dir.getUint32(offset + 120, true);
    const high = version === 4 ? dir.getUint32(offset + 124, true) : 0;
    const size = low + high * 2 ** 32;
    if ((type === 2 || type === 5) && size > MAX_MSG_BYTES) fail('stream size limit');
    return {
      id, type, size,
      name: type ? decoder.decode(dirBytes.subarray(offset, offset + length - 2)) : '',
      left: dir.getUint32(offset + 68, true),
      right: dir.getUint32(offset + 72, true),
      child: dir.getUint32(offset + 76, true),
      start: dir.getUint32(offset + 116, true),
    };
  });
  const root = entries[0];
  if (root.type !== 5) fail('missing root storage');
  const miniCount = view.getUint32(64, true);
  if (miniCount > sectorCount || view.getUint32(56, true) !== 4096) fail('invalid MiniFAT header');
  const miniFatChain = miniCount ? chain(view.getUint32(60, true), fat, sectorCount, claimed) : [];
  if (miniFatChain.length !== miniCount) fail('incomplete MiniFAT');
  const miniFat = new Uint32Array(miniCount * (sectorSize / 4));
  miniFatChain.forEach((sector, index) => {
    const start = sectorOffset(sector);
    for (let offset = 0; offset < sectorSize / 4; offset++) miniFat[index * (sectorSize / 4) + offset] = view.getUint32(start + offset * 4, true);
  });
  const miniStream = root.size ? chain(root.start, fat, sectorCount, claimed) : [];
  if (miniStream.length * sectorSize < root.size) fail('truncated mini stream');
  const miniClaimed = new Set<number>();
  const visited = new Set<number>([0]);
  const stack = [{ id: root.child, depth: 1, parent: 0 }];
  let properties: Uint8Array | undefined;
  while (stack.length) {
    const next = stack.pop()!;
    if (next.id === FREE) continue;
    if (next.id >= count || visited.has(next.id) || next.depth > MAX_STORAGE_DEPTH) fail('cyclic directory or nested storage limit');
    visited.add(next.id);
    const item = entries[next.id];
    if (item.type !== 1 && item.type !== 2) fail('invalid child entry');
    stack.push({ ...next, id: item.left }, { ...next, id: item.right });
    if (item.type === 1) {
      stack.push({ id: item.child, depth: next.depth + 1, parent: item.id });
      continue;
    }
    const small = item.size < 4096;
    const sectors = item.size ? chain(item.start, small ? miniFat : fat, small ? Math.ceil(root.size / 64) : sectorCount, small ? miniClaimed : claimed) : [];
    const width = small ? 64 : sectorSize;
    if (sectors.length * width < item.size) fail('truncated property or attachment stream');
    if (small && sectors.some((sector, index) => sector * 64 + Math.min(64, Math.max(0, item.size - index * 64)) > root.size)) fail('property exceeds mini stream');
    if (next.parent === 0 && item.name === '__properties_version1.0') {
      if (item.size < 32 || item.size > 2 * 1024 * 1024 || (item.size - 32) % 16) fail('invalid message property stream');
      properties = new Uint8Array(item.size);
      sectors.forEach((sector, index) => {
        const offset = small
          ? sectorOffset(miniStream[Math.floor(sector * 64 / sectorSize)]) + (sector * 64 % sectorSize)
          : sectorOffset(sector);
        const length = Math.min(width, item.size - index * width);
        if (length > 0) properties!.set(bytes.subarray(offset, offset + length), index * width);
      });
    }
  }
  if (!properties) fail('CFB is not an Outlook message');
  const props = new DataView(properties!.buffer);
  for (let offset = 32; offset + 16 <= props.byteLength; offset += 16) {
    if (props.getUint32(offset, true) === 0x3ffd0003) return { messageCodepage: props.getUint32(offset + 8, true) };
  }
  return {};
}
