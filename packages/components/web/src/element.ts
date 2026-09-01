import {
  fileViewerCoreRendererRegistry,
} from '@file-viewer/core';
import { createFileViewerCustomEvent } from './custom-event.js';
import {
  mountViewer as mountCoreViewer,
  type FileRef,
  type ViewerController,
  type ViewerControllerHandle,
  type ViewerCoreOptions,
  type ViewerEvent,
  type ViewerEventHandler,
  type ViewerFitMode,
  type ViewerFitOptions,
  type ViewerMountOptions,
  type ViewerOptions,
  type ViewerState,
  type ViewerStateListener,
  type ViewerToolbarPosition,
  type ViewerUiDensity,
} from './controller.js';
import type { FileViewerPrintOptions } from '@file-viewer/core';

export const FILE_VIEWER_ELEMENT_TAG = 'flyfish-file-viewer';

export type FileViewerElementEventName =
  | 'viewer-ready'
  | 'viewer-event'
  | 'viewer-state-change'
  | 'viewer-error';

export interface FileViewerElementReadyDetail {
  controller: ViewerController;
}

export interface FileViewerElementStateChangeDetail {
  state: ViewerState;
  event?: ViewerEvent;
}

export interface FileViewerElementErrorDetail {
  error: unknown;
}

export interface FileViewerElementSource extends ViewerMountOptions {
  coreOptions?: ViewerCoreOptions;
}

const ElementBase = (
  typeof HTMLElement === 'undefined'
    ? class {}
    : HTMLElement
) as typeof HTMLElement;

const observedAttributes = [
  'src',
  'url',
  'filename',
  'name',
  'type',
  'size',
  'locale',
  'theme',
  'toolbar',
  'toolbar-position',
  'watermark',
  'search',
  'fit',
  'density',
  'style-isolation',
  'options',
] as const;

type ObservedAttributeName = typeof observedAttributes[number];

const parseBooleanLike = (value: string | null): boolean | undefined => {
  if (value === null) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized || ['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
};

const parseNumberLike = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const parseJsonObject = <Value>(value: string | null): Value | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as Value;
  } catch (error) {
    console.warn('[file-viewer-web] Failed to parse JSON attribute.', error);
    return undefined;
  }
};

const mergeViewerOptions = (
  ...optionsList: Array<ViewerOptions | undefined>
): ViewerOptions | undefined => {
  const validOptions = optionsList.filter(Boolean) as ViewerOptions[];
  if (!validOptions.length) {
    return undefined;
  }
  return Object.assign({}, ...validOptions);
};

const mergeMountOptions = (
  current: ViewerMountOptions,
  next: ViewerMountOptions
): ViewerMountOptions => ({
  ...current,
  ...next,
  options: next.options === undefined
    ? current.options
    : mergeViewerOptions(current.options, next.options),
});

const callUnique = <Argument>(
  callbacks: Array<((argument: Argument) => void) | undefined>,
  argument: Argument
) => {
  for (const callback of new Set(callbacks.filter(Boolean))) {
    callback?.(argument);
  }
};

const toKebabEventName = (event: ViewerEvent) => `viewer-${event.type}`;

const addPart = (element: HTMLElement, ...parts: string[]) => {
  const partList = element.part as DOMTokenList | undefined;
  if (partList?.add) {
    partList.add(...parts);
    return;
  }
  const nextParts = new Set([
    ...(element.getAttribute('part') || '').split(/\s+/).filter(Boolean),
    ...parts,
  ]);
  element.setAttribute('part', [...nextParts].join(' '));
};

export class FileViewerElement extends ElementBase implements ViewerControllerHandle {
  static get observedAttributes(): ObservedAttributeName[] {
    return [...observedAttributes];
  }

  private mountNode: HTMLDivElement | null = null;
  private controller: ViewerController | null = null;
  private pendingUpdate = false;
  private mountOptions: ViewerMountOptions = {};
  private internalCoreOptions: ViewerCoreOptions = {};

  get src(): string | undefined {
    return this.mountOptions.url || this.getAttribute('src') || this.getAttribute('url') || undefined;
  }

  set src(value: string | undefined) {
    this.setMountOptions({ url: value || undefined });
  }

  get url(): string | undefined {
    return this.src;
  }

  set url(value: string | undefined) {
    this.setMountOptions({ url: value || undefined });
  }

