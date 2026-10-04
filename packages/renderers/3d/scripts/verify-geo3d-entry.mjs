import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyGeo3dAssets } from '../bin/copy-geo3d-assets.mjs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRendererRegistry, installFileViewerRendererPlugins, resolveFileViewerRendererDefinition } from '@file-viewer/core'
import { createGeo3dRenderer, inspectGeoTiffBuffer, isCityJsonBuffer, isCopcRangeSource, resolveGeo3dSourceType } from '../dist/geo3d.js'
import { inspect3tzCentralDirectory } from '../dist/geo3dArchive.js'
const asArrayBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)
const fixture=async name=>asArrayBuffer(await readFile(new URL(`../test/fixtures/geo3d/${name}`,import.meta.url)))
const registry=createRendererRegistry(),handlers=[]
await installFileViewerRendererPlugins({registry,plugins:[createGeo3dRenderer()],registerHandler:item=>handlers.push(item)})
for(const [filename,extension]of[['tileset.json','json'],['district.copc.laz','laz']])assert.equal(resolveFileViewerRendererDefinition(registry,{filename,extension})?.id,'geo3d')
for(const extension of['tif','tiff'])assert.equal(registry.getByExtension(extension)?.id,'image')
assert.equal(registry.getByExtension('json')?.id,'code')
for(const extension of['las','laz','geotiff','cog','cityjson','3dtiles','3tz'])assert.equal(registry.getByExtension(extension)?.id,'geo3d')
assert.equal(registry.getById('geo3d')?.sourceAccess,'stream-preferred')
assert.equal(typeof registry.getById('geo3d')?.resolveSourceType,'function')
assert.ok(handlers.some(item=>item.rendererId==='geo3d'))
const regular=await fixture('regular.tif'),geotiff=await fixture('geotiff-noncog.tif'),cog=await fixture('sample-cog.tif')
for(const [buffer,type]of[[regular,false],[geotiff,'geotiff'],[cog,'cog']])assert.equal(await resolveGeo3dSourceType({filename:'sample.tif',extension:'tif',buffer}),type)
const geoMetadata=await inspectGeoTiffBuffer(geotiff)
assert.equal(geoMetadata?.isCog,false);assert.equal(geoMetadata?.crs,'EPSG:4326');assert.deepEqual(geoMetadata?.bbox,[12,45.68,12.32,46])
const cogMetadata=await inspectGeoTiffBuffer(cog)
assert.equal(cogMetadata?.isCog,true);assert.equal(cogMetadata?.crs,'EPSG:32632');assert.equal(cogMetadata?.tiled,true)
const city=await fixture('sample.city.json');assert.equal(isCityJsonBuffer(city),true)
assert.equal(await resolveGeo3dSourceType({filename:'building.city.json',extension:'json',buffer:city}),'cityjson')
const copc=new Uint8Array(await fixture('probe.copc.laz'))
assert.equal(await isCopcRangeSource(async(begin,end)=>copc.slice(begin,end)),true)
const minimal=new Uint8Array(await fixture('sample.3tz')),traversal=new Uint8Array(await fixture('invalid-traversal.3tz')),duplicate=new Uint8Array(await fixture('duplicate.3tz'))
assert.ok(inspect3tzCentralDirectory(minimal).entries.some(e=>e.name==='tileset.json'))
assert.throws(()=>inspect3tzCentralDirectory(traversal),/traversal/i)
assert.throws(()=>inspect3tzCentralDirectory(duplicate),/duplicate/i)
assert.throws(()=>inspect3tzCentralDirectory(minimal,{maxEntries:0}),/maxEntries/)
assert.throws(()=>inspect3tzCentralDirectory(minimal,{maxExpandedBytes:1}),/expanded size/)
const main=await readFile(new URL('../src/index.ts',import.meta.url),'utf8')
assert.ok(!main.includes('./geo3d'),'Optional Geo3D must not enter the ordinary 3D entry')
const entry=await readFile(new URL('../dist/geo3d.js',import.meta.url),'utf8')
assert.ok(!/from\s+['"]@giro3d\/giro3d/.test(entry),'Geo3D peer must stay behind the lazy runtime module')
const runtime=await readFile(new URL('../dist/geo3dRuntime.js',import.meta.url),'utf8')
assert.ok(!runtime.includes("from 'three'")&&!runtime.includes('from "three"'),"Geo3D runtime must not import File Viewer's Three.js copy")
assert.ok(!runtime.includes('MapControls'),'Geo3D navigation must stay inside Giro3D peer graph')
for(const pattern of[/@giro3d\/giro3d\/controls\/FirstPersonControls\.js/,/view\.goTo/,/@giro3d\/giro3d\/core\/Instance\.js/,/geo3dPointFactories\.js/,/createCOPCSource/,/createLASSource/,/createOwnedPointCloud/,/geo3dRasterFactories\.js/,/createGeo3dRasterWorkers/,/@giro3d\/giro3d\/entities\/Tiles3D\.js/,/Content-Range/,/maxLasBytes/,/maxCityJsonBytes/,/max3tzBytes/,/three\/draco\//,/three\/basis\//])assert.match(runtime,pattern)
// Neither point nor raster sources may bypass the owned factory boundary.
assert.match(runtime,/import\(['"]\.\/geo3dPointFactories\.js['"]\)/)
assert.doesNotMatch(runtime,/@giro3d\/giro3d\/sources\/(?:LASSource|COPCSource)\.js/,'Point runtime must not bypass the cancellation-preserving factory')
assert.match(runtime,/import\(['"]\.\/geo3dRasterFactories\.js['"]\)/)
assert.doesNotMatch(runtime,/@giro3d\/giro3d\/sources\/GeoTIFFSource\.js/,'Raster runtime must not bypass the source-owned factory')
const rasterFactory=await readFile(new URL('../dist/geo3dRasterFactories.js',import.meta.url))
const pointFactory=await readFile(new URL('../dist/geo3dPointFactories.js',import.meta.url))
const decoderManifest=JSON.parse(await readFile(new URL('../dist/geo3d-workers/manifest.json',import.meta.url),'utf8'))
assert.equal(createHash('sha256').update(rasterFactory).digest('hex'),decoderManifest.raster.factorySha256,'Built raster factory must match the reviewed build manifest')
assert.equal(createHash('sha256').update(pointFactory).digest('hex'),decoderManifest.adapterSha256,'Built point factory must match the reviewed build manifest')
assert.match(pointFactory.toString(),/from ["']@giro3d\/giro3d\/entities\/PointCloud\.js["']/,'Owned PointCloud must extend the real host engine class')
const archive=await readFile(new URL('../dist/geo3dArchive.js',import.meta.url),'utf8')
// The behavioural CRC-corruption test below replaces JSZip's unbounded eager
// checkCRC32 mode. Actual expansion is limited before CRC acceptance.
for(const pattern of[/boundedExtract/,/CRC32 mismatch/,/path traversal/i,/duplicate path/i,/maxCompressionRatio/,/rewriteGlbUris/])assert.match(archive,pattern)
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'))
assert.equal(pkg.exports['./geo3d'].import,'./dist/geo3d.js');assert.ok(pkg.files.includes('GEO3D.md'))
assert.ok(!pkg.dependencies['@giro3d/giro3d']);assert.ok(!pkg.dependencies.jszip)
assert.equal(pkg.peerDependencies['@giro3d/giro3d'],'2.0.4');assert.equal(pkg.peerDependenciesMeta['@giro3d/giro3d']?.optional,true)
assert.equal(pkg.peerDependencies.jszip,'3.10.2');assert.equal(pkg.peerDependenciesMeta.jszip?.optional,true)
assert.equal(pkg.bin['file-viewer-geo3d-assets'],'./bin/copy-geo3d-assets.mjs')
const cli=fileURLToPath(new URL('../bin/copy-geo3d-assets.mjs',import.meta.url)),temp=await mkdtemp(join(tmpdir(),'file-viewer-geo3d-cli-'))
try{
  const alias=join(temp,'file-viewer-geo3d-assets');await symlink(cli,alias)
  for(const command of[cli,alias]){
    const help=spawnSync(process.execPath,[command,'--help'],{encoding:'utf8'});assert.equal(help.status,0,help.stderr);assert.match(help.stdout,/Usage: file-viewer-geo3d-assets/)
    const invalid=spawnSync(process.execPath,[command,'--unknown'],{encoding:'utf8'});assert.equal(invalid.status,1);assert.match(invalid.stderr,/Expected one destination directory/)
  }
  const moduleUrl=new URL('../bin/copy-geo3d-assets.mjs',import.meta.url).href
  const imported=spawnSync(process.execPath,['--input-type=module','-e',`import {copyGeo3dAssets} from ${JSON.stringify(moduleUrl)}; if(typeof copyGeo3dAssets!=='function')process.exit(1)`],{encoding:'utf8'})
  assert.equal(imported.status,0,imported.stderr);assert.equal(imported.stdout,'')
  const assets=join(temp,'assets');await mkdir(assets)
  await writeFile(join(assets,'host-owned.txt'),'preserve this host file')
  const copied=await copyGeo3dAssets(assets)
  assert.equal(await readFile(join(assets,'host-owned.txt'),'utf8'),'preserve this host file')
  const manifest=JSON.parse(await readFile(join(assets,'manifest.json'),'utf8'))
  assert.equal(manifest.packages.find(p=>p.name==='@giro3d/giro3d')?.version,'2.0.4')
  for(const name of ['workers/las-worker.js','workers/geotiff-worker.js','workers/texture-worker.js','workers/raster-licenses/lerc-LICENSE','workers/raster-licenses/lerc-NOTICE'])assert.ok(copied.files[name],`Missing deployed Geo3D asset: ${name}`)
  for(const [name,entry]of Object.entries(copied.files)){
    const bytes=await readFile(join(assets,name))
    assert.equal(bytes.length,entry.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256)
  }
  for(const name of ['lerc-LICENSE','lerc-NOTICE']){
    assert.deepEqual(await readFile(join(assets,'workers/raster-licenses',name)),await readFile(new URL(`../licenses/${name}`,import.meta.url)))
  }
  for(const name of ['laz-perf/laz-perf.wasm','three/draco/draco_decoder.wasm','three/basis/basis_transcoder.wasm']){
    const bytes=await readFile(join(assets,name));assert.deepEqual([...bytes.subarray(0,4)],[0,97,115,109]);assert.ok(bytes.length>1024)
  }
  console.log(`Geo3D asset copy passed: ${Object.keys(copied.files).length} real files, exact hashes and preserved host data.`)

}finally{await rm(temp,{recursive:true,force:true})}
await import('./verify-geo3d-contract.mjs')
await import('./verify-geo3d-cityjson.mjs')
console.log('Geo3D opt-in routing, TIFF/COG detection, CityJSON/3TZ safety, lazy peers and self-hosted assets passed.')
