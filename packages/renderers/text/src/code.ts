import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter as createZoomChangeEmitter,
  decodeFileViewerTextBuffer,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerRenderedInstance,
  type FileViewerZoomState
} from '@file-viewer/core'
import type { HLJSApi, LanguageFn } from 'highlight.js'
import { codeStyle } from './codeStyle.js'
import renderLargeText, { shouldVirtualizeTextBuffer } from './largeText.js'

const languageMap: Record<string, string> = {
  bash: 'bash',
  c: 'cpp',
  cc: 'cpp',
  cjs: 'javascript',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  diff: 'diff',
  patch: 'diff',
  bundle: 'plaintext',
  bdl: 'plaintext',
  gv: 'plaintext',
  go: 'go',
  h: 'cpp',
  hcl: 'plaintext',
  hpp: 'cpp',
  html: 'xml',
  htm: 'xml',
  http: 'http',
  ini: 'ini',
  ipynb: 'json',
  java: 'java',
  js: 'javascript',
  json: 'json',
  json5: 'json',
  jsonc: 'json',
  jsx: 'javascript',
  kt: 'kotlin',
  log: 'plaintext',
  md: 'markdown',
  markdown: 'markdown',
  mjs: 'javascript',
  php: 'php',
  proto: 'protobuf',
  py: 'python',
  rb: 'ruby',
  react: 'javascript',
  rs: 'rust',
  sh: 'bash',
  sql: 'sql',
  swift: 'swift',
  tex: 'latex',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'plaintext',
  vue: 'xml',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml'
}

