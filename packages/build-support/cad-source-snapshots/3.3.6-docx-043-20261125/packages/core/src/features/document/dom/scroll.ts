export const DEFAULT_FILE_VIEWER_SCROLL_CONTAINER_SELECTOR = '[data-viewer-scroll-container], .pdf-wrapper';
export const DEFAULT_FILE_VIEWER_SCROLL_CONTAINER_CANDIDATE_SELECTOR = 'div, section, article, pre';
export const DEFAULT_FILE_VIEWER_SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll', 'overlay'] as const;

export interface ResolveFileViewerScrollContainerOptions {
  preferredSelector?: string;
  candidateSelector?: string;
  overflowValues?: readonly string[];
  minScrollRange?: number;
}

export const getFileViewerScrollableRange = (element: HTMLElement) => {
  return Math.max(0, element.scrollHeight - element.clientHeight);
};

export const isFileViewerScrollableElement = (
  element: HTMLElement,
  options: ResolveFileViewerScrollContainerOptions = {}
) => {
  const minScrollRange = options.minScrollRange ?? 2;
  if (getFileViewerScrollableRange(element) <= minScrollRange) {
    return false;
  }

  const ownerView = element.ownerDocument?.defaultView;
  const view = ownerView?.getComputedStyle
    ? ownerView
    : (typeof window !== 'undefined' ? window : undefined);
  if (!view?.getComputedStyle) {
    return false;
  }

  const style = view.getComputedStyle(element);
  const overflowY = style.overflowY || style.overflow;
  const overflowValues = options.overflowValues || DEFAULT_FILE_VIEWER_SCROLLABLE_OVERFLOW_VALUES;
  return overflowValues.includes(overflowY);
};

export const resolveFileViewerScrollContainer = (
  root: HTMLElement | null | undefined,
  options: ResolveFileViewerScrollContainerOptions = {}
) => {
  if (!root) {
    return null;
  }

  const preferredSelector = options.preferredSelector || DEFAULT_FILE_VIEWER_SCROLL_CONTAINER_SELECTOR;
  const candidateSelector = options.candidateSelector || DEFAULT_FILE_VIEWER_SCROLL_CONTAINER_CANDIDATE_SELECTOR;
  const preferred = root.querySelector<HTMLElement>(preferredSelector);
  if (preferred && isFileViewerScrollableElement(preferred, options)) {
    return preferred;
  }
  if (isFileViewerScrollableElement(root, options)) {
    return root;
  }

  const scrollableChildren = Array.from(root.querySelectorAll<HTMLElement>(candidateSelector))
    .filter(element => isFileViewerScrollableElement(element, options))
    .sort((a, b) => getFileViewerScrollableRange(b) - getFileViewerScrollableRange(a));
  return scrollableChildren[0] || preferred || root;
};
