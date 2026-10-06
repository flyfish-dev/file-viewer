import {
  BufferGeometry,
  ClampToEdgeWrapping,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MirroredRepeatWrapping,
  RepeatWrapping,
  ShapeUtils,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3
} from 'three'
import { checkAbort, readBoundedResponse } from './geo3dRange.js'

export interface CityJsonDocument {
  type: 'CityJSON'
  version?: string
  transform?: { scale?: [number, number, number]; translate?: [number, number, number] }
  metadata?: { referenceSystem?: string; [key: string]: unknown }
  appearance?: {
    textures?: Array<{ image?: string; type?: string; wrapMode?: string; [key: string]: unknown }>
    'vertices-texture'?: number[][]
    'default-theme-texture'?: string
    [key: string]: unknown
  }
  CityObjects: Record<
    string,
    {
      geometry?: Array<{
        type?: string
        boundaries?: unknown
        texture?: Record<string, { values?: unknown }>
      }>
    }
  >
  vertices: number[][]
}
export interface CityJsonExternalResource {
  source: string
  url: string
}
interface TextureBinding {
  material: MeshBasicMaterial
  resource: CityJsonExternalResource
  wrapMode: string
}
export interface CityJsonRenderResult {
  group: Group
  crs?: string
  triangleCount: number
  objectCount: number
  externalResources: CityJsonExternalResource[]
  textureBindings: TextureBinding[]
}
export interface CityJsonRenderOptions {
  materialColor?: number | string
  textureTheme?: string
}
const MAX_TEXTURES = 64
const MAX_TEXTURE_BYTES = 16 * 1024 * 1024
const MAX_TOTAL_TEXTURE_BYTES = 64 * 1024 * 1024
const MAX_TEXTURE_PIXELS = 16 * 1024 * 1024
const MAX_TOTAL_TEXTURE_PIXELS = 32 * 1024 * 1024
const textureDisposers = new WeakMap<Group, () => void>()
const disposedGroups = new WeakSet<Group>()

const isRing = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length >= 3 && value.every(Number.isInteger)
const isSurface = (value: unknown): value is number[][] =>
  Array.isArray(value) && value.length > 0 && value.every(isRing)

function collectSurfaces(
  boundaries: unknown,
  textures: unknown,
  output: Array<{ rings: number[][]; texture: unknown }>,
  depth = 0
): void {
  if (depth > 16) throw new Error('CityJSON geometry nesting exceeds its limit.')
  if (isSurface(boundaries)) {
    if (output.length >= 100000) throw new Error('CityJSON surface limit exceeded.')
    output.push({ rings: boundaries, texture: textures })
  } else if (Array.isArray(boundaries)) {
    boundaries.forEach((child, index) =>
      collectSurfaces(
        child,
        Array.isArray(textures) ? textures[index] : undefined,
        output,
        depth + 1
      )
    )
  }
}
function projection(ring: readonly Vector3[]): 'x' | 'y' | 'z' {
  let x = 0,
    y = 0,
    z = 0
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]
    x += (p.y - q.y) * (p.z + q.z)
    y += (p.z - q.z) * (p.x + q.x)
    z += (p.x - q.x) * (p.y + q.y)
  })
  if (Math.abs(x) >= Math.abs(y) && Math.abs(x) >= Math.abs(z)) return 'x'
  return Math.abs(y) >= Math.abs(z) ? 'y' : 'z'
}
const project = (v: Vector3, axis: 'x' | 'y' | 'z') =>
  axis === 'x'
    ? new Vector2(v.y, v.z)
    : axis === 'y'
      ? new Vector2(v.x, v.z)
      : new Vector2(v.x, v.y)
