import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  createGeo3dProbeRangeGetter,
  inspectGeo3dDataset,
  inspectGeoTiffBuffer,
  isCityJsonBuffer,
  isCopcLasBuffer,
  isCopcRangeSource,
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

const fixtureUrl = (name: string) =>
  new URL(
    `../packages/renderers/3d/test/fixtures/geo3d/${name}`,
    import.meta.url
  )

const fixture = async (name: string) => {
  const bytes = await readFile(fixtureUrl(name))
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )
}

describe('Geo3D format fixtures', () => {
  it('keeps ordinary TIFF on the image path and detects GeoTIFF/COG structurally', async () => {
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

    const geo = await inspectGeoTiffBuffer(geotiff)
    expect(geo?.crs).toBe('EPSG:4326')
    expect(geo?.isCog).toBe(false)
    expect(geo?.bbox).toEqual([
      12,
      45.68,
      12.32,
      46,
    ])

    const optimized = await inspectGeoTiffBuffer(cog)
    expect(optimized?.crs).toBe('EPSG:32632')
    expect(optimized?.isCog).toBe(true)
    expect(optimized?.tiled).toBe(true)
  })

  it('parses and triangulates the generated CityJSON solid', async () => {
    const buffer = await fixture('sample.city.json')
    expect(isCityJsonBuffer(buffer)).toBe(true)

    const text = new TextDecoder().decode(buffer)
    const document = parseCityJson(text)
    const rendered = renderCityJsonDocument(document)

    expect(rendered.crs).toBe('EPSG:4978')
    expect(rendered.objectCount).toBe(1)
    expect(rendered.triangleCount).toBeGreaterThan(0)
    expect(rendered.group.children.length).toBe(1)

    disposeCityJsonGroup(rendered.group)
  })

  it('preserves CityJSON external resource URLs', async () => {
    const buffer = await fixture('building.city.json')
    const document = parseCityJson(new TextDecoder().decode(buffer))
    const rendered = renderCityJsonDocument(
      document,
      reference => new URL(
        reference,
        'https://datasets.example.test/city/building.city.json'
      ).href
    )

    expect(rendered.externalResources).toEqual([
      {
        source: 'textures/wall.png',
        url: 'https://datasets.example.test/city/textures/wall.png',
      },
    ])

    disposeCityJsonGroup(rendered.group)
  })

  it('uses HTTP byte ranges for remote metadata probes', async () => {
    const originalFetch = globalThis.fetch
    const calls: Array<{ url: string; range: string | null }> = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      calls.push({
        url: String(input),
        range: headers.get('Range'),
      })
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 206,
        headers: {
          'Content-Range': 'bytes 10-13/100',
          'Accept-Ranges': 'bytes',
        },
      })
    }) as typeof fetch

    try {
      const getter = createGeo3dProbeRangeGetter({
        url: 'https://datasets.example.test/sample.tif',
      })
      await expect(getter(10, 14)).resolves.toEqual(
        new Uint8Array([1, 2, 3, 4])
      )
      expect(calls).toEqual([{
        url: 'https://datasets.example.test/sample.tif',
        range: 'bytes=10-13',
      }])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('recognizes the generated LAS fixture without misclassifying it as COPC', async () => {
    const las = await fixture('sample.las')
    expect(isCopcLasBuffer(las)).toBe(false)
    expect(inspectGeo3dDataset({
      filename: 'sample.las',
      buffer: las,
    })?.format).toBe('las')
  })

  it('recognizes the bounded COPC VLR fixture', async () => {
    const bytes = new Uint8Array(
      await fixture('probe.copc.laz')
    )
    await expect(
      isCopcRangeSource(async (begin, end) =>
        bytes.slice(begin, end)
      )
    ).resolves.toBe(true)
  })

  it('accepts safe 3TZ and rejects traversal and duplicate paths before extraction', async () => {
    const valid = new Uint8Array(
      await fixture('sample.3tz')
    )
    const traversal = new Uint8Array(
      await fixture('invalid-traversal.3tz')
    )
    const duplicate = new Uint8Array(
      await fixture('duplicate.3tz')
    )

    expect(
      inspect3tzCentralDirectory(valid)
        .entries.map(entry => entry.name)
    ).toContain('tileset.json')

    expect(() =>
      inspect3tzCentralDirectory(traversal)
    ).toThrow(/traversal/i)

    expect(() =>
      inspect3tzCentralDirectory(duplicate)
    ).toThrow(/duplicate/i)
  })

  it('recognizes generated multi-file 3D Tiles metadata', async () => {
    const tileset = await fixture(
      'tiles3d/tileset.json'
    )
    await expect(resolveGeo3dSourceType({
      filename: 'tileset.json',
      extension: 'json',
      buffer: tileset,
    })).resolves.toBe('3dtiles')
  })
})
