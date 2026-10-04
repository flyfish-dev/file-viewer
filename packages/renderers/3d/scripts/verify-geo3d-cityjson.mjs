import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Box3 } from 'three'
import {
  parseCityJson, renderCityJsonDocument, renderCityJsonWithTextures,
  cityJsonTextureSize, disposeCityJsonGroup,
} from '../dist/geo3dCityJson.js'

const fixture = name => readFile(new URL(`../test/fixtures/geo3d/samples-mit/${name}`, import.meta.url))
const original = parseCityJson(await fixture('building-textured.city.json'))
const png = new Uint8Array(await fixture('textures/checker.png'))
const base = 'https://datasets.example.test/city/building.city.json'
const resolve = value => new URL(value, base).href
const geometry = doc => doc.CityObjects['synthetic-building'].geometry[0]
let count = 0
async function check(name, callback) { await callback(); count++; console.log(`PASS CityJSON ${name}`) }

await check('real textured solid preserves UV pairs and projected placement', () => {
  const model = renderCityJsonDocument(original, resolve)
  try {
    assert.equal(model.triangleCount, 12)
    assert.equal(model.objectCount, 1)
    assert.equal(model.textureBindings.length, 1)
    const mesh = model.group.children[0]
    assert.equal(mesh.geometry.getAttribute('position').count, 36)
    const uv = mesh.geometry.getAttribute('uv')
    assert.equal(uv.count, 36)
    assert.ok(Array.from(uv.array).every(value => value === 0 || value === 1))
    const box = new Box3().setFromObject(model.group)
    assert.deepEqual(box.min.toArray(), [500000, 5100000, 100])
    assert.deepEqual(box.max.toArray(), [500010, 5100010, 110])
    assert.deepEqual(model.externalResources, [{ source: 'textures/checker.png', url: resolve('textures/checker.png') }])
  } finally { disposeCityJsonGroup(model.group) }
})
await check('theme selection is explicit and unknown themes fail', () => {
  assert.throws(() => renderCityJsonDocument(original, resolve, { textureTheme: 'missing' }), /theme not found/)
  const doc = structuredClone(original)
  doc.appearance['default-theme-texture'] = 'other'
  const other = structuredClone(geometry(doc).texture.checker)
  for (const surface of other.values[0]) surface[0] = [null]
  geometry(doc).texture.other = other
  const plain = renderCityJsonDocument(doc, resolve)
  const textured = renderCityJsonDocument(doc, resolve, { textureTheme: 'checker' })
  assert.equal(plain.textureBindings.length, 0)
  assert.equal(textured.textureBindings.length, 1)
  disposeCityJsonGroup(plain.group); disposeCityJsonGroup(textured.group)
})
await check('invalid geometry, texture IDs and UV indices fail closed', () => {
  const changes = [
    doc => { geometry(doc).boundaries[0][0][0][0] = -1 },
    doc => { geometry(doc).texture.checker.values[0][0][0][0] = 99 },
    doc => { geometry(doc).texture.checker.values[0][0][0][1] = 99 },
    doc => { geometry(doc).texture.checker.values[0][0][0].pop() },
    doc => { doc.vertices[0][0] = NaN },
  ]
  for (const change of changes) {
    const doc = structuredClone(original); change(doc)
    assert.throws(() => renderCityJsonDocument(doc), /Invalid CityJSON|texture ring/)
  }
})
await check('holes retain geometry-to-UV correspondence', () => {
  const doc = { type:'CityJSON', vertices:[[0,0,0],[4,0,0],[4,4,0],[0,4,0],[1,1,0],[1,3,0],[3,3,0],[3,1,0]],
    CityObjects:{floor:{geometry:[{type:'MultiSurface',boundaries:[[[0,1,2,3],[4,5,6,7]]],texture:{day:{values:[[[0,0,1,2,3],[0,4,5,6,7]]]}}}]}},
    appearance:{textures:[{image:'floor.png'}],'vertices-texture':[[0,0],[1,0],[1,1],[0,1],[.25,.25],[.25,.75],[.75,.75],[.75,.25]]} }
  const result = renderCityJsonDocument(doc)
  const mesh = result.group.children[0], positions = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv')
  let area = 0
  for (let i=0;i<positions.count;i+=3) {
    area += Math.abs((positions.getX(i+1)-positions.getX(i))*(positions.getY(i+2)-positions.getY(i))-(positions.getX(i+2)-positions.getX(i))*(positions.getY(i+1)-positions.getY(i)))/2
  }
  assert.equal(area, 12)
  for(let i=0;i<positions.count;i++) { assert.equal(uv.getX(i),positions.getX(i)/4);assert.equal(uv.getY(i),positions.getY(i)/4) }
  disposeCityJsonGroup(result.group)
})
await check('PNG dimensions are read before decoding arbitrary input', () => {
  assert.deepEqual(cityJsonTextureSize(png), { width:16,height:16,mime:'image/png' })
  assert.throws(() => cityJsonTextureSize(new TextEncoder().encode('<svg/>')), /PNG or JPEG/)
})

