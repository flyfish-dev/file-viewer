# Third-party notices

This file records the complete production dependency closure of the optional `@file-viewer/renderer-dicom` package, including any platform-optional dependencies. Exact machine-readable versions, SPDX expressions, source repositories, and packaged license/notice filenames are in `THIRD_PARTY_LICENSES.json`.

The DICOM renderer is not part of any standard/full package or preset. These dependencies are installed only when this capability is selected, and its Cornerstone implementation is loaded only when a DICOM file is opened.

## Required attribution

- `caniuse-lite@1.0.30001814` data is by Ben Briggs and contributors, from <https://github.com/browserslist/caniuse-lite>, licensed under CC-BY-4.0. The renderer does not modify that upstream data. The complete CC-BY-4.0 text is retained as `caniuse-lite/LICENSE` in the installed dependency.
`pako@1.0.5`, `pako@2.1.0`, `pako@2.2.0` contain zlib-derived code by Jean-loup Gailly and Mark Adler under `(MIT AND Zlib)`; their installed source retains the zlib notices and license terms.
- `spark-md5@3.0.2` is available under `(WTFPL OR MIT)` as declared by the package. Its installed package retains the upstream license file.
- `argparse@2.0.1` is licensed under Python-2.0 and retains the complete Python Software Foundation license in its installed `LICENSE` file.
`dompurify@3.4.16` is dual-licensed as `(MPL-2.0 OR Apache-2.0)`. File Viewer elects Apache-2.0, and the installed `LICENSE` file retains the complete Apache-2.0 text.

### Native libraries statically linked into codec WebAssembly

The five wrappers have separate npm publish and signed build-provenance commits. Exact official tarball integrities, installed-file hashes, source commits and build invocations are retained in `third-party/native-codecs/PROVENANCE.json` and checked against the installed artifacts. The wrapper package license is not used as a substitute for the linked native library terms:

- `CharLS` (`@cornerstonejs/codec-charls@1.2.7`): `BSD-3-Clause`; release source gitlink `9930a2a2fa75f516c4a08708180c9907fa501a97` at https://github.com/cornerstonejs/charls; linked target `charls`; retained files `third-party/native-codecs/charls/LICENSE.md`. Official build job https://github.com/cornerstonejs/codecs/actions/runs/34269730799/job/102207962308 records checkout of this exact native SHA. The wrapper's conditional CMake --remote block is not entered in the monorepo package layout.
- `libjpeg-turbo` (`@cornerstonejs/codec-libjpeg-turbo-8bit@1.2.7`): `IJG AND BSD-3-Clause AND Zlib`; release source gitlink `dc4a93fab38b42d29b89a533409e012570180e28` at https://github.com/cornerstonejs/libjpeg-turbo; linked target `turbojpeg-static`; retained files `third-party/native-codecs/libjpeg-turbo/LICENSE.md`, `third-party/native-codecs/libjpeg-turbo/README.ijg`.
- `OpenJPEG` (`@cornerstonejs/codec-openjpeg@1.3.6`): `BSD-2-Clause`; release source gitlink `6c4a29b00211eb0430fa0e5e890f1ce5c80f409f` at https://github.com/cornerstonejs/openjpeg; linked target `openjp2`; retained files `third-party/native-codecs/openjpeg/LICENSE`.
- `OpenJPH` (`@cornerstonejs/codec-openjph@2.4.11`): `BSD-2-Clause`; release source gitlink `4a68609b55034a14fac23f95afc60e239a9e809e` at https://github.com/cornerstonejs/OpenJPH; linked target `openjph`; retained files `third-party/native-codecs/openjph/LICENSE`.
- `JPEG XL` (`@cornerstonejs/codec-libjxl@1.1.1`): `BSD-3-Clause`; release source gitlink `794a5dcf0d54f9f0b20d288a12e87afb91d20dfc` at https://github.com/libjxl/libjxl; linked target `jxl_dec, jxl, jxl_cms`; retained files `third-party/native-codecs/libjxl/LICENSE`, `third-party/native-codecs/libjxl/PATENTS`, `third-party/native-codecs/libjxl/AUTHORS`.
- `Brotli` (`@cornerstonejs/codec-libjxl@1.1.1`): `MIT`; release source gitlink `36533a866ed1ca4b75cf049f4521e4ec5fe24727` at https://github.com/google/brotli; linked target `brotlidec, brotlicommon, brotlienc`; retained files `third-party/native-codecs/brotli/LICENSE`.
- `Highway` (`@cornerstonejs/codec-libjxl@1.1.1`): `Apache-2.0`; release source gitlink `457c891775a7397bdb0376bb1031e6e027af1c48` at https://github.com/google/highway; linked target `hwy`; retained files `third-party/native-codecs/highway/LICENSE`, `third-party/native-codecs/highway/LICENSE-BSD3`. Highway offers Apache-2.0 or BSD-3-Clause. File Viewer elects Apache-2.0 and retains both upstream license texts.
- `skcms` (`@cornerstonejs/codec-libjxl@1.1.1`): `BSD-3-Clause`; release source gitlink `42030a771244ba67f86b1c1c76a6493f873c5f91` at https://skia.googlesource.com/skcms; linked target `skcms`; retained files `third-party/native-codecs/skcms/LICENSE`.

**libjpeg-turbo attribution:** This software is based in part on the work of the Independent JPEG Group.

The complete libjpeg-turbo `LICENSE.md` and unmodified `README.ijg` are shipped with the package, together with the CharLS, OpenJPEG, OpenJPH, JPEG XL, Brotli, Highway and skcms license texts. JPEG XL authors and patent grant are retained as well. Highway elects Apache-2.0 and retains its alternative BSD text. These native components use permissive terms; none is LGPL or strong copyleft.

