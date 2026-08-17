# Third-party notices

- The IWA Snappy framing implementation follows the public Apple iWork notes and the Apache-2.0 SheetJS implementation. No Xberg runtime code is embedded.
- `keynote-archives` 2.0.1 supplies MIT-licensed generated Protobuf message definitions for typed Keynote and shared iWork object decoding. File Viewer applies its own bounded Snappy framing and tolerant archive parser around those definitions.
- `styled-exceljs` is used for the modern Numbers saved-value workbook path under its published license.
- `JSZip`, `pako`, and `@xmldom/xmldom` are loaded inside the on-demand iWork renderer/Worker chunk.
