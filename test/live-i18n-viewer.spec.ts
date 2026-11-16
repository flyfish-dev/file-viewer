// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRendererRegistry, createViewer, createFileViewerI18nBindings, type FileRenderContext, type FileViewerInstance, type RendererDefinition } from '../packages/core/src'
import { mountViewer } from '../packages/core/src/browser'
const viewers: FileViewerInstance[] = []
afterEach(async () => { await Promise.all(viewers.splice(0).map(viewer => viewer.destroy())); document.body.replaceChildren() })
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes }); return { promise, resolve } }
const fixture = (extra?: { wait?: Promise<void>; fail?: boolean; onDiagnostic?: (value: unknown) => void }) => {
  const loaded: FileRenderContext[] = []; const destroyed = vi.fn(); const load = vi.fn<NonNullable<RendererDefinition['load']>>(async context => {
    const renderContext = { ...context.renderContext, options: context.options, signal: context.signal }; loaded.push(renderContext)
    if (extra?.wait) await extra.wait
    if (extra?.fail) { renderContext.i18n!.subscribe(() => destroyed('leaked callback')); throw Error('fixture parse failed') }
    const label = context.surface.container.ownerDocument.createElement('button'); label.dataset.localeLabel = ''
    const body = context.surface.container.ownerDocument.createElement('p'); body.textContent = 'Document content'; context.surface.container.append(label, body)
    const bindings = createFileViewerI18nBindings(renderContext.i18n); bindings.text(label, () => renderContext.i18n!.t('toolbar.print'))
    return { destroy: () => { bindings.destroy(); destroyed() } }
  })
  const registry = createRendererRegistry([{ id: 'language-fixture', label: 'Language fixture', category: 'document', extensions: ['live'], load }])
  const host = document.createElement('main'); document.body.append(host)
  const viewer = createViewer(host, { registry, options: { locale: 'en-US', autoRenderers: false, styleIsolation: 'none', onDiagnostic: extra?.onDiagnostic } }); viewers.push(viewer)
  return { viewer, host, registry, loaded, load, destroyed }
}
const source = { buffer: new Uint8Array([1, 2, 3]).buffer, filename: 'fixture.live', type: 'live' }
describe('core language updates do not reload sessions', () => {
  it('keeps node/selection/session while changing six locales, including two independent viewers', async () => {
    const a = fixture(), b = fixture(); await a.viewer.load(source); await b.viewer.load(source)
    const label = a.host.querySelector('button')!, body = a.host.querySelector('p')!, text = body.firstChild!
    const range = document.createRange(); range.setStart(text, 2); range.setEnd(text, 8); document.getSelection()!.addRange(range)
    for (const locale of ['zh-CN','zh-TW','zh-HK','ja-JP','de-DE','en-US']) a.viewer.updateOptions({ locale })
    expect(a.load).toHaveBeenCalledOnce(); expect(a.destroyed).not.toHaveBeenCalled(); expect(a.host.querySelector('button')).toBe(label); expect(a.host.querySelector('p')).toBe(body)
    expect(document.getSelection()!.toString()).toBe('cument'); expect(b.loaded[0].i18n!.locale).toBe('en-US')
  })
  it('finishes one pending parse using the latest language without abort or restart', async () => {
    const gate = deferred(); const value = fixture({ wait: gate.promise }); const pending = value.viewer.load(source)
    await vi.waitFor(() => expect(value.load).toHaveBeenCalledOnce())
    value.viewer.updateOptions({ locale: 'zh-TW' }); value.viewer.updateOptions({ locale: 'zh-HK' }); gate.resolve(); await pending
    expect(value.host.querySelector('button')!.textContent).toBe('打印'); expect(value.loaded[0].signal!.aborted).toBe(false); expect(value.load).toHaveBeenCalledOnce()
  })
  it.each(['destroy','unload','abort'] as const)('cleans a pending render scope on %s', async action => {
    const gate = deferred(); const value = fixture({ wait: gate.promise }); const abort = new AbortController(); const pending = value.viewer.load(source, { signal: abort.signal })
    await vi.waitFor(() => expect(value.load).toHaveBeenCalledOnce()); const notify = vi.fn(); value.loaded[0].i18n!.subscribe(notify)
    if (action === 'abort') abort.abort(); else await value.viewer[action]()
    value.viewer.updateOptions({ locale: 'ja-JP' }); expect(notify).not.toHaveBeenCalled(); gate.resolve(); await pending; expect(value.destroyed).toHaveBeenCalledOnce()
  })
  it('cleans failed render subscriptions and reports failing listeners without stopping other UI', async () => {
    const failed = fixture({ fail: true }); await expect(failed.viewer.load(source)).rejects.toThrow('fixture parse failed')
    failed.viewer.updateOptions({ locale: 'ja-JP' }); expect(failed.destroyed).not.toHaveBeenCalled()
    const diagnostic = vi.fn(); const okay = fixture({ onDiagnostic: diagnostic }); await okay.viewer.load(source)
    okay.loaded[0].i18n!.subscribe(() => { throw Error('binding failure') }); const other = vi.fn(); okay.loaded[0].i18n!.subscribe(other)
    okay.viewer.updateOptions({ locale: 'zh-TW' }); expect(other).toHaveBeenCalledOnce(); expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: 'i18n-update-failed', message: 'binding failure' }))
  })
  it('keeps explicit nested overrides and inherits later parent changes without reloading children', async () => {
    const value = fixture(); await value.viewer.load(source); const rootContext = value.loaded[0]
    const inheritedTarget = document.createElement('div'), fixedTarget = document.createElement('div'); value.host.append(inheritedTarget, fixedTarget)
    const child = await rootContext.renderNestedBuffer!(source.buffer, 'live', inheritedTarget, { ...rootContext, options: undefined })
    const fixed = await rootContext.renderNestedBuffer!(source.buffer, 'live', fixedTarget, { ...rootContext, options: { ...rootContext.options, locale: 'ja-JP' } })
    value.viewer.updateOptions({ locale: 'zh-TW' }); expect(inheritedTarget.querySelector('button')!.textContent).toBe('列印'); expect(fixedTarget.querySelector('button')!.textContent).toBe('印刷'); expect(value.load).toHaveBeenCalledTimes(3)
    await child!.destroy!(); value.viewer.updateOptions({ locale: 'de-DE' }); expect(fixedTarget.querySelector('button')!.textContent).toBe('印刷'); expect(value.loaded[0].i18n!.locale).toBe('de-DE'); await fixed!.destroy!()
  })
  it('respects explicit equal nested options and retains inherited grandchildren without reload', async () => {
    const value = fixture(); const messages = { 'toolbar.print': 'Same text' };
    value.viewer.updateOptions({ messages }); await value.viewer.load(source); const context = value.loaded[0];
    const fixedTarget = document.createElement('div'), inheritedTarget = document.createElement('div'), grandTarget = document.createElement('div'); value.host.append(fixedTarget, inheritedTarget, grandTarget);
    const fixed = await context.renderNestedBuffer!(source.buffer, 'live', fixedTarget, { ...context, options: { locale: 'en-US', messages } });
    const inherited = await context.renderNestedBuffer!(source.buffer, 'live', inheritedTarget, { ...context, options: undefined });
    const childContext = value.loaded[2];
    const grand = await childContext.renderNestedBuffer!(source.buffer, 'live', grandTarget, { ...childContext, options: undefined });
    value.viewer.updateOptions({ locale: 'zh-TW', messages: { 'toolbar.print': 'Parent changed' } });
    expect(fixedTarget.querySelector('button')!.textContent).toBe('Same text'); expect(value.loaded[1].i18n!.locale).toBe('en-US');
    expect(inheritedTarget.querySelector('button')!.textContent).toBe('Parent changed'); expect(grandTarget.querySelector('button')!.textContent).toBe('Parent changed');
    expect(value.load).toHaveBeenCalledTimes(4); await grand!.destroy!(); await inherited!.destroy!(); await fixed!.destroy!();
  })
  it('disposes a manually destroyed returned session once and detaches locale callbacks', async () => {
    const value = fixture(); const session = await value.viewer.load(source); const notify = vi.fn(); value.loaded[0].i18n!.subscribe(notify)
    await session!.destroy!(); value.viewer.updateOptions({ locale: 'zh-TW' }); expect(notify).not.toHaveBeenCalled(); await value.viewer.unload(); expect(value.destroyed).toHaveBeenCalledOnce()
  })
  it('mountViewer keeps fetch/parse/source identity for a locale-only update', async () => {
    const value = fixture(); const fetchFile = vi.fn(async () => new Blob([new Uint8Array([1])]))
    const controller = mountViewer(value.host, { url: '/fixture.live', filename: 'fixture.live', options: { locale: 'en-US', autoRenderers: false, styleIsolation: 'none' } }, { registry: value.registry, fetchFile })
    try {
      await vi.waitFor(() => expect(value.load).toHaveBeenCalledOnce())
      await vi.waitFor(() => expect(controller.getState().ready).toBe(true))
      const body = value.host.querySelector('p'); await controller.update({ options: { locale: 'zh-TW', autoRenderers: false, styleIsolation: 'none' } })
      expect(value.host.querySelector('[data-locale-label]')!.textContent).toBe('列印'); expect(value.host.querySelector('p')).toBe(body); expect(fetchFile).toHaveBeenCalledOnce(); expect(value.load).toHaveBeenCalledOnce()
    } finally { controller.destroy() }
  })
})

