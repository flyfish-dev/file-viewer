import type {
  FileRenderContext,
  FileViewerI18nContext,
  FileViewerI18nOptions,
  FileViewerMessages,
  FileViewerOptions,
} from '../contracts/types'
import {
  FILE_VIEWER_DEFAULT_LOCALE,
  FILE_VIEWER_FALLBACK_LOCALE,
  normalizeFileViewerLocale,
  translateFileViewerMessage,
  type FileViewerI18nInput,
} from './messages'
import { matchFileViewerLocale } from './locales'
import { formatFileViewerBytes, formatFileViewerDateTime, formatFileViewerNumber } from './format'

// Preserve options-based translators within a bundle and explicit contexts across bundles.
export const fileViewerI18nContexts = new WeakMap<object, FileViewerI18nContext>()

export interface FileViewerI18nController extends FileViewerI18nContext {
  update(input?: FileViewerI18nInput): void
  destroy(): void
}

const project = (input?: FileViewerI18nInput): FileViewerI18nOptions => ({
  locale: input?.i18n?.locale || input?.locale,
  messages: input?.i18n?.messages || input?.messages,
})
const copyMessages = (messages?: FileViewerMessages) =>
  typeof messages === 'function' || !messages ? messages : Object.freeze({ ...messages })
const sameMessages = (left?: FileViewerMessages, right?: FileViewerMessages) => {
  if (left === right) return true
  if (!left || !right || typeof left === 'function' || typeof right === 'function') return false
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every(key =>
    left[key as keyof typeof left] === right[key as keyof typeof right])
}

/** Stable owned options retain renderer compatibility; only language changes notify. */
export const createFileViewerI18n = (
  input?: FileViewerI18nInput,
  scope: {
    parent?: FileViewerI18nContext
    signal?: AbortSignal
    ownerDocument?: Document | (() => Document | undefined)
    onError?: (error: unknown) => void
  } = {},
): FileViewerI18nController => {
  let source: FileViewerOptions = { ...input }
  let own = project(input)
  own.messages = copyMessages(own.messages)
  const options: FileViewerOptions = {}
  let destroyed = false
  const listeners = new Set<() => void>()
  const getBrowser = () => {
    const document = typeof scope.ownerDocument === 'function' ? scope.ownerDocument() : scope.ownerDocument
    return document?.defaultView || (document ? undefined : typeof window !== 'undefined' ? window : undefined)
  }
  let browser = getBrowser()
  const resolveLocale = (requested: FileViewerI18nOptions['locale']) => {
    if (requested && requested !== 'auto') return normalizeFileViewerLocale(requested)
    if (scope.parent && !requested) return scope.parent.locale
    if (!browser) return FILE_VIEWER_DEFAULT_LOCALE
    const candidates = [...(browser.navigator?.languages || []), browser.navigator?.language].filter(Boolean)
    for (const candidate of candidates) {
      const normalized = matchFileViewerLocale(candidate)
      if (normalized) return normalized
    }
    return candidates.length ? FILE_VIEWER_FALLBACK_LOCALE : FILE_VIEWER_DEFAULT_LOCALE
  }
  const resolve = () => ({
    locale: resolveLocale(own.locale),
    messages: copyMessages(own.messages ?? scope.parent?.options.messages),
  })
  let effective = resolve()
  const syncOptions = () => {
    for (const key of Object.keys(options)) delete (options as Record<string, unknown>)[key]
    Object.assign(options, scope.parent?.options, source, effective, { i18n: undefined })
  }
  syncOptions()
  const report = (error: unknown) => {
    if (!scope.onError) { console.error(error); return }
    try { scope.onError(error) } catch (reportError) { console.error(reportError) }
  }
  const notify = () => {
    for (const listener of [...listeners]) {
      if (destroyed) break
      if (listeners.has(listener)) {
        try { listener() } catch (error) { report(error) }
      }
    }
  }
  const refresh = (force = false) => {
    if (destroyed) return
    const nextBrowser = getBrowser()
    if (nextBrowser !== browser) {
      browser?.removeEventListener?.('languagechange', languageChange)
      browser = nextBrowser
      browser?.addEventListener?.('languagechange', languageChange)
    }
    const next = resolve()
    const changed = next.locale !== effective.locale || !sameMessages(next.messages, effective.messages)
    effective = next
    syncOptions()
    if (changed || force) notify()
  }
  let unsubscribeParent: (() => void) | undefined
  const languageChange = () => { if (!own.locale || own.locale === 'auto') refresh() }
  const abort = () => controller.destroy()
  const controller: FileViewerI18nController = {
    get locale() { return effective.locale },
    options,
    t: (key, params) => translateFileViewerMessage(effective, key, params),
    formatNumber: (value, formatOptions) => formatFileViewerNumber(effective.locale, value, formatOptions),
    formatDateTime: (value, formatOptions) => formatFileViewerDateTime(effective.locale, value, formatOptions),
    formatBytes: value => formatFileViewerBytes(effective.locale, value),
    subscribe(listener) {
      if (destroyed) return () => {}
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update(nextInput) {
      if (destroyed) return
      source = { ...nextInput }
      own = project(nextInput)
      own.messages = copyMessages(own.messages)
      refresh(typeof own.messages === 'function')
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      listeners.clear()
      fileViewerI18nContexts.delete(options)
      unsubscribeParent?.()
      browser?.removeEventListener?.('languagechange', languageChange)
      scope.signal?.removeEventListener('abort', abort)
    },
  }
  fileViewerI18nContexts.set(options, controller)
  if (!scope.signal?.aborted) {
    unsubscribeParent = scope.parent?.subscribe(() => refresh(typeof effective.messages === 'function'))
    browser?.addEventListener?.('languagechange', languageChange)
    scope.signal?.addEventListener('abort', abort, { once: true })
  } else controller.destroy()
  return controller
}

/** Explicit nested language inputs override the parent even when initially equal. */
export const createFileViewerNestedI18n = (
  context: FileRenderContext | undefined,
  parent: FileViewerI18nContext | undefined,
  ownerDocument: Document,
  onError?: (error: unknown) => void,
): FileViewerI18nController => createFileViewerI18n(context?.options, {
  parent: context?.i18n || parent,
  signal: context?.signal,
  ownerDocument,
  onError,
})
