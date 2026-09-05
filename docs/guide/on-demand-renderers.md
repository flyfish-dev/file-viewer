# Modular And On-demand Renderers

<div class="doc-kicker">Small When You Can, Complete When You Need</div>

<p class="doc-lead">
  The 2.1.0 architecture lets teams choose minimal renderer imports, product-shaped presets, or the complete official demo capability set.
</p>

The additive v3 `standard` profile, CLI plan, measured closure budget, and full-cutover blockers are documented in [V3 Modular Profiles](/guide/v3-modular-profiles).

## Minimal Import

For a PDF-only Vue 3 product:

```bash
npm install @file-viewer/vue3 @file-viewer/renderer-pdf
```

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer]
}
```

This path is bundler-neutral and works in Webpack, Rspack, Rollup, Umi, classic multi-page apps, and micro-frontends. Vite projects can add the plugin to generate and inject the renderer import automatically:

```bash
npm install -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf'],
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

`copyAssets` copies the offline payload that the installed packages provide. The PDF CJK fallback font is owned by `@file-viewer/assets-standard`, which `@file-viewer/preset-standard` installs; `@file-viewer/preset-office` and `@file-viewer/preset-all` declare `@fontsource-variable/noto-sans-sc` instead, so every profile that activates the pdf renderer self-hosts the font. When no source is installed the build still succeeds and the plugin only warns that the font was skipped, leaving PDF rendering to embedded fonts. `pnpm test:pdf-cjk-font-github-242` keeps this contract as a regression gate: every preset that activates the pdf renderer declares a font source, `@file-viewer/renderer-pdf` declares none itself, and the asset stays optional.

The plugin reads the Vite major installed by the application. Vite 5–7 receive `build.rollupOptions.output.manualChunks`; Vite 8 receives `build.rolldownOptions.output.codeSplitting.groups`. Existing application groups, priorities, array outputs, and `codeSplitting:false` are preserved, so the plugin adds only its stable CodeMirror and renderer groups.

## Presets

| Preset | Best for |
| --- | --- |
| `@file-viewer/preset-lite` | Text, code, Markdown, image, audio, and video attachments |
| `@file-viewer/preset-standard` | Common Office/PDF/OFD/archive/email/text/media formats without specialist or legacy-heavy capabilities |
| `@file-viewer/preset-office` | PDF, Word, spreadsheet, presentation, OFD, and OpenDocument workflows |
| `@file-viewer/preset-engineering` | CAD, EDA, Typst, archives, email, data, 3D, geo, drawing, and mind maps |
| `@file-viewer/preset-all` | Admin workbenches that need the published compatibility renderer set, including CHM; later specialist capabilities remain explicit |

## Optional Specialist Renderers

Adobe design, DICOM, and digital-signature inspection are explicit opt-ins. They are not dependencies of the eight published `@file-viewer/*-full` packages or the frozen `@file-viewer/preset-all` compatibility baseline. This preserves the published Full contract and prevents specialist Worker/WASM, medical-imaging, or cryptographic dependencies from appearing during an ordinary upgrade.

| Optional renderer | Formats | Direct npm install | CLI selection | What the viewer shows |
| --- | --- | --- | --- | --- |
| **Adobe design** (`@file-viewer/renderer-design`) | `.psd`, `.psb`, `.pdd`, `.psdt`, `.ai`, `.ait`, `.eps`, `.ps`, `.idml`, `.icml`, `.idms`, `.inx`, `.xd`, `.indd`, `.indt`, `.fla`, `.xfl`, `.ase`, `.aco`, `.abr`, `.csh`, `.pat`, `.grd`, `.asl` | `npm install @file-viewer/renderer-design` | `npx file-viewer-cli config add psd --write` | Browser-local Worker/WASM previews for saved Photoshop pixels and supported layers; verified PDF-compatible Illustrator plus switchable native PGF artboards/layers/paths through `illustrator-pgf`; IDML and exchange structures; embedded XD/INDD previews; modern XFL; palettes; Photoshop resources; and PostScript. Unsupported native operators and fidelity limits remain explicit. |
| **DICOM** (`@file-viewer/renderer-dicom`) | `.dcm`, `.dicom` | `npm install @file-viewer/renderer-dicom` | `npx file-viewer-cli config add dicom --write` | One local DICOM Part 10 file, including multi-frame navigation, window width/center, zoom, pan, rotation, fit-to-view, and basic metadata. It does not assemble studies or provide PACS/DICOMweb, MPR, segmentation, or diagnosis. |
| **Digital signatures** (`@file-viewer/renderer-signature`) | `.p7m`, `.p7s`, `.p7b`, `.p7c`, `.pkcs7`, `.cms`, `.cmsc`, `.tsq`, `.tsr`, `.tst`, `.tsd`, `.asics`, `.scs`, `.asice`, `.sce`, `.ers`, `.jws`, `.asc`, `.sig`, `.pgp`, `.gpg` | `npm install @file-viewer/renderer-signature` | `npx file-viewer-cli config add p7m --write` | Bounded browser-local inspection of CMS/PKCS#7, selected CAdES data, timestamps, ASiC containers, evidence records, JWS, and public OpenPGP inputs. Parsing, digest, signature, and timestamp results are reported separately. |

