import type {
  FileRenderContext,
  FileViewerI18nContext,
  FileViewerI18nOptions,
  FileViewerMessages,
} from '../contracts/types';
import {
  FILE_VIEWER_DEFAULT_LOCALE,
  FILE_VIEWER_SUPPORTED_LOCALES,
  normalizeFileViewerLocale,
  translateFileViewerMessage,
  type FileViewerI18nInput,
} from './messages';

export interface FileViewerI18nController extends FileViewerI18nContext {
  update(input?: FileViewerI18nInput): void;
  destroy(): void;
}

const project = (input?: FileViewerI18nInput): FileViewerI18nOptions => ({
  locale: input?.i18n?.locale || input?.locale,
  messages: input?.i18n?.messages || input?.messages,
});
const copyMessages = (messages?: FileViewerMessages) =>
  typeof messages === 'function' || !messages ? messages : Object.freeze({ ...messages });
const sameMessages = (left?: FileViewerMessages, right?: FileViewerMessages) => {
  if (left === right) return true;
  if (!left || !right || typeof left === 'function' || typeof right === 'function') return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key =>
    left[key as keyof typeof left] === right[key as keyof typeof right]);
};

/** Stable language-only scope; neither caller options nor document content are mutated. */
export const createFileViewerI18n = (
  input?: FileViewerI18nInput,
  scope: {
    parent?: FileViewerI18nContext;
    signal?: AbortSignal;
    ownerDocument?: Document | (() => Document | undefined);
    onError?: (error: unknown) => void;
  } = {},
): FileViewerI18nController => {
  let own = project(input);
  own.messages = copyMessages(own.messages);
  let destroyed = false;
  const listeners = new Set<() => void>();
  const getBrowser = () => {
    const document = typeof scope.ownerDocument === 'function' ? scope.ownerDocument() : scope.ownerDocument;
    return document?.defaultView || (document ? undefined : typeof window !== 'undefined' ? window : undefined);
  };
  let browser = getBrowser();
  const resolveLocale = (requested: FileViewerI18nOptions['locale']) => {
    if (requested && requested !== 'auto') return normalizeFileViewerLocale(requested);
    if (scope.parent && !requested) return scope.parent.locale;
    if (!browser) return FILE_VIEWER_DEFAULT_LOCALE;
    // Resolve auto against this viewer's document, not a different host window.
    const candidates = [...(browser.navigator?.languages || []), browser.navigator?.language].filter(Boolean);
    for (const candidate of candidates) {
      const normalized = String(candidate).trim().replace(/_/g, '-').toLowerCase();
      if (FILE_VIEWER_SUPPORTED_LOCALES.some(locale => normalized === locale.split('-')[0] || normalized.startsWith(`${locale.split('-')[0]}-`))) {
        return normalizeFileViewerLocale(candidate);
      }
    }
    return candidates.length ? normalizeFileViewerLocale('en-US') : FILE_VIEWER_DEFAULT_LOCALE;
  };
  const resolve = (): Readonly<{ locale: FileViewerI18nContext['locale']; messages?: FileViewerMessages }> => Object.freeze({
    locale: resolveLocale(own.locale),
    messages: copyMessages(own.messages ?? scope.parent?.options.messages),
  });
  let effective = resolve();
  const report = (error: unknown) => {
    if (!scope.onError) { console.error(error); return; }
    try { scope.onError(error); } catch (reportError) { console.error(reportError); }
  };
  const notify = () => {
    for (const listener of [...listeners]) {
      if (destroyed) break;
      if (listeners.has(listener)) {
        try { listener(); } catch (error) { report(error); }
      }
    }
  };
  const refresh = (force = false) => {
    if (destroyed) return;
    const nextBrowser = getBrowser();
    if (nextBrowser !== browser) {
      browser?.removeEventListener?.('languagechange', languageChange);
      browser = nextBrowser;
      browser?.addEventListener?.('languagechange', languageChange);
    }
    const next = resolve();
    const changed = next.locale !== effective.locale || !sameMessages(next.messages, effective.messages);
    effective = next;
    if (changed || force) notify();
  };
  let unsubscribeParent: (() => void) | undefined;
  const languageChange = () => { if (!own.locale || own.locale === 'auto') refresh(); };
  const abort = () => controller.destroy();
  const controller: FileViewerI18nController = {
    get locale() { return effective.locale; },
    get options() { return effective; },
    t: (key, params) => translateFileViewerMessage(effective, key, params),
    subscribe(listener) {
      if (destroyed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    update(nextInput) {
      if (destroyed) return;
      own = project(nextInput);
      own.messages = copyMessages(own.messages);
      // Explicit updates must re-evaluate a resolver whose closure changed.
      refresh(typeof own.messages === 'function');
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      unsubscribeParent?.();
      browser?.removeEventListener?.('languagechange', languageChange);
      scope.signal?.removeEventListener('abort', abort);
    },
  };
  if (!scope.signal?.aborted) {
    unsubscribeParent = scope.parent?.subscribe(() => refresh(typeof effective.messages === 'function'));
    browser?.addEventListener?.('languagechange', languageChange);
    scope.signal?.addEventListener('abort', abort, { once: true });
  } else controller.destroy();
  return controller;
};

/** Explicit nested language inputs always override, even when equal to the parent. */
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
});
