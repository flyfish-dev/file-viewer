# @file-viewer/renderer-spreadsheet

Standalone spreadsheet renderer package for Flyfish File Viewer. It is powered by `styled-exceljs` and `e-virt-table`, previews XLSX, XLSM, XLSB, XLS, CSV, TSV, ODS, FODS, Numbers, and compatible spreadsheet files in the browser, and resolves the optional worker URL through the File Viewer asset manifest for offline enterprise deployments.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet'

const options = {
  rendererMode: 'replace',
  renderers: spreadsheetRenderer,
}
```

You can also compose it with other renderer packages:

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, spreadsheetRenderer],
}
```

## Capabilities

- Supports `.xlsx`, `.xltx`, `.xlsm`, `.xlsb`, `.xls`, `.xlt`, `.xltm`, `.csv`, `.tsv`, `.ods`, `.fods`, and `.numbers`.
- CSV / TSV automatically detects UTF-8 (with or without BOM) and GBK / GB18030. For known inputs, set `options.spreadsheet.textEncoding` to `utf-8`, `gbk`, or `gb18030`.
- Defaults to `options.spreadsheet.worker: 'auto'`: small files keep the main-thread compatibility path, while files at or above `options.spreadsheet.workerAutoThreshold` (1MB by default) automatically try the static worker.
- Can force the static worker with `options.spreadsheet.worker: true`, disable auto worker with `worker: false`, and override custom static paths with `options.spreadsheet.workerUrl`.
- Supports multiple sheets, horizontally scrollable sheet tabs, merged cells, row and column sizing, borders, fills, alignment, text color, Office 365 and WPS in-cell images, workbook drawing images, double-click image previews, the global zoom provider, and optional header drag column resizing.
- TIFF drawings in XLSX files load the MIT-licensed UTIF.js decoder only when needed and are converted to PNG in the browser. Ordinary spreadsheets do not load the TIFF decoder.
- Uses virtual rendering for interaction. Host components usually hide full-document print for spreadsheets to avoid printing only the current viewport.

## Offline Assets

The optional worker path is:

- `vendor/xlsx/sheet.worker.js`

For private deployments, override it with `options.spreadsheet.workerUrl`. The official Vite plugin and demo worker build script generate this file from this package's worker entry.

## Migration Note

Spreadsheet preview has moved completely out of `@file-viewer/core`. Core now only keeps the asset manifest, shared types, and a compatibility error message, and it no longer installs `styled-exceljs`, `e-virt-table`, or `tinycolor2` by default. Install this package and pass it through `renderers`, or use `@file-viewer/preset-all` for the complete spreadsheet experience.