const parseEpsg = (value?: string) => {
  if (!value) return undefined
  const standard = /EPSG(?::|::|\/0\/|\/)(\d+)/i.exec(value)
  if (standard) return `EPSG:${standard[1]}`
  // Search the marker and its following code separately. An unanchored greedy
  // fallback repeatedly scans the suffix when metadata contains many markers.
  const marker = /epsg/i.exec(value)
  const code = marker && /\d+/.exec(value.slice(marker.index + marker[0].length))
  return code ? `EPSG:${code[0]}` : undefined
}
export function parseCityJson(text: string): CityJsonDocument {
  const value = JSON.parse(text) as Partial<CityJsonDocument> | null
  if (
    !value ||
    value.type !== 'CityJSON' ||
    !value.CityObjects ||
    typeof value.CityObjects !== 'object' ||
    Array.isArray(value.CityObjects) ||
    !Array.isArray(value.vertices)
  ) {
    throw new Error('Invalid CityJSON document.')
  }
  return value as CityJsonDocument
}

export function renderCityJsonDocument(
  document: CityJsonDocument,
  resolveRelativeUrl: (reference: string) => string = (value) => value,
  options: CityJsonRenderOptions = {}
): CityJsonRenderResult {
  const scale = document.transform?.scale || [1, 1, 1]
  const translate = document.transform?.translate || [0, 0, 0]
  if (
    scale.length !== 3 ||
    translate.length !== 3 ||
    ![...scale, ...translate].every(Number.isFinite)
  ) {
    throw new Error('Invalid CityJSON transform.')
  }
  if (document.vertices.length > 2000000) throw new Error('CityJSON vertex limit exceeded.')
  const vertices = document.vertices.map((v) => {
    if (!Array.isArray(v) || v.length < 3 || !v.slice(0, 3).every(Number.isFinite))
      throw new Error('Invalid CityJSON vertex.')
    return new Vector3(
      v[0] * scale[0] + translate[0],
      v[1] * scale[1] + translate[1],
      v[2] * scale[2] + translate[2]
    )
  })
  // Retain world placement in the Object3D transform, not in Float32 vertices.
  const origin = vertices[0]?.clone() || new Vector3()
  const buckets = new Map<number, { positions: number[]; uv: number[] }>()
  let triangleCount = 0,
    objectCount = 0
  for (const city of Object.values(document.CityObjects)) {
    let contributed = false
    for (const geometry of city.geometry || []) {
      const themes = geometry.texture || {}
      const theme =
        options.textureTheme ||
        document.appearance?.['default-theme-texture'] ||
        Object.keys(themes)[0] ||
        ''
      if (options.textureTheme && Object.keys(themes).length && !themes[theme])
        throw new Error(`CityJSON texture theme not found: ${theme}`)
      const surfaces: Array<{ rings: number[][]; texture: unknown }> = []
      collectSurfaces(geometry.boundaries, themes[theme]?.values, surfaces)
      for (const surface of surfaces) {
        const mapping = Array.isArray(surface.texture) ? surface.texture : []
        const first = Array.isArray(mapping[0]) ? mapping[0][0] : null
        const textureId = first === null || first === undefined ? -1 : first
        if (
          !Number.isInteger(textureId) ||
          textureId < -1 ||
          (textureId >= 0 && !document.appearance?.textures?.[textureId])
        )
          throw new Error('Invalid CityJSON texture index.')
        const vectors: Vector3[][] = [],
          texcoords: Vector2[][] = []
        surface.rings.forEach((indices, ringIndex) => {
          const mapped = mapping[ringIndex]
          if (
            textureId >= 0 &&
            (!Array.isArray(mapped) ||
              mapped[0] !== textureId ||
              mapped.length !== indices.length + 1)
          ) {
            throw new Error('CityJSON texture ring does not match its geometry.')
          }
          const ring = indices.map((index) => {
            if (index < 0 || !vertices[index]) throw new Error('Invalid CityJSON vertex index.')
            return vertices[index]
          })
          const uv =
            textureId < 0
              ? []
              : indices.map((_, i) => {
                  const index = mapped[i + 1]
                  const value = document.appearance?.['vertices-texture']?.[index]
                  if (
                    !Number.isInteger(index) ||
                    index < 0 ||
                    !value ||
                    value.length !== 2 ||
                    !value.every(Number.isFinite)
                  ) {
                    throw new Error('Invalid CityJSON texture coordinate.')
                  }
                  return new Vector2(value[0], value[1])
                })
          if (ring.length > 3 && ring[0].equals(ring[ring.length - 1])) {
            ring.pop()
            uv.pop()
          }
          vectors.push(ring)
          texcoords.push(uv)
        })
        const axis = projection(vectors[0]),
          flat = vectors.flat(),
          flatUv = texcoords.flat()
        const triangles = ShapeUtils.triangulateShape(
          vectors[0].map((v) => project(v, axis)),
          vectors.slice(1).map((ring) => ring.map((v) => project(v, axis)))
        )
        let bucket = buckets.get(textureId)
        if (!bucket) {
          bucket = { positions: [], uv: [] }
          buckets.set(textureId, bucket)
        }
        for (const triangle of triangles) {
          if (++triangleCount > 2000000) throw new Error('CityJSON triangle limit exceeded.')
          for (const index of triangle) {
            const v = flat[index]
            bucket.positions.push(v.x - origin.x, v.y - origin.y, v.z - origin.z)
            if (textureId >= 0) bucket.uv.push(flatUv[index].x, flatUv[index].y)
          }
          contributed = true
        }
      }
    }
    if (contributed) objectCount++
  }
  if (!triangleCount) throw new Error('CityJSON contains no renderable surface geometry.')
  if (buckets.size > MAX_TEXTURES + 1) throw new Error('CityJSON texture count exceeds its limit.')
  const group = new Group(),
    textureBindings: TextureBinding[] = []
  group.name = 'file-viewer-cityjson-root'
  group.position.copy(origin)
  try {
    for (const [index, bucket] of buckets) {
      if (!bucket.positions.length) continue
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(bucket.positions, 3))
      if (index >= 0) geometry.setAttribute('uv', new Float32BufferAttribute(bucket.uv, 2))
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      const material = new MeshBasicMaterial({
        color: index < 0 ? (options.materialColor ?? 0xb8c4d2) : 0xffffff,
        side: DoubleSide
      })
      const mesh = new Mesh(geometry, material)
      mesh.name = 'file-viewer-cityjson'
      group.add(mesh)
      if (index >= 0) {
        const definition = document.appearance!.textures![index]
        if (typeof definition.image !== 'string' || !definition.image)
          throw new Error('CityJSON texture image is missing.')
        const wrapMode = definition.wrapMode || 'none'
        if (!['none', 'wrap', 'mirror', 'clamp'].includes(wrapMode))
          throw new Error(`Unsupported CityJSON texture wrap mode: ${wrapMode}`)
        textureBindings.push({
          material,
          resource: { source: definition.image, url: resolveRelativeUrl(definition.image) },
          wrapMode
        })
      }
    }
  } catch (error) {
    disposeCityJsonGroup(group)
    throw error
  }
  const externalResources = (document.appearance?.textures || [])
    .map((t) => t.image)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((source) => ({ source, url: resolveRelativeUrl(source) }))
  return {
    group,
    crs: parseEpsg(document.metadata?.referenceSystem),
    triangleCount,
    objectCount,
    externalResources,
    textureBindings
  }
}

