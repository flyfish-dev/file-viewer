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

## @paged-media/introspect-wasm 0.70.2

Source: <https://github.com/paged-media/core/tree/c7a4b788cc24acd7d5af8843655ec3806ad613a1>, the official npm 0.70.2 `gitHead` and release tag target.

The exact core corresponding source archive is <https://codeload.github.com/paged-media/core/tar.gz/c7a4b788cc24acd7d5af8843655ec3806ad613a1> (SHA-256 `58f8eb6e1a0f06b8e2c8babf27d1ae0bad37a21db1ff8243298bdc647eee34a7`). The original lock records IDML import/export commit `47ab9d90c8004c32b7d410cc8f2a554b6493a260` from `paged-media/plugin-publish`. Its complete source is now available in the official migrated archive <https://codeload.github.com/paged-media/paged/tar.gz/0a6ad98729b759f4c698f9e829f5b75d9ae431b9> (3,284,711 bytes; SHA-256 `b12e8384271b88cd27ef4efdd08785a63f6c50e706c4cbae3e75e09b639eca45`), under `modules/publish/`.

The fixed official [commit map](https://github.com/paged-media/paged/blob/a86a8867d8cdc78b8f737ad18ef7bd0e48f0b0d6/tooling/import/commit-maps/plugin-publish.tsv) maps that original commit to `0a6ad98729b759f4c698f9e829f5b75d9ae431b9`; the adjacent import manifest preserves the complete repository under `modules/publish/`. All 154 files reconstruct Git subtree `f271f202b6d764e7af4146f6fb12240c8df9a66c`, including the unchanged original license texts. The original commit and Cargo lock identities remain recorded in the native license book.

To restore the core build after this repository migration, unpack both pinned archives and point each core `idml-import`/`idml-export` dependency at the matching `modules/publish/crates/idml-import` or `idml-export` directory. Keep the core workspace's existing `[patch."https://github.com/paged-media/core"]` entries so the adapter and core share the same local model types. Both workspaces' Cargo manifests and these paths were checked; no bit-for-bit WASM rebuild is asserted. The distributed 0.70.2 WASM remains unmodified.

The package declares `MPL-2.0 OR LicenseRef-PMEL`. File Viewer elects the Mozilla Public License 2.0 option for the distributed JavaScript and WebAssembly runtime. The complete MPL-2.0 text is shipped as `LICENSES/MPL-2.0.txt` and copied next to the self-hosted IDML runtime assets.

The normal Worker build also retains the matching upstream `LICENSE` and `LICENSE.md` in `dist/workers.THIRD_PARTY_LICENSES.txt`, including the copyright attribution and explicit grant of the MPL option. The npm package omits those files; the retained copies are checked against their immutable upstream Git blobs and SHA-256 hashes.

`LICENSES/Introspect_NATIVE_THIRD_PARTY_LICENSES.json` retains the complete collected license texts, copyright notices, immutable source identities, and native byte hashes for the official CPU WASM source configuration. The normal asset build copies this book beside the IDML WASM. Its dependency scope excludes build/dev dependencies and procedural macros and is a conservative source configuration before dead-stripping. The matching Rust standard-library copyright report is retained separately within the book. Preserve the book when copying the WASM for self-hosting.

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

## Stet 0.8.7 / stet-wasm 0.2.0

Source: <https://github.com/AndyCappDev/stet/tree/58c7066817f7939789c6f030515c02e94fb0353b>

Stet is licensed under `Apache-2.0 OR MIT`. Both complete license texts are shipped unchanged as `LICENSES/Stet-Apache-2.0.txt` and `LICENSES/Stet-MIT.txt`. The reproducible build uses unmodified upstream source and resources. Embedded TrueType/OpenType loading and the host VM ceiling use upstream APIs; `source/postscript/stet-safe-browser.patch` is no longer needed.

The 35 embedded URW Base35 fonts use Stet's SIL Open Font License 1.1 election. `LICENSES/Stet-URW-Fonts-OFL-1.1.txt` preserves the complete upstream notice, original copyright statements, archived 2017 triple-license declaration, and OFL text. The font bytes match `ArtifexSoftware/urw-base35-fonts` commit `3c0ba3b5687632dfc66526544a4e811fe0ec0cd9`; exact hashes are pinned in `source/postscript/upstream.json`. The old Carlito, Tinos, Cousine and Noto Sans Symbols 2 license URLs remain for compatibility; those fonts are no longer embedded.

The embedded CMYK profile is `CGATS001Compat-v2-micro.icc` from Clinton Ingram's Compact ICC Profiles, commit `1fabe4a41bef9bac6e8300748177f783773571cb`, under CC0. It is 8,464 bytes with SHA-256 `73e1ba37d2bad5bab2a964f40a9eed96209666efc067c3322626214bbef234a0`. `LICENSES/Stet-CMYK-Profile.txt` preserves upstream provenance and `LICENSES/CC0-1.0.txt` contains the collection's full legal text. It is not Ghostscript's profile. See `POSTSCRIPT-WASM.md` for the reproducible build and safety boundary.

`LICENSES/Stet_NATIVE_THIRD_PARTY_LICENSES.json` retains 91 packages in the exact locked conservative source profile, including host/build alternatives, with 80 complete original legal materials and the original Rust standard-library source grants. It is bound to the source commit, lock hash and WASM hash; it is not a post-link symbol inventory. Registry legal files are checked against the exact checksum-verified crate archives. The MIT declarations in fax 0.2.6 and fax_derive 0.2.0 omit grant files; the book preserves the unmodified project MIT grant added upstream at `pdf-rs/fax` commit `5d70a161e33b62305f8bce7af3f7fbd011cfaf5d`, with that source recorded explicitly. The jpeg-encoder IJG header and unicode-ident Unicode grant are retained in addition to their MIT/Apache grants. This software is based in part on the work of the Independent JPEG Group.
