/** Verify the exact engine boundary used by the per-material compatibility fix. */
import {createHash} from 'node:crypto'
import {readFile,realpath} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
export const MATERIAL_SOURCE_HASHES={
  'renderer/pointcloudmaterial/slots/ClassificationSlot.js':'e0c46ee5352f6f636c15f2373a8c7db70733e8c7cf84f30b9e064d31e0214c99',
  'renderer/PointCloudMaterial.js':'3ae7871bd659c1872388022d67b24c7d29ffe3cd986b340c0c7eb1c90f7377ae',
  'entities/3dtiles/PointCloudPlugin.js':'583d2e9806eaf8240fa3a4c14c7a089f784197e00b2e46c2687c2e8d81b3b17a',
  'src/renderer/shader/PointsVS.glsl':'eaba7c2a5df596cface122cac1ffa2eef1f597b4068f88561394e5645d6e3f07',
}
export function verifyMaterialSource(path,bytes){
  if(!Object.hasOwn(MATERIAL_SOURCE_HASHES,path)||createHash('sha256').update(bytes).digest('hex')!==MATERIAL_SOURCE_HASHES[path])throw new Error(`Unreviewed Giro3D material source: ${path}`)
}
export async function verifyMaterialCompatibility(){
  const require=createRequire(import.meta.url)
  for(const path of Object.keys(MATERIAL_SOURCE_HASHES))verifyMaterialSource(path,await readFile(require.resolve('@giro3d/giro3d/'+path)))
}
let entry=false
try{entry=!!process.argv[1]&&await realpath(process.argv[1])===fileURLToPath(import.meta.url)}catch{/* Imported by the Node tests. */}
if(entry){await verifyMaterialCompatibility();console.log('Verified pinned Giro3D point material, shader and classification slot compatibility.')}
