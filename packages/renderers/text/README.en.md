# @file-viewer/renderer-text

Base code, text, and Markdown renderer package for Flyfish File Viewer. Mermaid, side-by-side patch diff, and Git bundle inspection live in `@file-viewer/capability-mermaid` and `@file-viewer/capability-text-tools`; they are excluded from the standard/full default closure.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { textRenderer } from '@file-viewer/renderer-text'

const options = {
  builtinRenderers: 'none',
  renderers: textRenderer,
  text: {
    lineNumbers: true,
  },
}
```

You can also compose it with other renderers:

```ts
import { textRenderer } from '@file-viewer/renderer-text'
import { pdfRenderer } from '@file-viewer/renderer-pdf'

const options = {
  builtinRenderers: 'none',
  renderers: [pdfRenderer, textRenderer],
}
```

## Capabilities

- Code and text preview uses `highlight.js` core with per-language dynamic imports instead of registering every language up front.
- Code, text, and virtualized Markdown source views show their file type, indexing status, and line-count metadata bar by default. Set `options.text.toolbar: false` to hide this renderer-local bar without hiding the viewer-level download, search, or zoom toolbar.
- Regular code and text previews can show a line-number gutter with `options.text.lineNumbers: true`. The gutter is excluded from copied source, search matches, and assistive reading. Virtual large-text views keep their existing gutter unless it is explicitly set to `false`.
- With the text-tools capability installed, `patch` uses `diff2html` for side-by-side review and `bundle` / `bdl` enables Git bundle inspection.
- With the Mermaid capability installed, fenced Mermaid blocks render as diagrams. Without it, the source stays visible with the exact CLI enablement command.
- HTML, XML, Vue, and similar files are escaped and shown as source, never executed.
- Markdown uses `marked` for a read-only reading surface with dark/light theme support, table scrolling, and a unified zoom provider.
- Markdown no longer falls back to source because of the general large-text threshold. Set `options.text.markdownVirtualizeAboveBytes` only when an application must bound exceptionally large Markdown files.
- Does not depend on any online service or public CDN, making it suitable for intranet logs, configs, snippets, README files, and knowledge-base attachments.

## Migration Note

Standard/full includes base code, text, and Markdown without installing `diff2html`, `pako`, or Mermaid. Optional uploads show `npx file-viewer-cli add text-tools --write` or `add mermaid-markdown --write`; `preset-all` is only for explicit all/debug use.
