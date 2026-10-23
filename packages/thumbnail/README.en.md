# @file-viewer/thumbnail

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/thumbnail/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/thumbnail/README.zh-CN.md)

Browser thumbnail generation for Flyfish File Viewer. It reuses `createViewer()`, installed renderers, optional native thumbnail adapters, a bounded viewer pool, ordered batch results, and completion-order streaming.

```bash
pnpm add @file-viewer/thumbnail @file-viewer/preset-all
```

```ts
import { createFileViewerThumbnailGenerator } from '@file-viewer/thumbnail'
import allPreset from '@file-viewer/preset-all'

const generator = createFileViewerThumbnailGenerator({
  // Uses the same preset/renderers configuration as createViewer().
  viewerOptions: { preset: allPreset },
  concurrency: 2,
})

const result = await generator.generate({ file, filename: file.name })
for await (const item of generator.generateStream(files)) {
  if (item.ok) await upload(item.result.blob)
}
await generator.destroy()
```

Each item can override `width`, `height`, `format: 'webp' | 'jpeg' | 'png'`, `quality`, `fit`, `background`, `timeoutMs`, and `signal`. `generate()` returns the Blob, actual MIME type, renderer ID, duration, `embedded | provider-native | provider-dom | dom-fallback` strategy, and `degraded` state. Batch results remain input-ordered and isolate failures; stream results are completion-ordered, carry the original index, and keep pending Blob results bounded by the concurrency window.

Failures use `FileViewerThumbnailError` with stable codes: `browser-required`, `unsupported`, `timeout`, `aborted`, `capture-failed`, `capture-unavailable`, `tainted-canvas`, `empty-output`, `destroyed`, and `invalid-options`.

- Requires a real browser. Server applications must invoke it inside Chromium.
- The string form `preset: 'all'` only works after a Vite plugin or preset side-effect import has registered it. Pass the imported preset object, as above, for bundler-neutral setup.
- Embedded previews take priority over rendering. EPUB uses its declared cover through the pinned, lazy-loaded engine shipped with this package; OOXML and 3MF use package thumbnail relationships; OpenDocument and XMind use their packaged thumbnails; and Apple Numbers uses its Quick Look thumbnail when present.
- Missing, corrupt, empty, or undecodable embedded images safely fall back to renderer-native or first-content capture.
- PDF and images use native capture; Office, OFD, and ebooks expose a first-content target when no embedded preview is available.
- Other renderers use a DOM fallback and return `degraded: true`.
- Source files and generated thumbnails are never persisted by this package.
- Versions, sources, and license texts for the EPUB engine and its inlined dependencies are recorded in `dist/vendor/epubjs.NOTICE.txt`.