  get file(): FileRef | undefined {
    return this.mountOptions.file;
  }

  set file(value: FileRef | undefined) {
    this.setMountOptions({ file: value });
  }

  get buffer(): ArrayBuffer | undefined {
    return this.mountOptions.buffer;
  }

  set buffer(value: ArrayBuffer | undefined) {
    this.setMountOptions({ buffer: value });
  }

  get name(): string | undefined {
    return this.mountOptions.name || this.getAttribute('name') || undefined;
  }

  set name(value: string | undefined) {
    this.setMountOptions({ name: value || undefined });
  }

  get filename(): string | undefined {
    return this.mountOptions.filename || this.getAttribute('filename') || this.name;
  }

  set filename(value: string | undefined) {
    this.setMountOptions({ filename: value || undefined });
  }

  get type(): string | undefined {
    return this.mountOptions.type || this.getAttribute('type') || undefined;
  }

  set type(value: string | undefined) {
    this.setMountOptions({ type: value || undefined });
  }

  get size(): number | undefined {
    return this.mountOptions.size ?? parseNumberLike(this.getAttribute('size'));
  }

  set size(value: number | undefined) {
    this.setMountOptions({ size: value });
  }

  get options(): ViewerOptions | undefined {
    return this.mountOptions.options;
  }

  set options(value: ViewerOptions | undefined) {
    this.setMountOptions({ options: value });
  }

  get locale(): ViewerOptions['locale'] | undefined {
    return this.mountOptions.options?.locale || this.getAttribute('locale') as ViewerOptions['locale'] | null || undefined;
  }

  set locale(value: ViewerOptions['locale'] | undefined) {
    this.setMountOptions({
      options: {
        ...(this.mountOptions.options || {}),
        locale: value,
      },
    });
  }

  get fit(): ViewerOptions['fit'] | undefined {
    return this.mountOptions.options?.fit ||
      (this.getAttribute('fit') as ViewerFitMode | null) ||
      undefined;
  }

  set fit(value: ViewerOptions['fit'] | undefined) {
    this.setMountOptions({
      options: {
        ...(this.mountOptions.options || {}),
        fit: value,
      },
    });
  }

  get styleIsolation(): ViewerOptions['styleIsolation'] | undefined {
    return this.mountOptions.options?.styleIsolation ||
      (this.getAttribute('style-isolation') as ViewerOptions['styleIsolation'] | null) ||
      undefined;
  }

  set styleIsolation(value: ViewerOptions['styleIsolation'] | undefined) {
    this.setMountOptions({
      options: {
        ...(this.mountOptions.options || {}),
        styleIsolation: value,
      },
    });
  }

  get density(): ViewerUiDensity | undefined {
    return this.mountOptions.options?.ui?.density ||
      (this.getAttribute('density') as ViewerUiDensity | null) ||
      undefined;
  }

  set density(value: ViewerUiDensity | undefined) {
    this.setMountOptions({
      options: {
        ...(this.mountOptions.options || {}),
        ui: {
          ...(this.mountOptions.options?.ui || {}),
          density: value,
        },
      },
    });
  }

  get source(): FileViewerElementSource {
    return {
      ...this.mountOptions,
      coreOptions: this.internalCoreOptions,
    };
  }

  set source(value: FileViewerElementSource | undefined) {
    const { coreOptions, ...mountOptions } = value || {};
    this.mountOptions = mountOptions;
    this.internalCoreOptions = coreOptions || {};
    this.remountOrUpdate();
  }

  get coreOptions(): ViewerCoreOptions {
    return this.internalCoreOptions;
  }

  set coreOptions(value: ViewerCoreOptions | undefined) {
    this.internalCoreOptions = value || {};
    this.remount();
  }

  connectedCallback(): void {
    this.mount();
  }

  disconnectedCallback(): void {
    this.destroy();
  }

