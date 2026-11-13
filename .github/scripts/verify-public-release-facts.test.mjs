import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { collectFacts, verifyPublicReleaseFacts } from './verify-public-release-facts.mjs'

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'source-build-facts-'))
  const version = '3.3.4',
    releaseUrl = `https://github.com/flyfish-dev/file-viewer/releases/tag/v${version}`
  const entry = (packageName) => ({ packageName, releaseVersion: version })
  const wrappers = {
    corePackage: entry('@file-viewer/core'),
    utilityPackages: Array.from({ length: 85 }, (_, index) =>
      entry(`@file-viewer/fixture-${index}`)
    ),
    wrappers: [entry('@file-viewer/vue3'), entry('@file-viewer/vue2.7')],
    compatibilityPackages: [{ packageName: 'msdoc-viewer', releaseVersion: '0.2.16' }]
  }
  const site = 'apps/official-site',
    demo = 'apps/viewer-demo/public'
  const llm = `Build version: ${version}\n89 File Viewer npm targets\n${releaseUrl}\n88 mainline File Viewer packages use ${version}; the historical \`msdoc-viewer\` compatibility package uses 0.2.16. Word uses \`@file-viewer/docx\` 0.3.39; Spreadsheet uses \`styled-exceljs\` 0.21.6.\n@file-viewer/ppt@1.0.2\nv${version} Full package contract\n`
  const values = {
    'package.json': { version },
    'ecosystem/wrappers.json': wrappers,
    'ecosystem/format-catalog.json': {
      schemaVersion: 1,
      renderers: [
        { id: 'stable', status: 'stable', extensions: ['pdf', 'doc'] },
        { id: 'experimental', status: 'experimental', extensions: ['fixture'] }
      ]
    },
    'packages/renderers/word/package.json': { dependencies: { '@file-viewer/docx': '0.3.39' } },
    'packages/renderers/spreadsheet/package.json': { dependencies: { 'styled-exceljs': '0.21.6' } },
    'packages/renderers/presentation-ppt/package.json': {
      dependencies: { '@file-viewer/ppt': '1.0.2' }
    },
    [`${site}/src/App.vue`]: `const currentReleaseVersion = '${version}'`,
    [`${site}/index.html`]: `89 个 npm 发布目标\n"softwareVersion": "${version}"\n${releaseUrl}`,
    [`${site}/en/index.html`]: `89 npm targets\n"softwareVersion": "${version}"\n${releaseUrl}`,
    [`${site}/public/software.json`]: { version, downloadUrl: releaseUrl },
    [`${site}/public/en/browser-file-viewer/index.html.md`]: `Build version: \`${version}\`\nMain npm package line: \`${version}\` (\`msdoc-viewer\` compatibility alias: \`0.2.16\`)\nRegistered extension mappings: \`3\`\nStable extension mappings: \`2\`\nExperimental extension mappings: \`1\`\nPreview pipelines: \`2\`\nnpm targets: \`89\``,
    [`${site}/public/en/browser-file-viewer/index.html`]: `3 registered\n2 stable, 1 experimental\n2 preview pipelines\n89 npm targets\n"softwareVersion": "${version}"\n<strong>${version}</strong><span>build version</span>\n<strong>3</strong><span>registered extension mappings</span>\n<strong>2</strong><span>preview pipelines</span>\n<strong>89</strong><span>npm targets</span>`,
    [`${site}/public/llms.txt`]: llm,
    [`${site}/public/llms-full.txt`]: llm,
    [`${demo}/example/data.json`]: {
      version,
      packages: { vue3: `@file-viewer/vue3@${version}`, vue2: `@file-viewer/vue2.7@${version}` },
      features: [{ group: 'document', presentationRoutes: { ppt: '@file-viewer/ppt@1.0.2' } }]
    },
    [`${demo}/llms.txt`]: `Build version: ${version}\n3 registered extensions (2 stable, 1 experimental) to 2 preview pipelines`,
    [`${demo}/example/data.xml`]: 'renderer="@file-viewer/ppt@1.0.2"',
    [`${demo}/example/SOURCES.md`]: '@file-viewer/ppt@1.0.2',
    'docs/public/llms.txt': `Documentation version: ${version}\n89 File Viewer npm targets`,
    'docs/public/llms-full.txt': `Version: ${version}\nDocumentation version: ${version}\nSource matrix npm targets: 89\nRegistered extension mappings: 3\nPreview pipelines: 2\nRelease reference for this documentation: ${releaseUrl}`,
    'apps/docs-site/lib/shared.ts': '3 registered file extensions',
    'apps/docs-site/components/docs-layout.tsx': '3 extensions',
    'docs/guide/faq.md': '@file-viewer/docx@0.3.39 file-viewer-docx=0.3.39',
    'docs/zh/guide/faq.md': '@file-viewer/docx@0.3.39 file-viewer-docx=0.3.39',
    'README.zh-CN.md': '@file-viewer/ppt@1.0.2'
  }
  try {
    for (const [path, value] of Object.entries(values)) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), typeof value === 'string' ? value : JSON.stringify(value))
    }
    const replace = async (path, before, after) => {
      const file = join(root, path),
        content = await readFile(file, 'utf8')
      assert.ok(content.includes(before), `${path}: mutation input missing`)
      await writeFile(file, content.replace(before, after))
    }
    await run(root, replace)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('an offline candidate can identify its source build without claiming publication', async () =>
  fixture(async (root) => {
    const facts = await verifyPublicReleaseFacts(root)
    assert.deepEqual(
      {
        version: facts.version,
        targets: facts.npmTargetCount,
        mainline: facts.mainlinePackageCount,
        alias: facts.msdocVersion,
        docx: facts.docxVersion,
        spreadsheet: facts.styledExcelVersion,
        ppt: facts.pptVersion
      },
      {
        version: '3.3.4',
        targets: 89,
        mainline: 88,
        alias: '0.2.16',
        docx: '0.3.39',
        spreadsheet: '0.21.6',
        ppt: '1.0.2'
      }
    )
  }))

