const ARMOR_MARKERS = [
  ['-----BEGIN PGP MESSAGE-----', 'message'],
  ['-----BEGIN PGP SIGNATURE-----', 'signature'],
  ['-----BEGIN PGP SIGNED MESSAGE-----', 'cleartext-signed-message'],
  ['-----BEGIN PGP PUBLIC KEY BLOCK-----', 'public-key'],
  ['-----BEGIN PGP PRIVATE KEY BLOCK-----', 'private-key']
] as const

const OPENPGP_EXTENSIONS = new Set(['asc', 'sig', 'pgp', 'gpg'])

const extensionOf = (filename?: string) => {
  if (!filename) return ''
  const base = filename.split(/[\\/]/).pop() || filename
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ''
}

export const detectOpenPgpArmorType = (bytes: Uint8Array) => {
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.byteLength, 512)))
    .trimStart()
  return ARMOR_MARKERS.find(([marker]) => head.startsWith(marker))?.[1]
}

export const hasPlausibleOpenPgpPacketHeader = (bytes: Uint8Array) => {
  if (!bytes.byteLength) return false
  const first = bytes[0] ?? 0
  if ((first & 0x80) === 0) return false
  if ((first & 0x40) !== 0) {
    const tag = first & 0x3f
    return tag > 0 && tag < 64
  }
  const tag = (first >> 2) & 0x0f
  return tag > 0 && tag < 16
}

export const isProbablyOpenPgp = (bytes: Uint8Array, filename?: string, typeHint?: string) => {
  if (detectOpenPgpArmorType(bytes)) return true
  const type = (typeHint || '').replace(/^\./, '').toLowerCase()
  if (OPENPGP_EXTENSIONS.has(type) || OPENPGP_EXTENSIONS.has(extensionOf(filename))) {
    return true
  }
  return hasPlausibleOpenPgpPacketHeader(bytes)
}
