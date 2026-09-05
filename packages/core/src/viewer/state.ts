import { normalizeFileExtension } from '../source';
import { DEFAULT_RENDERER_DEFINITIONS } from '../registry/formats';
import {
  resolveFileViewerLocale,
  translateFileViewerMessage,
  type FileViewerI18nInput,
} from '../i18n/messages';
import type {
  FileViewerMessageKey,
  FileViewerRenderStateKind,
  FileViewerRendererCategory,
  FileViewerStateDescriptor,
  FileViewerStateTheme,
  RendererDefinition,
} from '../contracts/types';

export type FileViewerErrorMessageFormatter = (
  prefix: string,
  error: unknown,
  i18n?: FileViewerI18nInput
) => string;

export const FILE_VIEWER_PREVIEW_MESSAGES = Object.freeze({
  downloading: '正在下载文件资源...',
  streamingPdf: '正在建立 PDF 流式预览...',
  reading: '正在解析文件内容...',
});

export const resolveFileViewerPreviewMessages = (i18n?: FileViewerI18nInput) => Object.freeze({
  downloading: translateFileViewerMessage(i18n, 'preview.downloading'),
  streamingPdf: translateFileViewerMessage(i18n, 'preview.streamingPdf'),
  reading: translateFileViewerMessage(i18n, 'preview.reading'),
});

export const DEFAULT_FILE_VIEWER_STATE_THEME: FileViewerStateTheme = Object.freeze({
  accent: '#5f6f82',
  soft: 'rgba(95, 111, 130, 0.12)',
  badge: 'DOC',
  label: '文件内容',
  hint: '正在整理内容结构并生成预览。',
});

export const DEFAULT_FILE_VIEWER_UNSUPPORTED_DESCRIPTION =
  '支持 Office、PDF、OFD、Typst、压缩包、邮件、OLB/DRA、CAD、地理数据、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、代码/文本、图片、音视频、字体和数据资产的在线预览';

const extensionLabel = (extension: string, i18n?: FileViewerI18nInput) => {
  const normalized = normalizeFileExtension(extension);
  if (normalized) {
    return `.${normalized}`;
  }
  const locale = resolveFileViewerLocale(i18n);
  if (locale === 'zh-CN') {
    return '当前文件';
  }
  if (locale === 'ja-JP') {
    return '現在のファイル';
  }
  if (locale === 'de-DE') {
    return 'aktuelle Datei';
  }
  return 'current file';
};

const rendererPackageById: Record<string, string> = {
  'office-word-openxml': '@file-viewer/renderer-word',
  'office-word-binary': '@file-viewer/renderer-word',
  'office-presentation-binary': '@file-viewer/renderer-presentation',
  'office-presentation': '@file-viewer/renderer-presentation',
  'open-document': '@file-viewer/renderer-word',
  'spreadsheet-openxml': '@file-viewer/renderer-spreadsheet',
  pdf: '@file-viewer/renderer-pdf',
  ofd: '@file-viewer/renderer-ofd',
  typst: '@file-viewer/renderer-typst',
  archive: '@file-viewer/renderer-archive',
  chm: '@file-viewer/renderer-chm',
  email: '@file-viewer/renderer-email',
  eda: '@file-viewer/renderer-eda',
  cad: '@file-viewer/renderer-cad',
  model: '@file-viewer/renderer-3d',
  geo: '@file-viewer/renderer-geo',
  drawing: '@file-viewer/renderer-drawing',
  mindmap: '@file-viewer/renderer-mindmap',
  epub: '@file-viewer/renderer-epub',
  umd: '@file-viewer/renderer-epub',
  image: '@file-viewer/renderer-image',
  markdown: '@file-viewer/renderer-text',
  code: '@file-viewer/renderer-text',
  video: '@file-viewer/renderer-media',
  audio: '@file-viewer/renderer-media',
  'data-asset': '@file-viewer/renderer-data',
};

const officeRendererIds = new Set([
  'office-word-openxml',
  'office-word-binary',
  'office-presentation-binary',
  'office-presentation',
  'open-document',
  'spreadsheet-openxml',
  'pdf',
  'ofd',
]);

const liteRendererIds = new Set([
  'image',
  'markdown',
  'code',
  'video',
  'audio',
]);

const engineeringRendererIds = new Set([
  'typst',
  'archive',
  'eda',
  'cad',
  'model',
  'geo',
  'drawing',
  'mindmap',
  'data-asset',
]);

