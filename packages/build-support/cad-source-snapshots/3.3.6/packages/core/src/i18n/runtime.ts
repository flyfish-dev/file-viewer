import { FILE_VIEWER_BUILTIN_MESSAGES } from './locale-registry';
export { FILE_VIEWER_BUILTIN_MESSAGES } from './locale-registry';
import type {
  FileViewerI18nContext,
  FileViewerI18nOptions,
  FileViewerLocale,
  FileViewerMessageKey,
  FileViewerBaseMessageKey,
  FileViewerMessageParams,
  FileViewerMessages,
  FileViewerOptions,
} from '../contracts/types';
import { fileViewerI18nContexts } from './context';
import { createFileViewerI18nBindings } from './bindings';
import { formatFileViewerNumber, formatFileViewerDateTime, formatFileViewerBytes, resolveFileViewerPluralMessage } from './format';
import { FILE_VIEWER_SUPPORTED_LOCALES, matchFileViewerLocale, type FileViewerResolvedLocale } from './locales';

export { FILE_VIEWER_SUPPORTED_LOCALES };
export type { FileViewerResolvedLocale };

export interface ResolveFileViewerI18nInput {
  locale?: FileViewerLocale;
  messages?: FileViewerMessages;
  i18n?: FileViewerI18nOptions;
}

export type FileViewerI18nInput = ResolveFileViewerI18nInput | FileViewerOptions | undefined | null;

export const FILE_VIEWER_DEFAULT_LOCALE: FileViewerResolvedLocale = 'zh-CN';
export const FILE_VIEWER_FALLBACK_LOCALE: FileViewerResolvedLocale = 'en-US';

const normalizeLocaleCandidate = matchFileViewerLocale;

const getBrowserLocales = (): string[] => {
  const browserNavigator = typeof window !== 'undefined' ? window.navigator : undefined;
  if (!browserNavigator) {
    return [];
  }
  return Array.from(new Set([
    ...(Array.isArray(browserNavigator.languages) ? browserNavigator.languages : []),
    browserNavigator.language,
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))));
};

export const normalizeFileViewerLocale = (
  locale?: FileViewerLocale | null
): FileViewerResolvedLocale => {
  if (locale && locale !== 'auto') {
    return normalizeLocaleCandidate(locale) || FILE_VIEWER_FALLBACK_LOCALE;
  }

  const browserLocales = getBrowserLocales();
  for (const candidate of browserLocales) {
    const resolved = normalizeLocaleCandidate(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return browserLocales.length > 0
    ? FILE_VIEWER_FALLBACK_LOCALE
    : FILE_VIEWER_DEFAULT_LOCALE;
};

const getCustomMessages = (input?: FileViewerI18nInput): FileViewerMessages | undefined => {
  return input?.i18n?.messages || input?.messages;
};

export const resolveFileViewerLocale = (input?: FileViewerI18nInput) => {
  const context = input && fileViewerI18nContexts.get(input);
  if (context) return context.locale;
  return normalizeFileViewerLocale(input?.i18n?.locale || input?.locale);
};

export const formatFileViewerMessage = (
  message: string,
  params: FileViewerMessageParams = {}
) => message.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_match, key: string) => {
  const value = params[key];
  return value === undefined || value === null ? '' : String(value);
});

export const translateFileViewerMessage = (
  input: FileViewerI18nInput,
  key: FileViewerMessageKey,
  params: FileViewerMessageParams = {}
) => {
  const locale = resolveFileViewerLocale(input);
  const customMessages = getCustomMessages(input);
  const customMessage = typeof customMessages === 'function'
    ? customMessages(key, params, locale)
    : customMessages?.[key];
  const message = customMessage || resolveFileViewerPluralMessage(locale, key, params.count) || FILE_VIEWER_BUILTIN_MESSAGES[locale][key] || FILE_VIEWER_BUILTIN_MESSAGES[FILE_VIEWER_FALLBACK_LOCALE][key] || key;
  // Custom resolvers own formatting; preserve the original numeric arguments.
  const formattedParams = customMessage ? params : Object.fromEntries(Object.entries(params).map(([name, value]) => (
    [name, typeof value === 'number' ? formatFileViewerNumber(locale, value) : value]
  )));
  return formatFileViewerMessage(message, formattedParams);
};

