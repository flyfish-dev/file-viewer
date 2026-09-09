# @file-viewer/vite-plugin

Vite plugin for Flyfish File Viewer on-demand renderer assembly. It can auto-discover installed `@file-viewer/preset-*` and `@file-viewer/*-full` packages, so Vue, React, Svelte, jQuery, and Vanilla JS components receive matching preview capability without application code passing `renderers` manually. It can also generate `virtual:file-viewer-renderers` from declared formats, import only matching renderer packages, and provide renderer-oriented chunk planning plus offline worker/WASM/font asset copying.

## Fastest Start

For complete format support, the fastest path is one full package and one Vite plugin registration. Full packages already include `preset-all`; do not install another preset. `copyAssets:true` matches the installed full package and publishes its Worker, WASM, font, and vendor files under `file-viewer/` at the deployment base (`/file-viewer/` for a root deployment) in both dev and build:

```bash
pnpm add @file-viewer/vue3-full
pnpm add -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})
```

Installing a full package without publishing these assets leaves PDF Worker, CAD/Typst/Archive WASM, and other formats without runtime files. That is partial support, not a complete setup.

For a smaller install, use a standard component with one preset and keep the same Vite config. The plugin auto-discovers installed presets, so application code does not hand-write renderer imports and the plugin does not need `preset:'office'`:

```bash
pnpm add @file-viewer/vue3 @file-viewer/preset-office
pnpm add -D @file-viewer/vite-plugin
```

Components keep `autoRenderers:true` by default, so `@file-viewer/vue3`, `@file-viewer/react`, `@file-viewer/web`, `@file-viewer/svelte`, `@file-viewer/jquery`, `@file-viewer/vue2.7`, and `@file-viewer/vue2.6` automatically consume the injected preset / renderer registry.

Available presets:

- `@file-viewer/preset-lite`: text, Markdown, code, image, audio, and video.
- `@file-viewer/preset-office`: PDF, Word, Excel, PowerPoint, OFD, RTF, and OpenDocument.
- `@file-viewer/preset-engineering`: CAD, 3D, drawing, XMind, Geo, Typst, Archive, Data, and EDA.
- `@file-viewer/preset-all`: the complete official demo format matrix.

