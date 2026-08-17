# @file-viewer/react

The standard React native component package for Flyfish File Viewer. The component renders a React container and mounts the complete viewer through this package's local controller on top of `@file-viewer/core` and the core browser engine. It keeps ref APIs, controlled props, lifecycle events, and the full options surface.

```bash
npm install @file-viewer/react
```

```tsx
import FileViewer from '@file-viewer/react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer
        url="/example/demo.docx"
        options={{
          theme: 'light',
          toolbar: { position: 'bottom-right' }
        }}
      />
    </div>
  )
}
```

The historical package `@flyfish-group/file-viewer-react` remains supported for compatibility. New integrations should prefer the self-contained standard package `@file-viewer/react`.

## Capabilities

`@file-viewer/react` shares the same core contract and renderer/preset assembly model with the other standard component packages; full capability can be assembled with on-demand renderers or `@file-viewer/preset-all`, including PDF, Word, Excel, PowerPoint, OFD, CAD/DWG/DXF/DWF, EPUB/UMD, archives, email, Markdown, highlighted code, images, audio, video, 3D models, geospatial files, and structured data assets. See the complete format matrix and option reference at https://doc.file-viewer.app/guide/formats

<!-- FILE_VIEWER_GENERATED:START -->
## Ecosystem Matrix

Every standard component package shares `@file-viewer/core` as the only common foundation, and no framework component package depends on another framework implementation. Core owns format metadata, source loading, the renderer protocol, events, operation APIs, search, zoom, print, export, and the framework-neutral browser shell. Heavy PDF, Word, PPT/PPTX, CAD, Typst, and similar pipelines are assembled explicitly through renderer packages or presets; each framework package owns its component lifecycle, type exports, compatibility defaults, and ecosystem-specific interaction layer.

