# Third-party notices

This file records direct runtime dependencies and the complete reviewed source closure of the three Cornerstone 5.11.6 SDK build dependencies. All declared optional dependency edges are traversed. The five reviewed codec wrappers declare no runtime or optional dependencies, and this closure contains no Rollup build tools. The direct core closure retains its optional trusted-types declarations. The browser SDK is compiled into the ordinary npm package; consumers do not need application security overrides. Exact source versions, SPDX expressions, repositories, and upstream license/notice filenames are in `THIRD_PARTY_LICENSES.json`. Actual bundled inputs, output hashes, and decoder WASM hashes are recorded in `dist/bundled-runtime.json`; complete JavaScript license texts are retained in `dist/THIRD_PARTY_LICENSES.txt`.

The DICOM renderer is not part of any standard/full package or preset. The bundled Cornerstone implementation is installed only when this capability is selected and loaded only when a DICOM file is opened. Source-closure entries are an attribution inventory; unused build dependencies are not necessarily present in the runtime bundle.

## Required attribution

- `caniuse-lite@1.0.30001810` data is by Ben Briggs and contributors, from <https://github.com/browserslist/caniuse-lite>, licensed under CC-BY-4.0. The renderer does not modify that upstream data. The complete CC-BY-4.0 text is retained as `caniuse-lite/LICENSE` in the installed dependency.
`pako@1.0.5`, `pako@2.1.0`, `pako@2.2.0` contain zlib-derived code by Jean-loup Gailly and Mark Adler under `(MIT AND Zlib)`; their installed source retains the zlib notices and license terms.
- `spark-md5@3.0.2` is available under `(WTFPL OR MIT)` as declared by the package. Its installed package retains the upstream license file.
- `argparse@2.0.1` is licensed under Python-2.0 and retains the complete Python Software Foundation license in its installed `LICENSE` file.
`dompurify@3.4.17` is dual-licensed as `(MPL-2.0 OR Apache-2.0)`. File Viewer elects Apache-2.0, and the installed `LICENSE` file retains the complete Apache-2.0 text.

### Native libraries statically linked into codec WebAssembly

Exact official tarball integrities and the complete installed-file inventory are retained in `third-party/native-codecs/PROVENANCE.json`. The verifier checks every codec file and lockfile integrity against those reviewed artifacts; source gitlinks describe release-source provenance, not an independent reproducible-build claim.

The five wrapper releases record separate registry release commits and verified GitHub Actions build checkout commits. Their reviewed native-library gitlinks and wrapper/build sources match; this record does not claim an independent bit-for-bit rebuild. The wrapper package license is not used as a substitute for linked native library terms:

The official libjpeg-turbo-8bit 1.2.7, OpenJPEG 1.3.6 and libjxl 1.1.1 tarballs omit their wrapper license files. The complete upstream root MIT license is retained at `third-party/native-codecs/wrapper/LICENSE`, verified against both exact release and signed build commits and the preceding published license bytes. The libjpeg wrapper npm metadata declares ISC and the libjxl wrapper metadata declares BSD-3-Clause while their root source text is MIT; all declarations remain recorded without altering upstream package bytes. Normal builds bind this full text to the exact package versions, declarations, source commits and SHA-256 and include it in generated bundle notices.