Install individual renderer packages only for strict cuts, such as `@file-viewer/renderer-pdf`, `@file-viewer/renderer-word`, `@file-viewer/renderer-ofd`, `@file-viewer/renderer-presentation`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-drawing`, `@file-viewer/renderer-3d`, `@file-viewer/renderer-data`, `@file-viewer/renderer-eda`, `@file-viewer/renderer-typst`, `@file-viewer/renderer-archive`, or `@file-viewer/renderer-text`, then use `formats` to generate exact imports.

## vite.config.ts

Prefer full/preset auto assembly for normal products. With only `copyAssets:true`, the plugin auto-discovers installed `@file-viewer/*-full` or `@file-viewer/preset-*` packages:

```ts
fileViewerRenderers({
  copyAssets: true
})
```

Use customization options only when you need source scanning, single-format cuts, or manual registry control:

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      formats: ['pdf', 'dwg', 'typst', 'zip', 'xmind'],
      scan: true,
      copyAssets: true,
      chunkStrategy: 'renderer'
    })
  ]
})
```

`inject` is enabled by default. The plugin injects `virtual:file-viewer-renderers` into Vite HTML entrypoints, preset imports register themselves in core, and framework components consume them through `autoRenderers`.

```ts
const options = {
  // Defaults to true; set false when a product needs total manual control.
  autoRenderers: true
}
```

### Customization Options

| Option | Description |
| --- | --- |
| `copyAssets` | `true` or `{ publicDir, outDir, mode, baseDir }`; copies matching Worker, WASM, font, and vendor assets. Installed full packages default to `<deployment-base>/file-viewer/`, which is required for complete full support; standard packages/presets keep the existing root behavior |
| `preset` | `'auto' | 'lite' | 'office' | 'engineering' | 'all'`; with no explicit formats, installed presets are discovered automatically |
| `autoPresets` | `true` or a preset list; useful with `scan:true` when installed presets should stay active |
| `formats` | File extensions or format tokens, for example `['pdf', 'docx', 'dwg']` |
| `renderers` | Renderer ids, for example `['pdf', 'word', 'cad']` |
| `scan` | `true` or `{ roots, extensions, maxFileSize }`; scans source hints and merges formats |
| `inject` | Defaults to `true`; set `false` to import `virtual:file-viewer-renderers` manually |
| `chunkStrategy` | `'renderer' | 'none'`; controls renderer-level chunk grouping |
| `stabilizeInteropChunks` | Defaults to `true`; when the host project already defines a `manualChunks` function, keeps CodeMirror / Lezer / Sandpack in one chunk to avoid production TDZ initialization errors |
| `missingRenderer` | `'error' | 'warn' | 'ignore'`; controls notices for planned renderer mappings |

When host apps split `node_modules` by package name, circular dependencies between `@codemirror/*`, `@lezer/*`, and Sandpack can show up in production as `codemirror-view.* Cannot access ... before initialization`. The plugin wraps existing `manualChunks` functions by default, stabilizes only those known interop chunks, and preserves the rest of the app's custom grouping. Set `stabilizeInteropChunks:false` only when the host build needs total control.

`copyAssets.baseDir` overrides automatic placement. It must be relative and cannot contain `..`; an empty string explicitly selects the root. The plugin now aligns the shared runtime asset base for standard packages, presets, and full packages; full packages also keep `setDefaultFullAssetBaseUrl()` synchronized. Only integrations that set `inject:false` and do not import the virtual module must call `setDefaultFileViewerAssetBaseUrl()` themselves (plus `setDefaultFullAssetBaseUrl()` for a full package). With Vite `base:'/app/'`, full-package dev URLs start with `/app/file-viewer/...`, while production files remain under `outDir/file-viewer/`.

For strict registry control, disable injection and pass the virtual module explicitly:

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

You can also use `preset: 'auto'` to discover installed preset packages. When `preset-all` is installed, it wins to avoid importing narrower presets twice. Note: when `scan:true` is enabled, use `preset:'auto'` or `autoPresets:true` explicitly; otherwise the plugin treats source hints as the explicit renderer selection and skips zero-config preset discovery.

```ts
fileViewerRenderers({
  preset: 'auto',
  scan: true,
  formats: ['pdf'],
  copyAssets: true,
  chunkStrategy: 'renderer'
})
```

`scan: true` inspects common source folders for lightweight hints and merges them with `formats`:

```ts
export const fileViewerFormats = ['pdf', 'docx', 'xlsx']
```

```html
<input accept=".pdf,.docx" data-file-viewer-formats="dwg,xmind" />
```

This is useful when upload accept lists, sample matrices, or attachment allow-lists already live in source code: dev and production builds can generate the renderer assembly module without a second hand-written import list.

## Missing Renderer Guidance

When a file extension is in the supported matrix but the current project has not assembled its renderer, core now shows an install-oriented “renderer assembly required” state with the recommended preset / renderer package. For example, `.pdf` points to `@file-viewer/preset-office` or `@file-viewer/renderer-pdf`. Only truly unknown extensions show an unsupported-format state.

## Nested Vite Projects

From 3.0.3, a nested metadata-only project can use a resolvable Full dependency
declared in an ancestor `package.json`. A nearer light component or preset keeps
its own root asset layout. Explicit `copyAssets.baseDir` still takes precedence;
`publicDir` and `build.outDir` stay relative to the Vite root, not the dependency owner.

## Current Boundary

The plugin currently generates imports for extracted renderer packages: Word, Spreadsheet, PDF, OFD, Presentation, CAD, Draw.io/Excalidraw/Mermaid/PlantUML, 3D, Data, EDA, Typst, archives, email, EPUB, code/Markdown/Patch/Git Bundle, image, media, XMind, and Geo. Declare them explicitly with `formats`, or let `scan: true` discover source hints automatically; core-supported extensions such as `.zipx`, `.cbz`, `.tiff`, `.mjs`, `.gv`, `.patch`, `.bundle`, `.mermaid`, `.puml`, and `.mpeg` also resolve to their renderer packages. With `copyAssets:true`, the plugin detects installed capability packages. Full packages copy matching assets into dev `publicDir/file-viewer/` and production `outDir/file-viewer/`; standard packages/presets keep the existing root placement, including the Typst compiler / renderer WASM files and default fonts. `preset: 'auto' | 'lite' | 'office' | 'engineering' | 'all'` imports matching `@file-viewer/preset-*` packages; when `formats` are also present, the plugin adds extra renderers outside the preset.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>