| Framework | Standard npm package | Entrypoints | GitHub | Gitee | Historical aliases |
| --- | --- | --- | --- | --- | --- |
| Vanilla JS / Pure Web | `@file-viewer/web` | ESM, type declarations, script tag IIFE, worker/WASM viewer assets, asset copy CLI | [file-viewer-web](https://github.com/flyfish-dev/file-viewer-web) | [file-viewer-web](https://gitee.com/flyfish-dev/file-viewer-web) | `@flyfish-group/file-viewer-web` |
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

The shared catalog registers 221 file extensions (221 stable and 0 experimental) across 32 preview pipelines. Experimental formats do not count toward stable support; full capability is assembled through renderer packages or presets.

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

## Engineering-Grade On-Demand Renderer Assembly

The quickstart flow is: get the component running first, then make the format boundary explicit. Install the component package for the current ecosystem, then choose `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, or `@file-viewer/preset-all`. For Webpack, Rspack, Rollup, Umi, classic multi-page apps, and other non-Vite stacks, pass capability explicitly through `options.preset` or `options.renderers`. The Vite plugin is an optional convenience layer that removes manual imports and copies offline assets.

```bash
npm i @file-viewer/react @file-viewer/preset-office
```

```ts
import officePreset from '@file-viewer/preset-office'

const options = {
  preset: officePreset,
  rendererMode: 'replace'
}
```

When a product combines Office documents with engineering drawings, keep the same `preset` field and pass an array:

```ts
import officePreset from '@file-viewer/preset-office'
import engineeringPreset from '@file-viewer/preset-engineering'

const options = {
  preset: [officePreset, engineeringPreset],
  rendererMode: 'replace'
}
```

For exact small cuts, install one renderer and pass it through `options.renderers`:

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  renderers: [pdfRenderer],
  rendererMode: 'replace'
}
```

Vite projects can add the plugin. It auto-discovers installed presets, injects the virtual module, and copies matching Worker / WASM / font / vendor assets:

```bash
npm i -D @file-viewer/vite-plugin
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // No preset option required: the plugin discovers installed @file-viewer/preset-office.
    })
  ]
}
```

Heavy users that want the complete official demo capability can switch to the full preset. Non-Vite projects keep `options.preset`; the Vite config stays the same:

```bash
npm i @file-viewer/react @file-viewer/preset-all
```

Use explicit plugin options only when you need customization:

```ts
fileViewerRenderers({
  preset: 'auto',        // keep installed preset auto-discovery while scanning source hints
  scan: true,            // detects fileViewerFormats, data-file-viewer-formats, and accept
  formats: ['pdf'],      // adds exact renderers outside the installed preset
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

For strict custom cuts or component-library tests, disable injection and pass the virtual module explicitly:

```ts
// vite.config.ts
fileViewerRenderers({ formats: ['pdf'], inject: false, copyAssets: true })
```

```ts
// Application viewer entry
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'

const options = {
  renderers: configuredFileViewerRenderers,
  rendererMode: 'replace'
}
```

- Vue, React, Svelte, jQuery, and Vanilla JavaScript / Pure Web all receive the same `options`; each package maps them to native props, hooks, actions, plugins, or `mountViewer(...)` parameters.
- `preset-lite` covers text, Markdown, code, images, audio, and video; `preset-office` covers PDF / Word / Excel / PowerPoint / OFD; `preset-engineering` covers CAD / 3D / drawing / XMind / Geo / Typst / EDA / Data.
- For the smallest custom bundle, skip presets, install individual renderers such as `@file-viewer/renderer-pdf` or `@file-viewer/renderer-word`, and pass them through `options.renderers`.
- `fileViewerRenderers()` or `fileViewerRenderers({ copyAssets:true })` auto-discovers installed presets without explicit configuration. When `scan:true` is also enabled, use `preset:'auto'` or `autoPresets:true` to keep preset auto-discovery.
- `scan:true` detects `fileViewerFormats`, `data-file-viewer-formats`, and upload `accept` hints so development and production builds select matching renderers automatically.
- `copyAssets:true` copies PDF/CAD/Typst/Archive/Data workers, WASM, and vendor assets for offline and enterprise intranet deployment; archive directories use `vendor/libarchive/worker-bundle.js` / `libarchive.wasm` first, while the compatibility path only covers ZIP/TAR/GZIP when the Worker cannot start.
- `builtinRenderers` remains available for advanced baseline control or historical compatibility. Normal quick starts only need `preset` / `renderers` plus `rendererMode`.
- If a file is in the supported matrix but its renderer is not assembled, the viewer shows the recommended preset / renderer package. Truly unknown extensions still show an unsupported-format state.
- `@file-viewer/preset-all` provides the complete renderer matrix; Worker, WASM, font, and vendor assets still need to be deployed by the Vite plugin or `file-viewer-copy-assets`. `*-full` packages already include this preset and must not install it again.

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
| `iwork` | Pages / Numbers / Keynote module Worker, timeout, ZIP/Snappy/IWA safety limits, and explicit Quick Look fallback policy. The three Apple formats are stable for static high-fidelity preview after structural, browser, and visual-golden gates across iWork ’09, 2013+, and current fixtures. |
| `hangul` | HWP/HWPX module Worker, timeout, ZIP inflation/compression/entry limits, and HWP record limits. Stable support is a real-fixture-verified static structured preview. |
| `wordPerfect` | WordPerfect Worker, bundled libwpd/librevenge WASM URL, and timeout. It falls back to bounded text only when WASM fails; the normal structured path is verified with redistributable real fixtures. |
| `presentation` | The presentation renderer keeps two isolated engines: binary PowerPoint 97–2003 `.ppt` uses the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM runtime with zero-config standard asset routes; `pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` are custom-path overrides, while `pptWorker` and `pptCache` control its Worker and bounded frame cache. PPTX/OpenXML uses the `@file-viewer/pptx` Worker with optional `workerUrl` / `workerType` overrides. |
| `typst` / `data` / `cad` | Typst, SQLite, CAD/DWG/DXF/DWF WASM, worker, encoding, and rendering strategy options. |
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
| Shared viewer assets | Every `*-full` package exposes a `file-viewer-copy-assets` CLI at the package version. It copies workers, WASM, fonts, and vendor files into the application static directory and writes an integrity manifest. The complete `web-full` `dist/` also carries that payload directly. |
| CAD / DWG / DXF / DWF | Configure `options.cad.wasmPath`, `workerUrl`, `dwfWasmUrl`, and `dxfEncoding` for self-hosted or intranet deployment. |
| PDF / DOCX / Excel / PPT / PPTX | Configure `options.pdf.workerUrl`, `options.pdf.cMapUrl`, `options.pdf.wasmUrl`, `options.pdf.standardFontDataUrl`, `options.pdf.cjkFontFallbackPath`, `options.pdf.identityFontRepair`, `options.docx.workerUrl`, `options.docx.workerJsZipUrl`, `options.spreadsheet.workerUrl`, and `options.presentation.workerUrl` / `workerType`; PDF probes the real static worker first and lazy-loads the packaged handler when unavailable, unembedded CJK fonts fall back to self-hosted Noto Sans SC shards loaded per page, and malformed Identity CJK fonts without ToUnicode are repaired in memory after corrupted text is detected; DOCX chooses worker or main-thread parsing automatically, Electron `file://` and other unsafe local protocols fall back without user configuration; Excel defaults to `worker: auto`, enabling Worker automatically for files at or above `workerAutoThreshold`; CSV / TSV detects UTF-8, GBK, and GB18030 automatically and accepts `options.spreadsheet.textEncoding` as an explicit override; header drag column resizing is controlled by `options.spreadsheet.resizableColumns`; `.ppt` lazy-loads the packaged `@file-viewer/ppt@0.3.3` Worker/OffscreenCanvas/WASM runtime with bounded frame caching from `vendor/ppt/` without standard-layout configuration; `pptModuleUrl` / `pptWorkerUrl` / `pptWasmUrl` / `pptFontUrl` only override custom routes. PPTX creates its separate module Worker on demand. |
| Typst / SQLite / Archive | Configure Typst compiler/renderer WASM, `data.sqlWasmUrl`, and `archive.workerUrl` / `archive.wasmUrl` as needed; Typst renders through local WASM only and never falls back to a public CDN; Archive decodes legacy GBK/GB18030 ZIP entry names, while RAR, 7z, and encrypted archives still require the libarchive Worker/WASM assets. |
| Drawing | Draw.io uses the official diagrams.net offline viewer shipped with viewer assets by default; override `options.drawing.viewerScriptUrl` for custom paths, or set `preferOfficial:false` for the built-in SVG fallback. |
| Offline deployment | Runtime preview code does not depend on public CDN or third-party online assets. Every `*-full` package uses `file-viewer/` under the deployment base (`/file-viewer/` at the origin root). Vite publishes assets with `copyAssets:true`; other build tools run `npx --no-install file-viewer-copy-assets ./public/file-viewer`. Call `setDefaultFullAssetBaseUrl()` when assets live elsewhere. |
| Deployment principle | Heavy workers, WASM files, and parser libraries stay lazy-loaded and are only requested when the active file type needs them. |


## Quality Gates

- Component packages only depend on `@file-viewer/core` and their own ecosystem dependencies. They do not nest through another framework component package.
- Format parsing, search, zoom, print, export, watermark, lifecycle, and beforeOperation semantics all come from the same core.
- Releases should pass type checks, component API verification, README generation checks, format-matrix verification, standalone repository export, and browser smoke tests.

See the official documentation for options, lifecycle hooks, beforeOperation, theme, watermark, search, zoom, print, and export APIs: https://doc.file-viewer.app/

Online demo: https://demo.file-viewer.app/. File Viewer-authored source and component packages generated by this repository use Apache-2.0. Any distribution that includes the `@file-viewer/ppt` runtime retains its independent LICENSE and NOTICE and does not relicense it under Apache-2.0. For derivative or commercial use, keep clear Flyfish Viewer attribution; shared compatibility fixes are welcome in the matching component repository.
<!-- FILE_VIEWER_GENERATED:END -->
