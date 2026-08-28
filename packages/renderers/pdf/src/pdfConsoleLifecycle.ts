const readErrorLikeMessage = (value: unknown) => {
  if (value instanceof Error) {
    return value.message;
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return String((value as { message?: unknown }).message || '');
  }
  return String(value || '');
};

const isPdfJsDestroyLifecycleMessage = (message: string) =>
  /^Unable to get page \d+ to initialize viewer$/.test(message) ||
  message === 'Unable to get page for page view' ||
  message === 'renderView:';

/**
 * PDF.js can finish an already queued page task after File Viewer has started
 * tearing the document down. A queued `forceRendering` callback can also run
 * after PDFViewer has reset its old page views and report that the old
 * `pdfPage` is no longer loaded. Only silence those exact message/reason pairs
 * inside File Viewer's scoped teardown window. All parsing, rendering, worker
 * and network errors remain visible.
 */
export const isExpectedPdfJsDestroyConsoleError = (args: unknown[]) => {
  const [message, reason] = args;
  if (typeof message !== 'string' || !isPdfJsDestroyLifecycleMessage(message)) {
    return false;
  }
  const reasonMessage = readErrorLikeMessage(reason);
  return reasonMessage === 'Transport destroyed' ||
    (message === 'renderView:' && reasonMessage === 'pdfPage is not loaded');
};