- `CharLS` (`@cornerstonejs/codec-charls@1.2.7`): `BSD-3-Clause`; wrapper release `d546620bc7814e836a0587e878b17e95146c76d0`, build checkout `70030e062b3ff0a2ac69dfbe4a2012d0567cc579`; native source `9930a2a2fa75f516c4a08708180c9907fa501a97` at https://github.com/cornerstonejs/charls; linked target `charls`; retained files `third-party/native-codecs/charls/LICENSE.md`.
- `libjpeg-turbo` (`@cornerstonejs/codec-libjpeg-turbo-8bit@1.2.7`): `IJG AND BSD-3-Clause AND Zlib`; wrapper release `5c48f12a598db126de66c07779ac764ee1a3bc42`, build checkout `3f122136bfdfff94ce7c5be92c62ae129c182fda`; native source `dc4a93fab38b42d29b89a533409e012570180e28` at https://github.com/cornerstonejs/libjpeg-turbo; linked target `turbojpeg-static`; retained files `third-party/native-codecs/libjpeg-turbo/LICENSE.md`, `third-party/native-codecs/libjpeg-turbo/README.ijg`.
- `OpenJPEG` (`@cornerstonejs/codec-openjpeg@1.3.6`): `BSD-2-Clause`; wrapper release `5c48f12a598db126de66c07779ac764ee1a3bc42`, build checkout `3f122136bfdfff94ce7c5be92c62ae129c182fda`; native source `6c4a29b00211eb0430fa0e5e890f1ce5c80f409f` at https://github.com/cornerstonejs/openjpeg; linked target `openjp2`; retained files `third-party/native-codecs/openjpeg/LICENSE`.
- `OpenJPH` (`@cornerstonejs/codec-openjph@2.4.11`): `BSD-2-Clause`; wrapper release `bac71dd0d78996e63f2dac3e9ee3a44f2b366a05`, build checkout `bac71dd0d78996e63f2dac3e9ee3a44f2b366a05`; native source `4a68609b55034a14fac23f95afc60e239a9e809e` at https://github.com/cornerstonejs/OpenJPH; linked target `openjph`; retained files `third-party/native-codecs/openjph/LICENSE`.
- `libjxl` (`@cornerstonejs/codec-libjxl@1.1.1`): `BSD-3-Clause`; wrapper release `c44693e9c96a126cb100b2c56ebfb7cad1e0a428`, build checkout `c9ffa62a82e837485fd9fc918555e340e8d0402a`; native source `794a5dcf0d54f9f0b20d288a12e87afb91d20dfc` at https://github.com/libjxl/libjxl; linked target `jxl_dec and jxl_cms`; retained files `third-party/native-codecs/libjxl/LICENSE`, `third-party/native-codecs/libjxl/PATENTS`, `third-party/native-codecs/libjxl/AUTHORS`.
- `Brotli` (`@cornerstonejs/codec-libjxl@1.1.1`): `MIT`; wrapper release `c44693e9c96a126cb100b2c56ebfb7cad1e0a428`, build checkout `c9ffa62a82e837485fd9fc918555e340e8d0402a`; native source `36533a866ed1ca4b75cf049f4521e4ec5fe24727` at https://github.com/google/brotli; linked target `brotlidec and brotlicommon`; retained files `third-party/native-codecs/brotli/LICENSE`.
- `Highway` (`@cornerstonejs/codec-libjxl@1.1.1`): `Apache-2.0`; wrapper release `c44693e9c96a126cb100b2c56ebfb7cad1e0a428`, build checkout `c9ffa62a82e837485fd9fc918555e340e8d0402a`; native source `457c891775a7397bdb0376bb1031e6e027af1c48` at https://github.com/google/highway; linked target `hwy`; retained files `third-party/native-codecs/highway/LICENSE`, `third-party/native-codecs/highway/LICENSE-BSD3`.
- `skcms` (`@cornerstonejs/codec-libjxl@1.1.1`): `BSD-3-Clause`; wrapper release `c44693e9c96a126cb100b2c56ebfb7cad1e0a428`, build checkout `c9ffa62a82e837485fd9fc918555e340e8d0402a`; native source `42030a771244ba67f86b1c1c76a6493f873c5f91` at https://skia.googlesource.com/skcms; linked target `skcms through jxl_cms`; retained files `third-party/native-codecs/skcms/LICENSE`.

**libjpeg-turbo attribution:** This software is based in part on the work of the Independent JPEG Group.

The full exact-source SDK MIT text is retained for core, metadata and utils 5.11.6, whose tarballs omit it. Their separate registry and verified publisher-build commits and complete official file inventories are recorded in `PROVENANCE.json`; normal builds check these bytes and include the unmodified license text in bundle notices.

The complete libjpeg-turbo `LICENSE.md` and unmodified `README.ijg` are shipped with the package, together with the exact CharLS, OpenJPEG, and OpenJPH license texts. The additional JPEG XL component ships its LICENSE, PATENTS and AUTHORS along with the exact linked Brotli MIT, Highway Apache-2.0 (both dual-license texts retained) and skcms BSD-3-Clause texts. The native components use BSD-style, MIT, Apache-2.0, IJG and zlib terms; none is LGPL or strong copyleft.

None of the Apache-2.0 dependencies in this closure publishes a top-level `NOTICE` file. All top-level license and notice files found in each installed package are recorded in the ledger.

## Reviewed runtime and SDK source closure by SPDX expression

### (MIT AND Zlib)

- `pako@1.0.5` — https://github.com/nodeca/pako
- `pako@2.1.0` — https://github.com/nodeca/pako
- `pako@2.2.0` — https://github.com/nodeca/pako

### (WTFPL OR MIT)

- `spark-md5@3.0.2` — https://github.com/satazor/js-spark-md5

### Apache-2.0

