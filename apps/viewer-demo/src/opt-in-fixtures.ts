const SOP_CLASS_UID = '1.2.840.10008.5.1.4.1.1.7'
const TRANSFER_SYNTAX_UID = '1.2.840.10008.1.2.1'
const IMPLEMENTATION_UID = '1.2.826.0.1.3680043.10.543.1'

const concat = (...chunks: Uint8Array[]) => {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0))
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}

const u16 = (value: number) => new Uint8Array([value & 0xff, (value >>> 8) & 0xff])
const u32 = (value: number) =>
  new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff])
const ascii = (value: string) => new TextEncoder().encode(value)

const paddedValue = (vr: string, input: string | number | Uint8Array) => {
  const value =
    input instanceof Uint8Array
      ? input
      : vr === 'US'
        ? u16(Number(input))
        : vr === 'UL'
          ? u32(Number(input))
          : ascii(String(input))
  if (value.byteLength % 2 === 0) return value
  return concat(value, new Uint8Array([vr === 'UI' || vr === 'OB' || vr === 'OW' ? 0 : 0x20]))
}

const longLengthVrs = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'UC', 'UR', 'UT', 'UN'])
const element = (group: number, tag: number, vr: string, input: string | number | Uint8Array) => {
  const value = paddedValue(vr, input)
  return concat(
    u16(group),
    u16(tag),
    ascii(vr),
    longLengthVrs.has(vr)
      ? concat(new Uint8Array(2), u32(value.byteLength))
      : u16(value.byteLength),
    value
  )
}

const buildPixels = () => {
  const rows = 64
  const columns = 96
  const values = new Uint16Array(rows * columns)
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      values[row * columns + column] = Math.round((column / (columns - 1)) * 4095)
    }
  }
  return new Uint8Array(values.buffer)
}

const buildDicomFixture = () => {
  const sopInstanceUid = '1.2.826.0.1.3680043.10.543.2.1'
  const metaBody = concat(
    element(0x0002, 0x0001, 'OB', new Uint8Array([0, 1])),
    element(0x0002, 0x0002, 'UI', SOP_CLASS_UID),
    element(0x0002, 0x0003, 'UI', sopInstanceUid),
    element(0x0002, 0x0010, 'UI', TRANSFER_SYNTAX_UID),
    element(0x0002, 0x0012, 'UI', IMPLEMENTATION_UID),
    element(0x0002, 0x0013, 'SH', 'FILEVIEWER_240')
  )
  const meta = concat(element(0x0002, 0x0000, 'UL', metaBody.byteLength), metaBody)
  const dataSet = concat(
    element(0x0008, 0x0008, 'CS', 'DERIVED\\SECONDARY'),
    element(0x0008, 0x0016, 'UI', SOP_CLASS_UID),
    element(0x0008, 0x0018, 'UI', sopInstanceUid),
    element(0x0008, 0x0060, 'CS', 'OT'),
    element(0x0020, 0x000d, 'UI', '1.2.826.0.1.3680043.10.543.3.1'),
    element(0x0020, 0x000e, 'UI', '1.2.826.0.1.3680043.10.543.4.1'),
    element(0x0020, 0x0011, 'IS', '1'),
    element(0x0020, 0x0013, 'IS', '1'),
    element(0x0028, 0x0002, 'US', 1),
    element(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
    element(0x0028, 0x0008, 'IS', '1'),
    element(0x0028, 0x0010, 'US', 64),
    element(0x0028, 0x0011, 'US', 96),
    element(0x0028, 0x0030, 'DS', '1\\1'),
    element(0x0028, 0x0100, 'US', 16),
    element(0x0028, 0x0101, 'US', 12),
    element(0x0028, 0x0102, 'US', 11),
    element(0x0028, 0x0103, 'US', 0),
    element(0x0028, 0x1050, 'DS', '2048'),
    element(0x0028, 0x1051, 'DS', '4096'),
    element(0x7fe0, 0x0010, 'OW', buildPixels())
  )
  return concat(new Uint8Array(128), ascii('DICM'), meta, dataSet)
}

const signatureFixture = [
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXUyIsImtpZCI6ImZpbGUtdmlld2VyLWRlbW8ifQ',
  'eyJtZXNzYWdlIjoiU2FmZSBzeW50aGV0aWMgRmlsZSBWaWV3ZXIgc2lnbmF0dXJlIGZpeHR1cmUiLCJwdXJwb3NlIjoicHJvZHVjdGlvbiBzbW9rZSJ9',
  'CzBVep_E6Q4zWH2ix-wRNluApcrvFDleg6jN8hc8YYar0PUaP2SJrtP4HUJnjLHW-yBFao-02f4jSG2St9wBJg'
].join('.')

export type OptInRendererId = 'dicom' | 'signature'

export const optInFixtureMetadata = {
  dicom: {
    filename: 'file-viewer-safe-synthetic.dcm',
    sha256: '265a30e2eba9fe637ee2bd3c3521767efba5c53b42c34a5f20b091694a9ee6f8'
  },
  signature: {
    filename: 'file-viewer-safe-synthetic.jws',
    sha256: '52d508c326e08b91103759f2f08bb1f94bf811a68e60f5a61520f51664421665'
  }
} as const

export const createOptInFixture = (renderer: OptInRendererId) => {
  const bytes = renderer === 'dicom' ? buildDicomFixture() : ascii(signatureFixture)
  return {
    buffer: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer,
    ...optInFixtureMetadata[renderer]
  }
}
