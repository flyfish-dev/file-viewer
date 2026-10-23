# @file-viewer/preset-engineering

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/engineering/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/engineering/README.zh-CN.md)

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-engineering"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-engineering?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-engineering"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-engineering?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/">Docs</a> · <a href="https://demo.file-viewer.app/">Live demo</a> · <a href="https://doc.file-viewer.app/guide/formats">Format matrix</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">Issues</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/engineering/README.zh-CN.md">简体中文</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-en.webp" width="760" alt="File Viewer live demo: Word, Excel, PowerPoint, 3D model, CAD drawing and binary inspector"></a>
</p>

> ⭐ If File Viewer helps you, please [star the repo on GitHub](https://github.com/flyfish-dev/file-viewer).

The engineering renderer preset for Flyfish File Viewer. It targets professional attachment workflows such as CAD, 3D models, Draw.io / Excalidraw / Mermaid / PlantUML, XMind, geospatial files, Typst, EDA, archives, and structured data assets.

## When To Use

- Your product focuses on R&D, manufacturing, design review, engineering delivery, EDA triage, or technical documentation.
- You need CAD / 3D / drawing / geospatial / EDA preview lines without installing the complete official demo renderer matrix.
- You want WASM, Worker, and vendor assets to keep using the shared manifest and `@file-viewer/vite-plugin` self-hosting flow.

## Usage

The recommended path is to use it with `@file-viewer/vite-plugin`. Once this preset is installed, the plugin discovers and activates engineering-file capability automatically:

```ts
fileViewerRenderers({
  copyAssets: true
})
```

Components keep `autoRenderers:true` by default, so application code does not pass `renderers` manually. Pass the preset directly only when you need full manual registry control:

```ts
import FileViewer from '@file-viewer/vue3'
import { engineeringRenderers } from '@file-viewer/preset-engineering'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: engineeringRenderers,
}
```

## Included Renderers

- `@file-viewer/renderer-cad`
- `@file-viewer/renderer-3d`
- `@file-viewer/renderer-drawing`
- `@file-viewer/renderer-mindmap`
- `@file-viewer/renderer-geo`
- `@file-viewer/renderer-typst`
- `@file-viewer/renderer-archive`
- `@file-viewer/renderer-data`
- `@file-viewer/renderer-eda`

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
