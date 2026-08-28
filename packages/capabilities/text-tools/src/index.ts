import {
  registerFileViewerDiffToHtml,
  registerFileViewerPakoLoader,
} from '@file-viewer/renderer-text';
import { html as diffToHtml } from 'diff2html';

export const enableFileViewerTextTools = () => {
  registerFileViewerDiffToHtml(diffToHtml);
  registerFileViewerPakoLoader(() => import('pako'));
};

enableFileViewerTextTools();
