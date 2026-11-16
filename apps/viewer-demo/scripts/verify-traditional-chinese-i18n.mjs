import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = new URL('../../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
export const entries = source => new Map([...source.matchAll(/^\s*(?:'([^']+)'|([\w]+))\s*:\s*'((?:\\.|[^'\\])*)',?\s*$/gm)]
  .map(match => [match[1] || match[2], match[3]]))
const placeholders = value => [...value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]).sort()
const catalog = (path, name) => {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true)
  const declaration = source.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(item => item.name.getText(source) === name)
  assert(declaration, path + ' missing ' + name)
  let node = declaration.initializer
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression
  assert(ts.isObjectLiteralExpression(node), name + ' must be a maintained object catalog')
  return new Map(node.properties.map(property => {
    assert(ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer), name + ' string entry')
    return [property.name.text, property.initializer.text]
  }))
}
const sameCatalog = (base, translated, label) => {
  assert.deepEqual([...translated.keys()].sort(), [...base.keys()].sort(), label + ' keys')
  for (const [key, text] of base) {
    assert.deepEqual(placeholders(translated.get(key)), placeholders(text), label + ' ' + key + ' placeholders')
  }
}

export const verifyTraditionalChineseI18n = () => {
  const core = read('packages/core/src/i18n/messages.ts')
  const registry = read('packages/core/src/i18n/locales.ts')
  const demo = read('apps/viewer-demo/src/composables/useDemoCopy.ts')
  const coreBase = catalog('packages/core/src/i18n/messages.ts', 'ZH_CN_MESSAGES')
  const demoBase = catalog('apps/viewer-demo/src/composables/useDemoCopy.ru.ts', 'demoCopyRu')
  for (const [region, copyName] of [['TW', 'demoCopyTw'], ['HK', 'demoCopyHk']]) {
    const locale = 'zh-' + region
    sameCatalog(coreBase, catalog('packages/core/src/i18n/messages.zh-Hant.ts', 'ZH_' + region + '_MESSAGES'), locale)
    sameCatalog(demoBase, catalog('apps/viewer-demo/src/composables/useDemoCopy.zh-Hant.ts', copyName), locale + ' demo')
    assert(registry.includes("'" + locale + "': {"), locale + ' registry')
    assert(core.includes("'" + locale + "': { ...ZH_" + region + '_MESSAGES'), locale + ' core registration')
    assert(demo.includes("'" + locale + "': " + copyName), locale + ' demo registration')
  }
  assert(registry.includes("'ru-RU': {"), 'seven-language registry retains Russian')
  for (const path of ['apps/viewer-demo/src/composables/useDemoLocaleSwitcher.ts', 'apps/viewer-demo/src/compare/CompareApp.vue', 'apps/web-demo/src/main.js']) {
    assert(read(path).includes('FILE_VIEWER_LOCALE_OPTIONS'), path + ' uses the shared registry')
  }
  assert(read('apps/viewer-demo/public/example/en/code.ts').includes('locale?: FileViewerLocale'))
  assert(read('apps/web-demo/index.html').includes('locale-select'))
  const twDemo = catalog('apps/viewer-demo/src/composables/useDemoCopy.zh-Hant.ts', 'demoCopyTw')
  assert.equal(twDemo.get('resizableColumns'), '允許拖曳欄寬')
  assert.equal(twDemo.get('resizableRows'), '允許拖曳列高')
  console.log('Traditional Chinese catalogs and shared seven-language entrypoints verified')
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) verifyTraditionalChineseI18n()
