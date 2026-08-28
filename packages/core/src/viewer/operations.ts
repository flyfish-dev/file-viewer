import {
  triggerFileViewerBlobDownload,
  triggerFileViewerUrlDownload,
  waitForFileViewerPrintWindowReady,
} from '../output/export';
import { DEFAULT_FILE_VIEWER_SOURCE_FILENAME } from '../source';
import type { FileViewerErrorMessageFormatter } from './state';
import {
  translateFileViewerMessage,
  type FileViewerI18nInput,
} from '../i18n/messages';
import type {
  FileRenderExportAdapter,
  FileViewerDownloadOptions,
  FileViewerExportHtmlOptions,
  FileViewerMessageKey,
  FileViewerOperationType,
  FileViewerPrintOptions,
  NormalizedFileViewerSource,
} from '../contracts/types';

export interface FileViewerOriginalSourceState {
  buffer?: ArrayBuffer | null;
  file?: File | Blob | null;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
}

export type CreateFileViewerOriginalSourceStateInput = FileViewerOriginalSourceState;

export const DEFAULT_FILE_VIEWER_PREVIEW_TITLE = 'file-viewer-preview';
export const DEFAULT_FILE_VIEWER_EXPORT_FILENAME = 'preview';
export const DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME = DEFAULT_FILE_VIEWER_SOURCE_FILENAME;

export interface ResolveFileViewerOperationFilenameInput {
  filename?: string | null;
  source?: FileViewerOriginalSourceState | null;
  fallback?: string;
}

export interface FileViewerOperationExecutorBase {
  beforeOperation?: (operation: FileViewerOperationType) => boolean | Promise<boolean>;
  i18n?: FileViewerI18nInput;
}

export interface ExecuteFileViewerDownloadOperationInput
  extends FileViewerOperationExecutorBase,
    FileViewerDownloadOptions {
  source: FileViewerOriginalSourceState;
  throwOnMissingSource?: boolean;
}

export interface ExecuteFileViewerExportHtmlOperationInput
  extends FileViewerOperationExecutorBase,
    FileViewerExportHtmlOptions {
  source: HTMLElement | null | undefined;
  adapter?: FileRenderExportAdapter | null;
}

export interface ExecuteFileViewerPrintOperationInput
  extends FileViewerOperationExecutorBase,
    FileViewerPrintOptions {
  source: HTMLElement | null | undefined;
  adapter?: FileRenderExportAdapter | null;
  printAvailable?: boolean;
}

export type FileViewerFileOperationType = Extract<FileViewerOperationType, 'download' | 'export-html' | 'print'>;

export interface FileViewerOperationActionErrorContext {
  operation: FileViewerFileOperationType;
  error: unknown;
}

export type FileViewerOperationActionErrorFormatter = FileViewerErrorMessageFormatter;

export type FileViewerOperationActionErrorPrefixes = Partial<Record<FileViewerFileOperationType, string>>;

export const FILE_VIEWER_OPERATION_ACTION_ERROR_PREFIXES = {
  download: '下载失败',
  print: '打印失败',
  'export-html': '导出 HTML 失败',
} as const satisfies Record<FileViewerFileOperationType, string>;

const FILE_VIEWER_OPERATION_ACTION_ERROR_MESSAGE_KEYS = {
  download: 'error.download',
  print: 'error.print',
  'export-html': 'error.exportHtml',
} as const satisfies Record<FileViewerFileOperationType, FileViewerMessageKey>;

export interface ResolveFileViewerOperationActionErrorMessageInput {
  context: FileViewerOperationActionErrorContext;
  formatErrorMessage: FileViewerOperationActionErrorFormatter;
  prefixes?: FileViewerOperationActionErrorPrefixes;
  i18n?: FileViewerI18nInput;
}

