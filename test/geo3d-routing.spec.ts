import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  createRendererRegistry,
  installFileViewerRendererPlugins,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerRendererDefinition,
} from '../packages/core/src'
import {
  createGeo3dRenderer,
  inspectGeoTiffBuffer,
  isCityJsonBuffer,
  isCopcLasBuffer,
  resolveGeo3dSourceType,
} from '../packages/renderers/3d/src/geo3d'
import {
  inspect3tzCentralDirectory,
} from '../packages/renderers/3d/src/geo3dArchive'
import {
  disposeCityJsonGroup,
  parseCityJson,
  renderCityJsonDocument,
} from '../packages/renderers/3d/src/geo3dCityJson'

const fixture = async (name: string) => {
  const bytes = await readFile(
    new URL(
      `../packages/renderers/3d/test/fixtures/geo3d/${name}`,
      import.meta.url
    )
  )
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )
}

describe('optional Geo3D routing', () => {
  it('claims specialist names/extensions and preserves ordinary JSON/TIFF ownership', async () => {
    const registry = createRendererRegistry()
    await installFileViewerRendererPlugins({
      registry,
      plugins: [createGeo3dRenderer()],
    })

    expect(resolveFileViewerRendererDefinition(registry, {
      filename: 'tileset.json',
      extension: 'json',
    })?.id).toBe('geo3d')
    expect(resolveFileViewerRendererDefinition(registry, {
      filename: 'notes.json',
      extension: 'json',
    })?.id).toBe('code')
    expect(resolveFileViewerRendererDefinition(registry, {
      filename: 'district.copc.laz',
      extension: 'laz',
    })?.id).toBe('geo3d')
    expect(registry.getByExtension('las')?.id).toBe('geo3d')
    expect(registry.getByExtension('laz')?.id).toBe('geo3d')
    expect(registry.getByExtension('cityjson')?.id).toBe('geo3d')
    expect(registry.getByExtension('3tz')?.id).toBe('geo3d')
    expect(registry.getByExtension('tif')?.id).toBe('image')
    expect(registry.getByExtension('tiff')?.id).toBe('image')
  })

  it('distinguishes ordinary TIFF, GeoTIFF and COG from actual fixture bytes', async () => {
    const regular = await fixture('regular.tif')
    const geotiff = await fixture('geotiff-noncog.tif')
    const cog = await fixture('sample-cog.tif')

    expect(await resolveGeo3dSourceType({
      filename: 'regular.tif',
      extension: 'tif',
      buffer: regular,
    })).toBe(false)
    expect(await resolveGeo3dSourceType({
      filename: 'geotiff-noncog.tif',
      extension: 'tif',
      buffer: geotiff,
    })).toBe('geotiff')
    expect(await resolveGeo3dSourceType({
      filename: 'sample-cog.tif',
      extension: 'tif',
      buffer: cog,
    })).toBe('cog')

    const metadata = await inspectGeoTiffBuffer(geotiff)
    expect(metadata).toMatchObject({
      type: 'geotiff',
      isCog: false,
      crs: 'EPSG:4326',
      width: 32,
      height: 32,
      bands: 1,
    })
    expect(metadata?.bbox).toEqual([
      12,
      45.68,
      12.32,
      46,
    ])

    const cogMetadata = await inspectGeoTiffBuffer(cog)
    expect(cogMetadata?.isCog).toBe(true)
    expect(cogMetadata?.tiled).toBe(true)
  })

  it('accepts the MIT upstream CityJSON cube fixture', async () => {
    const upstream = await fixture('upstream/cityjson-cjio-cube.json')
    expect(isCityJsonBuffer(upstream)).toBe(true)
    expect(await resolveGeo3dSourceType({
      filename: 'cube.city.json',
      extension: 'json',
      buffer: upstream,
    })).toBe('cityjson')

    const document = parseCityJson(
      new TextDecoder().decode(new Uint8Array(upstream))
    )
    const rendered = renderCityJsonDocument(document)
    expect(rendered.objectCount).toBe(1)
    expect(rendered.triangleCount).toBeGreaterThan(0)
    disposeCityJsonGroup(rendered.group)
  })

  it('recognizes generated LAS/COPC, CityJSON and 3D Tiles fixtures', async () => {
    const copc = await fixture('probe.copc.laz')
    const city = await fixture('building.city.json')
    const tiles = await fixture('tiles3d/tileset.json')

    expect(isCopcLasBuffer(copc)).toBe(true)
    expect(isCityJsonBuffer(city)).toBe(true)
    expect(await resolveGeo3dSourceType({
      filename: 'building.city.json',
      extension: 'json',
      buffer: city,
    })).toBe('cityjson')
    expect(await resolveGeo3dSourceType({
      filename: 'tileset.json',
      extension: 'json',
      buffer: tiles,
    })).toBe('3dtiles')

    const cityText = new TextDecoder().decode(new Uint8Array(city))
    const renderedCity = renderCityJsonDocument(
      parseCityJson(cityText),
      reference => new URL(
        reference,
        'https://example.test/datasets/building.city.json'
      ).href
    )
    expect(renderedCity.externalResources).toEqual([
      {
        source: 'textures/wall.png',
        url: 'https://example.test/datasets/textures/wall.png',
      },
    ])
    disposeCityJsonGroup(renderedCity.group)
  })

  it('validates 3TZ structure and rejects traversal, duplicates and size/count abuse', async () => {
    const valid = new Uint8Array(await fixture('sample.3tz'))
    const traversal = new Uint8Array(await fixture('invalid-traversal.3tz'))
    const duplicate = new Uint8Array(await fixture('duplicate.3tz'))

    const inspected = inspect3tzCentralDirectory(valid)
    expect(inspected.entries.map(entry => entry.name)).toContain('tileset.json')

    expect(() => inspect3tzCentralDirectory(traversal))
      .toThrow(/traversal/i)
    expect(() => inspect3tzCentralDirectory(duplicate))
      .toThrow(/duplicate/i)
    expect(() => inspect3tzCentralDirectory(valid, { maxEntries: 0 }))
      .toThrow(/maxEntries/)
    expect(() => inspect3tzCentralDirectory(valid, { maxExpandedBytes: 1 }))
      .toThrow(/expanded size/)
    expect(() => inspect3tzCentralDirectory(valid, { maxEntryBytes: 1 }))
      .toThrow(/maxEntryBytes/)
  })

  it('detects CityJSON MIME and bounded JSON content signatures', async () => {
    const city = await fixture('building.city.json')
    expect(await resolveGeo3dSourceType({
      filename: 'download',
      extension: '',
      buffer: city,
      mimeType: 'application/city+json',
    })).toBe('cityjson')
    expect(await resolveGeo3dSourceType({
      filename: 'model.json',
      extension: 'json',
      buffer: city,
    })).toBe('cityjson')

    const tiles = await fixture('tiles3d/tileset.json')
    expect(await resolveGeo3dSourceType({
      filename: 'scene.json',
      extension: 'json',
      buffer: tiles,
    })).toBe('3dtiles')
  })

  it('honors explicit format query hints from the issue contract', async () => {
    expect(await resolveGeo3dSourceType({
      filename: 'download.bin',
      extension: 'bin',
      url: 'https://datasets.example.test/download.bin?format=geotiff',
    })).toBe('geotiff')
    expect(await resolveGeo3dSourceType({
      filename: 'download.bin',
      extension: 'bin',
      url: 'https://datasets.example.test/download.bin?format=cog',
    })).toBe('cog')
    expect(await resolveGeo3dSourceType({
      filename: 'download.bin',
      extension: 'bin',
      url: 'https://datasets.example.test/download.bin?format=3tz',
    })).toBe('3tz')
  })

  it('marks specialist remote URLs for streaming without changing PDF semantics', () => {
    const las = resolveFileViewerRemoteSourcePlan({
      url: 'https://datasets.example.test/cloud.las',
      pageHref: 'https://viewer.example.test/',
      shouldStreamRemoteUrl: ({ extension }) => extension === 'las',
    })
    expect(las.streamPdf).toBe(false)
    expect(las.streamRenderer).toBe(true)

    const copc = resolveFileViewerRemoteSourcePlan({
      url: 'https://datasets.example.test/cloud.laz',
      pageHref: 'https://viewer.example.test/',
      shouldStreamRemoteUrl: ({ extension }) => extension === 'laz',
    })
    expect(copc.streamPdf).toBe(false)
    expect(copc.streamRenderer).toBe(true)

    const tiles = resolveFileViewerRemoteSourcePlan({
      url: 'https://datasets.example.test/city/tileset.json',
      pageHref: 'https://viewer.example.test/',
      shouldStreamRemoteUrl: ({ filename }) => filename === 'tileset.json',
    })
    expect(tiles.streamPdf).toBe(false)
    expect(tiles.streamRenderer).toBe(true)

    const ordinaryJson = resolveFileViewerRemoteSourcePlan({
      url: 'https://datasets.example.test/notes.json',
      pageHref: 'https://viewer.example.test/',
      shouldStreamRemoteUrl: () => false,
    })
    expect(ordinaryJson.streamRenderer).toBe(false)

    const pdf = resolveFileViewerRemoteSourcePlan({
      url: 'https://viewer.example.test/report.pdf',
      pageHref: 'https://viewer.example.test/',
      streaming: 'same-origin',
      shouldStreamRemoteUrl: () => true,
    })
    expect(pdf.streamPdf).toBe(true)
    expect(pdf.streamRenderer).toBe(false)
  })
})