// Every gate is controlled by the test, not an elapsed-time assumption.
describe('async session cleanup ownership', () => {
  const setup = (reject = false, gateHook: boolean | 'complete' = false) => {
    const entered = deferred(), release = deferred();
    const destroys: string[] = [], contexts: Record<string, FileRenderContext> = {};
    const adapters: Record<string, { toHtml: () => string }> = {};
    const registry = createRendererRegistry([{ id: 'async-owned', label: 'Async owned', category: 'document', extensions: ['owned'], load: async context => {
      const name = context.source.filename!;
      contexts[name] = context.renderContext!;
      adapters[name] = { toHtml: () => name }; context.registerExportAdapter(adapters[name]);
      const label = document.createElement('button'); context.surface.container.append(label);
      const bindings = createFileViewerI18nBindings(context.renderContext!.i18n);
      bindings.text(label, () => context.renderContext!.i18n!.t('toolbar.print'));
      return { destroy: async () => {
        destroys.push(name); bindings.destroy();
        if (name === 'old.owned' && !gateHook) { entered.resolve(); await release.promise; if (reject) throw Error('old cleanup failed'); }
      } };
    } }]);
    const host = document.createElement('main'); document.body.append(host);
    const viewer = createViewer(host, { registry, options: { locale: 'en-US', autoRenderers: false, styleIsolation: 'none', hooks: gateHook ? {
      [gateHook === 'complete' ? 'onUnloadComplete' : 'onUnloadStart']: async context => { if (context.filename === 'old.owned') { entered.resolve(); await release.promise; } },
    } : undefined } });
    viewers.push(viewer);
    const load = (filename: string) => viewer.load({ buffer: new Uint8Array([1]).buffer, filename });
    return { viewer, host, load, entered, release, destroys, contexts, adapters };
  };
  it.each(['unload-load', 'replace-replace', 'manual-unload', 'unload-hook', 'unload-complete-hook'] as const)('preserves the new session through %s', async mode => {
    const f = setup(false, mode === 'unload-complete-hook' ? 'complete' : mode === 'unload-hook');
    const old = (await f.load('old.owned'))!;
    const oldNotify = vi.fn(); f.contexts['old.owned'].i18n!.subscribe(oldNotify);
    let first: Promise<unknown>;
    if (mode === 'manual-unload') {
      first = old.destroy!() as Promise<void>;
      expect(old.destroy!()).toBe(first);
    } else first = mode === 'replace-replace' ? f.load('intermediate.owned') : f.viewer.unload();
    await f.entered.promise;
    const next = mode === 'manual-unload'
      ? f.viewer.unload().then(() => f.load('new.owned')) : f.load('new.owned');
    f.viewer.updateOptions({ locale: 'zh-TW' }); expect(oldNotify).not.toHaveBeenCalled();
    f.release.resolve(); await first; await next;
    expect(f.viewer.getSource()?.filename).toBe('new.owned');
    expect(f.viewer.getExportAdapter()).toBe(f.adapters['new.owned']);
    expect(f.destroys).toEqual(['old.owned']);
    const node = f.host.querySelector('button');
    f.viewer.updateOptions({ locale: 'ja-JP' }); expect(node!.textContent).toBe('印刷'); expect(f.host.querySelector('button')).toBe(node);
    await f.viewer.destroy(); expect(f.destroys).toEqual(['old.owned', 'new.owned']);
  });
  it('shares rejected destruction and retires only its old state', async () => {
    const f = setup(true); const old = (await f.load('old.owned'))!;
    const first = old.destroy!() as Promise<void>; const handled = first.catch(error => error);
    expect(old.destroy!()).toBe(first);
    await f.entered.promise; const unload = f.viewer.unload().catch(error => error);
    f.release.resolve(); expect((await handled).message).toBe('old cleanup failed'); expect((await unload).message).toBe('old cleanup failed');
    expect(f.viewer.getSource()).toBeNull(); await f.load('new.owned');
    expect(f.viewer.getSource()?.filename).toBe('new.owned'); await f.viewer.destroy(); expect(f.destroys).toEqual(['old.owned', 'new.owned']);
  });
  it('shares viewer destruction and rejects late replacement ownership', async () => {
    const f = setup(); await f.load('old.owned');
    const first = f.viewer.destroy(); expect(f.viewer.destroy()).toBe(first);
    await f.entered.promise; expect(await f.load('late.owned')).toBeNull();
    f.release.resolve(); await first; expect(f.viewer.getSource()).toBeNull(); expect(f.destroys).toEqual(['old.owned']);
  });
});
