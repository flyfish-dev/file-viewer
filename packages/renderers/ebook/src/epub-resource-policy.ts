/** The policy is installed after epub.js replaces archive resources with blob URLs. */
export const EPUB_ARCHIVE_CSP = "default-src 'none'; img-src data: blob:; font-src data: blob:; style-src 'unsafe-inline' blob:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'";

export type EpubSerializedSection = { output?: string; url?: string };
export type EpubSerializeHooks = {
  register(hook: (markup: string, section: EpubSerializedSection) => Promise<void>): void;
};
type EpubNavigationHooks = {
  register(hook: (contents: { document: Document }) => void): void;
  deregister(hook: (contents: { document: Document }) => void): void;
};
type EpubArchiveNavigation = {
  urlForHref(href: string): string;
  hrefForUrl(url: string): string | undefined;
  release(): void;
};

/** Native links can navigate only to an owned, inert blob before the host resumes the book. */
export const createEpubArchiveNavigation = (): EpubArchiveNavigation => {
  const hrefs = new Map<string, string>();
  const urls = new Map<string, string>();
  let released = false;
  return {
    urlForHref(href) {
      if (released || !/^\/(?!\/)/.test(href)) throw new Error('Invalid EPUB archive navigation.');
      let url = urls.get(href);
      if (!url) {
        // No authored text, path, or script is embedded in the navigation document.
        url = URL.createObjectURL(new Blob([
          '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'"></head><body></body></html>',
        ], { type: 'text/html' }));
        hrefs.set(url, href);
        urls.set(href, url);
      }
      return url;
    },
    hrefForUrl: url => hrefs.get(url),
    release() {
      released = true;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear(); hrefs.clear();
    },
  };
};

export const isLocalEpubResource = (value: string) => /^(?:blob:|data:)/i.test(value.trim());

// Archive loading has its own request implementation. Any fallback is unexpected in block mode.
export const rejectEpubNetworkRequest = async (): Promise<never> => {
  throw new Error('External EPUB resource requests are blocked.');
};

const archiveLink = (href: string, sectionUrl: string) => {
  if (/^[\s\u0000-\u0020]*[^/]*:|^[\s\u0000-\u0020]*\/\//.test(href)) return undefined;
  const origin = 'https://epub-archive.invalid';
  if (!sectionUrl) throw new Error('EPUB chapter archive location is unavailable.');
  const section = new URL(sectionUrl, origin);
  if (section.origin !== origin) throw new Error('Expected an archive-backed EPUB chapter.');
  const link = new URL(href, section);
  if (link.origin !== origin) return undefined;
  return link.pathname + link.search + link.hash;
};

export const blockEpubChapterResources = (markup: string, sectionUrl: string, createStyleUrl?: (css: string) => string, navigationUrl?: (href: string) => string) => {
  const doc = new DOMParser().parseFromString(markup, 'application/xhtml+xml');
  // XML-only constructs must not introduce new elements when epub.js writes this as HTML.
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION);
  const xmlNodes: Node[] = [];
  while (walker.nextNode()) xmlNodes.push(walker.currentNode);
  for (const node of xmlNodes) {
    if (!node.parentNode) continue;
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      node.parentNode.removeChild(node);
    } else {
      const parent = node.parentElement;
      if (parent?.localName.toLowerCase() === 'style' && parent.namespaceURI === 'http://www.w3.org/1999/xhtml') {
        if (!createStyleUrl) throw new Error('Cannot safely serialize the EPUB chapter stylesheet.');
        const link = doc.createElementNS(parent.namespaceURI, 'link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', createStyleUrl(parent.textContent || ''));
        // Keep media restrictions when normalizing XML CDATA stylesheets to CSS blobs.
        const media = Array.from(parent.attributes).find(attribute => attribute.name.toLowerCase() === 'media')?.value;
        if (media) link.setAttribute('media', media);
        parent.replaceWith(link);
      } else {
        node.parentNode.replaceChild(doc.createTextNode(node.nodeValue || ''), node);
      }
    }
  }
  const elements = Array.from(doc.getElementsByTagName('*'));
  const html = doc.documentElement;
  const heads = elements.filter(element => element.localName.toLowerCase() === 'head');
  const bodies = elements.filter(element => element.localName.toLowerCase() === 'body');
  if (elements.some(element => element.localName === 'parsererror') ||
      html.nodeName.toLowerCase() !== 'html' || html.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
      heads.length !== 1 || heads[0].parentElement !== html || heads[0].prefix ||
      heads[0].namespaceURI !== html.namespaceURI || bodies.length !== 1 || bodies[0].parentElement !== html || bodies[0].prefix || bodies[0].namespaceURI !== html.namespaceURI) {
    throw new Error('Cannot apply the EPUB external resource policy to this chapter.');
  }
  const head = heads[0];
  // XHTML is case-sensitive; epub.js subsequently writes HTML, where these names are not.
  const attributeValue = (element: Element, name: string) => Array.from(element.attributes)
    .find(attribute => attribute.name.toLowerCase() === name)?.value;
  for (const element of elements) {
    const tag = element.localName.toLowerCase();
    const httpEquiv = attributeValue(element, 'http-equiv')?.trim().toLowerCase();
    if (tag === 'base' || (tag === 'meta' && (httpEquiv === 'refresh' || httpEquiv === 'content-security-policy')) ||
        ['iframe', 'frame', 'frameset', 'object', 'embed', 'script'].includes(tag) ||
        ['set', 'animate', 'animatemotion', 'animatetransform', 'discard'].includes(tag)) {
      element.remove();
      continue;
    }
    if (tag === 'link' && (attributeValue(element, 'rel')?.trim().toLowerCase() !== 'stylesheet' ||
        !isLocalEpubResource(attributeValue(element, 'href') || ''))) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase();
      if (name.startsWith('on') || ['srcset', 'ping', 'action', 'formaction', 'target', 'download'].includes(name)) {
        element.removeAttributeNode(attribute);
      } else if ((tag === 'a' || tag === 'area') && name === 'href') {
        const href = archiveLink(attribute.value, sectionUrl);
        element.removeAttributeNode(attribute);
        // epub.js intercepts a[href]; normalize SVG xlink:href into that same route.
        if (href !== undefined) element.setAttribute('href', navigationUrl?.(href) || href);
      } else if (['src', 'poster', 'background', 'data'].includes(name) ||
          (name === 'href' && tag !== 'a' && tag !== 'link')) {
        if (!isLocalEpubResource(attribute.value) && !attribute.value.startsWith('#')) element.removeAttributeNode(attribute);
      }
    }
  }
  const policy = doc.createElementNS(head.namespaceURI, 'meta');
  policy.setAttribute('http-equiv', 'Content-Security-Policy');
  policy.setAttribute('content', EPUB_ARCHIVE_CSP);
  head.insertBefore(policy, head.firstChild);
  return new XMLSerializer().serializeToString(doc);
};

