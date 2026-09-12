import type {
  FileRenderContext,
  FileViewerRendererPlugin,
  FileRenderHandler,
  RendererDefinition,
} from "@file-viewer/core";
import type * as OBC from "@thatopen/components";
import type * as FRAGS from "@thatopen/fragments";

export interface IfcSelection {
  localId: number;
  name: string;
  globalId: string;
  entityType: string;
  attributes: FRAGS.ItemData;
}
export interface IfcExtensionContext {
  components: OBC.Components;
  fragments: FRAGS.FragmentsModels;
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;
  model: FRAGS.FragmentsModel;
  signal: AbortSignal;
  select: (localId: number | null) => Promise<IfcSelection | null>;
}
export interface IfcViewerOptions {
  /** Directory installed by file-viewer-ifc-assets. Defaults to /file-viewer/vendor/ifc/. */
  assetBaseUrl?: string | URL;
  fitToModel?: boolean;
  enableSelection?: boolean;
  showProperties?: boolean;
  /** Whole-input limit, before a transferable copy is made. Default: 512 MiB. */
  maxFileBytes?: number;
  /** Bound stalled import/worker setup. Default: 120 seconds. */
  loadTimeoutMs?: number;
  onSelectionChange?: (selection: IfcSelection | null) => void;
  /** Advanced, opt-in access. Return cleanup for resources created by the hook. */
  configure?: (
    context: IfcExtensionContext,
  ) => void | (() => void) | Promise<void | (() => void)>;
}
export interface IfcViewerInstance {
  $el: HTMLElement;
  unmount(): Promise<void>;
  fitToModel(): Promise<void>;
  select(localId: number | null): Promise<IfcSelection | null>;
}
export const ifcRendererDefinition: RendererDefinition = {
  id: "ifc",
  label: "IFC BIM",
  category: "model",
  extensions: [],
  packageName: "@file-viewer/renderer-3d",
  supportLevel: "structured",
  status: "experimental",
  enhancesRendererId: "model",
  enhancesExtensions: ["ifc"],
};
export function createIfcRenderer(
  options: IfcViewerOptions = {},
): FileViewerRendererPlugin<
  FileRenderHandler<IfcViewerInstance, HTMLDivElement>
> {
  return {
    id: "file-viewer-renderer-ifc",
    label: "Flyfish optional IFC viewer",
    definitions: [ifcRendererDefinition],
    handlers: [
      {
        rendererId: "ifc",
        handler: (buffer, target, _type, context) =>
          renderFileViewerIfc(buffer, target, context, options),
      },
    ],
  };
}
export async function renderFileViewerIfc(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext,
  options: IfcViewerOptions = {},
): Promise<IfcViewerInstance> {
  // Optional engines never enter the normal model/Office entry or initial bundle.
  const { renderIfc } = await import("./ifcRuntime.js");
  return renderIfc(buffer, target, context, options);
}
export const ifcRenderer = createIfcRenderer();
export default ifcRenderer;
