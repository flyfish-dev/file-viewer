/** Distinguish an emitted asset from an untouched dependency-relative URL. */
export const isResolvedPptxWorkerLocation = (moduleUrl: URL, assetUrl: URL) => {
  // Keep the comparison URL dynamic: a bundler must only rewrite the static
  // new URL reference in worker.ts, not both sides of this comparison.
  const relativePath = ['worker', 'pptx.worker.js'].join('/');
  const dependencyRelativeUrl = new URL(relativePath, moduleUrl);
  return assetUrl.href !== dependencyRelativeUrl.href || /\/dist\/worker\.[cm]?js$/.test(moduleUrl.pathname);
};
