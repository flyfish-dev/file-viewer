# Third-party notices

This file records the complete production dependency closure of the optional `@file-viewer/renderer-dicom` package, including the Linux-only optional codec dependency. Exact machine-readable versions, SPDX expressions, source repositories, and packaged license/notice filenames are in `THIRD_PARTY_LICENSES.json`.

The DICOM renderer is not part of any standard/full package or preset. These dependencies are installed only when this capability is selected, and its Cornerstone implementation is loaded only when a DICOM file is opened.

## Required attribution

- `caniuse-lite@1.0.30001810` data is by Ben Briggs and contributors, from <https://github.com/browserslist/caniuse-lite>, licensed under CC-BY-4.0. The renderer does not modify that upstream data. The complete CC-BY-4.0 text is retained as `caniuse-lite/LICENSE` in the installed dependency.
- `pako@1.0.11` and `pako@2.1.0` contain zlib-derived code by Jean-loup Gailly and Mark Adler under `(MIT AND Zlib)`; their installed source retains the zlib notices and license terms.
- `spark-md5@3.0.2` is available under `(WTFPL OR MIT)` as declared by the package. Its installed package retains the upstream license file.
- `argparse@2.0.1` is licensed under Python-2.0 and retains the complete Python Software Foundation license in its installed `LICENSE` file.
- `dompurify@3.4.13` is dual-licensed as `(MPL-2.0 OR Apache-2.0)`. File Viewer elects Apache-2.0, and the installed `LICENSE` file retains the complete Apache-2.0 text.

### Native libraries statically linked into codec WebAssembly

All four codec wrapper packages were built from `cornerstonejs/codecs` commit `8634194b68ab43bde8f35fcc466a36d91ac700b4`. The wrapper package license is not used as a substitute for the linked native library terms:

- `CharLS` (`@cornerstonejs/codec-charls@1.2.5`): `BSD-3-Clause`; source `38d95d00671f4cddfa61f3f51eaf81b8bac34543` at https://github.com/cornerstonejs/charls; linked target `charls`; retained files `third-party/native-codecs/charls/LICENSE.md`.
- `libjpeg-turbo` (`@cornerstonejs/codec-libjpeg-turbo-8bit@1.2.4`): `IJG AND BSD-3-Clause AND Zlib`; source `dc4a93fab38b42d29b89a533409e012570180e28` at https://github.com/cornerstonejs/libjpeg-turbo; linked target `turbojpeg-static`; retained files `third-party/native-codecs/libjpeg-turbo/LICENSE.md`, `third-party/native-codecs/libjpeg-turbo/README.ijg`.
- `OpenJPEG` (`@cornerstonejs/codec-openjpeg@1.3.2`): `BSD-2-Clause`; source `2d606701e8b7aa83f657d113c3367508e99bd12b` at https://github.com/cornerstonejs/openjpeg; linked target `openjp2`; retained files `third-party/native-codecs/openjpeg/LICENSE`.
- `OpenJPH` (`@cornerstonejs/codec-openjph@2.4.9`): `BSD-2-Clause`; source `e01c7b7f9e7ecbb15cf13bb45661c9a41ab7fec6` at https://github.com/cornerstonejs/OpenJPH; linked target `openjphsimd`; retained files `third-party/native-codecs/openjph/LICENSE`.

**libjpeg-turbo attribution:** This software is based in part on the work of the Independent JPEG Group.

The complete libjpeg-turbo `LICENSE.md` and unmodified `README.ijg` are shipped with the package, together with the exact CharLS, OpenJPEG, and OpenJPH license texts. These native components use BSD-style, IJG, and zlib terms; none is LGPL or strong copyleft.

None of the Apache-2.0 dependencies in this closure publishes a top-level `NOTICE` file. All top-level license and notice files found in each installed package are recorded in the ledger.

## Exact third-party closure by SPDX expression

### (MIT AND Zlib)

- `pako@1.0.5` — https://github.com/nodeca/pako
- `pako@2.1.0` — https://github.com/nodeca/pako

### (WTFPL OR MIT)

- `spark-md5@3.0.2` — https://github.com/satazor/js-spark-md5

### Apache-2.0

- `baseline-browser-mapping@2.11.19` — https://github.com/web-platform-dx/baseline-browser-mapping
- `comlink@4.4.2` — https://github.com/GoogleChromeLabs/comlink
- `dompurify@3.4.13` — https://github.com/cure53/DOMPurify

### BSD-3-Clause

- `@kitware/vtk.js@36.4.1` — https://github.com/Kitware/vtk-js
- `shelljs@0.8.5` — https://github.com/shelljs/shelljs
- `source-map-js@1.2.1` — https://github.com/7rulnik/source-map-js
- `wslink@2.5.0` — https://github.com/kitware/wslink

### CC-BY-4.0

- `caniuse-lite@1.0.30001810` — https://github.com/browserslist/caniuse-lite

### ISC

- `@cornerstonejs/codec-libjpeg-turbo-8bit@1.2.4` — https://github.com/cornerstonejs/codecs
- `@msgpack/msgpack@2.8.0` — https://github.com/msgpack/msgpack-javascript
- `d3-array@3.2.4` — https://github.com/d3/d3-array
- `d3-color@3.1.0` — https://github.com/d3/d3-color
- `d3-format@3.1.2` — https://github.com/d3/d3-format
- `d3-interpolate@3.0.1` — https://github.com/d3/d3-interpolate
- `d3-scale@4.0.2` — https://github.com/d3/d3-scale
- `d3-time@3.1.0` — https://github.com/d3/d3-time
- `d3-time-format@4.1.0` — https://github.com/d3/d3-time-format
- `electron-to-chromium@1.5.413` — https://github.com/Kilian/electron-to-chromium
- `fs.realpath@1.0.0` — https://github.com/isaacs/fs.realpath
- `glob@7.2.0` — https://github.com/isaacs/node-glob
- `inflight@1.0.6` — https://github.com/npm/inflight
- `inherits@2.0.4` — https://github.com/isaacs/inherits
- `internmap@2.0.3` — https://github.com/mbostock/internmap
- `minimatch@3.1.5` — https://github.com/isaacs/minimatch
- `once@1.4.0` — https://github.com/isaacs/once
- `picocolors@1.1.1` — https://github.com/alexeyraspopov/picocolors
- `wrappy@1.0.2` — https://github.com/npm/wrappy

