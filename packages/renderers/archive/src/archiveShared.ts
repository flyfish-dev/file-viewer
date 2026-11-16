import {
  ARCHIVE_EXTENSIONS,
  DEFAULT_SUPPORTED_EXTENSIONS,
} from '@file-viewer/core';
import type {
  FileRenderContext,
  FileViewerArchiveEntryActionContext,
  FileViewerArchiveOptions,
  FileViewerOptions,
} from '@file-viewer/core';

export const ARCHIVE_PREVIEWABLE_EXTENSIONS = DEFAULT_SUPPORTED_EXTENSIONS as readonly string[];

export interface ArchiveEntryView {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified?: number;
  depth: number;
  previewable: boolean;
  compressedFile: {
    name: string;
    size: number;
    lastModified?: number;
    extract(): Promise<File>;
  };
}

export const getArchiveEntryExtension = (name: string) => {
  const clean = name.split(/[?#]/)[0] || name;
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
};

const ARCHIVE_SYSTEM_METADATA_FILENAMES = new Set([
  '.ds_store',
  'desktop.ini',
  'thumbs.db',
]);

export const isArchiveSystemMetadataPath = (path: string) => {
  const normalized = path.replace(/^\/+/, '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const filename = parts[parts.length - 1]?.toLowerCase() || '';

  return parts.some(part => part === '__MACOSX' || part.startsWith('._')) ||
    ARCHIVE_SYSTEM_METADATA_FILENAMES.has(filename);
};

export const isArchiveExtension = (extension: string) => (
  (ARCHIVE_EXTENSIONS as readonly string[]).includes(extension.toLowerCase())
);

export const isPreviewableArchiveEntry = (name: string) => {
  const extension = getArchiveEntryExtension(name);
  return ARCHIVE_PREVIEWABLE_EXTENSIONS.includes(extension);
};

export const formatArchiveBytes = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let next = value / 1024;
  for (const unit of units) {
    if (next < 1024 || unit === units[units.length - 1]) {
      return `${next.toFixed(next < 10 ? 1 : 0)} ${unit}`;
    }
    next /= 1024;
  }
  return `${value} B`;
};

const isCompressedFile = (value: unknown): value is ArchiveEntryView['compressedFile'] => {
  return typeof value === 'object' &&
    value !== null &&
    'extract' in value &&
    typeof value.extract === 'function';
};

export const flattenArchiveObject = (input: Record<string, unknown>, prefix = ''): ArchiveEntryView[] => {
  const entries: ArchiveEntryView[] = [];

  Object.entries(input).forEach(([key, value]) => {
    const path = prefix ? `${prefix}/${key}` : key;
    if (isArchiveSystemMetadataPath(path)) {
      return;
    }
    if (isCompressedFile(value)) {
      const name = value.name || key;
      const extension = getArchiveEntryExtension(name);
      entries.push({
        id: path,
        path,
        name,
        extension,
        size: value.size || 0,
        lastModified: value.lastModified,
        depth: path.split('/').length - 1,
        previewable: isPreviewableArchiveEntry(name),
        compressedFile: value,
      });
      return;
    }
    if (value && typeof value === 'object') {
      entries.push(...flattenArchiveObject(value as Record<string, unknown>, path));
    }
  });

  return entries;
};

export const createArchiveCacheKey = (archiveName: string, archiveSize: number, entry: ArchiveEntryView) => {
  return [
    'archive-entry',
    archiveName || 'archive',
    archiveSize,
    entry.path,
    entry.size,
    entry.lastModified || 0,
  ].join(':');
};

export const createArchiveEntryActionContext = (
  entry: ArchiveEntryView
): FileViewerArchiveEntryActionContext => ({
  path: entry.path,
  name: entry.name,
  extension: entry.extension,
  size: entry.size,
  lastModified: entry.lastModified,
  depth: entry.depth,
  previewable: entry.previewable,
});

export const isArchiveEntryDownloadAllowed = (
  entry: ArchiveEntryView,
  archiveOptions: FileViewerArchiveOptions | undefined
) => {
  const policy = archiveOptions?.entryActions?.download;
  if (policy === undefined) {
    return true;
  }
  if (typeof policy === 'boolean') {
    return policy;
  }
  try {
    return policy(createArchiveEntryActionContext(entry)) !== false;
  } catch {
    return false;
  }
};

const buildNestedOptions = (
  context: FileRenderContext | undefined,
  archiveOptions: FileViewerArchiveOptions | undefined
): FileViewerOptions => {
  const options = { ...context?.options, archive: archiveOptions };
  // These are internally inherited options, not an external explicit override.
  if (context?.i18n) {
    delete options.locale;
    delete options.messages;
    delete options.i18n;
  }
  return options;
};

export const buildArchiveNestedRenderContext = (
  context: FileRenderContext | undefined,
  entry: Pick<ArchiveEntryView, 'name'>,
  archiveOptions: FileViewerArchiveOptions | undefined
): FileRenderContext => ({
  ...context,
  filename: entry.name,
  // Archive children are rendered from the extracted bytes. Never inherit
  // the parent archive URL, otherwise streaming renderers such as PDF.js
  // would try to parse the .zip/.rar source as the nested file.
  url: undefined,
  streamUrl: undefined,
  options: buildNestedOptions(context, archiveOptions),
});