None of the Apache-2.0 dependencies in this closure publishes a top-level `NOTICE` file. All top-level license and notice files found in each installed package are recorded in the ledger.

## Exact third-party closure by SPDX expression

### (MIT AND Zlib)

- `pako@1.0.5` — https://github.com/nodeca/pako
- `pako@2.1.0` — https://github.com/nodeca/pako
- `pako@2.2.0` — https://github.com/nodeca/pako

### (WTFPL OR MIT)

- `spark-md5@3.0.2` — https://github.com/satazor/js-spark-md5

### Apache-2.0

- `baseline-browser-mapping@2.11.27` — https://github.com/web-platform-dx/baseline-browser-mapping
- `comlink@4.4.2` — https://github.com/GoogleChromeLabs/comlink
- `dompurify@3.4.16` — https://github.com/cure53/DOMPurify

### BSD-3-Clause

- `@cornerstonejs/codec-libjxl@1.1.1` — https://github.com/cornerstonejs/codecs
- `@kitware/vtk.js@36.4.1` — https://github.com/Kitware/vtk-js
- `shelljs@0.8.5` — https://github.com/shelljs/shelljs
- `source-map-js@1.2.2` — https://github.com/7rulnik/source-map-js
- `wslink@2.5.0` — https://github.com/kitware/wslink

### CC-BY-4.0

- `caniuse-lite@1.0.30001814` — https://github.com/browserslist/caniuse-lite

### ISC

- `@cornerstonejs/codec-libjpeg-turbo-8bit@1.2.7` — https://github.com/cornerstonejs/codecs
- `@msgpack/msgpack@2.8.0` — https://github.com/msgpack/msgpack-javascript
- `d3-array@3.2.4` — https://github.com/d3/d3-array
- `d3-color@3.1.0` — https://github.com/d3/d3-color
- `d3-format@3.1.2` — https://github.com/d3/d3-format
- `d3-interpolate@3.0.1` — https://github.com/d3/d3-interpolate
- `d3-scale@4.0.2` — https://github.com/d3/d3-scale
- `d3-time@3.1.0` — https://github.com/d3/d3-time
- `d3-time-format@4.1.0` — https://github.com/d3/d3-time-format
- `electron-to-chromium@1.5.433` — https://github.com/Kilian/electron-to-chromium
- `fs.realpath@1.0.0` — https://github.com/isaacs/fs.realpath
- `glob@7.2.3` — https://github.com/isaacs/node-glob
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
- `@cornerstonejs/codec-charls@1.2.7` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/codec-openjpeg@1.3.6` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/codec-openjph@2.4.11` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/core@5.11.3` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/dicom-image-loader@5.11.3` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/jpeg-lossless-decoder-js@2.2.1` — https://github.com/cornerstonejs/JPEGLosslessDecoderJS
- `@cornerstonejs/metadata@5.11.3` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/utils@5.11.3` — https://github.com/cornerstonejs/cornerstone3D
- `@oozcitak/dom@2.0.2` — https://github.com/oozcitak/dom
- `@oozcitak/infra@2.0.2` — https://github.com/oozcitak/infra
- `@oozcitak/url@3.0.0` — https://github.com/oozcitak/url
- `@oozcitak/util@10.0.0` — https://github.com/oozcitak/util
- `@types/trusted-types@2.0.7` (platform-optional) — https://github.com/DefinitelyTyped/DefinitelyTyped
- `@types/webxr@0.5.5` — https://github.com/DefinitelyTyped/DefinitelyTyped
- `adm-zip@0.6.1` — https://github.com/cthackers/adm-zip
- `autoprefixer@10.6.1` — https://github.com/postcss/autoprefixer
- `balanced-match@1.0.0` — https://github.com/juliangruber/balanced-match
- `brace-expansion@1.1.21` — https://github.com/juliangruber/brace-expansion
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
- `is-core-module@2.17.0` — https://github.com/inspect-js/is-core-module
- `js-yaml@4.3.2` — https://github.com/nodeca/js-yaml
- `lodash.clonedeep@4.5.0` — https://github.com/lodash/lodash
- `loglevel@1.9.2` — https://github.com/pimterry/loglevel
- `nanoid@3.3.18` — https://github.com/ai/nanoid
- `ndarray@1.0.19` — https://github.com/mikolalysenko/ndarray
- `node-releases@2.0.56` — https://github.com/chicoxyzzy/node-releases
- `path-is-absolute@1.0.1` — https://github.com/sindresorhus/path-is-absolute
- `path-parse@1.0.7` — https://github.com/jbgutierrez/path-parse
- `postcss@8.5.23` — https://github.com/postcss/postcss
- `postcss-value-parser@4.2.0` — https://github.com/TrySound/postcss-value-parser
- `rechoir@0.6.2` — https://github.com/tkellen/node-rechoir
- `resolve@1.22.12` — https://github.com/browserify/resolve
- `seedrandom@3.0.5` — https://github.com/davidbau/seedrandom
- `supports-preserve-symlinks-flag@1.0.0` — https://github.com/inspect-js/node-supports-preserve-symlinks-flag
- `update-browserslist-db@1.3.3` — https://github.com/browserslist/update-db
- `utif@3.1.0` — https://github.com/photopea/UTIF.js
- `uuid@11.1.1` — https://github.com/uuidjs/uuid
- `webworker-promise@0.5.0` — https://github.com/kwolfy/webworker-promise
- `xmlbuilder2@4.0.3` — https://github.com/oozcitak/xmlbuilder2

### Python-2.0

- `argparse@2.0.1` — https://github.com/nodeca/argparse
