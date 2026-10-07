#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Fixture-tool regression tests, independent of the File Viewer test suite."""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest

from geo3d_compressed_samples import (
    REQUIRED, STREAMING_GRID_SIZE, hierarchy, parse, verify_compressed,
    verify_http_ranges, write_compressed,
)

HERE = Path(__file__).resolve().parent
SAMPLES = HERE.parent / 'test/fixtures/geo3d/samples-mit'
spec = importlib.util.spec_from_file_location('geo3d_generator', HERE / 'generate-geo3d-samples.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class CompressedSamples(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.out = Path(self.tmp.name)

    def cli(self, directory: Path, *args: str) -> tuple[int, dict]:
        completed = subprocess.run(
            [sys.executable, str(HERE / 'verify-geo3d-samples.py'), '--directory', str(directory), *args],
            check=False, capture_output=True, text=True, timeout=30,
        )
        return completed.returncode, json.loads(completed.stdout)

    def copy_samples(self) -> Path:
        dest = self.out / 'samples'
        shutil.copytree(SAMPLES, dest)
        return dest

    def manifest(self, directory: Path) -> tuple[Path, dict]:
        path = directory / 'manifest.json'
        return path, json.loads(path.read_text())

    def test_01_full_strict_verifier(self) -> None:
        code, report = self.cli(SAMPLES)
        self.assertEqual(code, 0, report)
        self.assertEqual(report['status'], 'passed')
        self.assertEqual(report['missing'], [])

    def test_02_all_record_bytes_and_spatial_nodes(self) -> None:
        for name in REQUIRED[:2]:
            with self.subTest(name=name):
                report = verify_compressed(SAMPLES / name, SAMPLES / 'terrain.las')
                self.assertEqual(report['pointsDecoded'], 256)
                self.assertTrue(report['allRecordBytesPreserved'])
        tree = hierarchy((SAMPLES / 'streaming.copc.laz').read_bytes())
        self.assertEqual(tree['header']['count'], STREAMING_GRID_SIZE ** 2)
        self.assertGreaterEqual(len(tree['nodes']), 64)
        self.assertGreaterEqual(len(tree['pages']), 2)
        self.assertEqual(max(key[0] for key in tree['nodes']), 3)

    def test_03_byte_identical_regeneration(self) -> None:
        for name in REQUIRED[:2]:
            write_compressed(SAMPLES / 'terrain.las', self.out / name, copc='.copc.' in name)
            self.assertEqual((self.out / name).read_bytes(), (SAMPLES / name).read_bytes())
        source = self.out / 'streaming.las'
        generator.make_las(source, STREAMING_GRID_SIZE)
        write_compressed(source, self.out / REQUIRED[2], copc=True, depth=3)
        self.assertEqual((self.out / REQUIRED[2]).read_bytes(), (SAMPLES / REQUIRED[2]).read_bytes())

    def test_04_real_http_ranges(self) -> None:
        source = self.out / 'streaming.las'
        generator.make_las(source, STREAMING_GRID_SIZE)
        report = verify_http_ranges(SAMPLES / REQUIRED[2], source)
        self.assertEqual(report['status'], 'passed')
        self.assertEqual(report['fullFileRequests'], 0)
        self.assertLess(report['transferredPercent'], 25)
        self.assertGreater(report['pointsDecoded'], 0)

    def test_05_missing_payload_fails_even_after_manifest_edit(self) -> None:
        dest = self.copy_samples()
        (dest / 'terrain.laz').unlink()
        path, manifest = self.manifest(dest)
        manifest['files'] = [entry for entry in manifest['files'] if entry['path'] != 'terrain.laz']
        manifest['missingCompressedSamples'] = ['terrain.laz']
        path.write_text(json.dumps(manifest))
        code, report = self.cli(dest)
        self.assertEqual(code, 1)
        self.assertEqual(report['status'], 'failed')
        self.assertIn('Missing real compressed samples', report['error'])
        code, report = self.cli(dest, '--allow-missing-compressed')
        self.assertEqual(code, 0)
        self.assertEqual(report['status'], 'partial')

    def test_06_compressed_sample_must_be_in_manifest(self) -> None:
        dest = self.copy_samples()
        path, manifest = self.manifest(dest)
        manifest['files'] = [entry for entry in manifest['files'] if entry['path'] != 'terrain.laz']
        path.write_text(json.dumps(manifest))
        code, report = self.cli(dest)
        self.assertEqual(code, 1)
        self.assertIn('absent from manifest', report['error'])

    def test_07_damaged_point_payload_is_not_just_header_checked(self) -> None:
        data = bytearray((SAMPLES / 'terrain.copc.laz').read_bytes())
        tree = hierarchy(data)
        start, _, _ = tree['nodes'][(0, 0, 0, 0)]
        data[start] ^= 1  # Change a real point byte, without changing the valid header.
        path = self.out / 'damaged.copc.laz'
        path.write_bytes(data)
        with self.assertRaises(Exception):
            verify_compressed(path, SAMPLES / 'terrain.las')

    def test_08_truncated_hierarchy_fails(self) -> None:
        with self.assertRaises(ValueError):
            hierarchy((SAMPLES / 'terrain.copc.laz').read_bytes()[:-1])

    def test_09_out_of_bounds_hierarchy_fails(self) -> None:
        data = bytearray((SAMPLES / 'terrain.copc.laz').read_bytes())
        struct.pack_into('<Q', data, 469, len(data) + 1024)
        with self.assertRaisesRegex(ValueError, 'out of bounds'):
            hierarchy(data)

    def test_10_cyclic_hierarchy_fails(self) -> None:
        data = bytearray((SAMPLES / 'terrain.copc.laz').read_bytes())
        tree = hierarchy(data)
        # First child is a page reference; redirect it back to the root page.
        struct.pack_into('<Qi', data, tree['root_offset'] + 32 + 16, tree['root_offset'], tree['root_size'])
        with self.assertRaisesRegex(ValueError, 'Cyclic/repeated'):
            hierarchy(data)

    def test_11_required_streaming_sample_cannot_be_dropped(self) -> None:
        dest = self.copy_samples()
        path, manifest = self.manifest(dest)
        manifest['requiredCompressedSamples'] = REQUIRED[:2]
        path.write_text(json.dumps(manifest))
        code, report = self.cli(dest)
        self.assertEqual(code, 1)
        self.assertIn('Required compressed-sample list', report['error'])

    def test_12_invalid_streaming_point_count_fails(self) -> None:
        dest = self.copy_samples()
        path, manifest = self.manifest(dest)
        manifest['streamingPointCount'] = 0
        path.write_text(json.dumps(manifest))
        code, report = self.cli(dest)
        self.assertEqual(code, 1)
        self.assertIn('Invalid streaming point count', report['error'])

    def test_13_stale_missing_list_fails(self) -> None:
        dest = self.copy_samples()
        path, manifest = self.manifest(dest)
        manifest['missingCompressedSamples'] = ['terrain.laz']
        path.write_text(json.dumps(manifest))
        code, report = self.cli(dest)
        self.assertEqual(code, 1)
        self.assertIn('missing-sample status is stale', report['error'])

    def test_14_non_grid_source_is_rejected(self) -> None:
        data = bytearray((SAMPLES / 'terrain.las').read_bytes())
        point_offset = parse(data)['offset']
        data[point_offset] ^= 1
        path = self.out / 'not-the-grid.las'
        path.write_bytes(data)
        with self.assertRaisesRegex(ValueError, 'Not the synthetic grid'):
            write_compressed(path, self.out / 'not-produced.copc.laz', copc=True)
        self.assertFalse((self.out / 'not-produced.copc.laz').exists())


class ElevationRasterization(unittest.TestCase):
    """The explicit preprocessing alternative is exercised, not merely documented."""
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.out = Path(self.tmp.name)
        spec = importlib.util.spec_from_file_location('geo3d_rasterize', HERE / 'preprocess-geo3d.py')
        self.tool = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.tool)

    def test_15_las_and_laz_produce_identical_real_cog_pixels(self) -> None:
        import numpy as np
        import rasterio
        arrays = []
        for extension in ['las', 'laz', 'copc.laz']:
            path = self.out / (extension + '.tif')
            report = self.tool.rasterize(SAMPLES / ('terrain.' + extension), path, 1, 'mean')
            self.assertEqual(report['sourcePoints'], 256)
            self.assertFalse(report['losslessPointCloudConversion'])
            with rasterio.open(path) as ds:
                self.assertEqual(ds.crs.to_epsg(), 32632)
                self.assertEqual(ds.tags(ns='IMAGE_STRUCTURE').get('LAYOUT'), 'COG')
                self.assertTrue(ds.is_tiled)
                self.assertTrue(ds.overviews(1))
                arrays.append(ds.read(1))
        for array in arrays[1:]:
            np.testing.assert_array_equal(arrays[0], array)
        self.assertEqual(arrays[0].shape, (16, 16))

    def test_16_explicit_min_max_mean_aggregation(self) -> None:
        import numpy as np
        import rasterio
        import math
        z = [round((100 + 6 * math.sin(x / 10) * math.cos(y / 12) + .1 * x) * 100) / 100
             for y in range(16) for x in range(16)]
        for method, expected in [('min', min(z)), ('max', max(z)), ('mean', np.mean(z))]:
            path = self.out / (method + '.tif')
            report = self.tool.rasterize(SAMPLES / 'terrain.laz', path, 100, method)
            self.assertEqual(report['populatedCells'], 1)
            with rasterio.open(path) as ds:
                self.assertAlmostEqual(float(ds.read(1)[0, 0]), float(expected), places=4)

    def test_17_cell_budget_and_invalid_resolution_fail_before_output(self) -> None:
        path = self.out / 'not-produced.tif'
        with self.assertRaisesRegex(ValueError, 'max_cells'):
            self.tool.rasterize(SAMPLES / 'terrain.las', path, .001, 'mean', max_cells=100)
        for resolution in [0, -1, float('nan'), float('inf')]:
            with self.subTest(resolution=resolution), self.assertRaises(ValueError):
                self.tool.rasterize(SAMPLES / 'terrain.laz', path, resolution, 'mean')
        self.assertFalse(path.exists())

    def test_18_source_and_existing_output_are_preserved(self) -> None:
        source = self.out / 'input.las'
        shutil.copyfile(SAMPLES / 'terrain.las', source)
        original = source.read_bytes()
        with self.assertRaises(ValueError):
            self.tool.rasterize(source, source, 1, 'mean', overwrite=True)
        output = self.out / 'existing.tif'
        output.write_bytes(b'user-owned')
        with self.assertRaises(ValueError):
            self.tool.rasterize(source, output, 1, 'mean')
        self.assertEqual(output.read_bytes(), b'user-owned')
        self.assertEqual(source.read_bytes(), original)

    def test_19_non_projected_crs_and_truncated_points_fail(self) -> None:
        with self.assertRaisesRegex(ValueError, 'projected'):
            self.tool.rasterize(SAMPLES / 'terrain.laz', self.out / 'bad-crs.tif', 1, 'mean', crs='EPSG:4326')
        path = self.out / 'truncated.las'
        path.write_bytes((SAMPLES / 'terrain.las').read_bytes()[:-1])
        with self.assertRaisesRegex(ValueError, 'Truncated'):
            self.tool.rasterize(path, self.out / 'bad-points.tif', 1, 'mean')
        self.assertFalse((self.out / 'bad-crs.tif').exists())
        self.assertFalse((self.out / 'bad-points.tif').exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
