const UNIVERSAL = 0
const CONTEXT = 2

const TAG = {
  boolean: 1,
  integer: 2,
  bitString: 3,
  octetString: 4,
  null: 5,
  oid: 6,
  utf8String: 12,
  sequence: 16,
  set: 17,
  printableString: 19,
  teletexString: 20,
  ia5String: 22,
  utcTime: 23,
  generalizedTime: 24,
  universalString: 28,
  bmpString: 30
} as const

const OID = {
  data: '1.2.840.113549.1.7.1',
  signedData: '1.2.840.113549.1.7.2',
  envelopedData: '1.2.840.113549.1.7.3',
  digestedData: '1.2.840.113549.1.7.5',
  encryptedData: '1.2.840.113549.1.7.6',
  tstInfo: '1.2.840.113549.1.9.16.1.4',
  timestampedData: '1.2.840.113549.1.9.16.1.31',
  contentTypeAttribute: '1.2.840.113549.1.9.3',
  messageDigestAttribute: '1.2.840.113549.1.9.4',
  signingTimeAttribute: '1.2.840.113549.1.9.5',
  signatureTimestampTokenAttribute: '1.2.840.113549.1.9.16.2.14',
  signingCertificateV2Attribute: '1.2.840.113549.1.9.16.2.47',
  subjectKeyIdentifier: '2.5.29.14',
  sha1: '1.3.14.3.2.26',
  sha256: '2.16.840.1.101.3.4.2.1',
  sha384: '2.16.840.1.101.3.4.2.2',
  sha512: '2.16.840.1.101.3.4.2.3',
  rsaEncryption: '1.2.840.113549.1.1.1',
  sha1WithRsa: '1.2.840.113549.1.1.5',
  sha256WithRsa: '1.2.840.113549.1.1.11',
  sha384WithRsa: '1.2.840.113549.1.1.12',
  sha512WithRsa: '1.2.840.113549.1.1.13',
  rsaPss: '1.2.840.113549.1.1.10',
  ecPublicKey: '1.2.840.10045.2.1',
  ecdsaSha256: '1.2.840.10045.4.3.2',
  ecdsaSha384: '1.2.840.10045.4.3.3',
  ecdsaSha512: '1.2.840.10045.4.3.4',
  ed25519: '1.3.101.112',
  prime256v1: '1.2.840.10045.3.1.7',
  secp384r1: '1.3.132.0.34',
  secp521r1: '1.3.132.0.35'
} as const

const OID_LABELS: Readonly<Record<string, string>> = {
  [OID.data]: 'CMS data',
  [OID.signedData]: 'CMS SignedData',
  [OID.envelopedData]: 'CMS EnvelopedData',
  [OID.digestedData]: 'CMS DigestedData',
  [OID.encryptedData]: 'CMS EncryptedData',
  [OID.tstInfo]: 'RFC 3161 TSTInfo',
  [OID.timestampedData]: 'RFC 5544 TimeStampedData',
  [OID.sha1]: 'SHA-1',
  [OID.sha256]: 'SHA-256',
  [OID.sha384]: 'SHA-384',
  [OID.sha512]: 'SHA-512',
  [OID.rsaEncryption]: 'RSA',
  [OID.sha1WithRsa]: 'SHA-1 with RSA',
  [OID.sha256WithRsa]: 'SHA-256 with RSA',
  [OID.sha384WithRsa]: 'SHA-384 with RSA',
  [OID.sha512WithRsa]: 'SHA-512 with RSA',
  [OID.rsaPss]: 'RSA-PSS',
  [OID.ecPublicKey]: 'EC public key',
  [OID.ecdsaSha256]: 'ECDSA with SHA-256',
  [OID.ecdsaSha384]: 'ECDSA with SHA-384',
  [OID.ecdsaSha512]: 'ECDSA with SHA-512',
  [OID.ed25519]: 'Ed25519'
}

const NAME_LABELS: Readonly<Record<string, string>> = {
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.42': 'GN',
  '1.2.840.113549.1.9.1': 'emailAddress'
}

export type SignatureContainerKind =
  | 'cms-signed-data'
  | 'cms-certificates'
  | 'cms-content'
  | 'timestamp-request'
  | 'timestamp-response'
  | 'timestamp-token'
  | 'timestamped-data'
  | 'unknown'

export interface SignatureCertificateSummary {
  index: number
  version?: number
  serialNumber: string
  subject: string
  issuer: string
  notBefore?: string
  notAfter?: string
  signatureAlgorithmOid?: string
  signatureAlgorithm?: string
  publicKeyAlgorithmOid?: string
  publicKeyAlgorithm?: string
  publicKeyCurveOid?: string
  subjectKeyIdentifier?: string
  fingerprintSha256?: string
}

export interface SignatureSignerSummary {
  index: number
  sid: string
  digestAlgorithmOid?: string
  digestAlgorithm?: string
  signatureAlgorithmOid?: string
  signatureAlgorithm?: string
  signingTime?: string
  messageDigest?: string
  contentTypeOid?: string
  certificateIndex?: number
  digestMatches?: boolean
  cryptographicSignatureValid?: boolean
  verificationError?: string
  signatureTimestampTokens: number
  signingCertificateV2: boolean
}

export interface TimestampAccuracySummary {
  seconds?: number
  millis?: number
  micros?: number
}

export interface TimestampInfoSummary {
  version?: number
  policyOid?: string
  serialNumber?: string
  generationTime?: string
  accuracy?: TimestampAccuracySummary
  ordering?: boolean
  nonce?: string
  tsa?: string
  messageImprintAlgorithmOid?: string
  messageImprintAlgorithm?: string
  messageImprint?: string
  messageImprintMatchesOriginal?: boolean
  certReq?: boolean
}

export interface TimestampResponseSummary {
  status?: number
  statusLabel?: string
  statusText: string[]
  failureInfo?: string
}

export interface SignatureInspection {
  kind: SignatureContainerKind
  detectedFormat: string
  sourceSize: number
  contentTypeOid?: string
  contentType?: string
  signedContentTypeOid?: string
  signedContentType?: string
  digestAlgorithms: string[]
  embeddedContent?: Uint8Array
  detached: boolean
  requiresOriginalContent: boolean
  originalContentSupplied: boolean
  certificates: SignatureCertificateSummary[]
  signers: SignatureSignerSummary[]
  timestamp?: TimestampInfoSummary
  timestampResponse?: TimestampResponseSummary
  crlCount: number
  timestampedData?: {
    dataUri?: string
    filename?: string
    mediaType?: string
    hashProtected?: boolean
    temporalEvidenceEntries: number
  }
  warnings: string[]
}

export interface SignatureAsn1Limits {
  maxInputBytes: number
  maxOriginalContentBytes: number
  maxAsn1Nodes: number
  maxAsn1NestingDepth: number
  maxDigestAlgorithms: number
  maxCertificates: number
  maxCrls: number
  maxSigners: number
  maxAttributesPerSigner: number
  maxEmbeddedContentBytes: number
  maxTimestampEvidenceEntries: number
  maxEvidenceChains: number
  maxEvidenceTimestampsPerChain: number
  maxEvidenceTimestamps: number
  maxReducedHashTreeNodes: number
}

export const DEFAULT_SIGNATURE_ASN1_LIMITS: Readonly<SignatureAsn1Limits> = Object.freeze({
  maxInputBytes: 64 * 1024 * 1024,
  maxOriginalContentBytes: 64 * 1024 * 1024,
  maxAsn1Nodes: 25_000,
  maxAsn1NestingDepth: 96,
  maxDigestAlgorithms: 64,
  maxCertificates: 512,
  maxCrls: 256,
  maxSigners: 256,
  maxAttributesPerSigner: 256,
  maxEmbeddedContentBytes: 32 * 1024 * 1024,
  maxTimestampEvidenceEntries: 256,
  maxEvidenceChains: 128,
  maxEvidenceTimestampsPerChain: 256,
  maxEvidenceTimestamps: 1024,
  maxReducedHashTreeNodes: 4096
})

const normalizeSignatureAsn1Limits = (
  supplied: Partial<SignatureAsn1Limits> | undefined
): SignatureAsn1Limits => {
  const normalized = { ...DEFAULT_SIGNATURE_ASN1_LIMITS }
  for (const key of Object.keys(normalized) as Array<keyof SignatureAsn1Limits>) {
    const value = supplied?.[key] ?? normalized[key]
    assertBounds(
      Number.isSafeInteger(value) && value >= 1 && value <= DEFAULT_SIGNATURE_ASN1_LIMITS[key],
      `${key} must be an integer between 1 and ${DEFAULT_SIGNATURE_ASN1_LIMITS[key]}.`
    )
    normalized[key] = value
  }
  return normalized
}

export interface InspectSignatureOptions {
  sourceFilename?: string
  extensionHint?: string
  originalContent?: ArrayBuffer | Uint8Array
  /** Per-call reductions of the absolute hostile-input ceilings. Limits cannot be raised. */
  limits?: Partial<SignatureAsn1Limits>
}

export interface EvidenceArchiveTimestampSummary {
  chainIndex: number
  index: number
  digestAlgorithmOid?: string
  digestAlgorithm?: string
  reducedHashTreeNodes: number
  timestamp?: TimestampInfoSummary
  timestampSignerCount: number
  timestampSignaturesValid?: boolean
  evidenceDigestMatchesOriginal?: boolean
  warnings: string[]
}