test('a publication claim cannot be appended to otherwise correct documentation facts', async () =>
  fixture(async (root) => {
    await writeFile(join(root, 'docs/public/llms-full.txt'), '\nCurrent published version: 3.3.4', {
      flag: 'a'
    })
    await assert.rejects(
      verifyPublicReleaseFacts(root),
      /publication requires registry and release evidence/
    )
  }))

for (const [label, path, before, after] of [
  [
    'documentation version',
    'docs/public/llms-full.txt',
    'Documentation version: 3.3.4',
    'Documentation version: 3.3.3'
  ],
  [
    'target count',
    'docs/public/llms-full.txt',
    'Source matrix npm targets: 89',
    'Source matrix npm targets: 88'
  ],
  [
    'mainline count',
    'apps/official-site/public/llms.txt',
    '88 mainline File Viewer packages',
    '87 mainline File Viewer packages'
  ],
  ['alias version', 'apps/official-site/public/llms.txt', 'uses 0.2.16', 'uses 0.2.15'],
  [
    'DOCX provenance',
    'apps/official-site/public/llms.txt',
    '`@file-viewer/docx` 0.3.39',
    '`@file-viewer/docx` 0.3.40'
  ],
  [
    'demo version',
    'apps/viewer-demo/public/example/data.json',
    '"version":"3.3.4"',
    '"version":"3.3.3"'
  ]
]) {
  test(`source-build semantics retain the strict ${label} check`, async () =>
    fixture(async (root, replace) => {
      await replace(path, before, after)
      await assert.rejects(verifyPublicReleaseFacts(root), /missing|version/)
    }))
}

test('mainline package alignment remains mandatory before text verification', async () =>
  fixture(async (root, replace) => {
    await replace('ecosystem/wrappers.json', '"releaseVersion":"3.3.4"', '"releaseVersion":"3.3.3"')
    await assert.rejects(collectFacts(root), /releaseVersion 3\.3\.3 !== root 3\.3\.4/)
  }))
