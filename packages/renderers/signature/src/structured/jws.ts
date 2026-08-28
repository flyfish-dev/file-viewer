import { normalizeSignatureContainerLimits } from './limits.js'
import type {
  InspectJwsOptions,
  JwsInspection,
  JwsSignatureInspection,
  JwsVerificationKey
} from './types.js'

interface ParsedJwsSignature {
  protectedSegment: string
  protectedHeader: Record<string, unknown>
  unprotectedHeader: Record<string, unknown>
  signatureSegment: string
}

const textEncoder = new TextEncoder()
const strictUtf8 = new TextDecoder('utf-8', { fatal: true })
const JADES_HEADER_NAMES = new Set([
  'sigT',
  'x5t#S256',
  'x5c',
  'etsiU',
  'etsiQcs',
  'etsiP',
  'srCms',
  'rSig',
  'sigD',
  'adoTst'
])

const assertJws: (condition: unknown, message: string) => asserts condition = (
  condition,
  message
) => {
  if (!condition) throw new Error(`Invalid JWS: ${message}`)
}

const ownRecord = (value: unknown, label: string): Record<string, unknown> => {
  assertJws(
    Boolean(value) && typeof value === 'object' && !Array.isArray(value),
    `${label} must be a JSON object.`
  )
  const input = value as Record<string, unknown>
  const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>
  for (const key of Object.keys(input)) {
    assertJws(
      key !== '__proto__' && key !== 'prototype' && key !== 'constructor',
      `${label} contains a forbidden property.`
    )
    output[key] = input[key]
  }
  return output
}

const decodeBase64Url = (value: string, label: string, maxBytes: number) => {
  assertJws(/^[A-Za-z0-9_-]*$/u.test(value), `${label} is not base64url.`)
  assertJws(
    value.length <= Math.ceil((maxBytes * 4) / 3) + 4,
    `${label} exceeds ${maxBytes} decoded bytes.`
  )
  const remainder = value.length % 4
  assertJws(remainder !== 1, `${label} has invalid base64url length.`)
  const padded = value.replace(/-/gu, '+').replace(/_/gu, '/') + '='.repeat((4 - remainder) % 4)
  let binary: string
  try {
    binary = globalThis.atob(padded)
  } catch {
    throw new Error(`Invalid JWS: ${label} cannot be decoded.`)
  }
  assertJws(binary.length <= maxBytes, `${label} exceeds ${maxBytes} decoded bytes.`)
  const output = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index)
  return output
}

const encodeBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize))
    )
  }
  return globalThis.btoa(binary).replace(/=/gu, '').replace(/\+/gu, '-').replace(/\//gu, '_')
}

const parseProtectedHeader = (segment: string, maxHeaderBytes: number) => {
  const bytes = decodeBase64Url(segment, 'protected header', maxHeaderBytes)
  let parsed: unknown
  try {
    parsed = JSON.parse(strictUtf8.decode(bytes))
  } catch {
    throw new Error('Invalid JWS: protected header is not strict UTF-8 JSON.')
  }
  return ownRecord(parsed, 'protected header')
}

const parseJsonInput = (bytes: Uint8Array, maxJsonBytes: number) => {
  assertJws(bytes.byteLength <= maxJsonBytes, `JSON serialization exceeds ${maxJsonBytes} bytes.`)
  try {
    return ownRecord(JSON.parse(strictUtf8.decode(bytes)), 'JWS JSON serialization')
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid JWS:')) throw error
    const symptom = new Error('Invalid JWS: JSON serialization is malformed or not strict UTF-8.') as Error & {
      cause?: unknown
    }
    symptom.cause = error
    throw symptom
  }
}

