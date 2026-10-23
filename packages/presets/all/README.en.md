# @file-viewer/preset-all

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/all/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/all/README.zh-CN.md)

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-all"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-all?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-all"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-all?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/">Docs</a> · <a href="https://demo.file-viewer.app/">Live demo</a> · <a href="https://doc.file-viewer.app/guide/formats">Format matrix</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">Issues</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/all/README.zh-CN.md">简体中文</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-en.webp" width="760" alt="File Viewer live demo: Word, Excel, PowerPoint, 3D model, CAD drawing and binary inspector"></a>
</p>

> ⭐ If File Viewer helps you, please [star the repo on GitHub](https://github.com/flyfish-dev/file-viewer).

The full renderer preset for Flyfish File Viewer. It packages the current complete format matrix as an explicit preset and acts as the compatibility bridge for the 2.x on-demand renderer architecture.

## When To Use

- You want the same full-format coverage as the official demo.
- You are migrating from the historical all-in-one dependency model to on-demand renderer assembly.
- You want to start with one complete preset, then later replace it with `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, or narrower single-renderer combinations.

## Usage

In Vite projects, the recommended path is to let `@file-viewer/vite-plugin` discover this preset automatically:

```bash
pnpm add @file-viewer/vue3 @file-viewer/core @file-viewer/vite-plugin @file-viewer/preset-all
```

```ts
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default {
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
}
```

Components keep `autoRenderers:true` by default, so application code does not pass `allRenderers` manually.

Pass it directly only when you need full manual registry control:

```ts
import FileViewer from '@file-viewer/vue3'
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  renderers: allRenderers,
}
```

Use replace mode when the viewer should only install renderers from this preset:

```ts
const options = {
  rendererMode: 'replace',
  renderers: allRenderers,
}
```

This version first aggregates the extracted `@file-viewer/renderer-word`, `@file-viewer/renderer-spreadsheet`, `@file-viewer/renderer-pdf`, `@file-viewer/renderer-ofd`, `@file-viewer/renderer-presentation`, `@file-viewer/renderer-cad`, `@file-viewer/renderer-drawing`, `@file-viewer/renderer-3d`, `@file-viewer/renderer-data`, `@file-viewer/renderer-eda`, `@file-viewer/renderer-typst`, `@file-viewer/renderer-archive`, `@file-viewer/renderer-email`, `@file-viewer/renderer-epub`, `@file-viewer/renderer-text`, `@file-viewer/renderer-image`, `@file-viewer/renderer-media`, `@file-viewer/renderer-mindmap`, and `@file-viewer/renderer-geo` packages. Core now keeps only lightweight native paths and shared contracts, while this preset remains the full aggregation layer.

Use `@file-viewer/preset-lite` for lightweight attachments, `@file-viewer/preset-office` for office documents, and `@file-viewer/preset-engineering` for CAD / 3D / EDA-style engineering attachments. `preset-all` is best for the official demo, internal all-format attachment centers, or migration compatibility.

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>

## Formats and related packages

File Viewer previews 275+ file extensions in the browser, covering Office, PDF/OFD, CAD, 3D, archives, email, images, media and code, without server-side conversion. See the [format matrix](https://doc.file-viewer.app/guide/formats) for the full list.

- Components: `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/vue2.7`, `@file-viewer/vue2.6`, `@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/svelte`, `@file-viewer/jquery`, plus their `-full` packages
- Presets: `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, `@file-viewer/preset-all`
- Build: `@file-viewer/vite-plugin`, `file-viewer-copy-assets`

## License

This package is Apache-2.0. `*-full` packages include the DWG/DWF/DWFX runtime (`@flyfish-dev/cad-viewer`), which is **AGPL-3.0-only**; using CAD support requires complying with that license. See [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE).
