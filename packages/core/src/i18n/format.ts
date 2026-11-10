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

type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
type Forms = Partial<Record<PluralCategory, string>> & { other: string }
const plurals: Partial<
  Record<FileViewerResolvedLocale, Partial<Record<FileViewerMessageKey, Forms>>>
> = {
  'en-US': {
    'eda.ui.panel.nodeCount': { one: '{count} node', other: '{count} nodes' },
    'eda.ui.panel.itemCount': { one: '{count} item', other: '{count} items' },
    'eda.ui.panel.entryCount': { one: '{count} entry', other: '{count} entries' },
    'eda.parser.maxStreams': {
      one: 'Only the first {count} CFB entry is shown. Download the full file and open it in a professional EDA tool for complete inspection.',
      other: 'Only the first {count} CFB entries are shown. Download the full file and open it in a professional EDA tool for complete inspection.'
    },
    'email.mbox.summary': {
      one: 'Detected {count} message in the MBOX archive. Showing message 1.',
      other: 'Detected {count} messages in the MBOX archive. Showing message 1.'
    },
    'typst.pageSummary.ready': { one: '{count} page / {width} × {height} pt', other: '{count} pages / {width} × {height} pt' },
    'pdf.nav.pageCount': { one: '{count} page', other: '{count} pages' },
    'pdf.nav.itemCount': { one: '{count} item', other: '{count} items' },
    'ebook.itemCount': { one: '{count} item', other: '{count} items' },
    'cad.layers.count': { one: '{count} item', other: '{count} items' },
    'cad.layers.merged': {
      one: '{name} ({count} merged layer)',
      other: '{name} ({count} merged layers)'
    },
    'model.summary.meshes': { one: '{count} mesh', other: '{count} meshes' },
    'model.summary.points': { one: '{count} point cloud', other: '{count} point clouds' }
  },
  'de-DE': {
    'eda.ui.panel.nodeCount': { one: '{count} Knoten', other: '{count} Knoten' },
    'eda.ui.panel.itemCount': { one: '{count} Element', other: '{count} Elemente' },
    'eda.ui.panel.entryCount': { one: '{count} Eintrag', other: '{count} Einträge' },
    'eda.parser.maxStreams': {
      one: 'Nur der erste {count} CFB-Eintrag wird angezeigt. Laden Sie die vollständige Datei für die Prüfung in einem EDA-Fachwerkzeug herunter.',
      other: 'Nur die ersten {count} CFB-Einträge werden angezeigt. Laden Sie die vollständige Datei für die Prüfung in einem EDA-Fachwerkzeug herunter.'
    },
    'email.mbox.summary': {
      one: 'Im MBOX-Archiv wurde {count} Nachricht erkannt. Nachricht 1 wird angezeigt.',
      other: 'Im MBOX-Archiv wurden {count} Nachrichten erkannt. Nachricht 1 wird angezeigt.'
    },
    'typst.pageSummary.ready': { one: '{count} Seite / {width} × {height} pt', other: '{count} Seiten / {width} × {height} pt' },
    'pdf.nav.pageCount': { one: '{count} Seite', other: '{count} Seiten' },
    'pdf.nav.itemCount': { one: '{count} Eintrag', other: '{count} Einträge' },
    'ebook.itemCount': { one: '{count} Eintrag', other: '{count} Einträge' },
    'cad.layers.count': { one: '{count} Eintrag', other: '{count} Einträge' },
    'cad.layers.merged': {
      one: '{name} ({count} zusammengeführte Ebene)',
      other: '{name} ({count} zusammengeführte Ebenen)'
    },
    'model.summary.meshes': { one: '{count} Netz', other: '{count} Netze' },
    'model.summary.points': { one: '{count} Punktwolke', other: '{count} Punktwolken' }
  },
  'ru-RU': {
    'pdf.nav.pageCount': {
      one: '{count} страница',
      few: '{count} страницы',
      many: '{count} страниц',
      other: '{count} страницы'
    },
    'pdf.nav.itemCount': {
      one: '{count} элемент',
      few: '{count} элемента',
      many: '{count} элементов',
      other: '{count} элемента'
    },
    'ebook.itemCount': {
      one: '{count} элемент',
      few: '{count} элемента',
      many: '{count} элементов',
      other: '{count} элемента'
    },
    'cad.layers.count': {
      one: '{count} слой',
      few: '{count} слоя',
      many: '{count} слоёв',
      other: '{count} слоя'
    },
    'cad.layers.merged': {
      one: '{name} (объединён {count} слой)',
      few: '{name} (объединено {count} слоя)',
      many: '{name} (объединено {count} слоёв)',
      other: '{name} (объединено {count} слоя)'
    },
    'model.summary.meshes': {
      one: '{count} сетка',
      few: '{count} сетки',
      many: '{count} сеток',
      other: '{count} сетки'
    },
    'model.summary.points': {
      one: '{count} облако точек',
      few: '{count} облака точек',
      many: '{count} облаков точек',
      other: '{count} облака точек'
    }
  }
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
  const forms = plurals[locale]?.[key]
  if (!forms || typeof count !== 'number' || !Number.isFinite(count)) return undefined
  return forms[selectFileViewerPlural(locale, count)] || forms.other
}

/** Used by catalog verification without parsing source text. */
export const FILE_VIEWER_PLURAL_MESSAGES = plurals
