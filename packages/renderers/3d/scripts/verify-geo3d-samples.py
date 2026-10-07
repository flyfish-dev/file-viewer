#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Validate sample bytes, pixels, geometry/resources and the 3TZ index.

This is NOT a renderer/browser test. By default missing LAZ/COPC is a failure.
--allow-missing-compressed permits partial validation and reports it as partial.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import struct
import subprocess
import sys
from urllib.parse import unquote, urlparse
import zipfile
import numpy as np
import rasterio
import tifffile

DEFAULT = Path(__file__).resolve().parent.parent / 'test/fixtures/geo3d/samples-mit'
GEO_TAGS = {33550,33922,34264,34735,34736,34737}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def json_read(p: Path) -> object:
    return json.loads(p.read_text(encoding='utf-8'))


def inside(root: Path, source: Path, uri: str) -> Path:
    parsed = urlparse(uri)
    require(not parsed.scheme and not parsed.netloc, f'External resource: {uri}')
    require(not parsed.query and not parsed.fragment, f'Unexpected URI suffix: {uri}')
    require(not uri.startswith('/') and '\\' not in uri and '\0' not in uri, f'Invalid resource: {uri}')
    target = (source.parent / unquote(uri)).resolve()
    require(target.is_relative_to(root.resolve()), f'Resource escapes sample directory: {uri}')
    require(target.is_file(), f'Missing resource: {uri}')
    return target


def las_header(path: Path, expected_points: int) -> dict:
    data = path.read_bytes()
    require(data[:4] == b'LASF' and len(data) >= 375, f'Not LAS 1.4: {path.name}')
    require(data[24:26] == bytes((1,4)), 'Expected LAS 1.4')
    header_size, offset, nvlrs = struct.unpack_from('<HII', data, 94)
    pfmt, record = struct.unpack_from('<BH', data, 104)
    count = struct.unpack_from('<Q', data, 247)[0]
    require(header_size == 375 and header_size < offset <= len(data), 'LAS offsets invalid')
    require((pfmt & 63) == 7 and record == 36 and count == expected_points, 'LAS point metadata invalid')
    vlrs = {}
    cursor = header_size
    for _ in range(nvlrs):
        require(cursor + 54 <= offset, 'Truncated VLR')
        _, user, rid, size, _ = struct.unpack_from('<H16sHH32s', data, cursor)
        cursor += 54
        require(cursor + size <= offset, 'VLR outside header')
        vlrs[(user.rstrip(b'\0'), rid)] = data[cursor:cursor+size]
        cursor += size
    require((b'LASF_Projection',2112) in vlrs, 'Missing WKT CRS VLR')
    wkt = vlrs[(b'LASF_Projection',2112)].rstrip(b'\0').decode()
    require(rasterio.crs.CRS.from_wkt(wkt).to_epsg() == 32632, 'Incorrect LAS CRS')
    return {'bytes':data,'offset':offset,'count':count,'compressed':bool(pfmt & 128),
            'vlrs':vlrs,'record':record}


def verify_las(path: Path, expected_points: int) -> dict:
    h = las_header(path, expected_points)
    require(not h['compressed'], 'Plain LAS marked compressed')
    require(len(h['bytes']) == h['offset'] + h['count'] * h['record'], 'LAS point length mismatch')
    points = np.array([struct.unpack_from('<iii', h['bytes'], h['offset'] + i*36)
                       for i in range(h['count'])])
    scale = np.array(struct.unpack_from('<3d', h['bytes'],131))
    offset = np.array(struct.unpack_from('<3d', h['bytes'],155))
    xyz = points*scale+offset
    bounds = struct.unpack_from('<6d', h['bytes'],179)
    expected = [xyz[:,0].max(),xyz[:,0].min(),xyz[:,1].max(),xyz[:,1].min(),xyz[:,2].max(),xyz[:,2].min()]
    require(np.allclose(bounds,expected,rtol=0,atol=1e-7), 'LAS bounds mismatch')
    require(len(np.unique(points,axis=0)) == expected_points, 'Duplicate generated points')
    return {'points':expected_points,'pointFormat':7,'crs':'EPSG:32632','bounds':list(bounds)}


