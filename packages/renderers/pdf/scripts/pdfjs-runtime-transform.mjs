import { removeRuntimeSourceReferences } from '../../../build-support/runtime-only-javascript.mjs'
import { transform, version as esbuildVersion } from 'esbuild'

export const pdfJsRuntimeIsolationTransform = 'isolate-pdfjs-webpack4-runtime-v2'
export const pdfJsRuntimeModificationNotice =
  '/* File Viewer modification: isolated PDF.js internal webpack runtime identifiers for webpack 4 compatibility and removed unavailable source-map metadata. */\n'

const runtimeIdentifierPattern = /\b__webpack_(modules|module_cache|exports|require)__\b/g

export const pdfJsMainRuntimePath = 'legacy/build/pdf.mjs'
export const pdfJsMainRuntimeProjection = Object.freeze({
  id: 'pdfjs-main-whitespace-v1',
  tool: 'esbuild',
  version: '0.28.2',
  leadingComments: 'retain-original-isolated-leading-trivia-bytes',
  options: Object.freeze({
    loader: 'js',
    minifyWhitespace: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    target: 'esnext',
    legalComments: 'inline',
    treeShaking: false,
    ignoreAnnotations: true,
  }),
})

// Preserve every original leading comment, including complete upstream grants,
// rather than asking the formatter to classify or reconstruct legal text.
const leadingTriviaEnd = source => {
  let offset = 0
  for (;;) {
    const whitespace = /^\s+/.exec(source.slice(offset))
    if (whitespace) { offset += whitespace[0].length; continue }
    if (source.startsWith('/*', offset)) {
      const end = source.indexOf('*/', offset + 2)
      if (end < 0) throw new Error('Unterminated leading PDF.js comment')
      offset = end + 2
      continue
    }
    if (source.startsWith('//', offset)) {
      const end = source.indexOf('\n', offset + 2)
      offset = end < 0 ? source.length : end + 1
      continue
    }
    return offset
  }
}

export function isolatePdfJsWebpackRuntime(source) {
  let replacements = 0
  const output = removeRuntimeSourceReferences(source, 'pdfjs-runtime.mjs').output.replace(runtimeIdentifierPattern, (_match, name) => {
    replacements += 1
    return `__pdfjs_webpack_${name}__`
  })
  return {
    output: replacements > 0 ? `${pdfJsRuntimeModificationNotice}${output}` : output,
    replacements,
  }
}

/** Normal source-derived projection; Worker and viewer retain their old bytes. */
export async function projectPdfJsRuntime(source, runtimePath) {
  const isolated = isolatePdfJsWebpackRuntime(source)
  if (runtimePath !== pdfJsMainRuntimePath) return isolated
  if (esbuildVersion !== pdfJsMainRuntimeProjection.version) {
    throw new Error('PDF.js main projection requires the reviewed esbuild version')
  }
  const offset = leadingTriviaEnd(isolated.output)
  const leading = isolated.output.slice(0, offset)
  const result = await transform(
    isolated.output.slice(offset),
    { ...pdfJsMainRuntimeProjection.options }
  )
  return {
    output: leading + result.code,
    replacements: isolated.replacements,
    projection: pdfJsMainRuntimeProjection,
  }
}
