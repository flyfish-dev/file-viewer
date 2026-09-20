import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const exampleDir = join(sourceRoot, 'apps/viewer-demo/public/example')
const binaryFixtureDir = join(sourceRoot, 'packages/renderers/binary/fixtures')

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
await Promise.all([
  copyFile(join(binaryFixtureDir, 'large.bin'), join(exampleDir, 'binary-raw.bin')),
  copyFile(join(binaryFixtureDir, 'pe32.bin'), join(exampleDir, 'binary-pe.exe')),
  copyFile(join(binaryFixtureDir, 'pe32.bin'), join(exampleDir, 'binary-pe.dll')),
  ...generatedFixtures.map(([name, bytes]) => writeFile(join(exampleDir, name), bytes))
])

console.log(
  JSON.stringify(
    {
      status: 'staged',
      files: [
        'binary-raw.bin',
        'binary-pe.exe',
        'binary-pe.dll',
        ...generatedFixtures.map(([name]) => name)
      ]
    },
    null,
    2
  )
)
