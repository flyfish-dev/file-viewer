import { mountViewer } from '../../../packages/core/src/browser';
import { spreadsheetRenderer } from '../../../packages/renderers/spreadsheet/src/index';
import workerUrl from '../../../packages/renderers/spreadsheet/dist/worker/sheet.worker.js?url';

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
    spreadsheet: { worker: query.get('worker') !== 'false', workerUrl },
  },
});
window.commentsTest = handle;
const filename =
  query.get('partial') === 'true'
    ? 'excel-comments-partial.xlsx'
    : 'excel-comments.xlsx';
const response = await fetch(new URL(filename, import.meta.url));
await handle.load({ buffer: await response.arrayBuffer(), filename });
