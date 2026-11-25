import type { FileViewerLocale, FileViewerMessageKey } from '../contracts/types'
import { FILE_VIEWER_SUPPORTED_LOCALES, matchFileViewerLocale, type FileViewerResolvedLocale } from './locales'

export type FileViewerLocaleDictionary = Readonly<Partial<Record<FileViewerMessageKey, string>>>
export type FileViewerPluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
export type FileViewerLocalePluralForms = Readonly<Partial<Record<FileViewerMessageKey,
  Readonly<Partial<Record<FileViewerPluralCategory, string>> & { other: string }>>>>

type Registration = { messages: FileViewerLocaleDictionary; plurals?: FileViewerLocalePluralForms }
const defaults = new Map<FileViewerResolvedLocale, Registration>()
const registrations = new Map<FileViewerResolvedLocale, Registration[]>()
const resolvedRegistrations = new Map<FileViewerResolvedLocale, Registration>()
const dictionaryPlurals = new WeakMap<object, FileViewerLocalePluralForms>()
const listeners = new Set<(locale: FileViewerResolvedLocale) => void>()
const empty: FileViewerLocaleDictionary = Object.freeze({})
const current = (locale: FileViewerResolvedLocale) => resolvedRegistrations.get(locale)

const copyDictionary = (messages: FileViewerLocaleDictionary): FileViewerLocaleDictionary => {
  if (!messages || typeof messages !== 'object' || Array.isArray(messages))
    throw new TypeError('A locale dictionary must be an object of message strings.')
  const copy: Partial<Record<FileViewerMessageKey, string>> = {}
  for (const [key, value] of Object.entries(messages)) {
    if (value === undefined) continue
    if (typeof value !== 'string') throw new TypeError('Locale messages must be strings: ' + key)
    Object.defineProperty(copy, key, { value, enumerable: true })
  }
  return Object.freeze(copy)
}

/** Attach locale-specific plural forms without registering a dictionary globally. */
export const defineFileViewerLocaleDictionary = (
  messages: FileViewerLocaleDictionary,
  plurals?: FileViewerLocalePluralForms,
): FileViewerLocaleDictionary => {
  const dictionary = copyDictionary(messages)
  if (plurals) {
    const copy: Record<string, Readonly<Partial<Record<FileViewerPluralCategory, string>> & { other: string }>> = {}
    for (const [key, forms] of Object.entries(plurals)) {
      if (!forms || typeof forms.other !== 'string') throw new TypeError('Plural forms require an other message: ' + key)
      for (const [category, value] of Object.entries(forms)) {
        if (!['zero', 'one', 'two', 'few', 'many', 'other'].includes(category) || typeof value !== 'string')
          throw new TypeError('Invalid locale plural form: ' + key)
      }
      Object.defineProperty(copy, key, { value: Object.freeze({ ...forms }), enumerable: true })
    }
    dictionaryPlurals.set(dictionary, Object.freeze(copy))
  }
  return dictionary
}

/** The same registry is shared by root, browser, headless and renderer imports. */
export const FILE_VIEWER_BUILTIN_MESSAGES = Object.freeze(Object.defineProperties({}, Object.fromEntries(
  FILE_VIEWER_SUPPORTED_LOCALES.map(locale => [locale, { enumerable: true, get: () => current(locale)?.messages || empty }]),
))) as Readonly<Record<FileViewerResolvedLocale, Readonly<Record<FileViewerMessageKey, string>>>>

// Plural introspection retains the existing partial-map shape (only locales
// with plural forms appear), while individual form tables are immutable.
export const FILE_VIEWER_PLURAL_MESSAGES: Partial<Record<FileViewerResolvedLocale, FileViewerLocalePluralForms>> = {}

const changed = (locale: FileViewerResolvedLocale) => {
  const base = defaults.get(locale), entries = registrations.get(locale) || []
  let entry = base
  if (entries.length) {
    entry = { messages: Object.freeze(Object.assign({}, base?.messages, ...entries.map(row => row.messages))),
      plurals: [...entries].reverse().find(row => row.plurals)?.plurals || base?.plurals }
  }
  if (entry) resolvedRegistrations.set(locale, entry)
  else resolvedRegistrations.delete(locale)
  if (entry?.plurals) FILE_VIEWER_PLURAL_MESSAGES[locale] = entry.plurals
  else delete FILE_VIEWER_PLURAL_MESSAGES[locale]
  for (const listener of [...listeners]) if (listeners.has(listener)) listener(locale)
}

/** Internal default-entry initialization; explicit registrations take priority. */
export const installFileViewerBuiltinLocales = (
  messages: Record<FileViewerResolvedLocale, FileViewerLocaleDictionary>,
  plurals: Partial<Record<FileViewerResolvedLocale, FileViewerLocalePluralForms>>,
) => {
  for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
    if (defaults.has(locale)) continue
    defaults.set(locale, { messages: messages[locale], plurals: plurals[locale] })
    changed(locale)
  }
}

/** Register one offline dictionary. Disposing restores the previous live registration. */
export const registerFileViewerLocale = (locale: FileViewerLocale, dictionary: FileViewerLocaleDictionary): (() => void) => {
  const resolved = matchFileViewerLocale(locale)
  if (!resolved) throw new RangeError('Unsupported File Viewer locale: ' + locale)
  const entry: Registration = { messages: copyDictionary(dictionary), plurals: dictionaryPlurals.get(dictionary) }
  const entries = registrations.get(resolved) || []
  entries.push(entry)
  registrations.set(resolved, entries)
  changed(resolved)
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    const index = entries.indexOf(entry)
    if (index >= 0) entries.splice(index, 1)
    if (!entries.length) registrations.delete(resolved)
    changed(resolved)
  }
}

export const getFileViewerLocaleDictionary = (locale: FileViewerResolvedLocale) => current(locale)?.messages
export const getFileViewerLocalePluralForms = (locale: FileViewerResolvedLocale) => current(locale)?.plurals
export const subscribeFileViewerLocaleChanges = (listener: (locale: FileViewerResolvedLocale) => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