export interface CreateFileViewerOperationActionHandlersInput extends FileViewerOperationExecutorBase {
  getBuffer?: () => ArrayBuffer | null | undefined;
  getFile?: () => File | Blob | null | undefined;
  getUrl?: () => string | null | undefined;
  getI18n?: () => FileViewerI18nInput;
  getFilename: () => string | null | undefined;
  getMimeType?: () => string | null | undefined;
  getRenderedSource: () => HTMLElement | null | undefined;
  getAdapter?: () => FileRenderExportAdapter | null | undefined;
  getWatermarkInlineStyle?: () => string | null | undefined;
  getPrintAvailable?: () => boolean | undefined;
  onError?: (context: FileViewerOperationActionErrorContext) => void;
  formatErrorMessage?: FileViewerOperationActionErrorFormatter;
  errorPrefixes?: FileViewerOperationActionErrorPrefixes;
  onErrorMessage?: (message: string, context: FileViewerOperationActionErrorContext) => void;
}

export interface FileViewerOperationActionHandlers {
  downloadOriginalFile(): Promise<boolean | undefined>;
  exportRenderedHtml(): Promise<string | undefined>;
  printRenderedHtml(options?: FileViewerPrintOptions): Promise<boolean | undefined>;
  printWithMask(options?: FileViewerPrintOptions): Promise<boolean | undefined>;
}

export interface FileViewerPublicOperationActionHandlers {
  downloadOriginalFile(): Promise<void>;
  exportRenderedHtml(): Promise<void>;
  printRenderedHtml(options?: FileViewerPrintOptions): Promise<void>;
  printWithMask(options?: FileViewerPrintOptions): Promise<void>;
}

interface BuildRenderedHtmlDocumentFromOperationInput {
  source: HTMLElement | null | undefined;
  title?: string;
  filename?: string;
  adapter?: FileRenderExportAdapter | null;
  watermarkInlineStyle?: string;
  mask?: FileViewerPrintOptions['mask'];
  i18n?: FileViewerI18nInput;
}

const getBlobFilename = (file: File | Blob | null | undefined) => {
  return file && 'name' in file && typeof file.name === 'string' ? file.name : '';
};

const getBlobMimeType = (file: File | Blob | null | undefined) => {
  return file && typeof file.type === 'string' ? file.type : '';
};

export const createFileViewerOriginalSourceState = ({
  buffer = null,
  file = null,
  url = null,
  filename = null,
  mimeType = null,
}: CreateFileViewerOriginalSourceStateInput = {}): FileViewerOriginalSourceState => {
  return {
    buffer,
    file,
    url,
    filename,
    mimeType: mimeType || getBlobMimeType(file) || null,
  };
};

export const resolveFileViewerDisplayFilename = (
  source?: Pick<NormalizedFileViewerSource, 'filename'> | null,
  fallback = DEFAULT_FILE_VIEWER_EXPORT_FILENAME
) => {
  return source?.filename || fallback;
};

export const createFileViewerOriginalSourceStateFromNormalizedSource = (
  source?: NormalizedFileViewerSource | null,
  fallbackFilename = DEFAULT_FILE_VIEWER_EXPORT_FILENAME
): FileViewerOriginalSourceState => {
  return createFileViewerOriginalSourceState({
    buffer: source?.buffer,
    file: source?.file,
    url: source?.url,
    filename: resolveFileViewerDisplayFilename(source, fallbackFilename),
    mimeType: source?.file?.type,
  });
};

export const resolveFileViewerOriginalFilename = (
  source: FileViewerOriginalSourceState,
  fallback = 'preview'
) => {
  return source.filename || getBlobFilename(source.file) || fallback;
};

export const resolveFileViewerOperationFilename = ({
  filename,
  source,
  fallback = DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
}: ResolveFileViewerOperationFilenameInput) => {
  return filename || (source ? resolveFileViewerOriginalFilename(source, '') : '') || fallback;
};

export const resolveFileViewerOperationActionErrorMessage = ({
  context,
  formatErrorMessage,
  prefixes,
  i18n,
}: ResolveFileViewerOperationActionErrorMessageInput) => {
  return formatErrorMessage(
    prefixes?.[context.operation] ??
      translateFileViewerMessage(i18n, FILE_VIEWER_OPERATION_ACTION_ERROR_MESSAGE_KEYS[context.operation]),
    context.error,
    i18n
  );
};

export const hasFileViewerOriginalSource = (source: FileViewerOriginalSourceState) => {
  return !!source.buffer || !!source.file || !!source.url;
};

