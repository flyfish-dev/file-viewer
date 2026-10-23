# @file-viewer/renderer-archive

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/archive/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/archive/README.zh-CN.md)

Standalone archive renderer package for Flyfish File Viewer. It reads ZIP, TAR, GZIP, RAR, 7z, and other archive directories with `libarchive.js` Worker + WASM, then extracts internal files only when the user opens them.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { archiveRenderer } from '@file-viewer/renderer-archive'

const options = {
  rendererMode: 'replace',
  renderers: archiveRenderer,
}
```

You can also compose it with other renderer packages:

```ts
import { archiveRenderer } from '@file-viewer/renderer-archive'
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, cadRenderer, archiveRenderer],
}
```

## Capabilities

- Previews ZIP, TAR, GZIP, RAR, 7z, and common archive directories.
- `.cbz` and `.cbr` automatically enter comic-reading mode: image-only pages, natural path ordering, automatic cover opening, page controls, keyboard shortcuts, and touch swipes. Pages retain the shared image renderer's fit, zoom, and lightbox behavior.
- Comic mode fully reuses the existing Worker, RAR4/RAR5 support, ZIP fallback, passwords, lazy extraction, IndexedDB cache, size limits, and asset configuration instead of maintaining a second extraction stack.
- Decodes legacy ZIP entry names that omit the UTF-8 flag but are actually encoded as GBK/GB18030.
- Supports encrypted archives: encrypted content is handled through the unified `libarchive.js` path, the built-in dialog asks for a password, and a correct password unlocks directory reading or nested entry previews.
- Uses `libarchive.js` Worker + WASM first to keep large archive parsing off the main thread.
- Falls back to ZIP / TAR / GZIP parsing when the Worker cannot be started, which helps mobile WebViews, local static servers, and private intranet deployments. Encrypted archives never use the fallback path and require the libarchive Worker/WASM assets.
- Extracts internal files on demand, then delegates nested previews through `renderNestedBuffer` or the core dispatcher.
- Includes archive size limits, entry preview limits, worker timeout, IndexedDB cache, and configurable nested-entry download.

## Offline Assets

Default asset paths are:

- `vendor/libarchive/worker-bundle.js`
- `vendor/libarchive/libarchive.wasm`

For private deployments, override them with `options.archive.workerUrl` and `options.archive.wasmUrl`.
The Vue 3 / Vue 2.7 / Vue 2.6 full packages default their viewer asset root to `/file-viewer/` and automatically point to these libarchive files. When deploying under another static prefix, call the matching full package export `setDefaultFullAssetBaseUrl('/your-prefix/')` first.

```ts
const options = {
  archive: {
    workerUrl: '/file-viewer/vendor/libarchive/worker-bundle.js',
    wasmUrl: '/file-viewer/vendor/libarchive/libarchive.wasm',
    cache: true,
    workerTimeoutMs: 30000,
  },
}
```

## Nested Entry Download Policy

The download button in the archive entry preview toolbar stays visible by default. Hide it globally with a boolean:

```ts
const options = {
  archive: {
    entryActions: {
      download: false,
    },
  },
}
```

Or decide per entry from path, extension, size, and other metadata:

```ts
const options = {
  archive: {
    entryActions: {
      download(entry) {
        return entry.path.startsWith('public/')
      },
    },
  },
}
```

This option only controls nested archive entries. The viewer-level toolbar action that downloads the original archive remains controlled by `toolbar` and operation guards.

## Encrypted Archives

By default, encrypted archives open a built-in password dialog. Applications can also provide an initial password or take over password collection:

```ts
const options = {
  archive: {
    password: initialPasswordFromYourSystem,
    async requestPassword(context) {
      // context.filename / context.entryName / context.reason / context.attempt
      return await openYourPermissionCheckedPasswordModal(context)
    },
  },
}
```

Return a string from `requestPassword` to continue. Return `null` or `undefined` to cancel and show a friendly notice. Wrong passwords request another password and never switch to the JSZip fallback.

## Migration Note

The core package no longer bundles the archive renderer and no longer installs `libarchive.js` for the archive pipeline. ZIP/TAR/GZIP fallback, `jszip`, cache, and Worker logic are owned by this package; core may still temporarily retain `jszip` for the OFD vendor path until OFD is fully extracted. Install this renderer explicitly, or use `@file-viewer/preset-all`, when archive preview is required.