### I already use a Full package. How do I enable an optional renderer?

The same rule applies to `@file-viewer/web-full`, `@file-viewer/vue3-full`, `@file-viewer/vue2.7-full`, `@file-viewer/vue2.6-full`, `@file-viewer/react-full`, `@file-viewer/react-legacy-full`, `@file-viewer/jquery-full`, and `@file-viewer/svelte-full`.

Keep the Full package installed, then add only the specialist renderer the application needs. The following example enables all three current opt-ins; remove any package, import, and array entry that the application does not need:

```bash
npm install @file-viewer/renderer-design @file-viewer/renderer-dicom @file-viewer/renderer-signature
```

```ts
import { designRenderer } from '@file-viewer/renderer-design'
import { dicomRenderer } from '@file-viewer/renderer-dicom'
import { signatureRenderer } from '@file-viewer/renderer-signature'

const options = {
  rendererMode: 'extend',
  renderers: [designRenderer, dicomRenderer, signatureRenderer]
}
```

`rendererMode: 'extend'` keeps the preset supplied by the Full package and appends these renderers. Use `replace` only when the explicitly configured renderers should become the complete set.

#### CLI-managed projects

Run any relevant `config add` commands, then install the resulting plan:

```bash
# Adobe design
npx file-viewer-cli config add psd --write

# DICOM
npx file-viewer-cli config add dicom --write

# Digital-signature containers
npx file-viewer-cli config add p7m --write

npx file-viewer-cli install --yes
```

Use `npx file-viewer-cli list` to inspect the current catalog before changing a project.

> Directly installing a Full package and selecting the CLI `full` profile are intentionally different. A Full package keeps the published `preset-all` compatibility baseline. The CLI `full` profile keeps that package and defaults to the established DICOM/signature additions; Adobe design is added only when `config add`, `--formats`, or `--capabilities` explicitly selects it, after its weight and license boundaries are shown.

### Using a prebuilt `web-full` browser bundle?

The downloadable `web-full` IIFE bundle contains the published Full renderer set. Adobe design, DICOM, and digital-signature renderers are not embedded in that bundle.

Use a package-manager project or the File Viewer CLI when the integration needs an optional renderer. Copying a renderer package next to the prebuilt bundle does not register it.

The digital-signature renderer can pass safely extracted PDF, XML, image, Office, or other supported content back through the nested-renderer pipeline, so keep the matching normal renderer available when that preview is required. Cryptographic verification does not establish certificate or key trust, qualified-signature status, policy compliance, or legal validity.

## Renderer Package Reference

Install a single renderer when a product needs the smallest possible capability set:

| Renderer package | Export | Main pipeline |
| --- | --- | --- |
| `@file-viewer/renderer-pdf` | `pdfRenderer` | PDF |
| `@file-viewer/renderer-word` | `wordRenderer` | DOCX, DOC, DOT, RTF, ODT |
| `@file-viewer/renderer-spreadsheet` | `spreadsheetRenderer` | Excel, OpenDocument spreadsheet, CSV-like tables |
| `@file-viewer/renderer-pptx` | `pptxRenderer` | Modern OpenXML PowerPoint without the legacy PPT runtime |
| `@file-viewer/renderer-ppt` | `pptRenderer` | Optional legacy binary `.ppt` / `.pot` runtime |
| `@file-viewer/renderer-presentation` | `presentationRenderer` | Compatibility aggregate for both PowerPoint families |
| `@file-viewer/renderer-ofd` | `ofdRenderer` | OFD |
| `@file-viewer/renderer-cad` | `cadRenderer` | DWG, DXF, DWF, DWFx, XPS |
| `@file-viewer/renderer-3d` | `modelRenderer` | 3D models and lightweight geometry signatures |
| `@file-viewer/renderer-design` | `designRenderer` | PSD/PSB/PDD/PSDT, AI/AIT, EPS/PS, IDML/ICML/IDMS/INX, XD, INDD/INDT, modern FLA/XFL, ASE/ACO, and ABR/CSH/PAT/GRD/ASL |
| `@file-viewer/renderer-dicom` | `dicomRenderer` | Selected local DICOM Part 10 single-file and multi-frame preview in the standard Viewer entry |
| `@file-viewer/renderer-signature` | `signatureRenderer` | Selected CMS/CAdES, timestamp, ASiC, evidence-record, JWS, and public OpenPGP inspection in the standard Viewer entry |

