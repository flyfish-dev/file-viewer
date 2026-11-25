import type {
  FileViewerAiOptions,
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerSearchOptions,
  FileViewerSearchState,
  FileViewerZoomState,
} from '../../contracts/types';

export const DEFAULT_FILE_VIEWER_ZOOM_SCALE = 1;
export const DEFAULT_FILE_VIEWER_TEXT_CHUNK_SIZE = 1200;
export const DEFAULT_FILE_VIEWER_TEXT_CHUNK_OVERLAP = 160;

export const createFileViewerZoomState = (
  patch: Partial<FileViewerZoomState> = {}
): FileViewerZoomState => {
  const scale = Number.isFinite(patch.scale) && patch.scale ? Number(patch.scale) : DEFAULT_FILE_VIEWER_ZOOM_SCALE;

  return {
    scale,
    label: patch.label || `${Math.round(scale * 100)}%`,
    canZoomIn: patch.canZoomIn ?? false,
    canZoomOut: patch.canZoomOut ?? false,
    canReset: patch.canReset ?? false,
    minScale: patch.minScale,
    maxScale: patch.maxScale,
  };
};

export const normalizeFileViewerSearchOptions = (
  options?: boolean | FileViewerSearchOptions
): FileViewerSearchOptions => {
  if (options === false) {
    return { enabled: false };
  }
  if (options === true || options === undefined) {
    return {};
  }
  return options;
};

export const createEmptyFileViewerSearchState = (query = ''): FileViewerSearchState => ({
  query,
  total: 0,
  currentIndex: -1,
  current: null,
  matches: [],
});

export const normalizeFileViewerAiOptions = (
  options?: boolean | FileViewerAiOptions
): FileViewerAiOptions => {
  if (options === false) {
    return { enabled: false, collectText: false };
  }
  if (options === true || options === undefined) {
    return {};
  }
  return options;
};

export const buildFileViewerDocumentTextChunks = (
  anchors: FileViewerDocumentAnchor[],
  options?: boolean | FileViewerAiOptions
): FileViewerDocumentChunk[] => {
  const normalized = normalizeFileViewerAiOptions(options);
  if (normalized.enabled === false || normalized.collectText === false) {
    return [];
  }

  const chunkSize = Math.max(200, normalized.chunkSize || DEFAULT_FILE_VIEWER_TEXT_CHUNK_SIZE);
  const overlap = Math.max(
    0,
    Math.min(chunkSize - 1, normalized.chunkOverlap ?? DEFAULT_FILE_VIEWER_TEXT_CHUNK_OVERLAP)
  );
  const maxTextLength = Math.max(0, normalized.maxTextLength || 0);
  const chunks: FileViewerDocumentChunk[] = [];

  anchors.forEach(anchor => {
    const source = maxTextLength ? anchor.text.slice(0, maxTextLength) : anchor.text;
    if (!source) {
      return;
    }
    if (source.length <= chunkSize) {
      chunks.push({
        id: `${anchor.id}-chunk-1`,
        text: source,
        anchor,
        startLine: anchor.line,
        endLine: anchor.line,
      });
      return;
    }

    let offset = 0;
    let chunkIndex = 1;
    while (offset < source.length) {
      const text = source.slice(offset, offset + chunkSize);
      chunks.push({
        id: `${anchor.id}-chunk-${chunkIndex}`,
        text,
        anchor,
        startLine: anchor.line,
        endLine: anchor.line,
      });
      if (offset + chunkSize >= source.length) {
        break;
      }
      offset += chunkSize - overlap;
      chunkIndex += 1;
    }
  });

  return chunks;
};
