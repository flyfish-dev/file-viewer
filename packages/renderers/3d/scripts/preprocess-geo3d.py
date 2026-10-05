#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Explicit, offline LAS/LAZ-to-COG elevation rasterization.

This is a development/preprocessing command, NOT a browser renderer and NOT a
lossless point-cloud conversion. Resolution and Z aggregation must be selected
explicitly. COPC remains the lossless cloud-oriented preprocessing alternative.
Uses the adjacent development requirements; never installs software or downloads
a dataset. Point records are processed in bounded chunks and output cells are
capped before allocation.
"""
from __future__ import annotations
import argparse
import json
import math
import os
from pathlib import Path
import struct
import tempfile
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.shutil import copy as rio_copy
from rasterio.transform import from_origin

MAX_HEADER = 4 * 1024 * 1024
CHUNK_POINTS = 65536
MAX_POINT_CHUNK_BYTES = 8 * 1024 * 1024
MIN_RECORD = [20, 28, 26, 34, 57, 63, 30, 36, 38, 59, 67]


def header(stream, file_size: int, explicit_crs: str | None) -> dict:
    raw = stream.read(375)
    if len(raw) < 227 or raw[:4] != b'LASF' or raw[24] != 1 or raw[25] > 4:
        raise ValueError('Expected LAS 1.0-1.4 / LAZ, not a renamed raster or an unsupported LAS version')
    minor = raw[25]
    header_size, point_offset, vlr_count = struct.unpack_from('<HII', raw, 94)
    fmt, stride = struct.unpack_from('<BH', raw, 104)
    if header_size < 227 or not header_size <= point_offset <= min(file_size, MAX_HEADER) or vlr_count > 4096:
        raise ValueError('LAS header/VLR bounds exceed the preprocessing limit')
    point_format = fmt & 63
    if point_format > 10 or stride < MIN_RECORD[point_format]:
        raise ValueError('Invalid or unsupported LAS point record layout')
    if minor == 4 and (len(raw) < 375 or header_size < 375):
        raise ValueError('Truncated LAS 1.4 header')
    count = struct.unpack_from('<Q', raw, 247)[0] if minor == 4 else struct.unpack_from('<I', raw, 107)[0]
    if not count:
        raise ValueError('No point records to rasterize')
    scale = np.array(struct.unpack_from('<3d', raw, 131))
    offset = np.array(struct.unpack_from('<3d', raw, 155))
    bounds = np.array(struct.unpack_from('<6d', raw, 179))
    if not np.isfinite(np.r_[scale, offset, bounds]).all() or (scale <= 0).any():
        raise ValueError('Non-finite/invalid LAS coordinates or scale')
    vlrs = {}
    stream.seek(header_size)
    for _ in range(vlr_count):
        if stream.tell() + 54 > point_offset:
            raise ValueError('Truncated LAS VLR header')
        _, user, rid, size, _ = struct.unpack('<H16sHH32s', stream.read(54))
        if stream.tell() + size > point_offset:
            raise ValueError('LAS VLR crosses the point data offset')
        key = (user.rstrip(b'\0'), rid)
        if key in vlrs:
            raise ValueError('Duplicate LAS VLR identity')
        vlrs[key] = stream.read(size)
    crs = rasterio.crs.CRS.from_user_input(explicit_crs) if explicit_crs else None
    if crs is None:
        wkt = vlrs.get((b'LASF_Projection', 2112))
        if wkt:
            crs = rasterio.crs.CRS.from_wkt(wkt.rstrip(b'\0').decode('utf-8'))
        else:
            geokeys = vlrs.get((b'LASF_Projection', 34735), b'')
            if len(geokeys) >= 8 and len(geokeys) % 2 == 0:
                values = struct.unpack('<' + 'H' * (len(geokeys) // 2), geokeys)
                keys = {}
                for i in range(min(values[3], (len(values) - 4) // 4)):
                    key, location, n, value = values[4 + i * 4:8 + i * 4]
                    if location == 0 and n == 1 and 0 < value < 32767:
                        keys[key] = value
                code = keys.get(3072, keys.get(2048))
                if code:
                    crs = rasterio.crs.CRS.from_epsg(code)
    if crs is None or not crs.is_projected:
        raise ValueError('A projected source CRS is required; use --crs only to supply missing/correct source metadata, not to reproject')
    compressed = bool(fmt & 128)
    if compressed and (b'laszip encoded', 22204) not in vlrs:
        raise ValueError('Compressed LAS is missing its LASzip VLR')
    if not compressed and point_offset + count * stride > file_size:
        raise ValueError('Truncated LAS point payload')
    stream.seek(point_offset)
    return dict(count=count, stride=stride, compressed=compressed, vlrs=vlrs, scale=scale, offset=offset, bounds=bounds, crs=crs)


def rasterize(source: Path, destination: Path, resolution: float, aggregation: str,
              crs: str | None = None, max_cells: int = 4_000_000, overwrite: bool = False) -> dict:
    if not math.isfinite(resolution) or resolution <= 0:
        raise ValueError('resolution must be finite and positive, in source CRS units')
    if aggregation not in {'min', 'max', 'mean'}:
        raise ValueError('aggregation must be min, max, or mean')
    if not isinstance(max_cells, int) or not 1 <= max_cells <= 16_000_000:
        raise ValueError('max_cells must be within 1..16000000')
    source, destination = source.resolve(), destination.resolve()
    if source == destination or (destination.exists() and not overwrite):
        raise ValueError('Output already exists or would replace the source; choose another output path')
    with source.open('rb') as stream:
        h = header(stream, source.stat().st_size, crs)
        max_x, min_x, max_y, min_y, _, _ = h['bounds']
        if max_x < min_x or max_y < min_y:
            raise ValueError('LAS bounds are inverted')
        width = math.floor((max_x - min_x) / resolution) + 1
        height = math.floor((max_y - min_y) / resolution) + 1
        cells = width * height
        if cells > max_cells:
            raise ValueError(f'Output grid {width}x{height} exceeds max_cells={max_cells}; choose an explicit coarser resolution')
        counts = np.zeros(cells, dtype=np.uint64)
        values = np.full(cells, math.inf if aggregation == 'min' else -math.inf if aggregation == 'max' else 0, dtype=np.float64)
        dtype = np.dtype({'names':['x','y','z'], 'formats':['<i4']*3, 'offsets':[0,4,8], 'itemsize':h['stride']})
        decompressor = None
        if h['compressed']:
            import lazrs  # Only the explicit LAZ preprocessing path needs this codec.
            decompressor = lazrs.LasZipDecompressor(stream, h['vlrs'][(b'laszip encoded', 22204)])
        processed = 0
        while processed < h['count']:
            n = min(CHUNK_POINTS, MAX_POINT_CHUNK_BYTES // h['stride'], h['count'] - processed)
            if decompressor:
                data = bytearray(n * h['stride'])
                decompressor.decompress_many(data)
            else:
                data = stream.read(n * h['stride'])
                if len(data) != n * h['stride']:
                    raise ValueError('Truncated LAS point records')
            points = np.frombuffer(data, dtype=dtype)
            xyz = np.column_stack([points[k] for k in ['x','y','z']]) * h['scale'] + h['offset']
            x, y, z = xyz.T
            if not np.isfinite(xyz).all() or (x < min_x - 1e-7).any() or (x > max_x + 1e-7).any() or (y < min_y - 1e-7).any() or (y > max_y + 1e-7).any():
                raise ValueError('Point coordinates disagree with the declared LAS bounds')
            # The grid is anchored on minimum X and maximum Y. The last edge is
            # clamped only for floating point round-off, not for invalid points.
            columns = np.floor((x-min_x)/resolution).astype(np.int64)
            rows = np.floor((max_y-y)/resolution).astype(np.int64)
            indices = np.clip(rows,0,height-1)*width + np.clip(columns,0,width-1)
            np.add.at(counts, indices, 1)
            if aggregation == 'min': np.minimum.at(values, indices, z)
            elif aggregation == 'max': np.maximum.at(values, indices, z)
            else: np.add.at(values, indices, z)
            processed += n
        populated = counts > 0
        if aggregation == 'mean': values[populated] /= counts[populated]
        values[~populated] = np.nan
        pixels = values.astype(np.float32).reshape(height, width)
        if not np.isfinite(pixels.ravel()[populated]).all():
            raise ValueError('Elevation values cannot be represented by the output float32 raster')
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.geo3d-cog-', dir=destination.parent) as td:
            tmp = Path(td)
            with rasterio.open(tmp/'source.tif','w',driver='GTiff',width=width,height=height,count=1,dtype='float32',nodata=np.nan,
                               crs=h['crs'],transform=from_origin(min_x,max_y,resolution,resolution)) as ds:
                ds.write(pixels,1)
                factors = [f for f in [2,4,8,16,32] if min(width,height)//f >= 1]
                if factors: ds.build_overviews(factors,Resampling.nearest)
                ds.update_tags(GEO3D_DERIVATION='LAS/LAZ Z rasterization; not a point cloud',GEO3D_AGGREGATION=aggregation)
            rio_copy(tmp/'source.tif',tmp/'output.tif',driver='COG',BLOCKSIZE=128,COMPRESS='DEFLATE',OVERVIEWS='FORCE_USE_EXISTING')
            with rasterio.open(tmp/'output.tif') as ds:
                if ds.tags(ns='IMAGE_STRUCTURE').get('LAYOUT') != 'COG' or ds.crs != h['crs'] or not np.array_equal(ds.read(1),pixels,equal_nan=True):
                    raise ValueError('Generated COG failed its read-back verification')
            if destination.exists() and not overwrite:
                raise ValueError('Output appeared during preprocessing; refusing to replace it')
            if overwrite:
                os.replace(tmp/'output.tif', destination)
            else:
                # Same-directory hard link is an atomic create-without-replace.
                # A concurrent destination creator cannot lose its file.
                os.link(tmp/'output.tif', destination)
    return dict(status='passed',sourcePoints=processed,width=width,height=height,populatedCells=int(populated.sum()),crs=str(h['crs']),
                resolution=resolution,aggregation=aggregation,target='COG elevation raster',losslessPointCloudConversion=False)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source',type=Path);p.add_argument('destination',type=Path)
    p.add_argument('--resolution',type=float,required=True)
    p.add_argument('--aggregation',choices=['min','max','mean'],required=True)
    p.add_argument('--crs');p.add_argument('--max-cells',type=int,default=4_000_000)
    p.add_argument('--overwrite',action='store_true')
    a = p.parse_args()
    try:
        report = rasterize(a.source,a.destination,a.resolution,a.aggregation,a.crs,a.max_cells,a.overwrite)
    except Exception as exc:
        print(json.dumps({'status':'failed','error':str(exc)}));return 1
    print(json.dumps(report));return 0

if __name__ == '__main__':
    raise SystemExit(main())
