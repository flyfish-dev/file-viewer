#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Generate synthetic Geo3D samples; never fetch data or install software.

Python dependencies are recorded in geo3d-samples-requirements.txt.
Pass --with-pdal explicitly to create actual compressed LAZ/COPC with a local
PDAL executable (legacy alternative). --with-lazrs regenerates the completed
fixture set, including a multi-level streaming COPC. No dummy files are made.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import zipfile
import zlib

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.shutil import copy as rio_copy
from rasterio.transform import from_origin
import tifffile

DEFAULT = Path(__file__).resolve().parent.parent / 'test/fixtures/geo3d/samples-mit'
N = 16
SIZE = 512
EPSG = 32632
LICENSE = '''MIT License

Copyright (c) 2026 File Viewer contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
'''


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def png_checker() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    raw = b''.join(b'\0' + b''.join(bytes((220, 180, 70) if (x // 4 + y // 4) % 2 else (50, 100, 180))
                                  for x in range(16)) for y in range(16))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 16, 16, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


def make_las(path: Path, n: int = N) -> None:
    """LAS 1.4 point format 7, WKT VLR, RGB/GPS/classification; no compression."""
    wkt = rasterio.crs.CRS.from_epsg(EPSG).to_wkt().encode('ascii') + b'\0'
    vlr = struct.pack('<H16sHH32s', 0, b'LASF_Projection', 2112, len(wkt), b'OGC WKT') + wkt
    points = []
    for y in range(n):
        for x in range(n):
            z = 100 + 6 * math.sin(x / 10) * math.cos(y / 12) + .1 * x
            points.append((x * 100, y * 100, round(z * 100), x, y))
    header = bytearray(375)
    header[:4] = b'LASF'
    struct.pack_into('<H', header, 6, 17)  # WKT + adjusted standard GPS time
    header[24:26] = bytes((1, 4))
    header[26:58] = b'File Viewer synthetic'.ljust(32, b'\0')
    header[58:90] = b'Geo3D fixture generator'.ljust(32, b'\0')
    struct.pack_into('<HHHII', header, 90, 1, 2026, 375, 375 + len(vlr), 1)
    struct.pack_into('<BH', header, 104, 7, 36)
    struct.pack_into('<3d', header, 131, .01, .01, .01)
    struct.pack_into('<3d', header, 155, 500000., 5100000., 0.)
    struct.pack_into('<6d', header, 179, 500000. + n - 1, 500000., 5100000. + n - 1, 5100000.,
                     max(p[2] for p in points) / 100, min(p[2] for p in points) / 100)
    struct.pack_into('<Q', header, 247, len(points))
    struct.pack_into('<Q', header, 255, len(points))  # return number 1
    with path.open('wb') as out:
        out.write(header)
        out.write(vlr)
        for i, (x, y, z, ix, iy) in enumerate(points):
            out.write(struct.pack('<iiiHBBBBhHdHHH', x, y, z, 1000 + i, 17, 0, 2, 0, 0, 1,
                                  1000000. + i / 100, round(ix * 65535 / (n - 1)),
                                  round(iy * 65535 / (n - 1)), 32768))


def make_rasters(out: Path) -> None:
    y, x = np.mgrid[:SIZE, :SIZE]
    rgb = np.stack(((x % 256).astype('uint8'), (y % 256).astype('uint8'),
                    (((x // 32 + y // 32) % 2) * 180 + 40).astype('uint8')))
    with rasterio.open(out / 'ordinary.tiff', 'w', driver='GTiff', width=SIZE, height=SIZE,
                       count=3, dtype='uint8', photometric='RGB', compress='DEFLATE',
                       predictor=2, tiled=False, blockysize=16) as ds:
        ds.write(rgb)
    profile = dict(driver='GTiff', width=SIZE, height=SIZE, count=3, dtype='uint8',
                   crs=f'EPSG:{EPSG}', transform=from_origin(500000, 5100512, 1, 1),
                   photometric='RGB', compress='DEFLATE', predictor=2)
    with rasterio.open(out / 'geotiff-striped.tif', 'w', **profile, tiled=False, blockysize=16) as ds:
        ds.write(rgb)
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / 'cog-source.tif'
        with rasterio.open(source, 'w', **profile, tiled=True, blockxsize=128, blockysize=128) as ds:
            ds.write(rgb)
            ds.build_overviews([2, 4, 8], Resampling.nearest)
            ds.update_tags(ns='rio_overview', resampling='nearest')
        rio_copy(source, out / 'imagery-overviews.cog.tif', driver='COG', BLOCKSIZE=128,
                 COMPRESS='DEFLATE', PREDICTOR='YES', OVERVIEWS='FORCE_USE_EXISTING', RESAMPLING='NEAREST')


def make_cityjson(out: Path, png: bytes) -> None:
    vertices = [[0,0,0],[1000,0,0],[1000,1000,0],[0,1000,0],
                [0,0,1000],[1000,0,1000],[1000,1000,1000],[0,1000,1000]]
    faces = [[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]]
    value = {'type':'CityJSON','version':'2.0',
             'transform':{'scale':[.01,.01,.01],'translate':[500000,5100000,100]},
             'metadata':{'referenceSystem':'https://www.opengis.net/def/crs/EPSG/0/32632',
                         'geographicalExtent':[500000,5100000,100,500010,5100010,110]},
             'CityObjects':{'synthetic-building':{'type':'Building','geometry':[
                 {'type':'Solid','lod':'1','boundaries':[[[face] for face in faces]]}]}},
             'vertices':vertices}
    write_json(out / 'building.city.json', value)
    geometry = value['CityObjects']['synthetic-building']['geometry'][0]
    geometry['texture'] = {'checker':{'values':[[[[0,0,1,2,3]] for _ in faces]]}}
    value['appearance'] = {'textures':[{'type':'PNG','image':'textures/checker.png','wrapMode':'wrap'}],
                           'vertices-texture':[[0,0],[1,0],[1,1],[0,1]]}
    write_json(out / 'building-textured.city.json', value)
    (out / 'textures').mkdir(exist_ok=True)
    (out / 'textures/checker.png').write_bytes(png)


def make_tiles(out: Path, png: bytes) -> None:
    base = out / 'tiles3d'
    (base / 'models/buffers').mkdir(parents=True, exist_ok=True)
    (base / 'textures').mkdir(exist_ok=True)
    (base / 'textures/checker.png').write_bytes(png)
    corners = [[-5,0,-5],[5,0,-5],[5,0,5],[-5,0,5],[-5,10,-5],[5,10,-5],[5,10,5],[-5,10,5]]
    quads = [[0,1,2,3],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[4,7,6,5]]
    positions = [corners[j] for face in quads for j in face]
    uvs = [[0,0],[1,0],[1,1],[0,1]] * 6
    indices = [i*4+j for i in range(6) for j in [0,1,2,0,2,3]]
    pos = b''.join(struct.pack('<3f', *p) for p in positions)
    uv = b''.join(struct.pack('<2f', *p) for p in uvs)
    idx = struct.pack('<' + 'H'*len(indices), *indices)
    binary = pos + uv + idx
    (base / 'models/buffers/building.bin').write_bytes(binary)
    write_json(base / 'models/building.gltf', {
        'asset':{'version':'2.0','generator':'File Viewer synthetic MIT fixture'},
        'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0}],
        'meshes':[{'primitives':[{'attributes':{'POSITION':0,'TEXCOORD_0':1},'indices':2,'material':0}]}],
        'materials':[{'doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1}}],
        'textures':[{'source':0}],'images':[{'uri':'../textures/checker.png'}],
        'buffers':[{'uri':'buffers/building.bin','byteLength':len(binary)}],
        'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(pos),'target':34962},
                       {'buffer':0,'byteOffset':len(pos),'byteLength':len(uv),'target':34962},
                       {'buffer':0,'byteOffset':len(pos)+len(uv),'byteLength':len(idx),'target':34963}],
        'accessors':[{'bufferView':0,'componentType':5126,'count':24,'type':'VEC3','min':[-5,0,-5],'max':[5,10,5]},
                     {'bufferView':1,'componentType':5126,'count':24,'type':'VEC2'},
                     {'bufferView':2,'componentType':5123,'count':36,'type':'SCALAR'}]})
    box = {'box':[0,0,5,5,0,0,0,5,0,0,0,5]}
    # ENU axes at a synthetic equatorial WGS84 origin (not a real survey).
    transform = [0,1,0,0,0,0,1,0,1,0,0,0,6378137,0,0,1]
    write_json(base / 'tileset.json', {'asset':{'version':'1.1'},'geometricError':64,
        'root':{'boundingVolume':box,'transform':transform,'geometricError':32,'refine':'REPLACE',
                'content':{'uri':'nested/tileset.json'}}})
    write_json(base / 'nested/tileset.json', {'asset':{'version':'1.1'},'geometricError':0,
        'root':{'boundingVolume':box,'geometricError':0,'content':{'uri':'../models/building.gltf'}}})
    # 3TZ 1.3: stored index is final, MD5 order is two uint64 little-endian.
    with zipfile.ZipFile(out / 'building-indexed.3tz', 'w', compression=zipfile.ZIP_STORED) as archive:
        records = []
        paths = sorted(p for p in base.rglob('*') if p.is_file())
        paths.sort(key=lambda p: (p.relative_to(base).as_posix() != 'tileset.json', p.relative_to(base).as_posix()))
        for path in paths:
            name = path.relative_to(base).as_posix()
            info = zipfile.ZipInfo(name, date_time=(2026,1,1,0,0,0))
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
            records.append((hashlib.md5(name.encode(), usedforsecurity=False).digest(), archive.getinfo(name).header_offset))
        records.sort(key=lambda item: struct.unpack('<QQ', item[0]))
        index = b''.join(md5 + struct.pack('<Q', offset) for md5, offset in records)
        archive.writestr(zipfile.ZipInfo('@3dtilesIndex1@', date_time=(2026,1,1,0,0,0)), index)
    (out / 'building.3dtiles.zip').write_bytes((out / 'building-indexed.3tz').read_bytes())


def make_compressed(out: Path) -> None:
    pdal = shutil.which('pdal')
    if not pdal:
        raise RuntimeError('--with-pdal requires PDAL locally; no installation or network download is attempted')
    for filename, writer in [('terrain.laz','writers.las'), ('terrain.copc.laz','writers.copc')]:
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / filename
            stage = {'type':writer,'filename':str(target)}
            if writer == 'writers.las':
                stage.update({'compression':True,'minor_version':4,'dataformat_id':7})
            pipeline = {'pipeline':[{'type':'readers.las','filename':str(out / 'terrain.las')}, stage]}
            subprocess.run([pdal,'pipeline','--stdin'], input=json.dumps(pipeline), text=True, check=True, timeout=120)
            subprocess.run([pdal,'info','--summary',str(target)], check=True, capture_output=True, timeout=120)
            (out / filename).write_bytes(target.read_bytes())


def make_lazrs_compressed(out: Path) -> None:
    from geo3d_compressed_samples import write_compressed, STREAMING_GRID_SIZE
    write_compressed(out / 'terrain.las', out / 'terrain.laz', copc=False)
    write_compressed(out / 'terrain.las', out / 'terrain.copc.laz', copc=True)
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / 'streaming.las'
        make_las(source, STREAMING_GRID_SIZE)
        write_compressed(source, out / 'streaming.copc.laz', copc=True, depth=3)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT)
    compression = parser.add_mutually_exclusive_group()
    compression.add_argument('--with-pdal', action='store_true', help='Legacy PDAL terrain conversion only')
    compression.add_argument('--with-lazrs', action='store_true', help='Generate all three compressed fixtures offline')
    parser.add_argument('--compressed-only', action='store_true', help='Preserve existing non-compressed payloads; requires --with-lazrs')
    parser.add_argument('--grid-size', type=int, default=N, help='LAS grid side: 2..254 (default: 16)')
    args = parser.parse_args()
    if not 2 <= args.grid_size <= 254:
        parser.error('--grid-size must be between 2 and 254')
    if args.compressed_only and not args.with_lazrs:
        parser.error('--compressed-only requires --with-lazrs')
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if not args.compressed_only:
        (out / 'LICENSE').write_text(LICENSE, encoding='utf-8')
        make_las(out / 'terrain.las', args.grid_size)
        make_rasters(out)
        png = png_checker()
        make_cityjson(out, png)
        make_tiles(out, png)
    if args.with_pdal:
        make_compressed(out)
    if args.with_lazrs:
        make_lazrs_compressed(out)
    point_count = struct.unpack_from('<Q', (out / 'terrain.las').read_bytes(), 247)[0]
    required = ['terrain.laz', 'terrain.copc.laz', 'streaming.copc.laz']
    paths = sorted(p for p in out.rglob('*') if p.is_file() and p.name not in {'manifest.json','README.md'})
    manifest = {'schemaVersion':1,'license':'MIT','origin':'Synthetic, generated for File Viewer; no external dataset',
        'generator':'../../../../scripts/generate-geo3d-samples.py',
        'pointCount':point_count,
        'streamingPointCount':24 * 24,
        'compressedGenerator':'lazrs 0.8.2; deterministic COPC fixture layout' if args.with_lazrs else 'not regenerated',
        'requiredCompressedSamples':required,
        'missingCompressedSamples':[s for s in required if not (out/s).is_file()],
        'files':[{'path':p.relative_to(out).as_posix(),'bytes':p.stat().st_size,
                  'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]}
    write_json(out / 'manifest.json', manifest)
    print(json.dumps({'files':len(paths),'points':point_count,'missingCompressedSamples':manifest['missingCompressedSamples']}))

if __name__ == '__main__':
    main()