const runBeforeOperation = async (
  beforeOperation: FileViewerOperationExecutorBase['beforeOperation'],
  operation: FileViewerOperationType
) => {
  if (!beforeOperation) {
    return true;
  }
  return await beforeOperation(operation);
};

const buildRenderedHtmlDocumentFromOperation = async (
  mode: 'export' | 'print',
  {
    source,
    title,
    filename,
    adapter = null,
    watermarkInlineStyle,
    mask = null,
    i18n,
  }: BuildRenderedHtmlDocumentFromOperationInput
) => {
  if (!source) {
    throw new Error(translateFileViewerMessage(i18n, 'error.noExportContent'));
  }

  const { buildFileViewerRenderedHtmlDocument } = await import('../export');
  return buildFileViewerRenderedHtmlDocument({
    source,
    mode,
    title: resolveFileViewerOperationFilename({
      filename: title || filename,
      fallback: DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
    }),
    adapter,
    watermarkInlineStyle,
    mask: mode === 'print' ? mask : null,
  });
};

const buildRenderedDomDocumentFromOperation = async ({
  source,
  title,
  filename,
  adapter = null,
  watermarkInlineStyle,
  mask = null,
  i18n,
}: BuildRenderedHtmlDocumentFromOperationInput) => {
  if (!source) {
    throw new Error(translateFileViewerMessage(i18n, 'error.noExportContent'));
  }

  const { buildFileViewerRenderedDomDocument } = await import('../export');
  return buildFileViewerRenderedDomDocument({
    source,
    mode: 'print',
    title: resolveFileViewerOperationFilename({
      filename: title || filename,
      fallback: DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
    }),
    adapter,
    watermarkInlineStyle,
    mask,
  });
};

export const replaceFileViewerPrintDocument = (
  targetDocument: Document,
  sanitizedRoot: HTMLHtmlElement,
) => {
  const importedRoot = targetDocument.importNode(sanitizedRoot, true);
  const currentRoot = targetDocument.documentElement;
  if (currentRoot) {
    currentRoot.replaceWith(importedRoot);
  } else {
    targetDocument.append(importedRoot);
  }
  if (!targetDocument.doctype) {
    targetDocument.insertBefore(
      targetDocument.implementation.createDocumentType('html', '', ''),
      importedRoot,
    );
  }
};

const FILE_VIEWER_PRINT_STANDARDS_DOCUMENT =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>';

const ensureFileViewerPrintStandardsMode = async (targetWindow: Window) => {
  if (targetWindow.document.compatMode === 'CSS1Compat') {
    return;
  }

  const targetGlobal = targetWindow as Window & typeof globalThis;
  const objectUrl = targetGlobal.URL.createObjectURL(
    new targetGlobal.Blob([FILE_VIEWER_PRINT_STANDARDS_DOCUMENT], {
      type: 'text/html;charset=utf-8',
    }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);
        if (targetWindow.document.compatMode === 'CSS1Compat') {
          resolve();
        } else {
          reject(new Error('Unable to initialize the print window in standards mode.'));
        }
      };
      const timeoutId = globalThis.setTimeout(finish, 1500);
      targetWindow.addEventListener('load', finish, { once: true });
      targetWindow.location.replace(objectUrl);
    });
  } finally {
    targetGlobal.URL.revokeObjectURL(objectUrl);
  }
};