const nativeFetch = globalThis.fetch, nativeBitmap = globalThis.createImageBitmap
let requests = [], closed = 0, decoded = 0, bitmapOptions
const successFetch = async (url, options) => {
  requests.push({ url:String(url),options })
  return new Response(png, { headers:{'Content-Type':'image/png'} })
}
globalThis.fetch = successFetch
globalThis.createImageBitmap = async (_blob, options) => {
  decoded++; bitmapOptions = options
  return {width:16,height:16,close(){closed++}}
}
try {
  await check('bounded texture fetch binds a real Three Texture and closes owned image once', async () => {
    const result = await renderCityJsonWithTextures(original, resolve, {}, base)
    const material = result.group.children[0].material
    assert.equal(material.map.isTexture,true)
    assert.equal(material.map.image.width,16)
    assert.equal(bitmapOptions.imageOrientation,'flipY')
    assert.equal(material.map.flipY,false)
    assert.equal(requests.at(-1).options.redirect,'error')
    assert.equal(requests.at(-1).options.credentials,'omit')
    disposeCityJsonGroup(result.group);disposeCityJsonGroup(result.group)
    assert.equal(closed,1)
  })
  await check('other origins and non-HTTP schemes never reach fetch', async () => {
    for (const url of ['https://other.example.test/a.png','data:image/png,anything','file:///a.png','https://user:pass@datasets.example.test/a.png']) {
      const doc=structuredClone(original);doc.appearance.textures[0].image=url
      const before=requests.length
      await assert.rejects(renderCityJsonWithTextures(doc,resolve,{},base), /dataset origin/)
      assert.equal(requests.length,before)
    }
    await assert.rejects(renderCityJsonWithTextures(original,resolve,{},undefined), /require a dataset URL/)
  })
  await check('oversized decoded dimensions fail before image allocation', async () => {
    const oversized = png.slice();new DataView(oversized.buffer).setUint32(16,9000)
    globalThis.fetch=async()=>new Response(oversized)
    const before=decoded
    await assert.rejects(renderCityJsonWithTextures(original,resolve,{},base), /pixel limit/)
    assert.equal(decoded,before)
    globalThis.fetch=successFetch
  })
  await check('HTTP error never produces an untextured success', async () => {
    globalThis.fetch=async()=>new Response(null,{status:404})
    await assert.rejects(renderCityJsonWithTextures(original,resolve,{},base), /HTTP 404/)
    globalThis.fetch=successFetch
  })
  await check('abort after decode closes bitmap before returning', async () => {
    const controller=new AbortController(),before=closed
    globalThis.createImageBitmap=async()=>{controller.abort();return {width:16,height:16,close(){closed++}}}
    await assert.rejects(renderCityJsonWithTextures(original,resolve,{},base,controller.signal), {name:'AbortError'})
    assert.equal(closed,before+1)
  })
} finally {
  globalThis.fetch=nativeFetch
  if(nativeBitmap===undefined)delete globalThis.createImageBitmap
  else globalThis.createImageBitmap=nativeBitmap
}
console.log(`CityJSON texture contract passed: ${count} checks. Browser decoding/rendering is verified separately.`)
