import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindEpubArchiveNavigation, blockEpubChapterResources, captureEpubCover, createEpubArchiveNavigation, EPUB_ARCHIVE_CSP, installEpubResourcePolicy, isLocalEpubResource, rejectEpubNetworkRequest, type EpubSerializedSection } from '../packages/renderers/ebook/src/epub-resource-policy';

const chapter = (head = '', body = '') => `<html xmlns="http://www.w3.org/1999/xhtml"><head>${head}</head><body>${body}</body></html>`;
const parse = (markup: string) => new DOMParser().parseFromString(markup, 'application/xhtml+xml');
afterEach(() => vi.unstubAllGlobals());

describe('EPUB archive external resource policy', () => {
  it('installs the policy before authored content and removes base, refresh, active frames and speculative fetches structurally', () => {
    const output = blockEpubChapterResources(chapter(
      '<base href="https://outside.invalid/"/><meta http-equiv=" ReFrEsH " content="0;url=https://outside.invalid"/><meta http-equiv="Content-Security-Policy" content="default-src *"/><link rel="preconnect" href="https://outside.invalid"/>',
      '<iframe src="https://outside.invalid"/><object data="https://outside.invalid"/><embed src="https://outside.invalid"/><script src="https://outside.invalid"/><p>Readable</p>'
    ), '/OPS/text/one.xhtml');
    const doc = parse(output);
    expect(doc.head.firstElementChild?.getAttribute('content')).toBe(EPUB_ARCHIVE_CSP);
    expect(doc.querySelectorAll('base,iframe,object,embed,script,link').length).toBe(0);
    expect(doc.querySelectorAll('meta').length).toBe(1);
    expect(doc.body.textContent).toBe('Readable');
  });

  it('preserves archive blobs, data images, inline styles and font CSS after replacement', () => {
    const doc = parse(blockEpubChapterResources(chapter(
      '<link rel="stylesheet" href="blob:https://viewer.invalid/local-css"/><style>@font-face{font-family:Book;src:url(blob:https://viewer.invalid/font)}</style>',
      '<img src="data:image/png;base64,AA=="/><img src="blob:https://viewer.invalid/image"/><p style="color:green">Text</p>'
    ), '/OPS/one.xhtml'));
    expect(doc.querySelector('link')?.getAttribute('href')).toBe('blob:https://viewer.invalid/local-css');
    expect(doc.querySelectorAll('img[src]').length).toBe(2);
    expect(doc.querySelector('p')?.getAttribute('style')).toBe('color:green');
    expect(doc.querySelector('style')?.textContent).toContain('blob:');
  });

  it('removes remote and unresolved resource attributes and every srcset without changing text', () => {
    const doc = parse(blockEpubChapterResources(chapter('', '<img src="https://outside.invalid/image" srcset="https://outside.invalid/2x 2x"/><img src="missing.png"/><video poster="//outside.invalid/poster"/><svg xmlns="http://www.w3.org/2000/svg"><use href="https://outside.invalid/image.svg#x"/></svg><p onclick="alert(1)">Safe text</p>'), '/OPS/one.xhtml'));
    expect(doc.querySelectorAll('[src],[srcset],[poster],[onclick],use[href]').length).toBe(0);
    expect(doc.body.textContent).toBe('Safe text');
  });

  it('also removes namespaced SVG external navigation', () => {
    const doc = parse(blockEpubChapterResources(chapter('', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="https://outside.invalid"><text>Link</text></a></svg>'), '/OPS/one.xhtml'));
    expect(doc.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'a')[0].attributes.length).toBe(0);
  });

  it('normalizes SVG archive anchors into the regular epub.js book-navigation route', () => {
    const doc = parse(blockEpubChapterResources(chapter('', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="two.xhtml#part"><text>Next</text></a></svg>'), '/OPS/one.xhtml'));
    const link = doc.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'a')[0];
    expect(link.getAttribute('href')).toBe('/OPS/two.xhtml#part');
    expect(link.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe(false);
  });

  it('handles XHTML attributes case-insensitively before the browser reparses the serialized chapter as HTML', () => {
    const doc = parse(blockEpubChapterResources(chapter('<BASE HREF="https://outside.invalid"/><META HTTP-EQUIV=" ReFrEsH " CONTENT="0;url=https://outside.invalid"/><link ReL="stylesheet" HrEf="blob:local-css"/>', '<IMG SrC="https://outside.invalid/image"/><a HrEf="https://outside.invalid">Remote</a>'), '/OPS/one.xhtml'));
    expect([...doc.getElementsByTagName('*')].some(el => ['base'].includes(el.localName.toLowerCase()) || [...el.attributes].some(attr => /refresh|https:\/\/outside/.test(attr.value)))).toBe(false);
    expect(doc.querySelector('link')?.getAttribute('HrEf')).toBe('blob:local-css');
  });

  it('keeps XML CDATA as text and removes processing instructions across the HTML parser boundary', () => {
    const output = blockEpubChapterResources(chapter('', '<textarea><![CDATA[</textarea><meta http-equiv="refresh" content="0;url=https://outside.invalid">]]></textarea><?offline test ><meta http-equiv="refresh" content="0;url=https://outside.invalid"/>?>'), '/OPS/one.xhtml');
    const html = new DOMParser().parseFromString(output, 'text/html');
    expect(html.querySelectorAll('meta[http-equiv="refresh"]').length).toBe(0);
    expect(html.querySelector('textarea')?.textContent).toContain('<meta');
    expect(output).not.toContain('<?offline');
  });

  it('preserves CDATA stylesheet contents in a local CSS blob and releases owned URLs once', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:owned-style');
    const revokeObjectURL = vi.fn();
    class PolicyURL extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal('URL', PolicyURL);
    let hook!: (markup: string, section: EpubSerializedSection) => Promise<void>;
    const failure = vi.fn();
    const release = installEpubResourcePolicy({ register(value) { hook = value; } }, failure);
    const css = 'body > p { color: purple; }';
    const section = { url: '/OPS/one.xhtml', output: chapter(`<style media="screen"><![CDATA[${css}]]></style>`, '<p>Text</p>') };
    const createStyle = vi.fn().mockReturnValue('blob:style');
    const output = blockEpubChapterResources(section.output, section.url, createStyle);
    expect(createStyle).toHaveBeenCalledWith(css);
    expect(parse(output).querySelector('link')?.getAttribute('media')).toBe('screen');
    await hook('', section);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(parse(section.output).querySelector('link')?.getAttribute('href')).toBe('blob:owned-style');
    await expect(hook('', { output: '<broken>', url: '/OPS/one.xhtml' })).rejects.toThrow();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:owned-style');
    release(); release();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledOnce();
  });

  it('resolves fragment and cross-chapter navigation against the archive chapter rather than the removed base', () => {
    const doc = parse(blockEpubChapterResources(chapter('<base href="https://outside.invalid/"/>', '<a href="#notes">Here</a><a href="../two.xhtml#part">Next</a><a href="/OPS/three.xhtml">Third</a>'), '/OPS/text/one.xhtml'));
    expect([...doc.querySelectorAll('a')].map(el => el.getAttribute('href'))).toEqual(['/OPS/text/one.xhtml#notes', '/OPS/two.xhtml#part', '/OPS/three.xhtml']);
  });

  it.each(['https://outside.invalid', '//outside.invalid', 'javascript:alert(1)', 'mailto:person@example.invalid', '\\\\outside.invalid\\path', 'data:text/html,hello'])('does not expose external navigation %s', href => {
    const doc = parse(blockEpubChapterResources(chapter('', `<a href="${href}" target="_blank" ping="https://outside.invalid/ping">Link</a>`), '/OPS/one.xhtml'));
    expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(doc.querySelector('a')?.hasAttribute('target')).toBe(false);
    expect(doc.querySelector('a')?.hasAttribute('ping')).toBe(false);
  });

  it.each(['<html><head><title>broken</head></html>', '<html xmlns="http://www.w3.org/1999/xhtml"><body>no head</body></html>', '<html xmlns="http://www.w3.org/1999/xhtml"><head/><head/><body/></html>', '<html xmlns="urn:foreign"><head/><body/></html>', '<x:html xmlns:x="http://www.w3.org/1999/xhtml"><x:head/><x:body/></x:html>'])('rejects unsupported or malformed documents instead of returning unsafe markup', markup => {
    expect(() => blockEpubChapterResources(markup, '/OPS/one.xhtml')).toThrow();
  });

  it('reads the previous archive replacement hook output and rejects asynchronously with cleared output on policy failure', async () => {
    let hook: (markup: string, section: EpubSerializedSection) => Promise<void>;
    const failure = vi.fn();
    installEpubResourcePolicy({ register(value) { hook = value; } }, failure);
    const section = { url: '/OPS/one.xhtml', output: chapter('', '<img src="blob:https://viewer.invalid/image"/>') };
    await hook!('unreplaced input', section);
    expect(section.output).toContain('blob:https://viewer.invalid/image');
    const invalid = { url: '/OPS/one.xhtml', output: '<broken>' };
    await expect(hook!('unreplaced input', invalid)).rejects.toThrow();
    expect(invalid.output).toBe('');
    expect(failure).toHaveBeenCalledOnce();
    expect(() => installEpubResourcePolicy(undefined, failure)).toThrow('unavailable');
  });

  it('never issues an EPUB fallback request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(rejectEpubNetworkRequest()).rejects.toThrow('blocked');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('routes sanitized HTML/SVG anchors through host listeners and removes every listener on cleanup', () => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '<a href="/OPS/two.xhtml#notes"><span>Next</span></a><svg><a href="/OPS/one.xhtml"><text>Back</text></a></svg><a href="https://outside.invalid">Untrusted mutation</a>';
    let attach!: (contents: { document: Document }) => void;
    const hooks = { register: vi.fn(value => { attach = value; }), deregister: vi.fn() };
    const navigate = vi.fn();
    const release = bindEpubArchiveNavigation(hooks, navigate);
    attach({ document: doc }); attach({ document: doc });
    for (const element of [doc.querySelector('span'), doc.querySelector('text'), doc.querySelectorAll('a')[2]]) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      element!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(navigate.mock.calls).toEqual([['/OPS/two.xhtml#notes'], ['/OPS/one.xhtml']]);
    release();
    doc.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(hooks.deregister).toHaveBeenCalledWith(attach);
  });

  it('routes only owned inert navigation blobs from the parent frame when chapter listeners cannot run', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:owned-navigation');
    const revokeObjectURL = vi.fn();
    class PolicyURL extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal('URL', PolicyURL);
    const navigation = createEpubArchiveNavigation();
    const href = '/OPS/two.xhtml#notes';
    const url = navigation.urlForHref(href);
    expect(navigation.urlForHref(href)).toBe(url);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(() => navigation.urlForHref('https://outside.invalid')).toThrow('Invalid');
    expect(navigation.hrefForUrl('blob:forged')).toBeUndefined();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const text = await new Promise<string>(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob);
    });
    expect(blob.type).toBe('text/html');
    expect(text).toContain("default-src 'none'");
    expect(text).not.toContain(href);
    expect(new DOMParser().parseFromString(text, 'text/html').querySelectorAll('script,img,iframe,link').length).toBe(0);
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = `<a href="${url}" target="_blank">Next</a>`;
    const frame = document.createElement('iframe');
    const location = { href: url };
    Object.defineProperty(frame, 'contentWindow', { value: { location } });
    Object.defineProperty(doc, 'defaultView', { value: { frameElement: frame } });
    let attach!: (contents: { document: Document }) => void;
    const hooks = { register: vi.fn(value => { attach = value; }), deregister: vi.fn() };
    const navigate = vi.fn();
    const release = bindEpubArchiveNavigation(hooks, navigate, navigation);
    attach({ document: doc });
    expect(doc.querySelector('a')?.getAttribute('target')).toBe('_self');
    frame.dispatchEvent(new Event('load'));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(href, true);
    location.href = 'https://outside.invalid'; frame.dispatchEvent(new Event('load'));
    location.href = 'blob:forged'; frame.dispatchEvent(new Event('load'));
    expect(navigate).toHaveBeenCalledOnce();
    release(); location.href = url; frame.dispatchEvent(new Event('load'));
    expect(navigate).toHaveBeenCalledOnce();
    navigation.release(); navigation.release();
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(url);
    expect(navigation.hrefForUrl(url)).toBeUndefined();
    expect(() => navigation.urlForHref(href)).toThrow('Invalid');
  });

  it('removes SVG declarative actions that could mutate a safe navigation ticket into an external URL without scripts', () => {
    const doc = parse(blockEpubChapterResources(chapter('', '<svg xmlns="http://www.w3.org/2000/svg"><a href="two.xhtml"><text>Next</text><set attributeName="href" to="https://outside.invalid"/><set xmlns="urn:foreign" attributeName="href" to="https://outside.invalid"/><animate attributeName="href" values="two.xhtml;https://outside.invalid"/></a><animateTransform attributeName="transform"/><animateMotion/><discard/></svg>'), '/OPS/one.xhtml'));
    expect(doc.querySelectorAll('set,animate,animateTransform,animateMotion,discard').length).toBe(0);
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('/OPS/two.xhtml');
    expect(doc.querySelector('text')?.textContent).toBe('Next');
  });
});

describe('EPUB cover capture resource policy', () => {
  it.each(['https://outside.invalid/cover', '//outside.invalid/cover', '/cover.png', 'javascript:alert(1)', 'blobx:fake'])('rejects nonlocal cover %s before fetch', async url => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(isLocalEpubResource(url)).toBe(false);
    await expect(captureEpubCover(url, true)).rejects.toThrow('blocked');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['blob:https://viewer.invalid/cover', 'data:image/png;base64,AA=='])('captures local %s with cancellation', async url => {
    const blob = new Blob(['cover'], { type: 'image/png' });
    const fetch = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await captureEpubCover(url, true, signal)).toBe(blob);
    expect(fetch).toHaveBeenCalledWith(url, { signal });
  });

  it('keeps explicit allow behavior and propagates fetch/HTTP failures for the caller to handle', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false }); vi.stubGlobal('fetch', fetch);
    await expect(captureEpubCover('https://outside.invalid/cover', false)).rejects.toThrow('Unable');
    expect(fetch).toHaveBeenCalledOnce();
    fetch.mockRejectedValue(new Error('cancelled'));
    await expect(captureEpubCover('blob:local', true)).rejects.toThrow('cancelled');
  });
});
