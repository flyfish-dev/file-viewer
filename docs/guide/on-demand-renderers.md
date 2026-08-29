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

DICOM and digital-signature inspection are intentionally **opt-in** specialist capabilities. They are not installed automatically by the historical `@file-viewer/*-full` packages or by the frozen `@file-viewer/preset-all` compatibility matrix. This keeps upgrades from unexpectedly adding large medical-imaging or cryptographic dependencies.

| Optional renderer | Formats | Direct npm install | CLI selection | What the viewer shows |
| --- | --- | --- | --- | --- |
| **DICOM** (`@file-viewer/renderer-dicom`) | `.dcm`, `.dicom` | `npm install @file-viewer/renderer-dicom` | `npx file-viewer-cli config add dicom --write` | Local DICOM Part 10 single-frame and multi-frame images with frame navigation, window width/center, zoom, pan, 90° rotation, fit-to-view, and basic image metadata. It is a preview aid, not a diagnostic workstation. |
| **Digital signatures** (`@file-viewer/renderer-signature`) | `.p7m`, `.p7s`, `.p7b`, `.p7c`, `.pkcs7`, `.cms`, `.cmsc`, `.tsq`, `.tsr`, `.tst`, `.tsd`, `.asics`, `.scs`, `.asice`, `.sce`, `.ers`, `.jws`, `.asc`, `.sig`, `.pgp`, `.gpg` | `npm install @file-viewer/renderer-signature` | `npx file-viewer-cli config add p7m --write` | Browser-local inspection of CMS/PKCS#7 and selected CAdES data, timestamps, ASiC containers, evidence records, JWS, and OpenPGP. It can show signers, certificates, algorithms, digest/signature verification results, timestamps, and safely extracted embedded documents. |

### I already use a Full package. How do I enable an optional renderer?

The same rule applies to every historical Full package: `@file-viewer/web-full`, `@file-viewer/vue3-full`, `@file-viewer/vue2.7-full`, `@file-viewer/vue2.6-full`, `@file-viewer/react-full`, `@file-viewer/react-legacy-full`, `@file-viewer/jquery-full`, and `@file-viewer/svelte-full`.

**Keep your existing Full package installed.** Do not replace it and do not switch away from the Full integration. Install only the optional renderer you need, then add it with `rendererMode:'extend'` so the existing Full renderer set remains available.

#### Add DICOM

```bash
npm install @file-viewer/renderer-dicom
```

```ts
import { dicomRenderer } from '@file-viewer/renderer-dicom'

const options = {
  rendererMode: 'extend',
  renderers: [dicomRenderer]
}
```

#### Add digital-signature formats

```bash
npm install @file-viewer/renderer-signature
```

```ts
import { signatureRenderer } from '@file-viewer/renderer-signature'

const options = {
  rendererMode: 'extend',
  renderers: [signatureRenderer]
}
```

#### Add both optional renderers

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

`rendererMode:'extend'` is important in these examples: it keeps the renderer baseline already provided by the Full package and appends the selected specialist renderer. Do not change an existing Full integration to a DICOM-only or signature-only `replace` configuration unless you intentionally want to remove the other Full capabilities.

If the project is managed with the File Viewer CLI, select the optional capability and then run the install step:

```bash
# DICOM
npx file-viewer-cli config add dicom --write

# Digital signatures
npx file-viewer-cli config add p7m --write

# Install the selected capability packages and regenerate the integration
npx file-viewer-cli install --yes
```

> Installing an `@file-viewer/*-full` package directly is not the same as selecting the CLI `full` profile. The historical Full packages keep their published compatibility closure and do not silently gain later specialist renderers. The CLI `full` profile intentionally combines the matching historical Full package with the later opt-in capabilities in the current CLI catalog.

### Using a prebuilt `web-full` browser bundle?

The downloadable/prebuilt `web-full` IIFE bundle preserves the historical Full renderer set. DICOM and digital-signature renderers are **not embedded** in that prebuilt bundle.

If you need these specialist capabilities, use File Viewer from a package-manager project and install the optional renderer package as shown above, or use the File Viewer CLI to generate the integration. Simply downloading the historical `web-full` browser bundle does not enable DICOM or digital-signature formats, and copying an optional renderer package next to the bundle is not a substitute for registering it in the integration.

For signature containers that contain an embedded PDF, XML, image, Office document, or another supported file, keep the corresponding normal renderer available as well so the safely extracted payload can continue through the nested-renderer pipeline. Signature parsing or cryptographic verification does not by itself establish certificate/key trust, qualified-signature status, policy compliance, or legal validity.

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

Install `@file-viewer/preset-all` when a heavy user wants the fastest compatibility-matrix setup. Later specialist capabilities such as DICOM and digital signatures remain explicit:

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
