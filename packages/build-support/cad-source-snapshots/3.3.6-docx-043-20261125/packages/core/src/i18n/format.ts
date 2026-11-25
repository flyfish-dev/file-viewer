import { getFileViewerLocaleDictionary, getFileViewerLocalePluralForms, type FileViewerPluralCategory as PluralCategory } from './locale-registry'
import type { FileViewerMessageKey } from '../contracts/types'
import type { FileViewerResolvedLocale } from './locales'

export const formatFileViewerNumber = (
  locale: FileViewerResolvedLocale,
  value: number,
  options?: Intl.NumberFormatOptions
) => {
  try {
    if (Intl.NumberFormat.supportedLocalesOf(locale).length === 0)
      throw new Error('Locale data unavailable')
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    const number = options?.style === 'percent' ? value * 100 : value
    const maximum = Math.max(0, Math.min(20, options?.maximumFractionDigits ?? 3))
    const minimum = Math.max(0, Math.min(maximum, options?.minimumFractionDigits ?? 0))
    const [integer, fraction = ''] = Number.isFinite(number)
      ? number.toFixed(maximum).split('.')
      : [String(number)]
    const decimals = fraction.replace(/0+$/, '').padEnd(minimum, '0')
    const group = locale === 'de-DE' ? '.' : locale === 'ru-RU' ? '\u00a0' : ','
    const decimal = locale === 'de-DE' || locale === 'ru-RU' ? ',' : '.'
    const grouped =
      options?.useGrouping === false ? integer : integer.replace(/\B(?=(\d{3})+(?!\d))/g, group)
    return (
      grouped + (decimals ? decimal + decimals : '') + (options?.style === 'percent' ? ' %' : '')
    )
  }
}

export const formatFileViewerDateTime = (
  locale: FileViewerResolvedLocale,
  value: Date | number,
  options?: Intl.DateTimeFormatOptions
) => {
  const date = value instanceof Date ? value : new Date(value)
  try {
    if (Intl.DateTimeFormat.supportedLocalesOf(locale).length === 0)
      throw new Error('Locale data unavailable')
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch {
    // ISO is unambiguous when a restricted runtime has no locale/time-zone data.
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }
}

export const formatFileViewerBytes = (locale: FileViewerResolvedLocale, value: number) => {
  const bytes = Math.max(0, Number.isFinite(value) ? value : 0)
  const exponent = Math.max(
    0,
    Math.min(4, bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0)
  )
  return `${formatFileViewerNumber(locale, bytes / 1024 ** exponent, { maximumFractionDigits: exponent ? 1 : 0 })} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][exponent]}`
}

export const selectFileViewerPlural = (
  locale: FileViewerResolvedLocale,
  count: number
): PluralCategory => {
  try {
    if (Intl.PluralRules.supportedLocalesOf(locale).length === 0)
      throw new Error('Locale data unavailable')
    return new Intl.PluralRules(locale).select(count)
  } catch {
    const number = Math.abs(count)
    if (locale === 'ru-RU') {
      if (!Number.isInteger(number)) return 'other'
      if (number % 10 === 1 && number % 100 !== 11) return 'one'
      if (number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 12 || number % 100 > 14))
        return 'few'
      return 'many'
    }
    return (locale === 'en-US' || locale === 'de-DE') && number === 1 ? 'one' : 'other'
  }
}

export const resolveFileViewerPluralMessage = (
  locale: FileViewerResolvedLocale,
  key: FileViewerMessageKey,
  count: unknown
) => {
  let activeLocale = locale
  let forms = getFileViewerLocalePluralForms(locale)?.[key]
  if (!forms && !getFileViewerLocaleDictionary(locale)?.[key]) {
    activeLocale = 'en-US'
    forms = getFileViewerLocalePluralForms(activeLocale)?.[key]
  }
  if (!forms || typeof count !== 'number' || !Number.isFinite(count)) return undefined
  return forms[selectFileViewerPlural(activeLocale, count)] || forms.other
}

/** Used by catalog verification without parsing source text. */
export { FILE_VIEWER_PLURAL_MESSAGES } from './locale-registry'