def verify_cityjson(path: Path, root: Path) -> dict:
    v = json_read(path)
    require(v['type']=='CityJSON' and v['version']=='2.0', 'Invalid CityJSON header')
    vertices = np.array(v['vertices'])
    require(vertices.shape==(8,3), 'Expected eight cube vertices')
    geom = v['CityObjects']['synthetic-building']['geometry'][0]
    require(geom['type']=='Solid' and len(geom['boundaries'])==1, 'Expected a single solid shell')
    faces = geom['boundaries'][0]
    require(len(faces)==6, 'Expected six cube faces')
    edges = []
    for face in faces:
        ring = face[0]
        require(len(face)==1 and len(ring)==4, 'Invalid face/ring')
        require(all(isinstance(i,int) and 0<=i<len(vertices) for i in ring), 'Invalid vertex index')
        edges.extend(zip(ring, ring[1:]+ring[:1]))
    require(all(edges.count((b,a))==1 for a,b in edges), 'Shell is not consistently closed')
    xyz = vertices*np.array(v['transform']['scale']) + np.array(v['transform']['translate'])
    require(np.allclose(v['metadata']['geographicalExtent'],[*xyz.min(axis=0),*xyz.max(axis=0)]), 'CityJSON extent mismatch')
    textures = v.get('appearance',{}).get('textures',[])
    for texture in textures:
        data = inside(root,path,texture['image']).read_bytes()
        require(data.startswith(b'\x89PNG\r\n\x1a\n'), 'Texture is not PNG')
    if textures:
        values = geom['texture']['checker']['values']
        require(len(values)==1 and len(values[0])==6, 'Texture shell mismatch')
        for face in values[0]:
            require(len(face)==1 and face[0]==[0,0,1,2,3], 'Texture indices mismatch')
    return {'vertices':8,'faces':6,'externalTextures':len(textures)}


def verify_tiles(base: Path) -> dict:
    root_file = base/'tileset.json'
    root = json_read(root_file)
    child_path = inside(base,root_file,root['root']['content']['uri'])
    child = json_read(child_path)
    gltf_path = inside(base,child_path,child['root']['content']['uri'])
    gltf = json_read(gltf_path)
    require(gltf['asset']['version']=='2.0', 'Invalid glTF version')
    buffers = [inside(base,gltf_path,b['uri']).read_bytes() for b in gltf['buffers']]
    for b, data in zip(gltf['buffers'],buffers):
        require(len(data)==b['byteLength'], 'glTF buffer size mismatch')
    for image in gltf['images']:
        require(inside(base,gltf_path,image['uri']).read_bytes().startswith(b'\x89PNG'), 'Missing PNG')
    sizes = {5126:4,5123:2}
    dims = {'VEC3':3,'VEC2':2,'SCALAR':1}
    for a in gltf['accessors']:
        view = gltf['bufferViews'][a['bufferView']]
        offset = view.get('byteOffset',0)+a.get('byteOffset',0)
        required = a['count']*sizes[a['componentType']]*dims[a['type']]
        require(required+a.get('byteOffset',0)<=view['byteLength'], 'Accessor outside view')
        require(offset+required<=len(buffers[view['buffer']]), 'Accessor outside buffer')
    pos = np.frombuffer(buffers[0], dtype='<f4', count=72).reshape((-1,3))
    require(np.array_equal(pos.min(axis=0),[-5,0,-5]) and np.array_equal(pos.max(axis=0),[5,10,5]), 'glTF bounds mismatch')
    indices = np.frombuffer(buffers[0],dtype='<u2',offset=480)
    require(len(indices)==36 and indices.max()<24, 'Triangle indices invalid')
    return {'nestedTilesets':1,'vertices':24,'triangles':12,'externalBuffers':1,'externalTextures':1}


def verify_3tz(path: Path, base: Path) -> dict:
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        require(len(names)==len(set(names)), 'Duplicate archive entry')
        require('tileset.json' in names and names[-1]=='@3dtilesIndex1@', 'Missing root tileset or final index')
        require(z.testzip() is None, 'CRC failure')
        require(z.getinfo('@3dtilesIndex1@').compress_type==zipfile.ZIP_STORED, 'Index must be stored')
        require(not z.getinfo('@3dtilesIndex1@').comment, 'Index comment forbidden')
        expected=[]
        raw = path.read_bytes()
        for name in names[:-1]:
            require(not name.startswith('/') and '..' not in PurePosixPath(name).parts and '.3tz' not in name and '\\' not in name, 'Unsafe archive path')
            info = z.getinfo(name)
            require(z.read(name)==(base/name).read_bytes(), f'Archived bytes changed: {name}')
            require(raw[info.header_offset:info.header_offset+4]==b'PK\x03\x04', 'Invalid local-header offset')
            crc, compressed, expanded = struct.unpack_from('<III',raw,info.header_offset+14)
            require((crc,compressed,expanded)==(info.CRC,info.compress_size,info.file_size), 'Local-header sizes/CRC absent')
            expected.append((hashlib.md5(name.encode(),usedforsecurity=False).digest(),info.header_offset))
        expected.sort(key=lambda v:struct.unpack('<QQ',v[0]))
        index=b''.join(h+struct.pack('<Q',offset) for h,offset in expected)
        require(z.read('@3dtilesIndex1@')==index, '3TZ index hash/order/offset mismatch')
        return {'entries':len(names),'indexEntries':len(expected),'crcChecked':True,'indexChecked':True}


