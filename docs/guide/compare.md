# Comparison

File Viewer is a pure frontend file preview component for internal tools, intranet systems, and private deployments. It is designed for quick business-file preview, triage, search, print, export, and self-hosted delivery. It is not a professional editor, and it does not promise native-app fidelity for every complex file.

## Open-source component vs commercial edition

The open-source File Viewer and the commercial edition are not mutually exclusive. The open-source edition provides browser-native, multi-format, offline-ready preview. The commercial edition comes from the Flyfish Office product line and replaces the Office document capability with a self-developed native document engine, giving the same File Viewer integration a `file-viewer-pro` style Office experience.

| Dimension | Open-source File Viewer | Commercial / file-viewer-pro path |
| --- | --- | --- |
| Formats | 244 registered extensions (221 stable, 23 experimental) across 34 preview pipelines for PDF/OFD, Office/iWork, CAD, Typst, archives, email, ebooks, diagrams, media, 3D, data assets, optional local DICOM, and digital-signature containers; common capabilities use presets while DICOM and signature formats stay explicit opt-ins | Strengthens the Word, Excel, and PowerPoint deep end. It can replace the Word / Spreadsheet / Presentation capability in `preset-office` while PDF, OFD, CAD, Archive, and other formats continue to use open-source renderers |
| Fidelity | Optimized for readable, searchable, printable previews embedded in business systems. DOCX is currently flow-first, and Excel/PPTX target common preview needs rather than native Office pixel parity | The self-developed native document engine targets pagination, fonts, tables, shapes, headers/footers, comments/revisions, and complex deck layouts for contracts, reports, archives, and formal delivery |
| Performance | A light core plus lazy renderer loading keeps most attachment centers responsive. Worker/WASM assets load on demand, while extreme large files should be validated with real samples | Large documents, large spreadsheets, and complex decks get Worker parsing, paginated or chunked rendering, virtual scrolling, caching, and memory tuning to keep the main thread smooth |
| Licensing and support | File Viewer-authored code is Apache-2.0 and usable in commercial products. The independently versioned binary-`.ppt` engine, `@file-viewer/ppt`, keeps its own license and its public runtime is included in Demo/Full/CDN assets with the visible watermark. Community issues, sponsorship, and priority support can help, but final launch validation remains with the product team | Commercial licensing, private delivery, priority support, sample regression, custom compatibility work, and watermark-free PPT delivery for teams that need clear ownership and timelines |

## Replacing the Office capability

Commercial delivery provides a pluggable Office preset or renderer set. Your app keeps the same Vue, React, Svelte, jQuery, Web Component, or Vanilla JS component entry. Themes, watermarks, toolbar behavior, search, events, and non-Office formats stay on the same File Viewer contracts; only the Word, Excel, and PowerPoint rendering path switches to the commercial engine.

```ts
import FileViewer from '@file-viewer/vue3'
import engineeringPreset from '@file-viewer/preset-engineering'
import { commercialOfficePreset } from './vendor/file-viewer-pro-office'

const viewerOptions = {
  rendererMode: 'replace',
  preset: [
    commercialOfficePreset,
    engineeringPreset
  ],
  theme: 'light'
}
```

The actual package name and delivery channel depend on the commercial license. The stable pattern is what matters here: `core`, component packages, and non-Office renderers remain unchanged, while the Office preset / renderer can be replaced by the commercial engine.

## File Viewer vs conversion services

| Approach | Strengths | Limits |
| --- | --- | --- |
| Backend conversion | Can normalize files to PDF/images for caching, archival workflows, permission auditing, and unified fallback behavior | Requires conversion workers, queues, temporary files, fonts, caches, retries, and cleanup; private deployment can be costly |
| Office Online / cloud services | High fidelity, low maintenance, mature collaboration features | Not always suitable for intranet, private deployment, sensitive files, offline environments, or strict compliance requirements |
| File Viewer | Pure frontend, self-hostable, lazy-loaded, and easy to embed in business applications | Complex Office / CAD files still need real-file regression; not a replacement for professional editors or archival conversion |

## When File Viewer fits best

- Files should not be sent to a third-party conversion service.
- The app runs in an intranet, private deployment, offline environment, or strict CSP setup.
- One component needs to cover Office, PDF/OFD, CAD, archives, email, images, media, code, and structured data.
- The product goal is preview, triage, search, print, export, and download rather than editing.
- The frontend team wants renderer/preset composition instead of many unrelated viewer embeds.

## When backend conversion is better

- Long-term archival requires every file to become a stable PDF or image.
- Very large files make browser memory or mobile performance the main constraint.
- The workflow needs maximum fidelity, batch conversion, OCR, burned-in watermarks, audit records, or asynchronous review queues.
- The team already runs a reliable LibreOffice, OnlyOffice, or commercial conversion service and can absorb the operational cost.

## Recommended mix

Many production systems can combine both approaches:

- Use File Viewer for instant browser-side preview by default.
- Trigger backend PDF conversion for archival, contracts, audit, or strict consistency cases.
- Deploy File Viewer Worker, WASM, font, and vendor assets with the rest of the app's static resources. The Full/CDN payload includes binary `.ppt` under `vendor/ppt/`; use `options.presentation.pptModuleUrl` and matching asset URLs only for a non-standard route.
- Collect real compatibility feedback through issues and sanitized samples instead of trusting synthetic files only.

## Validation checklist

- Try Word, Excel, PowerPoint, PDF, DWG, ZIP, and EML in the [demo](https://demo.file-viewer.app).
- Validate the real formats your product cares about with sanitized files.
- Check mobile WebView behavior, intranet static paths, Worker/WASM MIME types, CSP, and fonts.
- For Office / CAD fidelity, review the [format fidelity notes](./format-fidelity).
