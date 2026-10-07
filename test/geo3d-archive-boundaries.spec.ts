import { once } from 'node:events'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { prepare3tzDataset } from '../packages/renderers/3d/src/geo3dArchive'

const rendererRequire = createRequire(
  new URL('../packages/renderers/3d/package.json', import.meta.url)
)
const giroRoot = dirname(rendererRequire.resolve('@giro3d/giro3d/package.json'))
const nativeLoaderUrl = pathToFileURL(
  join(giroRoot, '../../3d-tiles-renderer/src/core/renderer/loaders/I3DMLoaderBase.js')
)

function externalI3dm(url: string) {
  const featureTable = new TextEncoder().encode('{"INSTANCES_LENGTH":0}')
  const modelUrl = new TextEncoder().encode(url)
  const bytes = new Uint8Array(32 + featureTable.length + modelUrl.length)
  const view = new DataView(bytes.buffer)
  bytes.set(new TextEncoder().encode('i3dm'))
  view.setUint32(4, 1, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, featureTable.length, true)
  view.setUint32(28, 0, true)
  bytes.set(featureTable, 32)
  bytes.set(modelUrl, 32 + featureTable.length)
  return bytes
}

async function archive(name: string, payload: Uint8Array) {
  const zip = new JSZip()
  zip.file(
    'tileset.json',
    JSON.stringify({
      asset: { version: '1.1' },
      geometricError: 0,
      root: { boundingVolume: { sphere: [0, 0, 0, 1] }, geometricError: 0, content: { uri: name } }
    })
  )
  zip.file(name, payload)
  return zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
}

describe('3TZ native resource boundaries', () => {
  it('prevents the real native I3DM loader from requesting an external embedded URL', async () => {
    const requests: string[] = []
    const server = createServer((request, response) => {
      requests.push(request.url || '')
      response.end(new Uint8Array([1, 2, 3, 4]))
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing loopback listener')
    const remoteUrl = `http://127.0.0.1:${address.port}/external-model.glb`
    let dataset: Awaited<ReturnType<typeof prepare3tzDataset>> | undefined
    try {
      try {
        dataset = await prepare3tzDataset(await archive('tile.i3dm', externalI3dm(remoteUrl)))
      } catch (error) {
        expect(String(error)).toMatch(/3TZ.*unsupported.*I3DM/i)
      }
      if (dataset) {
        const rootResponse = await dataset.fetchData(dataset.rootUrl)!
        const root = await rootResponse.json()
        const tileResponse = await dataset.fetchData(root.root.content.uri)!
        const { I3DMLoaderBase } = await import(nativeLoaderUrl.href)
        const loader = new I3DMLoaderBase()
        loader.workingPath = dataset.rootUrl
        await loader.parse(await tileResponse.arrayBuffer())
      }
      expect(requests).toEqual([])
    } finally {
      dataset?.dispose()
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it.each(['i3dm', 'b3dm', 'cmpt'])(
    'rejects unsupported %s content even when renamed to .bin',
    async (magic) => {
      const payload = externalI3dm('http://127.0.0.1/external-model.glb')
      payload.set(new TextEncoder().encode(magic))
      await expect(prepare3tzDataset(await archive('tile.bin', payload))).rejects.toThrow(
        /3TZ.*unsupported/i
      )
    }
  )

  it('rejects inline models before their nested resources reach native loaders', async () => {
    const zip = new JSZip()
    zip.file(
      'tileset.json',
      JSON.stringify({
        asset: { version: '1.1' },
        root: { content: { uri: 'data:model/gltf+json;base64,e30=' } }
      })
    )
    await expect(
      prepare3tzDataset(await zip.generateAsync({ type: 'uint8array' }))
    ).rejects.toThrow(/inline tile\/model resources are unsupported/)
  })

  it('keeps validated glTF inline buffers and owned local resources available', async () => {
    const zip = new JSZip()
    zip.file(
      'tileset.json',
      JSON.stringify({ asset: { version: '1.1' }, root: { content: { uri: 'model.gltf' } } })
    )
    zip.file(
      'model.gltf',
      JSON.stringify({
        asset: { version: '2.0' },
        buffers: [{ uri: 'data:application/octet-stream;base64,AQIDBA==', byteLength: 4 }],
        images: [{ uri: 'wall.png' }]
      })
    )
    zip.file('wall.png', new Uint8Array([137, 80, 78, 71]))
    const dataset = await prepare3tzDataset(await zip.generateAsync({ type: 'uint8array' }))
    const root = await (await dataset.fetchData(dataset.rootUrl)!).json()
    const model = await (await dataset.fetchData(root.root.content.uri)!).json()
    const imageUrl = model.images[0].uri
    try {
      expect(model.buffers[0].uri).toBe('data:application/octet-stream;base64,AQIDBA==')
      expect(imageUrl).toMatch(/^blob:/)
      expect(new Uint8Array(await (await fetch(imageUrl)).arrayBuffer())).toEqual(
        new Uint8Array([137, 80, 78, 71])
      )
    } finally {
      dataset.dispose()
    }
    await expect(dataset.fetchData(dataset.rootUrl)).rejects.toThrow(/disposed/)
    await expect(fetch(imageUrl)).rejects.toThrow()
  })
})
