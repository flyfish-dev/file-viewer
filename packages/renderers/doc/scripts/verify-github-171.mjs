import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMsDoc, renderMsDoc } from '../dist/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturePath = join(packageDir, 'test', 'fixtures', 'github-171-textbox-resume.doc')
const bytes = await readFile(fixturePath)
const parsed = parseMsDoc(bytes)
const rendered = renderMsDoc(parsed)
const visibleText = parsed.blocks
  .filter(block => block.type === 'paragraph')
  .flatMap(block => block.inlines || [])
  .filter(node => node.type === 'text')
  .map(node => node.text)
  .join('')

for (const expected of ['北京', '求职意向', '教育背景', '实习经历']) {
  if (!visibleText.includes(expected)) {
    throw new Error(`Expected recovered text-box content to include ${expected}`)
  }
}

if (visibleText.includes('\u0008') || rendered.html.includes('\u0008')) {
  throw new Error('Legacy text-box placeholder characters leaked into the rendered document')
}

if (!parsed.warnings.some(warning => warning.code === 'MSDOC_TEXTBOX_STORY_LINEARIZED')) {
  throw new Error('Expected the parser to report that text-box content was linearized')
}

if (!rendered.html.includes('求职意向') || !rendered.html.includes('实习经历')) {
  throw new Error('Recovered text-box story was not emitted to HTML')
}

console.log('[doc] GitHub #171 text-box story content recovered without placeholder glyphs.')
