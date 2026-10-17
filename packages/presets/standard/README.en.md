# @file-viewer/preset-standard

<!-- FILE_VIEWER_PACKAGE_HEADER -->
<p>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-standard"><img src="https://img.shields.io/npm/v/@file-viewer%2Fpreset-standard?logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@file-viewer/preset-standard"><img src="https://img.shields.io/npm/dm/@file-viewer%2Fpreset-standard?logo=npm" alt="npm downloads"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/stargazers"><img src="https://img.shields.io/github/stars/flyfish-dev/file-viewer?style=flat&logo=github" alt="GitHub stars"></a>
  <a href="https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
</p>

<p>
  <a href="https://github.com/flyfish-dev/file-viewer">GitHub</a> · <a href="https://doc.file-viewer.app/">Docs</a> · <a href="https://demo.file-viewer.app/">Live demo</a> · <a href="https://doc.file-viewer.app/guide/formats">Format matrix</a> · <a href="https://github.com/flyfish-dev/file-viewer/issues">Issues</a> · <a href="https://github.com/flyfish-dev/file-viewer/blob/main/packages/presets/standard/README.md">简体中文</a>
</p>

<p>
  <a href="https://demo.file-viewer.app/"><img src="https://raw.githubusercontent.com/flyfish-dev/file-viewer/main/docs/public/_media/file-viewer-demo-v3-en.webp" width="760" alt="File Viewer live demo: Word, Excel, PowerPoint, 3D model, CAD drawing and binary inspector"></a>
</p>

> ⭐ If File Viewer helps you, please [star the repo on GitHub](https://github.com/flyfish-dev/file-viewer).

The stable common-format baseline for File Viewer v3: Word/DOCX, PDF, OFD, modern PPTX, Excel, archives, email, text/code, images, audio, and video.

It intentionally excludes iWork, DICOM, CAD, 3D, EDA, Geo, Typst, Draw.io, WordPerfect, Hangul, and legacy binary PPT. Install those capabilities explicitly when needed.

The existing 2.x `preset-all` and `*-full` packages remain unchanged; `standard` is an additive migration path for v3.

## Formats and related packages

File Viewer previews 275+ file extensions in the browser, covering Office, PDF/OFD, CAD, 3D, archives, email, images, media and code, without server-side conversion. See the [format matrix](https://doc.file-viewer.app/guide/formats) for the full list.

- Components: `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/vue2.7`, `@file-viewer/vue2.6`, `@file-viewer/react`, `@file-viewer/react-legacy`, `@file-viewer/svelte`, `@file-viewer/jquery`, plus their `-full` packages
- Presets: `@file-viewer/preset-lite`, `@file-viewer/preset-office`, `@file-viewer/preset-engineering`, `@file-viewer/preset-all`
- Build: `@file-viewer/vite-plugin`, `file-viewer-copy-assets`

## License

This package is Apache-2.0. See [LICENSE](https://github.com/flyfish-dev/file-viewer/blob/main/LICENSE).
