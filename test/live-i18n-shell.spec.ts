// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { effectScope, reactive } from 'vue';
import { createRendererRegistry, createViewer, formatFileViewerErrorMessage, reportFileViewerPreviewLoadError, resolveFileViewerPreviewLoadErrorMessage, normalizeFileViewerErrorMessage, createFileViewerI18nBindings, createFileViewerLoadingController, createFileViewerLoadStartState, commitFileViewerLoadStartState, commitFileViewerRemoteDownloadState, reportFileViewerMissingRemoteData, translateFileViewerMessage } from '../packages/core/src';
import { mountViewer } from '../packages/core/src/browser';
import { useLoading } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useLoading';
const cleanup: Array<() => void> = [];
afterEach(() => { cleanup.splice(0).reverse().forEach(fn => fn()); document.body.replaceChildren(); });
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
const fixture = async (input: { doc?: Document; locale?: string; wait?: Promise<void>; error?: unknown; shadow?: boolean } = {}) => {
  const doc = input.doc || document, host = doc.createElement('div'); doc.body.append(host);
  const load = vi.fn(async context => {
    if (input.wait) await input.wait;
    if (input.error) throw input.error;
    const label = doc.createElement('button'), body = doc.createElement('p'); body.textContent = 'Original document preview.reading';
    context.surface.container.append(label, body);
    const bindings = createFileViewerI18nBindings(context.renderContext.i18n);
    bindings.text(label, () => context.renderContext.i18n.t('toolbar.print'));
    return { destroy: () => bindings.destroy() };
  });
  const registry = createRendererRegistry([{ id: 'shell-i18n', label: 'Shell i18n', extensions: ['shell'], category: 'document', capabilities: { search: true, print: true }, load }]);
  const options = { locale: input.locale || 'en-US', autoRenderers: false, styleIsolation: input.shadow ? 'shadow' as const : 'none' as const };
  const viewer = mountViewer(host, { file: new File(['body'], 'test.shell'), options }, { registry }); cleanup.push(() => viewer.destroy());
  await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
  if (!input.wait && !input.error) await vi.waitFor(() => expect(viewer.getState().ready).toBe(true));
  const root = host.shadowRoot || host;
  return { viewer, host, root, options, load };
};
const text = (root: ParentNode, selector: string) => root.querySelector(selector)?.textContent;
describe('shared shell language and owned controls', () => {
  it('uses iframe auto for both shell and renderer, independently, then deletes overrides', async () => {
    const iframe = document.createElement('iframe'); document.body.append(iframe); const doc = iframe.contentDocument!;
    Object.defineProperty(doc.defaultView!.navigator, 'languages', { configurable: true, value: ['zh-HK'] });
    const main = await fixture(); const foreign = await fixture({ doc, locale: 'auto' });
    const print = '[data-viewer-toolbar-key="print"]';
    expect(text(foreign.root, print)).toBe('打印');
    Object.defineProperty(doc.defaultView!.navigator, 'languages', { configurable: true, value: ['ja-JP'] });
    doc.defaultView!.dispatchEvent(new doc.defaultView!.Event('languagechange'));
    expect(text(foreign.root, print)).toBe('印刷'); expect(text(main.root, print)).toBe('Print');
    await foreign.viewer.update({ options: { ...foreign.options, locale: 'en-US', messages: { 'toolbar.print': 'Fixed custom' } } });
    expect(text(foreign.root, print)).toBe('Fixed custom');
    await foreign.viewer.update({ options: { autoRenderers: false, styleIsolation: 'none' } });
    expect(text(foreign.root, print)).toBe('印刷');
    await foreign.viewer.update({ options: { ...foreign.options, locale: undefined, messages: undefined, i18n: undefined } });
    expect(text(foreign.root, print)).toBe('印刷'); expect(foreign.load).toHaveBeenCalledOnce();
  });
  it('clears grouped overrides and sends one explicit resolver notification, none for unrelated updates', async () => {
    const f = await fixture(); const print = '[data-viewer-toolbar-key="print"]';
    await f.viewer.update({ options: { ...f.options, i18n: { locale: 'zh-HK', messages: { 'toolbar.print': 'Grouped fixed' } } } });
    expect(text(f.root, print)).toBe('Grouped fixed');
    await f.viewer.update({ options: { ...f.options, i18n: undefined } }); expect(text(f.root, print)).toBe('Print');
    let value = 'One'; const messages = (key: string) => key === 'toolbar.print' ? value : undefined;
    await f.viewer.update({ options: { ...f.options, messages } });
    const notified = vi.fn(); f.load.mock.calls[0][0].renderContext.i18n.subscribe(notified);
    value = 'Two'; await f.viewer.update({ options: { ...f.options, messages } });
    expect(text(f.root, print)).toBe('Two'); expect(notified).toHaveBeenCalledOnce();
    await f.viewer.update({ onStateChange: () => {} }); expect(notified).toHaveBeenCalledOnce();
    await f.viewer.update({ options: { ...f.options, messages: undefined } }); expect(text(f.root, print)).toBe('Print');
  });
  it.each([false, true])('retains input, draft, caret, focus and no blur in shadow=%s', async shadow => {
    const f = await fixture({ shadow }); const input = f.root.querySelector<HTMLInputElement>('[data-viewer-toolbar-key="search-input"]')!;
    input.value = 'continuous draft'; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); input.setSelectionRange(2, 6, 'backward');
    const blur = vi.fn(); input.addEventListener('blur', blur);
    for (const locale of ['zh-TW', 'ja-JP', 'zh-HK', 'de-DE', 'en-US']) {
      await f.viewer.update({ options: { ...f.options, locale } });
      expect(f.root.querySelector('[data-viewer-toolbar-key="search-input"]')).toBe(input);
      expect(input.value).toBe('continuous draft'); expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([2, 6, 'backward']);
      expect(f.root instanceof ShadowRoot ? f.root.activeElement : document.activeElement).toBe(input);
    }
    expect(blur).not.toHaveBeenCalled(); expect(f.load).toHaveBeenCalledOnce();
    await f.viewer.update({ options: { ...f.options, toolbar: { search: false } } });
    const title = input.title; await f.viewer.update({ options: { ...f.options, toolbar: { search: false }, locale: 'zh-TW' } }); expect(input.title).toBe(title);
  });
  it('refreshes pending feedback in place and keeps raw failure details unchanged', async () => {
    const gate = deferred(); const f = await fixture({ wait: gate.promise, error: Error('Raw application error preview.reading') });
    const message = f.root.querySelector('.file-viewer-web-source-status p')!;
    expect(message.textContent).toBe('Parsing file content...');
    await f.viewer.update({ options: { ...f.options, locale: 'ja-JP' } });
    expect(f.root.querySelector('.file-viewer-web-source-status p')).toBe(message);
    expect(message.textContent).toBe(translateFileViewerMessage({ locale: 'ja-JP' }, 'preview.reading'));
    gate.resolve(); await vi.waitFor(() => expect(f.viewer.getState().error).toBeTruthy());
    const error = f.root.querySelector('.file-viewer-render-error p')!, title = f.root.querySelector('.file-viewer-render-error strong')!;
    await f.viewer.update({ options: { ...f.options, locale: 'zh-TW' } });
    expect(error.textContent).toBe('Raw application error preview.reading'); expect(f.root.querySelector('.file-viewer-render-error p')).toBe(error);
    expect(title.textContent).toBe(translateFileViewerMessage({ locale: 'zh-TW' }, 'state.error.title')); expect(f.load).toHaveBeenCalledOnce();
  });
});
describe('semantic built-in feedback with legacy string compatibility', () => {
  it('retains metadata for built-in phases but never guesses custom translated-looking strings', () => {
    const controller = createFileViewerLoadingController('txt', { locale: 'en-US' });
    controller.startLoading('Parsing file content...'); controller.setI18n({ locale: 'ja-JP' }); expect(controller.getState().message).toBe('Parsing file content...');
    for (const key of ['preview.downloading','preview.reading','preview.streamingPdf'] as const) {
      controller.setLoadingMessage('old text', { key }); controller.setI18n({ locale: 'zh-TW' }); expect(controller.getState().message).toBe(translateFileViewerMessage({ locale: 'zh-TW' }, key));
      controller.setI18n({ locale: 'ja-JP' }); expect(controller.getState().message).toBe(translateFileViewerMessage({ locale: 'ja-JP' }, key));
    }
    controller.showError('raw custom preview.reading'); controller.setI18n({ locale: 'zh-HK' }); expect(controller.getState().error).toBe('raw custom preview.reading');
    controller.showError('old fallback', { key: 'error.remoteDownload' }); controller.setI18n({ locale: 'ja-JP' }); expect(controller.getState().error).toBe(translateFileViewerMessage({ locale: 'ja-JP' }, 'error.remoteDownload'));
  });
  it('forwards optional source metadata while old one-argument callbacks receive the same strings', () => {
    const oldMessages: string[] = []; const legacy = (message: string) => { oldMessages.push(message); };
    const onStart = vi.fn(legacy);
    const built = () => createFileViewerLoadStartState({ version: 1, source: 'file', filename: 'x.txt', i18n: { locale: 'en-US' } });
    commitFileViewerLoadStartState({ version: 1, buildState: built, onStartLoading: onStart });
    expect(onStart).toHaveBeenLastCalledWith('Parsing file content...', { key: 'preview.reading' });
    commitFileViewerLoadStartState({ version: 1, buildState: () => createFileViewerLoadStartState({ version: 1, source: 'url', loadingMessage: 'Custom progress' }), onStartLoading: onStart });
    expect(oldMessages).toEqual(['Parsing file content...', 'Custom progress']);
    const reading = vi.fn(legacy); commitFileViewerRemoteDownloadState({ version: 1, data: new File(['x'], 'x.txt'), isCurrent: () => true, i18n: { locale: 'en-US' }, onSetLoadingMessage: reading });
    expect(reading).toHaveBeenLastCalledWith('Parsing file content...', { key: 'preview.reading' });
    const missing = vi.fn(); reportFileViewerMissingRemoteData({ i18n: { locale: 'en-US' }, onErrorMessage: missing }); expect(missing.mock.calls[0][1]).toEqual({ key: 'error.remoteDownload' });
  });
  it('Vue pending language watch refreshes semantic copy and preserves custom errors', () => {
    const scope = effectScope(); const options = reactive({ locale: 'en-US' }); let loading!: ReturnType<typeof useLoading>;
    scope.run(() => { loading = useLoading('txt', () => options); }); cleanup.push(() => scope.stop());
    loading.startLoading('old', { key: 'preview.reading' }); options.locale = 'zh-HK'; expect(loading.message.value).toBe(translateFileViewerMessage(options, 'preview.reading'));
    loading.showError('Raw custom error'); options.locale = 'ja-JP'; expect(loading.error.value).toBe('Raw custom error');
  });
});