Binary PowerPoint and OpenXML PowerPoint now have separate npm renderer packages. The compatibility aggregate keeps the existing root and subpath APIs. The packaged `.ppt` 0.3.3 runtime is zero-config in layouts that explicitly install it; for custom asset layouts, configure `presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl`. PPTX continues to use `presentation.workerUrl` / `workerType`.

Strict PPTX-only applications should import `pptxRenderer` from `@file-viewer/renderer-pptx`, or configure `fileViewerRenderers({ formats: ['pptx'] })`. Both paths exclude the classic `.ppt` package, font, and WASM from the install and production closure. Existing `@file-viewer/renderer-presentation/pptx` imports remain compatible. The binary-only package is `@file-viewer/renderer-ppt`.

| `@file-viewer/renderer-drawing` | `drawingRenderer` | draw.io, Excalidraw, Mermaid, PlantUML |
| `@file-viewer/renderer-mindmap` | `mindmapRenderer` | XMind |
| `@file-viewer/renderer-geo` | `geoRenderer` | GeoJSON, KML, GPX, SHP |
| `@file-viewer/renderer-typst` | `typstRenderer` | Typst source rendered through local WASM assets |
| `@file-viewer/renderer-archive` | `archiveRenderer` | Archives and nested file preview |
| `@file-viewer/renderer-chm` | `chmRenderer` | CHM contents, index, search, internal links, and local Rust/WASM topic extraction |
| `@file-viewer/renderer-email` | `emailRenderer` | EML, MSG, MBOX |
| `@file-viewer/renderer-epub` | `ebookRenderer` | EPUB, UMD |
| `@file-viewer/renderer-text` | `textRenderer` | Markdown, highlighted code, patch, git bundle |
| `@file-viewer/renderer-image` | `imageRenderer` | Image and HEIC / HEIF paths |
| `@file-viewer/renderer-media` | `mediaRenderer` | Audio, video, HLS, MIDI summaries |
| `@file-viewer/renderer-data` | `dataRenderer` | PSD, fonts, SQLite, Parquet, Avro, WASM, WebArchive |
| `@file-viewer/renderer-eda` | `edaRenderer` | OLB, DRA, GDS, OAS/OASIS |

Engine packages such as `@file-viewer/pptx`, `@file-viewer/geometry-engine`, `@file-viewer/eda-layout`, and `@file-viewer/eda-orcad` are maintained for renderer internals and advanced reuse. Normal viewer integrations should use the renderer or preset package above.

### CHM with a self-hosted Rust/WASM Worker

Install the standalone renderer when an application only needs Compiled HTML Help:

```bash
npm install @file-viewer/vue3 @file-viewer/renderer-chm
```

```ts
import { chmRenderer } from '@file-viewer/renderer-chm'

const options = {
  rendererMode: 'replace',
  renderers: [chmRenderer]
}
```

Vite projects can instead select `formats: ['chm']` with `copyAssets:true`. `preset-all` and the Full packages already include the renderer, but the deployment must still publish these version-matched files under `file-viewer/vendor/chm/`:

- `chm.worker.js`
- `chm_wasm.js`
- `chm_wasm_bg.wasm`

The Vite plugin and the same-version asset copy CLI publish that directory automatically. A custom asset layout can override it with `options.chm.workerUrl`, `options.chm.wasmModuleUrl`, and `options.chm.wasmUrl`; do not point production deployments at a public CDN.

The archive is parsed locally in a dedicated Worker. Topic HTML is sanitized before display and rendered in an iframe sandbox without `allow-scripts`; a restrictive CSP also disables scripts, plugins, forms, base-URL rewriting, and automatically loaded remote active content. Internal `ms-its:` / `mk:@MSITStore` links and packaged resources are resolved back into the current CHM instead of receiving network access. This is a read-only documentation viewer, not an ActiveX-compatible HTML Help runtime.

