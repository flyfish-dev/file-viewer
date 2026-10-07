#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Restore original sample bytes without replacing any compact fixture.

Expected hashes come from the original deliveries, not the generated outputs.
This command never downloads data or installs software.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.shutil import copy as rio_copy
from rasterio.transform import from_origin
import tifffile
from geo3d_compressed_samples import write_compressed, verify_compressed, verify_http_ranges

HERE = Path(__file__).resolve().parent
EXPECTED = {
    'terrain-4096.las': (148482, '4c535093b94f60922ad807f4ba72a1a534e702655434026c54b807db9d6f2b17'),
    'ordinary-original.tiff': (786848, 'e9a4e89c4e2c98b183fa4d07e5c332d7d11bfde4061a8f576144567e96637347'),
    'geotiff-striped-original.tif': (279550, '74b7ad2dbeb590730aae3a0fa25ce27300a7f24b30525926f47fb729a88e313f'),
    'imagery-overviews-original.cog.tif': (748329, '136ae93cd99b1a1f10c9c7448ee538df9f9a347bae37805735a4d99527ab0f1d'),
    'streaming-16384.copc.laz': (145393, 'a9a0854230fbfeae0fa9e1b67334d2f115e9538160a09d3f3d67b561dd5be0f3'),
}

def generator():
    spec = importlib.util.spec_from_file_location('original_grid', HERE / 'generate-geo3d-samples.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def inspect(directory: Path) -> dict:
    files = []
    for name, (size, digest) in EXPECTED.items():
        data = (directory / name).read_bytes()
        if len(data) != size or hashlib.sha256(data).hexdigest() != digest:
            raise ValueError(f'Original-delivery hash mismatch: {name}')
        files.append({'path': name, 'bytes': size, 'sha256': digest,
                      'gitBlobSha': hashlib.sha1(f'blob {size}\0'.encode() + data).hexdigest()})
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / 'streaming.las'
        generator().make_las(source, 128)
        compressed = verify_compressed(directory / 'streaming-16384.copc.laz', source)
        ranges = verify_http_ranges(directory / 'streaming-16384.copc.laz', source)
    y, x = np.mgrid[:512, :512]
    rgb = np.stack(((x % 256).astype('uint8'), (y % 256).astype('uint8'),
                    (((x // 32 + y // 32) % 2) * 180 + 40).astype('uint8')))
    for name in ['ordinary-original.tiff', 'geotiff-striped-original.tif', 'imagery-overviews-original.cog.tif']:
        with rasterio.open(directory / name) as image:
            if not np.array_equal(image.read(), rgb):
                raise ValueError(f'Original raster pixels differ: {name}')
            if name == 'ordinary-original.tiff':
                if image.crs is not None:
                    raise ValueError('Ordinary TIFF gained geographic metadata')
            elif image.crs.to_epsg() != 32632:
                raise ValueError('Original raster CRS changed')
            if name.endswith('.cog.tif') and image.overviews(1) != [2, 4, 8]:
                raise ValueError('Original COG overviews changed')
    return {'status': 'passed', 'files': files, 'compressed': compressed, 'ranges': ranges}

def restore(output: Path) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp)
        gen = generator()
        gen.make_las(stage / 'terrain-4096.las', 64)
        gen.make_las(stage / 'streaming-source.las', 128)
        write_compressed(stage / 'streaming-source.las', stage / 'streaming-16384.copc.laz', copc=True, depth=3)
        y, x = np.mgrid[:512, :512]
        rgb = np.stack(((x % 256).astype('uint8'), (y % 256).astype('uint8'),
                        (((x // 32 + y // 32) % 2) * 180 + 40).astype('uint8')))
        tifffile.imwrite(stage / 'ordinary-original.tiff', rgb.transpose(1, 2, 0),
                         photometric='rgb', metadata=None, rowsperstrip=16)
        profile = dict(driver='GTiff', width=512, height=512, count=3, dtype='uint8',
                       crs='EPSG:32632', transform=from_origin(500000, 5100512, 1, 1),
                       photometric='RGB', compress='DEFLATE')
        with rasterio.open(stage / 'geotiff-striped-original.tif', 'w', **profile, tiled=False, blockysize=16) as image:
            image.write(rgb)
        source = stage / 'cog-source.tif'
        with rasterio.open(source, 'w', **profile, tiled=True, blockxsize=128, blockysize=128) as image:
            image.write(rgb)
            image.build_overviews([2, 4, 8], Resampling.nearest)
            image.update_tags(ns='rio_overview', resampling='nearest')
        rio_copy(source, stage / 'imagery-overviews-original.cog.tif', driver='COG',
                 BLOCKSIZE=128, COMPRESS='DEFLATE', OVERVIEWS='FORCE_USE_EXISTING', RESAMPLING='NEAREST')
        report = inspect(stage)
        output.mkdir(parents=True, exist_ok=True)
        for name in EXPECTED:
            target = output / name
            if target.is_symlink() or (target.exists() and target.read_bytes() != (stage / name).read_bytes()):
                raise ValueError(f'Refusing to replace nonmatching output: {target}')
        for name in EXPECTED:
            target = output / name
            if not target.exists():
                with target.open('xb') as destination:
                    destination.write((stage / name).read_bytes())
        return report

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    report = inspect(args.output) if args.verify_only else restore(args.output)
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
