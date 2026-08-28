import { registerFileViewerMidiLoader } from '@file-viewer/renderer-media';

export const enableFileViewerMidi = () => {
  registerFileViewerMidiLoader(() => import('@tonejs/midi'));
};

enableFileViewerMidi();
