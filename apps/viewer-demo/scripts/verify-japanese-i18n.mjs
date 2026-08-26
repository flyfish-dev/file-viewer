import fs from 'node:fs'

const repositoryRoot = new URL('../../../', import.meta.url)
const read = file => fs.readFileSync(new URL(file, repositoryRoot), 'utf8')
const extractKeys = source => [...source.matchAll(/^\s*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:/gm)]
  .map(match => match[1] || match[2])
const placeholders = value => [...value.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)].map(match => match[1]).sort()
const extractCatalog = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex)
  if (startIndex < 0 || endIndex < 0) throw new Error('Unable to locate catalog: ' + start)
  return source.slice(startIndex, endIndex)
}
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const assertSameKeys = (baseName, base, name, candidate) => {
  const left = [...new Set(extractKeys(base))].sort()
  const right = [...new Set(extractKeys(candidate))].sort()
  const missing = left.filter(key => !right.includes(key))
  const extra = right.filter(key => !left.includes(key))
  assert(!missing.length && !extra.length, name + ' key mismatch vs ' + baseName + '\nmissing: ' + missing.join(', ') + '\nextra: ' + extra.join(', '))
}
const extractValues = source => new Map([
  ...source.matchAll(/^\s*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*(['"])(.*?)\3,?$/gm)
].map(match => [match[1] || match[2], match[4]]))
const assertPlaceholders = (base, candidate, label) => {
  const baseValues = extractValues(base)
  const candidateValues = extractValues(candidate)
  for (const [key, value] of baseValues) {
    const expected = placeholders(value).join(',')
    const actual = placeholders(candidateValues.get(key) || '').join(',')
    assert(expected === actual, label + ' placeholder mismatch for ' + key + ': expected [' + expected + '] got [' + actual + ']')
  }
}

const core = read('packages/core/src/i18n/messages.ts')
const ja = read('packages/core/src/i18n/messages.ja.ts')
const zhCore = extractCatalog(core, 'const ZH_CN_MESSAGES', 'const EN_US_MESSAGES')
const jaCore = extractCatalog(ja, 'export const JA_JP_MESSAGES', '};')
assertSameKeys('zh-CN core', zhCore, 'ja-JP core', jaCore)
assertPlaceholders(zhCore, jaCore, 'ja-JP core')
assert(core.includes("'ja-JP': JA_JP_MESSAGES"), 'Japanese core catalog is not registered')
assert(core.includes('browserNavigator.languages'), 'automatic locale detection must scan navigator.languages')
assert(core.includes("normalized.startsWith('ja-')"), 'Japanese language tags are not normalized')
for (const entrypoint of [
  'packages/core/src/index.ts',
  'packages/core/src/headless.ts'
]) {
  assert(read(entrypoint).includes('FILE_VIEWER_SUPPORTED_LOCALES'), entrypoint + ' does not export the supported locale list')
}

const demo = read('apps/viewer-demo/src/composables/useDemoCopy.ts')
const demoJa = read('apps/viewer-demo/src/composables/useDemoCopy.ja.ts')
const zhDemo = extractCatalog(demo, "'zh-CN': {", "'en-US': {").replace("'zh-CN': {", '')
assertSameKeys('zh-CN demo', zhDemo, 'ja-JP demo', demoJa)
assertPlaceholders(zhDemo, demoJa, 'ja-JP demo')

for (const file of [
  'apps/viewer-demo/src/composables/useDemoPreferences.ts',
  'apps/viewer-demo/src/composables/useDemoSamples.ts',
  'apps/viewer-demo/src/compare/CompareApp.vue',
  'apps/web-demo/src/main.js',
  'packages/renderers/eda/src/eda.ts',
  'packages/renderers/eda/src/edaParser.ts',
  'packages/renderers/presentation/src/pptx.ts',
  'packages/renderers/geometry-engine/src/index.ts'
]) {
  const fileSource = read(file)
  const delegatesLocaleResolution = file.endsWith('useDemoPreferences.ts') && fileSource.includes('normalizeFileViewerLocale')
  assert(fileSource.includes('ja-JP') || delegatesLocaleResolution, file + ' is missing Japanese locale coverage')
}
const edaParser = read('packages/renderers/eda/src/edaParser.ts')
assert(edaParser.includes('titleOrcadSymbolLibrary'), 'EDA parser titles are not localized')

const webDemo = read('apps/web-demo/src/main.js')
assert(webDemo.includes('resolveAutomaticLocale'), 'Web demo does not auto-detect language priority')
assert(webDemo.includes("localeJa.addEventListener"), 'Web demo Japanese selector is not wired')
assert(webDemo.includes('japaneseSampleNames[url]'), 'Web demo Japanese sample names are not wired')
assert(webDemo.includes("locale: '${state.locale}'"), 'Web demo integration snippet does not preserve the selected locale')
const hello = read('apps/viewer-demo/src/components/HelloWorld.vue')
const localeSwitcher = read('apps/viewer-demo/src/composables/useDemoLocaleSwitcher.ts')
assert(localeSwitcher.includes("{ value: 'ja-JP', label: '日本語'"), 'Main demo Japanese locale option is missing')
assert(hello.includes('useDemoLocaleSwitcher('), 'Main demo locale switcher is not wired')
assert(hello.includes("class='viewer-locale-trigger'"), 'Main demo globe locale trigger is missing')
assert(hello.includes("<Globe :size='21'"), 'Main demo locale trigger must use the latitude/longitude globe icon')
assert(!hello.includes('<Globe2 '), 'Main demo locale trigger must not use the Earth landmass icon')
assert(hello.includes("v-for='option in demoLocaleOptions'"), 'Main demo locale menu is not data-driven')
assert(hello.includes('locale="${demoLocale.value}"'), 'Main demo integration snippet does not preserve the selected locale')
const publicTypeScriptExample = read('apps/viewer-demo/public/example/en/code.ts')
assert(publicTypeScriptExample.includes("'ja-JP'"), 'Public TypeScript example locale type is missing Japanese')
const sampleData = read('apps/viewer-demo/src/data/demoSamples.ts')
assert(sampleData.includes('sampleGroupsJa'), 'Main demo Japanese sample catalog is missing')
const compare = read('apps/viewer-demo/src/compare/CompareApp.vue')
assert(compare.includes("{ value: 'ja-JP', label: '日本語'"), 'Compare demo Japanese locale option is missing')
assert(compare.includes('class="compare-locale-trigger"'), 'Compare demo globe locale trigger is missing')
assert(compare.includes('<Globe :size="21"'), 'Compare demo locale trigger must use the latitude/longitude globe icon')
assert(!compare.includes('<Globe2 '), 'Compare demo locale trigger must not use the Earth landmass icon')
assert(compare.includes('v-for="option in compareLocaleOptions"'), 'Compare demo locale menu is not data-driven')
const cad = read('packages/renderers/cad/src/cad.ts')
assert(cad.includes("t('cad.layers.merged'"), 'CAD duplicate-layer title is not localized')
const defaultQuickstart = read('docs/guide/quickstart.md')
assert(defaultQuickstart.includes('### Japanese locale'), 'Default English quickstart is missing the Japanese locale section')

console.log('Japanese i18n verification passed')
