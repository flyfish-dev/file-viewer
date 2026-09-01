import type { FileViewerTextOptions } from '@file-viewer/core'

export const DEFAULT_PRETTY_PRINT_MAX_BYTES = 512 * 1024

export type FileViewerPrettyPrintReason =
  | 'formatted'
  | 'disabled'
  | 'unsupported'
  | 'too-large'
  | 'whitespace-sensitive'
  | 'failed'
  | 'aborted'

export interface FileViewerPrettyPrintResult {
  text: string;
  formatted: boolean;
  reason: FileViewerPrettyPrintReason;
  parser?: string;
  sourceByteLength: number;
  maxBytes: number;
}

type PrettierPlugin = Record<string, unknown>

type PrettierRuntime = {
  format: (
    source: string,
    options: Record<string, unknown>
  ) => string | Promise<string>;
  plugins: PrettierPlugin[];
}

type PrettierPluginName =
  | 'babel'
  | 'estree'
  | 'typescript'
  | 'postcss'
  | 'html'
  | 'markdown'
  | 'yaml'
  | 'graphql'
  | 'xml'

interface PrettierLanguageDefinition {
  parser: string;
  plugins: readonly PrettierPluginName[];
  resolvePlugins?: (source: string) => readonly PrettierPluginName[];
  options?: Readonly<Record<string, unknown>>;
}

export type FileViewerPrettierRuntimeLoader = (
  definition: PrettierLanguageDefinition,
  source: string
) => Promise<PrettierRuntime>

const htmlEmbeddedLanguagePattern = /<(?:script|style)(?:\s|>)/i
const htmlScriptPattern = /<script(?:\s|>)/i
const htmlStylePattern = /<style(?:\s|>)/i

const withHtmlEmbeddedPlugins = (source: string): readonly PrettierPluginName[] => {
  if (!htmlEmbeddedLanguagePattern.test(source)) {
    return ['html']
  }
  const plugins: PrettierPluginName[] = ['html']
  if (htmlScriptPattern.test(source)) {
    plugins.push('babel', 'estree', 'typescript')
  }
  if (htmlStylePattern.test(source)) {
    plugins.push('postcss')
  }
  return plugins
}

const prettierLanguages: Readonly<Record<string, PrettierLanguageDefinition>> = {
  cjs: { parser: 'babel', plugins: ['babel', 'estree'] },
  css: { parser: 'css', plugins: ['postcss'] },
  graphql: { parser: 'graphql', plugins: ['graphql'] },
  gql: { parser: 'graphql', plugins: ['graphql'] },
  html: { parser: 'html', plugins: ['html'], resolvePlugins: withHtmlEmbeddedPlugins },
  htm: { parser: 'html', plugins: ['html'], resolvePlugins: withHtmlEmbeddedPlugins },
  ipynb: { parser: 'json', plugins: ['babel', 'estree'] },
  js: { parser: 'babel', plugins: ['babel', 'estree'] },
  json: { parser: 'json', plugins: ['babel', 'estree'] },
  json5: { parser: 'json5', plugins: ['babel', 'estree'] },
  jsonc: { parser: 'jsonc', plugins: ['babel', 'estree'] },
  jsx: { parser: 'babel', plugins: ['babel', 'estree'] },
  markdown: { parser: 'markdown', plugins: ['markdown'] },
  md: { parser: 'markdown', plugins: ['markdown'] },
  mjs: { parser: 'babel', plugins: ['babel', 'estree'] },
  react: { parser: 'babel', plugins: ['babel', 'estree'] },
  ts: { parser: 'typescript', plugins: ['typescript', 'estree'] },
  tsx: { parser: 'typescript', plugins: ['typescript', 'estree'] },
  vue: {
    parser: 'vue',
    plugins: ['html', 'babel', 'estree', 'typescript', 'postcss']
  },
  xml: {
    parser: 'xml',
    plugins: ['xml'],
    options: {
      xmlWhitespaceSensitivity: 'preserve',
      xmlQuoteAttributes: 'preserve',
      xmlSortAttributesByKey: false
    }
  },
  yaml: { parser: 'yaml', plugins: ['yaml'] },
  yml: { parser: 'yaml', plugins: ['yaml'] }
}


const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace'

const hasWhitespaceSensitiveXml = (source: string) => {
  if (/\bxml:space\s*=\s*(["'])preserve\1/i.test(source)) {
    return true
  }

  const Parser = globalThis.DOMParser
  if (typeof Parser !== 'function') {
    // The text renderer itself is browser-facing, but fail closed when this
    // helper is evaluated in a non-DOM runtime.
    return true
  }

  try {
    const documentRef = new Parser().parseFromString(source, 'application/xml')
    if (documentRef.querySelector('parsererror')) {
      return false
    }

    const containsMixedContent = (element: Element): boolean => {
      const preservesWhitespace =
        element.getAttributeNS(XML_NAMESPACE, 'space')?.toLowerCase() === 'preserve' ||
        element.getAttribute('xml:space')?.toLowerCase() === 'preserve'
      if (preservesWhitespace) {
        return true
      }

      let hasElementChild = false
      let hasDirectText = false
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === 1) {
          hasElementChild = true
          if (containsMixedContent(child as Element)) {
            return true
          }
        } else if ((child.nodeType === 3 || child.nodeType === 4) && child.textContent?.trim()) {
          hasDirectText = true
        }
      }
      return hasElementChild && hasDirectText
    }

    return documentRef.documentElement
      ? containsMixedContent(documentRef.documentElement)
      : false
  } catch {
    return false
  }
}

