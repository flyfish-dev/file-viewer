import { ARCHIVE_EXTENSIONS, IMAGE_EXTENSIONS, MODEL_EXTENSIONS, TEXT_EXTENSIONS } from './formats';
import { normalizeFileExtension } from '../source';
import type {
  FileRenderExportAdapter,
  FileViewerOperationAvailability,
  FileViewerZoomState,
  RendererDefinition,
  RendererSession,
} from '../contracts/types';

export const DEFAULT_OPERATION_AVAILABILITY: FileViewerOperationAvailability = Object.freeze({
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  zoomIn: false,
  zoomOut: false,
  zoomReset: false,
});

const resolveBooleanCapability = (value: boolean | 'adapter' | 'provider' | undefined) => {
  return value === true || value === 'adapter' || value === 'provider';
};

export const getRendererAvailability = (
  renderer: RendererDefinition | undefined,
  session?: RendererSession | null
): FileViewerOperationAvailability => {
  if (!renderer) {
    return { ...DEFAULT_OPERATION_AVAILABILITY };
  }

  const base: FileViewerOperationAvailability = {
    download: renderer.capabilities?.download !== false,
    print: resolveBooleanCapability(renderer.capabilities?.print),
    exportHtml: resolveBooleanCapability(renderer.capabilities?.exportHtml),
    zoom: resolveBooleanCapability(renderer.capabilities?.zoom),
    zoomIn: resolveBooleanCapability(renderer.capabilities?.zoom),
    zoomOut: resolveBooleanCapability(renderer.capabilities?.zoom),
    zoomReset: resolveBooleanCapability(renderer.capabilities?.zoom),
  };

  return {
    ...base,
    ...session?.getAvailability?.(),
  };
};

export const applyFileViewerZoomAvailability = (
  availability: FileViewerOperationAvailability,
  zoomState: FileViewerZoomState
): FileViewerOperationAvailability => {
  const zoom = availability.zoom && (zoomState.canZoomIn || zoomState.canZoomOut || zoomState.canReset);
  return {
    ...availability,
    zoom,
    zoomIn: zoom && zoomState.canZoomIn,
    zoomOut: zoom && zoomState.canZoomOut,
    zoomReset: zoom && zoomState.canReset,
  };
};

export const createUnsupportedAvailability = (extension: string): FileViewerOperationAvailability => ({
  ...DEFAULT_OPERATION_AVAILABILITY,
  download: normalizeFileExtension(extension).length > 0,
});

/**
 * 这些格式只有专属适配器准备好后才展示打印。
 *
 * 它们的在线预览常依赖分页引擎、虚拟渲染或 Worker 生命周期，直接克隆
 * DOM 很容易只得到当前页或当前视口。
 */
export const ADAPTER_PRINT_REQUIRED_EXTENSIONS = [
  'docx', 'docm', 'dotx', 'dotm', 'doc', 'dot', 'ppt', 'pdf', 'typ', 'typst',
] as const;

/**
 * 这些格式的预览结果是完整 DOM / SVG / Canvas 截图，解除滚动容器裁切后
 * 可以稳定进入浏览器打印流程。
 */
export const DOM_PRINTABLE_EXTENSIONS = [
  'pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'ofd', 'dxf', 'dwg', 'dwf', 'dwfx', 'xps',
  'excalidraw', 'drawio', 'dio', 'mermaid', 'mmd', 'plantuml', 'puml', 'umd', 'md', 'markdown',
  'olb', 'dra',
  ...TEXT_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
] as const;

/**
 * 这些格式默认不展示打印按钮，避免导出半截内容。
 */
export const NON_PRINTABLE_EXTENSIONS = [
  'xlsx', 'xltx', 'xlsm', 'xlsb', 'xls', 'xlt', 'xltm', 'csv', 'tsv', 'ods', 'fods', 'numbers',
  ...ARCHIVE_EXTENSIONS,
  'eml', 'msg', 'epub', 'mp4',
  'mp3', 'mpeg', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba',
  ...MODEL_EXTENSIONS,
] as const;

const hasExtension = (items: readonly string[], extension: string) => {
  return items.includes(normalizeFileExtension(extension));
};

export const needsDedicatedPrintAdapter = (extension: string) => {
  return hasExtension(ADAPTER_PRINT_REQUIRED_EXTENSIONS, extension);
};

export const isDomPrintableExtension = (extension: string) => {
  return hasExtension(DOM_PRINTABLE_EXTENSIONS, extension);
};

export const isKnownNonPrintableExtension = (extension: string) => {
  return hasExtension(NON_PRINTABLE_EXTENSIONS, extension);
};

export const resolvePrintAvailability = (
  extension: string,
  adapter: FileRenderExportAdapter | null,
  renderedReady: boolean
) => {
  if (!renderedReady) {
    return false;
  }

  if (adapter) {
    if (adapter.print === false) {
      return false;
    }
    if (adapter.toHtml) {
      return true;
    }
  }

  if (needsDedicatedPrintAdapter(extension) || isKnownNonPrintableExtension(extension)) {
    return false;
  }

  return isDomPrintableExtension(extension);
};
