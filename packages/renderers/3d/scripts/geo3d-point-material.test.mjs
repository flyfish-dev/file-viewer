import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import {repairGeo3dPointMaterial,prepareGeo3dClassificationShader} from '../dist/geo3dPointMaterial.js'
import {MATERIAL_SOURCE_HASHES,verifyMaterialSource,verifyMaterialCompatibility} from './verify-geo3d-material-compatibility.mjs'
const require=createRequire(import.meta.url)
await verifyMaterialCompatibility()
const source=await readFile(require.resolve('@giro3d/giro3d/renderer/pointcloudmaterial/slots/ClassificationSlot.js'),'utf8')
// The package retains raw GLSL under src/ and inlines it into the JS material.
// Read shader text as data, never as a JavaScript module or executable program.
const shader=await readFile(require.resolve('@giro3d/giro3d/src/renderer/shader/PointsVS.glsl'),'utf8')
const materialModule=await readFile(require.resolve('@giro3d/giro3d/renderer/PointCloudMaterial.js'),'utf8')
// Execute the installed getters/setters and shader. Only GPU texture allocation
// is stubbed here; real classification colors/visibility run in browser tests.
class Texture{constructor(){this.texture={};this.classifications=[]}updateUniform(){}dispose(){this.disposed=true}}
class AttributeSlot{constructor(name){this.attributeName=name;this.weight=0}updateActualWeight(){}}
const MaterialUtils={setDefine(material,key,present){if(present)material.defines[key]=1;else delete material.defines[key]}}
const ClassificationSlot=new Function('MaterialUtils','ClassificationsTexture','AttributeSlot',source.replace(/^import .*;\r?\n/gm,'').replace('export class ClassificationSlot','class ClassificationSlot')+'\nreturn ClassificationSlot;')(MaterialUtils,Texture,AttributeSlot)
function material(){
  const value={isPointCloudMaterial:true,defines:{MODE_COLOR:0,SCALAR_0_TYPE:'uint'},vertexShader:shader,uniforms:{},updates:0,set needsUpdate(enabled){if(enabled)this.updates++}}
  value._classificationSlots=[0,1,2].map(index=>new ClassificationSlot(value,index))
  value._classificationSlots[0].hasAttribute=true
  value.uniforms.classificationProperties={value:value._classificationSlots.map(slot=>slot.uniform)}
  return value
}
test('reviewed raw GLSL equals the shader in the installed runtime material',()=>{
  const matches=[...materialModule.matchAll(/^const PointsVS = ("(?:[^"\\\r\n]|\\.)*");$/gm)]
  assert.equal(matches.length,1,'Expected the reviewed inline vertex shader boundary')
  assert.equal(JSON.parse(matches[0][1]),shader)
})
test('material compatibility rejects changed upstream bytes',async()=>{
  for(const path of Object.keys(MATERIAL_SOURCE_HASHES)){
    const bytes=await readFile(require.resolve('@giro3d/giro3d/'+path),'utf8')
    assert.doesNotThrow(()=>verifyMaterialSource(path,bytes));assert.throws(()=>verifyMaterialSource(path,bytes+'\n'),/Unreviewed/)
  }
  assert.throws(()=>verifyMaterialSource('unknown.js',''),/Unreviewed/)
})
test('repair produces valid shader identifiers while preserving enabled slots',()=>{
  const value=material();assert.equal(value.defines['CLASSIFICATION_0;'],1)
  repairGeo3dPointMaterial(value);assert.equal(value.defines.CLASSIFICATION_0,1)
  assert.ok(Object.keys(value.defines).every(key=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)))
  assert.deepEqual(value._classificationSlots.map(slot=>slot.hasAttribute),[true,false,false])
})
test('original slot setters can disable and re-enable corrected attributes',()=>{
  const value=material();repairGeo3dPointMaterial(value)
  for(let i=0;i<3;i++){
    const slot=value._classificationSlots[i],flag=`CLASSIFICATION_${i}`
    slot.hasAttribute=true;assert.equal(value.defines[flag],1)
    slot.hasAttribute=false;assert.equal(Object.hasOwn(value.defines,flag),false)
    slot.hasAttribute=true;assert.equal(value.defines[flag],1)
    assert.equal(Object.hasOwn(value.defines,flag+';'),false)
  }
})
test('repair retains slot, texture and application state identity',()=>{
  const value=material(),slot=value._classificationSlots[0],texture=slot.texture,classes=[{visible:true}],uniform=slot.uniform
  slot.classifications=classes;slot.weight=.75;repairGeo3dPointMaterial(value)
  assert.equal(value._classificationSlots[0],slot);assert.equal(slot.texture,texture);assert.equal(slot.uniform,uniform)
  assert.equal(slot.classifications,classes);assert.equal(slot.weight,.75);assert.equal(texture.disposed,undefined)
  assert.equal(value.defines.MODE_COLOR,0);assert.equal(value.defines.SCALAR_0_TYPE,'uint')
})
test('repair is idempotent and leaves another viewer and mesh materials untouched',()=>{
  const a=material(),b=material();repairGeo3dPointMaterial(a)
  const updates=a.updates,uniform=a.uniforms.fvClassLut0;repairGeo3dPointMaterial(a)
  assert.equal(a.updates,updates);assert.equal(a.uniforms.fvClassLut0,uniform)
  assert.equal(b.defines['CLASSIFICATION_0;'],1);assert.equal(b.vertexShader,shader);assert.equal(b.updates,0)
  const mesh={defines:{FEATURE:1}};repairGeo3dPointMaterial(mesh);assert.deepEqual(mesh,{defines:{FEATURE:1}});repairGeo3dPointMaterial(null)
})
test('unknown or foreign slots fail before any material mutation',()=>{
  const value=material(),before={...value.defines};value._classificationSlots[2]._flagDefine='UNREVIEWED'
  assert.throws(()=>repairGeo3dPointMaterial(value),/Unreviewed/);assert.deepEqual(value.defines,before);assert.equal(value.updates,0)
  value._classificationSlots[2]._flagDefine='CLASSIFICATION_2;';value._classificationSlots[2]._material=material()
  assert.throws(()=>repairGeo3dPointMaterial(value),/Unreviewed/);assert.deepEqual(value.defines,before)
})
test('shader compatibility retains integer texel fetch and all three slots',()=>{
  const result=prepareGeo3dClassificationShader(shader)
  assert.equal((result.match(/uniform sampler2D fvClassLut/g)||[]).length,3)
  assert.equal((result.match(/uniform float fvClassWeight/g)||[]).length,3)
  assert.match(result,/texelFetch\(classificationLut, ivec2\(classification, 0\), 0\) \* classificationWeight/)
  assert.ok(!result.includes('uniform ClassificationProperties classificationProperties'))
  assert.ok(!result.includes('classificationProperties['))
  assert.match(result,/addClassificationContribution\(classification_2, fvClassLut2, fvClassWeight2,/)
})
test('forwarded uniforms follow host changes and engine replacement arrays',()=>{
  const value=material();repairGeo3dPointMaterial(value)
  for(let index=0;index<3;index++){
    const slot=value.uniforms.classificationProperties.value[index],texture={index}
    slot.lut=texture;slot.weight=.25
    assert.equal(value.uniforms['fvClassLut'+index].value,texture)
    assert.equal(value.uniforms['fvClassWeight'+index].value,.25)
  }
  const next=[0,1,2].map(index=>({lut:{next:index},weight:index/2}))
  value.uniforms.classificationProperties.value=next
  for(let index=0;index<3;index++){
    assert.equal(value.uniforms['fvClassLut'+index].value,next[index].lut)
    assert.equal(value.uniforms['fvClassWeight'+index].value,next[index].weight)
  }
})
test('changed shader layout and uniform collisions fail atomically',()=>{
  const value=material(),before={...value.defines}
  value.vertexShader=shader.replace('classificationProperties[3]','classificationProperties[4]')
  assert.throws(()=>repairGeo3dPointMaterial(value),/Unreviewed/)
  assert.deepEqual(value.defines,before);assert.equal(value.updates,0)
  value.vertexShader=shader;value.uniforms.fvClassLut0={value:'host'}
  assert.throws(()=>repairGeo3dPointMaterial(value),/collision/)
  assert.deepEqual(value.defines,before);assert.equal(value.uniforms.fvClassLut0.value,'host')
})
