export { PptxViewer } from './viewer';
export { PptxPresentation } from './presentation';
export type { PptxPresentationLabels, PptxPresentationState } from './presentation';
export { createPptxWorker } from './worker';
export {
  RECOMMENDED_ZIP_LIMITS,
  createDefaultPptxOptions,
  resolvePptxEngineOptions,
} from './options';
export type {
  NativePptxEngineOptions,
  PptxDiagnosticError,
  PptxDiagnosticErrorCode,
  PptxFitMode,
  PptxListOptions,
  PptxSlideSize,
  PptxViewerOptions,
  PptxWorkerFactoryOptions,
  PptxWorkerMessage,
  PptxZipLimits,
} from './types';
