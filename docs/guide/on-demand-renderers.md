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

The plugin reads the Vite major installed by the application. Vite 5–7 receive `build.rollupOptions.output.manualChunks`; Vite 8 receives `build.rolldownOptions.output.codeSplitting.groups`. Existing application groups, priorities, array outputs, and `codeSplitting:false` are preserved, so the plugin adds only its stable CodeMirror and renderer groups.

## Presets

| Preset | Best for |
| --- | --- |
| `@file-viewer/preset-lite` | Text, code, Markdown, image, audio, and video attachments |
| `@file-viewer/preset-standard` | Common Office/PDF/OFD/archive/email/text/media formats without specialist or legacy-heavy capabilities |
| `@file-viewer/preset-office` | PDF, Word, spreadsheet, presentation, OFD, and OpenDocument workflows |
| `@file-viewer/preset-engineering` | CAD, EDA, Typst, archives, email, data, 3D, geo, drawing, and mind maps |
| `@file-viewer/preset-all` | Admin workbenches that need the published compatibility renderer set; later specialist capabilities remain explicit |

## Optional Specialist Renderers

DICOM and digital-signature inspection are explicit opt-ins. They are not dependencies of the eight published `@file-viewer/*-full` packages or `@file-viewer/preset-all`. This preserves the published Full contract and avoids adding medical-imaging or cryptographic dependencies during an ordinary upgrade.

| Optional renderer | Formats | Direct npm install | CLI selection | What the viewer shows |
| --- | --- | --- | --- | --- |
| **DICOM** (`@file-viewer/renderer-dicom`) | `.dcm`, `.dicom` | `npm install @file-viewer/renderer-dicom` | `npx file-viewer-cli config add dicom --write` | One local DICOM Part 10 file, including multi-frame navigation, window width/center, zoom, pan, rotation, fit-to-view, and basic metadata. It does not assemble studies or provide PACS/DICOMweb, MPR, segmentation, or diagnosis. |
| **Digital signatures** (`@file-viewer/renderer-signature`) | `.p7m`, `.p7s`, `.p7b`, `.p7c`, `.pkcs7`, `.cms`, `.cmsc`, `.tsq`, `.tsr`, `.tst`, `.tsd`, `.asics`, `.scs`, `.asice`, `.sce`, `.ers`, `.jws`, `.asc`, `.sig`, `.pgp`, `.gpg` | `npm install @file-viewer/renderer-signature` | `npx file-viewer-cli config add p7m --write` | Bounded browser-local inspection of CMS/PKCS#7, selected CAdES data, timestamps, ASiC containers, evidence records, JWS, and public OpenPGP inputs. Parsing, digest, signature, and timestamp results are reported separately. |

### I already use a Full package. How do I enable an optional renderer?

The same rule applies to `@file-viewer/web-full`, `@file-viewer/vue3-full`, `@file-viewer/vue2.7-full`, `@file-viewer/vue2.6-full`, `@file-viewer/react-full`, `@file-viewer/react-legacy-full`, `@file-viewer/jquery-full`, and `@file-viewer/svelte-full`.

Keep the Full package installed, then add only the specialist renderer the application needs. The following example enables both published opt-ins; remove either package, import, and array entry when only one is needed:

```bash
npm install @file-viewer/renderer-dicom @file-viewer/renderer-signature
```

```ts
import { dicomRenderer } from '@file-viewer/renderer-dicom'
import { signatureRenderer } from '@file-viewer/renderer-signature'

const options = {
  rendererMode: 'extend',
  renderers: [dicomRenderer, signatureRenderer]
}
```

`rendererMode: 'extend'` keeps the preset supplied by the Full package and appends these renderers. Use `replace` only when the explicitly configured renderers should become the complete set.

#### CLI-managed projects

Run one or both relevant `config add` commands, then install the resulting plan:

```bash
# DICOM
npx file-viewer-cli config add dicom --write

# Digital-signature containers
npx file-viewer-cli config add p7m --write

npx file-viewer-cli install --yes
```

