import type { FileViewerCadColorMode } from '@file-viewer/core';

export interface CadViewerColorModeAdapter {
  setColorMode?: (mode: FileViewerCadColorMode, monochromeColor?: string) => void;
  getColorMode?: () => FileViewerCadColorMode;
  getMonochromeColor?: () => string | undefined;
}

export function normalizeFileViewerCadColorMode(value: unknown): FileViewerCadColorMode {
  return value === 'monochrome' ? 'monochrome' : 'source';
}

export function resolveFileViewerCadMonochromeColor(value: unknown, fallback = '#000000'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

export function supportsCadViewerColorMode(value: unknown): value is CadViewerColorModeAdapter {
  return Boolean(value && typeof (value as CadViewerColorModeAdapter).setColorMode === 'function');
}

export function resolveCadViewerSourceDocument(viewer: unknown): unknown {
  const candidate = viewer as {
    getSourceDocument?: () => unknown;
    getDocument?: () => unknown;
  } | null | undefined;
  return candidate?.getSourceDocument?.() ?? candidate?.getDocument?.();
}

export function applyCadViewerColorMode(
  viewer: unknown,
  mode: FileViewerCadColorMode,
  monochromeColor: string
): boolean {
  if (!supportsCadViewerColorMode(viewer)) return false;
  viewer.setColorMode?.(mode, monochromeColor);
  return true;
}