export interface EvidenceRecordInspection {
  kind: 'evidence-record'
  detectedFormat: 'RFC 4998 EvidenceRecord'
  sourceSize: number
  version?: number
  digestAlgorithms: string[]
  archiveTimestampChains: number
  archiveTimestamps: EvidenceArchiveTimestampSummary[]
  originalContentSupplied: boolean
  originalEvidenceMatches?: boolean
  fullyValidated: false
  warnings: string[]
}

export interface InspectEvidenceRecordOptions {
  originalContent?: ArrayBuffer | Uint8Array
  /** Per-call reductions of the absolute hostile-input ceilings. Limits cannot be raised. */
  limits?: Partial<SignatureAsn1Limits>
}

interface Asn1Node {
  tagClass: number
  tagNumber: number
  constructed: boolean
  start: number
  headerEnd: number
  contentStart: number
  contentEnd: number
  end: number
  indefinite: boolean
  children: Asn1Node[]
}

interface ParseState {
  bytes: Uint8Array
  nodes: number
  maxNodes: number
  maxDepth: number
}

interface CertificateRecord {
  summary: SignatureCertificateSummary
  node: Asn1Node
  issuerDer: string
  serialDer: string
  subjectKeyIdentifier?: string
  spki: Uint8Array
  publicKeyAlgorithmOid?: string
  publicKeyCurveName?: 'P-256' | 'P-384' | 'P-521'
}

interface SignerRecord {
  summary: SignatureSignerSummary
  issuerDer?: string
  serialDer?: string
  subjectKeyIdentifier?: string
  digestAlgorithmNode?: Asn1Node
  signatureAlgorithmNode?: Asn1Node
  signedAttributesNode?: Asn1Node
  signature?: Uint8Array
}

interface CmsRecord {
  contentTypeOid: string
  signedContentTypeOid?: string
  digestAlgorithmOids: string[]
  embeddedContent?: Uint8Array
  certificates: CertificateRecord[]
  crlCount: number
  signers: SignerRecord[]
}

const toUint8Array = (value: ArrayBuffer | Uint8Array) =>
  value instanceof Uint8Array ? value : new Uint8Array(value)

const bytesToHex = (bytes: Uint8Array, separator = '') =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0'))
    .join(separator)
    .toUpperCase()

const equalBytes = (left: Uint8Array, right: Uint8Array) => {
  if (left.byteLength !== right.byteLength) {
    return false
  }
  let mismatch = 0
  for (let index = 0; index < left.byteLength; index += 1) {
    mismatch |= left[index]! ^ right[index]!
  }
  return mismatch === 0
}

const formatOid = (oid?: string) => (oid ? OID_LABELS[oid] || oid : 'Unknown')

const assertBounds: (condition: unknown, message: string) => asserts condition = (
  condition,
  message
) => {
  if (!condition) {
    throw new Error(message)
  }
}

const parseNode = (
  state: ParseState,
  offset: number,
  limit: number,
  depth: number
): { node: Asn1Node; next: number } => {
  assertBounds(depth <= state.maxDepth, `ASN.1 nesting exceeds ${state.maxDepth}.`)
  assertBounds(offset < limit, 'Unexpected end of ASN.1 input.')
  state.nodes += 1
  assertBounds(state.nodes <= state.maxNodes, `ASN.1 node count exceeds ${state.maxNodes}.`)

  const bytes = state.bytes
  const start = offset
  const identifier = bytes[offset++]!
  const tagClass = identifier >> 6
  const constructed = (identifier & 0x20) !== 0
  let tagNumber = identifier & 0x1f

  if (tagNumber === 0x1f) {
    tagNumber = 0
    let octets = 0
    for (;;) {
      assertBounds(offset < limit, 'Truncated ASN.1 high-tag identifier.')
      const octet = bytes[offset++]!
      octets += 1
      assertBounds(octets <= 6, 'ASN.1 high-tag identifier is too large.')
      tagNumber = tagNumber * 128 + (octet & 0x7f)
      if ((octet & 0x80) === 0) {
        break
      }
    }
  }

  assertBounds(offset < limit, 'Missing ASN.1 length.')
  const lengthOctet = bytes[offset++]!
  let length = 0
  let indefinite = false

  if (lengthOctet === 0x80) {
    indefinite = true
    assertBounds(constructed, 'Primitive ASN.1 values cannot use indefinite length.')
  } else if ((lengthOctet & 0x80) === 0) {
    length = lengthOctet
  } else {
    const lengthOctets = lengthOctet & 0x7f
    assertBounds(lengthOctets > 0 && lengthOctets <= 6, 'Unsupported ASN.1 length width.')
    assertBounds(offset + lengthOctets <= limit, 'Truncated ASN.1 length.')
    for (let index = 0; index < lengthOctets; index += 1) {
      length = length * 256 + bytes[offset++]!
    }
  }

  const contentStart = offset
  const children: Asn1Node[] = []
  let contentEnd: number
  let end: number

  if (indefinite) {
    for (;;) {
      assertBounds(offset + 1 < limit, 'Unterminated indefinite-length ASN.1 value.')
      if (bytes[offset] === 0 && bytes[offset + 1] === 0) {
        contentEnd = offset
        end = offset + 2
        break
      }
      const parsed = parseNode(state, offset, limit, depth + 1)
      children.push(parsed.node)
      offset = parsed.next
    }
  } else {
    contentEnd = contentStart + length
    assertBounds(contentEnd <= limit, 'ASN.1 length extends beyond its parent.')
    end = contentEnd
    if (constructed) {
      while (offset < contentEnd) {
        const parsed = parseNode(state, offset, contentEnd, depth + 1)
        children.push(parsed.node)
        offset = parsed.next
      }
      assertBounds(offset === contentEnd, 'ASN.1 child does not end at its parent boundary.')
    }
  }

  return {
    node: {
      tagClass,
      tagNumber,
      constructed,
      start,
      headerEnd: contentStart,
      contentStart,
      contentEnd: contentEnd!,
      end: end!,
      indefinite,
      children
    },
    next: end!
  }
}

const parseRoot = (
  bytes: Uint8Array,
  limits: Pick<
    SignatureAsn1Limits,
    'maxAsn1Nodes' | 'maxAsn1NestingDepth'
  > = DEFAULT_SIGNATURE_ASN1_LIMITS
) => {
  const state: ParseState = {
    bytes,
    nodes: 0,
    maxNodes: limits.maxAsn1Nodes,
    maxDepth: limits.maxAsn1NestingDepth
  }
  const { node, next } = parseNode(state, 0, bytes.byteLength, 0)
  for (let offset = next; offset < bytes.byteLength; offset += 1) {
    assertBounds(bytes[offset] === 0, 'Unexpected bytes after the ASN.1 root value.')
  }
  return node
}

const isTag = (node: Asn1Node | undefined, tagClass: number, tagNumber: number) =>
  Boolean(node && node.tagClass === tagClass && node.tagNumber === tagNumber)

const contentBytes = (bytes: Uint8Array, node: Asn1Node) =>
  bytes.subarray(node.contentStart, node.contentEnd)

const fullBytes = (bytes: Uint8Array, node: Asn1Node) => bytes.subarray(node.start, node.end)

const decodeOid = (bytes: Uint8Array, node: Asn1Node) => {
  assertBounds(isTag(node, UNIVERSAL, TAG.oid), 'Expected ASN.1 OBJECT IDENTIFIER.')
  const value = contentBytes(bytes, node)
  assertBounds(value.byteLength > 0, 'Empty ASN.1 OBJECT IDENTIFIER.')
  const subIdentifiers: number[] = []
  let current = 0
  let continued = false
  for (const octet of value) {
    current = current * 128 + (octet & 0x7f)
    assertBounds(Number.isSafeInteger(current), 'ASN.1 OBJECT IDENTIFIER arc is too large.')
    continued = (octet & 0x80) !== 0
    if (!continued) {
      subIdentifiers.push(current)
      current = 0
    }
  }
  assertBounds(!continued, 'Truncated ASN.1 OBJECT IDENTIFIER.')
  const first = subIdentifiers.shift() || 0
  const firstArc = first < 40 ? 0 : first < 80 ? 1 : 2
  const secondArc = first - firstArc * 40
  return [firstArc, secondArc, ...subIdentifiers].map(String).join('.')
}

const integerBytes = (bytes: Uint8Array, node: Asn1Node) => {
  assertBounds(isTag(node, UNIVERSAL, TAG.integer), 'Expected ASN.1 INTEGER.')
  return contentBytes(bytes, node)
}

const positiveIntegerBytes = (bytes: Uint8Array, node: Asn1Node) => {
  let value = integerBytes(bytes, node)
  while (value.byteLength > 1 && value[0] === 0) {
    value = value.subarray(1)
  }
  return value
}

const integerHex = (bytes: Uint8Array, node: Asn1Node) =>
  bytesToHex(positiveIntegerBytes(bytes, node))

const integerNumber = (bytes: Uint8Array, node: Asn1Node) => {
  const value = positiveIntegerBytes(bytes, node)
  let result = 0
  for (const octet of value) {
    result = result * 256 + octet
    if (!Number.isSafeInteger(result)) {
      return undefined
    }
  }
  return result
}

const decodeBoolean = (bytes: Uint8Array, node: Asn1Node) => {
  assertBounds(isTag(node, UNIVERSAL, TAG.boolean), 'Expected ASN.1 BOOLEAN.')
  const value = contentBytes(bytes, node)
  return value.some((octet) => octet !== 0)
}

const decodeAscii = (value: Uint8Array) => String.fromCharCode(...value)

const decodeBmpString = (value: Uint8Array) => {
  let result = ''
  for (let index = 0; index + 1 < value.byteLength; index += 2) {
    result += String.fromCharCode((value[index]! << 8) | value[index + 1]!)
  }
  return result
}

