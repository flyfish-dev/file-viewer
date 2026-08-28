const hasUrlControlCharacters = (value: string) => {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f) {
      return true
    }
  }
  return false
}

const resolveDemoFileUrl = (value: string | null, fallback: string) => {
  const candidate = value || fallback
  if (hasUrlControlCharacters(candidate)) {
    return fallback
  }
  try {
    const resolved = new URL(candidate, window.location.href)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return fallback
    }
    return resolved.origin === window.location.origin
      ? `${resolved.pathname}${resolved.search}${resolved.hash}`
      : resolved.href
  } catch {
    return fallback
  }
}

export function getDemoSource(defaultUrl = '/example/word.docx') {
  const params = new URLSearchParams(window.location.search)
  const url = resolveDemoFileUrl(params.get('url'), defaultUrl)
  const pathname = url.split(/[?#]/)[0]
  let filename = pathname.split('/').pop() || 'word.docx'
  try {
    filename = decodeURIComponent(filename)
  } catch {
    filename = 'word.docx'
  }
  return {
    url,
    filename
  }
}