const languageLoaders: Record<string, () => Promise<{ default: LanguageFn }>> = {
  bash: () => import('highlight.js/lib/languages/bash'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  css: () => import('highlight.js/lib/languages/css'),
  diff: () => import('highlight.js/lib/languages/diff'),
  go: () => import('highlight.js/lib/languages/go'),
  http: () => import('highlight.js/lib/languages/http'),
  ini: () => import('highlight.js/lib/languages/ini'),
  java: () => import('highlight.js/lib/languages/java'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  json: () => import('highlight.js/lib/languages/json'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  latex: () => import('highlight.js/lib/languages/latex'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  php: () => import('highlight.js/lib/languages/php'),
  protobuf: () => import('highlight.js/lib/languages/protobuf'),
  python: () => import('highlight.js/lib/languages/python'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  rust: () => import('highlight.js/lib/languages/rust'),
  sql: () => import('highlight.js/lib/languages/sql'),
  swift: () => import('highlight.js/lib/languages/swift'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  xml: () => import('highlight.js/lib/languages/xml'),
  yaml: () => import('highlight.js/lib/languages/yaml')
}

let highlighterPromise: Promise<HLJSApi> | null = null
const registeredLanguages = new Set<string>()

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className?: string,
  text?: string
) => {
  const element = document.createElement(tagName)
  if (className) {
    element.className = className
  }
  if (typeof text === 'string') {
    element.textContent = text
  }
  return element
}

const createStyle = () => {
  const style = document.createElement('style')
  style.textContent = codeStyle
  return style
}

const resolveLanguage = (type: string) => {
  return languageMap[type.trim().toLowerCase()] || 'plaintext'
}

const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[char]
  })
}

const loadHighlighter = async () => {
  if (!highlighterPromise) {
    highlighterPromise = import('highlight.js/lib/core').then(module => module.default)
  }
  return highlighterPromise
}

const registerLanguageOnce = async (hljs: HLJSApi, name: string) => {
  if (registeredLanguages.has(name)) {
    return true
  }
  const loader = languageLoaders[name]
  if (!loader) {
    return false
  }
  const { default: language } = await loader()
  hljs.registerLanguage(name, language)
  registeredLanguages.add(name)
  return true
}

const clampZoom = (value: number) => {
  return Math.min(2.6, Math.max(0.6, Number(value.toFixed(2))))
}

const lineCountOf = (value: string) => {
  return value.split(/\r\n|\r|\n/).length
}

const createLineNumberText = (lineCount: number) => {
  return Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n')
}

/**
 * Framework-neutral text/code renderer.
 *
 * highlight.js core and language definitions are loaded lazily by format. HTML
 * and XML are highlighted as escaped source text, never executed as real DOM.
 * @param buffer 文本二进制内容
 * @param target 目标
 * @param type 文件扩展名，用于选择 highlight.js 语言
 */
export default async function renderText(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options)
  const extension = type || 'txt'
  const normalizedExtension = extension.trim().toLowerCase()
  if (
    normalizedExtension !== 'bundle' &&
    normalizedExtension !== 'bdl' &&
    shouldVirtualizeTextBuffer(buffer, context)
  ) {
    return renderLargeText(buffer, target, extension, context)
  }
  if (normalizedExtension === 'patch') {
    const { default: renderPatch } = await import('./patch.js')
    return renderPatch(buffer, target, extension, context)
  }
  if (normalizedExtension === 'bundle' || normalizedExtension === 'bdl') {
    const { default: renderGitBundle } = await import('./gitBundle.js')
    return renderGitBundle(buffer, target, extension, context)
  }

  const text = decodeFileViewerTextBuffer(buffer, context?.options?.text?.encoding).text
  const language = resolveLanguage(extension)
  const lineCount = lineCountOf(text)
  const showToolbar = context?.options?.text?.toolbar !== false
  const showLineNumbers = context?.options?.text?.lineNumbers === true
  let disposed = false
  let zoom = 1
  const zoomEmitter = createZoomChangeEmitter()
  const root = createElement('div', 'code-viewer')
  root.dataset.viewerZoomProvider = 'code'
  root.dataset.textToolbar = String(showToolbar)
  root.dataset.lineNumbers = String(showLineNumbers)
  const toolbar = createElement('div', 'code-toolbar')
  toolbar.append(
    createElement('span', '', extension.toUpperCase()),
    createElement('strong', '', `${lineCount} lines`)
  )

  const pre = createElement('pre', showLineNumbers ? 'code-area code-area--line-numbers' : 'code-area')
  const code = createElement('code', `hljs language-${language}`)
  code.innerHTML = language === 'plaintext'
    ? escapeHtml(text)
    : t('text.code.loadingHighlight')
  if (showLineNumbers) {
    const gutter = createElement('span', 'code-line-numbers', createLineNumberText(lineCount))
    gutter.setAttribute('aria-hidden', 'true')
    pre.append(gutter)
  }
  pre.append(code)
  if (showToolbar) {
    root.append(toolbar)
  }
  root.append(pre)
  root.style.setProperty('--code-font-size', `${13 * zoom}px`)
  target.replaceChildren(createStyle(), root)

  const updateHighlighted = async () => {
    if (language === 'plaintext') {
      return
    }
    try {
      const hljs = await loadHighlighter()
      const hasLanguage = await registerLanguageOnce(hljs, language)
      if (disposed) {
        return
      }
      code.innerHTML = hasLanguage
        ? hljs.highlight(text, { language, ignoreIllegals: true }).value
        : escapeHtml(text)
    } catch {
      if (!disposed) {
        code.innerHTML = escapeHtml(text)
      }
    }
  }

  void updateHighlighted()

  const getZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 2.6,
    canZoomOut: zoom > 0.6,
    canReset: zoom !== 1,
    minScale: 0.6,
    maxScale: 2.6
  })

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale)
    root.style.setProperty('--code-font-size', `${13 * zoom}px`)
    zoomEmitter.emit()
    return getZoomState()
  }

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.1),
    zoomOut: () => setZoom(zoom - 0.1),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getZoomState,
    subscribe: zoomEmitter.subscribe
  })

  return {
    $el: target,
    unmount() {
      disposed = true
      unregisterFileViewerZoomProvider(root)
      target.replaceChildren()
    }
  }
}
