# @file-viewer/renderer-hangul

Offline HWP v5 and HWPX renderer for File Viewer. It parses HWPX ZIP/XML and HWP v5 CFB structures in an on-demand module Worker, with bounded inflation, compression ratio, ZIP entry, HWP record, and timeout limits. Encrypted, DRM-protected, and distribution documents are detected and rejected explicitly.

Use `options.hangul` to override the Worker URL, timeout, or parser limits. `useWorker: false` is only for environments without Worker support. Redistributable Apache-2.0 HWP v5/HWPX fixtures cover page geometry, styles, merged tables, headers, footers, notes, and images in Chromium, Firefox, and WebKit, so the catalog classifies HWP/HWPX as `structured / stable`. Rare controls and producer-specific layout constructs remain documented limitations.
