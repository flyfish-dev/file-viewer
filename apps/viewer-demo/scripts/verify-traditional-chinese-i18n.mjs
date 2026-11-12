import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('../../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const entries = source => new Map([...source.matchAll(/^\s*(?:'([^']+)'|([\w]+))\s*:\s*'((?:\\.|[^'])*)',?\s*$/gm)]
  .map(match => [match[1] || match[2], match[3]]))
const placeholders = value => [...value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]).sort()
const sameCatalog = (source, candidate, label) => {
  const base = entries(source)
  const translated = entries(candidate)
  assert.deepEqual([...translated.keys()].sort(), [...base.keys()].sort(), `${label} keys`)
  for (const [key, text] of base) {
    assert.deepEqual(placeholders(translated.get(key)), placeholders(text), `${label} ${key} placeholders`)
  }
  return base.size
}

const core = read('packages/core/src/i18n/messages.ts')
const coreBase = core.slice(core.indexOf('const ZH_CN_MESSAGES'), core.indexOf('const EN_US_MESSAGES'))
const demo = read('apps/viewer-demo/src/composables/useDemoCopy.ts')
const demoBase = demo.slice(demo.indexOf("  'zh-CN': {"), demo.indexOf("  'en-US': {"))
for (const region of ['TW', 'HK']) {
  const locale = `zh-${region}`
  assert.equal(sameCatalog(coreBase, read(`packages/core/src/i18n/messages.zh-${region.toLowerCase()}.ts`), locale), 490)
  assert.equal(sameCatalog(demoBase, read(`apps/viewer-demo/src/composables/useDemoCopy.zh-${region.toLowerCase()}.ts`), `${locale} demo`), 219)
  assert(core.includes(`'${locale}': ZH_${region}_MESSAGES`), `${locale} core registration`)
  assert(demo.includes(`'${locale}': demoCopyZh${region}`), `${locale} demo registration`)
  for (const path of [
    'apps/viewer-demo/src/composables/useDemoLocaleSwitcher.ts',
    'apps/viewer-demo/src/compare/CompareApp.vue',
    'apps/web-demo/src/main.js',
    'apps/viewer-demo/public/example/en/code.ts'
  ]) assert(read(path).includes(locale), `${path} missing ${locale}`)
}
assert(read('apps/web-demo/index.html').includes('locale-tw'))
assert(read('apps/web-demo/index.html').includes('locale-hk'))
const twDemo = read('apps/viewer-demo/src/composables/useDemoCopy.zh-tw.ts')
assert(twDemo.includes("resizableColumns: '允許拖曳欄寬'"))
assert(twDemo.includes("resizableRows: '允許拖曳列高'"))
assert(read('apps/viewer-demo/src/composables/useDemoWelcome.ts').includes("description: '檢視儲存格，拖曳調整欄寬'"))
assert(read('packages/renderers/eda/src/edaParser.ts').includes('專業版圖處理函式庫'))
assert(read('packages/renderers/eda/src/eda.ts').includes("'meta.userUnit': '用戶單位'"))
console.log('Traditional Chinese i18n catalog and entrypoint verification passed')