const parseSignatures = (
  input: string,
  bytes: Uint8Array,
  maxJsonBytes: number,
  maxHeaderBytes: number,
  maxSignatures: number
) => {
  const trimmed = input.trim()
  if (!trimmed.startsWith('{')) {
    const segments = trimmed.split('.')
    assertJws(segments.length === 3, 'compact serialization must contain exactly three segments.')
    return {
      serialization: 'compact' as const,
      payloadField: segments[1]!,
      signatures: [
        {
          protectedSegment: segments[0]!,
          protectedHeader: parseProtectedHeader(segments[0]!, maxHeaderBytes),
          unprotectedHeader: Object.create(null) as Record<string, unknown>,
          signatureSegment: segments[2]!
        }
      ]
    }
  }
  const json = parseJsonInput(bytes, maxJsonBytes)
  const payloadField = json.payload
  assertJws(
    payloadField === undefined || typeof payloadField === 'string',
    'payload must be a string when present.'
  )
  const rawSignatures = Array.isArray(json.signatures)
    ? json.signatures
    : [{ protected: json.protected, header: json.header, signature: json.signature }]
  assertJws(
    rawSignatures.length > 0 && rawSignatures.length <= maxSignatures,
    `signature count must be between 1 and ${maxSignatures}.`
  )
  const signatures: ParsedJwsSignature[] = rawSignatures.map((raw, index) => {
    const value = ownRecord(raw, `signature ${index + 1}`)
    assertJws(
      typeof value.signature === 'string',
      `signature ${index + 1} is missing its signature value.`
    )
    const protectedSegment = value.protected === undefined ? '' : value.protected
    assertJws(
      typeof protectedSegment === 'string',
      `signature ${index + 1} protected header must be a string.`
    )
    return {
      protectedSegment,
      protectedHeader: protectedSegment
        ? parseProtectedHeader(protectedSegment, maxHeaderBytes)
        : (Object.create(null) as Record<string, unknown>),
      unprotectedHeader:
        value.header === undefined
          ? (Object.create(null) as Record<string, unknown>)
          : ownRecord(value.header, `signature ${index + 1} unprotected header`),
      signatureSegment: value.signature
    }
  })
  return {
    serialization: Array.isArray(json.signatures)
      ? ('json-general' as const)
      : ('json-flattened' as const),
    payloadField,
    signatures
  }
}

const concatBytes = (...parts: Uint8Array[]) => {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const result = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.byteLength
  }
  return result
}

const algorithmParameters = (algorithm: string) => {
  const hash = algorithm.endsWith('256')
    ? 'SHA-256'
    : algorithm.endsWith('384')
      ? 'SHA-384'
      : algorithm.endsWith('512')
        ? 'SHA-512'
        : undefined
  if (/^RS(?:256|384|512)$/u.test(algorithm))
    return {
      importAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash },
      verifyAlgorithm: { name: 'RSASSA-PKCS1-v1_5' },
      keyType: 'RSA'
    }
  if (/^PS(?:256|384|512)$/u.test(algorithm))
    return {
      importAlgorithm: { name: 'RSA-PSS', hash },
      verifyAlgorithm: { name: 'RSA-PSS', saltLength: Number(algorithm.slice(2)) / 8 },
      keyType: 'RSA'
    }
  if (/^ES(?:256|384|512)$/u.test(algorithm)) {
    const namedCurve = algorithm === 'ES256' ? 'P-256' : algorithm === 'ES384' ? 'P-384' : 'P-521'
    return {
      importAlgorithm: { name: 'ECDSA', namedCurve },
      verifyAlgorithm: { name: 'ECDSA', hash },
      keyType: 'EC',
      namedCurve
    }
  }
  if (algorithm === 'EdDSA')
    return {
      importAlgorithm: { name: 'Ed25519' },
      verifyAlgorithm: { name: 'Ed25519' },
      keyType: 'OKP'
    }
  return undefined
}

const isCryptoKey = (value: CryptoKey | JsonWebKey): value is CryptoKey =>
  typeof value === 'object' &&
  value !== null &&
  'algorithm' in value &&
  'usages' in value &&
  'type' in value

const importVerificationKey = async (candidate: JwsVerificationKey, algorithm: string) => {
  const parameters = algorithmParameters(algorithm)
  if (!parameters) throw new Error(`Unsupported or unsafe JWS algorithm ${algorithm}.`)
  if (isCryptoKey(candidate.key)) {
    if (candidate.key.type !== 'public' || !candidate.key.usages.includes('verify'))
      throw new Error('JWS verification requires a public CryptoKey with verify usage.')
    return candidate.key
  }
  const jwk = candidate.key
  if ('d' in jwk || 'k' in jwk)
    throw new Error('Private or symmetric JWK material is not accepted by the preview verifier.')
  if (jwk.kty !== parameters.keyType)
    throw new Error(`JWK type ${jwk.kty || 'unknown'} does not match ${algorithm}.`)
  if (parameters.namedCurve && jwk.crv !== parameters.namedCurve)
    throw new Error(`JWK curve ${jwk.crv || 'unknown'} does not match ${algorithm}.`)
  return globalThis.crypto.subtle.importKey(
    'jwk',
    jwk,
    parameters.importAlgorithm as AlgorithmIdentifier,
    false,
    ['verify']
  )
}

