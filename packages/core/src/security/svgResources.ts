const SVG_URL_ATTRIBUTES = new Set(['href', 'xlink:href', 'src', 'poster'])

const SAFE_EMBEDDED_IMAGE_DATA_URL =
  /^data:image\/(?:avif|bmp|gif|jpeg|png|webp|x-icon);base64,[A-Za-z0-9+/=\s]+$/i

const stripResourceUrlControlCharacters = (value: string) => {
  let normalized = ''
  for (const character of value) {
    const codePoint = character.charCodeAt(0)
    if (codePoint <= 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) continue
    normalized += character
  }
  return normalized.trim()
}

const isSafeSvgAnchorUrl = (value: string) => {
  const normalized = stripResourceUrlControlCharacters(value)
  if (!normalized) return false
  if (/^#[A-Za-z0-9_.:-]+$/.test(normalized)) return true
  if (/^(?:https?|mailto|tel):/i.test(normalized)) return true
  return !normalized.includes(':') &&
    !normalized.startsWith('//') &&
    !normalized.startsWith('\\')
}

const isSafeEmbeddedSvgUrl = (value: string, allowFragment: boolean) => {
  const normalized = stripResourceUrlControlCharacters(value)
  if (allowFragment && /^#[A-Za-z0-9_.:-]+$/.test(normalized)) return true
  if (/^blob:/i.test(normalized)) return true
  return SAFE_EMBEDDED_IMAGE_DATA_URL.test(normalized)
}

const normalizeCssUrl = (value: string) => {
  let normalized = value.trim()
  const quote = normalized[0]
  if ((quote === '"' || quote === "'") && normalized[normalized.length - 1] === quote) {
    normalized = normalized.slice(1, -1).trim()
  }
  return stripResourceUrlControlCharacters(normalized)
}

const isSafeSvgCssUrl = (value: string) => {
  const normalized = normalizeCssUrl(value)
  return /^#[A-Za-z0-9_.:-]+$/.test(normalized) ||
    /^blob:/i.test(normalized) ||
    SAFE_EMBEDDED_IMAGE_DATA_URL.test(normalized)
}

/**
 * Keep ordinary SVG styles while preventing imports and resource requests.
 * Obfuscated URL tokens fail closed instead of depending on parser quirks.
 */
export const sanitizeFileViewerSvgCss = (value: string) => {
  const normalizedCharacters: string[] = []
  for (const character of value) {
    const codePoint = character.charCodeAt(0)
    const disallowedControl = codePoint <= 0x08 || codePoint === 0x0b || codePoint === 0x0c ||
      (codePoint >= 0x0e && codePoint <= 0x1f) || (codePoint >= 0x7f && codePoint <= 0x9f)
    if (!disallowedControl) normalizedCharacters.push(character)
  }
  const normalized = normalizedCharacters.join('')
  if (normalized.includes('\\') || normalized.includes('/*') || /@import\b/i.test(normalized)) {
    return ''
  }

  const chunks: string[] = []
  let segmentStart = 0
  let cursor = 0
  while (cursor < normalized.length) {
    const hasUrlPrefix =
      (normalized.charCodeAt(cursor) | 0x20) === 0x75 &&
      (normalized.charCodeAt(cursor + 1) | 0x20) === 0x72 &&
      (normalized.charCodeAt(cursor + 2) | 0x20) === 0x6c
    if (!hasUrlPrefix) {
      cursor += 1
      continue
    }

    let open = cursor + 3
    while (open < normalized.length && normalized[open].trim() === '') open += 1
    if (normalized[open] !== '(') {
      cursor += 1
      continue
    }

    let close = open + 1
    while (close < normalized.length && normalized[close] !== ')') close += 1
    if (close >= normalized.length) return ''

    const target = normalized.slice(open + 1, close)
    chunks.push(normalized.slice(segmentStart, cursor))
    chunks.push(isSafeSvgCssUrl(target) ? `url(${target})` : 'none')
    cursor = close + 1
    segmentStart = cursor
  }
  chunks.push(normalized.slice(segmentStart))
  return chunks.join('')
}

/** Remove executable attributes and every SVG resource URL that can load data remotely. */
export const sanitizeFileViewerSvgResources = (root: ParentNode) => {
  root.querySelectorAll<SVGElement>('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name)
        continue
      }
      if (name === 'style') {
        const sanitizedStyle = sanitizeFileViewerSvgCss(attribute.value)
        if (sanitizedStyle) {
          element.setAttribute(attribute.name, sanitizedStyle)
        } else {
          element.removeAttribute(attribute.name)
        }
        continue
      }
      if (SVG_URL_ATTRIBUTES.has(name)) {
        const localName = element.localName.toLowerCase()
        const isAnchor = localName === 'a' && name === 'href'
        const allowFragment = localName === 'use' || localName === 'mpath'
        const safe = isAnchor
          ? isSafeSvgAnchorUrl(attribute.value)
          : isSafeEmbeddedSvgUrl(attribute.value, allowFragment)
        if (safe) {
          attribute.value = stripResourceUrlControlCharacters(attribute.value)
        } else {
          element.removeAttribute(attribute.name)
        }
        continue
      }
      if (/url\s*\(/i.test(attribute.value)) {
        const sanitizedValue = sanitizeFileViewerSvgCss(attribute.value)
        if (sanitizedValue) {
          element.setAttribute(attribute.name, sanitizedValue)
        } else {
          element.removeAttribute(attribute.name)
        }
      }
    }
  })
  root.querySelectorAll<SVGStyleElement>('style').forEach(style => {
    const sanitizedStyle = sanitizeFileViewerSvgCss(style.textContent || '')
    if (sanitizedStyle) {
      style.textContent = sanitizedStyle
    } else {
      style.remove()
    }
  })
}

const canonicalizeMermaidSourceForResourceScan = (source: string) => {
  let output = ''
  for (const character of source) {
    const codePoint = character.charCodeAt(0)
    if (codePoint === 0 || (codePoint >= 0x7f && codePoint <= 0x9f)) continue
    output += codePoint < 0x20 && character !== '\n' && character !== '\r' && character !== '\t'
      ? ' '
      : character
  }
  return output
}

/**
 * Mermaid 11 resolves image-node URLs with `new Image()` while rendering,
 * before its SVG can be sanitized. Reject image metadata and explicit remote
 * URLs before calling Mermaid so an untrusted diagram cannot initiate I/O.
 */
export const assertFileViewerMermaidSourceHasNoExternalResources = (source: string) => {
  const normalized = canonicalizeMermaidSourceForResourceScan(String(source || ''))
  const compact = normalized.replace(/[\t\r\n ]+/g, '')
  const hasImageMetadata = /(?:^|[,{])\s*(?:img|["']img["'])\s*:/im.test(normalized)
  const hasRemoteUrl = /(?:https?|ftp):\/\//i.test(compact) ||
    /(?:^|[\s"'(=:,])(?:\/\/|\\\\)[A-Za-z0-9]/m.test(normalized)
  if (hasImageMetadata || hasRemoteUrl) {
    throw new Error('Mermaid diagrams may not load external image resources.')
  }
}
