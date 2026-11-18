import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileRenderThumbnailAdapter, FileViewerOptions } from '../packages/core/src/contracts/types';

const mock = vi.hoisted(() => ({ factory: vi.fn() }));
vi.mock('../packages/renderers/ebook/src/vendor/epubjs.js', () => ({ default: mock.factory }));
import renderEpub from '../packages/renderers/ebook/src/epub';

const setup = (ready: Promise<unknown> = Promise.resolve()) => {
  const register = vi.fn();
  const rendition = {
    clear: vi.fn(),
    destroy: vi.fn(), display: vi.fn().mockResolvedValue(undefined), next: vi.fn().mockResolvedValue(undefined),
    prev: vi.fn().mockResolvedValue(undefined), on: vi.fn(), off: vi.fn(),
    themes: { default: vi.fn() }, hooks: { content: { register: vi.fn(), deregister: vi.fn() } }, getContents: () => [],
  };
  const book = {
    ready, destroy: vi.fn(() => rendition.destroy()), coverUrl: vi.fn().mockResolvedValue('blob:local-cover'),
    loaded: { metadata: Promise.resolve({ title: 'Book' }), navigation: Promise.resolve({ toc: [] }) },
    locations: { generate: vi.fn().mockResolvedValue(undefined) }, spine: { hooks: { serialize: { register } } },
    path: { relative: (href: string) => href.replace(/^\/OPS\//, '') },
    renderTo: vi.fn((stage: HTMLElement, _options: Record<string, unknown>) => {
      const frame = document.createElement('iframe'); stage.append(frame);
      frame.contentDocument!.body.textContent = 'Readable local chapter'; return rendition;
    }),
  };
  mock.factory.mockReturnValue(book);
  Object.assign(mock.factory, { Rendition: { prototype: { requireManager: () => class {} } } });
  const target = document.createElement('div'); document.body.append(target);
  let adapter: FileRenderThumbnailAdapter | null = null;
  const mount = (options: FileViewerOptions = { epub: { externalResources: 'block' } }) => renderEpub(new ArrayBuffer(8), target, {
    options, registerThumbnailAdapter: value => { adapter = value; },
  } as Parameters<typeof renderEpub>[2]);
  return { book, rendition, register, target, mount, adapter: () => adapter };
};

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); mock.factory.mockReset(); });

describe('EPUB policy renderer lifecycle', () => {
  it('waits for archive readiness before installing the policy and displaying, then releases each resource once', async () => {
    let finish!: () => void;
    const fixture = setup(new Promise<void>(resolve => { finish = resolve; }));
    const instance = await fixture.mount();
    await vi.waitFor(() => expect(mock.factory).toHaveBeenCalledOnce());
    expect(fixture.register).not.toHaveBeenCalled();
    expect(fixture.rendition.display).not.toHaveBeenCalled();
    expect(mock.factory.mock.calls[0][1].requestMethod).toBeTypeOf('function');
    expect(fixture.book.renderTo.mock.calls[0][1]).toMatchObject({ flow: 'scrolled', snap: false });
    expect(fixture.book.renderTo.mock.calls[0][1].manager).toBeTypeOf('function');
    finish();
    await vi.waitFor(() => expect(fixture.rendition.display).toHaveBeenCalledOnce());
    expect(fixture.register).toHaveBeenCalledOnce();
    expect(fixture.register.mock.invocationCallOrder[0]).toBeLessThan(fixture.rendition.display.mock.invocationCallOrder[0]);
    instance.unmount(); instance.unmount();
    expect(fixture.book.destroy).toHaveBeenCalledOnce();
    expect(fixture.rendition.destroy).toHaveBeenCalledOnce();
    expect(fixture.adapter()).toBeNull();
  });

  it('fails closed when a serialize hook is unavailable and releases the archive and rendition', async () => {
    const fixture = setup();
    Object.assign(fixture.book.spine, { hooks: undefined });
    const instance = await fixture.mount();
    await vi.waitFor(() => expect(fixture.book.destroy).toHaveBeenCalledOnce());
    expect(fixture.rendition.display).not.toHaveBeenCalled();
    expect(fixture.rendition.destroy).toHaveBeenCalledOnce();
    await expect(fixture.adapter()!.capture!({} as never)).rejects.toThrow('not available');
    instance.unmount();
    expect(fixture.book.destroy).toHaveBeenCalledOnce();
  });

  it('clears rejected chapter output, stops later capture and does not destroy twice after queued errors', async () => {
    const fixture = setup();
    let rejectDisplay!: (error: Error) => void;
    fixture.rendition.display.mockImplementation(() => new Promise((_resolve, reject) => { rejectDisplay = reject; }));
    const instance = await fixture.mount();
    await vi.waitFor(() => expect(fixture.rendition.display).toHaveBeenCalledOnce());
    const section = { output: '<broken>', url: '/OPS/chapter.xhtml' };
    await expect(fixture.register.mock.calls[0][0]('', section)).rejects.toThrow();
    expect(section.output).toBe('');
    expect(fixture.book.destroy).toHaveBeenCalledOnce();
    expect(fixture.rendition.destroy).toHaveBeenCalledOnce();
    rejectDisplay(new Error('Queued rendition rejected after policy failure'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fixture.rendition.destroy).toHaveBeenCalledOnce();
    await expect(fixture.adapter()!.capture!({} as never)).rejects.toThrow('not available');
    instance.unmount();
    expect(fixture.book.destroy).toHaveBeenCalledOnce();
  });

  it('does not install or display a queued book after unmount while ready is pending', async () => {
    let finish!: () => void;
    const fixture = setup(new Promise<void>(resolve => { finish = resolve; }));
    const instance = await fixture.mount();
    await vi.waitFor(() => expect(mock.factory).toHaveBeenCalledOnce());
    instance.unmount(); finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fixture.register).not.toHaveBeenCalled(); expect(fixture.rendition.display).not.toHaveBeenCalled();
    expect(fixture.book.destroy).toHaveBeenCalledOnce();
  });

  it('aborts a local cover fetch on unmount and removes temporary abort subscriptions', async () => {
    const fixture = setup();
    const instance = await fixture.mount();
    await vi.waitFor(() => expect(fixture.rendition.display).toHaveBeenCalledOnce());
    let captureSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      captureSignal = signal; signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    })));
    const capture = fixture.adapter()!.capture!({} as never);
    await vi.waitFor(() => expect(captureSignal).toBeDefined());
    instance.unmount();
    await expect(capture).rejects.toThrow('aborted');
    expect(captureSignal!.aborted).toBe(true);
  });

  it('retains the default allow factory path without installing a block hook', async () => {
    const fixture = setup();
    const instance = await fixture.mount({});
    await vi.waitFor(() => expect(fixture.rendition.display).toHaveBeenCalledOnce());
    expect(mock.factory.mock.calls[0][1]).not.toHaveProperty('requestMethod');
    expect(fixture.register).not.toHaveBeenCalled();
    instance.unmount();
  });

  it('refuses missing or rejected covers in block mode instead of delegating to a host DOM capture', async () => {
    const fixture = setup();
    const instance = await fixture.mount();
    await vi.waitFor(() => expect(fixture.rendition.display).toHaveBeenCalledOnce());
    fixture.book.coverUrl.mockResolvedValue(null as never);
    await expect(fixture.adapter()!.capture!({} as never)).rejects.toThrow('local EPUB cover');
    fixture.book.coverUrl.mockRejectedValue(new Error('Archive cover missing'));
    await expect(fixture.adapter()!.capture!({} as never)).rejects.toThrow('local EPUB cover');
    instance.unmount();
  });
});