const verifyOne = async (
  signature: ParsedJwsSignature,
  signatureBytes: Uint8Array,
  signingInput: Uint8Array,
  keys: JwsVerificationKey[]
) => {
  const algorithm = signature.protectedHeader.alg
  assertJws(
    typeof algorithm === 'string' && algorithm.length > 0,
    'alg must be present in the protected header.'
  )
  assertJws(
    algorithm !== 'none' && !algorithm.startsWith('HS'),
    `algorithm ${algorithm} is not accepted by this public-key verifier.`
  )
  const parameters = algorithmParameters(algorithm)
  assertJws(parameters, `algorithm ${algorithm} is unsupported.`)
  const keyId =
    typeof signature.protectedHeader.kid === 'string'
      ? signature.protectedHeader.kid
      : typeof signature.unprotectedHeader.kid === 'string'
        ? signature.unprotectedHeader.kid
        : undefined
  const candidates = keyId
    ? keys.filter((candidate) => !candidate.kid || candidate.kid === keyId)
    : keys
  if (!candidates.length)
    return {
      valid: undefined,
      error: keyId
        ? `No verification key matched kid ${keyId}.`
        : 'A public verification key is required.'
    }
  let lastError: unknown
  for (const candidate of candidates.slice(0, 64)) {
    try {
      const key = await importVerificationKey(candidate, algorithm)
      const valid = await globalThis.crypto.subtle.verify(
        parameters.verifyAlgorithm as AlgorithmIdentifier,
        key,
        signatureBytes as Uint8Array<ArrayBuffer>,
        signingInput as Uint8Array<ArrayBuffer>
      )
      if (valid) return { valid: true }
    } catch (error) {
      lastError = error
    }
  }
  return {
    valid: false,
    error:
      lastError instanceof Error
        ? lastError.message
        : 'No supplied public key verified the signature.'
  }
}

const checkHeaderBoundary = (signature: ParsedJwsSignature) => {
  const protectedKeys = new Set(Object.keys(signature.protectedHeader))
  for (const key of Object.keys(signature.unprotectedHeader)) {
    assertJws(
      !protectedKeys.has(key),
      `header parameter ${key} appears in both protected and unprotected headers.`
    )
  }
  assertJws(typeof signature.protectedHeader.alg === 'string', 'alg must be integrity protected.')
  const critical = signature.protectedHeader.crit
  if (critical !== undefined) {
    assertJws(
      Array.isArray(critical) && critical.every((value) => typeof value === 'string'),
      'crit must be an array of header names.'
    )
    const unique = new Set(critical as string[])
    assertJws(unique.size === critical.length, 'crit contains duplicate names.')
    for (const name of unique) assertJws(name === 'b64', `unsupported critical header ${name}.`)
  }
  const b64 = signature.protectedHeader.b64
  assertJws(b64 === undefined || typeof b64 === 'boolean', 'b64 must be boolean.')
  if (b64 === false)
    assertJws(
      Array.isArray(critical) && critical.includes('b64'),
      'b64=false must be declared critical.'
    )
}

export const isProbablyJws = (bytes: Uint8Array, filename?: string) => {
  if (filename?.toLowerCase().endsWith('.jws')) return true
  if (bytes.byteLength > 64 * 1024 * 1024) return false
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.byteLength, 4096)))
    .trim()
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+$/u.test(head) && bytes.byteLength <= 4096)
    return true
  return head.startsWith('{') && (head.includes('"signature"') || head.includes('"signatures"'))
}