const decodeUniversalString = (value: Uint8Array) => {
  let result = ''
  for (let index = 0; index + 3 < value.byteLength; index += 4) {
    const codePoint =
      value[index]! * 0x1000000 +
      (value[index + 1]! << 16) +
      (value[index + 2]! << 8) +
      value[index + 3]!
    result += String.fromCodePoint(codePoint)
  }
  return result
}

const decodeString = (bytes: Uint8Array, node: Asn1Node) => {
  const value = contentBytes(bytes, node)
  switch (node.tagNumber) {
    case TAG.utf8String:
      return new TextDecoder('utf-8', { fatal: false }).decode(value)
    case TAG.bmpString:
      return decodeBmpString(value)
    case TAG.universalString:
      return decodeUniversalString(value)
    case TAG.printableString:
    case TAG.teletexString:
    case TAG.ia5String:
      return decodeAscii(value)
    default:
      return decodeAscii(value)
  }
}

const parseTimeString = (value: string, generalized: boolean) => {
  const match = generalized
    ? /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d+))?(Z|[+-]\d{4})$/.exec(value)
    : /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})$/.exec(value)
  if (!match) {
    return value
  }
  const year = generalized
    ? Number(match[1])
    : (Number(match[1]) >= 50 ? 1900 : 2000) + Number(match[1])
  const baseIndex = generalized ? 2 : 2
  const month = Number(match[baseIndex])
  const day = Number(match[baseIndex + 1])
  const hour = Number(match[baseIndex + 2])
  const minute = Number(match[baseIndex + 3])
  const second = Number(match[baseIndex + 4])
  const fraction = generalized ? match[7] : undefined
  const zone = generalized ? match[8]! : match[7]!
  const millis = fraction ? Number(`0.${fraction}`) * 1000 : 0
  let timestamp = Date.UTC(year, month - 1, day, hour, minute, second, millis)
  if (zone !== 'Z') {
    const sign = zone[0] === '+' ? 1 : -1
    const offsetMinutes = Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5))
    timestamp -= sign * offsetMinutes * 60_000
  }
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

const decodeTime = (bytes: Uint8Array, node: Asn1Node) => {
  const raw = decodeAscii(contentBytes(bytes, node))
  if (isTag(node, UNIVERSAL, TAG.utcTime)) {
    return parseTimeString(raw, false)
  }
  if (isTag(node, UNIVERSAL, TAG.generalizedTime)) {
    return parseTimeString(raw, true)
  }
  return raw
}

const decodeName = (bytes: Uint8Array, node: Asn1Node) => {
  const rdns: string[] = []
  for (const set of node.children) {
    for (const attribute of set.children) {
      const [oidNode, valueNode] = attribute.children
      if (!oidNode || !valueNode || !isTag(oidNode, UNIVERSAL, TAG.oid)) {
        continue
      }
      const oid = decodeOid(bytes, oidNode)
      const label = NAME_LABELS[oid] || oid
      rdns.push(`${label}=${decodeString(bytes, valueNode)}`)
    }
  }
  return rdns.join(', ')
}

const algorithmOid = (bytes: Uint8Array, node: Asn1Node | undefined) => {
  const oidNode = node?.children.find((child) => isTag(child, UNIVERSAL, TAG.oid))
  return oidNode ? decodeOid(bytes, oidNode) : undefined
}

const curveNameForOid = (oid?: string): CertificateRecord['publicKeyCurveName'] => {
  if (oid === OID.prime256v1) return 'P-256'
  if (oid === OID.secp384r1) return 'P-384'
  if (oid === OID.secp521r1) return 'P-521'
  return undefined
}

const collectOctetString = (
  bytes: Uint8Array,
  node: Asn1Node,
  maxBytes = DEFAULT_SIGNATURE_ASN1_LIMITS.maxEmbeddedContentBytes
): Uint8Array => {
  if (isTag(node, UNIVERSAL, TAG.octetString) && !node.constructed) {
    const value = contentBytes(bytes, node)
    assertBounds(
      value.byteLength <= maxBytes,
      `Embedded content exceeds the ${maxBytes}-byte boundary.`
    )
    return value
  }
  const parts = node.children
    .filter((child) => isTag(child, UNIVERSAL, TAG.octetString) || child.tagClass === CONTEXT)
    .map((child) => collectOctetString(bytes, child, maxBytes))
  if (!parts.length) {
    return new Uint8Array()
  }
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0)
  assertBounds(size <= maxBytes, `Embedded content exceeds the ${maxBytes}-byte boundary.`)
  const output = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

const parseExtensions = (bytes: Uint8Array, tbsChildren: Asn1Node[]) => {
  const extensionsContainer = tbsChildren.find((child) => isTag(child, CONTEXT, 3))
  const extensions = extensionsContainer?.children[0]?.children || []
  let subjectKeyIdentifier: string | undefined
  for (const extension of extensions) {
    const oidNode = extension.children.find((child) => isTag(child, UNIVERSAL, TAG.oid))
    const valueNode = [...extension.children]
      .reverse()
      .find((child) => isTag(child, UNIVERSAL, TAG.octetString))
    if (!oidNode || !valueNode) {
      continue
    }
    const oid = decodeOid(bytes, oidNode)
    if (oid === OID.subjectKeyIdentifier) {
      try {
        const innerBytes = contentBytes(bytes, valueNode)
        const innerNode = parseRoot(innerBytes)
        if (isTag(innerNode, UNIVERSAL, TAG.octetString)) {
          subjectKeyIdentifier = bytesToHex(contentBytes(innerBytes, innerNode))
        }
      } catch {
        subjectKeyIdentifier = bytesToHex(contentBytes(bytes, valueNode))
      }
    }
  }
  return { subjectKeyIdentifier }
}

const parseCertificate = (
  bytes: Uint8Array,
  node: Asn1Node,
  index: number
): CertificateRecord | undefined => {
  if (!isTag(node, UNIVERSAL, TAG.sequence) || node.children.length < 3) {
    return undefined
  }
  const [tbs, outerSignatureAlgorithm] = node.children
  if (!tbs || !isTag(tbs, UNIVERSAL, TAG.sequence)) {
    return undefined
  }
  const children = tbs.children
  let cursor = 0
  let version = 1
  if (isTag(children[cursor], CONTEXT, 0)) {
    const versionNode = children[cursor]?.children[0]
    if (versionNode && isTag(versionNode, UNIVERSAL, TAG.integer)) {
      version = (integerNumber(bytes, versionNode) || 0) + 1
    }
    cursor += 1
  }
  const serialNode = children[cursor++]
  const tbsSignatureAlgorithm = children[cursor++]
  const issuerNode = children[cursor++]
  const validityNode = children[cursor++]
  const subjectNode = children[cursor++]
  const spkiNode = children[cursor]
  if (!serialNode || !issuerNode || !validityNode || !subjectNode || !spkiNode) {
    return undefined
  }
  const publicKeyAlgorithmNode = spkiNode.children[0]
  const publicKeyAlgorithmOid = algorithmOid(bytes, publicKeyAlgorithmNode)
  const curveOidNode = publicKeyAlgorithmNode?.children[1]
  const publicKeyCurveOid =
    curveOidNode && isTag(curveOidNode, UNIVERSAL, TAG.oid)
      ? decodeOid(bytes, curveOidNode)
      : undefined
  const signatureAlgorithmOid =
    algorithmOid(bytes, outerSignatureAlgorithm) || algorithmOid(bytes, tbsSignatureAlgorithm)
  const { subjectKeyIdentifier } = parseExtensions(bytes, children)
  const issuerDer = bytesToHex(fullBytes(bytes, issuerNode))
  const serialDer = bytesToHex(positiveIntegerBytes(bytes, serialNode))
  const validity = validityNode.children.filter(
    (child) => isTag(child, UNIVERSAL, TAG.utcTime) || isTag(child, UNIVERSAL, TAG.generalizedTime)
  )

  return {
    node,
    summary: {
      index,
      version,
      serialNumber: serialDer,
      subject: decodeName(bytes, subjectNode),
      issuer: decodeName(bytes, issuerNode),
      notBefore: validity[0] ? decodeTime(bytes, validity[0]) : undefined,
      notAfter: validity[1] ? decodeTime(bytes, validity[1]) : undefined,
      signatureAlgorithmOid,
      signatureAlgorithm: formatOid(signatureAlgorithmOid),
      publicKeyAlgorithmOid,
      publicKeyAlgorithm: formatOid(publicKeyAlgorithmOid),
      publicKeyCurveOid,
      subjectKeyIdentifier
    },
    issuerDer,
    serialDer,
    subjectKeyIdentifier,
    spki: fullBytes(bytes, spkiNode),
    publicKeyAlgorithmOid,
    publicKeyCurveName: curveNameForOid(publicKeyCurveOid)
  }
}

const parseAttribute = (bytes: Uint8Array, node: Asn1Node) => {
  const [oidNode, valuesNode] = node.children
  if (!oidNode || !valuesNode || !isTag(oidNode, UNIVERSAL, TAG.oid)) {
    return undefined
  }
  return {
    oid: decodeOid(bytes, oidNode),
    values: valuesNode.children
  }
}

