/** Replace a LAS 1.2 fixture's projection VLRs, preserving every point byte. */
export function lasWithCitation(source, citation, {units = 9001, code = 32767} = {}) {
  const headerSize = source.readUInt16LE(94), pointOffset = source.readUInt32LE(96)
  const text = Buffer.from(citation + '\0')
  const entries = [[1024, 0, 1, 1], [3072, 0, 1, code], [3076, 0, 1, units], [1026, 34737, text.length, 0]]
  const keys = Buffer.alloc(8 + entries.length * 8)
  ;[1, 1, 0, entries.length, ...entries.flat()].forEach((value, i) => keys.writeUInt16LE(value, i * 2))
  const vlr = (id, bytes) => {
    const header = Buffer.alloc(54)
    header.write('LASF_Projection', 2); header.writeUInt16LE(id, 18); header.writeUInt16LE(bytes.length, 20)
    return Buffer.concat([header, bytes])
  }
  const records = Buffer.concat([vlr(34735, keys), vlr(34737, text)])
  const header = Buffer.from(source.subarray(0, headerSize))
  header.writeUInt32LE(headerSize + records.length, 96); header.writeUInt32LE(2, 100)
  return Buffer.concat([header, records, source.subarray(pointOffset)])
}
