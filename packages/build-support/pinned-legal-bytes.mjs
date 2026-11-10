import { createHash } from 'node:crypto'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')

/** Accept LF-pinned grants when Git checks them out with CRLF on Windows. */
export function reconcilePinnedLegalBytes(bytes, { sha256, bytes: expectedBytes }) {
  const matches = candidate =>
    hash(candidate) === sha256 && (expectedBytes === undefined || candidate.length === expectedBytes)
  if (matches(bytes)) return bytes
  if (!bytes.includes(0x0d)) return bytes
  const lf = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
  return matches(lf) ? lf : bytes
}
