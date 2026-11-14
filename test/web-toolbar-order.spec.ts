import { afterEach, describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  createFileViewerZoomState,
  createRendererRegistry,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerZoomProvider,
  type RendererDefinition,
} from '../packages/core/src';
import { mountViewer, type ViewerController } from '../packages/components/web/src/controller';

type DomGlobals = Pick<typeof globalThis, 'window' | 'document' | 'HTMLElement' | 'ShadowRoot'>;

const previousGlobals: Partial<DomGlobals> = {};

const installDom = () => {
  const { document, window } = parseHTML('<main id="viewer"></main>');
  previousGlobals.window = globalThis.window;
  previousGlobals.document = globalThis.document;
  previousGlobals.HTMLElement = globalThis.HTMLElement;

  Object.assign(globalThis, {
    window,
    document,
    HTMLElement: window.HTMLElement,
    ShadowRoot: window.ShadowRoot,
  });

  return document.getElementById('viewer') as HTMLElement;
};

const restoreDom = () => {
  for (const key of ['window', 'document', 'HTMLElement'] as const) {
    if (previousGlobals[key]) {
      Object.assign(globalThis, { [key]: previousGlobals[key] });
    } else {
      delete (globalThis as Record<typeof key, unknown>)[key];
    }
  }
};

const toolbarItemName = (element: Element) => {
  if (element.classList.contains('file-viewer-web-theme-button')) {
    return 'theme';
  }
  if (element.classList.contains('file-viewer-web-search')) {
    return 'search';
  }
  if (element.classList.contains('file-viewer-web-toolbar-group')) {
    return 'zoom';
  }
  if (element.classList.contains('file-viewer-web-print-menu')) {
    return element.querySelector(':scope > button')?.textContent?.trim() || 'print';
  }
  return element.textContent?.trim();
};

