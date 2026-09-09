import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function verifyDcmjsZipBoundary(manifest, sources, consumers) {
  assert.equal(manifest.version, '0.52.0', 'Re-audit the adm-zip exception when dcmjs changes')
  assert.deepEqual(
    consumers,
    ['dcmjs@0.52.0'],
    'The exception covers only the unused dcmjs dependency'
  )
  assert.equal(sources.length, 3, 'Check both DICOM runtime entries and the dictionary export')
  for (const source of sources) {
    assert.doesNotMatch(
      source,
      /adm-zip|extractAllTo|extractEntryTo/,
      'DICOM exports must not call the vulnerable filesystem extractor'
    )
  }
}

export function verifyDependencyExceptions(root) {
  const dicomRequire = createRequire(join(root, 'packages/renderers/dicom/package.json'))
  const coreRequire = createRequire(dicomRequire.resolve('@cornerstonejs/core'))
  const packageRoot = resolve(dirname(coreRequire.resolve('dcmjs')), '..')
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.main, 'build/dcmjs.js')
  assert.equal(manifest.module, 'build/dcmjs.es.js')
  assert.deepEqual(
    manifest.exports,
    {
      '.': { import: './build/dcmjs.es.js', require: './build/dcmjs.js' },
      './dictionary': './generate/dictionary.mjs'
    },
    'New package entrypoints need a fresh dependency exception review'
  )
  const sources = [manifest.main, manifest.module, 'generate/dictionary.mjs'].map((file) =>
    readFileSync(join(packageRoot, file), 'utf8')
  )
  const consumers = new Set()
  let parent = ''
  for (const line of readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8').split('\n')) {
    const match = line.match(/^  ([^ ].*):$/)
    if (match) parent = match[1].replace(/^['"]|['"]$/g, '')
    if (/^      adm-zip:/.test(line)) consumers.add(parent)
  }
  verifyDcmjsZipBoundary(manifest, sources, [...consumers].sort())
  console.log(
    'Verified adm-zip is unused by the pinned dcmjs exports; no other consumers are exempt.'
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyDependencyExceptions(resolve(dirname(fileURLToPath(import.meta.url)), '../..'))
}
