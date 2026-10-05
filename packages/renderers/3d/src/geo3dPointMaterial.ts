/** Narrow, source-hash-checked compatibility boundary for Giro3D 2.0.4.
 * Keep the real material, classification slots, textures and disposal ownership.
 * No prototypes, global shaders or singleton state are modified.
 */
interface ReviewedSlot {_flagDefine:string;_material:object;hasAttribute:boolean}
interface ClassificationUniform {lut:unknown;weight:number}
interface ReviewedMaterial {
  defines:Record<string,unknown>
  _classificationSlots:ReviewedSlot[]
  vertexShader:string
  uniforms:Record<string,{value:unknown}>&{classificationProperties:{value:ClassificationUniform[]}}
  needsUpdate:boolean
}
const prepared=new WeakSet<object>()
/** Flatten sampler-containing uniform structs without changing texel lookup,
 * class IDs, weights, visibility or color arithmetic. The pinned shader crashes
 * the tested ANGLE/SwiftShader compiler with the original struct-array layout.
 */
export function prepareGeo3dClassificationShader(source:string):string {
  let declarations=0,functions=0,calls=0
  let result=source.replace(/uniform ClassificationProperties classificationProperties\[3\];/,()=>{
    declarations++
    return [0,1,2].map(index=>`uniform sampler2D fvClassLut${index}; uniform float fvClassWeight${index};`).join('\n')
  })
  result=result.replace(/void addClassificationContribution\([\s\S]*?\n}/,body=>{
    functions++
    if(!body.includes('const ClassificationProperties properties'))throw new Error('Unreviewed Giro3D classification shader parameter.')
    return body.replace('const ClassificationProperties properties','sampler2D classificationLut, const float classificationWeight').replaceAll('properties.weight','classificationWeight').replaceAll('properties.lut','classificationLut')
  }).replace(/addClassificationContribution\((classification(?:_[12])?), classificationProperties\[(\d)\],/g,(_,attribute,index)=>{
    if(Number(index)!==calls)throw new Error('Unreviewed Giro3D classification shader slot order.')
    calls++
    return `addClassificationContribution(${attribute}, fvClassLut${index}, fvClassWeight${index},`
  })
  if(declarations!==1||functions!==1||calls!==3)throw new Error('Unreviewed Giro3D classification shader layout.')
  return result
}
export function repairGeo3dPointMaterial(value:unknown):void {
  if(!value||typeof value!=='object'||!('isPointCloudMaterial' in value)||!value.isPointCloudMaterial||prepared.has(value))return
  const material=value as unknown as ReviewedMaterial,slots=material._classificationSlots
  if(!material.defines||!Array.isArray(slots)||slots.length!==3)throw new Error('Unreviewed Giro3D classification material layout.')
  // Validate the entire boundary before changing this material.
  for(let index=0;index<3;index++) {
    const slot=slots[index],flag=`CLASSIFICATION_${index}`
    if(!slot||slot._material!==value||typeof slot.hasAttribute!=='boolean'||
      (slot._flagDefine!==flag&&slot._flagDefine!==`${flag};`))throw new Error('Unreviewed Giro3D classification slot layout.')
  }
  const uniforms=material.uniforms?.classificationProperties?.value
  if(!Array.isArray(uniforms)||uniforms.length!==3||uniforms.some(uniform=>!uniform||!('lut' in uniform)||typeof uniform.weight!=='number'))throw new Error('Unreviewed Giro3D classification uniform layout.')
  const shader=prepareGeo3dClassificationShader(material.vertexShader)
  for(let index=0;index<3;index++) {
    if(Object.hasOwn(material.uniforms,`fvClassLut${index}`)||Object.hasOwn(material.uniforms,`fvClassWeight${index}`))throw new Error('Giro3D compatibility uniform name collision.')
  }
  for(let index=0;index<3;index++) {
    const slot=slots[index],flag=`CLASSIFICATION_${index}`,present=slot.hasAttribute
    delete material.defines[`${flag};`]
    slot._flagDefine=flag;slot.hasAttribute=present
    // Forward the existing engine uniform values on EVERY draw. Host changes,
    // engine slot updates and replacement uniform arrays remain observable.
    material.uniforms[`fvClassLut${index}`]={get value(){return material.uniforms.classificationProperties.value[index].lut}}
    material.uniforms[`fvClassWeight${index}`]={get value(){return material.uniforms.classificationProperties.value[index].weight}}
  }
  material.vertexShader=shader;material.needsUpdate=true;prepared.add(value)
}