export const executeFileViewerDownloadOperation = async ({
  source,
  filename,
  beforeOperation,
  i18n,
  throwOnMissingSource = true,
}: ExecuteFileViewerDownloadOperationInput) => {
  if (!hasFileViewerOriginalSource(source)) {
    if (throwOnMissingSource) {
      throw new Error(translateFileViewerMessage(i18n, 'error.noDownloadSource'));
    }
    return false;
  }

  if (!await runBeforeOperation(beforeOperation, 'download')) {
    return false;
  }

  const resolvedFilename = resolveFileViewerOperationFilename({
    filename,
    source,
    fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
  });

  // PDF.js transfers ArrayBuffer-backed data to its worker. After a successful
  // render the original buffer can therefore be detached (byteLength === 0),
  // while the File or URL retained by the viewer is still the complete source.
  // Preserve the existing buffer-first contract for non-empty buffers, but do
  // not turn a detached buffer into a zero-byte download.
  if (
    source.buffer &&
    (source.buffer.byteLength > 0 || (!source.file && !source.url))
  ) {
    triggerFileViewerBlobDownload(
      new Blob([source.buffer], { type: source.mimeType || source.file?.type || 'application/octet-stream' }),
      resolvedFilename
    );
    return true;
  }

  if (source.file && (source.file.size > 0 || !source.url)) {
    triggerFileViewerBlobDownload(source.file, resolvedFilename);
    return true;
  }

  if (source.url) {
    triggerFileViewerUrlDownload(source.url, resolvedFilename);
    return true;
  }

  // Empty local files are valid sources. These final fallbacks preserve their
  // intentional zero-byte downloads when no complete File or URL is available.
  if (source.file) {
    triggerFileViewerBlobDownload(source.file, resolvedFilename);
    return true;
  }

  triggerFileViewerBlobDownload(
    new Blob([source.buffer as ArrayBuffer], { type: source.mimeType || 'application/octet-stream' }),
    resolvedFilename
  );
  return true;
};

export const executeFileViewerExportHtmlOperation = async ({
  download = true,
  filename,
  beforeOperation,
  i18n,
  ...input
}: ExecuteFileViewerExportHtmlOperationInput) => {
  if (!await runBeforeOperation(beforeOperation, 'export-html')) {
    return '';
  }

  const html = await buildRenderedHtmlDocumentFromOperation('export', {
    ...input,
    filename,
    i18n,
  });

  if (download !== false) {
    const baseName = resolveFileViewerOperationFilename({
      filename: filename || input.title,
      fallback: DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
    });
    triggerFileViewerBlobDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `${baseName}.rendered.html`
    );
  }

  return html;
};

export const executeFileViewerPrintOperation = async ({
  autoPrint = true,
  beforeOperation,
  i18n,
  openWindow,
  printAvailable = true,
  printWindow,
  ...input
}: ExecuteFileViewerPrintOperationInput) => {
  if (!printAvailable) {
    throw new Error(translateFileViewerMessage(i18n, 'error.printUnavailable'));
  }

  if (!await runBeforeOperation(beforeOperation, 'print')) {
    return false;
  }

  const printableRoot = await buildRenderedDomDocumentFromOperation({ ...input, i18n });
  const targetWindow = printWindow ||
    openWindow?.() ||
    (typeof window !== 'undefined' ? window.open('', '_blank') : null);

  if (!targetWindow) {
    throw new Error(translateFileViewerMessage(i18n, 'error.printWindowBlocked'));
  }

  await ensureFileViewerPrintStandardsMode(targetWindow);
  replaceFileViewerPrintDocument(targetWindow.document, printableRoot);
  targetWindow.focus();
  await waitForFileViewerPrintWindowReady(targetWindow);

  if (autoPrint !== false) {
    targetWindow.print();
  }

  return true;
};

const handleFileViewerOperationActionError = (
  operation: FileViewerFileOperationType,
  error: unknown,
  {
    errorPrefixes,
    formatErrorMessage,
    getI18n,
    i18n,
    onError,
    onErrorMessage,
  }: Pick<
    CreateFileViewerOperationActionHandlersInput,
    'errorPrefixes' | 'formatErrorMessage' | 'i18n' | 'onError' | 'onErrorMessage'
  >
  & Pick<CreateFileViewerOperationActionHandlersInput, 'getI18n'>
) => {
  const context = { operation, error };
  onError?.(context);
  if (formatErrorMessage && onErrorMessage) {
    onErrorMessage(resolveFileViewerOperationActionErrorMessage({
      context,
      formatErrorMessage,
      prefixes: errorPrefixes,
      i18n: getI18n?.() ?? i18n,
    }), context);
  }
};