const resolvePresetHint = (definition: RendererDefinition) => {
  if (officeRendererIds.has(definition.id)) {
    return {
      packageName: '@file-viewer/preset-office',
      vitePreset: 'office',
      label: 'Office preset',
    };
  }
  if (engineeringRendererIds.has(definition.id)) {
    return {
      packageName: '@file-viewer/preset-engineering',
      vitePreset: 'engineering',
      label: 'Engineering preset',
    };
  }
  if (liteRendererIds.has(definition.id)) {
    return {
      packageName: '@file-viewer/preset-lite',
      vitePreset: 'lite',
      label: 'Lite preset',
    };
  }
  return {
    packageName: '@file-viewer/preset-all',
    vitePreset: 'all',
    label: 'Full preset',
  };
};

export interface FileViewerRendererInstallHint {
  extension: string;
  rendererId: string;
  rendererLabel: string;
  rendererCategory: FileViewerRendererCategory;
  rendererPackage?: string;
  presetPackage: string;
  vitePreset: string;
  presetLabel: string;
}

export const resolveFileViewerRendererInstallHint = (
  extension = ''
): FileViewerRendererInstallHint | null => {
  const normalized = normalizeFileExtension(extension);
  const definition = DEFAULT_RENDERER_DEFINITIONS.find(item =>
    item.extensions.map(normalizeFileExtension).includes(normalized)
  );
  if (!definition) {
    return null;
  }
  const preset = resolvePresetHint(definition);
  return {
    extension: normalized,
    rendererId: definition.id,
    rendererLabel: definition.label,
    rendererCategory: definition.category,
    rendererPackage: rendererPackageById[definition.id],
    presetPackage: preset.packageName,
    vitePreset: preset.vitePreset,
    presetLabel: preset.label,
  };
};

const createFileViewerStateDescriptor = ({
  state,
  extension = '',
  title,
  message,
  description,
  theme = DEFAULT_FILE_VIEWER_STATE_THEME,
  recoverable,
}: {
  state: FileViewerRenderStateKind;
  extension?: string;
  title: string;
  message: string;
  description?: string;
  theme?: FileViewerStateTheme;
  recoverable: boolean;
}): FileViewerStateDescriptor => ({
  state,
  extension: normalizeFileExtension(extension),
  title,
  message,
  description,
  theme,
  recoverable,
});

export const createFileViewerPreviewLoadingState = (
  extension = '',
  message?: string,
  theme: FileViewerStateTheme = DEFAULT_FILE_VIEWER_STATE_THEME,
  i18n?: FileViewerI18nInput
) => createFileViewerStateDescriptor({
  state: 'loading',
  extension,
  title: theme.label,
  message: message || translateFileViewerMessage(i18n, 'preview.reading'),
  description: theme.hint,
  theme,
  recoverable: false,
});

export const createFileViewerReadyState = (
  extension = '',
  theme: FileViewerStateTheme = DEFAULT_FILE_VIEWER_STATE_THEME,
  i18n?: FileViewerI18nInput
) => createFileViewerStateDescriptor({
  state: 'ready',
  extension,
  title: translateFileViewerMessage(i18n, 'state.ready.title'),
  message: translateFileViewerMessage(i18n, 'state.ready.message'),
  theme,
  recoverable: false,
});

export const createFileViewerEmptyState = (
  extension = '',
  theme: FileViewerStateTheme = DEFAULT_FILE_VIEWER_STATE_THEME,
  i18n?: FileViewerI18nInput
) => createFileViewerStateDescriptor({
  state: 'empty',
  extension,
  title: translateFileViewerMessage(i18n, 'state.empty.title'),
  message: translateFileViewerMessage(i18n, 'state.empty.message'),
  theme,
  recoverable: true,
});

export const createFileViewerUnsupportedState = (
  extension = '',
  theme: FileViewerStateTheme = DEFAULT_FILE_VIEWER_STATE_THEME,
  i18n?: FileViewerI18nInput
) => {
  const label = extensionLabel(extension, i18n);
  const installHint = resolveFileViewerRendererInstallHint(extension);
  if (installHint) {
    const locale = resolveFileViewerLocale(i18n);
    const localeRendererTip = installHint.rendererPackage
      ? locale === 'zh-CN'
        ? `；如果需要极致裁剪，也可以只安装 ${installHint.rendererPackage}`
        : locale === 'ja-JP'
          ? `；厳密に最小構成へ絞る場合は ${installHint.rendererPackage} のみをインストールすることもできます`
          : locale === 'de-DE'
            ? `; für eine strikt minimale Konfiguration installieren Sie nur ${installHint.rendererPackage}`
          : `; for a strict custom cut, install only ${installHint.rendererPackage}`
      : '';
    return createFileViewerStateDescriptor({
      state: 'unsupported',
      extension,
      title: translateFileViewerMessage(i18n, 'state.unsupported.install.title'),
      message: translateFileViewerMessage(i18n, 'state.unsupported.install.message', {
        extension: label,
        rendererLabel: installHint.rendererLabel,
      }),
      description: translateFileViewerMessage(i18n, 'state.unsupported.install.description', {
        extension: label,
        rendererLabel: installHint.rendererLabel,
        presetPackage: installHint.presetPackage,
        vitePreset: installHint.vitePreset,
        rendererTip: localeRendererTip,
      }),
      theme,
      recoverable: true,
    });
  }

  return createFileViewerStateDescriptor({
    state: 'unsupported',
    extension,
    title: translateFileViewerMessage(i18n, 'state.unsupported.title'),
    message: translateFileViewerMessage(i18n, 'state.unsupported.message', {
      extension: label,
    }),
    description: translateFileViewerMessage(i18n, 'state.unsupported.description'),
    theme,
    recoverable: true,
  });
};

