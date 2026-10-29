# @file-viewer/renderer-spreadsheet

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/spreadsheet/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/spreadsheet/README.zh-CN.md)

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
- XLSX uses saved default and explicit column widths and point-based row heights. CSV/TSV retains content auto-fit and supports large decoded text without creating a second UTF-8 byte array.
- Column units follow the workbook's Normal style. SimSun/NSimSun digit advances are converted from points before rounding; unmeasured custom fonts retain the standard fallback, so exact geometry can depend on the font.

## Fill the viewport for small Excel sheets

`options.spreadsheet.fillViewport` defaults to `true` for spreadsheet formats, including Excel and CSV / TSV. Small and empty sheets show blank column headers (A / B / …), row numbers and grid cells using the worksheet's default sizes. Padding recalculates on resize, zoom and sheet changes, stays virtual, and never stretches existing cells or changes workbook data. Set it to `false` to show only the used range.

```ts
const options = {
  rendererMode: 'replace',
  renderers: spreadsheetRenderer,
  spreadsheet: { fillViewport: false }, // Optional: show only the used range.
}
```

This changes only the display: workbook data, used range, original-file downloads/exports, search results and content counts remain unchanged.

## Offline Assets

The optional worker path is:

- `vendor/xlsx/sheet.worker.js`

For private deployments, override it with `options.spreadsheet.workerUrl`. The official Vite plugin and demo worker build script generate this file from this package's worker entry.

## Migration Note

Spreadsheet preview has moved completely out of `@file-viewer/core`. Core now only keeps the asset manifest, shared types, and a compatibility error message, and it no longer installs `styled-exceljs`, `e-virt-table`, or `tinycolor2` by default. Install this package and pass it through `renderers`, or use `@file-viewer/preset-all` for the complete spreadsheet experience.

## Formulas without saved results

Saved formula results, including zero, remain authoritative. When an exporter omits the saved result, the preview can recover local/cross-sheet references, ranges, arithmetic/comparisons, `IF`, `ROUND`, `ROW` and `SUM` with a bounded offline evaluator. Cell number formats are retained.

This is not a full Excel calculation engine. Cyclic, external, unsupported or over-budget formulas are displayed as their original `=formula` text instead of a fabricated zero. No JavaScript or remote formula resources are evaluated. Main-thread and Worker paths use the same recovery logic.
