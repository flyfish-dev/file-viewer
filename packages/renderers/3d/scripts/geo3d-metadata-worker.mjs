import { readFile } from 'node:fs/promises'
import { parentPort, workerData } from 'node:worker_threads'
import {
  disposeCityJsonGroup,
  parseCityJson,
  renderCityJsonDocument
} from '../dist/geo3dCityJson.js'
import { inspectGeoTiffBuffer } from '../dist/geo3dInspect.js'

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