describe('owned source error prefixes with fixed detail and legacy contracts', () => {
  const locales = ['en-US', 'zh-CN', 'zh-TW', 'zh-HK', 'ja-JP', 'de-DE'];
  it.each(['local', 'load', 'stream'] as const)('updates only %s built-in prefix, with one normalization and one failure notification', kind => {
    const order: string[] = []; let reads = 0;
    const raw = { get message() { reads++; return 'Original error preview.reading'; } };
    const controller = createFileViewerLoadingController('txt', { locale: 'en-US' });
    const onError = vi.fn((message: string, metadata?: Parameters<typeof controller.showError>[1]) => { order.push('error'); controller.showError(message, metadata); });
    const message = reportFileViewerPreviewLoadError({ kind, error: raw, formatErrorMessage: formatFileViewerErrorMessage, i18n: { locale: 'en-US' }, onLogError: error => { expect(error).toBe(raw); order.push('log'); }, onErrorMessage: onError });
    expect(order).toEqual(['log', 'error']); expect(reads).toBe(1); expect(onError.mock.calls[0][0]).toBe(message);
    const key = kind === 'local' ? 'error.localRead' : kind === 'load' ? 'error.load' : 'error.stream';
    expect(onError.mock.calls[0][1]).toEqual({ key, detail: 'Original error preview.reading' });
    for (const locale of locales) for (let repeat = 0; repeat < 2; repeat++) {
      controller.setI18n({ locale });
      expect(controller.getState().error).toBe(formatFileViewerErrorMessage(translateFileViewerMessage({ locale }, key), 'Original error preview.reading', { locale }));
    }
    expect(reads).toBe(1); expect(onError).toHaveBeenCalledOnce(); expect(order).toEqual(['log', 'error']);
  });
  it.each([new Error('Raw error'), 'error.localRead', 42, null, undefined, {}, { message: 'Object detail' }, { reason: 'Reason detail' }, 'Blob is not available in the current execution environment.'])('normalizes %j once at failure and never retranslates its normalized detail', raw => {
    const options = { locale: 'en-US' }; const detail = normalizeFileViewerErrorMessage(raw, options);
    const controller = createFileViewerLoadingController('txt', options); let first = '';
    const result = reportFileViewerPreviewLoadError({ kind: 'local', error: raw, formatErrorMessage: formatFileViewerErrorMessage, i18n: options, onLogError: null, onErrorMessage: (message, metadata) => { first = message; controller.showError(message, metadata); } });
    expect(result).toBe(resolveFileViewerPreviewLoadErrorMessage({ kind: 'local', error: raw, formatErrorMessage: formatFileViewerErrorMessage, i18n: options })); expect(result).toBe(first);
    controller.setI18n({ locale: 'zh-TW' });
    // Build expected punctuation without passing detail through the error normalizer a second time.
    expect(controller.getState().error).toBe(`${translateFileViewerMessage({ locale: 'zh-TW' }, 'error.localRead')}：${detail}`);
  });
  it.each(['Custom prefix', 'Failed to read local file', ''])('keeps explicit prefix %j and its old one-argument callback immutable', prefix => {
    const controller = createFileViewerLoadingController('txt', { locale: 'en-US' }); const callback = vi.fn((message: string) => controller.showError(message));
    const input = { kind: 'local' as const, error: Error('Raw'), prefixes: { local: prefix }, formatErrorMessage: formatFileViewerErrorMessage, i18n: { locale: 'en-US' } };
    const result = reportFileViewerPreviewLoadError({ ...input, onLogError: null, onErrorMessage: callback });
    expect(result).toBe(resolveFileViewerPreviewLoadErrorMessage(input)); expect(callback.mock.calls).toEqual([[result]]);
    for (const locale of locales) controller.setI18n({ locale }); expect(controller.getState().error).toBe(result);
  });
  it('calls a custom formatter exactly once, keeps its string/return/order and never guesses identity', () => {
    const order: string[] = [], raw = Error('Raw');
    const formatter = vi.fn((prefix: string, error: unknown) => { order.push('format'); expect(error).toBe(raw); return `Custom ${prefix} / ${String(error)}`; });
    const callback = vi.fn((message: string) => { order.push('callback'); expect(message).toContain('Custom'); });
    const result = reportFileViewerPreviewLoadError({ kind: 'stream', error: raw, formatErrorMessage: formatter, i18n: { locale: 'en-US' }, onLogError: () => order.push('log'), onErrorMessage: callback });
    expect(order).toEqual(['log', 'format', 'callback']); expect(callback.mock.calls).toEqual([[result]]); expect(formatter).toHaveBeenCalledOnce();
  });
  it('snapshots optional metadata and clears it on recovery; no-metadata strings stay literal', () => {
    const controller = createFileViewerLoadingController('txt', { locale: 'en-US' });
    const metadata = { key: 'error.load' as const, detail: 'Original' }; controller.showError('old', metadata); metadata.detail = 'Changed externally';
    controller.setI18n({ locale: 'ja-JP' }); expect(controller.getState().error).toContain('Original');
    controller.clearError(); controller.setI18n({ locale: 'de-DE' }); expect(controller.getState().error).toBe('');
    controller.showError('Failed to read local file: Literal'); controller.setI18n({ locale: 'zh-HK' }); expect(controller.getState().error).toBe('Failed to read local file: Literal');
    controller.startLoading('progress'); controller.setI18n({ locale: 'ja-JP' }); expect(controller.getState().error).toBe('');
  });
  it('Vue hook forwards metadata and refreshes display without re-emitting the error', () => {
    const scope = effectScope(); const options = reactive({ locale: 'en-US' }); const onError = vi.fn(); let loading!: ReturnType<typeof useLoading>;
    scope.run(() => { loading = useLoading('txt', () => options, onError); }); cleanup.push(() => scope.stop());
    const message = reportFileViewerPreviewLoadError({ kind: 'load', error: Error('Raw'), formatErrorMessage: formatFileViewerErrorMessage, i18n: options, onLogError: null, onErrorMessage: loading.showError });
    for (const locale of locales) options.locale = locale;
    expect(loading.error.value).toBe(`${translateFileViewerMessage(options, 'error.load')}: Raw`); expect(onError.mock.calls).toEqual([[message]]);
  });
});