Use `npx file-viewer-cli list` to inspect the current catalog before changing a project.

> Directly installing a Full package and selecting the CLI `full` profile are intentionally different. A Full package keeps the published `preset-all` compatibility baseline. The CLI `full` profile keeps that package and adds the current explicit opt-ins after presenting their weight and license boundaries.

### Using a prebuilt `web-full` browser bundle?

The downloadable `web-full` IIFE bundle contains the published Full renderer set. DICOM and digital-signature renderers are not embedded in that bundle.

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
| `@file-viewer/renderer-dicom` | `dicomRenderer` | Selected local DICOM Part 10 single-file and multi-frame preview in the standard Viewer entry |
| `@file-viewer/renderer-signature` | `signatureRenderer` | Selected CMS/CAdES, timestamp, ASiC, evidence-record, JWS, and public OpenPGP inspection in the standard Viewer entry |

Binary PowerPoint and OpenXML PowerPoint now have separate npm renderer packages. The compatibility aggregate keeps the existing root and subpath APIs. The packaged `.ppt` 0.3.3 runtime is zero-config in layouts that explicitly install it; for custom asset layouts, configure `presentation.pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl`. PPTX continues to use `presentation.workerUrl` / `workerType`.

Strict PPTX-only applications should import `pptxRenderer` from `@file-viewer/renderer-pptx`, or configure `fileViewerRenderers({ formats: ['pptx'] })`. Both paths exclude the classic `.ppt` package, font, and WASM from the install and production closure. Existing `@file-viewer/renderer-presentation/pptx` imports remain compatible. The binary-only package is `@file-viewer/renderer-ppt`.

| `@file-viewer/renderer-drawing` | `drawingRenderer` | draw.io, Excalidraw, Mermaid, PlantUML |
| `@file-viewer/renderer-mindmap` | `mindmapRenderer` | XMind |
| `@file-viewer/renderer-geo` | `geoRenderer` | GeoJSON, KML, GPX, SHP |
| `@file-viewer/renderer-typst` | `typstRenderer` | Typst source rendered through local WASM assets |
| `@file-viewer/renderer-archive` | `archiveRenderer` | Archives and nested file preview |
| `@file-viewer/renderer-email` | `emailRenderer` | EML, MSG, MBOX |
| `@file-viewer/renderer-epub` | `ebookRenderer` | EPUB, UMD |
| `@file-viewer/renderer-text` | `textRenderer` | Markdown, highlighted code, patch, git bundle |
| `@file-viewer/renderer-image` | `imageRenderer` | Image and HEIC / HEIF paths |
| `@file-viewer/renderer-media` | `mediaRenderer` | Audio, video, HLS, MIDI summaries |
| `@file-viewer/renderer-data` | `dataRenderer` | PSD, fonts, SQLite, Parquet, Avro, WASM, WebArchive |
| `@file-viewer/renderer-eda` | `edaRenderer` | OLB, DRA, GDS, OAS/OASIS |

Engine packages such as `@file-viewer/pptx`, `@file-viewer/geometry-engine`, `@file-viewer/eda-layout`, and `@file-viewer/eda-orcad` are maintained for renderer internals and advanced reuse. Normal viewer integrations should use the renderer or preset package above.

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

Install `@file-viewer/preset-all` when an application needs the published compatibility baseline. DICOM and digital signatures remain explicit:

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
| `copyAssets:true` | Copies matched Worker, WASM, font, PDF/CAD/Typst/Archive/Data, and vendor assets |
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

Use `copyAssets:true` or `npx --yes file-viewer-copy-assets ./public/file-viewer` for standard-package offline deployments. Full packages include the matching CLI and use `npx --no-install file-viewer-copy-assets ./public/file-viewer`. Worker, WASM, font, PDF, CAD, Typst, Archive, Data, and Draw.io assets should be served from your own domain.
