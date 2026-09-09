import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultSourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function readText(path) {
  return readFile(path, 'utf8')
}

function assertIncludes(content, expected, label) {
  assert(content.includes(expected), `${label} is missing ${JSON.stringify(expected)}`)
}

function releaseEntries(wrappers) {
  const groups = [
    wrappers.corePackage,
    ...(wrappers.utilityPackages || []),
    ...(wrappers.renderers || []),
    ...(wrappers.presets || []),
    ...(wrappers.compatibilityPackages || []),
    ...(wrappers.wrappers || [])
  ]
  const entries = new Map()
  for (const entry of groups) {
    assert(entry?.packageName, 'Release metadata has an entry without packageName')
    assert(!entries.has(entry.packageName), `Release metadata repeats ${entry.packageName}`)
    entries.set(entry.packageName, entry)
  }
  return entries
}

function summarizeFormatCatalog(catalog) {
  assert(catalog.schemaVersion === 1, 'Unsupported format catalog schema')
  assert(Array.isArray(catalog.renderers), 'Format catalog renderers must be an array')
  const extensions = new Map()
  for (const renderer of catalog.renderers) {
    assert(renderer?.id, 'Format catalog renderer is missing id')
    assert(Array.isArray(renderer.extensions), `${renderer.id} extensions must be an array`)
    for (const extension of renderer.extensions) {
      const normalized = String(extension).toLowerCase()
      assert(!extensions.has(normalized), `Format catalog repeats extension ${normalized}`)
      extensions.set(normalized, renderer.status)
    }
  }
  const stableExtensionCount = [...extensions.values()].filter(
    (status) => status === 'stable'
  ).length
  return {
    rendererCount: catalog.renderers.length,
    uniqueExtensionCount: extensions.size,
    stableExtensionCount,
    experimentalExtensionCount: extensions.size - stableExtensionCount
  }
}

export async function collectFacts(sourceRoot) {
  const pptRuntimePackagePath = join(
    sourceRoot,
    'packages',
    'components',
    'web',
    'viewer',
    'vendor',
    'ppt',
    'package.json'
  )
  const [
    rootPackage,
    wrappers,
    catalog,
    wordPackage,
    spreadsheetPackage,
    presentationPptPackage,
    pptRuntimePackage
  ] = await Promise.all([
    readJson(join(sourceRoot, 'package.json')),
    readJson(join(sourceRoot, 'ecosystem', 'wrappers.json')),
    readJson(join(sourceRoot, 'ecosystem', 'format-catalog.json')),
    readJson(join(sourceRoot, 'packages', 'renderers', 'word', 'package.json')),
    readJson(join(sourceRoot, 'packages', 'renderers', 'spreadsheet', 'package.json')),
    readJson(join(sourceRoot, 'packages', 'renderers', 'presentation-ppt', 'package.json')),
    existsSync(pptRuntimePackagePath) ? readJson(pptRuntimePackagePath) : Promise.resolve(null)
  ])
  const packages = releaseEntries(wrappers)
  const version = rootPackage.version
  assert(/^\d+\.\d+\.\d+$/.test(version), `Root package version is not stable: ${version}`)
  const mainlinePackages = [...packages.values()].filter(
    (entry) => entry.packageName !== 'msdoc-viewer'
  )
  for (const entry of mainlinePackages) {
    assert(
      entry.releaseVersion === version,
      `${entry.packageName} releaseVersion ${entry.releaseVersion} !== root ${version}`
    )
  }
  const msdocVersion = packages.get('msdoc-viewer')?.releaseVersion
  assert(/^\d+\.\d+\.\d+$/.test(msdocVersion || ''), 'msdoc-viewer releaseVersion is missing')
  const vue3Version = packages.get('@file-viewer/vue3')?.releaseVersion
  const vue2Version = packages.get('@file-viewer/vue2.7')?.releaseVersion
  assert(vue3Version === version, '@file-viewer/vue3 must follow the mainline version')
  assert(vue2Version === version, '@file-viewer/vue2.7 must follow the mainline version')

  const docxVersion = wordPackage.dependencies?.['@file-viewer/docx']
  const styledExcelVersion = spreadsheetPackage.dependencies?.['styled-exceljs']
  const pptVersion =
    pptRuntimePackage?.version || presentationPptPackage.dependencies?.['@file-viewer/ppt']
  assert(/^\d+\.\d+\.\d+$/.test(docxVersion || ''), 'Word DOCX engine version is missing')
  assert(/^\d+\.\d+\.\d+$/.test(styledExcelVersion || ''), 'Spreadsheet engine version is missing')
  assert(/^\d+\.\d+\.\d+$/.test(pptVersion || ''), 'PPT runtime version is missing')

  return {
    version,
    releaseUrl: `https://github.com/flyfish-dev/file-viewer/releases/tag/v${version}`,
    npmTargetCount: packages.size,
    mainlinePackageCount: mainlinePackages.length,
    msdocVersion,
    vue3Version,
    vue2Version,
    docxVersion,
    styledExcelVersion,
    pptVersion,
    ...summarizeFormatCatalog(catalog)
  }
}