const pluginLoaders: Readonly<Record<PrettierPluginName, () => Promise<PrettierPlugin>>> = {
  babel: () => import('prettier/plugins/babel').then(module => module.default as PrettierPlugin),
  estree: () => import('prettier/plugins/estree').then(module => module.default as PrettierPlugin),
  typescript: () => import('prettier/plugins/typescript').then(module => module.default as PrettierPlugin),
  postcss: () => import('prettier/plugins/postcss').then(module => module.default as PrettierPlugin),
  html: () => import('prettier/plugins/html').then(module => module.default as PrettierPlugin),
  markdown: () => import('prettier/plugins/markdown').then(module => module.default as PrettierPlugin),
  yaml: () => import('prettier/plugins/yaml').then(module => module.default as PrettierPlugin),
  graphql: () => import('prettier/plugins/graphql').then(module => module.default as PrettierPlugin),
  xml: () => import('@prettier/plugin-xml').then(module => module.default as PrettierPlugin)
}

const loadPrettierRuntime: FileViewerPrettierRuntimeLoader = async (definition, source) => {
  const prettierPromise = import('prettier/standalone')
  const pluginNames = definition.resolvePlugins?.(source) ?? definition.plugins
  const [prettier, ...plugins] = await Promise.all([
    prettierPromise,
    ...pluginNames.map(pluginName => pluginLoaders[pluginName]())
  ])
  return {
    format: prettier.format,
    plugins
  }
}

const utf8ByteLength = (source: string) => new TextEncoder().encode(source).byteLength

export const resolveFileViewerPrettyPrintMaxBytes = (options?: FileViewerTextOptions) => {
  const configured = options?.prettyPrintMaxBytes ?? options?.virtualizeAboveBytes
  if (!Number.isFinite(configured)) {
    return DEFAULT_PRETTY_PRINT_MAX_BYTES
  }
  return Math.max(0, Math.trunc(Number(configured)))
}

export const supportsFileViewerPrettyPrint = (extension: string) => {
  return Boolean(prettierLanguages[extension.trim().toLowerCase()])
}

/**
 * Formats a decoded display representation without mutating the source buffer.
 *
 * Parser support and byte limits are resolved before the Prettier runtime or
 * any parser plugin is imported. Failures intentionally return the original
 * source so malformed or unsupported uploads remain previewable.
 */
export const formatFileViewerTextForDisplay = async (
  source: string,
  extension: string,
  options?: FileViewerTextOptions,
  signal?: AbortSignal,
  runtimeLoader: FileViewerPrettierRuntimeLoader = loadPrettierRuntime
): Promise<FileViewerPrettyPrintResult> => {
  const maxBytes = resolveFileViewerPrettyPrintMaxBytes(options)
  const sourceByteLength = utf8ByteLength(source)
  if (options?.prettyPrint !== true) {
    return { text: source, formatted: false, reason: 'disabled', sourceByteLength, maxBytes }
  }

  const definition = prettierLanguages[extension.trim().toLowerCase()]
  if (!definition) {
    return { text: source, formatted: false, reason: 'unsupported', sourceByteLength, maxBytes }
  }
  if (sourceByteLength > maxBytes) {
    return {
      text: source,
      formatted: false,
      reason: 'too-large',
      parser: definition.parser,
      sourceByteLength,
      maxBytes
    }
  }
  if (signal?.aborted) {
    return {
      text: source,
      formatted: false,
      reason: 'aborted',
      parser: definition.parser,
      sourceByteLength,
      maxBytes
    }
  }
  if (definition.parser === 'xml' && hasWhitespaceSensitiveXml(source)) {
    return {
      text: source,
      formatted: false,
      reason: 'whitespace-sensitive',
      parser: definition.parser,
      sourceByteLength,
      maxBytes
    }
  }

  try {
    const runtime = await runtimeLoader(definition, source)
    if (signal?.aborted) {
      return {
        text: source,
        formatted: false,
        reason: 'aborted',
        parser: definition.parser,
        sourceByteLength,
        maxBytes
      }
    }
    const formatted = await runtime.format(source, {
      parser: definition.parser,
      plugins: runtime.plugins,
      tabWidth: 2,
      useTabs: false,
      printWidth: 80,
      endOfLine: 'lf',
      ...definition.options
    })
    if (signal?.aborted) {
      return {
        text: source,
        formatted: false,
        reason: 'aborted',
        parser: definition.parser,
        sourceByteLength,
        maxBytes
      }
    }
    return {
      text: formatted.replace(/\n$/, ''),
      formatted: true,
      reason: 'formatted',
      parser: definition.parser,
      sourceByteLength,
      maxBytes
    }
  } catch {
    return {
      text: source,
      formatted: false,
      reason: 'failed',
      parser: definition.parser,
      sourceByteLength,
      maxBytes
    }
  }
}
