import { readFile } from 'node:fs/promises'
import { parseMsDoc, renderMsDoc } from '../dist/index.js'
import { parseHtmlWordDocumentStream } from '../dist/msdoc/html-word.js'

const synthetic = new TextEncoder().encode(`
  <html><body>
    <script>throw new Error('must not execute')</script>
    <div style="text-align:center;font-size:18pt"><strong>Offline document</strong></div>
    <div style="text-indent:30pt">Recovered &amp; readable.</div>
  </body></html>
`)
const syntheticParsed = parseHtmlWordDocumentStream(synthetic)
if (!syntheticParsed) throw new Error('Synthetic HTML WordDocument stream was not detected')
const syntheticHtml = renderMsDoc(syntheticParsed).html
if (
  !syntheticHtml.includes('Offline document') ||
  !syntheticHtml.includes('Recovered &amp; readable.')
) {
  throw new Error('Synthetic HTML WordDocument text was not rendered')
}
if (syntheticHtml.includes('must not execute') || syntheticHtml.includes('<script')) {
  throw new Error('Unsafe HTML content leaked into the rendered document')
}
if (
  !syntheticParsed.warnings.some((warning) => warning.code === 'MSDOC_HTML_WORDDOCUMENT_RECOVERED')
) {
  throw new Error('Expected an HTML WordDocument recovery warning')
}

const samplePath = process.env.FILE_VIEWER_ISSUE_192_SAMPLE
if (samplePath) {
  const parsed = parseMsDoc(await readFile(samplePath))
  const html = renderMsDoc(parsed).html
  const visibleText = parsed.blocks
    .filter((block) => block.type === 'paragraph')
    .map((block) => block.text)
    .join('\n')
  if (parsed.meta.counts.paragraphs < 10 || visibleText.length < 500 || html.length < 500) {
    throw new Error('GitHub #192 sample did not recover enough visible document content')
  }
  if (!parsed.warnings.some((warning) => warning.code === 'MSDOC_HTML_WORDDOCUMENT_RECOVERED')) {
    throw new Error('GitHub #192 sample did not use the HTML WordDocument recovery path')
  }
}

console.log('[doc] GitHub #192 HTML-in-WordDocument files render as safe readable content.')
