import { registerFileViewerIfcCapability } from '@file-viewer/renderer-3d';

/**
 * Activate the separately installed IFC/BIM path in the base 3D renderer.
 *
 * The That Open stack stays behind this lazy handler so merely importing the
 * capability does not parse or initialize Components/Fragments until an IFC
 * actually needs that backend.
 */
export const enableFileViewerIfc = () => {
  registerFileViewerIfcCapability((buffer, target, type, context) =>
    import('./thatOpenBackend.js').then(({ default: renderThatOpenIfc }) =>
      renderThatOpenIfc(buffer, target, type, context)
    )
  );
};

enableFileViewerIfc();
