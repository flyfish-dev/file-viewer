import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Generate leaf dictionaries from the single maintained translation catalogs. */
export async function buildLocaleExports(distDirectory) {
  const dist = resolve(distDirectory)
  const { FILE_VIEWER_BUILTIN_MESSAGES } = await import(pathToFileURL(join(dist, 'i18n/builtin-messages.js')).href)
  const { FILE_VIEWER_DEFAULT_PLURAL_MESSAGES } = await import(pathToFileURL(join(dist, 'i18n/builtin-plurals.js')).href)
  const { FILE_VIEWER_SUPPORTED_LOCALES } = await import(pathToFileURL(join(dist, 'i18n/locales.js')).href)
  const expectedKeys = Object.keys(FILE_VIEWER_BUILTIN_MESSAGES['en-US']).sort()
  const directory = join(dist, 'locales')
  await mkdir(directory, { recursive: true })
  for (const locale of FILE_VIEWER_SUPPORTED_LOCALES) {
    const messages = FILE_VIEWER_BUILTIN_MESSAGES[locale]
    assert.deepEqual(Object.keys(messages).sort(), expectedKeys, `Incomplete locale dictionary: ${locale}`)
    const script = `// Generated from the maintained Core catalogs; no automatic registration.\n` +
      `import { defineFileViewerLocaleDictionary } from '../i18n/locale-registry.js';\n` +
      `export const locale = ${JSON.stringify(locale)};\n` +
      `const dictionary = defineFileViewerLocaleDictionary(${JSON.stringify(messages)}, ${JSON.stringify(FILE_VIEWER_DEFAULT_PLURAL_MESSAGES[locale] ?? {})});\n` +
      `export default dictionary;\n`
    const declaration = `import type { FileViewerLocaleDictionary } from '../i18n/locale-registry.js';\n` +
      `export declare const locale: ${JSON.stringify(locale)};\n` +
      `declare const dictionary: FileViewerLocaleDictionary;\nexport default dictionary;\n`
    await writeFile(join(directory, locale + '.js'), script)
    await writeFile(join(directory, locale + '.d.ts'), declaration)
  }
  return { locales: [...FILE_VIEWER_SUPPORTED_LOCALES], messageCount: expectedKeys.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  assert(args.length === 0 || args.length === 2 && args[0] === '--dist-dir', 'Only an explicit dist directory is supported')
  const directory = args[1] || join(dirname(fileURLToPath(import.meta.url)), '../dist')
  const result = await buildLocaleExports(directory)
  console.log(`Generated ${result.locales.length} independent locale dictionaries (${result.messageCount} messages each).`)
}