// Independent v4 review regressions, unchanged assertions.
const dispose:Array<()=>unknown>=[];
afterEach(async()=>{for(const fn of dispose.splice(0).reverse())await fn();document.body.replaceChildren()});
const root=()=>{const e=document.createElement('div');document.body.append(e);return e};
describe('independent raw-error snapshot contract',()=>{
 it.each(['Error','object'])('acquisition %s snapshots the first detail across locale-only updates',async kind=>{
  let detail='Original acquisition detail',reads=0;const raw=kind==='Error'?new Error():{};Object.defineProperty(raw,'message',{get(){reads++;return detail}});
  const fetchFile=vi.fn(async()=>{throw raw}),onError=vi.fn(),options={locale:'en-US',autoRenderers:false,styleIsolation:'none' as const};
  const e=root(),viewer=mountViewer(e,{url:'https://example.invalid/x.txt',options},{fetchFile,onError});dispose.push(()=>viewer.destroy());await vi.waitFor(()=>expect(onError).toHaveBeenCalledOnce());
  const p=e.querySelector('.file-viewer-web-source-status p')!,first=p.textContent,count=reads;detail='Changed externally';await viewer.update({options:{...options,locale:'ja-JP'}});
  expect.soft(p.textContent).toBe(first);expect.soft(reads).toBe(count);expect(fetchFile).toHaveBeenCalledOnce();expect(onError).toHaveBeenCalledOnce();expect(e.querySelector('.file-viewer-web-source-status p')).toBe(p);
 });
 it('renderer Error getter is read once and never replaces the rejection or removes the panel',async()=>{
  let reads=0;const original=new Error();Object.defineProperty(original,'message',{get(){if(++reads>1)throw Error('Unexpected repeated getter');return 'Original renderer detail'}});
  const registry=createRendererRegistry([{id:'r',label:'Review',extensions:['rev'],category:'document',load:async()=>{throw original}}]);const e=root(),viewer=createViewer(e,{registry,options:{locale:'en-US',autoRenderers:false,styleIsolation:'none'}});dispose.push(()=>viewer.destroy());
  const outcome=await viewer.load({filename:'test.rev',buffer:new Uint8Array([1]).buffer}).catch(e=>e);
  expect.soft(reads).toBe(1);expect.soft(outcome===original).toBe(true);expect.soft(e.querySelector('.file-viewer-render-error p')?.textContent).toBe('Original renderer detail');
 });
 it.each(['local','load','stream'] as const)('default %s metadata snapshots original Error getter and preserves legacy customization',kind=>{
  let reads=0;const raw=new Error();Object.defineProperty(raw,'message',{get(){if(++reads>1)throw Error('Unexpected repeated getter');return 'Original source detail'}});
  const controller=createFileViewerLoadingController('txt',{locale:'en-US'});const callback=vi.fn((text,metadata)=>controller.showError(text,metadata));
  const first=reportFileViewerPreviewLoadError({kind,error:raw,formatErrorMessage:formatFileViewerErrorMessage,i18n:{locale:'en-US'},onLogError:null,onErrorMessage:callback});
  for(const locale of ['ja-JP','zh-TW','de-DE','en-US'])controller.setI18n({locale});expect(reads).toBe(1);expect(controller.getState().error).toBe(first);expect(callback).toHaveBeenCalledOnce();
  const custom=vi.fn(()=> 'Custom literal preview.reading'),oldCallback=vi.fn(message=>controller.showError(message));const result=reportFileViewerPreviewLoadError({kind,error:raw,formatErrorMessage:custom,i18n:{locale:'en-US'},onLogError:null,onErrorMessage:oldCallback});
  controller.setI18n({locale:'zh-HK'});expect(oldCallback.mock.calls).toEqual([[result]]);expect(custom).toHaveBeenCalledOnce();expect(controller.getState().error).toBe('Custom literal preview.reading');expect(reads).toBe(1);
 });
});