export const inspectJws = async (
  input: ArrayBuffer | Uint8Array | string,
  options: InspectJwsOptions = {}
): Promise<JwsInspection> => {
  const limits = normalizeSignatureContainerLimits(options.limits)
  const bytes =
    typeof input === 'string'
      ? textEncoder.encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input)
  assertJws(
    bytes.byteLength > 0 && bytes.byteLength <= limits.maxContainerBytes,
    `input exceeds ${limits.maxContainerBytes} bytes.`
  )
  let source: string
  try {
    source = strictUtf8.decode(bytes)
  } catch {
    throw new Error('Invalid JWS: serialization must be strict UTF-8.')
  }
  const parsed = parseSignatures(
    source,
    bytes,
    limits.maxJsonBytes,
    Math.min(limits.maxJsonBytes, 64 * 1024),
    limits.maxJwsSignatures
  )
  const detachedPayload = options.detachedPayload
    ? options.detachedPayload instanceof Uint8Array
      ? options.detachedPayload
      : new Uint8Array(options.detachedPayload)
    : undefined
  assertJws(
    !detachedPayload || detachedPayload.byteLength <= limits.maxEntryBytes,
    `detached payload exceeds ${limits.maxEntryBytes} bytes.`
  )
  const warnings = [
    'JWS parsing and public-key signature verification do not establish key trust, signer identity, policy compliance or legal validity.',
    'jku, x5u and other remote key or certificate locations are displayed as metadata and are never fetched automatically.'
  ]

  let sharedPayload: Uint8Array | undefined
  const detached = parsed.payloadField === undefined || parsed.payloadField === ''
  let payloadEncoded = true
  const inspections: JwsSignatureInspection[] = []
  for (let index = 0; index < parsed.signatures.length; index += 1) {
    const signature = parsed.signatures[index]!
    checkHeaderBoundary(signature)
    const encoded = signature.protectedHeader.b64 !== false
    if (index === 0) payloadEncoded = encoded
    else assertJws(payloadEncoded === encoded, 'all signatures must use the same b64 payload mode.')
    let payload: Uint8Array | undefined
    let payloadSegment: Uint8Array | undefined
    if (detached) {
      payload = detachedPayload
      payloadSegment = payload
        ? encoded
          ? textEncoder.encode(encodeBase64Url(payload))
          : payload
        : undefined
    } else if (encoded) {
      payload = decodeBase64Url(parsed.payloadField as string, 'payload', limits.maxEntryBytes)
      payloadSegment = textEncoder.encode(parsed.payloadField as string)
    } else {
      payload = textEncoder.encode(parsed.payloadField as string)
      assertJws(
        payload.byteLength <= limits.maxEntryBytes,
        `payload exceeds ${limits.maxEntryBytes} bytes.`
      )
      payloadSegment = payload
    }
    if (payload) {
      sharedPayload ||= payload
      assertJws(
        sharedPayload.byteLength === payload.byteLength &&
          sharedPayload.every((value, offset) => value === payload![offset]),
        'signatures resolved to inconsistent payload bytes.'
      )
    }
    const signatureBytes = decodeBase64Url(
      signature.signatureSegment,
      `signature ${index + 1}`,
      64 * 1024
    )
    const signingInput = payloadSegment
      ? concatBytes(textEncoder.encode(`${signature.protectedSegment}.`), payloadSegment)
      : undefined
    let cryptographicValid: boolean | undefined
    let verificationError: string | undefined
    try {
      if (!signingInput) {
        verificationError =
          'Detached payload is required before the cryptographic signature can be checked.'
      } else {
        const result = await verifyOne(
          signature,
          signatureBytes,
          signingInput,
          options.verificationKeys || []
        )
        cryptographicValid = result.valid
        verificationError = result.error
      }
    } catch (error) {
      cryptographicValid = false
      verificationError = error instanceof Error ? error.message : String(error)
    }
    const algorithm = signature.protectedHeader.alg as string
    const keyId = (signature.protectedHeader.kid || signature.unprotectedHeader.kid) as
      | string
      | undefined
    inspections.push({
      index,
      algorithm,
      keyId,
      protectedHeader: signature.protectedHeader,
      unprotectedHeader: signature.unprotectedHeader,
      signatureBytes: signatureBytes.byteLength,
      cryptographicValid,
      verificationError,
      jadesProperties: [
        ...new Set(
          [
            ...Object.keys(signature.protectedHeader),
            ...Object.keys(signature.unprotectedHeader)
          ].filter((name) => JADES_HEADER_NAMES.has(name))
        )
      ]
    })
  }
  return {
    serialization: parsed.serialization,
    sourceSize: bytes.byteLength,
    detached,
    payloadEncoded,
    payload: sharedPayload,
    signatures: inspections,
    warnings
  }
}