export const createFileViewerTranslator = (input?: FileViewerI18nInput | FileViewerI18nContext) => {
  // Explicit contexts also work across independently bundled renderer scripts.
  // Each bundle has its own WeakMap, so options identity alone is insufficient.
  const explicitContext = input && 'subscribe' in input && 't' in input ? input as FileViewerI18nContext : undefined;
  const options = explicitContext ? explicitContext.options : input as FileViewerI18nInput;
  const translate = (key: FileViewerMessageKey, params?: FileViewerMessageParams) =>
    explicitContext ? explicitContext.t(key, params) : translateFileViewerMessage(options, key, params);
  const context = explicitContext || (options && fileViewerI18nContexts.get(options));
  const bindings = createFileViewerI18nBindings(context || undefined);
  const bind = <T extends Node>(node: T, property: string, update: (active: () => boolean) => void): T => {
    bindings.bind(node, property, update);
    return node;
  };
  return Object.assign(translate, {
    /** Release this translator's bindings before replacing a disposable UI subtree. Cached/reused nodes must remain bound. */
    release: (root: Node | null | undefined) => { if (root) bindings.release(root); },
    /** Keep an owned error's stable code/parameters separate from display copy. */
    error: (key: FileViewerMessageKey, params: FileViewerMessageParams = {}) => {
      const retainedParams = Object.freeze({ ...params });
      const error = Object.assign(new Error(translate(key, retainedParams)), { code: key, params: retainedParams });
      Object.defineProperty(error, 'fileViewerErrorMessage', {
        configurable: true,
        value: (nextInput?: FileViewerI18nInput) => translateFileViewerMessage(nextInput, key, retainedParams),
      });
      return error;
    },
    formatNumber: (value: number, formatOptions?: Intl.NumberFormatOptions) => formatFileViewerNumber(context?.locale || resolveFileViewerLocale(options), value, formatOptions),
    formatDateTime: (value: Date | number, formatOptions?: Intl.DateTimeFormatOptions) => formatFileViewerDateTime(context?.locale || resolveFileViewerLocale(options), value, formatOptions),
    formatBytes: (value: number) => formatFileViewerBytes(context?.locale || resolveFileViewerLocale(options), value),
    /** Renderer-local DOM factory: getters explicitly mark live UI copy. */
    element: <K extends keyof HTMLElementTagNameMap>(documentRef: Document, tag: K, className?: string, copy?: string | number | (() => string | number)): HTMLElementTagNameMap[K] => {
      const node = documentRef.createElement(tag);
      if (className) node.className = className;
      if (typeof copy === 'function') bind(node, 'textContent', active => { const value = String(copy()); if (active()) node.textContent = value; });
      else if (copy !== undefined) node.textContent = String(copy);
      return node;
    },
    text: <T extends Node | null | undefined>(node: T, key: FileViewerMessageKey, params?: FileViewerMessageParams | (() => FileViewerMessageParams)): T => {
      if (node) bind(node, 'textContent', active => { const value = translate(key, typeof params === 'function' ? params() : params); if (active()) node.textContent = value; });
      return node;
    },
    attr: <T extends Element | null | undefined>(node: T, attribute: string, key: FileViewerMessageKey, params?: FileViewerMessageParams | (() => FileViewerMessageParams)): T => {
      if (node) bind(node, attribute, active => { const value = translate(key, typeof params === 'function' ? params() : params); if (active()) node.setAttribute(attribute, value); });
      return node;
    },
    /** Bind composed UI copy without matching or scanning document text. */
    bind: <T extends Node>(node: T, update: (node: T) => void, slot = 'textContent'): T => bind(node, slot, () => update(node)),
  });
};
