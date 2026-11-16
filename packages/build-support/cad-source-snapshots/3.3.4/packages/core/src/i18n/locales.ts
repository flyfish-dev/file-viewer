/** The single registry of bundled UI languages. No browser reads at module load. */
export const FILE_VIEWER_LOCALE_METADATA = Object.freeze({
  'zh-CN': {
    label: '简体中文',
    shortLabel: '简',
    language: 'zh',
    script: 'Hans',
    direction: 'ltr',
    aliases: ['zh', 'zh-SG', 'zh-Hans'],
    fallback: 'en-US'
  },
  'en-US': {
    label: 'English',
    shortLabel: 'EN',
    language: 'en',
    direction: 'ltr',
    aliases: ['en'],
    fallback: 'en-US'
  },
  'ja-JP': {
    label: '日本語',
    shortLabel: '日',
    language: 'ja',
    direction: 'ltr',
    aliases: ['ja'],
    fallback: 'en-US'
  },
  'zh-TW': {
    label: '繁體中文（台灣）',
    shortLabel: '繁·台',
    language: 'zh',
    script: 'Hant',
    direction: 'ltr',
    aliases: ['zh-Hant'],
    fallback: 'en-US'
  },
  'zh-HK': {
    label: '繁體中文（香港）',
    shortLabel: '繁·港',
    language: 'zh',
    script: 'Hant',
    direction: 'ltr',
    aliases: ['zh-MO', 'zh-Hant-HK', 'zh-Hant-MO'],
    fallback: 'en-US'
  },
  'de-DE': {
    label: 'Deutsch',
    shortLabel: 'DE',
    language: 'de',
    direction: 'ltr',
    aliases: ['de'],
    fallback: 'en-US'
  },
  'ru-RU': {
    label: 'Русский',
    shortLabel: 'RU',
    language: 'ru',
    direction: 'ltr',
    aliases: ['ru'],
    fallback: 'en-US'
  }
} as const)

export type FileViewerResolvedLocale = keyof typeof FILE_VIEWER_LOCALE_METADATA
export const FILE_VIEWER_SUPPORTED_LOCALES: readonly FileViewerResolvedLocale[] = Object.freeze(
  Object.keys(FILE_VIEWER_LOCALE_METADATA) as FileViewerResolvedLocale[]
)
export const FILE_VIEWER_LOCALE_OPTIONS = Object.freeze(
  FILE_VIEWER_SUPPORTED_LOCALES.map((value) =>
    Object.freeze({ value, ...FILE_VIEWER_LOCALE_METADATA[value] })
  )
)

export const matchFileViewerLocale = (
  candidate?: string | null
): FileViewerResolvedLocale | undefined => {
  const input = String(candidate || '')
    .trim()
    .replace(/_/g, '-')
  if (!input) return undefined
  let normalized: string
  try {
    // Embedded browsers without Intl still have a deterministic local path.
    normalized =
      typeof Intl !== 'undefined' && typeof Intl.getCanonicalLocales === 'function'
        ? Intl.getCanonicalLocales(input)[0].toLowerCase()
        : input.toLowerCase()
  } catch {
    return undefined
  }
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/.test(normalized)) return undefined
  const allParts = normalized.split('-')
  const extensionIndex = allParts.findIndex((part, index) => index > 0 && part.length === 1)
  const parts = extensionIndex < 0 ? allParts : allParts.slice(0, extensionIndex)
  const language = parts[0]
  // Script is explicit intent and wins over a conflicting region.
  if (language === 'zh') {
    const script = parts[1]?.length === 4 ? parts[1] : undefined
    const region = parts.find((part, index) => index > 0 && /^[a-z]{2}$/.test(part))
    if (script === 'hans') return 'zh-CN'
    if (region === 'hk' || region === 'mo') return 'zh-HK'
    if (script === 'hant' || region === 'tw') return 'zh-TW'
    return 'zh-CN'
  }
  return FILE_VIEWER_SUPPORTED_LOCALES.find(
    (locale) => FILE_VIEWER_LOCALE_METADATA[locale].language === language
  )
}