## Automatic Preset Assembly

For an Office document platform, the bundler-neutral path is:

```bash
npm install @file-viewer/vue3 @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

const options = {
  rendererMode: 'replace',
  preset: officePreset
}
```

`@file-viewer/vite-plugin` can discover installed presets and inject the generated virtual module into the Vite HTML entry. In Vite projects, add the plugin once and the framework component automatically receives that preview capability without a manual preset import:

```bash
npm install -D @file-viewer/vite-plugin
```

```ts
fileViewerRenderers({
  copyAssets: true
  // No preset option required: installed @file-viewer/preset-* packages are discovered.
})
```

`inject` defaults to true. Preset packages register themselves in core when imported, and `FileViewerOptions.autoRenderers` defaults to true in normal `extend` mode. Set `autoRenderers:false` only when a product needs full manual control.

The default experience is intentionally zero-config: if the plugin receives no explicit `preset`, `formats`, or `renderers`, or only receives `copyAssets:true`, it auto-discovers installed `@file-viewer/preset-*` packages. `preset-all` takes precedence when present; otherwise installed `lite`, `office`, and `engineering` presets are composed.

Install `@file-viewer/preset-all` when an application needs the published compatibility baseline. Adobe design, DICOM, and digital signatures remain explicit:

```bash
npm install @file-viewer/vue3 @file-viewer/preset-all
# Vite projects add the plugin:
npm install -D @file-viewer/vite-plugin
```

Use `preset:'auto'` or `autoPresets:true` when you also enable `scan:true`; this keeps installed preset discovery active while source hints add extra renderers. If `preset-all` is installed, it takes precedence to avoid importing narrower presets twice.

```ts
fileViewerRenderers({
  preset: 'auto',
  scan: true,
  formats: ['pdf'],
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

| Customization | Purpose |
| --- | --- |
| `copyAssets:true` | Copies matched Worker, WASM, font, PDF/CAD/Typst/Archive/CHM/Data, and vendor assets, including the three files under `vendor/chm/` |
| `preset:'auto'` / `autoPresets:true` | Keeps installed preset auto-discovery active together with `scan:true` |
| `formats` / `renderers` | Adds a few formats outside a preset, or builds a strict single-renderer bundle |
| `scan:true` | Collects format hints from `fileViewerFormats`, `data-file-viewer-formats`, `accept`, and similar source hints |
| `inject:false` | Disables auto injection so application code imports `virtual:file-viewer-renderers` and passes `options.renderers` manually |
| `chunkStrategy:'renderer'` | Uses renderer-level chunk names for caching and heavy-pipeline size debugging |

## Manual Control

Strict bundles can still use the virtual module directly:

```ts
fileViewerRenderers({
  formats: ['pdf'],
  inject: false,
  copyAssets: true
})
```

```ts
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  rendererMode: 'replace',
  renderers: configuredFileViewerRenderers
}
```

`scan:true` detects hints such as `fileViewerFormats`, `data-file-viewer-formats`, and upload `accept` attributes, then merges them with explicit `formats`.

## Missing Renderer Guidance

If a file extension is in the supported matrix but its renderer has not been assembled, the viewer shows a friendly install-oriented state. For example, opening `.pdf` without the PDF renderer recommends `@file-viewer/preset-office` or `@file-viewer/renderer-pdf`. Only extensions outside the matrix are shown as truly unsupported.

## Asset Rules

Use `copyAssets:true` or `npx --yes file-viewer-copy-assets ./public/file-viewer` for standard-package offline deployments. Full packages include the matching CLI and use `npx --no-install file-viewer-copy-assets ./public/file-viewer`. Worker, WASM, font, PDF, CAD, Typst, Archive, CHM, Data, and Draw.io assets should be served from your own domain. A CHM deployment is complete only when `vendor/chm/chm.worker.js`, `vendor/chm/chm_wasm.js`, and `vendor/chm/chm_wasm_bg.wasm` are available with JavaScript and WebAssembly MIME types.

## CHM Completion Checklist

- [x] `@file-viewer/renderer-chm` is available as a standalone renderer and is included by `preset-all` / Full packages.
- [x] The Rust/WASM parser runs in a dedicated Worker, and standard asset tooling self-hosts the Worker, JavaScript bridge, and WASM binary under `vendor/chm/`.
- [x] Contents, keyword index, text search, internal navigation, and packaged resources stay within the current archive.
- [x] Topic documents are sanitized, scripts remain disabled by sandbox and CSP, and remote active content is not loaded automatically.
