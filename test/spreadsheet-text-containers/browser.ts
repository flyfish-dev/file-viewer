import { renderFileViewerSpreadsheet } from '../../packages/renderers/spreadsheet/src/index.js';
import { createFileViewerDomSearchController } from '../../packages/core/src/index.js';
Object.assign(globalThis, { spreadsheetTextCheck: { renderFileViewerSpreadsheet, createFileViewerDomSearchController } });