const parseSigner = (
  bytes: Uint8Array,
  node: Asn1Node,
  index: number,
  limits: SignatureAsn1Limits
): SignerRecord | undefined => {
  if (!isTag(node, UNIVERSAL, TAG.sequence)) {
    return undefined
  }
  const children = node.children
  let cursor = 0
  const versionNode = children[cursor++]
  const sidNode = children[cursor++]
  const digestAlgorithmNode = children[cursor++]
  if (!versionNode || !sidNode || !digestAlgorithmNode) {
    return undefined
  }
  const signedAttributesNode = isTag(children[cursor], CONTEXT, 0) ? children[cursor++] : undefined
  const signatureAlgorithmNode = children[cursor++]
  const signatureNode = children[cursor++]
  const unsignedAttributesNode = isTag(children[cursor], CONTEXT, 1) ? children[cursor] : undefined
  assertBounds(
    (signedAttributesNode?.children.length || 0) <= limits.maxAttributesPerSigner,
    `CMS signed attribute count exceeds ${limits.maxAttributesPerSigner}.`
  )
  assertBounds(
    (unsignedAttributesNode?.children.length || 0) <= limits.maxAttributesPerSigner,
    `CMS unsigned attribute count exceeds ${limits.maxAttributesPerSigner}.`
  )

  let issuerDer: string | undefined
  let serialDer: string | undefined
  let subjectKeyIdentifier: string | undefined
  let sid = 'Unknown signer identifier'
  if (isTag(sidNode, UNIVERSAL, TAG.sequence)) {
    const issuerNode = sidNode.children[0]
    const serialNode = sidNode.children[1]
    if (issuerNode && serialNode) {
      issuerDer = bytesToHex(fullBytes(bytes, issuerNode))
      serialDer = bytesToHex(positiveIntegerBytes(bytes, serialNode))
      sid = `${decodeName(bytes, issuerNode)} · ${serialDer}`
    }
  } else if (isTag(sidNode, CONTEXT, 0)) {
    subjectKeyIdentifier = bytesToHex(contentBytes(bytes, sidNode))
    sid = `Subject key identifier ${subjectKeyIdentifier}`
  }

  let signingTime: string | undefined
  let messageDigest: string | undefined
  let contentTypeOid: string | undefined
  let signingCertificateV2 = false
  for (const child of signedAttributesNode?.children || []) {
    const attribute = parseAttribute(bytes, child)
    const value = attribute?.values[0]
    if (!attribute || !value) {
      continue
    }
    if (
      attribute.oid === OID.signingTimeAttribute &&
      (isTag(value, UNIVERSAL, TAG.utcTime) || isTag(value, UNIVERSAL, TAG.generalizedTime))
    ) {
      signingTime = decodeTime(bytes, value)
    } else if (
      attribute.oid === OID.messageDigestAttribute &&
      isTag(value, UNIVERSAL, TAG.octetString)
    ) {
      messageDigest = bytesToHex(contentBytes(bytes, value))
    } else if (attribute.oid === OID.contentTypeAttribute && isTag(value, UNIVERSAL, TAG.oid)) {
      contentTypeOid = decodeOid(bytes, value)
    } else if (attribute.oid === OID.signingCertificateV2Attribute) {
      signingCertificateV2 = true
    }
  }

  let signatureTimestampTokens = 0
  for (const child of unsignedAttributesNode?.children || []) {
    const attribute = parseAttribute(bytes, child)
    if (attribute?.oid === OID.signatureTimestampTokenAttribute) {
      signatureTimestampTokens += attribute.values.length
    }
  }

  const digestAlgorithmOid = algorithmOid(bytes, digestAlgorithmNode)
  const signatureAlgorithmOid = algorithmOid(bytes, signatureAlgorithmNode)
  return {
    summary: {
      index,
      sid,
      digestAlgorithmOid,
      digestAlgorithm: formatOid(digestAlgorithmOid),
      signatureAlgorithmOid,
      signatureAlgorithm: formatOid(signatureAlgorithmOid),
      signingTime,
      messageDigest,
      contentTypeOid,
      signatureTimestampTokens,
      signingCertificateV2
    },
    issuerDer,
    serialDer,
    subjectKeyIdentifier,
    digestAlgorithmNode,
    signatureAlgorithmNode,
    signedAttributesNode,
    signature:
      signatureNode && isTag(signatureNode, UNIVERSAL, TAG.octetString)
        ? contentBytes(bytes, signatureNode)
        : undefined
  }
}

const parseCmsContentInfo = (
  bytes: Uint8Array,
  root: Asn1Node,
  limits: SignatureAsn1Limits
): CmsRecord => {
  assertBounds(isTag(root, UNIVERSAL, TAG.sequence), 'CMS ContentInfo must be an ASN.1 SEQUENCE.')
  const oidNode = root.children[0]
  assertBounds(
    oidNode && isTag(oidNode, UNIVERSAL, TAG.oid),
    'CMS ContentInfo is missing contentType.'
  )
  const contentTypeOid = decodeOid(bytes, oidNode)
  if (contentTypeOid !== OID.signedData) {
    return {
      contentTypeOid,
      digestAlgorithmOids: [],
      certificates: [],
      crlCount: 0,
      signers: []
    }
  }
  const explicitContent = root.children.find((child) => isTag(child, CONTEXT, 0))
  const signedData = explicitContent?.children[0]
  assertBounds(
    signedData && isTag(signedData, UNIVERSAL, TAG.sequence),
    'CMS SignedData payload is missing.'
  )
  const children = signedData.children
  const digestAlgorithmsNode = children[1]
  const encapContentInfo = children[2]
  assertBounds(digestAlgorithmsNode && encapContentInfo, 'CMS SignedData is truncated.')
  assertBounds(
    digestAlgorithmsNode.children.length <= limits.maxDigestAlgorithms,
    `CMS digest algorithm count exceeds ${limits.maxDigestAlgorithms}.`
  )
  const digestAlgorithmOids = digestAlgorithmsNode.children
    .map((child) => algorithmOid(bytes, child))
    .filter((value): value is string => Boolean(value))
  const signedContentTypeNode = encapContentInfo.children[0]
  const signedContentTypeOid =
    signedContentTypeNode && isTag(signedContentTypeNode, UNIVERSAL, TAG.oid)
      ? decodeOid(bytes, signedContentTypeNode)
      : undefined
  const eContentNode = encapContentInfo.children.find((child) => isTag(child, CONTEXT, 0))
  const embeddedContent = eContentNode
    ? collectOctetString(bytes, eContentNode, limits.maxEmbeddedContentBytes)
    : undefined
  const certificatesNode = children.find((child) => isTag(child, CONTEXT, 0))
  const crlsNode = children.find((child) => isTag(child, CONTEXT, 1))
  const signerInfosNode = [...children].reverse().find((child) => isTag(child, UNIVERSAL, TAG.set))
  assertBounds(
    (certificatesNode?.children.length || 0) <= limits.maxCertificates,
    `CMS certificate count exceeds ${limits.maxCertificates}.`
  )
  assertBounds(
    (crlsNode?.children.length || 0) <= limits.maxCrls,
    `CMS CRL count exceeds ${limits.maxCrls}.`
  )
  assertBounds(
    (signerInfosNode?.children.length || 0) <= limits.maxSigners,
    `CMS signer count exceeds ${limits.maxSigners}.`
  )
  const certificates = (certificatesNode?.children || [])
    .map((child, index) => parseCertificate(bytes, child, index))
    .filter((value): value is CertificateRecord => Boolean(value))
  const signers = (signerInfosNode?.children || [])
    .map((child, index) => parseSigner(bytes, child, index, limits))
    .filter((value): value is SignerRecord => Boolean(value))
  return {
    contentTypeOid,
    signedContentTypeOid,
    digestAlgorithmOids,
    embeddedContent,
    certificates,
    crlCount: crlsNode?.children.length || 0,
    signers
  }
}

const subtleCrypto = () => globalThis.crypto?.subtle

const cryptoBytes = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(bytes)

const digestNameForOid = (oid?: string): AlgorithmIdentifier | undefined => {
  if (oid === OID.sha1) return 'SHA-1'
  if (oid === OID.sha256) return 'SHA-256'
  if (oid === OID.sha384) return 'SHA-384'
  if (oid === OID.sha512) return 'SHA-512'
  return undefined
}

const digestBytes = async (oid: string | undefined, bytes: Uint8Array) => {
  const subtle = subtleCrypto()
  const algorithm = digestNameForOid(oid)
  if (!subtle || !algorithm) {
    return undefined
  }
  return new Uint8Array(await subtle.digest(algorithm, cryptoBytes(bytes)))
}

const pssSaltLength = (
  bytes: Uint8Array,
  algorithmNode: Asn1Node | undefined,
  hashOid?: string
) => {
  const defaultLength =
    hashOid === OID.sha512 ? 64 : hashOid === OID.sha384 ? 48 : hashOid === OID.sha1 ? 20 : 32
  const params = algorithmNode?.children[1]
  const saltContainer = params?.children.find((child) => isTag(child, CONTEXT, 2))
  const saltNode = saltContainer?.children[0]
  return saltNode && isTag(saltNode, UNIVERSAL, TAG.integer)
    ? integerNumber(bytes, saltNode) || defaultLength
    : defaultLength
}

const signatureHashOid = (signatureOid: string | undefined, digestOid: string | undefined) => {
  if (signatureOid === OID.sha1WithRsa) return OID.sha1
  if (signatureOid === OID.sha256WithRsa || signatureOid === OID.ecdsaSha256) return OID.sha256
  if (signatureOid === OID.sha384WithRsa || signatureOid === OID.ecdsaSha384) return OID.sha384
  if (signatureOid === OID.sha512WithRsa || signatureOid === OID.ecdsaSha512) return OID.sha512
  return digestOid
}

