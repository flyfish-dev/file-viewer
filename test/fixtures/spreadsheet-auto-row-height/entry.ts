import { mountViewer } from '@file-viewer/core/browser';
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet';
import workerUrl from '@file-viewer/renderer-spreadsheet/worker/sheet.worker.js?url';

declare global {
  interface Window {
    commentsTest: ReturnType<typeof mountViewer>;
    commentsWorkerMessages: unknown[];
  }
}

window.commentsWorkerMessages = [];
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
  constructor(url: string | URL, options?: WorkerOptions) {
    super(url, options);
    this.addEventListener('message', (event) =>
      window.commentsWorkerMessages.push(event.data),
    );
  }
};
const query = new URLSearchParams(location.search);
const target = document.getElementById('viewer');
if (!target) throw new Error('Missing fixture viewer');
const handle = mountViewer(target, {
  options: {
    rendererMode: 'replace',
    renderers: [spreadsheetRenderer],
    styleIsolation: query.get('isolation') === 'none' ? 'none' : 'shadow',
    locale: query.get('locale') || 'en-US',
    theme: query.get('theme') === 'dark' ? 'dark' : 'light',
    spreadsheet: { resizableColumns: true, resizableRows: true, rowNumberMode: query.get('legacy') === 'true' ? 'legacy-records' : 'source', worker: query.get('worker') !== 'false', workerUrl },
  },
});
window.commentsTest = handle;
const filename = query.get('file') || 'original-454.xlsx';
const files: Record<string, URL> = {
  'original-454.xlsx': new URL('./original-454.xlsx', import.meta.url),
  'autoheight-controls.xlsx': new URL('./autoheight-controls.xlsx', import.meta.url),
  'autoheight-drawings.xlsx': new URL('./autoheight-drawings.xlsx', import.meta.url),
};
const response = await fetch(files[filename]);
await handle.load({buffer: await response.arrayBuffer(), filename});
window.issuesReady = true;
