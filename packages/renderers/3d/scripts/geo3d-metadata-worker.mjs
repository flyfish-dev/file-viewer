import { readFile } from 'node:fs/promises'
import { parentPort, workerData } from 'node:worker_threads'
import JSZip from 'jszip'
import {
  disposeCityJsonGroup,
  parseCityJson,
  renderCityJsonDocument
} from '../dist/geo3dCityJson.js'
import { inspectGeoTiffBuffer } from '../dist/geo3dInspect.js'
import { prepare3tzDataset } from '../dist/geo3dArchive.js'

function asciiTiff(field) {
  const bytes = new Uint8Array(44 + field.length)
  const view = new DataView(bytes.buffer)
  bytes.set([73, 73, 42, 0, 8, 0, 0, 0])
  view.setUint16(8, 2, true)
  view.setUint16(10, 256, true)
  view.setUint16(12, 4, true)
  view.setUint32(14, 1, true)
  view.setUint32(18, 1, true)
  view.setUint16(22, 34737, true)
  view.setUint16(24, 2, true)
  view.setUint32(26, field.length, true)
  view.setUint32(30, 44, true)
  bytes.set(field, 44)
  return bytes.buffer
}

const sample = JSON.parse(
  await readFile(
    new URL('../test/fixtures/geo3d/upstream/cityjson-cjio-cube.json', import.meta.url),
    'utf8'
  )
)
parentPort.postMessage({ phase: 'ready' })
try {
  const results = []
  if (workerData.kind === 'cityjson') {
    for (const referenceSystem of workerData.values) {
      const document = parseCityJson(JSON.stringify({ ...sample, metadata: { referenceSystem } }))
      const rendered = renderCityJsonDocument(document)
      results.push({ crs: rendered.crs, triangles: rendered.triangleCount })
      disposeCityJsonGroup(rendered.group)
    }
  } else if (workerData.kind === 'glb') {
    for (const padding of [65536, 131072, 262144]) {
      // Leading JSON whitespace is legal. A trailing-padding regexp must not
      // repeatedly scan it while searching for a suffix that ends in `}`.
      const json = new TextEncoder().encode(
        ' '.repeat(padding) +
          JSON.stringify({
            asset: { version: '2.0' },
            scene: 0,
            scenes: [{ nodes: [] }],
            nodes: []
          })
      )
      const length = Math.ceil(json.length / 4) * 4
      const glb = new Uint8Array(20 + length).fill(32)
      const view = new DataView(glb.buffer)
      view.setUint32(0, 0x46546c67, true)
      view.setUint32(4, 2, true)
      view.setUint32(8, glb.length, true)
      view.setUint32(12, length, true)
      view.setUint32(16, 0x4e4f534a, true)
      glb.set(json, 20)
      const zip = new JSZip()
      zip.file(
        'tileset.json',
        JSON.stringify({
          asset: { version: '1.1' },
          root: { content: { uri: 'model.glb' } }
        })
      )
      zip.file('model.glb', glb)
      const dataset = await prepare3tzDataset(
        await zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
      )
      try {
        const root = await (await dataset.fetchData(dataset.rootUrl)).json()
        const payload = new Uint8Array(
          await (await dataset.fetchData(root.root.content.uri)).arrayBuffer()
        )
        const jsonLength = new DataView(payload.buffer).getUint32(12, true)
        const model = JSON.parse(new TextDecoder().decode(payload.subarray(20, 20 + jsonLength)))
        results.push({ padding, version: model.asset.version, scene: model.scene })
      } finally {
        dataset.dispose()
      }
    }
  } else {
    const field = new Uint8Array(65536)
    field[field.length - 1] = 65
    // Repeated real probes distinguish a linear scan from engine speed or JIT
    // variation, while each TIFF field remains within the production limit.
    for (let i = 0; i < 4; i++) results.push(await inspectGeoTiffBuffer(asciiTiff(field)))
    results.push(await inspectGeoTiffBuffer(asciiTiff(new TextEncoder().encode(' WGS 84\0\0\0'))))
  }
  parentPort.postMessage({ phase: 'done', results })
} catch (error) {
  parentPort.postMessage({ phase: 'failed', message: String(error) })
}
