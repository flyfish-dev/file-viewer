import type {
  FileViewerSearchProvider,
  FileViewerViewStateProvider,
  FileViewerZoomProvider,
} from '../../../contracts/types';

export interface FileViewerSearchProviderHost extends HTMLElement {
  __flyfishViewerSearchProvider?: FileViewerSearchProvider;
}

export interface FileViewerZoomProviderHost extends HTMLElement {
  __flyfishViewerZoomProvider?: FileViewerZoomProvider;
}

export interface FileViewerViewStateProviderHost extends HTMLElement {
  __flyfishViewerViewStateProvider?: FileViewerViewStateProvider;
}

type FileViewerProviderSearchRoot = HTMLElement | ShadowRoot | null | undefined;

const searchProviderRegistry = new WeakMap<HTMLElement, FileViewerSearchProvider>();
const zoomProviderRegistry = new WeakMap<HTMLElement, FileViewerZoomProvider>();
const viewStateProviderRegistry = new WeakMap<HTMLElement, FileViewerViewStateProvider>();

const isProviderElement = (root: FileViewerProviderSearchRoot): root is HTMLElement => {
  return !!root && (root as Node).nodeType === 1;
};

const queryProviderHosts = <Host extends HTMLElement>(
  root: FileViewerProviderSearchRoot,
  selector: string
): Host[] => {
  if (!root?.querySelectorAll) {
    return [];
  }

  const hosts = Array.from(root.querySelectorAll<Host>(selector));
  if (isProviderElement(root) && root.shadowRoot) {
    hosts.push(...queryProviderHosts<Host>(root.shadowRoot, selector));
  }
  const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
  for (const element of elements) {
    if (element.shadowRoot) {
      hosts.push(...queryProviderHosts<Host>(element.shadowRoot, selector));
    }
  }
  return hosts;
};

export const registerFileViewerSearchProvider = (
  host: HTMLElement,
  provider: FileViewerSearchProvider
) => {
  searchProviderRegistry.set(host, provider);
  (host as FileViewerSearchProviderHost).__flyfishViewerSearchProvider = provider;
};

export const unregisterFileViewerSearchProvider = (host: HTMLElement | null | undefined) => {
  if (!host) {
    return;
  }
  searchProviderRegistry.delete(host);
  delete (host as FileViewerSearchProviderHost).__flyfishViewerSearchProvider;
};

export const findFileViewerSearchProvider = (root: FileViewerProviderSearchRoot) => {
  if (!root) {
    return null;
  }

  const direct = isProviderElement(root)
    ? searchProviderRegistry.get(root) || (root as FileViewerSearchProviderHost).__flyfishViewerSearchProvider
    : null;
  if (direct) {
    return direct;
  }

  const host = queryProviderHosts<FileViewerSearchProviderHost>(root, '[data-viewer-search-provider]')[0];
  return host
    ? searchProviderRegistry.get(host) || host.__flyfishViewerSearchProvider || null
    : null;
};

export const registerFileViewerZoomProvider = (
  host: HTMLElement,
  provider: FileViewerZoomProvider
) => {
  zoomProviderRegistry.set(host, provider);
  host.dataset.viewerZoomProvider = host.dataset.viewerZoomProvider || 'custom';
  (host as FileViewerZoomProviderHost).__flyfishViewerZoomProvider = provider;
};

export const unregisterFileViewerZoomProvider = (host: HTMLElement | null | undefined) => {
  if (!host) {
    return;
  }
  zoomProviderRegistry.delete(host);
  delete host.dataset.viewerZoomProvider;
  delete (host as FileViewerZoomProviderHost).__flyfishViewerZoomProvider;
};

export const findFileViewerZoomProvider = (root: FileViewerProviderSearchRoot) => {
  if (!root) {
    return null;
  }

  const direct = isProviderElement(root)
    ? zoomProviderRegistry.get(root) || (root as FileViewerZoomProviderHost).__flyfishViewerZoomProvider
    : null;
  if (direct) {
    return direct;
  }

  const host = queryProviderHosts<FileViewerZoomProviderHost>(root, '[data-viewer-zoom-provider]')[0];
  return host
    ? zoomProviderRegistry.get(host) || host.__flyfishViewerZoomProvider || null
    : null;
};

export const registerFileViewerViewStateProvider = (
  host: HTMLElement,
  provider: FileViewerViewStateProvider
) => {
  viewStateProviderRegistry.set(host, provider);
  host.dataset.viewerViewStateProvider = host.dataset.viewerViewStateProvider || 'custom';
  (host as FileViewerViewStateProviderHost).__flyfishViewerViewStateProvider = provider;
};

export const unregisterFileViewerViewStateProvider = (host: HTMLElement | null | undefined) => {
  if (!host) {
    return;
  }
  viewStateProviderRegistry.delete(host);
  delete host.dataset.viewerViewStateProvider;
  delete (host as FileViewerViewStateProviderHost).__flyfishViewerViewStateProvider;
};

export const findFileViewerViewStateProvider = (root: FileViewerProviderSearchRoot) => {
  if (!root) {
    return null;
  }

  const direct = isProviderElement(root)
    ? viewStateProviderRegistry.get(root) ||
      (root as FileViewerViewStateProviderHost).__flyfishViewerViewStateProvider
    : null;
  if (direct && (!isProviderElement(root) || root.dataset.viewerViewStateProvider !== 'generic')) {
    return direct;
  }

  const hosts = queryProviderHosts<FileViewerViewStateProviderHost>(root, '[data-viewer-view-state-provider]');
  const customHost = hosts.find(host => host.dataset.viewerViewStateProvider !== 'generic');
  const genericHost = hosts.find(host => host.dataset.viewerViewStateProvider === 'generic');
  const host = customHost || genericHost;
  if (host) {
    return viewStateProviderRegistry.get(host) || host.__flyfishViewerViewStateProvider || null;
  }
  return direct || null;
};
