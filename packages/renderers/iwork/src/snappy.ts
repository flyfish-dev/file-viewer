const concat = (chunks: Uint8Array[]) => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach(chunk => { output.set(chunk, offset); offset += chunk.length; });
  return output;
};

const readVarint = (bytes: Uint8Array, pointer: { offset: number }) => {
  let value = 0;
  let shift = 0;
  for (let count = 0; count < 10; count += 1) {
    if (pointer.offset >= bytes.length) throw new Error('Malformed Snappy varint.');
    const byte = bytes[pointer.offset++];
    value += (byte & 0x7f) * 2 ** shift;
    if (!(byte & 0x80)) return value;
    shift += 7;
  }
  throw new Error('Snappy varint exceeds 10 bytes.');
};

const copyFromHistory = (output: number[], offset: number, length: number, maximum: number) => {
  if (!offset || offset > output.length) throw new Error('Invalid Snappy copy offset.');
  if (output.length + length > maximum) throw new Error('Snappy output exceeds the configured safety limit.');
  for (let index = 0; index < length; index += 1) output.push(output[output.length - offset]);
};

const decompressChunk = (type: number, bytes: Uint8Array, maximum: number) => {
  if (type !== 0) throw new Error(`Unexpected iWork Snappy chunk type ${type}.`);
  const pointer = { offset: 0 };
  const expected = readVarint(bytes, pointer);
  if (expected > maximum) throw new Error('Snappy frame declares an unsafe output length.');
  const output: number[] = [];
  while (pointer.offset < bytes.length) {
    const tagByte = bytes[pointer.offset++];
    const tag = tagByte & 3;
    if (tag === 0) {
      let length = tagByte >>> 2;
      if (length < 60) length += 1;
      else {
        const byteCount = length - 59;
        if (byteCount > 4 || pointer.offset + byteCount > bytes.length) throw new Error('Malformed Snappy literal length.');
        length = 0;
        for (let index = 0; index < byteCount; index += 1) length |= bytes[pointer.offset++] << (8 * index);
        length = (length >>> 0) + 1;
      }
      if (pointer.offset + length > bytes.length || output.length + length > maximum) throw new Error('Snappy literal exceeds its frame or safety limit.');
      for (let index = 0; index < length; index += 1) output.push(bytes[pointer.offset++]);
      continue;
    }
    let length: number;
    let offset: number;
    if (tag === 1) {
      length = ((tagByte >>> 2) & 7) + 4;
      if (pointer.offset >= bytes.length) throw new Error('Malformed Snappy copy-1.');
      offset = ((tagByte & 0xe0) << 3) | bytes[pointer.offset++];
    } else if (tag === 2) {
      length = (tagByte >>> 2) + 1;
      if (pointer.offset + 2 > bytes.length) throw new Error('Malformed Snappy copy-2.');
      offset = bytes[pointer.offset] | (bytes[pointer.offset + 1] << 8);
      pointer.offset += 2;
    } else {
      length = (tagByte >>> 2) + 1;
      if (pointer.offset + 4 > bytes.length) throw new Error('Malformed Snappy copy-4.');
      offset = (bytes[pointer.offset] | (bytes[pointer.offset + 1] << 8) | (bytes[pointer.offset + 2] << 16) | (bytes[pointer.offset + 3] << 24)) >>> 0;
      pointer.offset += 4;
    }
    copyFromHistory(output, offset, length, maximum);
  }
  if (output.length !== expected) throw new Error(`Unexpected Snappy output length ${output.length}; expected ${expected}.`);
  return Uint8Array.from(output);
};

export const decompressIwaFrames = (bytes: Uint8Array, maximum: number) => {
  const output: Uint8Array[] = [];
  let offset = 0;
  let total = 0;
  while (offset < bytes.length) {
    if (offset + 4 > bytes.length) throw new Error('Malformed iWork Snappy frame header.');
    const type = bytes[offset++];
    const length = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    offset += 3;
    if (offset + length > bytes.length) throw new Error('Malformed iWork Snappy frame length.');
    const chunk = decompressChunk(type, bytes.slice(offset, offset + length), maximum - total);
    output.push(chunk);
    total += chunk.length;
    if (total > maximum) throw new Error('IWA decompression exceeds the configured safety limit.');
    offset += length;
  }
  return output;
};

export const decompressIwaFile = (bytes: Uint8Array, maximum: number) => concat(decompressIwaFrames(bytes, maximum));
