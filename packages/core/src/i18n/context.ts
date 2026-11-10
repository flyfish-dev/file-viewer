import type { FileViewerI18nContext, FileViewerOptions } from '../contracts/types'
import {
  resolveFileViewerLocale,
  normalizeFileViewerLocale,
  translateFileViewerMessage,
  type FileViewerI18nInput
} from './messages'
import { formatFileViewerBytes, formatFileViewerDateTime, formatFileViewerNumber } from './format'

// Only objects explicitly owned by a viewer participate in live translations.
// Never infer UI text from document content or mutate a host's options object.
export const fileViewerI18nContexts = new WeakMap<object, FileViewerI18nContext>()

export interface FileViewerI18nController extends FileViewerI18nContext {
  update(input?: FileViewerI18nInput): void
  destroy(): void
}

export const createFileViewerI18n = (
  input?: FileViewerI18nInput,
  scope: { parent?: FileViewerI18nContext; signal?: AbortSignal } = {}
): FileViewerI18nController => {
  const options: FileViewerOptions = { ...(input ?? scope.parent?.options) }
  let locale = resolveFileViewerLocale(options)
  let destroyed = false
  const listeners = new Set<() => void>()
  const notify = () => {
    // A subscriber may dispose itself or attach another UI while being notified.
    for (const listener of [...listeners]) if (listeners.has(listener)) listener()
  }
  const browser = scope.parent || typeof window === 'undefined' ? undefined : window
  const onLanguageChange = () => {
    const requested = options.i18n?.locale || options.locale
    if (requested && requested !== 'auto') return
    const next = normalizeFileViewerLocale(options.i18n?.locale || options.locale)
    if (next !== locale) {
      locale = next
      notify()
    }
  }
  const controller: FileViewerI18nController = {
    get locale() {
      return locale
    },
    options,
    t: (key, params) => translateFileViewerMessage(options, key, params),
    formatNumber: (value, formatOptions) => formatFileViewerNumber(locale, value, formatOptions),
    formatDateTime: (value, formatOptions) =>
      formatFileViewerDateTime(locale, value, formatOptions),
    formatBytes: (value) => formatFileViewerBytes(locale, value),
    subscribe(listener) {
      if (destroyed) return () => undefined
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    update(nextInput) {
      if (destroyed || nextInput === options) return
      const next = { ...nextInput }
      for (const key of Object.keys(options)) delete (options as Record<string, unknown>)[key]
      Object.assign(options, next)
      locale = resolveFileViewerLocale(next)
      notify()
    },
    destroy() {
      destroyed = true
      listeners.clear()
      fileViewerI18nContexts.delete(options)
      browser?.removeEventListener?.('languagechange', onLanguageChange)
      unsubscribeParent?.()
      scope.signal?.removeEventListener('abort', onAbort)
    }
  }
  fileViewerI18nContexts.set(options, controller)
  browser?.addEventListener?.('languagechange', onLanguageChange)
  const onAbort = () => controller.destroy()
  const unsubscribeParent = scope.parent?.subscribe(() => controller.update(scope.parent!.options))
  scope.signal?.addEventListener('abort', onAbort, { once: true })
  if (scope.signal?.aborted) controller.destroy()
  return controller
}
