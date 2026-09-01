import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import {
  DEFAULT_PRETTY_PRINT_MAX_BYTES,
  formatFileViewerTextForDisplay,
  resolveFileViewerPrettyPrintMaxBytes,
  supportsFileViewerPrettyPrint
} from '../dist/prettyPrint.js'

const fixtureUrl = name => new URL(`./fixtures/${name}`, import.meta.url)
const readFixture = name => readFile(fileURLToPath(fixtureUrl(name)), 'utf8')

const withDomParser = async callback => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const previous = globalThis.DOMParser
  globalThis.DOMParser = dom.window.DOMParser
  try {
    return await callback()
  } finally {
    if (previous === undefined) {
      delete globalThis.DOMParser
    } else {
      globalThis.DOMParser = previous
    }
    dom.window.close()
  }
}

test('pretty-print threshold defaults independently to the effective large-text threshold', () => {
  assert.equal(resolveFileViewerPrettyPrintMaxBytes(), DEFAULT_PRETTY_PRINT_MAX_BYTES)
  assert.equal(resolveFileViewerPrettyPrintMaxBytes({ virtualizeAboveBytes: 128 }), 128)
  assert.equal(
    resolveFileViewerPrettyPrintMaxBytes({ virtualizeAboveBytes: 128, prettyPrintMaxBytes: 64 }),
    64
  )
  assert.equal(resolveFileViewerPrettyPrintMaxBytes({ prettyPrintMaxBytes: -1 }), 0)
})

test('disabled, unsupported, aborted, and oversized inputs never load Prettier', async () => {
  let loadCount = 0
  const loader = async () => {
    loadCount += 1
    return { format: async source => source, plugins: [] }
  }

  const disabled = await formatFileViewerTextForDisplay(
    '{"ok":true}',
    'json',
    { prettyPrint: false },
    undefined,
    loader
  )
  assert.equal(disabled.reason, 'disabled')

  const unsupported = await formatFileViewerTextForDisplay(
    'plain text',
    'txt',
    { prettyPrint: true },
    undefined,
    loader
  )
  assert.equal(unsupported.reason, 'unsupported')

  const controller = new AbortController()
  controller.abort()
  const aborted = await formatFileViewerTextForDisplay(
    '{"ok":true}',
    'json',
    { prettyPrint: true },
    controller.signal,
    loader
  )
  assert.equal(aborted.reason, 'aborted')

  const oversized = await formatFileViewerTextForDisplay(
    'éé',
    'json',
    { prettyPrint: true, prettyPrintMaxBytes: 3 },
    undefined,
    loader
  )
  assert.equal(oversized.reason, 'too-large')
  assert.equal(oversized.sourceByteLength, 4)
  assert.equal(loadCount, 0)
})

test('pretty-print byte boundary is inclusive and uses decoded UTF-8 size', async () => {
  let loadCount = 0
  const loader = async definition => {
    loadCount += 1
    assert.equal(definition.parser, 'json')
    return {
      format: async source => `${source.toUpperCase()}\n`,
      plugins: []
    }
  }

  const below = await formatFileViewerTextForDisplay(
    'éé',
    'json',
    { prettyPrint: true, prettyPrintMaxBytes: 3 },
    undefined,
    loader
  )
  assert.equal(below.reason, 'too-large')

  const equal = await formatFileViewerTextForDisplay(
    'éé',
    'json',
    { prettyPrint: true, prettyPrintMaxBytes: 4 },
    undefined,
    loader
  )
  assert.equal(equal.reason, 'formatted')
  assert.equal(equal.text, 'ÉÉ')

  const above = await formatFileViewerTextForDisplay(
    'éé',
    'json',
    { prettyPrint: true, prettyPrintMaxBytes: 5 },
    undefined,
    loader
  )
  assert.equal(above.reason, 'formatted')
  assert.equal(loadCount, 2)
})

