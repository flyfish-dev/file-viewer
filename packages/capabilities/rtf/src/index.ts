import { registerFileViewerRtfLoader } from '@file-viewer/renderer-word';

export const enableFileViewerRtf = () => {
  registerFileViewerRtfLoader(() => import('rtf.js/dist/RTFJS.bundle.js'));
};

enableFileViewerRtf();