const signedAttributesBytes = (bytes: Uint8Array, node: Asn1Node) => {
  const raw = new Uint8Array(fullBytes(bytes, node))
  if (raw.byteLength && raw[0] === 0xa0) {
    raw[0] = 0x31
  }
  return raw
}

const ecdsaDerToRaw = (signature: Uint8Array, coordinateLength: number) => {
  try {
    const root = parseRoot(signature)
    if (!isTag(root, UNIVERSAL, TAG.sequence) || root.children.length < 2) {
      return signature
    }
    const normalize = (node: Asn1Node) => {
      let value = positiveIntegerBytes(signature, node)
      if (value.byteLength > coordinateLength) {
        value = value.subarray(value.byteLength - coordinateLength)
      }
      const output = new Uint8Array(coordinateLength)
      output.set(value, coordinateLength - value.byteLength)
      return output
    }
    const raw = new Uint8Array(coordinateLength * 2)
    raw.set(normalize(root.children[0]!), 0)
    raw.set(normalize(root.children[1]!), coordinateLength)
    return raw
  } catch {
    return signature
  }
}

const findSignerCertificate = (signer: SignerRecord, certificates: CertificateRecord[]) => {
  if (signer.subjectKeyIdentifier) {
    return certificates.find(
      (certificate) => certificate.subjectKeyIdentifier === signer.subjectKeyIdentifier
    )
  }
  if (signer.issuerDer && signer.serialDer) {
    return certificates.find(
      (certificate) =>
        certificate.issuerDer === signer.issuerDer && certificate.serialDer === signer.serialDer
    )
  }
  return undefined
}

const verifySigner = async (
  bytes: Uint8Array,
  signer: SignerRecord,
  certificates: CertificateRecord[],
  content?: Uint8Array
) => {
  const summary = signer.summary
  const digestOid = summary.digestAlgorithmOid
  if (content && summary.messageDigest) {
    const digest = await digestBytes(digestOid, content)
    if (digest) {
      summary.digestMatches = equalBytes(
        digest,
        Uint8Array.from(
          summary.messageDigest.match(/.{2}/g)?.map((value) => Number.parseInt(value, 16)) || []
        )
      )
    }
  }

  const certificate = findSignerCertificate(signer, certificates)
  if (!certificate) {
    summary.verificationError = 'Matching signer certificate is not included.'
    return
  }
  summary.certificateIndex = certificate.summary.index
  if (!signer.signature) {
    summary.verificationError = 'Signature value is missing.'
    return
  }
  const signedInput = signer.signedAttributesNode
    ? signedAttributesBytes(bytes, signer.signedAttributesNode)
    : content
  if (!signedInput) {
    summary.verificationError = 'Original content is required to verify this signature.'
    return
  }
  const subtle = subtleCrypto()
  if (!subtle) {
    summary.verificationError = 'Web Crypto is unavailable.'
    return
  }

  const signatureOid = summary.signatureAlgorithmOid
  const hashOid = signatureHashOid(signatureOid, digestOid)
  const hash = digestNameForOid(hashOid)
  try {
    if (
      certificate.publicKeyAlgorithmOid === OID.rsaEncryption ||
      signatureOid === OID.rsaEncryption ||
      signatureOid === OID.sha1WithRsa ||
      signatureOid === OID.sha256WithRsa ||
      signatureOid === OID.sha384WithRsa ||
      signatureOid === OID.sha512WithRsa
    ) {
      assertBounds(hash, `Unsupported RSA digest algorithm ${hashOid || 'unknown'}.`)
      const algorithm: RsaHashedImportParams = { name: 'RSASSA-PKCS1-v1_5', hash }
      const key = await subtle.importKey('spki', cryptoBytes(certificate.spki), algorithm, false, [
        'verify'
      ])
      summary.cryptographicSignatureValid = await subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        key,
        cryptoBytes(signer.signature),
        cryptoBytes(signedInput)
      )
      return
    }
    if (signatureOid === OID.rsaPss) {
      assertBounds(hash, `Unsupported RSA-PSS digest algorithm ${hashOid || 'unknown'}.`)
      const algorithm: RsaHashedImportParams = { name: 'RSA-PSS', hash }
      const key = await subtle.importKey('spki', cryptoBytes(certificate.spki), algorithm, false, [
        'verify'
      ])
      summary.cryptographicSignatureValid = await subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: pssSaltLength(bytes, signer.signatureAlgorithmNode, hashOid)
        },
        key,
        cryptoBytes(signer.signature),
        cryptoBytes(signedInput)
      )
      return
    }
    if (
      certificate.publicKeyAlgorithmOid === OID.ecPublicKey ||
      signatureOid === OID.ecdsaSha256 ||
      signatureOid === OID.ecdsaSha384 ||
      signatureOid === OID.ecdsaSha512
    ) {
      assertBounds(hash, `Unsupported ECDSA digest algorithm ${hashOid || 'unknown'}.`)
      assertBounds(certificate.publicKeyCurveName, 'Unsupported or missing EC named curve.')
      const key = await subtle.importKey(
        'spki',
        cryptoBytes(certificate.spki),
        { name: 'ECDSA', namedCurve: certificate.publicKeyCurveName },
        false,
        ['verify']
      )
      const coordinateLength =
        certificate.publicKeyCurveName === 'P-521'
          ? 66
          : certificate.publicKeyCurveName === 'P-384'
            ? 48
            : 32
      summary.cryptographicSignatureValid = await subtle.verify(
        { name: 'ECDSA', hash },
        key,
        cryptoBytes(ecdsaDerToRaw(signer.signature, coordinateLength)),
        cryptoBytes(signedInput)
      )
      return
    }
    if (certificate.publicKeyAlgorithmOid === OID.ed25519 || signatureOid === OID.ed25519) {
      const key = await subtle.importKey(
        'spki',
        cryptoBytes(certificate.spki),
        { name: 'Ed25519' },
        false,
        ['verify']
      )
      summary.cryptographicSignatureValid = await subtle.verify(
        'Ed25519',
        key,
        cryptoBytes(signer.signature),
        cryptoBytes(signedInput)
      )
      return
    }
    summary.verificationError = `Unsupported signature algorithm ${signatureOid || 'unknown'}.`
  } catch (error) {
    summary.verificationError = error instanceof Error ? error.message : String(error)
  }
}

const enrichCertificateFingerprints = async (
  certificates: CertificateRecord[],
  bytes: Uint8Array
) => {
  const subtle = subtleCrypto()
  if (!subtle) {
    return
  }
  await Promise.all(
    certificates.map(async (certificate) => {
      try {
        const digest = new Uint8Array(
          await subtle.digest('SHA-256', cryptoBytes(fullBytes(bytes, certificate.node)))
        )
        certificate.summary.fingerprintSha256 = bytesToHex(digest, ':')
      } catch {
        // Fingerprints are presentation metadata; parsing remains useful without one.
      }
    })
  )
}

const parseMessageImprint = (bytes: Uint8Array, node: Asn1Node | undefined) => {
  if (!node || !isTag(node, UNIVERSAL, TAG.sequence)) {
    return {}
  }
  const algorithm = node.children[0]
  const digest = node.children[1]
  const algorithmOidValue = algorithmOid(bytes, algorithm)
  return {
    algorithmOid: algorithmOidValue,
    algorithm: formatOid(algorithmOidValue),
    digest:
      digest && isTag(digest, UNIVERSAL, TAG.octetString)
        ? bytesToHex(contentBytes(bytes, digest))
        : undefined
  }
}

const parseAccuracy = (bytes: Uint8Array, node: Asn1Node) => {
  const accuracy: TimestampAccuracySummary = {}
  for (const child of node.children) {
    if (isTag(child, UNIVERSAL, TAG.integer)) {
      accuracy.seconds = integerNumber(bytes, child)
    } else if (isTag(child, CONTEXT, 0)) {
      const value = child.children[0]
      accuracy.millis = value
        ? integerNumber(bytes, value)
        : Number.parseInt(bytesToHex(contentBytes(bytes, child)), 16)
    } else if (isTag(child, CONTEXT, 1)) {
      const value = child.children[0]
      accuracy.micros = value
        ? integerNumber(bytes, value)
        : Number.parseInt(bytesToHex(contentBytes(bytes, child)), 16)
    }
  }
  return accuracy
}

const decodeGeneralName = (bytes: Uint8Array, node: Asn1Node) => {
  if (node.tagClass !== CONTEXT) {
    return bytesToHex(contentBytes(bytes, node))
  }
  if (node.tagNumber === 4 && node.children[0]) {
    return decodeName(bytes, node.children[0])
  }
  if ([1, 2, 6].includes(node.tagNumber)) {
    return decodeAscii(contentBytes(bytes, node))
  }
  if (node.tagNumber === 8) {
    try {
      return decodeOid(bytes, { ...node, tagClass: UNIVERSAL, tagNumber: TAG.oid })
    } catch {
      return bytesToHex(contentBytes(bytes, node))
    }
  }
  return bytesToHex(contentBytes(bytes, node))
}

