import { normalizeFileViewerToolbar } from '../lifecycle/operations';
import { normalizeFileViewerTheme, resolveFileViewerUiDensity } from '../config/options';
import { getExtension, resolveFileViewerSourceFilename } from '../source';
import type {
  FileViewerFileRef,
  FileViewerOptions,
  FileViewerThemeMode,
  FileViewerToolbarOptions,
  FileViewerUiDensity,
} from '../contracts/types';

export interface ResolveFileViewerPresentationStateInput {
  filename?: string;
  file?: FileViewerFileRef;
  url?: string;
  options?: FileViewerOptions;
}

export interface FileViewerPresentationState {
  displayFilename: string;
  extension: string;
  toolbar: FileViewerToolbarOptions;
  theme: FileViewerThemeMode;
  density: FileViewerUiDensity;
}

export const resolveFileViewerPresentationState = ({
  filename,
  file,
  url,
  options,
}: ResolveFileViewerPresentationStateInput): FileViewerPresentationState => {
  const displayFilename = resolveFileViewerSourceFilename({
    filename,
    file,
    url,
  });

  return {
    displayFilename,
    extension: getExtension(displayFilename),
    toolbar: normalizeFileViewerToolbar(options),
    theme: normalizeFileViewerTheme(options?.theme),
    density: resolveFileViewerUiDensity(options),
  };
};
