import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const appRoot = resolve(import.meta.dirname, '..')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(await readFile(resolve(appRoot, 'src/data/demoSamplePreviews.json'), 'utf8'))
const seen = new Set()
for (const preview of manifest.previews) {
  assert(/^\.\/sample-previews\/[a-z-]+\.png$/.test(preview.path), 'Unexpected preview path')
  const image = await readFile(resolve(appRoot, `public/${preview.path}`))
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Preview must be a PNG')
  assert.equal(hash(image), preview.imageSha256, `Preview bytes changed: ${preview.id}`)
  assert.equal(image.readUInt32BE(16), preview.width)
  assert.equal(image.readUInt32BE(20), preview.height)
  assert(preview.width >= 500 && preview.height >= 300, 'Preview must have real card resolution')
  for (const source of preview.sources) {
    assert(/^\/example\/[a-zA-Z0-9._/-]+$/.test(source) && !source.includes('..'), 'Unexpected sample path')
    assert(!seen.has(source), `Duplicate sample preview: ${source}`)
    seen.add(source)
    const bytes = await readFile(resolve(appRoot, `public${source}`))
    assert.equal(hash(bytes), preview.sourceSha256, `Source changed; regenerate its preview: ${source}`)
    assert.equal(bytes.length, preview.sourceBytes)
  }
}
for (const required of ['/example/en/quarterly-operations-report.docx', '/example/sample.dwg', '/example/ppt.pptx', '/example/en/sample-presentation.pptx',
  '/example/excel.xlsx', '/example/en/financial-sample.xlsx', '/example/fox.glb']) {
  assert(seen.has(required), `Featured sample is missing a preview: ${required}`)
}
const provenance = JSON.parse(await readFile(resolve(appRoot, 'public/example/licenses/fox/source.json'), 'utf8'))
for (const file of provenance.files) {
  assert(file.file === 'fox.glb' || /^licenses\/fox\/[A-Za-z0-9._-]+$/.test(file.file))
  assert.equal(hash(await readFile(resolve(appRoot, 'public/example', file.file))), file.sha256,
    `Upstream model or license bytes changed: ${file.file}`)
}
const notice = await readFile(resolve(appRoot, 'public/example/licenses/fox/NOTICE.txt'), 'utf8')
for (const name of ['PixelMannen', 'tomkranis', 'AsoboStudio', 'scurest', 'CC0-1.0', 'CC-BY-4.0']) {
  assert(notice.includes(name), `Missing model attribution: ${name}`)
}
console.log(`[sample-previews] ${manifest.previews.length} real images bind ${seen.size} sample paths; Fox and original license bytes verified.`)
