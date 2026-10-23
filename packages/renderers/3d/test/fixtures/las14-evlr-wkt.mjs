/** Derive a synthetic LAS 1.4 file with WKT only in an EVLR, never a VLR. */
export function las14EvlrWkt(source, precedingRecord = false) {
  const headerSize = source.readUInt16LE(94)
  const length = source.readUInt16LE(headerSize + 20)
  const wkt = source.subarray(headerSize + 54, headerSize + 54 + length)
  const pointCount = source.readUInt32LE(107)
  const pointOffset = source.readUInt32LE(96)
  const points = source.subarray(pointOffset, pointOffset + pointCount * source.readUInt16LE(105))
  const header = Buffer.alloc(375)
  source.copy(header, 0, 0, Math.min(headerSize, 227))
  header[25] = 4
  header.writeUInt16LE(header.readUInt16LE(6) | 16, 6)
  header.writeUInt16LE(header.length, 94)
  header.writeUInt32LE(header.length, 96)
  header.writeUInt32LE(0, 100)
  header.writeBigUInt64LE(BigInt(header.length + points.length), 235)
  header.writeUInt32LE(precedingRecord ? 2 : 1, 243)
  header.writeBigUInt64LE(BigInt(pointCount), 247)
  for (let i = 0; i < 5; i++) header.writeBigUInt64LE(BigInt(source.readUInt32LE(111 + i * 4)), 255 + i * 8)
  const record = (user, id, payload) => {
    const bytes = Buffer.alloc(60)
    bytes.write(user, 2, 16, 'ascii')
    bytes.writeUInt16LE(id, 18)
    bytes.writeBigUInt64LE(BigInt(payload.length), 20)
    return Buffer.concat([bytes, payload])
  }
  // WKT always ends at EOF: test it as the sole record and after another EVLR.
  const prefix = precedingRecord ? [record('file-viewer', 65000, Buffer.from([0]))] : []
  return Buffer.concat([header, points, ...prefix, record('LASF_Projection', 2112, wkt)])
}