test('installed parser registry covers structured formats without per-language public options', () => {
  for (const extension of [
    'json', 'jsonc', 'json5', 'html', 'htm', 'xml', 'vue',
    'js', 'jsx', 'ts', 'tsx', 'css', 'yaml', 'yml'
  ]) {
    assert.equal(supportsFileViewerPrettyPrint(extension), true, extension)
  }
  assert.equal(supportsFileViewerPrettyPrint('txt'), false)
  assert.equal(supportsFileViewerPrettyPrint('python'), false)
})

test('Prettier formats JSON, JSONC, HTML, Vue, and conservative element-only XML', async () => {
  const jsonSource = await readFixture('issue-235-minified.json')
  const json = await formatFileViewerTextForDisplay(jsonSource, 'json', { prettyPrint: true })
  assert.equal(json.formatted, true)
  assert.match(json.text, /\n  "user": \{/)
  assert.match(json.text, /"roles": \["reader", "editor"\]/)
  assert.ok(json.text.split("\n").length >= 4)

  const jsoncSource = '{/* keep */"enabled":true,"items":[1,2]}'
  const jsonc = await formatFileViewerTextForDisplay(jsoncSource, 'jsonc', { prettyPrint: true })
  assert.equal(jsonc.formatted, true)
  assert.match(jsonc.text, /\/\* keep \*\//)
  assert.match(jsonc.text, /\/\* keep \*\//)

  const htmlSource = await readFixture('issue-235-minified.html')
  const html = await formatFileViewerTextForDisplay(htmlSource, 'html', { prettyPrint: true })
  assert.equal(html.formatted, true)
  assert.match(html.text, /\n/)
  assert.match(html.text, /<main>/)

  const vueSource = '<template><main><h1>{{title}}</h1></main></template><script setup lang="ts">const title:string="Preview"</script>'
  const vue = await formatFileViewerTextForDisplay(vueSource, 'vue', { prettyPrint: true })
  assert.equal(vue.formatted, true)
  assert.match(vue.text, /<template>\n/)
  assert.match(vue.text, /const title: string = "Preview"/)

  await withDomParser(async () => {
    const xmlSource = await readFixture('issue-235-minified.xml')
    const xml = await formatFileViewerTextForDisplay(xmlSource, 'xml', { prettyPrint: true })
    assert.equal(xml.formatted, true)
    assert.match(xml.text, /<catalog>\n/)
    assert.match(xml.text, /\n\s+<item id="1">/)
    assert.match(xml.text, /\n\s+<name>Example<\/name>/)
  })
})

test('malformed structured source falls back byte-for-byte without rendering errors', async () => {
  const source = '{"broken": [1,}'
  const result = await formatFileViewerTextForDisplay(source, 'json', { prettyPrint: true })
  assert.equal(result.formatted, false)
  assert.equal(result.reason, 'failed')
  assert.equal(result.text, source)
})

test('mixed XML and xml:space preserve content skip Prettier before loading the plugin', async () => {
  await withDomParser(async () => {
    let loadCount = 0
    const loader = async () => {
      loadCount += 1
      return { format: async source => source, plugins: [] }
    }
    const mixed = await readFixture('issue-235-mixed-content.xml')
    const mixedResult = await formatFileViewerTextForDisplay(
      mixed,
      'xml',
      { prettyPrint: true },
      undefined,
      loader
    )
    assert.equal(mixedResult.reason, 'whitespace-sensitive')
    assert.equal(mixedResult.text, mixed)

    const explicit = '<root xml:space="preserve">  keep   exact  </root>'
    const explicitResult = await formatFileViewerTextForDisplay(
      explicit,
      'xml',
      { prettyPrint: true },
      undefined,
      loader
    )
    assert.equal(explicitResult.reason, 'whitespace-sensitive')
    assert.equal(explicitResult.text, explicit)
    assert.equal(loadCount, 0)
  })
})
