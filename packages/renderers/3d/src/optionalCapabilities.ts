import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
} from '@file-viewer/core';

export type FileViewerIfcCapabilityHandler = FileRenderHandler<
  FileViewerRenderedInstance,
  HTMLDivElement
>;

let ifcCapabilityEnabled = false;
let ifcCapabilityHandler: FileViewerIfcCapabilityHandler | null = null;

/**
 * Enable/disable the separately installed IFC/BIM capability and optionally
 * register its specialist backend handler.
 */
export const registerFileViewerIfcCapability = (
  enabledOrHandler: boolean | FileViewerIfcCapabilityHandler = true
) => {
  if (typeof enabledOrHandler === 'function') {
    ifcCapabilityEnabled = true;
    ifcCapabilityHandler = enabledOrHandler;
    return;
  }
  ifcCapabilityEnabled = enabledOrHandler;
  if (!enabledOrHandler) ifcCapabilityHandler = null;
};

/** Internal/runtime probe used before the lazy IFC adapter is imported. */
export const isFileViewerIfcCapabilityEnabled = () => ifcCapabilityEnabled;

/** Internal specialist backend registered by @file-viewer/capability-ifc. */
export const getFileViewerIfcCapabilityHandler = () => ifcCapabilityHandler;
