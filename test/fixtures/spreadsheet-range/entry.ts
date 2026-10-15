import { createViewer } from '@file-viewer/core';
import { spreadsheetRenderer } from '../../../packages/renderers/spreadsheet/src/index';
import workerUrl from '@file-viewer/renderer-spreadsheet/worker/sheet.worker.js?url';
const bytes = await (await fetch(new URL('./range-navigation.xlsx', import.meta.url))).arrayBuffer();
const handle=createViewer(document.getElementById('viewer')!, {options:{rendererMode:'replace',renderers:[spreadsheetRenderer],styleIsolation:'none',toolbar:false,spreadsheet:{worker:true,workerUrl}}});
(window as any).rangeTest = handle;

await handle.load({buffer:bytes,filename:'synthetic.xlsx'});
