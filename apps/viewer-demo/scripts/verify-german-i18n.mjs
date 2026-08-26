import fs from 'node:fs'

const repositoryRoot = new URL('../../../', import.meta.url)
const read = file => fs.readFileSync(new URL(file, repositoryRoot), 'utf8')
const extractValues = source => new Map([
  ...source.matchAll(/^\s*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*(['"])(.*?)\3,?$/gm)
].map(match => [match[1] || match[2], match[4]]))
const placeholders = value => [...String(value || '').matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)]
  .map(match => match[1]).sort()
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const assertCatalog = (baseName, base, name, candidate) => {
  const baseValues = extractValues(base)
  const candidateValues = extractValues(candidate)
  const baseKeys = [...baseValues.keys()].sort()
  const candidateKeys = [...candidateValues.keys()].sort()
  const missing = baseKeys.filter(key => !candidateValues.has(key))
  const extra = candidateKeys.filter(key => !baseValues.has(key))
  assert(!missing.length && !extra.length, `${name} key mismatch vs ${baseName}\nmissing: ${missing.join(', ')}\nextra: ${extra.join(', ')}`)
  for (const [key, value] of baseValues) {
    assert(
      placeholders(value).join(',') === placeholders(candidateValues.get(key)).join(','),
      `${name} placeholder mismatch for ${key}`
    )
  }
  return { baseValues, candidateValues }
}

const core = read('packages/core/src/i18n/messages.ts')
const german = read('packages/core/src/i18n/messages.de.ts')
const englishCore = core.slice(core.indexOf('const EN_US_MESSAGES'), core.indexOf('\n};', core.indexOf('const EN_US_MESSAGES')) + 3)
const coreCatalog = assertCatalog('en-US core', englishCore, 'de-DE core', german)
assert(coreCatalog.candidateValues.size === 449, `Expected 449 German core messages, got ${coreCatalog.candidateValues.size}`)
assert([...coreCatalog.baseValues].filter(([key, value]) => coreCatalog.candidateValues.get(key) === value).length < 50, 'German catalog contains too many untranslated English values')
assert(german.includes('"toolbar.search": "Suchen"'), 'German search label is missing')
assert(german.includes('"state.ready.title": "Vorschau bereit"'), 'German ready state is missing')
assert(core.includes("'de-DE': DE_DE_MESSAGES"), 'German core catalog is not registered')
assert(core.includes("normalized.startsWith('de-')"), 'German language tags are not normalized')
assert(core.includes("['zh-CN', 'en-US', 'ja-JP', 'de-DE']"), 'German locale is not listed as supported')

const demo = read('apps/viewer-demo/src/composables/useDemoCopy.ts')
const demoGerman = read('apps/viewer-demo/src/composables/useDemoCopy.de.ts')
const englishDemo = demo.slice(demo.indexOf("  'en-US': {"), demo.indexOf("\n  },\n  'ja-JP'", demo.indexOf("  'en-US': {")))
assertCatalog('en-US demo', englishDemo, 'de-DE demo', demoGerman)

for (const file of [
  'packages/core/src/contracts/types.ts',
  'packages/core/src/viewer/state.ts',
  'packages/renderers/eda/src/eda.ts',
  'packages/renderers/eda/src/edaParser.ts',
  'packages/renderers/presentation/src/pptx.ts',
  'packages/renderers/geometry-engine/src/index.ts',
  'apps/viewer-demo/src/composables/useDemoCopy.ts',
  'apps/viewer-demo/src/composables/useDemoSamples.ts',
  'apps/viewer-demo/src/components/HelloWorld.vue',
  'apps/viewer-demo/src/compare/CompareApp.vue',
  'apps/web-demo/src/main.js',
  'apps/web-demo/index.html',
  'apps/viewer-demo/public/example/en/code.ts'
]) {
  assert(read(file).includes('de-DE') || read(file).includes('locale-de'), `${file} is missing German locale coverage`)
}

assert(read('docs/guide/quickstart.md').includes('### German locale'), 'Quickstart is missing the German locale section')
console.log('German i18n verification passed')