export const createFileViewerOperationActionHandlers = ({
  getBuffer,
  getFile,
  getUrl,
  getI18n,
  getFilename,
  getMimeType,
  getRenderedSource,
  getAdapter,
  getWatermarkInlineStyle,
  getPrintAvailable,
  beforeOperation,
  i18n,
  errorPrefixes,
  formatErrorMessage,
  onError,
  onErrorMessage,
}: CreateFileViewerOperationActionHandlersInput): FileViewerOperationActionHandlers => {
  const resolveI18n = () => getI18n?.() ?? i18n;

  const getOriginalSource = () => {
    const file = getFile?.() ?? null;
    return createFileViewerOriginalSourceState({
      buffer: getBuffer?.() ?? null,
      file,
      url: getUrl?.() ?? null,
      filename: getFilename(),
      mimeType: getMimeType?.() ?? getBlobMimeType(file),
    });
  };

  const getRenderedOperationInput = () => {
    const filename = getFilename() || undefined;
    return {
      source: getRenderedSource(),
      adapter: getAdapter?.() ?? null,
      title: filename,
      filename,
      watermarkInlineStyle: getWatermarkInlineStyle?.() ?? undefined,
      beforeOperation,
      i18n: resolveI18n(),
    };
  };

  return {
    async downloadOriginalFile() {
      try {
        return await executeFileViewerDownloadOperation({
          source: getOriginalSource(),
          beforeOperation,
          i18n: resolveI18n(),
          throwOnMissingSource: false,
        });
      } catch (error) {
        handleFileViewerOperationActionError('download', error, {
          errorPrefixes,
          formatErrorMessage,
          getI18n,
          i18n,
          onError,
          onErrorMessage,
        });
        return undefined;
      }
    },
    async exportRenderedHtml() {
      try {
        return await executeFileViewerExportHtmlOperation(getRenderedOperationInput());
      } catch (error) {
        handleFileViewerOperationActionError('export-html', error, {
          errorPrefixes,
          formatErrorMessage,
          getI18n,
          i18n,
          onError,
          onErrorMessage,
        });
        return undefined;
      }
    },
    async printRenderedHtml(options: FileViewerPrintOptions = {}) {
      try {
        return await executeFileViewerPrintOperation({
          ...getRenderedOperationInput(),
          ...options,
          watermarkInlineStyle: options.watermarkInlineStyle ?? getWatermarkInlineStyle?.() ?? undefined,
          printAvailable: getPrintAvailable?.() ?? true,
        });
      } catch (error) {
        handleFileViewerOperationActionError('print', error, {
          errorPrefixes,
          formatErrorMessage,
          getI18n,
          i18n,
          onError,
          onErrorMessage,
        });
        return undefined;
      }
    },
    async printWithMask(options: FileViewerPrintOptions = {}) {
      try {
        const source = getRenderedSource();
        if (!source) {
          throw new Error(translateFileViewerMessage(resolveI18n(), 'error.noExportContent'));
        }
        const { openFileViewerPrintMaskDesignerAsync } = await import('../features/printMaskLoader');
        const adapter = getAdapter?.() ?? null;
        const result = await openFileViewerPrintMaskDesignerAsync({
          root: source,
          pages: adapter?.getPrintMaskPages?.(),
          i18n: resolveI18n(),
          color: options.mask?.color,
          initialRegions: options.mask?.regions,
          initialStamps: options.mask?.stamps,
        });
        if (!result?.mask) {
          return undefined;
        }
        return await executeFileViewerPrintOperation({
          ...getRenderedOperationInput(),
          ...options,
          watermarkInlineStyle: options.watermarkInlineStyle ?? getWatermarkInlineStyle?.() ?? undefined,
          mask: result.mask,
          printAvailable: getPrintAvailable?.() ?? true,
        });
      } catch (error) {
        handleFileViewerOperationActionError('print', error, {
          errorPrefixes,
          formatErrorMessage,
          getI18n,
          i18n,
          onError,
          onErrorMessage,
        });
        return undefined;
      }
    },
  };
};

export const createFileViewerPublicOperationActionHandlers = (
  input: CreateFileViewerOperationActionHandlersInput
): FileViewerPublicOperationActionHandlers => {
  const actions = createFileViewerOperationActionHandlers(input);

  return {
    async downloadOriginalFile() {
      await actions.downloadOriginalFile();
    },
    async exportRenderedHtml() {
      await actions.exportRenderedHtml();
    },
    async printRenderedHtml(options?: FileViewerPrintOptions) {
      await actions.printRenderedHtml(options);
    },
    async printWithMask(options?: FileViewerPrintOptions) {
      await actions.printWithMask(options);
    },
  };
};
