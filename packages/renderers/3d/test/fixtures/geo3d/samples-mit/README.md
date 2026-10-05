# Synthetic MIT Geo3D samples

These are original synthetic fixtures, not samples copied from a survey or a
customer. The adjacent MIT LICENSE applies. Existing fixtures elsewhere in
geo3d retain their existing licenses.

**Both editions are now committed.** Compact samples remain in this directory;
all five original delivered binary variants are in
[original-deliveries/](./original-deliveries/README.md), including the
16,384-point COPC and 4,096-point LAS. No compact sample was replaced or reduced
when the originals were added.

## Compact samples

| Entry | Contents and purpose |
| --- | --- |
| terrain.las | LAS 1.4, point format 7, 256 distinct XYZ/RGB/GPS points, EPSG:32632. |
| terrain.laz | Real LAZ compression of all 256 records; 2,495 bytes. |
| terrain.copc.laz | Same 256 records, 29 chunks, three octree levels, eight hierarchy pages; 8,466 bytes. |
| streaming.copc.laz | 576 points, 75 chunks, four levels, eight hierarchy pages; 18,133 bytes. |
| ordinary.tiff | 512 x 512 RGB TIFF without geographic tags, for image fallback. |
| geotiff-striped.tif | Same pixels with EPSG:32632, strips and no overviews; not a COG. |
| imagery-overviews.cog.tif | Same pixels/CRS, 128 x 128 tiles and overview factors 2, 4, 8. |
| building.city.json | CityJSON 2.0 LoD 1 building, transform and projected CRS. |
| building-textured.city.json | Same building with an external PNG and UV coordinates. |
| tiles3d/tileset.json | Nested tileset, glTF, external binary buffer and PNG; serve the entire directory. |
| building-indexed.3tz | Full tiles3d archive with final, stored @3dtilesIndex1@ index. |
| building.3dtiles.zip | Byte-identical archive for alternate filename routing. |

Coordinates and placement are arbitrary, not surveyed places. These small
samples are not substitutes for production-scale performance benchmarks.

The compact LAS is a 16 x 16 grid and compact streaming COPC a 24 x 24 grid.
These editions are deliberately distinct from the original 64 x 64 LAS and
128 x 128 COPC now retained in original-deliveries. The compact raster encoding
is losslessly smaller; the original encodings are preserved byte for byte in
that subdirectory as well.

## Original delivered variants

| Entry under original-deliveries | Original bytes |
| --- | --- |
| terrain-4096.las | 148,482 bytes, 4,096 points. |
| streaming-16384.copc.laz | 145,393 bytes, 16,384 points, 132 chunks, nine hierarchy pages. |
| ordinary-original.tiff | 786,848 bytes. |
| geotiff-striped-original.tif | 279,550 bytes. |
| imagery-overviews-original.cog.tif | 748,329 bytes, overview factors 2, 4, 8. |

The parent manifest lists every original binary as well as compact payloads;
the original-deliveries manifest also records Git blob identities. Fixed original
SHA-256 values were verified after regeneration and after downloading the runner
artifact. These files are real payloads, not Git LFS pointers or header probes.

The separate legacy probe.copc.laz in the parent geo3d directory is only an
identifier/VLR test. It is not used as evidence of compressed-data rendering.

## Reproduce and validate

From the repository root in an isolated development environment:

```sh
python -m pip install -r packages/renderers/3d/scripts/geo3d-samples-requirements.txt
python packages/renderers/3d/scripts/generate-geo3d-samples.py --with-lazrs
python packages/renderers/3d/scripts/verify-geo3d-samples.py --range-smoke
python packages/renderers/3d/scripts/test-geo3d-compressed-samples.py
python packages/renderers/3d/scripts/restore-geo3d-originals.py \
  --output packages/renderers/3d/test/fixtures/geo3d/samples-mit/original-deliveries \
  --verify-only
```

Omit --verify-only from the final command to regenerate missing originals.
Their fixed hashes must match before any output is accepted; differing existing
files are not overwritten. That command does not replace the compact edition.

The generators do not download data or install tools. The pip command is an
explicit development setup step, not renderer behavior. Exact raster bytes
require the pinned environment, including rasterio 1.5.0 / GDAL 3.12.1. A
different GDAL build may change output encoding and fail an original-hash check.

To regenerate only compact compressed samples without touching raster/models:

```sh
python packages/renderers/3d/scripts/generate-geo3d-samples.py --with-lazrs --compressed-only
python packages/renderers/3d/scripts/verify-geo3d-samples.py --range-smoke
```

The deterministic COPC fixture writer uses lazrs 0.8.2 and accepts only the
synthetic grid generated here. It is not a general LAS-to-COPC converter. Its
LAS source for the larger streaming sample is generated temporarily, avoiding
an additional redundant 16,384-point uncompressed file.

The legacy --with-pdal terrain alternative was not used for this completion
and does not generate the extra streaming fixture. PDAL is not required by the
fixture validator. The --allow-missing-compressed switch is only for partial
work directories: missing required payloads produce partial, never passed.
Normal strict validation uses no such switch.

## What the checks prove

The strict validator compares every decompressed point record byte with the
synthetic LAS source, including coordinates, color, time and other format-7
fields. It checks CRS, scales, bounds, COPC hierarchy and parents, chunk-table
agreement, spatial node bounds and independent chunk decoding.

The compact HTTP fixture check reads root and deeper nodes through six real
206 responses, transferring 2,314 of 18,133 bytes and decoding 12 matching points.
The original COPC check transfers 5,371 of 145,393 bytes through six 206 responses
and decodes 429 matching points. Both avoid full-file GET and check an invalid
range response of 416. These are fixture/transport checks, not browser rendering
or a production performance benchmark.

COPC verification uses direct hierarchy ranges, not the generic lazrs variable-
chunk seek path: the tested 0.8.2 backend returned incorrect intra-chunk offsets
for unequal preceding chunks. Sequential and independent chunk decoding retain
all records. Fixed-chunk LAZ random-point seeking is tested separately. No codec
is patched by these fixture tools.

Other checks cover SHA-256, raster pixel reads and overviews, CityJSON shell and
texture paths, glTF buffers/accessors/indices, relative resource references,
archive CRC/local headers and the sorted 3TZ index. The Python suite retains
14 compressed-fixture regressions plus five preprocessing regressions.

Actual rendering is checked separately by the Geo3D browser suite. CityJSON
textures now have a real pixel/UV/bitmap-disposal test; all shared-engine Worker
cleanup failures remain visible. A valid sample does not mean the complete
renderer acceptance or workspace suite has passed.

## Source and license notes

No external Giro3D/Piero dataset was copied into this directory. An MIT example
application does not automatically license its remote LiDAR or raster data.
The existing upstream cityjson-cjio-cube.json fixture remains separately
attributed; these synthetic samples do not replace it or its license.

Relevant specifications and tool implementations remain:

- COPC 1.0: https://copc.io/
- 3TZ: https://github.com/erikdahlstrom/3tz-specification/blob/master/Specification.md
- Development codec: https://pypi.org/project/lazrs/0.8.2/
- Variable-chunk reader: https://github.com/laz-rs/laz-rs/blob/master/src/laszip/sequential/decompression.rs
- Legacy PDAL alternative: https://pdal.org/en/2.9.3/stages/writers.copc.html
