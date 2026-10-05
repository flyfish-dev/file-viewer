# Geo3D regression fixtures

All files in this directory except where explicitly attributed are generated
test fixtures for File Viewer and may be redistributed under the repository
Apache-2.0 license.

- regular.tif: ordinary TIFF without GeoTIFF metadata.
- geotiff-noncog.tif: EPSG:4326 GeoTIFF using strips, intentionally not a COG.
- sample-cog.tif: EPSG:32632 Cloud Optimized GeoTIFF generated with GDAL/rasterio COG driver.
- sample.city.json: minimal CityJSON 2.0 solid.
- tiles3d/: minimal multi-file 3D Tiles dataset with one generated GLB triangle.
- sample.3tz: archive of the same 3D Tiles dataset.
- invalid-traversal.3tz: deliberately invalid archive containing ../evil.txt for safety regression.
- sample.las: minimal generated LAS 1.2 point-format-0 file.

The fixtures are synthetic and contain no third-party/customer data.


Additional regression fixtures:

- `probe.copc.laz`: synthetic LASF/COPC VLR probe fixture. It is intentionally
  not a renderable compressed point cloud; real COPC/LAZ validation samples are
  documented in `EXTERNAL_SAMPLES.md`.
- `duplicate.3tz`: deliberately invalid archive with duplicate
  `tileset.json` entries.
- `EXTERNAL_SAMPLES.md`: real LAZ/COPC validation URLs with independent
  dataset-license attribution.


## Upstream MIT fixture

`upstream/cityjson-cjio-cube.json` is an unmodified copy of:

- repository: `cityjson/cjio`
- source path: `tests/data/cube.json`
- source revision: `35728539127f71b1d5ae458169ff84050e5e20ad`
- source blob SHA: `52fc206478ff7df57474327b7328bc60fd87fdc5`
- license: MIT
- license copy: `upstream/LICENSE-cityjson-cjio.txt`

The fixture bytes were checked against that exact source revision.
