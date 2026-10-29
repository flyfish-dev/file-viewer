import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { assertEnglishPackageReadme, packageReadmeHeader, readmeLanguageLinks } from './readme-locales.mjs'

test('language synchronization preserves maintained content and is idempotent', () => {
  const header = '<!-- FILE_VIEWER_PACKAGE_HEADER -->\n<p>Badge and screenshot</p>\n\n> ⭐ Maintained project link.\n'
  const original = '# @example/full\n\n' + header + '\nDescription.\n\n```bash\nnpm install @example/full\n```\n'
  const result = readmeLanguageLinks(original, 'packages/example')
  assert.equal(packageReadmeHeader(result), header.trimEnd())
  assert.ok(result.endsWith('Description.\n\n```bash\nnpm install @example/full\n```\n'))
  assert.ok(result.includes('/packages/example/README.zh-CN.md'))
  assert.equal(readmeLanguageLinks(result, 'packages/example'), result)
  assert.throws(() => packageReadmeHeader('# Name\n<!-- FILE_VIEWER_PACKAGE_HEADER -->\nunknown'), /safely preserve/)
})

test('Chinese language links never point back to the English default', () => {
  const result = readmeLanguageLinks('# Package\n\nPreview files.\n\n[简体中文](./README.md)\n', 'packages/example')
  assert.ok(result.includes('[简体中文](./README.zh-CN.md)'))
  assert.equal(readmeLanguageLinks(result, 'packages/example'), result)
})

test('English defaults reject a Chinese introduction and mixed-language package header', () => {
  const english = '# Package\n\n[简体中文](./README.zh-CN.md)\n\nPreview files in the browser.\n'
  assert.doesNotThrow(() => assertEnglishPackageReadme(english, 'example'))
  assert.throws(() => assertEnglishPackageReadme(english.replace('Preview files in the browser.', '浏览器文件预览。'), 'example'), /introduction must be English/)
  const header = '<!-- FILE_VIEWER_PACKAGE_HEADER -->\n<p><a href="https://example.com">简体中文</a></p>\n\n> ⭐ Star the project.\n'
  assert.doesNotThrow(() => assertEnglishPackageReadme(english.replace('\n\nPreview', `\n\n${header}\nPreview`), 'example'))
  assert.throws(() => assertEnglishPackageReadme(english.replace('\n\nPreview', `\n\n${header.replace('Star the project.', '点个 Star。')}\nPreview`), 'example'), /header must be English/)
})

test('every published package has an English default, its compatibility alias and a maintained Chinese README', async () => {
  const root = new URL('../../', import.meta.url)
  const catalog = JSON.parse(await readFile(new URL('ecosystem/wrappers.json', root), 'utf8'))
  const entries = [{ packageDir: 'packages/core' },
    ...['utilityPackages', 'renderers', 'presets', 'compatibilityPackages', 'wrappers']
      .flatMap(group => catalog[group] || [])]
  for (const { packageDir } of entries) {
    const read = filename => readFile(new URL(`${packageDir}/${filename}`, root), 'utf8')
    const english = await read('README.md')
    assertEnglishPackageReadme(english, packageDir)
    assert.equal(await read('README.en.md'), english, `${packageDir}: English alias differs`)
    const chinese = await read('README.zh-CN.md')
    assert.ok(chinese.trim(), `${packageDir}: missing Chinese README`)
    if (packageDir === 'packages/core' || packageDir.startsWith('packages/components/')) {
      assert.notEqual(chinese, english, `${packageDir}: Chinese content was overwritten`)
    }
    assert.doesNotMatch(english, /\[简体中文\]\(\.\/README\.md\)/)
  }
})

test('main npm entry points lead to the public project without installation advertising', async () => {
  const root = new URL('../../', import.meta.url)
  const catalog = JSON.parse(await readFile(new URL('ecosystem/wrappers.json', root), 'utf8'))
  for (const { packageDir } of [{ packageDir: 'packages/core' }, ...catalog.wrappers]) {
    const metadata = JSON.parse(await readFile(new URL(`${packageDir}/package.json`, root), 'utf8'))
    assert.equal(metadata.homepage, 'https://github.com/flyfish-dev/file-viewer#readme', metadata.name)
    assert.equal(metadata.repository.url, 'git+https://github.com/flyfish-dev/file-viewer.git', metadata.name)
    assert.equal(metadata.repository.directory, packageDir, metadata.name)
    assert.equal(metadata.bugs.url, 'https://github.com/flyfish-dev/file-viewer/issues', metadata.name)
    const readme = await readFile(new URL(`${packageDir}/README.md`, root), 'utf8')
    assert.ok(readme.indexOf('Browser-side file preview') >= 0 || readme.includes('Framework-neutral TypeScript APIs'), metadata.name)
    assert.match(readme.split('<!-- FILE_VIEWER_PACKAGE_HEADER -->')[0], /browser-side|Browser-side/)
    for (const hook of ['preinstall', 'install', 'postinstall']) {
      assert.equal(metadata.scripts?.[hook], undefined, `${metadata.name}: unexpected ${hook}`)
    }
  }
})
