import { sanitizeFileViewerSvgResources } from '@file-viewer/core';

const URL_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'src',
  'poster',
  'action',
  'formaction',
]);

const SAFE_RELATIVE_URL_ASCII = new Set(
  `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._~!$&'()*+,;=@%/?#-`
);

const stripUrlControlCharacters = (value: string) => {
  let normalized = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code > 0x20 && (code < 0x7f || code > 0x9f)) {
      normalized += character;
    }
  }
  return normalized;
};

const normalizeTypstResourceUrl = (value: string) => {
  const normalized = stripUrlControlCharacters(value).trim();
  if (!normalized) {
    return null;
  }
  if (/^#[A-Za-z0-9_.:-]+$/.test(normalized)) {
    return normalized;
  }
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(normalized)) {
    return normalized;
  }
  if (/^blob:[A-Za-z0-9.+-]+:\/\/[^\s]+$/i.test(normalized)) {
    return normalized;
  }
  if (
    !normalized.includes(':') &&
    !normalized.includes('\\') &&
    !normalized.startsWith('//') &&
    Array.from(normalized).every(character => (
      character.charCodeAt(0) > 0x7f || SAFE_RELATIVE_URL_ASCII.has(character)
    ))
  ) {
    return normalized;
  }
  return null;
};

const hasOnlySafeCssUrls = (value: string) => {
  const normalized = stripUrlControlCharacters(value);
  if (
    normalized.includes('\\') ||
    normalized.includes('/*') ||
    /(?:expression|image(?:-set)?|paint|var)\s*\(|@import|(?:^|[^-])behavior\s*:|-moz-binding/i.test(normalized)
  ) {
    return false;
  }
  let cursor = 0;
  while (cursor < normalized.length) {
    const match = /url\s*\(/ig;
    match.lastIndex = cursor;
    const next = match.exec(normalized);
    if (!next) {
      return true;
    }
    const close = normalized.indexOf(')', match.lastIndex);
    if (close < 0) {
      return false;
    }
    const target = normalized
      .slice(match.lastIndex, close)
      .trim()
      .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
    if (!normalizeTypstResourceUrl(target)) {
      return false;
    }
    cursor = close + 1;
  }
  return true;
};

export const sanitizeTypstSvgDocument = (root: Document | Element) => {
  root.querySelectorAll('script,iframe,object,embed,form').forEach(node => node.remove());
  root.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (URL_ATTRIBUTES.has(name)) {
        const normalizedUrl = normalizeTypstResourceUrl(attribute.value);
        if (!normalizedUrl) {
          element.removeAttribute(attribute.name);
          continue;
        }
        attribute.value = normalizedUrl;
      }
      if ((name === 'style' || /url\s*\(/i.test(attribute.value)) && !hasOnlySafeCssUrls(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  root.querySelectorAll('style').forEach(style => {
    if (!hasOnlySafeCssUrls(style.textContent || '')) {
      style.remove();
    }
  });
  // Typst output may contain navigation links, but embedded resources must be
  // self-contained. The shared SVG gate removes relative/remote image loads
  // while retaining safe anchors, fragments, blobs, and raster data URLs.
  sanitizeFileViewerSvgResources(root);
};
