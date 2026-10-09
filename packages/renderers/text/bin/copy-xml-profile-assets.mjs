#!/usr/bin/env node
import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const engines = [
  { name: 'xmllint-wasm', version: '5.3.0', files: ['xmllint-browser.mjs', 'xmllint.wasm'] },
  { name: 'xslt-polyfill', version: '1.0.31', files: ['dist/xslt-wasm.js'] }
]

/** Copy pinned optional runtimes and notices; never download or install packages. */
export async function copyXmlProfileAssets(destination = 'public/file-viewer/xml') {
  const output = new Map()
  for (const engine of engines) {
    let manifest
    try { manifest = require.resolve(`${engine.name}/package.json`) } catch {
      throw new Error(`Install the optional XML engines first: pnpm add xmllint-wasm@5.3.0 xslt-polyfill@1.0.31 (missing ${engine.name}).`)
    }
    const metadata = JSON.parse(await readFile(manifest, 'utf8'))
    if (metadata.version !== engine.version) throw new Error(`Expected ${engine.name}@${engine.version}; found ${metadata.version}.`)
    for (const name of engine.files) output.set(name.split('/').at(-1), await readFile(join(dirname(manifest), name)))
  }
  const licenses = join(packageRoot, 'licenses/xml-profiles')
  for (const name of await readdir(licenses)) output.set(`licenses/${name}`, await readFile(join(licenses, name)))
  const files = Object.fromEntries([...output].map(([name, bytes]) => [name, {
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')
  }]))
  output.set('manifest.json', Buffer.from(JSON.stringify({
    schema: 1, engines: engines.map(({ name, version }) => ({ name, version })), files
  }, null, 2) + '\n'))
  destination = resolve(destination)
  // Resolve every dependency before writing, and touch only the named XML assets.
  for (const [name, bytes] of output) {
    const filename = join(destination, name)
    await mkdir(dirname(filename), { recursive: true })
    await writeFile(filename, bytes)
  }
  return { destination, files }
}

let entryPoint = false
try { entryPoint = !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) } catch { /* Imported helper. */ }
if (entryPoint) {
  if (process.argv.includes('--help')) {
    console.log('Usage: file-viewer-xml-assets [destination-directory]\nDefault: public/file-viewer/xml\nRequires xmllint-wasm@5.3.0 and xslt-polyfill@1.0.31 installed by the host.')
  } else if (process.argv.length > 3 || process.argv[2]?.startsWith('-')) {
    console.error('Expected one destination directory.'); process.exitCode = 1
  } else {
    copyXmlProfileAssets(process.argv[2]).then(
      ({ destination }) => console.log(`XML profile assets copied to ${destination}`),
      error => { console.error(error.message); process.exitCode = 1 }
    )
  }
}