- `baseline-browser-mapping@2.11.33` — https://github.com/web-platform-dx/baseline-browser-mapping
- `comlink@4.4.2` — https://github.com/GoogleChromeLabs/comlink
- `dompurify@3.4.17` — https://github.com/cure53/DOMPurify
- `typescript@6.0.3` — https://github.com/microsoft/TypeScript

### BSD-3-Clause

- `@cornerstonejs/codec-libjxl@1.1.1` — https://github.com/cornerstonejs/codecs
- `@kitware/vtk.js@36.4.1` — https://github.com/Kitware/vtk-js
- `shelljs@0.8.5` — https://github.com/shelljs/shelljs
- `source-map-js@1.2.2` — https://github.com/7rulnik/source-map-js
- `wslink@2.5.0` — https://github.com/kitware/wslink

### CC-BY-4.0

- `caniuse-lite@1.0.30001819` — https://github.com/browserslist/caniuse-lite

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
- `electron-to-chromium@1.5.451` — https://github.com/Kilian/electron-to-chromium
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
- `@cornerstonejs/codec-charls@1.2.7` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/codec-openjpeg@1.3.6` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/codec-openjph@2.4.11` — https://github.com/cornerstonejs/codecs
- `@cornerstonejs/core@5.11.6` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/dicom-image-loader@5.11.6` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/jpeg-lossless-decoder-js@2.2.1` — https://github.com/cornerstonejs/JPEGLosslessDecoderJS
- `@cornerstonejs/metadata@5.11.6` — https://github.com/cornerstonejs/cornerstone3D
- `@cornerstonejs/utils@5.11.6` — https://github.com/cornerstonejs/cornerstone3D
- `@oozcitak/dom@2.0.2` — https://github.com/oozcitak/dom
- `@oozcitak/infra@2.0.2` — https://github.com/oozcitak/infra
- `@oozcitak/url@3.0.0` — https://github.com/oozcitak/url
- `@oozcitak/util@10.0.0` — https://github.com/oozcitak/util
- `@types/trusted-types@2.0.7` (optional) — https://github.com/DefinitelyTyped/DefinitelyTyped
- `@types/webxr@0.5.5` — https://github.com/DefinitelyTyped/DefinitelyTyped
- `adm-zip@0.6.1` — https://github.com/cthackers/adm-zip
- `autoprefixer@10.6.1` — https://github.com/postcss/autoprefixer
- `balanced-match@1.0.0` — https://github.com/juliangruber/balanced-match
- `brace-expansion@1.1.21` — https://github.com/juliangruber/brace-expansion
- `browserslist@4.28.7` — https://github.com/browserslist/browserslist
- `commander@9.2.0` — https://github.com/tj/commander.js
- `concat-map@0.0.1` — https://github.com/substack/node-concat-map
- `core-js-pure@3.51.0` — https://github.com/zloirock/core-js
- `dcmjs@0.52.0` — https://github.com/dcmjs-org/dcmjs
- `dicom-parser@1.8.21` — https://github.com/cornerstonejs/dicomParser
- `es-errors@1.3.0` — https://github.com/ljharb/es-errors
- `escalade@3.2.0` — https://github.com/lukeed/escalade
- `events@3.3.0` — https://github.com/Gozala/events
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
- `node-releases@2.0.58` — https://github.com/chicoxyzzy/node-releases
- `path-is-absolute@1.0.1` — https://github.com/sindresorhus/path-is-absolute
- `path-parse@1.0.7` — https://github.com/jbgutierrez/path-parse
- `postcss@8.5.31` — https://github.com/postcss/postcss
- `postcss-value-parser@4.2.0` — https://github.com/TrySound/postcss-value-parser
- `rechoir@0.6.2` — https://github.com/tkellen/node-rechoir
- `resolve@1.22.13` — https://github.com/browserify/resolve
- `seedrandom@3.0.5` — https://github.com/davidbau/seedrandom
- `supports-preserve-symlinks-flag@1.0.0` — https://github.com/inspect-js/node-supports-preserve-symlinks-flag
- `update-browserslist-db@1.3.4` — https://github.com/browserslist/update-db
- `utif@3.1.0` — https://github.com/photopea/UTIF.js
- `uuid@11.1.1` — https://github.com/uuidjs/uuid
- `webworker-promise@0.5.0` — https://github.com/kwolfy/webworker-promise
- `xmlbuilder2@4.0.3` — https://github.com/oozcitak/xmlbuilder2

### Python-2.0

- `argparse@2.0.1` — https://github.com/nodeca/argparse