describe('failure snapshot ownership across retry, recovery and language refresh', () => {
  it.each(['Error', 'object', 'toString'])('resnapshots reused %s only on a new acquisition failure', async kind => {
    let reads = 0, detail = 'First acquisition failure', fail = true;
    const raw = kind === 'Error' ? new Error() : {};
    if (kind === 'toString') Object.defineProperty(raw, 'toString', { value: () => { reads++; return detail; } });
    else Object.defineProperty(raw, 'message', { get() { reads++; return detail; } });
    const fetchFile = vi.fn(async () => { if (fail) throw raw; return new Blob(['ok']); }); const onError = vi.fn();
    const registry = createRendererRegistry([{ id: 'snapshot-ready', label: 'Snapshot', category: 'document', extensions: ['snap'], load: async context => { context.surface.container.textContent = 'Ready'; return {}; } }]);
    const e = root(), options = { locale: 'en-US', autoRenderers: false, styleIsolation: 'none' as const };
    const viewer = mountViewer(e, { url: 'https://example.invalid/reused.snap', options }, { registry, fetchFile, onError }); dispose.push(() => viewer.destroy());
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce()); const p = e.querySelector('.file-viewer-web-source-status p')!; detail = 'Second acquisition failure';
    for (const locale of ['zh-CN', 'zh-TW', 'zh-HK', 'ja-JP', 'de-DE', 'en-US']) {
      await viewer.update({ options: { ...options, locale } }); expect(p.textContent).toBe('First acquisition failure');
    }
    expect(reads).toBe(1); expect(fetchFile).toHaveBeenCalledOnce(); expect(onError).toHaveBeenCalledOnce();
    const second = await viewer.reload().catch(error => error); expect(second).toBe(raw); expect(reads).toBe(2); expect(onError).toHaveBeenCalledTimes(2);
    expect(e.querySelector('.file-viewer-web-source-status p')?.textContent).toBe('Second acquisition failure');
    fail = false; await viewer.reload(); expect(viewer.getState().ready).toBe(true); expect(e.querySelector('.file-viewer-web-source-status')).toBeNull();
    fail = true; detail = 'Third acquisition failure'; await viewer.reload().catch(error => expect(error).toBe(raw));
    expect(reads).toBe(3); expect(fetchFile).toHaveBeenCalledTimes(4); expect(onError).toHaveBeenCalledTimes(3);
    expect(e.querySelector('.file-viewer-web-source-status p')?.textContent).toBe('Third acquisition failure');
  });
  it.each(['Error', 'object', 'toString'])('keeps %s renderer detail fixed without rereading it for owned headings', async kind => {
    let reads = 0, detail = 'Original renderer detail'; const raw = kind === 'Error' ? new Error() : {};
    if (kind === 'toString') Object.defineProperty(raw, 'toString', { value: () => { reads++; return detail; } });
    else Object.defineProperty(raw, 'message', { get() { reads++; return detail; } });
    const load = vi.fn(async () => { throw raw; }); const registry = createRendererRegistry([{ id: 'snapshot-error', label: 'Snapshot', category: 'document', extensions: ['snap'], load }]);
    const e = root(), viewer = createViewer(e, { registry, options: { locale: 'en-US', autoRenderers: false, styleIsolation: 'none' } }); dispose.push(() => viewer.destroy());
    const rejected = await viewer.load({ filename: 'test.snap', buffer: new Uint8Array([1]).buffer }).catch(error => error); expect(rejected).toBe(raw);
    const p = e.querySelector('.file-viewer-render-error p')!; detail = 'Externally changed';
    for (const locale of ['zh-CN', 'zh-TW', 'zh-HK', 'ja-JP', 'de-DE', 'en-US']) {
      viewer.updateOptions({ locale }); expect(p.textContent).toBe('Original renderer detail');
      expect(e.querySelector('.file-viewer-render-error strong')?.textContent).toBe(translateFileViewerMessage({ locale }, 'state.error.title'));
    }
    expect(reads).toBe(1); expect(load).toHaveBeenCalledOnce();
    await viewer.load({ filename: 'test.snap', buffer: new Uint8Array([1]).buffer }).catch(error => expect(error).toBe(raw));
    expect(reads).toBe(2); expect(e.querySelector('.file-viewer-render-error p')?.textContent).toBe('Externally changed');
  });
  it('preserves pre-existing first Error.message getter throw behavior without swallowing it', async () => {
    const firstAccessError = new Error('First getter throws'), original = new Error(); let reads = 0;
    Object.defineProperty(original, 'message', { get() { reads++; throw firstAccessError; } });
    const registry = createRendererRegistry([{ id: 'first-getter', label: 'Snapshot', category: 'document', extensions: ['snap'], load: async () => { throw original; } }]);
    const e = root(), viewer = createViewer(e, { registry, options: { locale: 'en-US', autoRenderers: false, styleIsolation: 'none' } }); dispose.push(() => viewer.destroy());
    const rejected = await viewer.load({ filename: 'test.snap', buffer: new Uint8Array([1]).buffer }).catch(error => error);
    expect(rejected).toBe(firstAccessError); expect(reads).toBe(1); expect(e.querySelector('.file-viewer-render-error')).toBeNull();
  });
  it.each([null, undefined])('retains explicit owned fallback for nullish %s without guessing raw detail', async raw => {
    const e = root(), options = { locale: 'en-US', autoRenderers: false, styleIsolation: 'none' as const }, onError = vi.fn();
    const viewer = mountViewer(e, { url: 'https://example.invalid/null.snap', options }, { fetchFile: async () => { throw raw; }, onError }); dispose.push(() => viewer.destroy());
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    for (const locale of ['zh-CN', 'zh-TW', 'zh-HK', 'ja-JP', 'de-DE', 'en-US']) {
      await viewer.update({ options: { ...options, locale } });
      expect(e.querySelector('.file-viewer-web-source-status p')?.textContent).toBe(translateFileViewerMessage({ locale }, 'error.unknown'));
    }
    expect(onError.mock.calls[0][0]).toBe(raw); expect(onError).toHaveBeenCalledOnce();
  });
});