async function assertStaticPageFacts(sourceRoot, facts) {
  const siteRoot = join(sourceRoot, 'apps', 'official-site')
  const sourceApp = await readText(join(siteRoot, 'src', 'App.vue'))
  assertIncludes(
    sourceApp,
    `const currentReleaseVersion = '${facts.version}'`,
    'official-site App.vue'
  )

  for (const [relativePath, targetEvidence] of [
    ['index.html', `${facts.npmTargetCount} 个 npm 发布目标`],
    ['en/index.html', `${facts.npmTargetCount} npm targets`]
  ]) {
    const content = await readText(join(siteRoot, relativePath))
    assertIncludes(content, targetEvidence, `official-site ${relativePath}`)
    assertIncludes(
      content,
      `"softwareVersion": "${facts.version}"`,
      `official-site ${relativePath}`
    )
    assertIncludes(content, facts.releaseUrl, `official-site ${relativePath}`)
  }

  const software = await readJson(join(siteRoot, 'public', 'software.json'))
  assert.equal(software.version, facts.version, 'official-site software.json version')
  assert.equal(software.downloadUrl, facts.releaseUrl, 'official-site software.json download URL')

  const factsMarkdown = await readText(
    join(siteRoot, 'public', 'en', 'browser-file-viewer', 'index.html.md')
  )
  for (const expected of [
    `Current published release: \`${facts.version}\``,
    `Main npm package line: \`${facts.version}\` (\`msdoc-viewer\` compatibility alias: \`${facts.msdocVersion}\`)`,
    `Registered extension mappings: \`${facts.uniqueExtensionCount}\``,
    `Stable extension mappings: \`${facts.stableExtensionCount}\``,
    `Experimental extension mappings: \`${facts.experimentalExtensionCount}\``,
    `Preview pipelines: \`${facts.rendererCount}\``,
    `npm targets: \`${facts.npmTargetCount}\``
  ]) {
    assertIncludes(factsMarkdown, expected, 'official-site verified facts Markdown')
  }

  const factsHtml = await readText(
    join(siteRoot, 'public', 'en', 'browser-file-viewer', 'index.html')
  )
  for (const expected of [
    `${facts.uniqueExtensionCount} registered`,
    `${facts.stableExtensionCount} stable, ${facts.experimentalExtensionCount} experimental`,
    `${facts.rendererCount} preview pipelines`,
    `${facts.npmTargetCount} npm targets`,
    `"softwareVersion": "${facts.version}"`,
    `<strong>${facts.version}</strong><span>current published release</span>`,
    `<strong>${facts.uniqueExtensionCount}</strong><span>registered extension mappings</span>`,
    `<strong>${facts.rendererCount}</strong><span>preview pipelines</span>`,
    `<strong>${facts.npmTargetCount}</strong><span>npm targets</span>`
  ]) {
    assertIncludes(factsHtml, expected, 'official-site verified facts HTML')
  }

  const llms = await readText(join(siteRoot, 'public', 'llms.txt'))
  const llmsFull = await readText(join(siteRoot, 'public', 'llms-full.txt'))
  for (const content of [llms, llmsFull]) {
    assertIncludes(
      content,
      `${facts.npmTargetCount} File Viewer npm targets`,
      'official-site LLM facts'
    )
    assertIncludes(content, facts.releaseUrl, 'official-site LLM facts')
    assertIncludes(
      content,
      `${facts.mainlinePackageCount} mainline File Viewer packages use ${facts.version}`,
      'official-site LLM facts'
    )
    assertIncludes(
      content,
      `msdoc-viewer\` compatibility package uses ${facts.msdocVersion}`,
      'official-site LLM facts'
    )
    assertIncludes(content, `@file-viewer/docx\` ${facts.docxVersion}`, 'official-site LLM facts')
    assertIncludes(
      content,
      `styled-exceljs\` ${facts.styledExcelVersion}`,
      'official-site LLM facts'
    )
  }
  assertIncludes(llms, `@file-viewer/ppt@${facts.pptVersion}`, 'official-site LLM facts')
  assertIncludes(llmsFull, `v${facts.version} Full package`, 'official-site extended LLM facts')
}

