import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export async function correspondingSourceNotice(metadata) {
  const registry = JSON.parse(await readFile(new URL('./licenses/corresponding-sources.json', import.meta.url)))
  const entry = registry[`${metadata.name}@${metadata.version}`]
  if (!entry) return null
  const sections = ['Preferred public corresponding source', entry.scope]
  for (const source of entry.sources) {
    sections.push(`Source: ${source.url}\nBytes: ${source.bytes}\nSHA-256: ${source.sha256}`)
  }
  sections.push(`Provenance limit: ${entry.upstreamBuildLimitation}`)
  if (metadata.name === 'elkjs') {
    for (const file of ['EPL-1.0.html.txt', 'EPL-2.0.html.txt']) {
      const raw = await readFile(new URL('./licenses/native/' + file, import.meta.url))
      sections.push(`Original upstream EPL standard text, retained for public Java libraries (${file}, SHA-256 ${digest(raw)}):\n${raw.toString('utf8')}`)
    }
    const noticeBook = entry.originalNoticeBook
    if (metadata.version !== '0.9.3' && !noticeBook)
      throw new Error('Original Java notice book is required for the selected release')
    if (noticeBook && noticeBook.file !== `elk-java-original-notices-${metadata.version}.json`)
      throw new Error('Original Java notice book does not match the selected release')
    const bookBytes = await readFile(new URL('./licenses/' + (noticeBook?.file || 'elk-java-original-notices.json'), import.meta.url))
    if (noticeBook && digest(bookBytes) !== noticeBook.sha256)
      throw new Error('Original Java notice book byte identity changed')
    const book = JSON.parse(bookBytes)
    if (noticeBook && (book.length !== entry.sources.length ||
      new Set(book.map(archive => archive.artifact)).size !== entry.sources.length))
      throw new Error('Original Java notice book must cover every selected source artifact once')
    for (const archive of book) {
      if (noticeBook && !entry.sources.some(source => source.name === archive.artifact && source.sha256 === archive.sha256))
        throw new Error('Original Java notice artifact is not in the selected corresponding sources')
      sections.push(`Conservative source artifact: ${archive.artifact}\nSHA-256: ${archive.sha256}\n${archive.scope}`)
      for (const [sha256, original] of Object.entries(archive.materials)) {
        const bytes = Buffer.from(original.text, original.encoding)
        if (digest(bytes) !== sha256) throw new Error('Original Java notice byte identity changed')
        sections.push(`Original public source notice: ${original.sourcePath}\nOriginal encoding: ${original.encoding}\nSHA-256: ${sha256}\n${original.text}`)
      }
    }
  } else {
    sections.push('Library replacement and relinking from separately distributed runtime objects:',
      'The geometry-engine and renderer-3d packages distribute separate compiled ES modules. The full CDN model IIFE also inlines this library; an external WASM URL alone is not claimed to replace every library component.',
      'Rebuild only the public occt-import-js wrapper with esbuild 0.28.2: browser platform, CommonJS format, ES2018 target, process defined as undefined, and path aliased to the public path-browserify package. Replace geometry-engine/dist/vendor/occt.cjs. The upstream WASM can be rebuilt separately from the offered wrapper and OCCT preferred sources.',
      'Bundle the separately supplied renderer-3d/dist/model.js compiled runtime object and its published runtime dependencies with your replacement geometry-engine library using a browser IIFE/ES module bundler. These host object modules permit relinking without publishing privately maintained TypeScript renderer sources.',
      'The local verification replaces the library wrapper and relinks the compiled Model/geometry runtime objects, then parses a public STEP model through the modified library. This is not a claim of a byte-identical original CDN IIFE rebuild or full UI fidelity.')
    const raw = await readFile(new URL('./licenses/native/OCCT_LGPL_EXCEPTION.txt', import.meta.url))
    if (digest(raw) !== '04580a884ea6cea294402649ff7b5cbb167d47462d1340a4ed33e550db10a81b') throw new Error('OCCT original exception changed')
    sections.push(`Original OCCT header-material exception (not an exemption for the whole library):\n${raw.toString('utf8')}`)
    const book = JSON.parse(await readFile(new URL('./licenses/occt-toolchain-original-notices.json', import.meta.url)))
    sections.push(book.scope)
    for (const material of book.materials) {
      if (digest(Buffer.from(material.text)) !== material.sha256) throw new Error('OCCT toolchain original grant changed')
      sections.push(`Original public toolchain material: ${material.source}\nSHA-256: ${material.sha256}\n${material.text}`)
    }
  }
  return { ...entry, text: sections.join('\n\n') + '\n' }
}