describe('preview default logger captured detail boundary', () => {
  afterEach(() => vi.restoreAllMocks());
  it('logs captured text, never inspects raw Error, and captures each failure anew', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    let reads = 0;
    const raw = new Error();
    Object.defineProperty(raw, 'message', { get: () => `capture ${++reads}` });
    const report = () => reportFileViewerPreviewLoadError({ kind: 'local', error: raw, formatErrorMessage: formatFileViewerErrorMessage });
    expect(report()).toContain('capture 1'); expect(report()).toContain('capture 2');
    expect(reads).toBe(2); expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls.every(args => args.length === 1 && typeof args[0] === 'string')).toBe(true);
  });
  it('preserves first getter failure and custom logger identity, arity and ordering', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const raw = new Error(), sentinel = new Error('getter');
    Object.defineProperty(raw, 'message', { get: () => { throw sentinel; } });
    expect(() => reportFileViewerPreviewLoadError({kind:'local', error:raw, formatErrorMessage:formatFileViewerErrorMessage})).toThrow(sentinel);
    expect(log).not.toHaveBeenCalled();
    const calls: string[] = []; const custom = vi.fn((reason: unknown) => { expect(reason).toBe(raw); calls.push('logger'); });
    reportFileViewerPreviewLoadError({kind:'local',error:raw,onLogError:custom,formatErrorMessage:()=>{calls.push('formatter');return 'safe';}});
    expect(custom.mock.calls[0]).toEqual([raw]); expect(calls).toEqual(['logger','formatter']);
  });
  it('does not commit UI after console throws and tolerates recursive formatting without cached detail', () => {
    const sentinel = new Error('console'); const onErrorMessage = vi.fn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => { throw sentinel; });
    expect(() => reportFileViewerPreviewLoadError({kind:'local',error:'detail',formatErrorMessage:formatFileViewerErrorMessage,onErrorMessage})).toThrow(sentinel);
    expect(onErrorMessage).not.toHaveBeenCalled(); log.mockImplementation(() => {});
    const values: string[] = [];
    reportFileViewerPreviewLoadError({kind:'local',error:'outer',formatErrorMessage:()=>{
      values.push(reportFileViewerPreviewLoadError({kind:'local',error:'inner',formatErrorMessage:formatFileViewerErrorMessage}));return 'outer-result';},onErrorMessage:message=>values.push(message)});
    expect(values[0]).toContain('inner'); expect(values[1]).toBe('outer-result');
  });
});

