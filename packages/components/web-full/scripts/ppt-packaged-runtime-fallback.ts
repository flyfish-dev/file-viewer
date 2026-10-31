/**
 * Build-only fallback for static bundlers. Packaged Demo/CDN distributions
 * always provide presentation.pptModuleUrl, which loads the authoritative
 * vendor/ppt runtime tree. Keeping this branch tiny prevents Vite from also
 * emitting a second copy of the standalone parser and its Worker.
 */
export const createPptViewer = async (): Promise<never> => {
  throw new Error('Packaged PPT runtime URL was not initialized.');
};