def main() -> int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--directory',type=Path,default=DEFAULT)
    p.add_argument('--allow-missing-compressed',action='store_true')
    p.add_argument('--report',type=Path)
    p.add_argument('--range-smoke',action='store_true',help='Exercise actual HTTP 206 on loopback, not the renderer')
    args=p.parse_args()
    root=args.directory.resolve()
    report={'status':'failed','scope':'Fixture validation only; no renderer/browser suite', 'checks':{},'missing':[]}
    try:
        manifest=json_read(root/'manifest.json')
        require(manifest['license']=='MIT','Incorrect sample license')
        expected_points=manifest['pointCount']
        require(isinstance(expected_points,int) and 4 <= expected_points <= 254*254,'Invalid pointCount')
        seen=set()
        for entry in manifest['files']:
            name=entry['path']
            require(name not in seen,'Duplicate manifest path')
            seen.add(name)
            file=inside(root,root/'manifest.json',name)
            data=file.read_bytes()
            require(len(data)==entry['bytes'],'Size mismatch: '+name)
            require(hashlib.sha256(data).hexdigest()==entry['sha256'],'SHA256 mismatch: '+name)
            require(not data.startswith(b'version https://git-lfs.github.com/spec/'),'LFS pointer: '+name)
        report['checks']['manifest']={'files':len(seen),'allSha256Match':True,'lfsPointers':0}
        report['checks']['las']=verify_las(root/'terrain.las', expected_points)
        expected_rgb=None
        for name,geo,cog in [('ordinary.tiff',False,False),('geotiff-striped.tif',True,False),('imagery-overviews.cog.tif',True,True)]:
            with tifffile.TiffFile(root/name) as t:
                require(bool(set(t.pages[0].tags.keys()) & GEO_TAGS)==geo,'Incorrect TIFF/GeoTIFF classification')
            with rasterio.open(root/name) as ds:
                rgb=ds.read()
                require(rgb.shape==(3,512,512),'Incorrect raster dimensions')
                if expected_rgb is None: expected_rgb=rgb
                else: require(np.array_equal(rgb,expected_rgb),'Raster pixel mismatch')
                if geo: require(ds.crs.to_epsg()==32632,'Incorrect raster CRS')
                if cog:
                    require(ds.is_tiled and ds.overviews(1)==[2,4,8],'Missing COG tiles/overviews')
                    require(ds.tags(ns='IMAGE_STRUCTURE').get('LAYOUT')=='COG','Missing COG layout metadata')
                    for factor in [2,4,8]:
                        arr=ds.read(out_shape=(3,512//factor,512//factor))
                        require(arr.shape==(3,512//factor,512//factor),'Overview read failed')
                else: require(not ds.is_tiled and not ds.overviews(1),'Expected strips and no overviews')
                report['checks'][name]={'size':[512,512],'bands':3,'crs':str(ds.crs),'overviews':ds.overviews(1),'pixelsRead':int(rgb.size)}
        for name in ['building.city.json','building-textured.city.json']:
            report['checks'][name]=verify_cityjson(root/name,root)
        report['checks']['tiles3d']=verify_tiles(root/'tiles3d')
        report['checks']['3tz']=verify_3tz(root/'building-indexed.3tz',root/'tiles3d')
        require((root/'building.3dtiles.zip').read_bytes()==(root/'building-indexed.3tz').read_bytes(),'Alias bytes differ')
        report['checks']['3dtiles.zip']={'identicalToIndexedArchive':True}
        from geo3d_compressed_samples import REQUIRED, STREAMING_GRID_SIZE, verify_compressed, verify_http_ranges
        import importlib.util
        import tempfile
        require(manifest['requiredCompressedSamples']==REQUIRED, 'Required compressed-sample list is stale')
        require(manifest['streamingPointCount']==STREAMING_GRID_SIZE**2, 'Invalid streaming point count')
        spec=importlib.util.spec_from_file_location('geo3d_generator',Path(__file__).with_name('generate-geo3d-samples.py'))
        generator=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(generator)
        with tempfile.TemporaryDirectory() as td:
            streaming_source=Path(td)/'streaming.las'
            generator.make_las(streaming_source, STREAMING_GRID_SIZE)
            for name in REQUIRED:
                if not (root/name).is_file():
                    report['missing'].append(name)
                    continue
                require(name in seen, 'Compressed sample absent from manifest: '+name)
                source=streaming_source if name=='streaming.copc.laz' else root/'terrain.las'
                report['checks'][name]=verify_compressed(root/name,source)
            if args.range_smoke:
                require((root/'streaming.copc.laz').is_file(), 'Missing streaming fixture')
                report['checks']['httpRanges']=verify_http_ranges(root/'streaming.copc.laz',streaming_source)
        require(report['missing']==manifest['missingCompressedSamples'],'Manifest missing-sample status is stale')
        if report['missing'] and not args.allow_missing_compressed:
            raise ValueError('Missing real compressed samples: '+', '.join(report['missing']))
        report['status']='partial' if report['missing'] else 'passed'
    except Exception as exc:
        report['error']=str(exc)
    text=json.dumps(report,indent=2)+'\n'
    print(text,end='')
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(text,encoding='utf-8')
    return 1 if report['status']=='failed' else 0

if __name__=='__main__':
    sys.exit(main())