describe('source error publication ownership after reentrant callbacks', () => {
  afterEach(() => vi.restoreAllMocks());
  for (const phase of ['formatter', 'console'] as const) it(`does not publish old failure after ${phase} replaces request`, async () => {
    const { createFileViewerSourceLoadingActionHandlers, createFileViewerRequestController } = await import('../packages/core/src');
    const controller = createFileViewerRequestController(); const version = controller.createVersion();
    const raw = new Error('old detail'), show = vi.fn();
    const original = console.error.bind(console);
    vi.spyOn(console, 'error').mockImplementation((...args) => { original(...args); if (phase === 'console') controller.createVersion(); });
    const actions = createFileViewerSourceLoadingActionHandlers({
      getFile: () => null, getUrl: () => 'https://example.test/a.txt',
      previewTarget: {} as any, requestController: controller,
      downloadFile: async () => { throw raw; }, mountRenderedContent: async () => undefined,
      buildLoadStartState: () => ({filename:'a.txt',extension:'txt',loadingMessage:'loading'}) as any,
      buildRenderCompleteState: () => ({}) as any,
      formatErrorMessage: phase === 'formatter' ? (() => { controller.createVersion(); return 'old detail'; }) : formatFileViewerErrorMessage,
      onShowError: show,
    });
    const result = await actions.previewRemoteFile('https://example.test/a.txt', version);
    expect(result.error).toBe(raw); expect(controller.version).toBe(version + 1); expect(show).not.toHaveBeenCalled();
  });
});