describe('@file-viewer/web toolbar order', () => {
  afterEach(() => {
    restoreDom();
  });

  it('keeps an unchanged source mounted while runtime options update', async () => {
    const container = installDom();
    let loads = 0;
    let unloads = 0;
    const renderer: RendererDefinition = {
      id: 'runtime-option-fixture',
      label: 'Runtime option fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: {
        download: false,
        print: false,
        exportHtml: false,
        zoom: false,
      },
      load: async ({ surface }) => {
        loads += 1;
        surface.container.innerHTML = `<section>load-${loads}</section>`;
        return {
          destroy: () => {
            unloads += 1;
          },
        };
      },
    };
    const controller = mountViewer(container, {
      buffer: new ArrayBuffer(1),
      filename: 'first.fixture',
      options: { toolbar: false },
    }, { registry: createRendererRegistry([renderer]) });

    await new Promise<void>((resolve, reject) => {
      const unsubscribe = controller.subscribe(state => {
        if (state.error) {
          unsubscribe();
          reject(state.error);
        } else if (state.ready) {
          unsubscribe();
          resolve();
        }
      });
    });
    expect(loads).toBe(1);

    const renderRoot = container.shadowRoot || container;
    const renderedFixture = () => renderRoot.querySelector('section')?.textContent;
    await controller.update({
      options: {
        toolbar: false,
        ui: { density: 'compact' },
      },
    });
    expect(loads).toBe(1);
    expect(unloads).toBe(0);
    expect(renderedFixture()).toBe('load-1');

    await controller.update({ buffer: new ArrayBuffer(1) });
    expect(loads).toBe(2);
    expect(unloads).toBe(1);
    expect(renderedFixture()).toBe('load-2');
    controller.destroy();
  });

  it('rerenders an unchanged source when renderer-owned options change', async () => {
    const container = installDom();
    const reviewModes: string[] = [];
    let loads = 0;
    let unloads = 0;
    const renderer: RendererDefinition = {
      id: 'render-option-fixture',
      label: 'Render option fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: {
        download: false,
        print: false,
        exportHtml: false,
        zoom: false,
      },
      load: async ({ surface, options }) => {
        loads += 1;
        const reviewMode = options.docx?.reviewMode || 'all';
        reviewModes.push(reviewMode);
        surface.container.innerHTML = `<section>${reviewMode}</section>`;
        return {
          destroy: () => {
            unloads += 1;
          },
        };
      },
    };
    const controller = mountViewer(container, {
      buffer: new ArrayBuffer(1),
      filename: 'revisions.fixture',
      options: { docx: { reviewMode: 'all' } },
    }, { registry: createRendererRegistry([renderer]) });

    await new Promise<void>((resolve, reject) => {
      const unsubscribe = controller.subscribe(state => {
        if (state.error) {
          unsubscribe();
          reject(state.error);
        } else if (state.ready) {
          unsubscribe();
          resolve();
        }
      });
    });
    expect(loads).toBe(1);

    // A parent may recreate an equivalent options object on every render.
    await controller.update({ options: { docx: { reviewMode: 'all' } } });
    expect(loads).toBe(1);
    expect(unloads).toBe(0);

    await controller.update({ options: { docx: { reviewMode: 'final' } } });
    const renderRoot = container.shadowRoot || container;
    expect(loads).toBe(2);
    expect(unloads).toBe(1);
    expect(reviewModes).toEqual(['all', 'final']);
    expect(renderRoot.querySelector('section')?.textContent).toBe('final');
    controller.destroy();
  });

  it('renders built-in toolbar groups in configured order', async () => {
    const container = installDom();
    let scale = 1;
    const renderer: RendererDefinition = {
      id: 'toolbar-fixture',
      label: 'Toolbar fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: {
        download: true,
        print: true,
        exportHtml: true,
        zoom: 'provider',
        search: true,
      },
      load: async ({ surface }) => {
        surface.container.innerHTML = '<section id="zoom-host">ready</section>';
        const zoomHost = surface.container.querySelector('#zoom-host') as HTMLElement;
        const getZoomState = () => createFileViewerZoomState({
          scale,
          canZoomIn: scale < 2,
          canZoomOut: scale > 0.5,
          canReset: scale !== 1,
        });
        const zoomProvider: FileViewerZoomProvider = {
          zoomIn: () => {
            scale = 1.25;
            return getZoomState();
          },
          zoomOut: () => {
            scale = 0.75;
            return getZoomState();
          },
          resetZoom: () => {
            scale = 1;
            return getZoomState();
          },
          getState: getZoomState,
        };
        registerFileViewerZoomProvider(zoomHost, zoomProvider);
        return {
          destroy: () => {
            unregisterFileViewerZoomProvider(zoomHost);
          },
          getAvailability: () => ({
            zoomIn: true,
            zoomOut: true,
            zoomReset: true,
          }),
        };
      },
    };
    const registry = createRendererRegistry([renderer]);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for toolbar fixture')), 1000);
      mountViewer(container, {
        buffer: new ArrayBuffer(1),
        filename: 'demo.fixture',
        options: {
          messages: {
            'toolbar.download': 'download-action',
            'toolbar.print': 'print-action',
            'toolbar.exportHtml': 'export-action',
          },
          toolbar: {
            order: ['zoom', 'search', 'download', 'print', 'exportHtml', 'theme'],
            position: 'top-center',
          },
        },
        onStateChange(state) {
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

    expect(container.shadowRoot).toBeTruthy();
    expect(container.querySelector('.file-viewer-web-toolbar')).toBeNull();
    const renderRoot = container.shadowRoot || container;
    const toolbar = renderRoot.querySelector('.file-viewer-web-toolbar');
    expect(toolbar?.getAttribute('data-toolbar-position')).toBe('top-center');
    expect(Array.from(toolbar?.children || []).map(toolbarItemName)).toEqual([
      'zoom',
      'search',
      'download-action',
      'print-action',
      'export-action',
      'theme',
    ]);
    const rules = Array.from(renderRoot.querySelector('style')?.sheet?.cssRules || []);
    const centeredToolbar = rules.find(rule =>
      'selectorText' in rule && rule.selectorText === '.file-viewer-web-toolbar[data-toolbar-position="top-center"]'
    ) as CSSStyleRule | undefined;
    expect(centeredToolbar?.style.getPropertyValue('justify-content')).toBe('safe center');
  });

  it('toggles light and dark mode from a configurable toolbar button (GitHub #97)', async () => {
    const container = installDom();
    const events: string[] = [];
    const colorSchemeListeners = new Set<(event: MediaQueryListEvent) => void>();
    let systemDark = false;
    Object.defineProperty(globalThis.window, 'matchMedia', {
      configurable: true,
      value: () => ({
        get matches() {
          return systemDark;
        },
        media: '(prefers-color-scheme: dark)',
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          colorSchemeListeners.add(listener);
        },
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          colorSchemeListeners.delete(listener);
        },
      }),
    });
    const setSystemDark = (matches: boolean) => {
      systemDark = matches;
      colorSchemeListeners.forEach(listener => listener({ matches } as MediaQueryListEvent));
    };
    const controller = mountViewer(container, {
      options: {
        locale: 'en-US',
        theme: 'system',
        toolbar: {
          download: false,
          print: false,
          exportHtml: false,
          zoom: false,
          search: false,
          theme: true,
          order: ['theme'],
        },
      },
      onEvent(event) {
        if (event.type === 'theme-change') {
          events.push(event.payload);
        }
      },
    });

    const renderRoot = container.shadowRoot || container;
    const shell = renderRoot.querySelector('.file-viewer-web-shell') as HTMLElement;
    const toolbar = renderRoot.querySelector('.file-viewer-web-toolbar') as HTMLElement;
    const readThemeButton = () => renderRoot.querySelector('.file-viewer-web-theme-button') as HTMLButtonElement | null;

    expect(toolbar.hidden).toBe(false);
    expect(shell.dataset.viewerTheme).toBe('system');
    expect(readThemeButton()?.getAttribute('aria-label')).toBe('Switch to dark mode');
    expect(readThemeButton()?.getAttribute('aria-pressed')).toBe('false');

    setSystemDark(true);
    expect(readThemeButton()?.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(readThemeButton()?.getAttribute('aria-pressed')).toBe('true');

    setSystemDark(false);
    readThemeButton()?.click();
    await Promise.resolve();

    expect(shell.dataset.viewerTheme).toBe('dark');
    expect(events).toEqual(['dark']);
    expect(readThemeButton()?.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(readThemeButton()?.getAttribute('aria-pressed')).toBe('true');

    await controller.update({
      options: {
        theme: 'dark',
        toolbar: false,
      },
    });
    expect(toolbar.hidden).toBe(true);

    await controller.update({
      options: {
        theme: 'light',
        toolbar: {
          download: false,
          print: false,
          exportHtml: false,
          zoom: false,
          search: false,
          theme: true,
          position: 'auto',
        },
      },
    });
    expect(toolbar.hidden).toBe(false);
    expect(readThemeButton()).toBeTruthy();
  });

  it('exposes a compact print dropdown with direct and mask options (GitHub #92)', async () => {
    const container = installDom();
    const renderer: RendererDefinition = {
      id: 'print-menu-fixture',
      label: 'Print menu fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: {
        download: false,
        print: true,
        exportHtml: false,
        zoom: false,
        search: false,
      },
      load: async ({ surface }) => {
        surface.container.innerHTML = '<section>ready</section>';
        return {
          destroy: async () => undefined,
          getAvailability: () => ({
            zoomIn: false,
            zoomOut: false,
            zoomReset: false,
          }),
        };
      },
    };
    const registry = createRendererRegistry([renderer]);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for print menu fixture')), 1000);
      mountViewer(container, {
        buffer: new ArrayBuffer(1),
        filename: 'demo.fixture',
        options: {
          messages: {
            'toolbar.print': 'print-action',
            'toolbar.printDirect': 'print-direct',
            'toolbar.printMask': 'print-mask',
          },
          toolbar: {
            order: ['print'],
            position: 'top-right',
          },
        },
        onStateChange(state) {
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

    const renderRoot = container.shadowRoot || container;
    const menu = renderRoot.querySelector('.file-viewer-web-print-menu');
    expect(menu).toBeTruthy();
    expect(menu?.dataset.open).not.toBe('true');
    const labels = Array.from(menu?.querySelectorAll('.file-viewer-web-print-menu-panel button') || [])
      .map(button => button.textContent?.trim());
    expect(labels).toEqual(['print-direct', 'print-mask']);
    const trigger = menu?.querySelector(':scope > button') as HTMLButtonElement | null;
    expect(trigger?.textContent?.trim()).toBe('print-action');
    trigger?.click();
    expect(menu?.dataset.open).toBe('true');
  });

  it('keeps zoom controls stable at limits and honors reset visibility without blocking APIs (GitHub #398, #88)', async () => {
    const container = installDom();
    let scale = 1;
    const renderer: RendererDefinition = {
      id: 'zoom-reset-fixture',
      label: 'Zoom reset fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: {
        download: false,
        print: false,
        exportHtml: false,
        zoom: 'provider',
      },
      load: async ({ surface }) => {
        surface.container.innerHTML = '<section id="zoom-host">ready</section>';
        const zoomHost = surface.container.querySelector('#zoom-host') as HTMLElement;
        const getZoomState = () => createFileViewerZoomState({
          scale,
          canZoomIn: scale < 2,
          canZoomOut: scale > 0.5,
          canReset: scale !== 1,
        });
        const zoomProvider: FileViewerZoomProvider = {
          zoomIn: () => {
            scale = Math.min(2, Math.round((scale + 0.1) * 10) / 10);
            return getZoomState();
          },
          zoomOut: () => {
            scale = Math.max(0.5, Math.round((scale - 0.1) * 10) / 10);
            return getZoomState();
          },
          resetZoom: () => {
            scale = 1;
            return getZoomState();
          },
          getState: getZoomState,
        };
        registerFileViewerZoomProvider(zoomHost, zoomProvider);
        return {
          destroy: () => {
            unregisterFileViewerZoomProvider(zoomHost);
          },
          getAvailability: () => ({
            zoomIn: true,
            zoomOut: true,
            zoomReset: true,
          }),
        };
      },
    };
    const registry = createRendererRegistry([renderer]);

    let controller: ViewerController | undefined;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for zoom fixture')), 1000);
      controller = mountViewer(container, {
        buffer: new ArrayBuffer(1),
        filename: 'demo.fixture',
        onStateChange(state) {
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

    const renderRoot = container.shadowRoot || container;
    const readZoomGroupLabels = () => {
      const group = renderRoot.querySelector('.file-viewer-web-toolbar-group');
      return Array.from(group?.children || []).map(child => child.textContent?.trim());
    };

    // Keep the reset button's slot even when it is disabled at the initial scale.
    expect(readZoomGroupLabels()).toEqual(['-', '100%', '1:1', '+']);
    const readButtons = () => Array.from(renderRoot.querySelectorAll('.file-viewer-web-toolbar-group button')) as HTMLButtonElement[];
    expect(readButtons()[2].disabled).toBe(true);

    await controller?.zoomIn();

    // Retain the #88 trailing "+" order; default reset space is now reserved
    // from the first paint rather than inserted after the first click.
    const labels = readZoomGroupLabels();
    expect(labels).toEqual(['-', '110%', '1:1', '+']);
    expect(labels[labels.length - 1]).toBe('+');

    for (let click = 0; click < 24; click += 1) await controller?.zoomIn();
    expect(scale).toBe(2);
    expect(readZoomGroupLabels()).toEqual(['-', '200%', '1:1', '+']);
    expect(readButtons().at(-1)?.disabled).toBe(true);
    for (let click = 0; click < 36; click += 1) await controller?.zoomOut();
    expect(scale).toBe(0.5);
    expect(readZoomGroupLabels()).toEqual(['-', '50%', '1:1', '+']);
    expect(readButtons()[0].disabled).toBe(true);

    await controller?.update({ options: { toolbar: { items: { 'zoom-reset': false } } } });
    expect(readZoomGroupLabels()).toEqual(['-', '50%', '+']);
    await controller?.resetZoom();
    expect(scale).toBe(1);
    expect(readZoomGroupLabels()).toEqual(['-', '100%', '+']);

    await controller?.update({ options: { toolbar: { permissions: { 'zoom-in': false } } } });
    expect(readZoomGroupLabels()).toEqual(['-', '100%', '1:1']);
    await controller?.zoomIn();
    expect(scale).toBe(1);
    controller?.destroy();
  });
});
