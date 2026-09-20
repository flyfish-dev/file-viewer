export const normalizeEmailResourceId = (value: string): string => {
  const isUri = /^cid:/i.test(value.trim());
  let result = value.trim().replace(/^cid:/i, '').replace(/^<|>$/g, '');
  if (isUri) {
    try { result = decodeURIComponent(result); } catch { /* Keep malformed escapes literal. */ }
  }
  return result;
};

/** Sandboxed srcdoc cannot read blob:null URLs from a different opaque
 * origin (file:// WebViews, data: hosts). Keep ordinary hosts zero-copy and use
 * a bounded data URL only for those hosts or browsers without object URLs.
 */
export function createEmailImageResource(buffer: ArrayBuffer, mimeType: string, objectUrls: string[]): string {
  if (typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(new Blob([buffer], { type: mimeType }));
    if (!url.startsWith('blob:null/')) { objectUrls.push(url); return url; }
    URL.revokeObjectURL(url);
  }
  const bytes = new Uint8Array(buffer);
  const parts: string[] = [];
  // Divisible by three: only the final base64 chunk can contain padding.
  for (let offset = 0; offset < bytes.length; offset += 24576) {
    parts.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + 24576))));
  }
  return `data:${mimeType};base64,${parts.join('')}`;
}


const ALLOWED_TAGS = new Set('a abbr address article aside b bdi bdo big blockquote br caption center cite code col colgroup dd del details div dl dt em figcaption figure font footer h1 h2 h3 h4 h5 h6 header hr i img ins kbd label li main mark ol p pre q rp rt ruby s samp section small span strike strong style sub summary sup table tbody td tfoot th thead time title tr tt u ul var wbr'.split(' '));
const DROP_CONTENT = new Set('script iframe frame frameset object embed applet svg math template noscript audio video source track input link meta base'.split(' '));
const ALLOWED_ATTRS = new Set('alt title class id style width height align valign bgcolor color face size border cellpadding cellspacing colspan rowspan dir lang role aria-label scope start type value open name text'.split(' '));
const SAFE_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,[a-z0-9+/=\r\n]+$/i;

