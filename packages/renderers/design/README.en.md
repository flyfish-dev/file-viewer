# @file-viewer/renderer-design

Adobe design-file renderers for Flyfish File Viewer. Parsing and pixel synthesis run in a terminable module Worker, and every runtime asset can be self-hosted without a public CDN.

## Current scope

- PSD: 8-bit RGB and grayscale PSD. The saved composite is the visual reference. Basic layer visibility is enabled only when the document has no group isolation, masks, clipping, special blend modes, layer effects, or other composition semantics that Canvas cannot reproduce faithfully. An extra channel is used as display alpha only when layer-info declares merged transparency; saved selection and spot channels are not silently repurposed.
- PDD/PSDT: accepted only when the signature, version, and structure validate as a PSD v1 container alias, then routed through the same pixel and layer pipeline. Other private PhotoDeluxe dialects fail explicitly.
- PSB: saved-composite rendering and a read-only layer tree for 8-bit RGB and grayscale PSB without auxiliary alpha/spot channels. This package decodes planar Raw composites itself to avoid an upstream RGB-channel bug; PackBits RLE uses the independent PSB parser. Interactive PSB composition, extra channels, 16-bit, CMYK, and PSB files containing ZIP-compressed layer channels are rejected explicitly.
- AI/AIT: automatic mode prefers a verified PDF-compatible representation for saved-appearance fidelity, search, and printing. The viewer can also switch to the `illustrator-pgf` native PGF/private-source Worker for real artboards, layer visibility, and demand-rendered Canvas output. The native path preserves unknown operators and reports fidelity/unsupported diagnostics; gradients, complex text, images, plugins, effects, masks, blending, overprint, and spot-color handling are not presented as complete Illustrator reconstruction. An ordinary PDF renamed to `.ai` is still rejected.
- IDML: pages are rendered lazily in a Worker by the `@paged-media/introspect-wasm` CPU engine after strict ZIP path, overlap, encryption, ZIP64, ratio, and expansion checks. The current tree exposes TextFrame and Rectangle summaries only.
- ICML/IDMS/INX: strict UTF-8/XML parsing in the shared terminable Worker. ICML presents styled stories; IDMS reconstructs bounded layout fragments, paths, colors, layers, and stories; legacy INX visualizes mapped common page items while retaining every unmapped element in the structure inventory. Linked resources are listed but never fetched.
- FLA/XFL: modern ZIP/XFL-based FLA exposes the stage, timelines, layers, keyframes, symbols, resources, and a bounded first-frame preview for solid shapes, static text, nested symbols, and PNG/JPEG. A single DOMDocument XML can be read, but a standard uncompressed XFL folder needs a future directory/multi-file input API; legacy binary FLA, tweens, scripts, audio/video, and private `.dat` payloads are not presented as fully reconstructed.
- XD: bounded UCF/ZIP, manifest, and AGC inspection with the highest-resolution structurally referenced PNG/JPEG preview plus artboard, layer, and resource inventories. Native AGC vector reconstruction is not claimed.
- INDD/INDT: an embedded JPEG/PNG thumbnail is shown only after master-page, contiguous-object, and XMP boundaries are verified. The proprietary native layout database is not guessed; export IDML for full page rendering.
- ASE/ACO: bounded color-model, name, and group parsing with search, print, and HTML palette output. Browser sRGB for Lab/CMYK is approximate and the original values remain visible.
- ABR: modern ABR 6/7/9/10 tip alpha, embedded patterns, and preset parameters. Photoshop stroke dynamics and blending are not simulated.
- CSH: v2 Bezier paths with boolean-operation metadata. Subtract, intersect, and exclude are not presented as Photoshop-equivalent final raster output.
- PAT: v1 8-bit RGB, grayscale, and indexed pattern tiles with Raw/PackBits, alpha, transparent-index, and exact pixel previews. Older revisions, 16/32-bit data, CMYK/Lab, and other compression modes fail explicitly.
- GRD: v5 Action Descriptors, folders, solid color/alpha stops, and browser previews. Noise gradients use a labeled deterministic approximation and are not claimed to match Photoshop's private noise algorithm pixel for pixel.
- ASL: v2 style names/IDs, effect graphs, multi-effect counts, blend/opacity/Blend If summaries, pattern references, and embedded PAT previews. A final style raster is not fabricated without a target layer, fonts, color configuration, and Photoshop's private effect semantics.
- EPS/PS: Stet WASM runs in a terminable Worker with multi-page, demand-rasterized zoom and bounded printing. The distributed runtime excludes upstream URW Base35 and Ghostscript CMYK ICC assets, using OFL substitutes and the PLRM DeviceCMYK formula fallback. This is an experimental general preview, not a claim of complete Adobe PostScript Level 3 compatibility; font metrics and color management can differ from Adobe applications.

