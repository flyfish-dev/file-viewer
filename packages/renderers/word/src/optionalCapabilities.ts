export type FileViewerRtfModule = {
  RTFJS?: any;
  default?: any;
};

export type FileViewerRtfLoader = () => Promise<FileViewerRtfModule>;

let rtfLoader: FileViewerRtfLoader | null = null;

export const registerFileViewerRtfLoader = (loader: FileViewerRtfLoader | null) => {
  rtfLoader = loader;
};

export const getFileViewerRtfLoader = () => rtfLoader;
