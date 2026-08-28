import JSZip from 'jszip'
import { normalizeSignatureContainerLimits, type SignatureContainerLimits } from './limits.js'
import { inspectZipCentralDirectory, type SafeZipEntry } from './zipPreflight.js'
import type { AsicArchiveMember, AsicInspection, AsicSignatureMember } from './types.js'

const ASICS_MIME = 'application/vnd.etsi.asic-s+zip'
const ASICE_MIME = 'application/vnd.etsi.asic-e+zip'
const METADATA_PREFIX = 'META-INF/'

const getExtension = (name: string) => {
  const basename = name.split('/').pop() || ''
  const dot = basename.lastIndexOf('.')
  return dot > 0 ? basename.slice(dot + 1).toLowerCase() : ''
}

const signatureKind = (name: string): AsicSignatureMember['kind'] => {
  const extension = getExtension(name)
  if (['p7s', 'p7m', 'p7b', 'p7c', 'pkcs7', 'cms', 'cmsc'].includes(extension)) return 'cades'
  if (['tst', 'tsr', 'tsq', 'tsd'].includes(extension)) return 'timestamp'
  if (extension === 'ers') return 'evidence-record'
  if (extension === 'jws') return 'jws'
  if (extension === 'xml') return 'xades-or-xml'
  return 'unknown'
}

const contentTypeForName = (name: string) => {
  const extension = getExtension(name)
  return (
    {
      pdf: 'application/pdf',
      xml: 'application/xml',
      json: 'application/json',
      txt: 'text/plain',
      html: 'text/html',
      htm: 'text/html',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } as Record<string, string>
  )[extension]
}

const safeArchiveReference = (value: string) => {
  if (
    !value ||
    value.startsWith('#') ||
    value.includes('\u0000') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)
  )
    return undefined
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return undefined
  }
  if (decoded.startsWith('/') || decoded.includes('\\')) return undefined
  const parts = decoded.split('/')
  if (parts.some((part) => part === '..' || part === '.')) return undefined
  return decoded.normalize('NFC')
}

/** Linear, non-validating extraction of same-container URI metadata only. */
const collectXmlReferences = (data: Uint8Array, maxXmlBytes: number) => {
  if (data.byteLength > maxXmlBytes) return []
  const text = new TextDecoder('utf-8', { fatal: false }).decode(data)
  const references: string[] = []
  let cursor = 0
  while (cursor < text.length && references.length < 256) {
    const uri = text.indexOf('URI', cursor)
    if (uri < 0) break
    cursor = uri + 3
    while (cursor < text.length && /\s/u.test(text[cursor]!)) cursor += 1
    if (text[cursor] !== '=') continue
    cursor += 1
    while (cursor < text.length && /\s/u.test(text[cursor]!)) cursor += 1
    const quote = text[cursor]
    if (quote !== '"' && quote !== "'") continue
    const end = text.indexOf(quote, cursor + 1)
    if (end < 0 || end - cursor > 4096) break
    const safe = safeArchiveReference(text.slice(cursor + 1, end))
    if (safe && !references.includes(safe)) references.push(safe)
    cursor = end + 1
  }
  return references
}

const extractChecked = async (zip: JSZip, entry: SafeZipEntry) => {
  const file = zip.file(entry.name)
  if (!file) throw new Error(`ASiC entry ${entry.name} disappeared after ZIP validation.`)
  const data = await file.async('uint8array')
  if (data.byteLength !== entry.uncompressedSize) {
    throw new Error(`ASiC entry ${entry.name} inflated to an unexpected size.`)
  }
  return data
}

export const inspectAsicContainer = async (
  input: ArrayBuffer | Uint8Array,
  requestedLimits?: Partial<SignatureContainerLimits>
): Promise<AsicInspection> => {
  const limits = normalizeSignatureContainerLimits(requestedLimits)
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const directory = inspectZipCentralDirectory(bytes, limits)
  const fileEntries = directory.entries.filter((entry) => !entry.directory)
  const mimetypeEntry = fileEntries.find((entry) => entry.name === 'mimetype')
  if (
    !mimetypeEntry ||
    mimetypeEntry.localHeaderOffset !== 0 ||
    mimetypeEntry.compressionMethod !== 0
  ) {
    throw new Error('ASiC requires an uncompressed first-entry mimetype file.')
  }
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false })
  const mimetypeBytes = await extractChecked(zip, mimetypeEntry)
  const mediaType = new TextDecoder('ascii', { fatal: true }).decode(mimetypeBytes)
  if (mediaType !== ASICS_MIME && mediaType !== ASICE_MIME) {
    throw new Error(`Unsupported ASiC mimetype ${JSON.stringify(mediaType)}.`)
  }

  const documentEntries = fileEntries.filter(
    (entry) => entry.name !== 'mimetype' && !entry.name.startsWith(METADATA_PREFIX)
  )
  const metadataEntries = fileEntries.filter((entry) => entry.name.startsWith(METADATA_PREFIX))
  if (documentEntries.length > limits.maxDocuments)
    throw new Error(`ASiC document count exceeds ${limits.maxDocuments}.`)
  const signatureEntries = metadataEntries.filter((entry) => {
    const basename = entry.name.slice(METADATA_PREFIX.length).toLowerCase()
    return (
      basename.includes('signature') ||
      basename.includes('timestamp') ||
      ['p7s', 'p7m', 'xml', 'tst', 'tsr', 'ers', 'jws'].includes(getExtension(entry.name))
    )
  })
  if (signatureEntries.length > limits.maxSignatureMembers)
    throw new Error(`ASiC signature-member count exceeds ${limits.maxSignatureMembers}.`)

  const documents: AsicArchiveMember[] = []
  for (const entry of documentEntries) {
    documents.push({
      name: entry.name,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      mediaType: contentTypeForName(entry.name),
      data: await extractChecked(zip, entry)
    })
  }
  const signatures: AsicSignatureMember[] = []
  for (const entry of signatureEntries) {
    const data = await extractChecked(zip, entry)
    signatures.push({
      name: entry.name,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      data,
      kind: signatureKind(entry.name),
      referencedDocuments:
        getExtension(entry.name) === 'xml'
          ? collectXmlReferences(data, limits.maxXmlBytes).filter((reference) =>
              documents.some((document) => document.name === reference)
            )
          : []
    })
  }
  const signatureNames = new Set(signatureEntries.map((entry) => entry.name))
  const metadata: AsicArchiveMember[] = metadataEntries
    .filter((entry) => !signatureNames.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      mediaType: contentTypeForName(entry.name)
    }))
  const kind = mediaType === ASICS_MIME ? 'ASiC-S' : 'ASiC-E'
  const warnings = [
    'ZIP paths, entry sizes, compression ratios, CRCs and aggregate inflation were checked before extracted content was exposed.',
    'No URI, certificate URL, revocation endpoint or package reference is fetched automatically.',
    'Package parsing and member mapping do not establish certificate trust, policy compliance or legal validity.'
  ]
  if (kind === 'ASiC-S' && documents.length !== 1)
    warnings.push(
      `ASiC-S normally carries one document; this package contains ${documents.length}.`
    )
  if (!signatures.length)
    warnings.push('No signature or timestamp member was detected under META-INF.')
  return {
    kind,
    mediaType,
    sourceSize: bytes.byteLength,
    entryCount: fileEntries.length,
    totalUncompressedBytes: directory.totalUncompressedBytes,
    documents,
    signatures,
    metadata,
    warnings
  }
}
