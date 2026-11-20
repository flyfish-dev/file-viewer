import type { FileViewerDocumentInspectionRequest } from '@file-viewer/core'
import { inspectSignatureCertificate, inspectSignatureContainer, type SignatureCertificateSummary, type SignatureInspection } from './signatureAsn1.js'
import { inspectJws } from './structured/jws.js'
import { normalizeSignatureContainerLimits, type SignatureContainerLimits } from './structured/limits.js'

export interface DocumentSignatureReference {
  uri: string
  availability: 'available' | 'missing' | 'unsupported'
  transforms?: string[]
}
export interface DocumentSignatureMetadata {
  id: string
  format: 'PDF / CMS' | 'XMLDSig / XAdES' | 'JWS / JAdES'
  fields: Record<string, string | undefined>
  certificates: SignatureCertificateSummary[]
  references: DocumentSignatureReference[]
  limitations: string[]
}
export interface DocumentSignatureMetadataResult {
  format: 'pdf' | 'xml' | 'jws'
  signatures: DocumentSignatureMetadata[]
  limitations: string[]
}

const DSIG = 'http://www.w3.org/2000/09/xmldsig#'
const XADES = new Set(['http://uri.etsi.org/01903/v1.1.1#', 'http://uri.etsi.org/01903/v1.2.2#', 'http://uri.etsi.org/01903/v1.3.2#', 'http://uri.etsi.org/01903/v1.4.1#'])
const check = (signal?: AbortSignal, deadline = Infinity) => {
  if (signal?.aborted) throw signal.reason || new Error('Document inspection cancelled.')
  if (Date.now() > deadline) throw new Error('Document inspection exceeded its processing limit.')
}
const boundedText = (value: string | null | undefined) => {
  if ((value?.length || 0) > 32768) throw new Error('Signature metadata field exceeds its limit.')
  return value?.trim() || undefined
}
const decodeCertificate = (value: string) => {
  const text = value.replace(/[\t\r\n ]/g, '')
  if (text.length > 1400000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error('Embedded certificate exceeds its structural boundary.')
  return Uint8Array.from(atob(text), char => char.charCodeAt(0))
}
const certificates = async (values: string[], signal?: AbortSignal) => {
  if (values.length > 32) throw new Error('Embedded certificate count exceeds its limit.')
  const result: SignatureCertificateSummary[] = []
  const limitations: string[] = []
  for (const value of values) {
    check(signal)
    try {
      const certificate = await inspectSignatureCertificate(decodeCertificate(value))
      check(signal)
      result.push({ ...certificate, index: result.length })
    }
    catch { check(signal); limitations.push('Embedded certificate metadata is unavailable or unsupported; signature validity was not checked.') }
  }
  if (!values.length) limitations.push('Embedded certificate is missing; signer identity and signature validity were not checked.')
  return { result, limitations }
}
const fromCms = (cms: SignatureInspection, prefix: string): DocumentSignatureMetadata[] => {
  const signers = cms.signers.length ? cms.signers : [undefined]
  return signers.map((signer, index) => ({
    id: `${prefix}:${index + 1}`, format: 'PDF / CMS',
    fields: {
      signatureAlgorithm: signer?.signatureAlgorithm,
      digestAlgorithm: signer?.digestAlgorithm || cms.digestAlgorithms.join(', '),
      claimedSigningTime: signer?.signingTime,
      signerIdentifier: signer?.sid,
      timestamp: cms.timestamp?.generationTime || (signer?.signatureTimestampTokens ? `${signer.signatureTimestampTokens} embedded token(s); not checked` : 'missing'),
      timestampPolicy: cms.timestamp?.policyOid,
      signedContentType: cms.signedContentType,
      detachedContent: cms.detached ? 'not checked (PDF ByteRange source is available locally)' : 'embedded'
    },
    certificates: cms.certificates,
    references: [],
    limitations: ['Metadata only: no signature/content-digest verification, certificate trust, revocation, qualified status or legal validity check was performed.']
  }))
}

/** PDF /Contents convention permits only zero padding following the CMS ASN.1 value. */
const pdfCmsBytes = (bytes: Uint8Array) => {
  if (bytes.length < 2 || bytes[0] !== 0x30) throw new Error('PDF signature contents are not a supported CMS SEQUENCE.')
  let length = bytes[1]!, offset = 2
  if (length & 0x80) {
    const count = length & 0x7f
    if (!count || count > 4 || count + 2 > bytes.length) throw new Error('Unsupported PDF CMS outer length.')
    length = 0
    for (let index = 0; index < count; index++) length = length * 256 + bytes[offset++]!
  }
  const end = offset + length
  if (end > bytes.length || bytes.subarray(end).some(value => value !== 0)) throw new Error('PDF CMS contents have unsupported trailing data or length.')
  return bytes.subarray(0, end)
}

export const inspectPdfDocumentMetadata = async (request: FileViewerDocumentInspectionRequest): Promise<DocumentSignatureMetadataResult | null> => {
  if (!request.readPdfSignatures || !request.originalBytes.length) return null
  check(request.signal)
  const source = await request.readPdfSignatures(request.originalBytes, request.signal)
  if (!source.signatures.length) return null
  if (source.signatures.length > 64) throw new Error('PDF signature count exceeds its limit.')
  const signatures: DocumentSignatureMetadata[] = []
  for (const dictionary of source.signatures) {
    check(request.signal)
    let rows: DocumentSignatureMetadata[]
    try {
      if (!dictionary.contents?.length) throw new Error('Embedded CMS contents are missing.')
      const cms = await inspectSignatureContainer(pdfCmsBytes(dictionary.contents), { metadataOnly: true, limits: { maxSigners: 64, maxCertificates: 32 } })
      check(request.signal)
      rows = fromCms(cms, dictionary.id)
    } catch (error) {
      check(request.signal)
      rows = [{ id: dictionary.id, format: 'PDF / CMS', fields: {}, certificates: [], references: [], limitations: [error instanceof Error ? error.message : 'CMS metadata unavailable.'] }]
    }
    for (const row of rows) {
      Object.assign(row.fields, Object.fromEntries(Object.entries(dictionary.fields).map(([key, value]) => [key, value === undefined ? undefined : String(value)])))
      row.fields.byteRange = dictionary.byteRange?.join(', ')
      row.fields.revisionEnd = dictionary.revisionEnd === undefined ? undefined : String(dictionary.revisionEnd)
      row.fields.detachedContent = dictionary.byteRange ? 'Original PDF byte ranges available; not checked' : 'PDF byte ranges missing or unsupported; not checked'
      row.references.push({ uri: 'Original PDF ByteRange', availability: dictionary.byteRange ? 'available' : 'unsupported' })
      row.limitations.push(...dictionary.warnings)
    }
    if (signatures.length + rows.length > 64) throw new Error('PDF document signer count exceeds its metadata limit.')
    signatures.push(...rows)
  }
  return { format: 'pdf', signatures, limitations: source.warnings }
}

const decodeXmlSource = (bytes: Uint8Array) => {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le', { fatal: true }).decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be', { fatal: true }).decode(bytes)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

// XML element names cannot be encoded as character references. Match the local
// name before parsing, then let the DOM resolve the actual signature namespace.
const potentialXmlSignature = /<(?:[^\s<>:/'"]+:)?Signature(?=[\s/>])/

const parseXmlSource = (text: string, signal?: AbortSignal) => {
  // Never pass DTD/entity declarations or stylesheet instructions to a DOM implementation.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b|<\?xml-stylesheet\b/i.test(text)) throw new Error('XML metadata inspection does not allow DTDs, entity declarations or external stylesheet instructions.')
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML metadata structure is unavailable.')
  let count = 0
  const stack: Array<[Element, number]> = [[doc.documentElement, 0]]
  while (stack.length) {
    check(signal)
    const [element, depth] = stack.pop()!
    if (++count > 50000 || depth > 64) throw new Error('XML metadata node/depth limit exceeded.')
    for (const child of Array.from(element.children)) stack.push([child, depth + 1])
  }
  return doc
}

export const inspectXmlDocumentMetadata = async (
  bytes: Uint8Array,
  signal?: AbortSignal,
  limits?: Partial<SignatureContainerLimits>,
  probingMarkup = false
): Promise<DocumentSignatureMetadataResult | null> => {
  const bounds = normalizeSignatureContainerLimits(limits)
  if (bytes.byteLength > Math.min(4 * 1024 * 1024, bounds.maxXmlBytes)) throw new Error('XML inspection exceeds its byte limit.')
  check(signal)
  const text = decodeXmlSource(bytes)
  // A leading angle bracket also occurs in source code and HTML fragments.
  // Parse declared XML as before and inspect renamed files with signature markup.
  if (probingMarkup && !/^\s*<\?xml\s/.test(text) && !potentialXmlSignature.test(text)) return null
  const doc = parseXmlSource(text, signal)
  const found = Array.from(doc.getElementsByTagNameNS(DSIG, 'Signature'))
  if (!found.length) return null
  if (found.length > 64) throw new Error('XML signature count exceeds its limit.')
  const ids = new Map<string, Element[]>()
  for (const element of Array.from(doc.getElementsByTagName('*'))) {
    for (const attr of Array.from(element.attributes)) if (['Id', 'ID', 'id'].includes(attr.name) || (attr.namespaceURI === 'http://www.w3.org/XML/1998/namespace' && attr.localName === 'id')) {
      const list = ids.get(attr.value) || []; if (!list.includes(element)) list.push(element); ids.set(attr.value, list)
    }
  }
  const signatures: DocumentSignatureMetadata[] = []
  const deadline = Date.now() + Math.min(20000, bounds.maxWorkerMs)
  for (const [index, signature] of found.entries()) {
    check(signal, deadline)
    const children = (parent: Element, namespace: string, name: string) => Array.from(parent.children).filter(element => element.namespaceURI === namespace && element.localName === name)
    const descend = (parent: Element) => {
      const elements: Element[] = []
      const visit = (parent: Element) => {
      for (const element of Array.from(parent.children)) {
        if (element.namespaceURI === DSIG && element.localName === 'Signature') continue
        elements.push(element); visit(element)
      }
      }
      visit(parent); return elements
    }
    const signedInfos = children(signature, DSIG, 'SignedInfo')
    const info = signedInfos.length === 1 ? signedInfos[0] : undefined
    const ds = (name: string) => info ? children(info, DSIG, name) : []
    const keyInfos = children(signature, DSIG, 'KeyInfo')
    const keyData = keyInfos.length === 1 ? children(keyInfos[0]!, DSIG, 'X509Data') : []
    const key = (name: string) => keyData.flatMap(data => children(data, DSIG, name))
    const signatureId = signature.getAttribute('Id')
    const properties = children(signature, DSIG, 'Object').flatMap(descend).filter(element => XADES.has(element.namespaceURI || '') && element.localName === 'QualifyingProperties')
    const associated = properties.filter(element => signatureId && ids.get(signatureId)?.length === 1 && element.getAttribute('Target') === `#${signatureId}`)
    const xadesElements = associated.flatMap(descend)
    const xades = (name: string) => xadesElements.filter(element => XADES.has(element.namespaceURI || '') && element.localName === name)
    const cert = await certificates(key('X509Certificate').map(element => element.textContent || ''), signal)
    const references = ds('Reference')
    if (references.length > 1024) throw new Error('XML signature reference count exceeds its limit.')
    signatures.push({
      id: signature.getAttribute('Id') || `XML signature ${index + 1}`, format: 'XMLDSig / XAdES',
      fields: {
        signatureAlgorithm: boundedText(ds('SignatureMethod')[0]?.getAttribute('Algorithm')),
        digestAlgorithm: [...new Set(references.flatMap(reference => children(reference, DSIG, 'DigestMethod')).map(element => boundedText(element.getAttribute('Algorithm')) || 'missing'))].join(', '),
        canonicalization: boundedText(ds('CanonicalizationMethod')[0]?.getAttribute('Algorithm')),
        claimedSigningTime: boundedText(xades('SigningTime')[0]?.textContent),
        timestamp: xades('EncapsulatedTimeStamp').length ? `${xades('EncapsulatedTimeStamp').length} embedded timestamp(s); not checked` : 'missing',
        claimedSigner: boundedText(key('X509SubjectName')[0]?.textContent),
        signatureValue: children(signature, DSIG, 'SignatureValue').length === 1 ? 'present; not checked' : 'missing or ambiguous; not checked'
      }, certificates: cert.result,
      references: references.map(reference => {
        const uri = boundedText(reference.getAttribute('URI')) || ''
        const transforms = children(reference, DSIG, 'Transforms').flatMap(element => children(element, DSIG, 'Transform')).map(element => boundedText(element.getAttribute('Algorithm')) || 'missing')
        let availability: DocumentSignatureReference['availability'] = 'missing'
        if (!uri) availability = 'available'
        else if (uri.startsWith('#')) availability = ids.get(uri.slice(1))?.length === 1 ? 'available' : 'unsupported'
        return { uri: uri || '(whole document)', availability, transforms }
      }),
      limitations: [...cert.limitations, ...(signedInfos.length !== 1 ? ['SignedInfo is missing or ambiguous; its metadata is unavailable.'] : []), ...(keyInfos.length > 1 ? ['KeyInfo is ambiguous; no certificate was attributed to this signature.'] : []), ...(properties.length !== associated.length ? ['Unassociated XAdES properties were not attributed to this signature.'] : []), 'Signature values, reference digests, canonicalization and transforms were not executed or checked; external references were not fetched.']
    })
  }
  return { format: 'xml', signatures, limitations: ['XMLDSig/XAdES structures are metadata, not a statement of ETSI profile compliance or validity.'] }
}

const headerText = (header: Record<string, unknown>) => {
  const stack: Array<[unknown, number]> = [[header, 0]]
  let nodes = 0
  while (stack.length) {
    const [value, depth] = stack.pop()!
    if (++nodes > 10000 || depth > 64) throw new Error('JWS metadata header node/depth limit exceeded.')
    if (value && typeof value === 'object') for (const child of Object.values(value)) stack.push([child, depth + 1])
  }
  return boundedText(JSON.stringify(header))
}
export const inspectJwsDocumentMetadata = async (bytes: Uint8Array, signal?: AbortSignal, limits?: Partial<SignatureContainerLimits>): Promise<DocumentSignatureMetadataResult> => {
  check(signal)
  const bounds = normalizeSignatureContainerLimits(limits)
  if (bytes.byteLength > Math.min(8 * 1024 * 1024, bounds.maxJsonBytes)) throw new Error('JWS metadata inspection exceeds its byte limit.')
  const jws = await inspectJws(bytes, { metadataOnly: true, limits: { ...bounds, maxJwsSignatures: Math.min(64, bounds.maxJwsSignatures) } })
  check(signal)
  const signatures: DocumentSignatureMetadata[] = []
  for (const signature of jws.signatures) {
    check(signal)
    const protectedText = headerText(signature.protectedHeader), unprotectedText = headerText(signature.unprotectedHeader)
    const chain = signature.protectedHeader.x5c || signature.unprotectedHeader.x5c
    if (chain !== undefined && (!Array.isArray(chain) || !chain.every(value => typeof value === 'string'))) throw new Error('JWS embedded certificate list is unsupported.')
    const cert = await certificates(Array.isArray(chain) ? chain.filter((value): value is string => typeof value === 'string') : [], signal)
    const critical = signature.unsupportedCriticalHeaders || []
    signatures.push({
      id: `JWS signature ${signature.index + 1}`, format: 'JWS / JAdES',
      fields: {
        signatureAlgorithm: signature.algorithm, keyId: signature.keyId,
        claimedSigningTime: String(signature.protectedHeader.sigT ?? signature.protectedHeader.iat ?? '') || undefined,
        protectedHeader: protectedText,
        unprotectedHeader: unprotectedText,
        criticalExtensions: critical.length ? `unsupported: ${critical.join(', ')}` : 'none',
        jadesProperties: signature.jadesProperties.join(', '),
        serialization: jws.serialization,
        detachedContent: jws.detached ? 'missing (not fetched)' : 'embedded'
      }, certificates: cert.result,
      references: [{ uri: jws.detached ? 'Detached payload' : 'Embedded payload', availability: jws.detached ? 'missing' : 'available' }],
      limitations: [...cert.limitations, ...(signature.metadataWarnings || []), ...(!/^(?:(?:RS|PS|ES)(?:256|384|512)|EdDSA|HS(?:256|384|512))$/.test(signature.algorithm || '') ? ['The declared signature algorithm is unsupported or missing; metadata only.'] : []), ...(critical.length ? ['Critical extensions are displayed but unsupported; no verification was attempted.'] : []), 'Header fields are unverified claims; protected and unprotected fields are displayed separately.', 'Public keys, certificates, JWKS, revocation endpoints and detached payloads were not fetched.']
    })
  }
  return { format: 'jws', signatures, limitations: ['All signatures are unverified. No trust, qualified-status or full JAdES-conformity conclusion is made.'] }
}

/** Content detection is independent of the filename; no document reference is followed. */
export const inspectDocumentSignatureMetadata = async (request: FileViewerDocumentInspectionRequest): Promise<DocumentSignatureMetadataResult | null> => {
  const bytes = request.originalBytes
  const limits = normalizeSignatureContainerLimits(request.context?.options?.signature?.containerLimits)
  check(request.signal)
  if (!bytes.byteLength) {
    if (request.type.toLowerCase() === 'pdf') throw new Error('Signature metadata is unavailable without bounded original PDF bytes. Supply an original File/buffer or use pdf.streaming: false. A streamed URL is not an unsigned-document result.')
    return null
  }
  if (bytes.byteLength > Math.min(64 * 1024 * 1024, limits.maxContainerBytes)) throw new Error('Document inspection input exceeds its byte limit.')
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 2048)).trim()
  if (head.startsWith('%PDF-')) return inspectPdfDocumentMetadata(request)
  if (head.startsWith('<') || (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    return inspectXmlDocumentMetadata(bytes, request.signal, limits, request.type.toLowerCase() !== 'xml')
  }
  if (bytes.byteLength > Math.min(8 * 1024 * 1024, limits.maxJsonBytes)) {
    if (head.startsWith('{') || /^(?:json|jws)$/i.test(request.type) || /^[A-Za-z0-9_-]+\./.test(head)) throw new Error('JWS metadata inspection exceeds its byte limit; no unsigned-document conclusion was made.')
    return null
  }
  if (head.startsWith('{')) {
    let value: Record<string, unknown>
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Record<string, unknown> } catch { return null }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const signature = (entry: unknown) => Boolean(entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).signature === 'string' && (typeof (entry as Record<string, unknown>).protected === 'string' || typeof (entry as Record<string, unknown>).header === 'object'))
    if (!signature(value) && !(Array.isArray(value.signatures) && value.signatures.some(signature))) return null
  } else if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*$/.test(new TextDecoder().decode(bytes).trim())) return null
  return inspectJwsDocumentMetadata(bytes, request.signal, limits)
}
