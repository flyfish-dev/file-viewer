# @file-viewer/preset-lite

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-lite"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-lite?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-lite"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-lite?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/">Docs</a> · <a href="https://demo.file-viewer.app/">Live demo</a> · <a href="https://doc.file-viewer.app/guide/formats">Format matrix</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">Issues</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/lite/README.md">简体中文</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-en.webp" width="760" alt="File Viewer live demo: Word, Excel, PowerPoint, 3D model, CAD drawing and binary inspector"></a>
</p>

> ⭐ If File Viewer helps you, please [star the repo on GitHub](https://github.com/flyfish-dev/file-viewer).

The lite renderer preset for Flyfish File Viewer. It is designed for Markdown, code, text, image, audio, and video preview without installing heavy Office, PDF, CAD, Typst, 3D, or archive pipelines by default.

## When To Use

- You need a ready-to-use but very small attachment preview setup.
- Your product mainly handles README files, logs, configuration files, screenshots, images, audio, and video.
- You plan to add `@file-viewer/renderer-pdf`, `@file-viewer/renderer-word`, or other professional renderers only when a product line needs them.

## Usage

The recommended path is to use it with `@file-viewer/vite-plugin`. Once this preset is installed, the plugin discovers and activates lightweight attachment capability automatically:

```ts
fileViewerRenderers({
  copyAssets: true
})
```

Components keep `autoRenderers:true` by default, so application code does not pass `renderers` manually. Pass the preset directly only when you need full manual registry control:

```ts
import FileViewer from '@file-viewer/vue3'
import { liteRenderers } from '@file-viewer/preset-lite'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: liteRenderers,
}
```

## Included Renderers

- `@file-viewer/renderer-text`
- `@file-viewer/renderer-image`
- `@file-viewer/renderer-media`

## Documentation

- On-demand renderer architecture: <https://doc.file-viewer.app/guide/on-demand-renderers>
- Supported formats: <https://doc.file-viewer.app/guide/formats>

## Formats and related packages

File Viewer previews 275+ file extensions in the browser, covering Office, PDF/OFD, CAD, 3D, archives, email, images, media and code, without server-side conversion. See the [format matrix](https://doc.file-viewer.app/guide/formats) for the full list.

- Components: `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/vue2.7`, `@file-viewer/vue2.6`, `@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/svelte`, `@file-viewer/jquery`, plus their `-full` packages
- Presets: `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, `@file-viewer/preset-all`
- Build: `@file-viewer/vite-plugin`, `file-viewer-copy-assets`

## License

This package is Apache-2.0. See [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE).