The format catalog marks these states separately. Recognizing an extension is not counted as complete format support.

## Usage

```ts
import { designRenderer } from '@file-viewer/renderer-design'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [designRenderer, pdfRenderer],
  design: {
    workerUrl: '/vendor/design/photoshop.worker.js',
    illustratorWorkerUrl: '/vendor/design/illustrator-pgf.worker.js',
    illustratorMode: 'auto', // auto | pdf | native
    containerWorkerUrl: '/vendor/design/adobe-container.worker.js',
    adobeResourceWorkerUrl: '/vendor/design/adobe-resource.worker.js',
    postscriptWorkerUrl: '/vendor/design/postscript.worker.js',
    postscriptWasmUrl: '/vendor/design/stet_wasm_bg.wasm',
    idmlWorkerUrl: '/vendor/design/idml.worker.js',
    idmlWasmUrl: '/vendor/design/paged_introspect_wasm_bg.wasm',
  },
}
```

Native PGF AI/AIT preview can use the design renderer alone; only the PDF-compatible surface requires the PDF renderer. `auto` prefers the PDF surface when available and otherwise tries native PGF. The design renderer remains an explicit on-demand installation and is not injected into preset-all or full component packages.

## Offline asset

PSD/PSB/PDD/PSDT, AI/AIT, XD/INDD/INDT/ASE/ACO/ICML/IDMS/INX/FLA/XFL, ABR/CSH/PAT/GRD/ASL, IDML, and EPS/PS use the matching `vendor/design/*.worker.js` paths. Native AI/AIT uses `illustrator-pgf.worker.js`; ICML/IDMS/INX/FLA/XFL share the Adobe container Worker with XD/INDD/ASE/ACO; PAT/GRD/ASL share the Adobe resource Worker, adding no runtime network dependency. IDML also needs `paged_introspect_wasm_bg.wasm`; EPS/PS needs `stet_wasm_bg.wasm`. With renderer-design installed, `@file-viewer/vite-plugin` can copy manifest assets, while `@file-viewer/assets-design` provides an explicit copy path. The corresponding `options.design.*Url` fields can point to other self-hosted locations. The packaged browser Worker includes bounded streaming zstd decoding and supports uncompressed, deflate, and Illustrator 24 zstd private source; over-limit output and unsupported long-distance zstd frames fail explicitly. License texts are distributed with the npm package or beside the WASM files.

## Security and performance boundaries

Defaults cap the source at 128 MiB, the document at 16 million pixels and 16,384 pixels per side, the layer tree at 2,000 entries, one interactive layer at 16 million pixels, one decoded result at 128 MiB, and retained main-thread layer canvases at 64 MiB. IDML and EPS/PS print gates account for the visible canvas, cache, print copies, and current decode temporary as one working set. A timeout terminates the Worker. The saved composite must use Raw or PackBits RLE and ZIP composites fail explicitly. PSD ZIP layer channels can be decoded lazily by ag-psd; the current PSB parser rejects a file containing ZIP layer channels. Read-only structure views release the Worker source and parse tree immediately after open. An embedded ICC profile currently produces an unconverted-color diagnostic. Corrupt, oversized, unsupported-depth, and unsupported-color files fail explicitly. `useWorker: false` applies only to the Photoshop/resource paths that explicitly provide a local fallback; XD, INDD/INDT, ASE/ACO, IDML, and EPS/PS always require a terminable Worker.

EPS/PS separately defaults to a 32 MiB source, 100 pages, 8,192 pixels per side, 16 million output pixels, 256 MiB VM, and a 30-second Worker operation; timeout or abort terminates the Worker. See `POSTSCRIPT-WASM.md` for the full build and safety boundary.

The mobile layout includes fit-to-view, canvas pan, pinch zoom, and a layer drawer. Complex PSD/PSB layer trees remain read-only so that an inaccurate browser recomposite never replaces the high-fidelity saved composite.

## License

This package is Apache-2.0. `ag-psd`, `@webtoon/psd`, `base64-js`, `pako`, `@xmldom/xmldom`, and `xmlchars` are MIT-licensed; `saxes` is ISC; File Viewer elects MPL-2.0 for `@paged-media/introspect-wasm`; Stet is Apache-2.0 OR MIT; and the four substitute font families are SIL OFL 1.1. See `THIRD_PARTY_NOTICES.md`; full texts ship in both the npm and offline asset packages. The npm package contains no upstream image or brush fixtures. External Demo fixtures record their sources, licenses, and hashes in `SOURCES.md` and the fixture manifests.
