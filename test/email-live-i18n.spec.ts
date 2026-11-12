import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFileViewerTranslator,
  disposeFileViewerRendered,
  type FileRenderContext,
  type FileViewerI18nContext,
  type FileViewerRenderedInstance,
} from '../packages/core/src/index';
import { renderFileViewerEmail } from '../packages/renderers/email/src/index';
import renderEmail from '../packages/renderers/email/src/email';
import * as msg from '../packages/renderers/email/src/msg';
import { getMsgLabels } from '../packages/renderers/email/src/msgMessages';
import { createMsgFixture } from '../packages/renderers/email/test/fixtures/msg-fixture.mjs';

// CI uses the license-safe CFB builder; local validation can also exercise the
// exact real MSG bytes served by the browser consumer. Neither route mocks parsing.
const localeFixture = () => process.env.EMAIL_LIVE_MSG_FIXTURE
  ? Uint8Array.from(readFileSync(process.env.EMAIL_LIVE_MSG_FIXTURE)).buffer
  : createMsgFixture();

const locales = ['en-US', 'zh-CN', 'ja-JP', 'de-DE', 'zh-TW', 'zh-HK'] as const;
const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.restoreAllMocks();
});

function liveI18n() {
  let locale: (typeof locales)[number] = 'en-US';
  const listeners = new Set<() => void>();
  const i18n: FileViewerI18nContext = {
    get locale() { return locale; },
    get options() { return { locale }; },
    t: (key, params) => createFileViewerTranslator({ locale })(key, params),
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  return {
    i18n, listeners,
    setLocale(next: typeof locale) {
      locale = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

function host() {
  // No global document: the renderer must create nodes in its target's realm.
  const dom = new JSDOM('<!doctype html><body><div id="target"></div></body>', { pretendToBeVisual: true });
  cleanups.push(() => dom.window.close());
  const target = dom.window.document.querySelector<HTMLDivElement>('#target')!;
  return { dom, target };
}

async function mount(buffer: ArrayBuffer, context: FileRenderContext = {}, type = 'msg') {
  const { dom, target } = host();
  const rendered = await renderEmail(buffer, target, type, context);
  cleanups.push(() => disposeFileViewerRendered(rendered));
  return { dom, target, rendered };
}

const button = (target: Element, selector: string) => target.querySelector<HTMLButtonElement>(selector)!;
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function assertChrome(target: Element, locale: (typeof locales)[number]) {
  const t = createFileViewerTranslator({ locale });
  const labels = getMsgLabels({ locale });
  expect(target.querySelector('.email-meta strong')?.textContent).toBe(t('email.meta.from'));
  expect([...target.querySelectorAll('.email-meta strong')].map(node => node.textContent)).toContain(labels.bcc);
  expect(target.querySelector('.attachment-title strong')?.textContent).toBe(t('email.attachments.title'));
  expect(target.querySelectorAll('.body-tabs button')[1].textContent).toBe(t('email.tabs.text'));
  expect(target.querySelectorAll('.body-tabs button')[2].textContent).toBe(t('email.tabs.headers'));
  const [download, close] = target.querySelectorAll('.attachment-preview-actions button');
  expect(download.textContent).toBe(t('email.attachments.download'));
  expect(close.getAttribute('aria-label')).toBe(labels.close);
  expect(close.getAttribute('title')).toBe(labels.close);
  expect(close.textContent).toBe('×');
}

describe('email live locale ownership', () => {
  it('updates six-locale chrome in place around a real parsed MSG iframe and active attachment', async () => {
    const live = liveI18n();
    const parse = vi.spyOn(msg, 'parseMsg');
    const nestedUnmount = vi.fn();
    const nested = vi.fn(async (_buffer, _type, target, context) => {
      expect(context.i18n).toBe(live.i18n);
      expect(context.options).toMatchObject({ theme: 'dark', text: { wrapLongLines: false } });
      for (const key of ['locale', 'messages', 'i18n']) expect(context.options).not.toHaveProperty(key);
      const input = target.ownerDocument.createElement('input');
      input.value = 'Attachment document data';
      target.append(input);
      return { $el: input, unmount: nestedUnmount };
    });
    const { dom, target, rendered } = await mount(createMsgFixture(), {
      filename: 'locale-fixture.msg', options: { locale: 'en-US', theme: 'dark', text: { wrapLongLines: false } }, i18n: live.i18n, renderNestedBuffer: nested,
    });
    const parsed = await parse.mock.results[0].value;
    const loads = parsed.attachments.map(attachment => vi.spyOn(attachment, 'load'));
    const frame = target.querySelector<HTMLIFrameElement>('.email-html')!;
    const srcdoc = frame.srcdoc;
    const subject = target.querySelector('h2')!;
    const dataNodes = [...target.querySelectorAll('.email-meta p')].map(row => row.lastChild);
    const dataValues = dataNodes.map(node => node?.textContent);
    const attachment = target.querySelectorAll<HTMLButtonElement>('.attachment-item')[1];
    attachment.click();
    await vi.waitFor(() => expect(nested).toHaveBeenCalledTimes(1));
    await flush();
    const input = target.querySelector<HTMLInputElement>('.attachment-target input')!;
    input.focus();
    input.setSelectionRange(3, 8);
    const panel = target.querySelector<HTMLElement>('.attachment-panel')!;
    panel.scrollTop = 19;
    const preview = target.querySelector<HTMLElement>('.attachment-preview')!;
    const loadCounts = loads.map(load => load.mock.calls.length);
    for (const locale of [...locales, 'zh-TW', 'en-US'] as const) {
      live.setLocale(locale);
      assertChrome(target, locale);
      expect(target.querySelector('.email-html')).toBe(frame);
      expect(frame.srcdoc).toBe(srcdoc);
      expect(target.querySelector('h2')).toBe(subject);
      expect(subject.textContent).toBe(parsed.subject);
      expect(dataNodes.map(node => node?.textContent)).toEqual(dataValues);
      expect([...target.querySelectorAll('.email-meta p')].map(row => row.lastChild)).toEqual(dataNodes);
      expect(target.querySelector('.body-tabs button.active')?.textContent).toBe('HTML');
      expect(target.querySelector('.attachment-target input')).toBe(input);
      expect(dom.window.document.activeElement).toBe(input);
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 8]);
      expect(panel.scrollTop).toBe(19);
      expect(preview.hidden).toBe(false);
      expect(attachment.classList.contains('active')).toBe(true);
      expect(parse).toHaveBeenCalledTimes(1);
      expect(nested).toHaveBeenCalledTimes(1);
      expect(loads.map(load => load.mock.calls.length)).toEqual(loadCounts);
      expect(nestedUnmount).not.toHaveBeenCalled();
    }
    button(target, '.attachment-preview-actions button:last-child').click();
    await flush();
    expect(preview.hidden).toBe(true);
    expect(dom.window.document.activeElement).toBe(attachment);
    expect(nestedUnmount).toHaveBeenCalledTimes(1);
    await disposeFileViewerRendered(rendered);
    await disposeFileViewerRendered(rendered);
    expect(live.listeners.size).toBe(0);
    expect(nestedUnmount).toHaveBeenCalledTimes(1);
  });

  it('updates the exact browser-consumer MSG fixture without replacing its parsed body', async () => {
    const live = liveI18n();
    const parse = vi.spyOn(msg, 'parseMsg');
    const { target } = await mount(localeFixture(), { i18n: live.i18n });
    const body = target.querySelector('.email-message-content')!.firstChild;
    const bodyText = body?.textContent;
    const subject = target.querySelector('h2')!.textContent;
    const activeTab = target.querySelector('.body-tabs button.active');
    for (const locale of locales) {
      live.setLocale(locale);
      expect(target.querySelector('.email-message-content')!.firstChild).toBe(body);
      expect(body?.textContent).toBe(bodyText);
      expect(target.querySelector('h2')!.textContent).toBe(subject);
      expect(target.querySelector('.body-tabs button.active')).toBe(activeTab);
      expect(target.querySelector('.attachment-title strong')!.textContent).toBe(createFileViewerTranslator({ locale })('email.attachments.title'));
      expect(button(target, '.attachment-preview-actions button:last-child').getAttribute('aria-label')).toBe(getMsgLabels({ locale }).close);
      expect(parse).toHaveBeenCalledTimes(1);
    }
  });

  it('preserves a selected plain-text body and active tab across repeated locale changes', async () => {
    const live = liveI18n();
    const { dom, target } = await mount(createMsgFixture(), { i18n: live.i18n });
    const tabs = target.querySelectorAll<HTMLButtonElement>('.body-tabs button');
    tabs[1].click();
    await vi.waitFor(() => expect(target.querySelector('.email-text')).not.toBeNull());
    const pre = target.querySelector<HTMLElement>('.email-text')!;
    const text = pre.firstChild!;
    const range = dom.window.document.createRange();
    range.setStart(text, 2);
    range.setEnd(text, 9);
    const selection = dom.window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    pre.scrollTop = 27;
    for (const locale of locales) {
      live.setLocale(locale);
      expect(target.querySelector('.email-text')).toBe(pre);
      expect(pre.firstChild).toBe(text);
      expect(pre.scrollTop).toBe(27);
      expect(selection.anchorNode).toBe(text);
      expect(selection.anchorOffset).toBe(2);
      expect(selection.focusOffset).toBe(9);
      expect(tabs[1].classList.contains('active')).toBe(true);
      expect(tabs[1].getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('updates loading and unavailable copy without retaining discarded labels', async () => {
    const live = liveI18n();
    const { target } = host();
    const pending = renderEmail(createMsgFixture(), target, 'msg', { i18n: live.i18n });
    const loading = target.querySelector('.email-state strong')!;
    expect(loading.textContent).toBe(createFileViewerTranslator({ locale: 'en-US' })('email.loading.parsing'));
    live.setLocale('ja-JP');
    expect(loading.textContent).toBe(createFileViewerTranslator({ locale: 'ja-JP' })('email.loading.parsing'));
    const rendered = await pending;
    cleanups.push(() => disposeFileViewerRendered(rendered));
    const previousLoading = loading.textContent;
    live.setLocale('zh-TW');
    expect(loading.textContent).toBe(previousLoading);
    button(target, '.attachment-item').click();
    const opening = target.querySelector('.email-state strong')!;
    live.setLocale('de-DE');
    expect(opening.textContent).toContain('inline.png');
    expect(opening.textContent).toBe(createFileViewerTranslator({ locale: 'de-DE' })('email.attachments.opening', { name: 'inline.png' }));
    await vi.waitFor(() => expect(target.querySelector('.email-attachment-render div')).not.toBeNull());
    const unavailable = target.querySelector('.email-attachment-render div')!;
    live.setLocale('zh-HK');
    expect(unavailable.textContent).toBe(createFileViewerTranslator({ locale: 'zh-HK' })('email.attachments.nestedUnavailable', { name: 'inline.png' }));
    button(target, '.attachment-preview-actions button:last-child').click();
    const released = unavailable.textContent;
    live.setLocale('en-US');
    expect(unavailable.textContent).toBe(released);
  });

  it('keeps the nested renderer instance for a real parsed RTF payload alive during language changes', async () => {
    const live = liveI18n();
    const unmount = vi.fn();
    const nested = vi.fn(async (_buffer, type, target, context) => {
      expect(type).toBe('rtf');
      expect(context.i18n).toBe(live.i18n);
      expect(context.options.docx).toMatchObject({ externalResourcePolicy: 'block', externalLinkPolicy: 'block' });
      for (const key of ['locale', 'messages', 'i18n']) expect(context.options).not.toHaveProperty(key);
      const body = target.ownerDocument.createElement('pre');
      body.textContent = 'RTF document data';
      target.append(body);
      return { $el: body, unmount };
    });
    const { target } = await mount(createMsgFixture({ html: false, rtf: '{\\rtf1 Test}', attachments: false }), {
      i18n: live.i18n, renderNestedBuffer: nested,
    });
    const body = target.querySelector('.email-rtf')!;
    for (const locale of locales) {
      live.setLocale(locale);
      expect(target.querySelector('.email-rtf')).toBe(body);
      expect(target.querySelector('.body-tabs button.active')?.textContent).toBe('RTF');
      expect(nested).toHaveBeenCalledTimes(1);
      expect(unmount).not.toHaveBeenCalled();
      expect(target.querySelector('.attachment-empty')?.textContent).toBe(createFileViewerTranslator({ locale })('email.attachments.empty'));
    }
  });

  it.each([
    [{ html: false, rtf: '{\\rtf1 Test}', attachments: false }, 'email.msg.rtfUnavailable'],
    [{ html: false, text: '', attachments: false }, 'email.msg.noBody'],
  ] as const)('updates renderer-owned MSG notices for %j without replacing their nodes', async (options, notice) => {
    const live = liveI18n();
    const { target } = await mount(createMsgFixture(options), { i18n: live.i18n });
    const notices = [...target.querySelectorAll('.email-notices p')];
    expect(notices.length).toBeGreaterThan(0);
    for (const locale of locales) {
      live.setLocale(locale);
      expect([...target.querySelectorAll('.email-notices p')]).toEqual(notices);
      expect(notices.map(node => node.textContent)).toContain(getMsgLabels({ locale })[notice]);
    }
  });

  it('localizes failure chrome while preserving raw error detail and releasing replaced errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const live = liveI18n();
    const nested = vi.fn(async () => { throw new Error('Original attachment failure'); });
    const { target } = await mount(createMsgFixture(), { i18n: live.i18n, renderNestedBuffer: nested });
    button(target, '.attachment-item').click();
    await vi.waitFor(() => expect(target.querySelector('.email-error')).not.toBeNull());
    const error = target.querySelector('.email-error')!;
    const detail = error.querySelector('p')!;
    live.setLocale('zh-TW');
    expect(error.querySelector('strong')?.textContent).toBe(createFileViewerTranslator({ locale: 'zh-TW' })('email.error.title'));
    expect(error.querySelector('p')).toBe(detail);
    expect(detail.textContent).toBe('Original attachment failure');
    button(target, '.attachment-item').click();
    await vi.waitFor(() => expect(nested).toHaveBeenCalledTimes(2));
    await flush();
    const releasedTitle = error.querySelector('strong')!.textContent;
    live.setLocale('de-DE');
    expect(error.querySelector('strong')!.textContent).toBe(releasedTitle);
  });

  it('unsubscribes immediately on abort, rejects invalid data cleanly, and supports no live context', async () => {
    const live = liveI18n();
    const controller = new AbortController();
    const { target, rendered } = await mount(createMsgFixture(), { i18n: live.i18n, signal: controller.signal });
    const label = target.querySelector('.attachment-title strong')!;
    const previous = label.textContent;
    expect(live.listeners.size).toBeGreaterThan(0);
    controller.abort();
    expect(live.listeners.size).toBe(0);
    live.setLocale('zh-TW');
    expect(label.textContent).toBe(previous);
    await disposeFileViewerRendered(rendered);
    const failed = liveI18n();
    const other = host();
    await expect(renderEmail(new ArrayBuffer(12), other.target, 'msg', { i18n: failed.i18n })).rejects.toThrow();
    expect(failed.listeners.size).toBe(0);
    expect(other.target.childNodes.length).toBe(0);
    const legacy = await mount(createMsgFixture(), { options: { locale: 'zh-TW' } });
    assertChrome(legacy.target, 'zh-TW');
  });

  it('keeps downloaded object URLs alive through locale changes and revokes them only on cleanup', async () => {
    const live = liveI18n();
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:email-live-download');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { dom, target, rendered } = await mount(createMsgFixture(), { i18n: live.i18n });
    const click = vi.spyOn(dom.window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    button(target, '.attachment-item').click();
    await vi.waitFor(() => expect(target.querySelector('.email-attachment-render')).not.toBeNull());
    button(target, '.attachment-preview-actions button').click();
    await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createUrl).toHaveBeenCalledTimes(1);
    for (const locale of locales) live.setLocale(locale);
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(revokeUrl).not.toHaveBeenCalled();
    await disposeFileViewerRendered(rendered);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:email-live-download');
    await disposeFileViewerRendered(rendered);
    expect(revokeUrl).toHaveBeenCalledTimes(1);
  });

  it('cleans up when initial translation throws and when parsing starts with an aborted signal', async () => {
    const live = liveI18n();
    live.i18n.t = () => { throw new Error('Translation failure'); };
    const { target } = host();
    await expect(renderEmail(createMsgFixture(), target, 'msg', { i18n: live.i18n })).rejects.toThrow('Translation failure');
    expect(live.listeners.size).toBe(0);
    expect(target.childNodes.length).toBe(0);
    const other = liveI18n();
    const controller = new AbortController();
    controller.abort();
    await expect(renderEmail(createMsgFixture(), target, 'msg', { i18n: other.i18n, signal: controller.signal })).rejects.toThrow();
    expect(other.listeners.size).toBe(0);
    expect(target.childNodes.length).toBe(0);
  });

  it('drops a late attachment result after close without reviving UI or subscriptions', async () => {
    const live = liveI18n();
    let finish!: (value: FileViewerRenderedInstance) => void;
    const nested = vi.fn(() => new Promise<FileViewerRenderedInstance>(resolve => { finish = resolve; }));
    const { target, rendered } = await mount(createMsgFixture(), { i18n: live.i18n, renderNestedBuffer: nested });
    button(target, '.attachment-item').click();
    await vi.waitFor(() => expect(nested).toHaveBeenCalledTimes(1));
    button(target, '.attachment-preview-actions button:last-child').click();
    const unmount = vi.fn();
    finish({ unmount });
    await flush();
    live.setLocale('zh-TW');
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(target.querySelector<HTMLElement>('.attachment-preview')!.hidden).toBe(true);
    expect(target.querySelector('.attachment-target')!.childNodes.length).toBe(0);
    expect(target.querySelector('.email-state')).toBeNull();
    await disposeFileViewerRendered(rendered);
    expect(live.listeners.size).toBe(0);
  });
});


describe('legacy public email language options', () => {
  it.each(['attachment', 'rtf'].flatMap(route => [
    { locale: 'zh-TW', messages: { 'toolbar.print': 'Legacy custom print' } },
    { i18n: { locale: 'zh-HK', messages: { 'toolbar.print': 'Legacy grouped print' } } },
  ].map(options => ({ route, options }))))('retains only-options language for %j', async ({ route, options }) => {
    const { target } = host();
    const original = JSON.stringify(options);
    let supplied: FileRenderContext | undefined;
    const nested = vi.fn(async (_buffer, _type, child, context) => {
      supplied = context;
      child.textContent = createFileViewerTranslator(context.i18n || context.options)('toolbar.print');
      return { $el: child };
    });
    const rendered = await renderFileViewerEmail(route === 'rtf'
      ? createMsgFixture({ html: false, rtf: '{\\rtf1 Legacy RTF body}', attachments: false })
      : createMsgFixture(), target, 'msg', { options, renderNestedBuffer: nested });
    cleanups.push(() => disposeFileViewerRendered(rendered));
    if (route === 'attachment') target.querySelectorAll<HTMLButtonElement>('.attachment-item')[1].click();
    await vi.waitFor(() => expect(nested).toHaveBeenCalledOnce());
    expect(target.querySelector(route === 'rtf' ? '.email-rtf' : '.email-attachment-render')!.textContent)
      .toBe(createFileViewerTranslator(options)('toolbar.print'));
    expect(JSON.stringify(options)).toBe(original);
    expect(supplied!.options).toMatchObject(options);
    if (route === 'rtf') expect(supplied!.options!.docx).toMatchObject({ externalResourcePolicy: 'block', externalLinkPolicy: 'block' });
  });
});
