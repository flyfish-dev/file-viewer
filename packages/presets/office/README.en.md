# @file-viewer/preset-office

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/office/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/office/README.zh-CN.md)

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-office"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-office?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-office"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-office?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/">Docs</a> · <a href="https://demo.file-viewer.app/">Live demo</a> · <a href="https://doc.file-viewer.app/guide/formats">Format matrix</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">Issues</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/office/README.zh-CN.md">简体中文</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-en.webp" width="760" alt="File Viewer live demo: Word, Excel, PowerPoint, 3D model, CAD drawing and binary inspector"></a>
</p>

> ⭐ If File Viewer helps you, please [star the repo on GitHub](https://github.com/flyfish-dev/file-viewer).

The Office and document renderer preset for Flyfish File Viewer. It groups PDF, Word, Excel, PowerPoint, OFD, RTF, and OpenDocument preview lines into one explicit capability package.

## When To Use

- Your product mainly handles contracts, reports, spreadsheets, slide decks, OFD documents, or enterprise office attachments.
- You want one document preset instead of several renderer imports.
- You do not need the complete official demo matrix such as CAD, 3D, EDA, archives, and email.

## Usage

The recommended path is to use it with `@file-viewer/vite-plugin`. Once this preset is installed, the plugin discovers and activates the Office document capability automatically:

```ts
fileViewerRenderers({
  copyAssets: true
})
```

Components keep `autoRenderers:true` by default, so application code does not pass `renderers` manually. Pass the preset directly only when you need full manual registry control:

```ts
import FileViewer from '@file-viewer/vue3'
import { officeRenderers } from '@file-viewer/preset-office'

const options = {
  builtinRenderers: 'none',
  rendererMode: 'replace',
  renderers: officeRenderers,
}
```

## Included Renderers

- `@file-viewer/renderer-pdf`
- `@file-viewer/renderer-word`
- `@file-viewer/renderer-spreadsheet`
- `@file-viewer/renderer-presentation`
- `@file-viewer/renderer-ofd`

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