export const installEpubResourcePolicy = (
  hooks: EpubSerializeHooks | undefined,
  onFailure: (error: unknown) => void,
  navigationUrl?: (href: string) => string
) => {
  if (!hooks || typeof hooks.register !== 'function') throw new Error('EPUB chapter policy hook is unavailable.');
  const styles = new Set<string>();
  const release = () => { styles.forEach(url => URL.revokeObjectURL(url)); styles.clear(); };
  // epub.js swallows synchronous hook exceptions, but propagates rejected promises.
  hooks.register(async (markup, section) => {
    try {
      section.output = blockEpubChapterResources(section.output ?? markup, section.url || '', css => {
        const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
        styles.add(url);
        return url;
      }, navigationUrl);
    } catch (error) {
      section.output = '';
      release();
      onFailure(error);
      throw error;
    }
  });
  return release;
};

/** Host listeners work with CSP and sandboxed chapters without enabling book scripts. */
export const bindEpubArchiveNavigation = (hooks: EpubNavigationHooks, navigate: (href: string, native?: boolean) => void, navigation?: EpubArchiveNavigation) => {
  const documents = new Map<Document, EventListener>();
  const frames = new Map<HTMLIFrameElement, EventListener>();
  const attach = ({ document }: { document: Document }) => {
    documents.forEach((click, previous) => {
      if (!previous.defaultView?.frameElement?.isConnected) {
        previous.removeEventListener('click', click, true); documents.delete(previous);
      }
    });
    frames.forEach((loaded, frame) => {
      if (!frame.isConnected) { frame.removeEventListener('load', loaded); frames.delete(frame); }
    });
    if (documents.has(document)) return;
    // epub.js marks absolute blob links target=_blank; owned archive links stay in the reader.
    document.querySelectorAll('a[href],area[href]').forEach(anchor => {
      if (navigation?.hrefForUrl(anchor.getAttribute('href') || '')) anchor.setAttribute('target', '_self');
    });
    const click: EventListener = event => {
      const target = event.target as Node | null;
      const element = target?.nodeType === Node.ELEMENT_NODE ? target as Element : target?.parentElement;
      const anchor = element?.closest('a[href],area[href]');
      if (!anchor) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const href = anchor.getAttribute('href') || '';
      const archiveHref = navigation ? navigation.hrefForUrl(href) : /^\/(?!\/)/.test(href) ? href : undefined;
      if (archiveHref) navigate(archiveHref);
    };
    document.addEventListener('click', click, true);
    documents.set(document, click);
    const frame = document.defaultView?.frameElement as HTMLIFrameElement | null;
    if (navigation && frame && !frames.has(frame)) {
      const loaded: EventListener = () => {
        // This listener belongs to the parent iframe element, so it also runs when a
        // browser disables every chapter listener under the no-scripts sandbox.
        try {
          const href = navigation.hrefForUrl(frame.contentWindow?.location.href || '');
          if (href) navigate(href, true);
        } catch { /* A document outside the owned blob map cannot route the book. */ }
      };
      frame.addEventListener('load', loaded);
      frames.set(frame, loaded);
    }
  };
  hooks.register(attach);
  return () => {
    hooks.deregister(attach);
    documents.forEach((click, document) => document.removeEventListener('click', click, true));
    documents.clear();
    frames.forEach((loaded, frame) => frame.removeEventListener('load', loaded));
    frames.clear();
  };
};

export const captureEpubCover = async (url: string, blockExternal: boolean, signal?: AbortSignal) => {
  if (blockExternal && !isLocalEpubResource(url)) throw new Error('External EPUB cover requests are blocked.');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Unable to read the EPUB cover.');
  return response.blob();
};
