import type {
  FileViewerArchiveOptions,
  FileViewerCadOptions,
  FileViewerOptions,
  FileViewerResolvedThemeMode,
  FileViewerThemeMode,
  FileViewerToolbarOptions,
  FileViewerUiDensity,
} from '../contracts/types';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type FileViewerSerializableToolbarOptions = Omit<
  FileViewerToolbarOptions,
  'beforeOperation' | 'beforeDownload' | 'beforePrint' | 'beforeExportHtml'
>;

export type FileViewerSerializableCadOptions = Omit<FileViewerCadOptions, 'workerUrl'> & {
  workerUrl?: string;
};

export interface FileViewerSerializableOptions extends Omit<
  FileViewerOptions,
  'toolbar' | 'cad' | 'hooks' | 'beforeOperation' | 'preset' | 'presets' | 'renderers' | 'rendererMode'
> {
  toolbar?: boolean | FileViewerSerializableToolbarOptions;
  archive?: FileViewerArchiveOptions;
  cad?: FileViewerSerializableCadOptions;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const isUrlLike = (value: unknown): value is URL => {
  return typeof URL !== 'undefined' && value instanceof URL;
};

const sanitizeJsonValue = (value: unknown): JsonValue | undefined => {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isUrlLike(value)) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeJsonValue(item))
      .filter((item): item is JsonValue => item !== undefined);
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const outputEntries: Array<[string, JsonValue]> = [];
  Object.entries(value).forEach(([key, nextValue]) => {
    if (UNSAFE_JSON_KEYS.has(key)) {
      return;
    }
    const sanitized = sanitizeJsonValue(nextValue);
    if (sanitized !== undefined) {
      outputEntries.push([key, sanitized]);
    }
  });

  return outputEntries.length
    ? Object.fromEntries(outputEntries) as Record<string, JsonValue>
    : undefined;
};

const stripExecutionOnlyOptions = (value: Record<string, unknown>) => {
  const {
    beforeOperation: _beforeOperation,
    hooks: _hooks,
    preset: _preset,
    presets: _presets,
    renderers: _renderers,
    rendererMode: _rendererMode,
    ...rest
  } = value;

  if (isRecord(rest.toolbar)) {
    const {
      beforeOperation: _toolbarBeforeOperation,
      beforeDownload: _beforeDownload,
      beforePrint: _beforePrint,
      beforeExportHtml: _beforeExportHtml,
      ...toolbar
    } = rest.toolbar;
    rest.toolbar = toolbar;
  }

  return rest;
};

export const normalizeFileViewerTheme = (
  theme: FileViewerThemeMode | undefined
): FileViewerThemeMode => {
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
};

const readSystemDarkMode = () => {
  return typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const resolveFileViewerColorScheme = (
  theme: FileViewerThemeMode | undefined,
  systemDark = readSystemDarkMode()
): FileViewerResolvedThemeMode => {
  const normalizedTheme = normalizeFileViewerTheme(theme);
  return normalizedTheme === 'system'
    ? (systemDark ? 'dark' : 'light')
    : normalizedTheme;
};

export const toggleFileViewerColorScheme = (
  theme: FileViewerThemeMode | undefined,
  systemDark = readSystemDarkMode()
): FileViewerResolvedThemeMode => {
  return resolveFileViewerColorScheme(theme, systemDark) === 'dark' ? 'light' : 'dark';
};

export const normalizeFileViewerUiDensity = (
  density: FileViewerUiDensity | undefined
): FileViewerUiDensity => {
  return density === 'compact' ? 'compact' : 'comfortable';
};

export const resolveFileViewerUiDensity = (
  options?: Pick<FileViewerOptions, 'ui'> | null
): FileViewerUiDensity => normalizeFileViewerUiDensity(options?.ui?.density);

export const sanitizeFileViewerOptions = (
  options?: FileViewerOptions | FileViewerSerializableOptions | null
): FileViewerSerializableOptions | undefined => {
  if (!isRecord(options)) {
    return undefined;
  }

  const sanitized = sanitizeJsonValue(stripExecutionOnlyOptions(options));
  if (!isRecord(sanitized)) {
    return undefined;
  }

  return sanitized as unknown as FileViewerSerializableOptions;
};

export const serializeFileViewerOptions = (
  options?: FileViewerOptions | FileViewerSerializableOptions | null
) => {
  const sanitized = sanitizeFileViewerOptions(options);
  return sanitized ? JSON.stringify(sanitized) : undefined;
};

export const parseFileViewerOptions = (value: unknown): FileViewerSerializableOptions | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    try {
      return sanitizeFileViewerOptions(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  return sanitizeFileViewerOptions(value as FileViewerOptions);
};

export const setFileViewerOptionsSearchParam = (
  searchParams: URLSearchParams,
  options?: FileViewerOptions | FileViewerSerializableOptions | null,
  key = 'options'
) => {
  const serialized = serializeFileViewerOptions(options);
  if (!serialized) {
    searchParams.delete(key);
    return;
  }
  searchParams.set(key, serialized);
};

export const getFileViewerOptionsSearchParam = (
  searchParams: URLSearchParams,
  key = 'options'
) => {
  return parseFileViewerOptions(searchParams.get(key));
};
