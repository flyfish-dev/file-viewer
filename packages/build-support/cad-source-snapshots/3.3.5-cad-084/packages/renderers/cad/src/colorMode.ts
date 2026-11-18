import type { FileViewerCadColorMode, FileViewerCadOptions } from '@file-viewer/core';
import type { CanvasViewerOptions } from '@flyfish-dev/cad-viewer';

export interface CadViewerColorModeAdapter {
  setColorMode?: (mode: FileViewerCadColorMode, monochromeColor?: string) => void;
  getColorMode?: () => FileViewerCadColorMode;
  getMonochromeColor?: () => string | undefined;
  setCanvasOptions?: (options: CanvasViewerOptions) => void;
  isNativeRendererActive?: () => boolean;
}

export function normalizeFileViewerCadColorMode(value: unknown): FileViewerCadColorMode {
  return value === 'monochrome' ? 'monochrome' : 'source';
}

export function resolveFileViewerCadMonochromeColor(value: unknown, fallback = '#000000'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

export function resolveFileViewerCadCanvasOptions(
  options: FileViewerCadOptions,
  mode: FileViewerCadColorMode
): CanvasViewerOptions {
  return {
    background: mode === 'monochrome' ? '#ffffff' : '#05070d',
    foreground: mode === 'monochrome'
      ? resolveFileViewerCadMonochromeColor(options.monochromeColor)
      : '#f8fafc',
    contrastMode: 'adaptive',
    minColorContrast: 2.4,
    showPageBounds: true,
    showUnsupportedMarkers: true,
    enableSpatialIndex: true,
    maxVisibleTextLabels: 2400,
    ...options.canvasOptions,
  };
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
  monochromeColor: string,
  options?: FileViewerCadOptions
): boolean {
  if (!supportsCadViewerColorMode(viewer)) return false;
  viewer.setColorMode?.(mode, monochromeColor);
  if (options) {
    const canvasOptions = resolveFileViewerCadCanvasOptions(options, mode);
    // The native setter also forwards the canvas background to DWF. Keep an
    // explicitly configured DWF background instead of overwriting it on toggle.
    if (viewer.isNativeRendererActive?.() && options.dwfBackground) {
      canvasOptions.background = options.dwfBackground;
    }
    viewer.setCanvasOptions?.(canvasOptions);
  }
  return true;
}