const parseTstInfo = async (
  bytes: Uint8Array,
  originalContent: Uint8Array | undefined,
  limits: SignatureAsn1Limits
): Promise<TimestampInfoSummary> => {
  const root = parseRoot(bytes, limits)
  assertBounds(isTag(root, UNIVERSAL, TAG.sequence), 'RFC 3161 TSTInfo must be a SEQUENCE.')
  const children = root.children
  const versionNode = children[0]
  const policyNode = children[1]
  const imprintNode = children[2]
  const serialNode = children[3]
  const generationTimeNode = children[4]
  const imprint = parseMessageImprint(bytes, imprintNode)
  const summary: TimestampInfoSummary = {
    version: versionNode ? integerNumber(bytes, versionNode) : undefined,
    policyOid:
      policyNode && isTag(policyNode, UNIVERSAL, TAG.oid)
        ? decodeOid(bytes, policyNode)
        : undefined,
    serialNumber: serialNode ? integerHex(bytes, serialNode) : undefined,
    generationTime: generationTimeNode ? decodeTime(bytes, generationTimeNode) : undefined,
    messageImprintAlgorithmOid: imprint.algorithmOid,
    messageImprintAlgorithm: imprint.algorithm,
    messageImprint: imprint.digest
  }
  for (const child of children.slice(5)) {
    if (isTag(child, UNIVERSAL, TAG.sequence) && summary.accuracy === undefined) {
      summary.accuracy = parseAccuracy(bytes, child)
    } else if (isTag(child, UNIVERSAL, TAG.boolean)) {
      summary.ordering = decodeBoolean(bytes, child)
    } else if (isTag(child, UNIVERSAL, TAG.integer) && !summary.nonce) {
      summary.nonce = integerHex(bytes, child)
    } else if (isTag(child, CONTEXT, 0)) {
      const generalName = child.children[0] || child
      summary.tsa = decodeGeneralName(bytes, generalName)
    }
  }
  if (originalContent && imprint.algorithmOid && imprint.digest) {
    const digest = await digestBytes(imprint.algorithmOid, originalContent)
    if (digest) {
      summary.messageImprintMatchesOriginal = bytesToHex(digest) === imprint.digest
    }
  }
  return summary
}

const parseTimestampRequest = async (
  bytes: Uint8Array,
  root: Asn1Node,
  originalContent?: Uint8Array
): Promise<TimestampInfoSummary> => {
  const children = root.children
  const versionNode = children[0]
  const imprint = parseMessageImprint(bytes, children[1])
  const summary: TimestampInfoSummary = {
    version: versionNode ? integerNumber(bytes, versionNode) : undefined,
    messageImprintAlgorithmOid: imprint.algorithmOid,
    messageImprintAlgorithm: imprint.algorithm,
    messageImprint: imprint.digest
  }
  for (const child of children.slice(2)) {
    if (isTag(child, UNIVERSAL, TAG.oid) && !summary.policyOid) {
      summary.policyOid = decodeOid(bytes, child)
    } else if (isTag(child, UNIVERSAL, TAG.integer) && !summary.nonce) {
      summary.nonce = integerHex(bytes, child)
    } else if (isTag(child, UNIVERSAL, TAG.boolean)) {
      summary.certReq = decodeBoolean(bytes, child)
    }
  }
  if (originalContent && imprint.algorithmOid && imprint.digest) {
    const digest = await digestBytes(imprint.algorithmOid, originalContent)
    if (digest) {
      summary.messageImprintMatchesOriginal = bytesToHex(digest) === imprint.digest
    }
  }
  return summary
}

const timestampStatusLabel = (status?: number) => {
  const labels: Readonly<Record<number, string>> = {
    0: 'granted',
    1: 'grantedWithMods',
    2: 'rejection',
    3: 'waiting',
    4: 'revocationWarning',
    5: 'revocationNotification'
  }
  return status === undefined ? undefined : labels[status] || `status-${status}`
}

const decodeTimestampFailureInfo = (bytes: Uint8Array, node: Asn1Node | undefined) => {
  if (!node || !isTag(node, UNIVERSAL, TAG.bitString)) return undefined
  const value = contentBytes(bytes, node)
  if (value.byteLength < 2) return bytesToHex(value)
  const unused = value[0] || 0
  const payload = value.subarray(1)
  const names = [
    [0, 'badAlg'],
    [2, 'badRequest'],
    [5, 'badDataFormat'],
    [14, 'timeNotAvailable'],
    [15, 'unacceptedPolicy'],
    [16, 'unacceptedExtension'],
    [17, 'addInfoNotAvailable'],
    [25, 'systemFailure']
  ] as const
  const set: string[] = []
  for (const [bit, name] of names) {
    const byteIndex = Math.floor(bit / 8)
    const bitIndex = 7 - (bit % 8)
    if (byteIndex < payload.byteLength && payload[byteIndex]! & (1 << bitIndex)) set.push(name)
  }
  return set.length ? set.join(', ') : `0x${bytesToHex(payload)} (unused bits ${unused})`
}

const parseTimestampResponse = (bytes: Uint8Array, root: Asn1Node) => {
  const statusInfoNode = root.children[0]
  const tokenNode = root.children[1]
  assertBounds(
    statusInfoNode && isTag(statusInfoNode, UNIVERSAL, TAG.sequence),
    'RFC 3161 response is missing PKIStatusInfo.'
  )
  const statusNode = statusInfoNode.children[0]
  const status = statusNode ? integerNumber(bytes, statusNode) : undefined
  const stringsNode = statusInfoNode.children.find((child) => isTag(child, UNIVERSAL, TAG.sequence))
  const failureNode = statusInfoNode.children.find((child) =>
    isTag(child, UNIVERSAL, TAG.bitString)
  )
  return {
    response: {
      status,
      statusLabel: timestampStatusLabel(status),
      statusText: (stringsNode?.children || []).map((child) => decodeString(bytes, child)),
      failureInfo: decodeTimestampFailureInfo(bytes, failureNode)
    } satisfies TimestampResponseSummary,
    tokenNode
  }
}

const looksLikeTimestampRequest = (root: Asn1Node) => {
  const [version, imprint] = root.children
  return Boolean(
    isTag(version, UNIVERSAL, TAG.integer) &&
    isTag(imprint, UNIVERSAL, TAG.sequence) &&
    isTag(imprint?.children[0], UNIVERSAL, TAG.sequence) &&
    isTag(imprint?.children[1], UNIVERSAL, TAG.octetString)
  )
}

const looksLikeTimestampResponse = (root: Asn1Node) => {
  const statusInfo = root.children[0]
  return Boolean(
    isTag(statusInfo, UNIVERSAL, TAG.sequence) &&
    isTag(statusInfo?.children[0], UNIVERSAL, TAG.integer)
  )
}

const cmsKind = (cms: CmsRecord): SignatureContainerKind => {
  if (cms.contentTypeOid !== OID.signedData) {
    return 'cms-content'
  }
  if (cms.signedContentTypeOid === OID.tstInfo) {
    return 'timestamp-token'
  }
  if (!cms.signers.length && cms.certificates.length) {
    return 'cms-certificates'
  }
  return 'cms-signed-data'
}

const detectedFormatForKind = (kind: SignatureContainerKind) => {
  const labels: Readonly<Record<SignatureContainerKind, string>> = {
    'cms-signed-data': 'CMS / PKCS#7 SignedData',
    'cms-certificates': 'CMS / PKCS#7 certificate container',
    'cms-content': 'CMS / PKCS#7 content container',
    'timestamp-request': 'RFC 3161 TimeStampReq',
    'timestamp-response': 'RFC 3161 TimeStampResp',
    'timestamp-token': 'RFC 3161 TimeStampToken',
    'timestamped-data': 'RFC 5544 TimeStampedData',
    unknown: 'Unknown cryptographic container'
  }
  return labels[kind]
}

const baseWarnings = () => [
  'Cryptographic verification does not establish certificate trust, policy compliance, qualified status, or legal validity.',
  'This ASN.1 path covers bounded CMS/PKCS#7, selected CAdES attributes, RFC 3161, and RFC 5544 TimeStampedData; ASiC, RFC 4998, JWS/JAdES metadata, and OpenPGP use separate bounded paths in this renderer.',
  'PAdES, full XMLDSig/XAdES/JAdES profile validation, S/MIME, and PGP/MIME host integration are not performed by this ASN.1 path.',
  'No private-key operations, passphrases, trust stores, network lookups, or LGPL OpenPGP source are used or bundled.'
]

const inspectCmsNode = async (
  bytes: Uint8Array,
  root: Asn1Node,
  originalContent: Uint8Array | undefined,
  limits: SignatureAsn1Limits
): Promise<SignatureInspection> => {
  const cms = parseCmsContentInfo(bytes, root, limits)
  await enrichCertificateFingerprints(cms.certificates, bytes)
  const verificationContent = cms.embeddedContent || originalContent
  await Promise.all(
    cms.signers.map((signer) => verifySigner(bytes, signer, cms.certificates, verificationContent))
  )
  const kind = cmsKind(cms)
  const timestamp =
    cms.signedContentTypeOid === OID.tstInfo && cms.embeddedContent
      ? await parseTstInfo(cms.embeddedContent, originalContent, limits)
      : undefined
  return {
    kind,
    detectedFormat: detectedFormatForKind(kind),
    sourceSize: bytes.byteLength,
    contentTypeOid: cms.contentTypeOid,
    contentType: formatOid(cms.contentTypeOid),
    signedContentTypeOid: cms.signedContentTypeOid,
    signedContentType: formatOid(cms.signedContentTypeOid),
    digestAlgorithms: cms.digestAlgorithmOids.map(formatOid),
    embeddedContent: cms.embeddedContent,
    detached:
      cms.contentTypeOid === OID.signedData && !cms.embeddedContent && cms.signers.length > 0,
    requiresOriginalContent:
      (cms.contentTypeOid === OID.signedData && !cms.embeddedContent && cms.signers.length > 0) ||
      Boolean(timestamp?.messageImprint && originalContent === undefined),
    originalContentSupplied: Boolean(originalContent),
    certificates: cms.certificates.map((certificate) => certificate.summary),
    signers: cms.signers.map((signer) => signer.summary),
    timestamp,
    crlCount: cms.crlCount,
    warnings: baseWarnings()
  }
}