describe('shell source-only loads retain mount options', () => {
  it('preserves locale, messages and renderer options without retaining the previous source', async () => {
    const f = await fixture();
    const options = { ...f.options, messages: { 'toolbar.print': 'Custom print' }, spreadsheet: { worker: false } };
    await f.viewer.update({ options });
    const next = new Uint8Array([7, 8, 9]).buffer;
    await f.viewer.load({ buffer: next, filename: 'next.shell' });
    const context = f.load.mock.calls.at(-1)![0];
    expect(context.source.filename).toBe('next.shell');
    expect(context.source.buffer).toEqual(next);
    expect(context.source.file).toBeUndefined();
    expect(context.source.url).toBeUndefined();
    expect(context.options.autoRenderers).toBe(false);
    expect(context.options.spreadsheet).toEqual({ worker: false });
    expect(context.renderContext.i18n.locale).toBe('en-US');
    expect(context.renderContext.i18n.t('toolbar.print')).toBe('Custom print');
    expect(text(f.root, '[data-viewer-toolbar-key="print"]')).toBe('Custom print');
  });
  it('honors explicit empty options by clearing inherited language overrides', async () => {
    const iframe = document.createElement('iframe'); document.body.append(iframe);
    const doc = iframe.contentDocument!;
    Object.defineProperty(doc.defaultView!.navigator, 'languages', { configurable: true, value: ['ja-JP'] });
    const f = await fixture({ doc });
    await f.viewer.update({ options: { ...f.options, messages: { 'toolbar.print': 'Custom print' } } });
    await f.viewer.load({ buffer: new Uint8Array([2]).buffer, filename: 'reset.shell', options: {} });
    const context = f.load.mock.calls.at(-1)![0];
    expect(context.renderContext.i18n.locale).toBe('ja-JP');
    expect(context.renderContext.i18n.t('toolbar.print')).toBe('印刷');
    expect(text(f.root, '[data-viewer-toolbar-key="print"]')).toBe('印刷');
  });
});

it('source-only load replaces an old URL and buffer instead of merging source fields', async () => {
  const f = await fixture();
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1])));
  try {
    await f.viewer.load({ url: 'https://example.invalid/old.shell', filename: 'old.shell' });
    expect(fetcher).toHaveBeenCalledOnce();
    await f.viewer.load({ buffer: new Uint8Array([4, 5]).buffer, filename: 'replacement.shell' });
    const context = f.load.mock.calls.at(-1)![0];
    expect(context.source.filename).toBe('replacement.shell');
    expect(context.source.buffer).toEqual(new Uint8Array([4, 5]).buffer);
    expect(context.source.url).toBeUndefined();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(context.renderContext.i18n.locale).toBe('en-US');
  } finally { fetcher.mockRestore(); }
});