  attributeChangedCallback(
    name: ObservedAttributeName,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue !== newValue) {
      this.scheduleUpdate();
    }
  }

  async load(options: ViewerMountOptions): Promise<void> {
    this.mountOptions = mergeMountOptions(this.mountOptions, options);
    if (!this.controller && this.isConnected) {
      this.mount();
    }
    await this.controller?.load(this.createControllerMountOptions());
  }

  async update(options: ViewerMountOptions = {}): Promise<void> {
    this.mountOptions = mergeMountOptions(this.mountOptions, options);
    if (!this.controller && this.isConnected) {
      this.mount();
      return;
    }
    await this.controller?.update(this.createControllerMountOptions());
  }

  reload(): Promise<void> {
    return this.controller?.reload() ?? Promise.resolve();
  }

  destroy(): void {
    this.controller?.destroy();
    this.controller = null;
    if (this.mountNode) {
      this.mountNode.innerHTML = '';
    }
    this.pendingUpdate = false;
  }

  getController(): ViewerController | null {
    return this.controller;
  }

  getApi(): ReturnType<ViewerControllerHandle['getApi']> {
    return this.controller?.getApi() ?? null;
  }

  downloadOriginalFile(): Promise<void> {
    return this.controller?.downloadOriginalFile() ?? Promise.resolve();
  }

  printRenderedHtml(options?: FileViewerPrintOptions): Promise<void> {
    return this.controller?.printRenderedHtml(options) ?? Promise.resolve();
  }

  printWithMask(options?: FileViewerPrintOptions): Promise<void> {
    return this.controller?.printWithMask(options) ?? Promise.resolve();
  }

  exportRenderedHtml(): Promise<void> {
    return this.controller?.exportRenderedHtml() ?? Promise.resolve();
  }

  zoomIn(): ReturnType<ViewerControllerHandle['zoomIn']> {
    return this.controller?.zoomIn() ?? Promise.resolve(null);
  }

  zoomOut(): ReturnType<ViewerControllerHandle['zoomOut']> {
    return this.controller?.zoomOut() ?? Promise.resolve(null);
  }

  resetZoom(): ReturnType<ViewerControllerHandle['resetZoom']> {
    return this.controller?.resetZoom() ?? Promise.resolve(null);
  }

  fitToView(fit?: ViewerFitMode | ViewerFitOptions): ReturnType<ViewerControllerHandle['fitToView']> {
    return this.controller?.fitToView(fit) ?? Promise.resolve(null);
  }

  getViewState(): ReturnType<ViewerControllerHandle['getViewState']> {
    return this.controller?.getViewState() ?? null;
  }

  applyViewState(
    state: Parameters<ViewerControllerHandle['applyViewState']>[0],
    options?: Parameters<ViewerControllerHandle['applyViewState']>[1]
  ): ReturnType<ViewerControllerHandle['applyViewState']> {
    return this.controller?.applyViewState(state, options) ?? Promise.resolve(null);
  }

  searchDocument(query: string): ReturnType<ViewerControllerHandle['searchDocument']> {
    return this.controller?.searchDocument(query) ?? Promise.resolve(null);
  }

  clearDocumentSearch(): ReturnType<ViewerControllerHandle['clearDocumentSearch']> {
    return this.controller?.clearDocumentSearch() ?? Promise.resolve(null);
  }

  nextSearchResult(): ReturnType<ViewerControllerHandle['nextSearchResult']> {
    return this.controller?.nextSearchResult() ?? Promise.resolve(null);
  }

  previousSearchResult(): ReturnType<ViewerControllerHandle['previousSearchResult']> {
    return this.controller?.previousSearchResult() ?? Promise.resolve(null);
  }

  collectDocumentAnchors(): ReturnType<ViewerControllerHandle['collectDocumentAnchors']> {
    return this.controller?.collectDocumentAnchors() ?? Promise.resolve([]);
  }

  scrollToAnchor(anchor: Parameters<ViewerControllerHandle['scrollToAnchor']>[0]): Promise<boolean> {
    return this.controller?.scrollToAnchor(anchor) ?? Promise.resolve(false);
  }

  scrollToLine(line: number): Promise<boolean> {
    return this.controller?.scrollToLine(line) ?? Promise.resolve(false);
  }

  getDocumentTextChunks(): ReturnType<ViewerControllerHandle['getDocumentTextChunks']> {
    return this.controller?.getDocumentTextChunks() ?? [];
  }

  getOperationAvailability(): ReturnType<ViewerControllerHandle['getOperationAvailability']> {
    return this.controller?.getOperationAvailability() ?? null;
  }

  getZoomState(): ReturnType<ViewerControllerHandle['getZoomState']> {
    return this.controller?.getZoomState() ?? null;
  }

  getSearchState(): ReturnType<ViewerControllerHandle['getSearchState']> {
    return this.controller?.getSearchState() ?? null;
  }

  getState(): ReturnType<ViewerControllerHandle['getState']> {
    return this.controller?.getState() ?? null;
  }

  subscribe(listener: ViewerStateListener): () => void {
    return this.controller?.subscribe(listener) ?? (() => {});
  }

  private setMountOptions(options: ViewerMountOptions): void {
    this.mountOptions = mergeMountOptions(this.mountOptions, options);
    this.scheduleUpdate();
  }

  private mount(): void {
    if (this.controller || !this.isConnected) {
      return;
    }
    const node = this.ensureMountNode();
    try {
      this.controller = mountCoreViewer(node, this.createControllerMountOptions(), {
        registry: fileViewerCoreRendererRegistry,
        ...this.internalCoreOptions,
      });
      this.dispatchTypedEvent<FileViewerElementReadyDetail>('viewer-ready', {
        controller: this.controller,
      });
    } catch (error) {
      this.dispatchError(error);
      throw error;
    }
  }

  private remount(): void {
    if (!this.isConnected) {
      return;
    }
    this.destroy();
    this.mount();
  }

  private remountOrUpdate(): void {
    if (this.controller) {
      void this.update();
    } else if (this.isConnected) {
      this.mount();
    }
  }

  private ensureMountNode(): HTMLDivElement {
    if (this.mountNode) {
      return this.mountNode;
    }
    const node = document.createElement('div');
    node.className = 'file-viewer-web-host';
    addPart(node, 'host');
    node.style.width = '100%';
    node.style.height = '100%';
    node.style.minWidth = '0';
    node.style.minHeight = '0';
    this.mountNode = node;
    const root = this.resolveElementRenderRoot();
    root.appendChild(node);
    if (!this.style.display) {
      this.style.display = 'block';
    }
    return node;
  }

  private resolveElementRenderRoot(): HTMLElement | ShadowRoot {
    if (this.shadowRoot) {
      return this.shadowRoot;
    }
    const isolation = this.styleIsolation;
    if (
      isolation !== 'none' &&
      isolation !== 'scoped' &&
      typeof this.attachShadow === 'function'
    ) {
      return this.attachShadow({ mode: 'open', delegatesFocus: true });
    }
    return this;
  }

  private createEffectiveMountOptions(): ViewerMountOptions {
    const attributeOptions = this.readAttributeMountOptions();
    const propertyOptions = this.mountOptions;
    const onEventCallbacks = [attributeOptions.onEvent, propertyOptions.onEvent];
    const onStateCallbacks = [attributeOptions.onStateChange, propertyOptions.onStateChange];
    return {
      ...attributeOptions,
      ...propertyOptions,
      options: mergeViewerOptions(attributeOptions.options, propertyOptions.options),
      onEvent: event => {
        callUnique<ViewerEvent>(onEventCallbacks as ViewerEventHandler[], event);
        this.dispatchViewerEvent(event);
      },
      onStateChange: (state, event) => {
        callUnique<ViewerState>(
          onStateCallbacks.map(callback => callback ? nextState => callback(nextState, event) : undefined),
          state
        );
        this.dispatchTypedEvent<FileViewerElementStateChangeDetail>('viewer-state-change', {
          state,
          event,
        });
      },
    };
  }

  private createControllerMountOptions(): ViewerMountOptions {
    const mountOptions = this.createEffectiveMountOptions();
    if (!this.shadowRoot || this.mountNode?.getRootNode() !== this.shadowRoot) {
      return mountOptions;
    }
    // The custom element already owns this ShadowRoot. Ask the shared
    // controller to render its scoped shell inside it instead of creating a
    // redundant nested root. Framework containers inside a customer's Shadow
    // DOM still receive their own controller-owned root.
    return {
      ...mountOptions,
      options: {
        ...(mountOptions.options || {}),
        styleIsolation: 'scoped',
      },
    };
  }

  private readAttributeMountOptions(): ViewerMountOptions {
    const url = this.getAttribute('src') || this.getAttribute('url') || undefined;
    const filename = this.getAttribute('filename') || undefined;
    const name = this.getAttribute('name') || undefined;
    const type = this.getAttribute('type') || undefined;
    const size = parseNumberLike(this.getAttribute('size'));
    const options = this.readAttributeViewerOptions();
    return {
      ...(url ? { url } : {}),
      ...(filename ? { filename } : {}),
      ...(name ? { name } : {}),
      ...(type ? { type } : {}),
      ...(size === undefined ? {} : { size }),
      ...(options ? { options } : {}),
    };
  }

  private readAttributeViewerOptions(): ViewerOptions | undefined {
    const options = parseJsonObject<ViewerOptions>(this.getAttribute('options')) || {};
    const locale = this.getAttribute('locale');
    if (locale) {
      options.locale = locale as ViewerOptions['locale'];
    }

    const theme = this.getAttribute('theme');
    if (theme) {
      options.theme = theme as ViewerOptions['theme'];
    }

    const toolbar = this.getAttribute('toolbar');
    const toolbarJson = parseJsonObject<ViewerOptions['toolbar']>(toolbar);
    const toolbarBoolean = parseBooleanLike(toolbar);
    if (toolbarJson !== undefined) {
      options.toolbar = toolbarJson;
    } else if (toolbarBoolean !== undefined) {
      options.toolbar = toolbarBoolean;
    }

    const toolbarPosition = this.getAttribute('toolbar-position');
    if (toolbarPosition) {
      options.toolbar = {
        ...(typeof options.toolbar === 'object' && options.toolbar ? options.toolbar : {}),
        position: toolbarPosition as ViewerToolbarPosition,
      } as ViewerOptions['toolbar'];
    }

    const watermark = this.getAttribute('watermark');
    const watermarkJson = parseJsonObject<ViewerOptions['watermark']>(watermark);
    const watermarkBoolean = parseBooleanLike(watermark);
    if (watermarkJson !== undefined) {
      options.watermark = watermarkJson;
    } else if (watermarkBoolean !== undefined) {
      options.watermark = watermarkBoolean;
    } else if (watermark) {
      options.watermark = { enabled: true, text: watermark };
    }

    const search = this.getAttribute('search');
    const searchJson = parseJsonObject<ViewerOptions['search']>(search);
    const searchBoolean = parseBooleanLike(search);
    if (searchJson !== undefined) {
      options.search = searchJson;
    } else if (searchBoolean !== undefined) {
      options.search = searchBoolean;
    }

    const fit = this.getAttribute('fit');
    const fitJson = parseJsonObject<ViewerOptions['fit']>(fit);
    if (fitJson !== undefined) {
      options.fit = fitJson;
    } else if (fit) {
      options.fit = fit as ViewerFitMode;
    }

    const density = this.getAttribute('density');
    if (density) {
      options.ui = {
        ...(options.ui || {}),
        density: density as ViewerUiDensity,
      };
    }

    const styleIsolation = this.getAttribute('style-isolation');
    if (styleIsolation) {
      options.styleIsolation = styleIsolation as ViewerOptions['styleIsolation'];
    }

    return Object.keys(options).length ? options : undefined;
  }

  private scheduleUpdate(): void {
    if (!this.isConnected || !this.controller || this.pendingUpdate) {
      return;
    }
    this.pendingUpdate = true;
    queueMicrotask(() => {
      this.pendingUpdate = false;
      if (!this.controller) {
        return;
      }
      this.controller.update(this.createControllerMountOptions()).catch(error => {
        this.dispatchError(error);
      });
    });
  }

  private dispatchViewerEvent(event: ViewerEvent): void {
    this.dispatchTypedEvent<ViewerEvent>('viewer-event', event);
    this.dispatchTypedEvent<ViewerEvent>(toKebabEventName(event), event);
  }

  private dispatchError(error: unknown): void {
    this.dispatchTypedEvent<FileViewerElementErrorDetail>('viewer-error', { error });
  }

  private dispatchTypedEvent<Detail>(name: string, detail: Detail): void {
    this.dispatchEvent(createFileViewerCustomEvent(this, name, detail));
  }
}

export const defineFileViewerElement = (
  tagName = FILE_VIEWER_ELEMENT_TAG
): CustomElementConstructor | undefined => {
  if (typeof window === 'undefined' || !window.customElements) {
    return undefined;
  }
  const existing = window.customElements.get(tagName);
  if (existing) {
    return existing;
  }
  window.customElements.define(tagName, FileViewerElement);
  return FileViewerElement;
};