### MIT

- `@babel/runtime-corejs3@7.29.2` — https://github.com/babel/babel
- `@cornerstonejs/calculate-suv@1.0.3` — https://github.com/cornerstonejs/calculate-suv
- `@cornerstonejs/codec-charls@1.2.5` — https://github.com/chafey/charls-js
- `@cornerstonejs/codec-openjpeg@1.3.2` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/codec-openjph@2.4.9` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/core@5.8.2` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/dicom-image-loader@5.8.2` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/metadata@5.8.2` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/utils@5.8.2` — https://github.com/cornerstonejs/cornerstone3D
- `@oozcitak/dom@2.0.2` — https://github.com/oozcitak/dom
- `@oozcitak/infra@2.0.2` — https://github.com/oozcitak/infra
- `@oozcitak/url@3.0.0` — https://github.com/oozcitak/url
- `@oozcitak/util@10.0.0` — https://github.com/oozcitak/util
- `@rollup/rollup-linux-x64-gnu@4.13.0` (platform-optional) — https://github.com/rollup/rollup
- `@types/trusted-types@2.0.7` (platform-optional) — https://github.com/DefinitelyTyped/DefinitelyTyped
- `@types/webxr@0.5.5` — https://github.com/DefinitelyTyped/DefinitelyTyped
- `adm-zip@0.6.0` — https://github.com/cthackers/adm-zip
- `autoprefixer@10.5.4` — https://github.com/postcss/autoprefixer
- `balanced-match@1.0.0` — https://github.com/juliangruber/balanced-match
- `brace-expansion@1.1.18` — https://github.com/juliangruber/brace-expansion
- `browserslist@4.28.7` — https://github.com/browserslist/browserslist
- `commander@9.2.0` — https://github.com/tj/commander.js
- `concat-map@0.0.1` — https://github.com/substack/node-concat-map
- `core-js-pure@3.50.0` — https://github.com/zloirock/core-js
- `dcmjs@0.52.0` — https://github.com/dcmjs-org/dcmjs
- `dicom-parser@1.8.21` — https://github.com/cornerstonejs/dicomParser
- `es-errors@1.3.0` — https://github.com/ljharb/es-errors
- `escalade@3.2.0` — https://github.com/lukeed/escalade
- `fast-deep-equal@3.1.3` — https://github.com/epoberezkin/fast-deep-equal
- `fflate@0.7.5` — https://github.com/101arrowz/fflate
- `fraction.js@5.3.4` — https://github.com/rawify/Fraction.js
- `function-bind@1.1.2` — https://github.com/Raynos/function-bind
- `gl-matrix@3.4.3` — https://github.com/toji/gl-matrix
- `gl-matrix@3.4.4` — https://github.com/toji/gl-matrix
- `hasown@2.0.4` — https://github.com/inspect-js/hasOwn
- `interpret@1.4.0` — https://github.com/gulpjs/interpret
- `iota-array@1.0.0` — https://github.com/mikolalysenko/iota-array
- `is-buffer@1.1.6` — https://github.com/feross/is-buffer
- `is-core-module@2.16.2` — https://github.com/inspect-js/is-core-module
- `jpeg-lossless-decoder-js@2.1.2` — https://github.com/rii-mango/JPEGLosslessDecoderJS
- `js-yaml@4.3.2` — https://github.com/nodeca/js-yaml
- `lodash.clonedeep@4.5.0` — https://github.com/lodash/lodash
- `loglevel@1.9.2` — https://github.com/pimterry/loglevel
- `nanoid@3.3.18` — https://github.com/ai/nanoid
- `ndarray@1.0.19` — https://github.com/mikolalysenko/ndarray
- `node-releases@2.0.53` — https://github.com/chicoxyzzy/node-releases
- `path-is-absolute@1.0.1` — https://github.com/sindresorhus/path-is-absolute
- `path-parse@1.0.7` — https://github.com/jbgutierrez/path-parse
- `postcss@8.5.23` — https://github.com/postcss/postcss
- `postcss-value-parser@4.2.0` — https://github.com/TrySound/postcss-value-parser
- `rechoir@0.6.2` — https://github.com/tkellen/node-rechoir
- `resolve@1.22.12` — https://github.com/browserify/resolve
- `seedrandom@3.0.5` — https://github.com/davidbau/seedrandom
- `supports-preserve-symlinks-flag@1.0.0` — https://github.com/inspect-js/node-supports-preserve-symlinks-flag
- `update-browserslist-db@1.3.1` — https://github.com/browserslist/update-db
- `utif@3.1.0` — https://github.com/photopea/UTIF.js
- `uuid@11.1.1` — https://github.com/uuidjs/uuid
- `webworker-promise@0.5.0` — https://github.com/kwolfy/webworker-promise
- `xmlbuilder2@4.0.3` — https://github.com/oozcitak/xmlbuilder2

### Python-2.0

- `argparse@2.0.1` — https://github.com/nodeca/argparse
