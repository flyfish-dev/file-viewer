# Geo3D third-party notices

This notice covers the optional `@file-viewer/renderer-3d/geo3d` sub-entry.
The ordinary `@file-viewer/renderer-3d` entry does not import these optional
runtime packages.

## Runtime packages

### @giro3d/giro3d 2.0.4

- License: MIT
- Role: streaming/rendering engine for COPC, LAS/LAZ, GeoTIFF/COG and 3D Tiles.
- Installation: optional peer dependency.
- Runtime decoder assets are self-hosted by `file-viewer-geo3d-assets`.

Giro3D declares its own peer dependencies, including Three.js/OpenLayers/proj4.
Those remain Giro3D's dependency contract; File Viewer does not copy them into
its normal 3D entry.

### jszip 3.10.2

- License: MIT OR GPL-3.0-or-later.
- File Viewer uses it under the MIT option.
- Role: extraction only after File Viewer's 3TZ central-directory safety
  preflight has accepted the archive.
- Installation: optional peer dependency.

### laz-perf 0.0.7

- License: Apache-2.0.
- Role: LAZ/COPC decoder WebAssembly used by Giro3D.
- It is a Giro3D runtime dependency, not imported directly by File Viewer.
- `file-viewer-geo3d-assets` copies the installed WASM and its license to the
  application's self-hosted asset directory.

### three

- License: MIT.
- Already a runtime dependency of the ordinary 3D renderer.
- Geo3D's Giro3D runtime follows Giro3D's own Three.js peer graph. The local
  CityJSON adapter creates browser-preview geometry using File Viewer's existing
  Three.js dependency and adds it as a regular Object3D, which Giro3D supports.

## Reference-only projects

### Piero

- Project: Giro3D/Piero.
- License: MIT.
- Used as architecture/reference material for CityJSON behavior.
- It is not a File Viewer runtime dependency.

## Test data

Synthetic fixtures in `test/fixtures/geo3d` are generated for File Viewer and
contain no third-party/customer data.

The vendored CityJSON compatibility fixture under
`test/fixtures/geo3d/upstream` retains its upstream MIT license text.

Real LAZ/COPC validation URLs documented in `EXTERNAL_SAMPLES.md` come from
`PDAL/data`, which is licensed CC BY 4.0. Those large Git-LFS payloads are not
vendored in this package.