const PEM_ENVELOPES = [
  {
    begin: '-----BEGIN PKCS7-----',
    end: '-----END PKCS7-----'
  },
  {
    begin: '-----BEGIN CMS-----',
    end: '-----END CMS-----'
  }
] as const

const isPemWhitespaceCode = (code: number) =>
  code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d || code === 0x20

const isBase64Code = (code: number) =>
  (code >= 0x41 && code <= 0x5a) ||
  (code >= 0x61 && code <= 0x7a) ||
  (code >= 0x30 && code <= 0x39) ||
  code === 0x2b ||
  code === 0x2f ||
  code === 0x3d

const decodePemIfNeeded = (input: Uint8Array) => {
  const head = new TextDecoder('ascii', { fatal: false }).decode(
    input.subarray(0, Math.min(input.byteLength, 128))
  )
  if (!head.includes('-----BEGIN ')) return input
  const text = new TextDecoder('ascii', { fatal: false }).decode(input)
  let envelope: (typeof PEM_ENVELOPES)[number] | undefined
  let beginIndex = -1
  for (const candidate of PEM_ENVELOPES) {
    const candidateIndex = text.indexOf(candidate.begin)
    if (candidateIndex >= 0 && (beginIndex < 0 || candidateIndex < beginIndex)) {
      envelope = candidate
      beginIndex = candidateIndex
    }
  }
  assertBounds(
    envelope && beginIndex >= 0,
    'Unsupported PEM cryptographic container. Expected PKCS7 or CMS armor.'
  )
  const payloadStart = beginIndex + envelope.begin.length
  const payloadEnd = text.indexOf(envelope.end, payloadStart)
  assertBounds(payloadEnd >= 0, 'PEM cryptographic container is missing its matching footer.')

  const chunks: string[] = []
  let chunk = ''
  let compactLength = 0
  let paddingStart = -1
  for (let index = payloadStart; index < payloadEnd; index += 1) {
    const code = text.charCodeAt(index)
    if (isPemWhitespaceCode(code)) continue
    assertBounds(isBase64Code(code), 'Malformed PEM base64 payload.')
    if (code === 0x3d) {
      if (paddingStart < 0) paddingStart = compactLength
    } else {
      assertBounds(paddingStart < 0, 'Malformed PEM base64 padding.')
    }
    chunk += String.fromCharCode(code)
    compactLength += 1
    if (chunk.length === 8192) {
      chunks.push(chunk)
      chunk = ''
    }
  }
  if (chunk) chunks.push(chunk)
  assertBounds(
    compactLength > 0 && compactLength % 4 === 0,
    'Malformed PEM base64 payload.'
  )
  assertBounds(
    paddingStart < 0 || compactLength - paddingStart <= 2,
    'Malformed PEM base64 padding.'
  )
  assertBounds(typeof atob === 'function', 'PEM decoding requires a browser with atob support.')
  let binary: string
  try {
    binary = atob(chunks.join(''))
  } catch {
    throw new Error('Malformed PEM base64 payload.')
  }
  const output = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index)
  return output
}

const findCmsContentInfoNode = (
  bytes: Uint8Array,
  node: Asn1Node,
  depth = 0
): Asn1Node | undefined => {
  if (depth > 12) return undefined
  if (isTag(node, UNIVERSAL, TAG.sequence)) {
    const first = node.children[0]
    if (first && isTag(first, UNIVERSAL, TAG.oid) && decodeOid(bytes, first) === OID.signedData)
      return node
  }
  for (const child of node.children) {
    const found = findCmsContentInfoNode(bytes, child, depth + 1)
    if (found) return found
  }
  return undefined
}

const parseTimestampedData = async (
  bytes: Uint8Array,
  root: Asn1Node,
  originalContent: Uint8Array | undefined,
  limits: SignatureAsn1Limits
): Promise<SignatureInspection> => {
  const content = root.children.find((child) => isTag(child, CONTEXT, 0))?.children[0]
  assertBounds(
    content && isTag(content, UNIVERSAL, TAG.sequence),
    'RFC 5544 TimeStampedData payload is missing.'
  )
  const fields = content.children
  let cursor = 0
  const versionNode = fields[cursor++]
  assertBounds(
    versionNode && isTag(versionNode, UNIVERSAL, TAG.integer),
    'RFC 5544 TimeStampedData version is missing.'
  )
  let dataUri: string | undefined
  if (isTag(fields[cursor], UNIVERSAL, TAG.ia5String))
    dataUri = decodeString(bytes, fields[cursor++]!)
  let filename: string | undefined
  let mediaType: string | undefined
  let hashProtected: boolean | undefined
  const metadataNode =
    fields[cursor] && isTag(fields[cursor], UNIVERSAL, TAG.sequence) ? fields[cursor++] : undefined
  if (metadataNode) {
    const metadata = metadataNode.children
    if (metadata[0] && isTag(metadata[0], UNIVERSAL, TAG.boolean))
      hashProtected = decodeBoolean(bytes, metadata[0])
    for (const child of metadata.slice(1)) {
      if (
        !filename &&
        (isTag(child, UNIVERSAL, TAG.utf8String) || isTag(child, UNIVERSAL, TAG.printableString))
      )
        filename = decodeString(bytes, child)
      else if (!mediaType && isTag(child, UNIVERSAL, TAG.ia5String))
        mediaType = decodeString(bytes, child)
    }
  }
  const embeddedNode =
    fields[cursor] && isTag(fields[cursor], UNIVERSAL, TAG.octetString)
      ? fields[cursor++]
      : undefined
  const embeddedContent = embeddedNode
    ? collectOctetString(bytes, embeddedNode, limits.maxEmbeddedContentBytes)
    : undefined
  const evidenceNode = fields[cursor]
  const cmsNode = evidenceNode ? findCmsContentInfoNode(bytes, evidenceNode) : undefined
  const evidenceInspection = cmsNode
    ? await inspectCmsNode(bytes, cmsNode, embeddedContent || originalContent, limits)
    : undefined
  const evidenceEntries = evidenceNode?.children.length || 0
  assertBounds(
    evidenceEntries <= limits.maxTimestampEvidenceEntries,
    `RFC 5544 temporal evidence count exceeds ${limits.maxTimestampEvidenceEntries}.`
  )
  return {
    kind: 'timestamped-data',
    detectedFormat: detectedFormatForKind('timestamped-data'),
    sourceSize: bytes.byteLength,
    contentTypeOid: OID.timestampedData,
    contentType: formatOid(OID.timestampedData),
    digestAlgorithms: evidenceInspection?.digestAlgorithms || [],
    embeddedContent,
    detached: !embeddedContent,
    requiresOriginalContent: !embeddedContent && Boolean(dataUri),
    originalContentSupplied: Boolean(originalContent),
    certificates: evidenceInspection?.certificates || [],
    signers: evidenceInspection?.signers || [],
    timestamp: evidenceInspection?.timestamp,
    crlCount: evidenceInspection?.crlCount || 0,
    timestampedData: {
      dataUri,
      filename,
      mediaType,
      hashProtected,
      temporalEvidenceEntries: evidenceEntries
    },
    warnings: [
      ...baseWarnings(),
      ...(dataUri
        ? [
            'External RFC 5544 dataUri values are displayed as untrusted metadata and are never fetched automatically.'
          ]
        : [])
    ]
  }
}

export const inspectSignatureContainer = async (
  input: ArrayBuffer | Uint8Array,
  options: InspectSignatureOptions = {}
): Promise<SignatureInspection> => {
  const limits = normalizeSignatureAsn1Limits(options.limits)
  const rawBytes = toUint8Array(input)
  assertBounds(
    rawBytes.byteLength <= limits.maxInputBytes,
    `Cryptographic container exceeds the ${limits.maxInputBytes}-byte boundary.`
  )
  const bytes = decodePemIfNeeded(rawBytes)
  assertBounds(bytes.byteLength > 0, 'The cryptographic container is empty.')
  assertBounds(
    bytes.byteLength <= limits.maxInputBytes,
    `Decoded cryptographic container exceeds the ${limits.maxInputBytes}-byte boundary.`
  )
  const originalContent = options.originalContent
    ? toUint8Array(options.originalContent)
    : undefined
  assertBounds(
    (originalContent?.byteLength || 0) <= limits.maxOriginalContentBytes,
    `Original content exceeds the ${limits.maxOriginalContentBytes}-byte boundary.`
  )
  const root = parseRoot(bytes, limits)
  assertBounds(
    isTag(root, UNIVERSAL, TAG.sequence),
    'Unsupported cryptographic container: ASN.1 root is not a SEQUENCE.'
  )

  const first = root.children[0]
  if (first && isTag(first, UNIVERSAL, TAG.oid)) {
    const contentTypeOid = decodeOid(bytes, first)
    if (contentTypeOid === OID.timestampedData) {
      return parseTimestampedData(bytes, root, originalContent, limits)
    }
    return inspectCmsNode(bytes, root, originalContent, limits)
  }

  if (looksLikeTimestampRequest(root)) {
    const timestamp = await parseTimestampRequest(bytes, root, originalContent)
    return {
      kind: 'timestamp-request',
      detectedFormat: detectedFormatForKind('timestamp-request'),
      sourceSize: bytes.byteLength,
      digestAlgorithms: timestamp.messageImprintAlgorithm
        ? [timestamp.messageImprintAlgorithm]
        : [],
      detached: true,
      requiresOriginalContent: Boolean(timestamp.messageImprint && !originalContent),
      originalContentSupplied: Boolean(originalContent),
      certificates: [],
      signers: [],
      timestamp,
      crlCount: 0,
      warnings: baseWarnings()
    }
  }

  if (looksLikeTimestampResponse(root)) {
    const { response, tokenNode } = parseTimestampResponse(bytes, root)
    if (tokenNode) {
      const tokenInspection = await inspectCmsNode(bytes, tokenNode, originalContent, limits)
      return {
        ...tokenInspection,
        kind: 'timestamp-response',
        detectedFormat: detectedFormatForKind('timestamp-response'),
        timestampResponse: response
      }
    }
    return {
      kind: 'timestamp-response',
      detectedFormat: detectedFormatForKind('timestamp-response'),
      sourceSize: bytes.byteLength,
      digestAlgorithms: [],
      detached: true,
      requiresOriginalContent: false,
      originalContentSupplied: Boolean(originalContent),
      certificates: [],
      signers: [],
      timestampResponse: response,
      crlCount: 0,
      warnings: baseWarnings()
    }
  }

  return {
    kind: 'unknown',
    detectedFormat: detectedFormatForKind('unknown'),
    sourceSize: bytes.byteLength,
    digestAlgorithms: [],
    detached: false,
    requiresOriginalContent: false,
    originalContentSupplied: Boolean(originalContent),
    certificates: [],
    signers: [],
    crlCount: 0,
    warnings: baseWarnings()
  }
}

