import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  createFileViewerZoomState,
  createRendererRegistry,
  createViewer,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerFitRequest,
  type FileViewerZoomProvider,
  type RendererDefinition,
  type RenderSurface,
} from '../packages/core/src';
import { mountViewer } from '../packages/components/web/src/controller';

type DomGlobals = Pick<typeof globalThis, 'window' | 'document' | 'HTMLElement' | 'ShadowRoot'>;

const previousGlobals: Partial<DomGlobals> = {};

const installDom = (html = '<main id="viewer"></main>') => {
  const { document, window } = parseHTML(html);
  previousGlobals.window = globalThis.window;
  previousGlobals.document = globalThis.document;
  previousGlobals.HTMLElement = globalThis.HTMLElement;
  previousGlobals.ShadowRoot = globalThis.ShadowRoot;

  Object.assign(globalThis, {
    window,
    document,
    HTMLElement: window.HTMLElement,
    ShadowRoot: window.ShadowRoot,
  });

  return document.getElementById('viewer') as HTMLElement;
};

const restoreDom = () => {
  for (const key of ['window', 'document', 'HTMLElement', 'ShadowRoot'] as const) {
    if (previousGlobals[key]) {
      Object.assign(globalThis, { [key]: previousGlobals[key] });
    } else {
      delete (globalThis as Record<typeof key, unknown>)[key];
    }
  }
};

const createReadyRenderer = (onLoad?: (surface: RenderSurface) => void): RendererDefinition => ({
  id: 'style-isolation-fixture',
  label: 'Style isolation fixture',
  category: 'document',
  extensions: ['fixture'],
  capabilities: {
    download: true,
  },
  load: async ({ surface }) => {
    onLoad?.(surface);
    surface.container.innerHTML = '<article><h1>Ready</h1><p>Preview body</p></article>';
    return {};
  },
});

const waitForReady = async (
  container: HTMLElement,
  options: Parameters<typeof mountViewer>[1],
) => {
  const registry = createRendererRegistry([createReadyRenderer()]);
  let controller!: ReturnType<typeof mountViewer>;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for viewer')), 1000);
    controller = mountViewer(container, {
      buffer: new ArrayBuffer(1),
      filename: 'demo.fixture',
      ...options,
      onStateChange(state) {
        options?.onStateChange?.(state);
        if (state.error) {
          clearTimeout(timeout);
          reject(state.error);
        } else if (state.ready) {
          clearTimeout(timeout);
          resolve();
        }
      },
    }, { registry });
  });
  return controller;
};

