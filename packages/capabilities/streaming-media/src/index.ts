import { registerFileViewerHlsLoader } from '@file-viewer/renderer-media';

export const enableFileViewerStreamingMedia = () => {
  registerFileViewerHlsLoader(() => import('hls.js'));
};

enableFileViewerStreamingMedia();
