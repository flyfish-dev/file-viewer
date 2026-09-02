# @file-viewer/vue3-full

A one-step Vue 3 Full integration that preserves the published v2.4 Full capability matrix and default asset-copy behavior, including iWork, CAD, 3D, EDA, Geo, Typst, Drawing, Hangul, WordPerfect, and legacy PPT. DICOM and future heavy formats do not enter the historical Full closure automatically and require explicit selection through `@file-viewer/cli`.

```bash
npm install @file-viewer/vue3-full
```

<!-- FILE_VIEWER_GENERATED:START -->
## Ecosystem Matrix

Every standard component package shares `@file-viewer/core` as the only common foundation, and no framework component package depends on another framework implementation. Core owns format metadata, source loading, the renderer protocol, events, operation APIs, search, zoom, print, export, and the framework-neutral browser shell. Heavy PDF, Word, PPT/PPTX, CAD, Typst, and similar pipelines are assembled explicitly through renderer packages or presets; each framework package owns its component lifecycle, type exports, compatibility defaults, and ecosystem-specific interaction layer.

| Framework | Standard npm package | Entrypoints | GitHub | Gitee | Historical aliases |
| --- | --- | --- | --- | --- | --- |
| Vanilla JS / Pure Web | `@file-viewer/web` | ESM, type declarations, script tag IIFE | [file-viewer-web](https://github.com/flyfish-dev/file-viewer-web) | [file-viewer-web](https://gitee.com/flyfish-dev/file-viewer-web) | `@flyfish-group/file-viewer-web` |
| Vanilla JS / Pure Web Full | `@file-viewer/web-full` | ESM, type declarations, script tag IIFE | [file-viewer-web-full](https://github.com/flyfish-dev/file-viewer-web-full) | [file-viewer-web-full](https://gitee.com/flyfish-dev/file-viewer-web-full) | none |
| Vue 3 | `@file-viewer/vue3` | ESM, type declarations | [file-viewer-vue3](https://github.com/flyfish-dev/file-viewer-vue3) | [file-viewer-vue3](https://gitee.com/flyfish-dev/file-viewer-vue3) | `@flyfish-group/file-viewer3`, `file-viewer3` |
| Vue 3 Full | `@file-viewer/vue3-full` | ESM, type declarations | [file-viewer-vue3-full](https://github.com/flyfish-dev/file-viewer-vue3-full) | [file-viewer-vue3-full](https://gitee.com/flyfish-dev/file-viewer-vue3-full) | none |
| Vue 2.7 | `@file-viewer/vue2.7` | ESM, type declarations | [file-viewer-vue2.7](https://github.com/flyfish-dev/file-viewer-vue2.7) | [file-viewer-vue2.7](https://gitee.com/flyfish-dev/file-viewer-vue2.7) | `@flyfish-group/file-viewer` |
| Vue 2.7 Full | `@file-viewer/vue2.7-full` | ESM, type declarations | [file-viewer-vue2.7-full](https://github.com/flyfish-dev/file-viewer-vue2.7-full) | [file-viewer-vue2.7-full](https://gitee.com/flyfish-dev/file-viewer-vue2.7-full) | none |
| Vue 2.6 | `@file-viewer/vue2.6` | ESM, type declarations | [file-viewer-vue2.6](https://github.com/flyfish-dev/file-viewer-vue2.6) | [file-viewer-vue2.6](https://gitee.com/flyfish-dev/file-viewer-vue2.6) | none |
| Vue 2.6 Full | `@file-viewer/vue2.6-full` | ESM, type declarations | [file-viewer-vue2.6-full](https://github.com/flyfish-dev/file-viewer-vue2.6-full) | [file-viewer-vue2.6-full](https://gitee.com/flyfish-dev/file-viewer-vue2.6-full) | none |
| React 18/19 | `@file-viewer/react` | ESM, type declarations | [file-viewer-react](https://github.com/flyfish-dev/file-viewer-react) | [file-viewer-react](https://gitee.com/flyfish-dev/file-viewer-react) | `@flyfish-group/file-viewer-react` |
| React 18/19 Full | `@file-viewer/react-full` | ESM, type declarations | [file-viewer-react-full](https://github.com/flyfish-dev/file-viewer-react-full) | [file-viewer-react-full](https://gitee.com/flyfish-dev/file-viewer-react-full) | none |
| React 16.8/17 | `@file-viewer/react-legacy` | ESM, type declarations | [file-viewer-react-legacy](https://github.com/flyfish-dev/file-viewer-react-legacy) | [file-viewer-react-legacy](https://gitee.com/flyfish-dev/file-viewer-react-legacy) | none |
| React 16.8/17 Full | `@file-viewer/react-legacy-full` | ESM, type declarations | [file-viewer-react-legacy-full](https://github.com/flyfish-dev/file-viewer-react-legacy-full) | [file-viewer-react-legacy-full](https://gitee.com/flyfish-dev/file-viewer-react-legacy-full) | none |
| jQuery | `@file-viewer/jquery` | ESM, type declarations | [file-viewer-jquery](https://github.com/flyfish-dev/file-viewer-jquery) | [file-viewer-jquery](https://gitee.com/flyfish-dev/file-viewer-jquery) | none |
| jQuery Full | `@file-viewer/jquery-full` | ESM, type declarations | [file-viewer-jquery-full](https://github.com/flyfish-dev/file-viewer-jquery-full) | [file-viewer-jquery-full](https://gitee.com/flyfish-dev/file-viewer-jquery-full) | none |
| Svelte | `@file-viewer/svelte` | Svelte component, ESM, type declarations | [file-viewer-svelte](https://github.com/flyfish-dev/file-viewer-svelte) | [file-viewer-svelte](https://gitee.com/flyfish-dev/file-viewer-svelte) | none |
| Svelte Full | `@file-viewer/svelte-full` | Svelte component, ESM, type declarations | [file-viewer-svelte-full](https://github.com/flyfish-dev/file-viewer-svelte-full) | [file-viewer-svelte-full](https://gitee.com/flyfish-dev/file-viewer-svelte-full) | none |

## Format Support Matrix

The legacy-compatible Full default registers 221 file extensions (221 stable and 0 experimental) across 32 preview pipelines, matching the published v2.4 capability contract. The current catalog has 266 file extensions and 45 preview pipelines; DICOM and other new heavy formats require explicit CLI selection and never expand an existing Full package automatically.

| Preview pipeline | Category | Extensions | Level / status | Capabilities | Loading |
| --- | --- | --- | --- | --- | --- |
| Word OpenXML | office | `.docx`, `.docm`, `.dotx`, `.dotm` | high-fidelity / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| Word Binary | office | `.doc`, `.dot` | structured / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| PowerPoint 97–2003 | office | `.ppt`, `.pot` | structured / stable | download, print(adapter), HTML export(adapter), zoom(provider) | lazy async |
| PowerPoint OpenXML | office | `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm` | high-fidelity / stable | download, print, HTML export, zoom(provider), search | lazy async |
| Open Document | office | `.rtf`, `.odt`, `.odp` | structured / stable | download, print, HTML export, zoom(provider), search | lazy async |
| Spreadsheet | office | `.xlsx`, `.xltx`, `.xlsm`, `.xlsb`, `.xls`, `.xlt`, `.xla`, `.xlam`, `.xltm`, `.csv`, `.tsv`, `.ods`, `.fods` | structured / stable | download, zoom(provider), search | lazy async |
| Apple Pages | office | `.pages` | high-fidelity / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| Apple Numbers | office | `.numbers` | high-fidelity / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| Apple Keynote | office | `.key` | high-fidelity / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| WordPerfect | office | `.wpd`, `.wp`, `.wp5`, `.wp6` | structured / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| dBASE Table | office | `.dbf` | structured / stable | download, zoom(provider), search | lazy async |
| PDF | document | `.pdf` | high-fidelity / stable | download, print(adapter), HTML export(adapter), zoom(provider), search(provider) | lazy async |
| OFD | document | `.ofd` | structured / stable | download, print, HTML export, zoom(provider), search | lazy async |
| Hancom Hangul | office | `.hwp`, `.hwpx` | structured / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| Typst | document | `.typ`, `.typst` | high-fidelity / stable | download, print(adapter), HTML export(adapter), zoom(provider), search | lazy async |
| Archive | archive | `.zip`, `.zipx`, `.7z`, `.rar`, `.tar`, `.gz`, `.gzip`, `.tgz`, `.bz2`, `.bzip2`, `.tbz`, `.tbz2`, `.xz`, `.txz`, `.lzma`, `.zst`, `.tzst`, `.cab`, `.ar`, `.cpio`, `.iso`, `.xar`, `.lha`, `.lzh`, `.jar`, `.war`, `.ear`, `.apk`, `.cbz`, `.cbr` | structured / stable | download, search | lazy async |
| Email | email | `.eml`, `.msg`, `.mbox` | structured / stable | download, HTML export, search | lazy async |
| EDA | eda | `.olb`, `.dra`, `.gds`, `.oas`, `.oasis` | structured / stable | download, print, HTML export, search | lazy async |
| CAD | cad | `.dxf`, `.dwg`, `.dwf`, `.dwfx`, `.xps` | high-fidelity / stable | download, print, HTML export, zoom(provider) | lazy async |
| 3D Model | model | `.glb`, `.gltf`, `.obj`, `.stl`, `.ply`, `.fbx`, `.dae`, `.3ds`, `.3mf`, `.amf`, `.usd`, `.usda`, `.usdc`, `.usdz`, `.kmz`, `.step`, `.stp`, `.iges`, `.igs`, `.ifc`, `.3dm`, `.brep`, `.pcd`, `.wrl`, `.vrml`, `.xyz`, `.vtk`, `.vtp` | structured / stable | download, zoom(provider) | lazy async |
| Geospatial | geo | `.geojson`, `.kml`, `.gpx`, `.shp` | structured / stable | download, print, HTML export, zoom(provider), search | lazy async |
| Drawing | drawing | `.excalidraw`, `.drawio`, `.dio`, `.mermaid`, `.mmd`, `.plantuml`, `.puml` | structured / stable | download, print, HTML export, zoom(provider), search | lazy async |
| Mind Map | mindmap | `.xmind` | structured / stable | download, print, HTML export, zoom(provider), search | lazy async |
| EPUB | ebook | `.epub` | high-fidelity / stable | download, HTML export, search(provider) | lazy async |
| FictionBook | ebook | `.fb2` | structured / stable | download, print, HTML export, search | lazy async |
| UMD | ebook | `.umd` | structured / stable | download, print, HTML export, zoom(provider), search | lazy async |
| Image | image | `.gif`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.tif`, `.png`, `.svg`, `.webp`, `.avif`, `.ico`, `.heic`, `.heif`, `.jxl` | high-fidelity / stable | download, print, HTML export, zoom(provider) | lazy async |
| Markdown | markdown | `.md`, `.markdown` | structured / stable | download, print, HTML export, search | lazy async |
| Code and Text | code | `.txt`, `.json`, `.js`, `.mjs`, `.cjs`, `.css`, `.java`, `.py`, `.html`, `.htm`, `.jsx`, `.ts`, `.tsx`, `.xml`, `.log`, `.vue`, `.yaml`, `.yml`, `.ini`, `.sh`, `.bash`, `.sql`, `.go`, `.rs`, `.php`, `.c`, `.cpp`, `.cc`, `.h`, `.hpp`, `.cs`, `.diff`, `.patch`, `.bundle`, `.bdl`, `.jsonc`, `.json5`, `.ipynb`, `.toml`, `.proto`, `.hcl`, `.tex`, `.gv`, `.http`, `.react`, `.rb`, `.swift`, `.kt` | structured / stable | download, print, HTML export, search | lazy async |
| Video | media | `.mp4`, `.webm`, `.m3u8` | high-fidelity / stable | download | lazy async |
| Audio | media | `.mp3`, `.mpeg`, `.wav`, `.ogg`, `.oga`, `.opus`, `.m4a`, `.aac`, `.flac`, `.weba`, `.midi`, `.mid` | high-fidelity / stable | download | lazy async |
| Data Asset | asset | `.ttf`, `.otf`, `.woff`, `.woff2`, `.psd`, `.ai`, `.eps`, `.sqlite`, `.wasm`, `.parquet`, `.avro`, `.webarchive` | structured / stable | download, HTML export, search | lazy async |

## Compatible Full Package Quick Start

`@file-viewer/vue3-full` continues to include `@file-viewer/preset-all` and preserves the published v2.4 contract of 221 extensions, 32 preview pipelines, and the default asset-copy behavior. Existing iWork, CAD, 3D, EDA, Geo, Typst, Drawing, WordPerfect, Hangul, legacy PPT, RTF, Mermaid, HLS/MIDI, and advanced text support is not removed. DICOM and future heavy formats do not enter this historical Full closure automatically.

The eight packages that retain this historical Full contract are: `@file-viewer/web-full`, `@file-viewer/vue3-full`, `@file-viewer/vue2.7-full`, `@file-viewer/vue2.6-full`, `@file-viewer/react-full`, `@file-viewer/react-legacy-full`, `@file-viewer/jquery-full`, `@file-viewer/svelte-full`. New projects that do not need the complete matrix should use `@file-viewer/cli` to select standard, lite, office, engineering, or custom capabilities. Existing Full users do not need to change their installation path.

A Full package keeps the version-aligned compatible copy-assets implementation and copies the historical complete asset set by default; `--renderers <csv>` can still narrow it. New capabilities such as DICOM use independent renderer and asset owners. All runtime resources remain offline and self-hostable.

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
npx file-viewer-cli add dcm --write       # example: add DICOM to an existing Full project
npx file-viewer-cli install --yes         # install the new capability, copy assets, and generate the module
```

### Vite: Deploy Installed Capability Assets

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [fileViewerRenderers({ copyAssets: true })]
}
```

The plugin recognizes the historical Full package and any separately installed capability asset owners, then publishes their resources under `file-viewer/` at the deployment base (`/file-viewer/` for a root deployment).

### Webpack / Rspack / Rollup / Vue CLI / Umi

Run the same-version compatible CLI installed with the Full package to copy the historical complete asset set by default, then serve its output as `file-viewer/` under the deployment base:

```bash
npx --no-install file-viewer-copy-assets ./public/file-viewer
```

The default runtime asset directory is `<deployment-base>/file-viewer/`, which is `/file-viewer/` for a root deployment. Call `setDefaultFullAssetBaseUrl()` only when assets live elsewhere; explicit `options.*Url` values keep the highest priority.

## Shared Options And Events

Every ecosystem package uses the same `ViewerMountOptions` and `FileViewerOptions` semantics, mapped to framework-native props, events, refs, actions, or plugin APIs.

| Option | Description |
| --- | --- |
| `url` | Remote file URL from object storage, business APIs, or intranet file services. |
| `file` | `File`, `Blob`, or `ArrayBuffer` for uploads, local selection, or already-fetched binary data. |
| `buffer` | Direct `ArrayBuffer` input after custom download, authorization, or decryption. |
| `name` / `filename` | Display name and extension hint. Pass it explicitly when the URL has no useful extension. |
| `type` | Explicit extension or MIME hint that overrides automatic detection. |
| `size` | File size hint used in lifecycle context, loading states, and safety limits. |
| `options` | The shared `FileViewerOptions` surface. Every component package keeps the same semantics. |
| `options.styleIsolation` | `auto`, `shadow`, `scoped`, or `none`. `auto` uses Shadow DOM for every standard component so host-page global CSS cannot break the toolbar or document; legacy projects can explicitly use `none`. |
| `onEvent` / `onStateChange` | Unified event and state subscriptions for imperative wrappers such as Vanilla JavaScript / Pure Web, React, and Svelte. Vue maps the same events to native emits. |

## Actual Component Props

The table below lists the real props, event channel, and customization entry for every standard package. If you need imperative mount fields such as `buffer`, `name`, `type`, or `size`, prefer Vanilla JavaScript / Pure Web, React, Svelte, jQuery, or Vue 2. The Vue 3 declarative component intentionally keeps the compact `url` / `file` / `options` entry; wrap raw binary input as a named `File` when extension detection matters.

| Component | Actual props / entry | Event channel | Customization entry |
| --- | --- | --- | --- |
| Vanilla JS / Pure Web `@file-viewer/web` | `<flyfish-file-viewer>` attributes: `src/url`, `filename/name`, `type`, `size`, `theme`, `toolbar`, `toolbar-position`, `watermark`, `search`, `options`; also supports `mountViewer(...)` | `viewer-ready`, `viewer-event`, `viewer-state-change`, `viewer-error`, `onEvent`, `onStateChange`, `controller.subscribe()` | The Custom Element instance exposes the full controller handle; the IIFE script auto-registers it while keeping imperative `mountViewer` and the asset copy CLI. |
| Vue 3 `@file-viewer/vue3` | `url`, `file`, `options` | `load-start`, `load-complete`, `unload-start`, `unload-complete`, `operation-before`, `operation-cancel`, `operation-availability-change`, `search-change`, `location-change`, `zoom-change`, `view-state-change`, `theme-change` | Template refs expose `FileViewerExpose`. For `Blob` / `ArrayBuffer`, prefer wrapping it as a named `File` so extension detection stays deterministic. |
| Vue 2.7 `@file-viewer/vue2.7` | `url`, `file`, `buffer`, `name`, `filename`, `type`, `size`, `options`, `containerClass`, `containerStyle` | `viewer-event` / `viewerEvent` | The component instance exposes the full controller handle. This is the Vue 2.7 line behind the historical `@flyfish-group/file-viewer` package. |
| Vue 2.6 `@file-viewer/vue2.6` | Same as Vue 2.7 | `viewer-event` / `viewerEvent` | Separate Vue 2.6 build for long-lived applications that cannot move to Vue 2.7. |
| React `@file-viewer/react` | `ViewerMountOptions` plus native `div` props such as `className`, `style`, `data-*`, and `aria-*` | `onEvent`, `onStateChange` | `ref` exposes `FileViewerHandle`; `useFileViewer()` returns `ref`, `props`, `state`, and `handle` for custom toolbars. |
| React Legacy `@file-viewer/react-legacy` | Same as the React package | `onEvent`, `onStateChange` | Targets React 16.8 / 17 with a legacy-friendly component export. |
| jQuery `@file-viewer/jquery` | `$(el).fileViewer(ViewerMountOptions & { replace?: boolean })` | `onEvent`, `onStateChange`, or `getFileViewerController(el).subscribe()` | Plugin methods include `zoomIn`, `printRenderedHtml`, and `searchDocument`; `replace:false` updates the same node in place. |
| Svelte `@file-viewer/svelte` | `ViewerMountOptions` plus `className` and `containerStyle` | `on:viewerEvent`, `onEvent`, `onStateChange` | `bind:this` exposes the controller handle; the `use:fileViewer` action is also available and adds `replace`. |

| Options Field | Description |
| --- | --- |
| `theme` | `light`, `dark`, or `system`. This takes precedence over browser `prefers-color-scheme`. |
| `styleIsolation` | `auto`, `shadow`, `scoped`, or `none`. With `auto`, Web Component, IIFE, Vue, React, Svelte, jQuery, and full packages all use Shadow DOM by default. Legacy integrations that depend on deep class overrides can explicitly use `none`. |
| `watermark` | Text or image watermark with opacity, rotation, gap, size, font, and color controls. |
| `toolbar` | Controls the theme toggle, download, print, HTML export, zoom, item order, toolbar position, and operation-level preflight checks. |
| `search` | Document search, highlight class names, case sensitivity, whole-word matching, max matches, and debounce. |
| `ai` | Text collection, chunk size, and max text length for provenance, location, vectorization, and external AI workflows. |
| `archive` | Archive Worker/WASM URLs, timeout, cache, archive limits, nested entry preview limits, and legacy GBK/GB18030 ZIP filename decoding. |
| `pdf` | PDF.js worker, navigation pane, outline, thumbnails, rotation, streaming, range chunk size, and credentials. |
| `docx` / `spreadsheet` | DOCX is provided by @file-viewer/renderer-word and uses the self-maintained @file-viewer/docx engine with automatic worker/main-thread selection, continuous flow reading, and async rendering by default; visual pagination is opt-in. Spreadsheet is provided by @file-viewer/renderer-spreadsheet with fidelity-first parsing, automatic Worker use for large files, and opt-in header drag column resizing. |
| `iwork` | After explicitly installing the iWork capability, configure its Pages / Numbers / Keynote module Worker, timeout, ZIP/Snappy/IWA safety limits, and Quick Look fallback policy. It is not in the standard/full default closure. |
| `hangul` | After explicitly installing the Hangul capability, configure its HWP/HWPX module Worker, timeout, ZIP limits, and HWP record limits. It is not in the standard/full default closure. |
| `wordPerfect` | After explicitly installing the WordPerfect capability, configure its Worker, libwpd/librevenge WASM URL, and timeout. It is not in the standard/full default closure. |
| `presentation` | The standard/full default includes only the PPTX/OpenXML `@file-viewer/pptx` Worker, with optional `workerUrl` / `workerType` overrides. Binary PowerPoint 97–2003 `.ppt` is a separate heavy capability; run `file-viewer add ppt --write` to install its Worker/WASM and assets explicitly. |
| `typst` / `data` / `cad` | After explicitly installing the matching capability, configure Typst, SQLite, or CAD/DWG/DXF/DWF WASM, worker, encoding, and rendering options. These capabilities are not in the standard/full default closure. |
| `hooks` / `beforeOperation` | Shared lifecycle hooks and operation preflight checks for audit, permission, telemetry, and safety controls. |

## Style Isolation And Theme Customization

Every standard component uses strong Shadow DOM isolation by default. Host-page global rules for `*`, `button`, `table`, `img`, `svg`, `canvas`, and similar selectors should not leak into the viewer toolbar or rendered content, and viewer resets should not pollute the host page.

| Mode | Description |
| --- | --- |
| `auto` | Default. Web Component, IIFE, Vue, React, Svelte, jQuery, and full packages all use Shadow DOM so host-page CSS cannot break the toolbar or renderer content. |
| `shadow` | Creates an explicit ShadowRoot render surface. Use it when host CSS is uncontrolled, micro-frontends are mixed, low-code platforms inject global resets, or design systems have aggressive base styles. |
| `scoped` | Does not create a ShadowRoot. Uses a stable root selector and local resets to limit its impact while keeping controlled inheritance from the host. |
| `none` | Historical light-DOM behavior for projects that depend on deep class overrides, old theme CSS, or snapshot tests. |

`styleIsolation` is a mount-time boundary. Remount the component when changing modes. Both `scoped` and `none` use Light DOM, so high-specificity or `!important` host rules can still override them.

Customization should start with `--file-viewer-*` CSS variables for color, typography, spacing, radius, toolbar, and button styling. Use stable Shadow Parts only when a specific internal surface needs styling. The current Web shell exposes `host`, `shell`, `toolbar`, `toolbar-group`, `toolbar-status`, `button`, `input`, and `content`; renderer extensions should keep using stable names such as `state-panel` and `watermark`. Do not depend on internal class names; they are implementation details.

In this example, `file-viewer-host` is the class on the actual Shadow host. Pass it as `class` in Vue 3, `containerClass` in Vue 2, `className` in React / Svelte, or add it to the element initialized by jQuery.

```css
.file-viewer-host {
  --file-viewer-bg: #f7f9fc;
  --file-viewer-text: #172033;
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-button-color: #154b83;
  --file-viewer-button-radius: 6px;
}

.file-viewer-host::part(toolbar) {
  border: 1px solid rgba(20, 60, 100, 0.14);
}

.file-viewer-host::part(button) {
  font-weight: 600;
}
```

Framework packages use Shadow DOM without extra configuration; set it explicitly when you want to lock the policy:

```ts
const options = {
  styleIsolation: 'shadow',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

## Toolbar Customization

| Config | Description |
| --- | --- |
| `toolbar: false` | Hides the built-in toolbar without disabling controller APIs such as download, print, export, and zoom. Use this for a fully custom business toolbar. |
| `toolbar: true` | Uses the default built-in toolbar. The theme toggle is visible by default; download, print, HTML export, and zoom remain capability-aware. |
| `download` / `print` / `exportHtml` / `zoom` | Expresses whether the host allows a button. Final availability is still computed from file type, render readiness, export adapter, and zoom provider state. |
| `theme` | Controls the light/dark toggle and defaults to `true`. A change emits `theme-change`; set it to `false` to hide the button. |
| `order` | Orders built-in groups with `search`, `zoom`, `download`, `print`, `exportHtml`, and `theme`. Omitted items keep their default relative order. |
| `position` | `auto`, `top`, `top-center`, or `bottom-right`. The default `auto` floats PDF actions at bottom right and keeps other formats top-right; use `top-center` for a centered top toolbar. |
| `beforeOperation` | Toolbar-level preflight that runs after `options.beforeOperation`. Returning `false` or throwing cancels the operation. |
| `beforeDownload` / `beforePrint` / `beforeExportHtml` | Operation-specific preflight for download permission, print audit, export confirmation, and similar business rules. |

For fully custom toolbars, hide the built-in toolbar and call the standard ref / controller APIs from your own UI. Do not implement zoom with an outer CSS `transform: scale()`; PDF, Excel, CAD, canvas-based, and text-layer renderers should use their internal zoom providers to keep coordinates correct.

Zoom state is reported by each renderer provider. After first-screen fit, container resize, or asynchronous PDF / Word / image layout, built-in toolbars show the real scale instead of assuming `100%`. Custom toolbars should listen to `zoom-change` / `operation-availability-change`, or read `getZoomState()` / `getOperationAvailability()`.

View-state sync is designed for projection systems, remote-control displays, side-by-side review, and reading-position restore. Every standard renderer loader gets a generic view-state provider that records at least `renderer`, zoom, and scroll position; PDF, XMind, Geo, 3D, and CAD add page, navigation, canvas pan, map center, camera, or native view snapshots. Pass `options.initialViewState` for first render, listen to `view-state-change` while running, and use `getViewState()` / `applyViewState(state, { source: "api", action: "restore" })` on Pure Web / Vue3 controllers when an imperative restore API is needed.

| Ecosystem | Recommended pattern |
| --- | --- |
| Vanilla JS / Pure Web | Use `<flyfish-file-viewer toolbar="false">` or `mountViewer(container, { options:{ toolbar:false }, onStateChange })`; custom DOM buttons can call `zoomIn()`, `printRenderedHtml()`, `searchDocument()`, and other element / controller methods directly. Use `viewer-state-change` or `controller.subscribe()` for advanced state sync. |
| Vue 3 | Pass `:options="{ toolbar: false }"`, call `downloadOriginalFile()`, `printRenderedHtml()`, `exportRenderedHtml()`, `zoomIn()`, `zoomOut()`, and `resetZoom()` through the template ref, and sync buttons with `@operation-availability-change` plus `@zoom-change`. |
| Vue 2.7 / 2.6 | Use `toolbar:false`, call instance methods through `$refs.viewer`, and listen to `@viewer-event` for `operation-availability-change` or `zoom-change`. |
| React / React Legacy | Prefer `useFileViewer({ options:{ toolbar:false } })`; pass `viewer.props` to the component, bind custom buttons to `viewer.handle`, and read `viewer.state.availability` / `viewer.state.zoom`. |
| jQuery | Use `$("#viewer").fileViewer({ options:{ toolbar:false } })`; buttons can call `$("#viewer").fileViewer("zoomIn")` or read capability state through `getFileViewerController($("#viewer")).subscribe()`. |
| Svelte | Use `<FileViewer bind:this={viewer} options={{ toolbar:false }} />`; buttons call `viewer.zoomIn()` / `viewer.printRenderedHtml()`, with `on:viewerEvent` or `onStateChange` for state sync. |

## Lifecycle And Operation Events

| Event / hook | Description |
| --- | --- |
| `load-start` / `hooks.onLoadStart` | Fires when parsing or downloading starts. Context includes filename, type, source, version, URL, File, and size. |
| `load-complete` / `hooks.onLoadComplete` | Fires when the current document has rendered. Context includes duration, source data, and version. |
| `unload-start` / `hooks.onUnloadStart` | Fires before replace, reset, or component unmount so external state or resources can be saved. |
| `unload-complete` / `hooks.onUnloadComplete` | Fires after the previous document is released. The reason is `replace`, `reset`, or `component-unmount`. |
| `operation-before` / `operation-cancel` | Fires around download, print, HTML export, and zoom actions. Returning `false` from `beforeOperation` cancels the action. |
| `operation-availability-change` | Fires when download, print, HTML export, or zoom support changes for the active format. |
| `theme-change` | Fires when the built-in control selects light or dark mode. The payload is `light` or `dark`. |
| `search-change` / `location-change` / `zoom-change` / `view-state-change` | Fires when search matches, document anchors, zoom state, or full view-state snapshots change so host UIs, display screens, and reading-position restore flows can stay in sync. |

## Public Operation API

| API | Description |
| --- | --- |
| `load` / `update` / `reload` / `destroy` | Imperatively load, update, reload, and destroy the viewer. |
| `downloadOriginalFile()` | Downloads the original file while respecting toolbar and `beforeOperation` checks. |
| `printRenderedHtml(options?)` | Prints the complete rendered document using the best available per-format print adapter. Enabled watermarks are included; pass `mask` for cover regions. |
| `printWithMask(options?)` | Opens the black-cover mask designer, then prints. The designer is async-loaded inside core and works out of the box with component packages. |
| `exportRenderedHtml()` | Exports rendered HTML for archiving, audit, or offline review. |
| `zoomIn()` / `zoomOut()` / `resetZoom()` | Uses the active renderer zoom provider instead of outer CSS transforms that can break coordinates. |
| `searchDocument()` / `nextSearchResult()` / `previousSearchResult()` | Runs document-level search and navigates highlighted matches. |
| `collectDocumentAnchors()` / `scrollToAnchor()` / `scrollToLine()` | Collects pages, outline items, headings, or code-line anchors and scrolls to them. |
| `getDocumentTextChunks()` | Returns structured text chunks for search, AI provenance, vectorization, and external indexes. |
| `getOperationAvailability()` / `getZoomState()` / `getSearchState()` | Reads current capability, zoom, and search state for custom toolbars. |

## Workers, WASM, And Private Deployment

| Asset | Description |
| --- | --- |
| Compatible Full assets | Historical `*-full` packages use the compatible copy-assets implementation to copy the complete resource set published in v2.4 by default. DICOM and future heavy formats use independent owners. Transaction receipts continue to record package versions, per-file SHA-256 values, and ownership. |
| Specialist asset owners | CAD, Typst, iWork, 3D, Data, Drawing, Hangul, WordPerfect, and legacy PPT each use an independent `@file-viewer/assets-*` package. `@file-viewer/cli add <format> --write` selects only that capability and its assets. Historical `*-full` packages keep their compatible copy-assets command, which copies the existing complete asset set by default. |
| PDF / DOCX / Excel / PPTX | Standard self-hosts the PDF.js worker/fonts, DOCX worker, spreadsheet worker, and PPTX worker. PPTX charts and PDF Identity-font repair are explicit standard correctness capabilities, so charts and font repair are never silently omitted. |
| Archive / email / native media | The archive libarchive Worker/WASM is in standard assets. Email, common images, and browser-native media use lazy-loaded code. HLS, MIDI, RTF, Mermaid, patch, and git bundle remain explicit capabilities and are not auto-installed as npm peers. |
| Draw.io | The safe project-maintained Drawing fallback ships with its renderer. The official diagrams.net viewer is a separate heavy `drawio-official` capability and is not in the standard profile for new projects. The published capability boundary of historical `*-full` packages remains compatible. |
| Offline deployment | Runtime code does not use public CDNs. Vite `copyAssets:true` publishes installed asset owners; other tools use `file-viewer install --yes` or `file-viewer assets --write`. Owners merge transactionally into one deterministic runtime manifest independent of install order. |
| Deployment principle | New formats are opt-in by default and never expand an already published `*-full` package automatically. Specialist workers, WASM, and parsers load only when their format is used. New projects should prefer standard or selected capabilities; historical full integrations retain their existing matrix. |

### Full Package Default Asset Base

`@file-viewer/vue3-full` preserves the published v2.4 Full capability contract and points its historical complete asset set to `file-viewer/` under the deployment base by default (`/file-viewer/` at the origin root). That includes existing legacy PPT, CAD, Typst, Drawing, SQLite/iWork, and similar capabilities. This package continues to depend on and proxy the same-version `file-viewer-copy-assets`. Run it and serve its output instead of configuring individual asset URLs. DICOM and future heavy formats do not enter this closure automatically and require explicit selection in the new CLI.

```ts
import { setDefaultFullAssetBaseUrl } from '@file-viewer/vue3-full'

setDefaultFullAssetBaseUrl('/static/file-viewer/')
```

Explicit `options.archive.*` and `options.pdf.*` asset overrides still take precedence. Use `file-viewer-copy-assets --renderers <csv>` to narrow the legacy Full copy set, and run `file-viewer list` to inspect new opt-in capabilities, licenses, and asset packages.

## Quality Gates

- Component packages only depend on `@file-viewer/core` and their own ecosystem dependencies. They do not nest through another framework component package.
- Format parsing, search, zoom, print, export, watermark, lifecycle, and beforeOperation semantics all come from the same core.
- Releases should pass type checks, component API verification, README generation checks, format-matrix verification, standalone repository export, and browser smoke tests.

See the official documentation for options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.file-viewer.app/

Online demo: https://demo.file-viewer.app/. File Viewer-authored source and component packages generated by this repository use Apache-2.0. Any distribution that includes the `@file-viewer/ppt` runtime retains its independent LICENSE and NOTICE and does not relicense it under Apache-2.0. For derivative or commercial use, keep clear Flyfish Viewer attribution; shared compatibility fixes are welcome in the matching component repository.
<!-- FILE_VIEWER_GENERATED:END -->
