import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getEmbeddedPictureCandidates as candidates } from '../../packages/renderers/pptx/src/engine/support/picture-resource.js'
const resource = (target, external = false) => ({ type: 'image', target, external })
const files = new Set(['ppt/media/vector.svg', 'ppt/media/bitmap.png'])
const zip = { file: name => files.has(name) ? { name } : null }
const svg = { 'a:extLst': { 'a:ext': [ { attrs: { uri: 'unrelated' } }, { 'asvg:svgBlip': { attrs: { 'r:embed': 'vector' } } } ] } }
const resources = { vector: resource('ppt/media/vector.svg'), bitmap: resource('ppt/media/bitmap.png') }
test('SVG-only picture resolves its extension relationship', () => assert.equal(candidates(svg, resources, zip)[0].target, 'ppt/media/vector.svg'))
test('Prefer vector and retain raster fallback', () => assert.deepEqual(candidates({ ...svg, attrs: { 'r:embed': 'bitmap' } }, resources, zip).map(x => x.target), ['ppt/media/vector.svg', 'ppt/media/bitmap.png']))
test('Absent vector falls back to a present raster', () => assert.equal(candidates({ ...svg, attrs: { 'r:embed': 'bitmap' } }, { bitmap: resources.bitmap }, zip)[0].target, 'ppt/media/bitmap.png'))
test('Incomplete picture records never dereference a missing relationship', () => { for (const value of [undefined, {}, {attrs:{}}, svg]) assert.deepEqual(candidates(value, {}, zip), []) })
test('Reject external and non-image relations even when a matching ZIP entry exists', () => {
 for (const r of [resource('ppt/media/bitmap.png',true),resource('https://example.invalid/a.png'),{...resource('ppt/media/bitmap.png'),type:'hyperlink'}]) assert.deepEqual(candidates({attrs:{'r:embed':'x'}},{x:r},zip),[])
})
test('Do not confuse inherited object keys with relationships', () => assert.deepEqual(candidates({attrs:{'r:embed':'toString'}},{},zip), []))
