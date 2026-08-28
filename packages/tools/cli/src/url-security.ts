// eslint-disable-next-line no-control-regex -- reject controls before URL parsing
const INVALID_URL_CHARACTERS = /[\u0000-\u001f\u007f\\]/

const isLoopbackHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase()
  if (normalized === 'localhost' || normalized === '[::1]') return true
  const octets = normalized.split('.')
  return (
    octets.length === 4 &&
    octets[0] === '127' &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  )
}

const assertSafeNetworkUrl = (parsed: URL, label: string) => {
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must use HTTPS, or HTTP on a loopback host.`)
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must not contain credentials, query parameters, or a fragment.`)
  }
  if (parsed.protocol === 'http:' && !isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${label} must use HTTPS unless the host is loopback.`)
  }
}

export const normalizeFileViewerAssetBaseUrl = (value?: string) => {
  if (!value) return undefined
  const normalized = value.trim()
  if (
    !normalized ||
    INVALID_URL_CHARACTERS.test(normalized) ||
    normalized.startsWith('//') ||
    normalized.includes('?') ||
    normalized.includes('#')
  ) {
    throw new Error(
      'Invalid assetBaseUrl. Queries, fragments, protocol-relative URLs, and control characters are not allowed.'
    )
  }
  if (/^https?:\/\//i.test(normalized)) {
    const parsed = new URL(normalized)
    assertSafeNetworkUrl(parsed, 'assetBaseUrl')
    return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`
  }
  if (/^(?:\/(?!\/)|\.\/|\.\.\/)/.test(normalized)) {
    return normalized.endsWith('/') ? normalized : `${normalized}/`
  }
  throw new Error(
    'assetBaseUrl must be an explicit HTTPS URL, a loopback HTTP URL, or a relative/root URL.'
  )
}

export const normalizeFileViewerRegistryUrl = (value: string) => {
  const normalized = String(value || '').trim()
  if (!normalized || INVALID_URL_CHARACTERS.test(normalized)) {
    throw new Error('Invalid registry URL.')
  }
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error('Invalid registry URL.')
  }
  assertSafeNetworkUrl(parsed, 'Registry')
  return parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`
}