const countReducedHashTreeNodes = (node: Asn1Node | undefined, maximum: number) => {
  if (!node) return 0
  let count = 0
  const pending = [node]
  while (pending.length) {
    const current = pending.pop()!
    if (isTag(current, UNIVERSAL, TAG.octetString)) {
      count += 1
      assertBounds(count <= maximum, `EvidenceRecord reduced hash tree exceeds ${maximum} nodes.`)
    }
    for (const child of current.children) pending.push(child)
  }
  return count
}

const findEvidenceTimestampContentInfo = (bytes: Uint8Array, node: Asn1Node) =>
  [...node.children].reverse().find((child) => {
    if (!isTag(child, UNIVERSAL, TAG.sequence)) return false
    const oidNode = child.children[0]
    if (!oidNode || !isTag(oidNode, UNIVERSAL, TAG.oid)) return false
    try {
      return decodeOid(bytes, oidNode) === OID.signedData
    } catch {
      return false
    }
  })

/**
 * Bounded RFC 4998 structural inspection. Only the first archive timestamp can
 * be compared directly with supplied original bytes when no reduced hash tree
 * is present. Renewal chains are reported but never over-claimed as validated.
 */
export const inspectEvidenceRecord = async (
  input: ArrayBuffer | Uint8Array,
  options: InspectEvidenceRecordOptions = {}
): Promise<EvidenceRecordInspection> => {
  const limits = normalizeSignatureAsn1Limits(options.limits)
  const bytes = toUint8Array(input)
  assertBounds(bytes.byteLength > 0, 'EvidenceRecord input is empty.')
  assertBounds(
    bytes.byteLength <= limits.maxInputBytes,
    `EvidenceRecord input exceeds the ${limits.maxInputBytes}-byte boundary.`
  )
  const root = parseRoot(bytes, limits)
  assertBounds(
    isTag(root, UNIVERSAL, TAG.sequence),
    'RFC 4998 EvidenceRecord must be an ASN.1 SEQUENCE.'
  )
  const versionNode = root.children[0]
  const algorithmsNode = root.children[1]
  assertBounds(
    versionNode && isTag(versionNode, UNIVERSAL, TAG.integer),
    'EvidenceRecord version is missing.'
  )
  assertBounds(
    algorithmsNode && isTag(algorithmsNode, UNIVERSAL, TAG.sequence),
    'EvidenceRecord digestAlgorithms are missing.'
  )
  const version = integerNumber(bytes, versionNode)
  assertBounds(version === 1, `Unsupported EvidenceRecord version ${version ?? 'unknown'}.`)
  assertBounds(
    algorithmsNode.children.length > 0 &&
      algorithmsNode.children.length <= limits.maxDigestAlgorithms,
    `EvidenceRecord digest algorithm count must be between 1 and ${limits.maxDigestAlgorithms}.`
  )
  const digestAlgorithmOids = algorithmsNode.children.map((node) => algorithmOid(bytes, node))
  assertBounds(
    digestAlgorithmOids.every(Boolean),
    'EvidenceRecord contains a malformed digest algorithm.'
  )
  const digestAlgorithms = digestAlgorithmOids.map((oid) => formatOid(oid))
  const sequenceNode = [...root.children]
    .reverse()
    .find((node) => isTag(node, UNIVERSAL, TAG.sequence) && node !== algorithmsNode)
  assertBounds(sequenceNode, 'EvidenceRecord archiveTimeStampSequence is missing.')
  assertBounds(
    sequenceNode.children.length > 0 && sequenceNode.children.length <= limits.maxEvidenceChains,
    `EvidenceRecord archive timestamp chain count exceeds ${limits.maxEvidenceChains}.`
  )
  const originalContent = options.originalContent
    ? toUint8Array(options.originalContent)
    : undefined
  assertBounds(
    (originalContent?.byteLength || 0) <= limits.maxOriginalContentBytes,
    `Original content exceeds the ${limits.maxOriginalContentBytes}-byte boundary.`
  )
  const archiveTimestamps: EvidenceArchiveTimestampSummary[] = []
  let totalTimestamps = 0
  for (let chainIndex = 0; chainIndex < sequenceNode.children.length; chainIndex += 1) {
    const chain = sequenceNode.children[chainIndex]!
    assertBounds(
      isTag(chain, UNIVERSAL, TAG.sequence),
      'EvidenceRecord archive timestamp chain is malformed.'
    )
    assertBounds(
      chain.children.length > 0 && chain.children.length <= limits.maxEvidenceTimestampsPerChain,
      `EvidenceRecord archive timestamp chain exceeds ${limits.maxEvidenceTimestampsPerChain} entries.`
    )
    for (let index = 0; index < chain.children.length; index += 1) {
      totalTimestamps += 1
      assertBounds(
        totalTimestamps <= limits.maxEvidenceTimestamps,
        `EvidenceRecord archive timestamp total exceeds ${limits.maxEvidenceTimestamps}.`
      )
      const archiveTimestamp = chain.children[index]!
      assertBounds(
        isTag(archiveTimestamp, UNIVERSAL, TAG.sequence),
        'EvidenceRecord archive timestamp is malformed.'
      )
      const explicitDigest = archiveTimestamp.children.find((child) => isTag(child, CONTEXT, 0))
      const explicitAlgorithmNode = explicitDigest?.children.find((child) =>
        isTag(child, UNIVERSAL, TAG.sequence)
      )
      const digestAlgorithmOid = explicitAlgorithmNode
        ? algorithmOid(bytes, explicitAlgorithmNode)
        : digestAlgorithmOids[0]
      const reducedTree = archiveTimestamp.children.find((child) => isTag(child, CONTEXT, 2))
      const reducedHashTreeNodes = countReducedHashTreeNodes(
        reducedTree,
        limits.maxReducedHashTreeNodes
      )
      const contentInfo = findEvidenceTimestampContentInfo(bytes, archiveTimestamp)
      assertBounds(
        contentInfo,
        'EvidenceRecord archive timestamp is missing its RFC 3161 ContentInfo.'
      )
      const mayCompareOriginal = chainIndex === 0 && index === 0 && reducedHashTreeNodes === 0
      const token = await inspectCmsNode(
        bytes,
        contentInfo,
        mayCompareOriginal ? originalContent : undefined,
        limits
      )
      const allSignaturesChecked =
        token.signers.length > 0 &&
        token.signers.every((signer) => signer.cryptographicSignatureValid !== undefined)
      const timestampSignaturesValid = allSignaturesChecked
        ? token.signers.every((signer) => signer.cryptographicSignatureValid === true)
        : undefined
      archiveTimestamps.push({
        chainIndex,
        index,
        digestAlgorithmOid,
        digestAlgorithm: formatOid(digestAlgorithmOid),
        reducedHashTreeNodes,
        timestamp: token.timestamp,
        timestampSignerCount: token.signers.length,
        timestampSignaturesValid,
        evidenceDigestMatchesOriginal: mayCompareOriginal
          ? token.timestamp?.messageImprintMatchesOriginal
          : undefined,
        warnings: [
          ...(mayCompareOriginal
            ? []
            : [
                'This archive timestamp is part of a renewal/hash-tree chain and was structurally inspected, not fully replayed.'
              ]),
          ...(token.warnings || [])
        ]
      })
    }
  }
  const first = archiveTimestamps[0]
  return {
    kind: 'evidence-record',
    detectedFormat: 'RFC 4998 EvidenceRecord',
    sourceSize: bytes.byteLength,
    version,
    digestAlgorithms,
    archiveTimestampChains: sequenceNode.children.length,
    archiveTimestamps,
    originalContentSupplied: Boolean(originalContent),
    originalEvidenceMatches: first?.evidenceDigestMatchesOriginal,
    fullyValidated: false,
    warnings: [
      'EvidenceRecord parsing is separate from complete archival-evidence validation.',
      'The first timestamp can be compared directly only when it has no reduced hash tree; renewal chains are not over-claimed as validated.',
      'No TSA, OCSP, CRL, AIA, trust-list or other network endpoint is contacted automatically.',
      'Certificate trust, retention-policy compliance and legal validity are not established.'
    ]
  }
}

export const signatureOidLabels = OID_LABELS
