import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lasWithCitation } from '../../../packages/renderers/3d/test/fixtures/las-citation.mjs'

const sourceRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const exampleDir = join(sourceRoot, 'apps/viewer-demo/public/example')
const xmlProfileDir = join(sourceRoot, 'apps/viewer-demo/public/xml-profiles')
const binaryFixtureDir = join(sourceRoot, 'packages/renderers/binary/fixtures')
const xmlFixtureDir = join(sourceRoot, 'packages/renderers/text/test/fixtures/issue-305')
const xmlSamples = ['invoice-valid.xml', 'invoice-invalid.xml']
const xmlResources = ['profiles.json', 'invoice.xsd', 'invoice.xsl']

const makePng = () => {
  const bytes = new Uint8Array(33)
  bytes.set(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52],
    0
  )
  const view = new DataView(bytes.buffer)
  view.setUint32(16, 640, false)
  view.setUint32(20, 480, false)
  bytes[24] = 8
  bytes[25] = 6
  return bytes
}

const makeWasm = () => new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0])

const makeElf = () => {
  const bytes = new Uint8Array(64)
  bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1], 0)
  const view = new DataView(bytes.buffer)
  view.setUint16(16, 2, true)
  view.setUint16(18, 0x3e, true)
  view.setBigUint64(24, 0x401000n, true)
  return bytes
}

const makeMachO = () => {
  const bytes = new Uint8Array(32)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0xfeedfacf, false)
  view.setUint32(4, 0x01000007, false)
  view.setUint32(12, 2, false)
  view.setUint32(16, 4, false)
  return bytes
}

const makeZip = () => {
  const bytes = new Uint8Array(30)
  const view = new DataView(bytes.buffer)
  bytes.set([0x50, 0x4b, 3, 4], 0)
  view.setUint16(4, 20, true)
  view.setUint16(8, 8, true)
  view.setUint32(18, 12, true)
  view.setUint16(26, 4, true)
  return bytes
}

const makeClass = () => new Uint8Array([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 0x3d, 0, 2])

const generatedFixtures = [
  ['binary-png-signature.hex', makePng()],
  ['binary-wasm-signature.hex', makeWasm()],
  ['binary-elf.elf', makeElf()],
  ['binary-macho.macho', makeMachO()],
  ['binary-zip-signature.hex', makeZip()],
  ['binary-java.class', makeClass()]
]

await mkdir(exampleDir, { recursive: true })
await mkdir(join(exampleDir, 'xml-profiles'), { recursive: true })
await mkdir(xmlProfileDir, { recursive: true })
await Promise.all([
  copyFile(
    join(sourceRoot, 'packages/renderers/drawing/test/fixtures/simple-process.bpmn'),
    join(exampleDir, 'simple-process.bpmn')
  ),
  ...xmlSamples.map((name) =>
    copyFile(join(xmlFixtureDir, name), join(exampleDir, 'xml-profiles', name))
  ),
  ...xmlResources.map((name) => copyFile(join(xmlFixtureDir, name), join(xmlProfileDir, name))),
  copyFile(join(binaryFixtureDir, 'large.bin'), join(exampleDir, 'binary-raw.bin')),
  copyFile(join(binaryFixtureDir, 'pe32.bin'), join(exampleDir, 'binary-pe.exe')),
  copyFile(join(binaryFixtureDir, 'pe32.bin'), join(exampleDir, 'binary-pe.dll')),
  writeFile(join(exampleDir, 'point-cloud-citation.las'), lasWithCitation(
    await readFile(join(sourceRoot, 'packages/renderers/3d/test/fixtures/github-406-crs-geokeys-only.las')),
    'WGS84, WGS84, ETRS89 / Poland CS2000 zone 6'
  )),
  ...generatedFixtures.map(([name, bytes]) => writeFile(join(exampleDir, name), bytes))
])

console.log(
  JSON.stringify(
    {
      status: 'staged',
      files: [
        'example/simple-process.bpmn',
        ...xmlSamples.map((name) => `example/xml-profiles/${name}`),
        ...xmlResources.map((name) => `xml-profiles/${name}`),
        'example/binary-raw.bin',
        'example/binary-pe.exe',
        'example/binary-pe.dll',
        'example/point-cloud-citation.las',
        ...generatedFixtures.map(([name]) => `example/${name}`)
      ]
    },
    null,
    2
  )
)