async function assertDemoFacts(sourceRoot, facts) {
  const demoRoot = join(sourceRoot, 'apps', 'viewer-demo', 'public')
  const data = await readJson(join(demoRoot, 'example', 'data.json'))
  assert.equal(data.version, facts.version, 'demo data.json version')
  assert.equal(data.packages?.vue3, `@file-viewer/vue3@${facts.vue3Version}`, 'demo Vue 3 package')
  assert.equal(
    data.packages?.vue2,
    `@file-viewer/vue2.7@${facts.vue2Version}`,
    'demo Vue 2 package'
  )
  assert.equal(
    data.features?.find((feature) => feature.group === 'document')?.presentationRoutes?.ppt,
    `@file-viewer/ppt@${facts.pptVersion}`,
    'demo PPT runtime package'
  )
  const llms = await readText(join(demoRoot, 'llms.txt'))
  assertIncludes(
    llms,
    `${facts.uniqueExtensionCount} registered extensions (${facts.stableExtensionCount} stable, ${facts.experimentalExtensionCount} experimental) to ${facts.rendererCount} preview pipelines`,
    'demo LLM facts'
  )
  const [xml, sources] = await Promise.all([
    readText(join(demoRoot, 'example', 'data.xml')),
    readText(join(demoRoot, 'example', 'SOURCES.md'))
  ])
  assertIncludes(xml, `renderer="@file-viewer/ppt@${facts.pptVersion}"`, 'demo XML facts')
  assertIncludes(sources, `@file-viewer/ppt@${facts.pptVersion}`, 'demo fixture source facts')
}

async function assertDocsFacts(sourceRoot, facts) {
  const docsRoot = join(sourceRoot, 'docs')
  const docsLlms = await readText(join(docsRoot, 'public', 'llms.txt'))
  const docsLlmsFull = await readText(join(docsRoot, 'public', 'llms-full.txt'))
  assertIncludes(docsLlms, `${facts.npmTargetCount} File Viewer npm targets`, 'docs LLM overview')
  for (const expected of [
    `Version: ${facts.version}`,
    `Current published version: ${facts.version}`,
    `Source matrix npm targets: ${facts.npmTargetCount}`,
    `Registered extension mappings: ${facts.uniqueExtensionCount}`,
    `Preview pipelines: ${facts.rendererCount}`,
    `Current release: ${facts.releaseUrl}`
  ]) {
    assertIncludes(docsLlmsFull, expected, 'docs LLM reference')
  }

  const [shared, layout, faq, faqZh] = await Promise.all([
    readText(join(sourceRoot, 'apps', 'docs-site', 'lib', 'shared.ts')),
    readText(join(sourceRoot, 'apps', 'docs-site', 'components', 'docs-layout.tsx')),
    readText(join(docsRoot, 'guide', 'faq.md')),
    readText(join(docsRoot, 'zh', 'guide', 'faq.md'))
  ])
  assertIncludes(
    shared,
    `${facts.uniqueExtensionCount} registered file extensions`,
    'docs shared metadata'
  )
  assertIncludes(layout, `${facts.uniqueExtensionCount} extensions`, 'docs layout metadata')
  for (const content of [faq, faqZh]) {
    assertIncludes(content, `@file-viewer/docx@${facts.docxVersion}`, 'docs FAQ DOCX version')
    assertIncludes(content, `file-viewer-docx=${facts.docxVersion}`, 'docs FAQ Worker version')
  }

  const chineseReadme = await readText(join(sourceRoot, 'README.zh-CN.md'))
  assertIncludes(
    chineseReadme,
    `@file-viewer/ppt@${facts.pptVersion}`,
    'Chinese README PPT version'
  )
}

export async function verifyPublicReleaseFacts(sourceRoot = defaultSourceRoot) {
  const facts = await collectFacts(sourceRoot)
  await Promise.all([
    assertStaticPageFacts(sourceRoot, facts),
    assertDemoFacts(sourceRoot, facts),
    assertDocsFacts(sourceRoot, facts)
  ])
  return facts
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const facts = await verifyPublicReleaseFacts()
  console.log(
    `[public-release-facts] Verified v${facts.version}: ${facts.npmTargetCount} npm targets, ${facts.uniqueExtensionCount} extensions, and ${facts.rendererCount} preview pipelines.`
  )
}