describe('@file-viewer/web style isolation', () => {
  afterEach(() => {
    restoreDom();
  });

  it.each([false, true])('does not delegate pointer focus to unrelated toolbar inputs (existing root: %s)', async existingRoot => {
    const container = installDom();
    if (existingRoot) container.attachShadow({ mode: 'open' });
    const attach = vi.spyOn(container.ownerDocument.defaultView!.HTMLElement.prototype, 'attachShadow');
    let controller: Awaited<ReturnType<typeof waitForReady>> | undefined;
    try {
      controller = await waitForReady(container, { options: { styleIsolation: 'shadow' } });
      expect(attach).toHaveBeenCalled();
      for (const [options] of attach.mock.calls) expect(options.delegatesFocus).not.toBe(true);
    } finally {
      controller?.destroy();
      attach.mockRestore();
    }
  });

  it('mounts the web controller in Shadow DOM by default and exposes stable parts/tokens', async () => {
    const container = installDom(`
      <style>
        * { box-sizing: content-box !important; }
        div, button, table, img, svg, canvas, a { all: unset !important; color: hotpink !important; }
      </style>
      <main id="viewer" style="--file-viewer-button-color: rgb(1, 2, 3)"></main>
    `);

    await waitForReady(container, {
      options: {
        ui: {
          density: 'compact',
          surfaceBackground: 'rgba(240, 244, 248, 0.5)',
        },
        toolbar: {
          download: true,
        },
      },
    });

    expect(container.shadowRoot).toBeTruthy();
    expect(container.querySelector('.file-viewer-web-shell')).toBeNull();

    const root = container.shadowRoot as ShadowRoot;
    expect(root.querySelector('[part~="shell"]')).toBeTruthy();
    expect(root.querySelector('[part~="shell"]')?.getAttribute('data-viewer-density')).toBe('compact');
    expect((root.querySelector('[part~="shell"]') as HTMLElement).style.getPropertyValue(
      '--file-viewer-render-surface-background'
    )).toBe('rgba(240, 244, 248, 0.5)');
    expect(root.querySelector('[part~="toolbar"]')).toBeTruthy();
    expect(root.querySelector('[part~="content"]')).toBeTruthy();
    expect(root.querySelector('[part~="button"]')).toBeTruthy();
    expect(root.querySelector('style')?.textContent).toContain('--file-viewer-button-color');
  });

  it('owns a nested ShadowRoot without mutating the customer ancestor root', async () => {
    const container = installDom();
    const documentRef = container.ownerDocument;
    const host = documentRef.createElement('section');
    const root = host.attachShadow({ mode: 'open' });
    container.remove();
    root.appendChild(container);

    class RealmStyleSheet {
      cssText = '';

      replaceSync(css: string) {
        this.cssText = css;
      }
    }

    Object.defineProperty(documentRef.defaultView, 'CSSStyleSheet', {
      configurable: true,
      value: RealmStyleSheet,
    });
    Object.defineProperty(root, 'adoptedStyleSheets', {
      configurable: true,
      writable: true,
      value: [],
    });
    const attachViewerShadow = container.attachShadow.bind(container);
    Object.defineProperty(container, 'attachShadow', {
      configurable: true,
      value(init: ShadowRootInit) {
        const viewerRoot = attachViewerShadow(init);
        Object.defineProperty(viewerRoot, 'adoptedStyleSheets', {
          configurable: true,
          writable: true,
          value: [],
        });
        return viewerRoot;
      },
    });

    const controller = await waitForReady(container, {
      options: { toolbar: { download: true } },
    });

    const adopted = root.adoptedStyleSheets as unknown as RealmStyleSheet[];
    expect(adopted).toHaveLength(0);
    expect(container.shadowRoot).toBeTruthy();
    const viewerSheets = container.shadowRoot?.adoptedStyleSheets as unknown as RealmStyleSheet[];
    expect(viewerSheets).toHaveLength(1);
    expect(viewerSheets[0]).toBeInstanceOf(RealmStyleSheet);
    expect(viewerSheets[0].cssText).toContain('.file-viewer-web-toolbar');
    expect(container.querySelector('style')).toBeNull();

    controller.destroy();
    expect(root.adoptedStyleSheets).toHaveLength(0);
    expect(container.shadowRoot?.adoptedStyleSheets).toHaveLength(0);
  });

  it('falls back to scoped light DOM when attachShadow is rejected', async () => {
    const container = installDom();
    Object.defineProperty(container, 'attachShadow', {
      configurable: true,
      value() {
        throw new DOMException('Unsupported Shadow host', 'NotSupportedError');
      },
    });

    const controller = await waitForReady(container, {
      options: { toolbar: { download: true } },
    });

    expect(container.shadowRoot).toBeNull();
    expect(container.querySelector('.file-viewer-web-shell')).toBeTruthy();
    expect(container.querySelector('style')?.textContent).toContain('.file-viewer-web-toolbar');
    controller.destroy();
  });

  it('keeps the imperative light-DOM compatibility path when styleIsolation is none', async () => {
    const container = installDom();

    await waitForReady(container, {
      options: {
        styleIsolation: 'none',
        toolbar: {
          download: true,
        },
      },
    });

    expect(container.shadowRoot).toBeNull();
    expect(container.querySelector('.file-viewer-web-shell')).toBeTruthy();
    expect(container.querySelector('[part~="toolbar"]')).toBeTruthy();
    const style = container.querySelector('style')?.textContent || '';
    expect(style).toContain(':host,.file-viewer-web-shell{');
    expect(style).toContain('.file-viewer-web-shell,.file-viewer-web-shell *');
    expect(style).not.toContain('\n*,*::before,*::after');
  });

  it('projects a light-DOM remount through an owned ShadowRoot on the same host', async () => {
    const container = installDom();
    const first = await waitForReady(container, {
      options: { toolbar: { download: true } },
    });

    first.destroy();
    expect(container.shadowRoot).toBeTruthy();
    expect(container.shadowRoot?.childNodes.length).toBe(0);

    const second = await waitForReady(container, {
      options: {
        styleIsolation: 'none',
        toolbar: { download: true },
      },
    });

    expect(container.shadowRoot?.querySelector('[data-file-viewer-light-dom-slot="true"]')).toBeTruthy();
    expect(container.shadowRoot?.querySelector('.file-viewer-web-shell')).toBeNull();
    expect(container.querySelector('.file-viewer-web-shell')).toBeTruthy();
    expect(container.querySelector('.file-viewer-web-shell')?.getRootNode()).toBe(document);
    second.destroy();
  });

  it('preserves an application-owned ShadowRoot and nests the isolated viewer', async () => {
    const container = installDom();
    const applicationRoot = container.attachShadow({ mode: 'open' });
    const sentinel = document.createElement('p');
    sentinel.textContent = 'application content';
    applicationRoot.appendChild(sentinel);

    const controller = await waitForReady(container, {
      options: { toolbar: { download: true } },
    });

    const boundary = applicationRoot.querySelector<HTMLElement>('[data-file-viewer-mount-boundary="true"]');
    expect(applicationRoot.querySelector('p')).toBe(sentinel);
    expect(boundary?.shadowRoot?.querySelector('.file-viewer-web-shell')).toBeTruthy();
    expect(applicationRoot.querySelector('.file-viewer-web-shell')).toBeNull();

    controller.destroy();
    expect(applicationRoot.querySelector('p')).toBe(sentinel);
    expect(applicationRoot.querySelector('[data-file-viewer-mount-boundary="true"]')).toBeNull();
  });

  it('preserves an application-owned ShadowRoot in explicit light-DOM mode', async () => {
    const container = installDom();
    const applicationRoot = container.attachShadow({ mode: 'open' });
    const sentinel = document.createElement('p');
    sentinel.textContent = 'application content';
    applicationRoot.appendChild(sentinel);

    const controller = await waitForReady(container, {
      options: {
        styleIsolation: 'none',
        toolbar: { download: true },
      },
    });

    const boundary = applicationRoot.querySelector<HTMLElement>('[data-file-viewer-mount-boundary="true"]');
    expect(applicationRoot.querySelector('p')).toBe(sentinel);
    expect(boundary?.shadowRoot).toBeNull();
    expect(boundary?.querySelector('.file-viewer-web-shell')).toBeTruthy();

    controller.destroy();
    expect(applicationRoot.querySelector('p')).toBe(sentinel);
    expect(applicationRoot.querySelector('[data-file-viewer-mount-boundary="true"]')).toBeNull();
  });

  it('passes a ShadowRoot-backed render surface to core renderers when requested', async () => {
    const container = installDom();
    let capturedSurface: RenderSurface | null = null;
    const registry = createRendererRegistry([createReadyRenderer(surface => {
      capturedSurface = surface;
    })]);
    const viewer = createViewer(container, {
      registry,
      options: {
        styleIsolation: 'shadow',
      },
    });

    await viewer.load({
      buffer: new ArrayBuffer(1),
      filename: 'demo.fixture',
    });

    expect(capturedSurface?.shadowRoot).toBeTruthy();
    expect(capturedSurface?.container.getRootNode()).toBe(capturedSurface?.shadowRoot);
    expect(container.querySelector('article')).toBeNull();
    expect(capturedSurface?.shadowRoot?.querySelector('article')).toBeTruthy();
  });

  it('syncs the renderer surface background on initial load and updateOptions', async () => {
    const container = installDom();
    let renderHost: HTMLElement | null = null;
    const registry = createRendererRegistry([createReadyRenderer(surface => {
      renderHost = surface.host || surface.container;
    })]);
    const viewer = createViewer(container, {
      registry,
      options: {
        styleIsolation: 'shadow',
        ui: {
          surfaceBackground: 'linear-gradient(#fff, #eef2f7)',
        },
      },
    });

    await viewer.load({
      buffer: new ArrayBuffer(1),
      filename: 'demo.fixture',
    });

    const property = '--file-viewer-render-surface-background';
    expect(renderHost?.style.getPropertyValue(property)).toBe('linear-gradient(#fff, #eef2f7)');

    viewer.updateOptions({ ui: { surfaceBackground: 'transparent' } });
    expect(renderHost?.style.getPropertyValue(property)).toBe('transparent');

    viewer.updateOptions({ ui: { surfaceBackground: 'auto' } });
    expect(renderHost?.style.getPropertyValue(property) || '').toBe('');
  });

  it('keeps fitToView wired to providers rendered inside the default Shadow DOM path', async () => {
    const container = installDom();
    let scale = 1;
    const fitRequests: FileViewerFitRequest[] = [];
    const renderer: RendererDefinition = {
      id: 'shadow-fit-fixture',
      label: 'Shadow fit fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: {
        zoom: 'provider',
      },
      load: async ({ surface }) => {
        surface.container.getBoundingClientRect = () => ({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 640,
          bottom: 480,
          width: 640,
          height: 480,
          toJSON: () => ({}),
        });
        Object.defineProperty(surface.container, 'clientWidth', { value: 640, configurable: true });
        Object.defineProperty(surface.container, 'clientHeight', { value: 480, configurable: true });
        surface.container.innerHTML = '<section id="zoom-host">ready</section>';
        const zoomHost = surface.container.querySelector('#zoom-host') as HTMLElement;
        const getState = () => createFileViewerZoomState({
          scale,
          canZoomIn: scale < 2,
          canZoomOut: scale > 0.5,
          canReset: scale !== 1,
        });
        const zoomProvider: FileViewerZoomProvider = {
          zoomIn: () => {
            scale = 1.25;
            return getState();
          },
          zoomOut: () => {
            scale = 0.75;
            return getState();
          },
          resetZoom: () => {
            scale = 1;
            return getState();
          },
          fit: request => {
            fitRequests.push(request);
            scale = request.mode === 'width' ? 0.5 : 1;
            return {
              applied: true,
              mode: request.mode,
              resize: request.resize,
              scale,
              source: request.source,
              provider: 'zoom',
            };
          },
          getState,
        };
        registerFileViewerZoomProvider(zoomHost, zoomProvider);
        return {
          destroy: () => unregisterFileViewerZoomProvider(zoomHost),
        };
      },
    };
    const registry = createRendererRegistry([renderer]);
    let settleReady: ((error?: unknown) => void) | null = null;
    const ready = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for shadow fit fixture')), 1000);
      settleReady = (error?: unknown) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
    });
    const controller = mountViewer(container, {
      buffer: new ArrayBuffer(1),
      filename: 'demo.fixture',
      onStateChange(state) {
        if (state.error) {
          settleReady?.(state.error);
        } else if (state.ready) {
          settleReady?.();
        }
      },
    }, { registry });

    await ready;

    const result = await controller.fitToView('width');

    expect(result).toMatchObject({
      applied: true,
      mode: 'width',
      provider: 'zoom',
      scale: 0.5,
    });
    expect(fitRequests).toHaveLength(1);
    expect(fitRequests[0].viewportWidth).toBe(640);
    expect(container.shadowRoot?.querySelector('#zoom-host')).toBeTruthy();
    expect(container.querySelector('#zoom-host')).toBeNull();
  });
});