export function createEmailHtmlDocument(html: string, resources: Map<string, string>, darkMode = false, documentRef: Document = document): string {
  if (html.length > 32 * 1024 * 1024) throw new Error('Email HTML exceeds the safety limit.');
  // Template contents are inert, unlike parsing a live document with loadable images.
  const template = documentRef.createElement('template');
  const inertDocument = template.content.ownerDocument;
  if (inertDocument.defaultView) throw new Error('Email parsing requires an inert template document.');
  const parsed = inertDocument.createElement('html');
  parsed.innerHTML = html;
  // Fragment parsing drops the outer html token. Recover only its language and
  // direction through a second inert element; never copy executable attributes.
  const rootAttributes = /^\s*(?:<!doctype[^>]*>\s*)?<html\b((?:[^>"']|"[^"]*"|'[^']*')*)>/i.exec(html.slice(0, 16384))?.[1];
  if (rootAttributes) {
    const probe = inertDocument.createElement('div');
    probe.innerHTML = `<div${rootAttributes}></div>`;
    for (const name of ['lang', 'dir']) {
      const value = probe.firstElementChild?.getAttribute(name);
      if (value) parsed.setAttribute(name, value);
    }
  }
  const head = parsed.querySelector('head') || inertDocument.createElement('head');
  const body = parsed.querySelector('body') || inertDocument.createElement('body');
  const ownedUrls = new Set(resources.values());
  const lookup = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (ownedUrls.has(trimmed) && /^blob:/.test(trimmed)) return trimmed;
    if (SAFE_IMAGE.test(trimmed)) return trimmed;
    const key = normalizeEmailResourceId(trimmed);
    let exact = resources.get(key);
    if (!exact && !/^cid:/i.test(trimmed)) {
      try { exact = resources.get(decodeURIComponent(key)); } catch { /* Literal Content-Location. */ }
    }
    if (exact && (/^blob:/.test(exact) || SAFE_IMAGE.test(exact))) return exact;
    if (/^cid:/i.test(trimmed)) {
      // Legacy writers vary CID casing. Only use a case-insensitive fallback
      // when it identifies exactly one attachment; never replace a prefix.
      const matches = [...resources].filter(([id]) => id.toLowerCase() === key.toLowerCase());
      if (matches.length === 1 && (/^blob:/.test(matches[0][1]) || SAFE_IMAGE.test(matches[0][1]))) return matches[0][1];
    }
    return undefined;
  };
  let expandedResourceCharacters = 0;
  const resource = (value: string) => {
    const resolved = lookup(value);
    if (resolved) {
      expandedResourceCharacters += resolved.length;
      if (expandedResourceCharacters > 48 * 1024 * 1024) throw new Error('Email inline resource expansion limit exceeded.');
    }
    return resolved;
  };
  const css = (value: string) => value
    .replace(/@import\s+(?:url\([^)]*\)|[^;]*);?/gi, '')
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_match, double, single, bare) => {
      const resolved = resource(String(double ?? single ?? bare ?? ''));
      return resolved ? `url("${resolved.replace(/["\\\r\n]/g, '')}")` : 'none';
    });
  const attributes = (element: Element) => {
    const tag = element.localName.toLowerCase();
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (tag === 'img' && name === 'src') {
        const resolved = resource(attribute.value);
        if (resolved) element.setAttribute('src', resolved); else element.removeAttribute(attribute.name);
      } else if (name === 'background') {
        const resolved = resource(attribute.value);
        if (resolved) element.setAttribute('background', resolved); else element.removeAttribute(attribute.name);
      } else if (tag === 'a' && name === 'href') {
        if (!/^#[a-z0-9_:.\-]+$/i.test(attribute.value)) element.removeAttribute(attribute.name);
      } else if (name === 'style') element.setAttribute('style', css(attribute.value));
      else if (!ALLOWED_ATTRS.has(name)) element.removeAttribute(attribute.name);
    }
  };
  let count = 0;
  const clean = (parent: ParentNode) => {
    const pending = [...parent.children];
    while (pending.length) {
      const element = pending.pop()!;
      if (++count > 100000) throw new Error('Email HTML node limit exceeded.');
      const tag = element.localName.toLowerCase();
      if (DROP_CONTENT.has(tag)) { element.remove(); continue; }
      if (!ALLOWED_TAGS.has(tag)) {
        const children = [...element.children];
        element.replaceWith(...Array.from(element.childNodes));
        pending.push(...children);
        continue;
      }
      attributes(element);
      if (tag === 'style') element.textContent = css(element.textContent || '');
      pending.push(...element.children);
    }
  };
  clean(head);
  clean(body);
  attributes(parsed);
  attributes(body);
  // Preserve legacy Outlook body colors as well as modern inline styles.
  if (body.getAttribute('bgcolor') && !body.style.backgroundColor) body.style.backgroundColor = body.getAttribute('bgcolor')!;
  if (body.getAttribute('text') && !body.style.color) body.style.color = body.getAttribute('text')!;
  if (body.getAttribute('background') && !body.style.backgroundImage) body.style.backgroundImage = `url("${body.getAttribute('background')!.replace(/["\\\r\n]/g, '')}")`;
  // Check escaped serialization growth before building a potentially huge srcdoc.
  const escapedLength = (value: string, attribute = false) => {
    let size = value.length;
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code === 38) size += 4;
      else if (code === 60 || code === 62) size += 3;
      else if (attribute && code === 34) size += 5;
    }
    return size;
  };
  const nodes: Node[] = [parsed];
  let estimated = 0;
  while (nodes.length) {
    const node = nodes.pop()!;
    if (node.nodeType === 3) estimated += escapedLength(node.nodeValue || '');
    else if (node.nodeType === 1) {
      estimated += 32;
      for (const attr of Array.from((node as Element).attributes)) estimated += attr.name.length + escapedLength(attr.value, true) + 8;
    }
    if (estimated > 64 * 1024 * 1024) throw new Error('Email HTML serialization limit exceeded.');
    nodes.push(...Array.from(node.childNodes));
  }
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const serializeAttributes = (element: Element) => Array.from(element.attributes).map(attr => ` ${attr.name}="${escape(attr.value)}"`).join('');
  const background = darkMode ? '#111827' : '#fff';
  const foreground = darkMode ? '#e5e7eb' : '#172033';
  // CSP is required in addition to sanitization: CSS escapes and future HTML
  // features must not introduce external requests or executable content.
  const csp = "default-src 'none'; script-src 'none'; connect-src 'none'; img-src blob: data:; style-src 'unsafe-inline'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html${serializeAttributes(parsed)}><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer"><style>:root{color-scheme:${darkMode ? 'dark' : 'light'}}body{margin:0;padding:18px;font-family:Aptos,"Segoe UI",sans-serif;line-height:1.6;overflow-wrap:anywhere;background:${background};color:${foreground}}img{max-width:100%;height:auto}table{max-width:100%}</style>${head.innerHTML}</head><body${serializeAttributes(body)}>${body.innerHTML}</body></html>`;
}
