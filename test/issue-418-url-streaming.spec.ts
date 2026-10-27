import { pdfRendererDefinition } from '../packages/renderers/pdf/src/index';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { createRendererRegistry, type RendererDefinition, type RendererLoadContext } from '../packages/core/src';
import { mountViewer, type ViewerController, type ViewerFetchInput } from '../packages/core/src/browser';
import { buildFileRenderContextFromLoadContext } from '../packages/core/src/rendering/handler';

const active: ViewerController[] = [];
const bytes = () => new TextEncoder().encode('%PDF-1.7\nsynthetic bytes for controller routing only').buffer;
const setup = (sourceAccess: RendererDefinition['sourceAccess'] = pdfRendererDefinition.sourceAccess) => {
  const { document, window } = parseHTML('<main id="viewer"></main>');
  Object.defineProperty(window, 'location', { configurable: true, value: { href: 'https://app.example.test/preview' } });
  for (const [key, value] of Object.entries({ document, window, HTMLElement: window.HTMLElement, ShadowRoot: window.ShadowRoot })) vi.stubGlobal(key, value);
  const loads: RendererLoadContext[] = [];
  const definition: RendererDefinition = {
    ...pdfRendererDefinition, sourceAccess,
    load: async context => { loads.push(context); return { destroy() {} }; }
  };
  const fetchFile = vi.fn(async (_input: ViewerFetchInput) => new Blob([bytes()], { type: 'application/pdf' }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob([bytes()], { type: 'application/pdf' }))));
  const create = (custom = false) => {
    const controller = mountViewer(document.getElementById('viewer') as HTMLElement, { options: { toolbar: false } }, {
      registry: createRendererRegistry([definition]), ...(custom ? { fetchFile } : {})
    });
    active.push(controller);
    return controller;
  };
  return { loads, create, fetchFile };
};

afterEach(() => {
  for (const controller of active.splice(0)) controller.destroy();
  vi.unstubAllGlobals();
});

describe('GitHub #418 common controller URL streaming', () => {
  it.each([
    ['/large.pdf', undefined, undefined, undefined],
    ['https://storage.example.test/download?signature=1', 'contract.pdf', undefined, true],
    ['https://storage.example.test/download?signature=2', undefined, 'pdf', true]
  ])('hands the opted-in PDF URL to the renderer without a complete core download: %s', async (url, filename, type, streaming) => {
    const { create, loads } = setup();
    const controller = create();
    await controller.load({ url, filename, type, options: { toolbar: false, pdf: { streaming } } });
    expect(fetch).not.toHaveBeenCalled();
    expect(loads).toHaveLength(1);
    expect(loads[0].source.buffer).toBeUndefined();
    expect(loads[0].source.extension).toBe('pdf');
    expect(buildFileRenderContextFromLoadContext(loads[0]).streamUrl).toBe(url);
    expect(controller.getState().ready).toBe(true);
  });

  it.each([
    ['/large.pdf', false],
    ['https://storage.example.test/large.pdf', undefined]
  ])('downloads buffered policy once and never asks PDF.js to refetch it: %s', async (url, streaming) => {
    const { create, loads } = setup();
    const controller = create();
    await controller.load({ url, options: { toolbar: false, pdf: { streaming } } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(loads[0].source.buffer?.byteLength).toBe(bytes().byteLength);
    const context = buildFileRenderContextFromLoadContext(loads[0]);
    expect(context.url).toBe(url);
    expect(context.streamUrl).toBe(url); // PDF consumes the acquired bytes, preserving URL metadata.
  });

  it('keeps custom buffer-only PDF renderers on their declared source contract', async () => {
    const { create, loads } = setup('buffer');
    await create().load({ url: '/custom.pdf', options: { toolbar: false, pdf: { streaming: true } } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(loads[0].source.buffer?.byteLength).toBe(bytes().byteLength);
  });

  it('preserves explicit buffers and the caller-owned fetch hook', async () => {
    const { create, loads, fetchFile } = setup();
    const controller = create(true);
    await controller.load({ url: '/cached.pdf', buffer: bytes(), options: { toolbar: false, pdf: { streaming: true } } });
    expect(fetchFile).not.toHaveBeenCalled();
    expect(loads[0].source.buffer?.byteLength).toBe(bytes().byteLength);
    await controller.load({ url: '/private.pdf', options: { toolbar: false, pdf: { streaming: true } } });
    expect(fetchFile).toHaveBeenCalledTimes(1);
    expect(fetchFile.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    expect(loads[1].source.buffer?.byteLength).toBe(bytes().byteLength);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores an older non-Abort fetch failure after a newer source becomes ready', async () => {
    const { create, fetchFile, loads } = setup();
    let rejectOld!: (error: Error) => void;
    fetchFile.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    const controller = create(true);
    const old = controller.load({ url: '/old.pdf', options: { toolbar: false } });
    await vi.waitFor(() => expect(fetchFile).toHaveBeenCalledTimes(1));
    await controller.load({ url: '/new.pdf', options: { toolbar: false } });
    rejectOld(new Error('An obsolete custom transport failed after cancellation'));
    await expect(old).resolves.toBeUndefined();
    expect(loads).toHaveLength(1);
    expect(loads[0].source.url).toBe('/new.pdf');
    expect(controller.getState().ready).toBe(true);
    expect(controller.getState().error).toBeNull();
  });

  it('does not publish a late transport failure after destruction', async () => {
    const { create, fetchFile } = setup();
    let rejectOld!: (error: Error) => void;
    fetchFile.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
    const controller = create(true);
    const pending = controller.load({ url: '/old.pdf', options: { toolbar: false } });
    await vi.waitFor(() => expect(fetchFile).toHaveBeenCalledTimes(1));
    controller.destroy();
    rejectOld(new Error('Obsolete transport failure'));
    await expect(pending).resolves.toBeUndefined();
    expect(controller.getState().error).toBeNull();
  });
});