/** Read image dimensions before invoking a decoder; SVG and arbitrary blobs are rejected. */
export function cityJsonTextureSize(data: Uint8Array): {
  width: number
  height: number
  mime: string
} {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (
    data.length >= 33 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => data[i] === v) &&
    view.getUint32(8) === 13 &&
    view.getUint32(12) === 0x49484452
  ) {
    return { width: view.getUint32(16), height: view.getUint32(20), mime: 'image/png' }
  }
  if (data.length >= 4 && data[0] === 255 && data[1] === 216) {
    let p = 2
    while (p < data.length) {
      if (data[p++] !== 255) break
      while (data[p] === 255) p++
      const marker = data[p++]
      if (marker === 0xda || marker === 0xd9) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (p + 2 > data.length) break
      const length = view.getUint16(p)
      if (length < 2 || p + length > data.length) break
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker
        ) &&
        length >= 8
      ) {
        return { width: view.getUint16(p + 5), height: view.getUint16(p + 3), mime: 'image/jpeg' }
      }
      p += length
    }
  }
  throw new Error('CityJSON textures must contain a valid PNG or JPEG header.')
}

export async function renderCityJsonWithTextures(
  document: CityJsonDocument,
  resolveRelativeUrl: (reference: string) => string,
  options: CityJsonRenderOptions = {},
  datasetUrl: string | undefined,
  signal?: AbortSignal
): Promise<CityJsonRenderResult> {
  checkAbort(signal)
  const result = renderCityJsonDocument(document, resolveRelativeUrl, options)
  const owned: Array<{ texture: Texture; bitmap: ImageBitmap }> = []
  textureDisposers.set(result.group, () => {
    for (const { texture, bitmap } of owned.splice(0)) {
      try {
        texture.dispose()
      } catch {
        /* Release every texture even if a listener fails. */
      }
      try {
        bitmap.close()
      } catch {
        /* Continue releasing remaining decoded images. */
      }
    }
  })
  let totalBytes = 0,
    totalPixels = 0
  try {
    for (const binding of result.textureBindings) {
      checkAbort(signal)
      if (!datasetUrl)
        throw new Error('CityJSON textures require a dataset URL for relative resource resolution.')
      const url = new URL(binding.resource.url, datasetUrl),
        base = new URL(datasetUrl)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.origin !== base.origin
      ) {
        throw new Error('CityJSON texture must be an HTTP(S) resource on the dataset origin.')
      }
      const response = await fetch(url.href, { signal, credentials: 'omit', redirect: 'error' })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`CityJSON texture failed: HTTP ${response.status}.`)
      }
      const data = await readBoundedResponse(
        response,
        Math.min(MAX_TEXTURE_BYTES, MAX_TOTAL_TEXTURE_BYTES - totalBytes),
        signal
      )
      totalBytes += data.length
      const { width, height, mime } = cityJsonTextureSize(data)
      totalPixels += width * height
      if (
        !width ||
        !height ||
        width > 8192 ||
        height > 8192 ||
        width * height > MAX_TEXTURE_PIXELS ||
        totalPixels > MAX_TOTAL_TEXTURE_PIXELS
      ) {
        throw new Error('CityJSON texture dimensions exceed the decoded pixel limit.')
      }
      const bitmap = await createImageBitmap(new Blob([data.slice().buffer], { type: mime }), {
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none'
      })
      if (signal?.aborted) {
        bitmap.close()
        checkAbort(signal)
      }
      if (bitmap.width !== width || bitmap.height !== height) {
        bitmap.close()
        throw new Error('CityJSON texture dimensions changed during decoding.')
      }
      const texture = new Texture(bitmap)
      owned.push({ texture, bitmap })
      texture.colorSpace = SRGBColorSpace
      texture.flipY = false
      texture.wrapS = texture.wrapT =
        binding.wrapMode === 'wrap'
          ? RepeatWrapping
          : binding.wrapMode === 'mirror'
            ? MirroredRepeatWrapping
            : ClampToEdgeWrapping
      texture.needsUpdate = true
      binding.material.map = texture
      binding.material.needsUpdate = true
    }
    checkAbort(signal)
    return result
  } catch (error) {
    disposeCityJsonGroup(result.group)
    throw error
  }
}

export function disposeCityJsonGroup(group: Group): void {
  if (disposedGroups.has(group)) return
  disposedGroups.add(group)
  textureDisposers.get(group)?.()
  textureDisposers.delete(group)
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    try {
      object.geometry.dispose()
    } catch {
      /* Continue releasing owned geometry. */
    }
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      try {
        material.dispose()
      } catch {
        /* A listener must not retain other resources. */
      }
    }
  })
}
