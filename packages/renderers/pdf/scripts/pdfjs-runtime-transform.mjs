export const pdfJsRuntimeIsolationTransform = 'isolate-pdfjs-webpack4-runtime-v1'
export const pdfJsRuntimeModificationNotice =
  '/* File Viewer modification: isolated PDF.js internal webpack runtime identifiers for webpack 4 compatibility. */\n'

const runtimeIdentifierPattern = /\b__webpack_(modules|module_cache|exports|require)__\b/g

export function isolatePdfJsWebpackRuntime(source) {
  let replacements = 0
  const output = source.replace(runtimeIdentifierPattern, (_match, name) => {
    replacements += 1
    return `__pdfjs_webpack_${name}__`
  })
  return {
    output: replacements > 0 ? `${pdfJsRuntimeModificationNotice}${output}` : output,
    replacements,
  }
}
