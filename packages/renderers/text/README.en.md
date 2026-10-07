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
    wrapLongLines: true,
    prettyPrint: true,
    prettyPrintMaxBytes: 512 * 1024,
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
- `options.text.wrapLongLines: true` changes layout only and never inserts source newlines. Regular previews keep one gutter entry per logical line; large files remain bounded in the virtual window while wrapping to the available width.
- `options.text.prettyPrint: true` lazily loads Prettier and only the parser plugins needed by a supported structured format. It formats a display copy, labels the toolbar as a formatted preview, and provides a switch back to the original source. JSON/JSONC/JSON5, JavaScript/TypeScript, HTML/Vue, CSS, YAML, Markdown, GraphQL, and XML share this path.
- `prettyPrintMaxBytes` limits only Prettier and defaults to the effective `virtualizeAboveBytes` value (512 KiB when omitted). Oversized, malformed, and unsupported inputs fall back to the original source, which continues through the existing regular or virtual renderer. XML uses a conservative whitespace-preserving mode; mixed content and `xml:space="preserve"` stay on the original source path.
- The legacy `*-full` script-tag IIFE assets do not bundle Prettier, so `prettyPrint` falls back to the original source there. Use the ESM integration (standard component packages or `@file-viewer/preset-*`) for formatted previews.
- With the text-tools capability installed, `patch` uses `diff2html` for side-by-side review and `bundle` / `bdl` enables Git bundle inspection.
- With the Mermaid capability installed, fenced Mermaid blocks render as diagrams. Without it, the source stays visible with the exact CLI enablement command.
- HTML/HTM opens a static page preview with a source-view toggle. `options.text.htmlView: 'source'` starts with the original source. Inline CSS and embedded images are preserved; scripts, forms, external navigation, and external resource requests are blocked by sanitization, CSP, and an opaque sandbox. This is not a website runtime.
- XML, Vue, and similar files default to escaped source previews. XML can opt into the XSD/XSLT profiles below. HTML source supports the same highlighting, formatting, and large-text virtualization options.
- Markdown uses `marked` for a read-only reading surface with dark/light theme support, table scrolling, and a unified zoom provider.
- Fenced Markdown code with a declared supported language is highlighted automatically, including inside Shadow DOM. Language modules load locally on demand; unknown languages and code beyond a 512 KiB per-document highlighting budget stay readable as source. Set `options.text.markdownHighlight: false` to disable highlighting; no call to `highlightAll()` is needed.
- Markdown no longer falls back to source because of the general large-text threshold. Set `options.text.markdownVirtualizeAboveBytes` only when an application must bound exceptionally large Markdown files.
- Does not depend on any online service or public CDN, making it suitable for intranet logs, configs, snippets, README files, and knowledge-base attachments.

## Migration Note

Standard/full includes base code, text, and Markdown without installing `diff2html`, `pako`, or Mermaid. Optional uploads show `npx file-viewer-cli add text-tools --write` or `add mermaid-markdown --write`; `preset-all` is only for explicit all/debug use.

## Optional XML Profiles

XML profiles use real libxml2 XML Schema 1.0 and libxslt XSLT 1.0 WASM engines.
The ordinary text/standard/full installation does not install these optional peers
or replace the browser's `XSLTProcessor`. To enable profiles, install the pinned
engines and copy their assets:

```sh
pnpm add xmllint-wasm@5.3.0 xslt-polyfill@1.0.29
pnpm exec file-viewer-xml-assets public/file-viewer/xml
```

The asset helper copies installed files without downloading or installing anything.
It preserves unrelated destination files and includes JS/WASM, `licenses/`, and a
SHA-256 `manifest.json`. Keep the notices with redistributed assets.

Register once, then pass the options to Vanilla/Web Component or any standard component:

