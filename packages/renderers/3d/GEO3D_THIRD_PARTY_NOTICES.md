# Geo3D third-party notices

This notice covers the optional `@file-viewer/renderer-3d/geo3d` sub-entry.
The ordinary `@file-viewer/renderer-3d` entry does not import these optional
runtime packages.

## Runtime packages

### Offline CRS authority data

- `epsg-index` 2.0.0 supplies coordinate-system names and definitions under ISC.
- Historical authority aliases come from PROJ 9.9.0, commit
  `1df2be61c0e4732aa1326126113776b291ae7657`, under its MIT-style license.
- The source alias module and this notice retain the original license. The package and
  copied assets also retain `licenses/PROJ-COPYING.txt` and the EPSG index license.
- These are offline lookup tables. File Viewer does not request a public CRS
  registry or download datum grids while opening a document.

### @giro3d/giro3d 2.0.5

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

<!-- BEGIN PROJ ALIAS NOTICE -->

## Retained PROJ alias-table grant

PROJ 9.9.0 CRS aliases; upstream commit 1df2be61c0e4732aa1326126113776b291ae7657.

All source, data files and other contents of the PROJ package are
available under the following terms.  Note that the PROJ 4.3 and earlier
was "public domain" as is common with US government work, but apparently
this is not a well defined legal term in many countries. Frank Warmerdam placed
everything under the following MIT style license because he believed it is
effectively the same as public domain, allowing anyone to use the code as
they wish, including making proprietary derivatives.

Initial PROJ 4.3 public domain code was put as Frank Warmerdam as copyright
holder, but he didn't mean to imply he did the work. Essentially all work was
done by Gerald Evenden.

Copyright information can be found in source files.

 --------------

 Permission is hereby granted, free of charge, to any person obtaining a
 copy of this software and associated documentation files (the "Software"),
 to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 and/or sell copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included
 in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 DEALINGS IN THE SOFTWARE.

<!-- END PROJ ALIAS NOTICE -->
