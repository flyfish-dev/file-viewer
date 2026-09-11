import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';
import {
  DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES,
  type FileViewerIfcOptions,
} from './ifcTypes.js';
import {
  getFileViewerIfcCapabilityHandler,
  isFileViewerIfcCapabilityEnabled,
} from './optionalCapabilities.js';

export {
  DEFAULT_FILE_VIEWER_IFC_API_PATH,
  DEFAULT_FILE_VIEWER_IFC_FRAGMENTS_WORKER_PATH,
  DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES,
  DEFAULT_FILE_VIEWER_IFC_MT_WASM_PATH,
  DEFAULT_FILE_VIEWER_IFC_WASM_PATH,
} from './ifcTypes.js';
export type {
  FileViewerIfcBackend,
  FileViewerIfcConfigureContext,
  FileViewerIfcElementInfo,
  FileViewerIfcOpaqueConfig,
  FileViewerIfcOptions,
  FileViewerIfcPerformanceOptions,
  FileViewerIfcProperty,
  FileViewerIfcPropertySet,
  FileViewerIfcThatOpenOptions,
  FileViewerIfcThatOpenRuntimeContext,
} from './ifcTypes.js';
export {
  isFileViewerIfcCapabilityEnabled,
  registerFileViewerIfcCapability,
} from './optionalCapabilities.js';
export type { FileViewerIfcCapabilityHandler } from './optionalCapabilities.js';

declare module '@file-viewer/core' {
  interface FileViewerOptions {
    /** Browser-native IFC/BIM preview options, active when @file-viewer/capability-ifc is installed. */
    ifc?: FileViewerIfcOptions;
  }
}

const modelDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'model'
) as RendererDefinition | undefined;

if (!modelDefinition) {
  throw new Error('@file-viewer/renderer-3d could not locate the core 3D model renderer definition.');
}

export const modelRendererDefinition = modelDefinition;

const normalizeModelType = (type?: string) => (type || '').replace(/^\./, '').toLowerCase();

const positiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const renderFileViewerModel: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target,
  type,
  context
) => {
  if (normalizeModelType(type) === 'ifc') {
    if (!isFileViewerIfcCapabilityEnabled()) {
      return Promise.reject(new Error(
        'IFC support is opt-in. Install and import @file-viewer/capability-ifc, then publish the @file-viewer/assets-ifc runtime assets (or use `npx file-viewer-cli config add ifc --write`).'
      ));
    }

    const options = context?.options?.ifc as FileViewerIfcOptions | undefined;
    const performance = options?.performance;
    const maxSourceBytes = positiveNumber(performance?.maxSourceBytes, Number.POSITIVE_INFINITY);
    if (buffer.byteLength > maxSourceBytes) {
      return Promise.reject(new Error(
        `IFC source is ${buffer.byteLength} bytes, above the configured ifc.performance.maxSourceBytes limit of ${Math.floor(maxSourceBytes)} bytes.`
      ));
    }

    const threshold = positiveNumber(
      performance?.largeModelThresholdBytes,
      DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES
    );
    const largeModel = buffer.byteLength >= threshold;
    const requestedBackend = options?.backend || 'auto';
    const specialist = getFileViewerIfcCapabilityHandler();
    const preferFragments = performance?.preferFragmentsForLargeModels !== false;
    const wantsThatOpen = requestedBackend === 'thatopen'
      || (requestedBackend === 'auto' && (
        options?.thatOpen !== undefined
        || (largeModel && preferFragments)
      ));

    if (requestedBackend === 'thatopen' && !specialist) {
      return Promise.reject(new Error(
        'IFC backend "thatopen" was requested, but the installed IFC capability did not register its That Open Components / Fragments backend.'
      ));
    }
    if (wantsThatOpen && specialist) {
      return specialist(buffer, target, type, context);
    }

    return import('./ifc.js').then(({ default: renderIfc }) => renderIfc(buffer, target, type, context));
  }
  return import('./model.js').then(({ default: renderModel }) => renderModel(buffer, target, type, context));
};

export const modelRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-3d',
  label: 'Flyfish File Viewer 3D model renderer',
  definitions: [modelRendererDefinition],
  handlers: [{
    rendererId: modelRendererDefinition.id,
    handler: renderFileViewerModel,
  }],
};

export default modelRenderer;
