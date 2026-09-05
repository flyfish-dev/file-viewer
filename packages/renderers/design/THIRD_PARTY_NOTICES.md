# Third-party notices

## illustrator-pgf 0.1.0

Source base: <https://github.com/flyfish-dev/illustrator-pgf/tree/a21bddfbb71bbe806b669c8ff5b2e30d8775a9a1>

The MIT-licensed native Illustrator PGF/private-source parser, Scene IR, Canvas renderer, and Worker runtime are bundled into the Illustrator Worker. File Viewer applies the reproducible `patches/illustrator-pgf@0.1.0.patch` interoperability patch for real Illustrator private-block boundaries, binary data, gradient marks, AI5 path/color aliases, opacity, and extended layer flags; it can be removed after those fixes are included in a later upstream release. The complete license is shipped as `LICENSES/illustrator-pgf-MIT.txt`. No Adobe SDK, Illustrator binary, font, ICC profile, fixture, or public-CDN runtime is redistributed by this dependency.

## fzstd 0.1.1

Source: <https://github.com/101arrowz/fzstd>

The MIT-licensed streaming zstd decoder is bundled only into the terminable Illustrator Worker so Illustrator 24+ private source can be decoded offline. File Viewer enforces the configured decoded-byte ceiling while chunks are emitted instead of retaining output beyond that ceiling. The complete license is shipped as `LICENSES/fzstd-MIT.txt`.

## ag-psd 31.0.2

Source: <https://github.com/Agamnentzar/ag-psd>

The MIT License (MIT)

Copyright (c) 2016 Agamnentzar

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The upstream license states that image and brush files included in that repository are not covered by the MIT license. This package redistributes no such fixture.

The complete upstream text is also shipped as `LICENSES/ag-psd-MIT.txt`.

## @webtoon/psd 0.4.0

Source: <https://github.com/webtoon/psd>

Copyright 2021-present NAVER WEBTOON

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The complete upstream text is also shipped as `LICENSES/webtoon-psd-MIT.txt`.

## base64-js 1.5.1

Source: <https://github.com/beatgammit/base64-js/tree/v1.5.1>

The MIT-licensed byte codec is bundled transitively through `ag-psd` in the Photoshop document and resource Workers. The complete upstream license is shipped as `LICENSES/base64-js-MIT.txt`.

## pako 2.1.0

Source: <https://github.com/nodeca/pako/tree/2.1.0>

The MIT-licensed DEFLATE implementation is bundled transitively through `ag-psd` in the Photoshop document and resource Workers. The complete upstream license is shipped as `LICENSES/pako-MIT.txt`.

## @paged-media/introspect-wasm 0.62.0

Source: <https://github.com/paged-media/core/tree/v0.62.0>

The package declares `MPL-2.0 OR LicenseRef-PMEL`. File Viewer elects the Mozilla Public License 2.0 option for the distributed JavaScript and WebAssembly runtime. The complete MPL-2.0 text is shipped as `LICENSES/MPL-2.0.txt` and copied next to the self-hosted IDML runtime assets.

No public CDN is used. The unmodified `paged_introspect_wasm.js` module is bundled into the IDML Worker and `paged_introspect_wasm_bg.wasm` is distributed as a separate local asset. Any future modification to an MPL-covered upstream file must keep the corresponding source available under MPL-2.0.

## @xmldom/xmldom 0.9.12

Source: <https://github.com/xmldom/xmldom/tree/0.9.12>

The MIT-licensed parser is bundled into the Adobe container Worker for strict, offline XFL XML parsing. File Viewer rejects DTD, ENTITY, and XML stylesheet declarations before parsing and enforces independent XML node, depth, attribute, and text budgets. The complete upstream license is shipped as `LICENSES/xmldom-MIT.txt`.

## saxes 6.0.0

Source: <https://github.com/lddubeau/saxes/tree/v6.0.0>

The ISC-licensed streaming XML parser is bundled into the Adobe container Worker for bounded ICML, IDMS, and legacy INX parsing. File Viewer applies independent UTF-8, declaration, DTD/entity, source-size, node, depth, attribute, text, story, page-item, path-point, style, and color limits before presenting parsed content. The complete upstream notice, including the inherited sax and historical `String.fromCodePoint` notices, is shipped as `LICENSES/saxes-ISC.txt`.

## xmlchars 2.2.0

Source: <https://github.com/lddubeau/xmlchars/tree/v2.2.0>

The MIT-licensed XML character classifier is bundled transitively through `saxes` in the Adobe container Worker. The complete upstream license is shipped as `LICENSES/xmlchars-MIT.txt`.

## Stet 0.7.0 / stet-wasm 0.2.0

Source: <https://github.com/AndyCappDev/stet/tree/3aaf0a76ebd0f9129a715dfa10614d8871d8e965>

Stet is licensed under `Apache-2.0 OR MIT`. Both complete license texts are shipped as `LICENSES/Stet-Apache-2.0.txt` and `LICENSES/Stet-MIT.txt`. File Viewer applies the reproducible patch documented in `POSTSCRIPT-WASM.md`: it adds a browser VM cap and virtual-font loading, removes every compiled reference to the upstream URW Base35 assets and Ghostscript `default_cmyk.icc`, and uses the PLRM DeviceCMYK formula fallback. The package does not redistribute those excluded upstream assets.

The embedded substitutes are Carlito, Tinos, Cousine, and Noto Sans Symbols 2. Each is distributed under SIL Open Font License 1.1; the corresponding complete texts are shipped in `LICENSES/*-OFL-1.1.txt`. Font binaries come from Google Fonts commit `ade3d1533e06b2b1462ffcde8e08b129627ca360`, and the Tinos project notice is pinned to `googlefonts/tinos` commit `3b4482a99b80ea5fc75f187b1be3120a3f5905b3`. Exact source hashes are enforced by `scripts/build-postscript-wasm.mjs`.
