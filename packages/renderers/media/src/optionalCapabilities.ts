import type * as HlsModule from 'hls.js';
import type * as MidiModule from '@tonejs/midi';

export type FileViewerOptionalModuleLoader<T> = () => Promise<T>;

let hlsLoader: FileViewerOptionalModuleLoader<typeof HlsModule> | null = null;
let midiLoader: FileViewerOptionalModuleLoader<typeof MidiModule> | null = null;

export const registerFileViewerHlsLoader = (
  loader: FileViewerOptionalModuleLoader<typeof HlsModule> | null
) => {
  hlsLoader = loader;
};

export const registerFileViewerMidiLoader = (
  loader: FileViewerOptionalModuleLoader<typeof MidiModule> | null
) => {
  midiLoader = loader;
};

export const getFileViewerHlsLoader = () => hlsLoader;
export const getFileViewerMidiLoader = () => midiLoader;