const FILE_VIEWER_KNOWN_ERROR_MESSAGE_KEYS: Record<string, FileViewerMessageKey> = {
  'Blob is not available in the current execution environment.': 'error.blobUnavailable',
  'Unsupported file source input.': 'error.sourceUnsupported',
  'Failed to read file as ArrayBuffer.': 'error.fileReadArrayBuffer',
  'Failed to read file as data URL.': 'error.fileReadDataUrl',
  'Failed to read file as text.': 'error.fileReadText',
  'Unable to read image data URL.': 'error.imageDataUrlRead',
  '文件不是有效的 DOCX/OOXML 压缩包，可能下载不完整或被服务端错误内容替换，请重新上传或检查文件源。': 'word.error.invalidDocx',
  'ODF 文件缺少 content.xml': 'word.error.missingOdfContent',
  'ODF 文件缺少 content.xml。': 'word.error.missingOdfContent',
  'ODF XML 解析失败': 'word.error.odfXmlParseFailed',
  'ODF XML 解析失败。': 'word.error.odfXmlParseFailed',
  'OFD 文件中没有可渲染的文档': 'ofd.error.empty',
  'OFD 文件解析失败': 'ofd.error.parseFailed',
  'IndexedDB 不可用': 'archive.error.indexedDbUnavailable',
  'Web Worker is not supported by this browser.': 'archive.error.workerUnsupported',
};

const resolveKnownFileViewerErrorMessage = (
  message: string,
  i18n?: FileViewerI18nInput
) => {
  const key = FILE_VIEWER_KNOWN_ERROR_MESSAGE_KEYS[message.trim()];
  return key ? translateFileViewerMessage(i18n, key) : message;
};

const readFileViewerErrorProperty = (error: object, key: string) => {
  try {
    return (error as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
};

export const normalizeFileViewerErrorMessage = (
  error: unknown,
  i18n?: FileViewerI18nInput
): string => {
  if (error instanceof Error) {
    return resolveKnownFileViewerErrorMessage(error.message, i18n);
  }
  if (typeof error === 'string') {
    return resolveKnownFileViewerErrorMessage(error, i18n);
  }
  if (error === undefined || error === null) {
    return translateFileViewerMessage(i18n, 'error.unknown');
  }
  if (typeof error === 'object') {
    const message = readFileViewerErrorProperty(error, 'message');
    if (typeof message === 'string' && message.trim()) {
      return resolveKnownFileViewerErrorMessage(message, i18n);
    }

    const reason = readFileViewerErrorProperty(error, 'reason');
    if (reason !== undefined && reason !== error) {
      return normalizeFileViewerErrorMessage(reason, i18n);
    }
  }

  const fallback = String(error);
  return fallback === '[object Object]'
    ? translateFileViewerMessage(i18n, 'error.unknown')
    : fallback;
};

export const formatFileViewerErrorMessage: FileViewerErrorMessageFormatter = (prefix, error, i18n) => {
  const detail = normalizeFileViewerErrorMessage(error, i18n);
  if (!detail) {
    return prefix;
  }
  return resolveFileViewerLocale(i18n) === 'zh-CN' || resolveFileViewerLocale(i18n) === 'ja-JP'
    ? `${prefix}：${detail}`
    : `${prefix}: ${detail}`;
};

export const createFileViewerErrorState = (
  extension = '',
  error: unknown = undefined,
  theme: FileViewerStateTheme = DEFAULT_FILE_VIEWER_STATE_THEME,
  i18n?: FileViewerI18nInput
) => createFileViewerStateDescriptor({
  state: 'error',
  extension,
  title: translateFileViewerMessage(i18n, 'state.error.title'),
  message: normalizeFileViewerErrorMessage(error, i18n),
  theme,
  recoverable: true,
});