```ts
import { enableFileViewerXmlProfiles } from '@file-viewer/renderer-text/xml-profiles'

const disableXmlProfiles = enableFileViewerXmlProfiles()
const options = {
  xml: {
    profilesUrl: '/xml-profiles/profiles.json',
    runtime: {
      xsdWorkerUrl: '/file-viewer/xml/xmllint-browser.mjs',
      xsltModuleUrl: '/file-viewer/xml/xslt-wasm.js',
    },
  },
}
// Call disableXmlProfiles() when registration is no longer needed.
```

Keep `xmllint.wasm` beside `xmllint-browser.mjs`. Serve JS/MJS as `text/javascript`
and WASM as `application/wasm`. Omitted runtime URLs resolve under
`xml/` in the configured asset base, or relative to the page when no asset base is
configured. The host CSP must permit `worker-src blob:` and WASM compilation
(`script-src 'wasm-unsafe-eval'` where supported). All profile and runtime resources
must use same-origin HTTP(S) without redirects. Serve them with the application
for offline/intranet use; no public CDN or document upload is involved.

Example manifest:

```json
{
  "profiles": [{
    "id": "invoice-v1",
    "match": {
      "rootNamespace": { "enabled": true, "root": "invoice", "namespace": "urn:example:invoice:v1" },
      "xsd": { "enabled": true }
    },
    "xsd": "./invoice.xsd",
    "xslt": "./invoice.xsl"
  }]
}
```

Resource paths resolve against the manifest directory. Alternatively, supply
`xml.profiles` and `xml.baseUrl` instead of `profilesUrl`. Each profile must enable
at least one check. Root/namespace and XSD checks are independent; all enabled
checks must pass. Exactly one matching profile triggers transformation. No match,
ambiguity, validation errors and processing failures retain the XML source and
report diagnostics through `xml.onDiagnostic`, the standard `onDiagnostic`, and
the diagnostics panel.

Generated HTML is sanitized and displayed in an opaque iframe with an empty
sandbox and a CSP blocking scripts and external resources. `View Source` and
`View Rendered` reuse the original input buffer and cached result without another
download, validation or transformation. Source is never DOM serialization and
pretty printing is disabled for this view. The original remains the download
source. Use `xml.initialView: 'source'` or customize button copy with `xml.labels`.

DTD/entity declarations, XInclude, schema include/import/redefine/override,
XSLT include/import, `document()` and extension instructions fail closed. There
is no external-resource resolver in this version; such documents fall back to source.
The default operation deadline is 15 seconds, capped at 60 seconds. Hard ceilings
are 4 MiB XML, 2 MiB per schema/stylesheet, 8 MiB output, 16 MiB total resources,
and 32 profiles; `xml.limits` may lower them. Each engine's WASM linear memory is
capped at 64 MiB. Timeout, cancellation and unload terminate workers and revoke Blob URLs.

The source repository's `test/fixtures/issue-305/` contains redistributable
valid/invalid XML, XSD, XSLT and a manifest. See [XML profiles notices](./licenses/xml-profiles/NOTICE.md)
for verified licenses and upstream sources.

### Markdown heading navigation

Headings without an authored ID receive Unicode-preserving, lowercase IDs.
Repeated headings get numeric suffixes. Existing table-of-contents links such as
`[Introduction](#introduction)` scroll within their own viewer, including Shadow
DOM and multiple viewers on one page; the host page URL is not changed. Authored
IDs, external links and modified clicks are preserved. This does not generate a
table of contents from a `[TOC]` directive.

### LRC lyrics

`.lrc` uses the text renderer and is registered in the lite, standard and all presets.
The read-only view offers annotated lyrics, plain lyrics and the exact decoded source.
It supports repeated line timestamps, inline word timestamps, metadata, signed offsets,
UTF-8/UTF-16/GBK, wrapping and the shared zoom controls. `M:`, `F:` and `D:` roles
continue until the next explicit role; untimed text and unknown markers remain visible.
Positive offsets advance timestamps. This is static preview, not synchronized playback.
`options.text.encoding`, `toolbar` and `wrapLongLines` retain their existing meaning.
Oversized inputs or excessive timestamp expansion fall back to the existing source
viewer instead of silently truncating lyrics. LRC content never creates active HTML.
