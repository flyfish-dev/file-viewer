import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core';
import type {
  ChmEntry,
  ChmManifest,
  ChmNavigationNode,
  ChmSearchHit,
  FileViewerChmOptions,
} from './model.js';
import {
  assertChmSvgSourceSafety,
  decodeChmText,
  MAX_CHM_CSS_TEXT_LENGTH,
  MAX_CHM_CSS_RESOURCE_PATHS,
  MAX_CHM_SVG_TEXT_LENGTH,
  MAX_CHM_TOPIC_RESOURCE_PATHS,
  normalizeChmPath,
  sanitizeChmCss,
  sanitizeChmHtmlDocument,
} from './security.js';
import { chmViewerStyle } from './style.js';
import { ChmWorkerClient, type ChmWorkerProgress } from './workerClient.js';

const MAX_RENDERED_NAVIGATION_ITEMS = 12_000;
const MAX_LOADED_RESOURCE_PATHS = 4_096;
const HTML_EXTENSIONS = new Set(['htm', 'html', 'xhtml', 'shtml']);

const messages = {
  'zh-CN': {
    contents: '目录', index: '索引', search: '搜索', searchPlaceholder: '搜索主题和正文',
    loading: '正在打开 CHM…', wasm: '正在加载本地 WASM…', directory: '正在读取 CHM 目录…',
    manifest: '正在构建帮助目录…', searching: '正在搜索…', noContents: '没有可显示的目录。',
    noIndex: '没有可显示的关键词索引。', searchHint: '输入至少两个字符搜索当前 CHM。',
    noResults: '没有找到匹配内容。', truncated: '结果已按安全与性能上限截断。',
    error: 'CHM 预览失败', topics: '个主题', ready: '离线安全预览', binaryToc: '二进制目录',
    fullText: '全文索引', menu: '目录', opening: '正在打开主题…', unavailable: '没有找到可打开的主题。',
  },
  'en-US': {
    contents: 'Contents', index: 'Index', search: 'Search', searchPlaceholder: 'Search topics and text',
    loading: 'Opening CHM…', wasm: 'Loading local WASM…', directory: 'Reading the CHM directory…',
    manifest: 'Building help navigation…', searching: 'Searching…', noContents: 'No table of contents is available.',
    noIndex: 'No keyword index is available.', searchHint: 'Enter at least two characters to search this CHM.',
    noResults: 'No matching content was found.', truncated: 'Results were truncated at the configured safety limit.',
    error: 'CHM preview failed', topics: 'topics', ready: 'Safe offline preview', binaryToc: 'Binary TOC',
    fullText: 'Full-text index', menu: 'Menu', opening: 'Opening topic…', unavailable: 'No readable topic was found.',
  },
} as const;

type ChmMessageKey = keyof typeof messages['en-US'];

const resolveLocale = (context?: FileRenderContext): keyof typeof messages => {
  const configured = context?.options?.locale;
  const candidate = configured && configured !== 'auto'
    ? configured
    : typeof navigator === 'undefined' ? 'en-US' : navigator.language;
  return candidate.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};

const extensionOf = (path: string) => {
  const filename = path.split('/').pop() || '';
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : '';
};

const mimeTypeForPath = (path: string) => {
  const extension = extensionOf(path);
  const types: Record<string, string> = {
    css: 'text/css;charset=utf-8', gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
    svg: 'image/svg+xml', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4',
    webm: 'video/webm', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  };
  return types[extension] || 'application/octet-stream';
};

const sanitizeEmbeddedSvgCss = (value: string) => sanitizeChmCss(value, '/', 0).css;

const sanitizeSvg = (source: string) => {
  assertChmSvgSourceSafety(source);
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror')) return '';
  document.querySelectorAll('script,foreignObject,iframe,object,embed').forEach(element => element.remove());
  document.querySelectorAll('style').forEach(style => {
    style.textContent = sanitizeEmbeddedSvgCss(style.textContent || '');
  });
  document.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if ((name === 'href' || name === 'xlink:href')
        && !value.startsWith('#')
        && !/^data:image\/(?:avif|bmp|gif|jpeg|png|webp);/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name !== 'href' && name !== 'xlink:href'
        && /(?:url\s*\(|@import\b|expression\s*\(|behavior\s*:|-moz-binding|\\|\/\*)/i.test(value)) {
        element.setAttribute(attribute.name, sanitizeEmbeddedSvgCss(value));
      }
    }
  });
  return new XMLSerializer().serializeToString(document.documentElement);
};

const INTERNAL_CSS_RESOURCE_PATTERN = /url\("chm-internal:([^"]+)"\)/g;

const loadResourceMap = async (
  paths: readonly string[],
  loadResource: (path: string, ancestry?: ReadonlySet<string>) => Promise<string | null>,
  ancestry: ReadonlySet<string>,
  maxResourcePaths = MAX_CHM_CSS_RESOURCE_PATHS
) => {
  const uniquePaths = Array.from(new Set(paths)).slice(0, maxResourcePaths);
  const replacements = new Map<string, string>();
  let cursor = 0;
  const runners = Array.from({ length: Math.min(8, uniquePaths.length) }, async () => {
    while (cursor < uniquePaths.length) {
      const path = uniquePaths[cursor++];
      const normalized = normalizeChmPath(path);
      const url = normalized && normalized !== '/'
        ? await loadResource(normalized, ancestry)
        : null;
      if (normalized) replacements.set(normalized.toLocaleLowerCase(), url || '');
    }
  });
  await Promise.all(runners);
  return replacements;
};

const replaceInternalCssResourceUrls = (css: string, replacements: ReadonlyMap<string, string>) => css.replace(
  INTERNAL_CSS_RESOURCE_PATTERN,
  (_match, encoded: string) => {
    let path = '';
    try { path = decodeURIComponent(encoded); } catch { return 'url("")'; }
    const normalized = normalizeChmPath(path);
    return `url("${normalized ? replacements.get(normalized.toLocaleLowerCase()) || '' : ''}")`;
  }
);

const replaceCssResourceUrls = async (
  css: string,
  resourcePaths: readonly string[],
  loadResource: (path: string, ancestry?: ReadonlySet<string>) => Promise<string | null>,
  ancestry: ReadonlySet<string>
) => replaceInternalCssResourceUrls(css, await loadResourceMap(resourcePaths, loadResource, ancestry));

const flatNavigation = (nodes: ChmNavigationNode[]) => {
  const output: Array<{ node: ChmNavigationNode; depth: number }> = [];
  const stack = nodes.slice().reverse().map(node => ({ node, depth: 0 }));
  while (stack.length && output.length < MAX_RENDERED_NAVIGATION_ITEMS) {
    const current = stack.pop();
    if (!current) continue;
    output.push(current);
    for (let index = current.node.children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: current.node.children[index], depth: current.depth + 1 });
    }
  }
  return output;
};

const highlightSnippet = (target: HTMLElement, text: string, query: string) => {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) {
    target.textContent = text;
    return;
  }
  target.append(
    document.createTextNode(text.slice(0, index)),
    createElement('mark', undefined, text.slice(index, index + query.length)),
    document.createTextNode(text.slice(index + query.length))
  );
};

export default async function renderChm(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const locale = resolveLocale(context);
  const t = (key: ChmMessageKey) => messages[locale][key];
  const options = (context?.options as { chm?: FileViewerChmOptions } | undefined)?.chm;
  const abortController = new AbortController();
  const objectUrls = new Set<string>();
  const resourceUrls = new Map<string, Promise<string | null>>();
  const listeners: Array<() => void> = [];
  let client: ChmWorkerClient | undefined;
  let destroyed = false;
  let manifest: ChmManifest | undefined;
  let entries: ChmEntry[] = [];
  let entryLookup = new Map<string, string>();
  let currentHtml = '';
  let topicGeneration = 0;
  let searchGeneration = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const style = createElement('style');
  style.textContent = chmViewerStyle;
  const root = createElement('section', 'chm-viewer');
  root.dataset.chmReady = 'false';
  const theme = context?.options?.theme || 'light';
  target.dataset.viewerTheme = theme;
  const header = createElement('header', 'chm-header');
  const sidebarToggle = createElement('button', 'chm-sidebar-toggle', '☰');
  sidebarToggle.type = 'button';
  sidebarToggle.title = t('menu');
  sidebarToggle.setAttribute('aria-label', t('menu'));
  const heading = createElement('div', 'chm-heading');
  const title = createElement('h2', undefined, context?.filename || 'CHM');
  const subtitle = createElement('p', undefined, t('loading'));
  heading.append(title, subtitle);
  const badges = createElement('div', 'chm-badges');
  header.append(sidebarToggle, heading, badges);

  const body = createElement('div', 'chm-body');
  const sidebar = createElement('aside', 'chm-sidebar');
  const tabs = createElement('div', 'chm-tabs');
  const panels = createElement('div', 'chm-sidebar-panels');
  const contentsPanel = createElement('section', 'chm-panel');
  contentsPanel.dataset.chmPanel = 'contents';
  const indexPanel = createElement('section', 'chm-panel');
  indexPanel.dataset.chmPanel = 'index';
  indexPanel.hidden = true;
  const searchPanel = createElement('section', 'chm-panel chm-search');
  searchPanel.dataset.chmPanel = 'search';
  searchPanel.hidden = true;
  const searchBox = createElement('div', 'chm-search-box');
  const searchInput = createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = t('searchPlaceholder');
  searchInput.setAttribute('aria-label', t('search'));
  const searchMeta = createElement('div', 'chm-search-meta', t('searchHint'));
  const searchResults = createElement('div', 'chm-search-results');
  searchBox.append(searchInput);
  searchPanel.append(searchBox, searchMeta, searchResults);
  panels.append(contentsPanel, indexPanel, searchPanel);
  sidebar.append(tabs, panels);

  const topic = createElement('main', 'chm-topic');
  const topicBar = createElement('div', 'chm-topic-bar');
  const topicTitle = createElement('strong', undefined, t('loading'));
  const topicPath = createElement('span', 'chm-topic-path');
  topicBar.append(topicTitle, topicPath);
  const frame = createElement('iframe', 'chm-topic-frame');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.title = context?.filename || 'CHM topic';
  topic.append(topicBar, frame);
  body.append(sidebar, topic);

  const state = createElement('div', 'chm-state');
  const spinner = createElement('span', 'chm-spinner');
  const stateText = createElement('p', undefined, t('loading'));
  state.append(spinner, stateText);
  const errorPanel = createElement('div', 'chm-error');
  errorPanel.hidden = true;
  errorPanel.append(createElement('strong', undefined, t('error')), createElement('p'));
  root.append(header, body, state);
  target.replaceChildren(style, root);

  const listen = <T extends EventTarget>(node: T, type: string, handler: EventListenerOrEventListenerObject) => {
    node.addEventListener(type, handler);
    listeners.push(() => node.removeEventListener(type, handler));
  };

  const showState = (text: string, visible = true) => {
    stateText.textContent = text;
    state.hidden = !visible;
  };

  const showError = (error: unknown) => {
    showState('', false);
    const paragraph = errorPanel.querySelector('p');
    if (paragraph) paragraph.textContent = error instanceof Error ? error.message : String(error);
    errorPanel.hidden = false;
    if (!errorPanel.isConnected) root.append(errorPanel);
  };

  const onProgress = (progress: ChmWorkerProgress) => {
    if (root.dataset.chmReady === 'true') {
      if (progress.phase === 'search') searchMeta.textContent = t('searching');
      return;
    }
    if (progress.phase === 'wasm') showState(t('wasm'));
    else if (progress.phase === 'directory') showState(t('directory'));
    else if (progress.phase === 'manifest') showState(t('manifest'));
  };

  const resolveEntryPath = (path: string) => {
    const normalized = normalizeChmPath(path);
    if (!normalized) return null;
    return entryLookup.get(normalized.toLocaleLowerCase()) || null;
  };

  const loadResource = async (path: string, ancestry: ReadonlySet<string> = new Set()): Promise<string | null> => {
    const actualPath = resolveEntryPath(path);
    if (!actualPath || !client || destroyed) return null;
    const key = actualPath.toLocaleLowerCase();
    if (ancestry.has(key)) return null;
    const cached = resourceUrls.get(key);
    if (cached) return cached;
    if (resourceUrls.size >= MAX_LOADED_RESOURCE_PATHS) return null;
    const promise = (async () => {
      try {
        const bytes = await client?.read(actualPath, abortController.signal);
        if (!bytes || bytes.byteLength > (client?.options.maxEntryBytes || 0)) return null;
        const extension = extensionOf(actualPath);
        let blob: Blob;
        if (extension === 'css') {
          // @import is removed by the sanitizer. A CSS file referenced from a
          // CSS url() is a non-renderable resource and must not start a graph.
          if (ancestry.size > 0) return null;
          if (bytes.byteLength > MAX_CHM_CSS_TEXT_LENGTH) return null;
          const nextAncestry = new Set(ancestry);
          nextAncestry.add(key);
          const sanitizedCss = sanitizeChmCss(decodeChmText(bytes, manifest?.encoding), actualPath);
          const css = await replaceCssResourceUrls(
            sanitizedCss.css,
            sanitizedCss.resourcePaths,
            loadResource,
            nextAncestry
          );
          blob = new Blob([css], { type: 'text/css;charset=utf-8' });
        } else if (extension === 'svg') {
          if (bytes.byteLength > MAX_CHM_SVG_TEXT_LENGTH) return null;
          const svg = sanitizeSvg(decodeChmText(bytes, 'utf-8'));
          if (!svg) return null;
          blob = new Blob([svg], { type: 'image/svg+xml' });
        } else {
          const copy = new Uint8Array(bytes.byteLength);
          copy.set(bytes);
          blob = new Blob([copy.buffer], { type: mimeTypeForPath(actualPath) });
        }
        const url = URL.createObjectURL(blob);
        objectUrls.add(url);
        return url;
      } catch {
        return null;
      }
    })();
    resourceUrls.set(key, promise);
    return promise;
  };

  const hydrateTopic = async (html: string, basePath: string) => {
    const sanitized = sanitizeChmHtmlDocument(html, basePath, false);
    const { document } = sanitized;
    const replacements = await loadResourceMap(
      sanitized.resourcePaths,
      loadResource,
      new Set(),
      MAX_CHM_TOPIC_RESOURCE_PATHS
    );
    const resourceAttributes = ['src', 'poster', 'href', 'xlink-href', 'background', 'lowsrc', 'dynsrc'] as const;
    for (const attribute of resourceAttributes) {
      document.querySelectorAll(`[data-chm-resource-${attribute}]`).forEach(element => {
        const dataAttribute = `data-chm-resource-${attribute}`;
        const path = normalizeChmPath(element.getAttribute(dataAttribute) || '');
        const url = path ? replacements.get(path.toLocaleLowerCase()) : '';
        element.removeAttribute(dataAttribute);
        if (!url) return;
        if (attribute === 'xlink-href') element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
        else element.setAttribute(attribute, url);
      });
    }
    for (const style of Array.from(document.querySelectorAll('style'))) {
      style.textContent = replaceInternalCssResourceUrls(style.textContent || '', replacements);
    }
    for (const element of Array.from(document.querySelectorAll('[style]'))) {
      element.setAttribute('style', replaceInternalCssResourceUrls(element.getAttribute('style') || '', replacements));
    }
    return {
      html: `<!doctype html>${document.documentElement.outerHTML}`,
      title: sanitized.title,
    };
  };

  const syncActiveNavigation = (path: string) => {
    root.querySelectorAll<HTMLElement>('[data-chm-path].is-active').forEach(element => element.classList.remove('is-active'));
    const folded = path.toLocaleLowerCase();
    root.querySelectorAll<HTMLElement>('[data-chm-path]').forEach(element => {
      if ((element.dataset.chmPath || '').toLocaleLowerCase() === folded) element.classList.add('is-active');
    });
  };

  const scrollToFragment = (fragment?: string) => {
    if (!fragment) return;
    const document = frame.contentDocument;
    const target = document?.getElementById(fragment) || document?.getElementsByName(fragment)[0];
    target?.scrollIntoView({ block: 'start' });
  };

  const openTopic = async (path: string, fragment?: string) => {
    const generation = ++topicGeneration;
    const actualPath = resolveEntryPath(path);
    if (!actualPath || !client) throw new Error(`CHM_ENTRY_NOT_FOUND: ${path}`);
    showState(t('opening'));
    try {
      const bytes = await client.read(actualPath, abortController.signal);
      if (bytes.byteLength > client.options.maxHtmlBytes) {
        throw new Error(`CHM_LIMIT_EXCEEDED: topic ${actualPath} is too large to render safely.`);
      }
      const hydrated = await hydrateTopic(decodeChmText(bytes, manifest?.encoding), actualPath);
      if (destroyed || generation !== topicGeneration) return;
      currentHtml = hydrated.html;
      const canonicalPath = normalizeChmPath(actualPath) || actualPath;
      topicTitle.textContent = hydrated.title || manifest?.topics.find(item => normalizeChmPath(item.path)?.toLocaleLowerCase() === canonicalPath.toLocaleLowerCase())?.title || actualPath;
      topicPath.textContent = canonicalPath;
      frame.srcdoc = hydrated.html;
      frame.onload = () => {
        if (destroyed || generation !== topicGeneration) return;
        const frameDocument = frame.contentDocument;
        if (frameDocument) {
          frameDocument.addEventListener('click', event => {
            const eventTarget = event.target;
            const anchor = eventTarget instanceof Element ? eventTarget.closest<HTMLElement>('a[data-chm-link-kind],area[data-chm-link-kind]') : null;
            if (!anchor) return;
            event.preventDefault();
            const kind = anchor.dataset.chmLinkKind;
            const nextPath = anchor.dataset.chmPath;
            const nextFragment = anchor.dataset.chmFragment;
            if (kind === 'fragment') scrollToFragment(nextFragment);
            else if (kind === 'internal' && nextPath) void openTopic(nextPath, nextFragment).catch(showError);
          });
        }
        scrollToFragment(fragment);
      };
      syncActiveNavigation(canonicalPath);
      root.classList.remove('is-sidebar-open');
      errorPanel.remove();
      errorPanel.hidden = true;
      showState('', false);
      context?.onProgressiveRender?.();
    } catch (error) {
      if (generation === topicGeneration && !destroyed) showError(error);
      throw error;
    }
  };

  const appendNavigation = (panel: HTMLElement, nodes: ChmNavigationNode[], emptyText: string) => {
    panel.replaceChildren();
    const flattened = flatNavigation(nodes);
    if (!flattened.length) {
      panel.append(createElement('p', 'chm-panel-note', emptyText));
      return;
    }
    const list = createElement('ul', 'chm-navigation');
    const parentByDepth = new Map<number, HTMLUListElement>([[0, list]]);
    for (const { node, depth } of flattened) {
      const parent = parentByDepth.get(depth) || list;
      const item = createElement('li');
      const normalizedPath = node.path ? normalizeChmPath(node.path) : null;
      const label = normalizedPath
        ? createElement('button', 'chm-nav-button', node.title || normalizedPath)
        : createElement('div', 'chm-nav-label', node.title);
      if (label instanceof HTMLButtonElement && normalizedPath) {
        label.type = 'button';
        label.dataset.chmPath = normalizedPath;
      }
      item.append(label);
      if (node.children.length) {
        const children = createElement('ul');
        item.append(children);
        parentByDepth.set(depth + 1, children);
      } else {
        parentByDepth.delete(depth + 1);
      }
      parent.append(item);
    }
    panel.append(list);
    if (flattened.length >= MAX_RENDERED_NAVIGATION_ITEMS) {
      panel.append(createElement('p', 'chm-panel-note', t('truncated')));
    }
  };

  const selectTab = (name: 'contents' | 'index' | 'search') => {
    tabs.querySelectorAll<HTMLElement>('.chm-tab').forEach(button => button.classList.toggle('is-active', button.dataset.chmTab === name));
    panels.querySelectorAll<HTMLElement>('.chm-panel').forEach(panel => { panel.hidden = panel.dataset.chmPanel !== name; });
    if (name === 'search') searchInput.focus();
  };

  (['contents', 'index', 'search'] as const).forEach((name, index) => {
    const button = createElement('button', `chm-tab${index === 0 ? ' is-active' : ''}`, t(name));
    button.type = 'button';
    button.dataset.chmTab = name;
    button.setAttribute('aria-label', t(name));
    tabs.append(button);
  });

  const renderSearchHits = (hits: ChmSearchHit[], query: string, truncated: boolean) => {
    searchResults.replaceChildren();
    if (!hits.length) {
      searchMeta.textContent = t('noResults');
      return;
    }
    searchMeta.textContent = truncated ? `${hits.length} · ${t('truncated')}` : String(hits.length);
    for (const hit of hits) {
      const button = createElement('button', 'chm-search-result');
      button.type = 'button';
      button.dataset.chmSearchResult = 'true';
      button.dataset.chmPath = hit.path;
      const heading = createElement('strong');
      highlightSnippet(heading, hit.title, query);
      const snippet = createElement('span');
      highlightSnippet(snippet, hit.snippet || hit.path, query);
      button.append(heading, snippet);
      searchResults.append(button);
    }
  };

  const runSearch = async () => {
    const query = searchInput.value.trim();
    const generation = ++searchGeneration;
    if (query.length < 2 || !client) {
      searchResults.replaceChildren();
      searchMeta.textContent = t('searchHint');
      return;
    }
    searchMeta.textContent = t('searching');
    try {
      const result = await client.search(query, abortController.signal);
      if (!destroyed && generation === searchGeneration) renderSearchHits(result.hits, query, result.truncated);
    } catch (error) {
      if (!destroyed && generation === searchGeneration) searchMeta.textContent = error instanceof Error ? error.message : String(error);
    }
  };

  listen(sidebarToggle, 'click', () => root.classList.toggle('is-sidebar-open'));
  listen(tabs, 'click', event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-chm-tab]') : null;
    const name = button?.dataset.chmTab;
    if (name === 'contents' || name === 'index' || name === 'search') selectTab(name);
  });
  listen(panels, 'click', event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-chm-path]') : null;
    if (button?.dataset.chmPath) void openTopic(button.dataset.chmPath).catch(() => undefined);
  });
  listen(searchInput, 'input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void runSearch(), 350);
  });

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    topicGeneration += 1;
    searchGeneration += 1;
    if (searchTimer) clearTimeout(searchTimer);
    abortController.abort();
    frame.onload = null;
    listeners.splice(0).forEach(dispose => dispose());
    client?.destroy();
    client = undefined;
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
    resourceUrls.clear();
    context?.registerExportAdapter?.(null);
    root.remove();
    style.remove();
  };

  const abortFromContext = () => destroy();
  context?.signal?.addEventListener('abort', abortFromContext, { once: true });
  listeners.push(() => context?.signal?.removeEventListener('abort', abortFromContext));

  context?.registerExportAdapter?.({
    print: true,
    exportHtml: true,
    includeDocumentStyles: true,
    toHtml: () => currentHtml || root.outerHTML,
    printStyle: '.chm-sidebar,.chm-header,.chm-topic-bar{display:none!important}.chm-topic-frame{height:auto!important}',
  });

  try {
    client = new ChmWorkerClient(options, onProgress);
    const result = await client.open(buffer, abortController.signal);
    if (destroyed) return { $el: root, destroy };
    manifest = result.manifest;
    entries = result.entries;
    entryLookup = new Map(entries.flatMap(entry => {
      const normalized = normalizeChmPath(entry.path);
      return normalized ? [[normalized.toLocaleLowerCase(), entry.path] as const] : [];
    }));
    title.textContent = manifest.title || context?.filename || 'CHM';
    subtitle.textContent = `${manifest.topics.length} ${t('topics')}`;
    badges.replaceChildren(createElement('span', 'chm-badge', t('ready')));
    if (manifest.hasBinaryToc) badges.append(createElement('span', 'chm-badge is-muted', t('binaryToc')));
    if (manifest.hasFullTextIndex) badges.append(createElement('span', 'chm-badge is-muted', t('fullText')));

    const fallbackContents: ChmNavigationNode[] = manifest.topics.map(item => ({ title: item.title, path: item.path, children: [] }));
    appendNavigation(contentsPanel, manifest.contents.length ? manifest.contents : fallbackContents, t('noContents'));
    appendNavigation(indexPanel, manifest.index, t('noIndex'));

    const candidates = [manifest.homePath, ...manifest.topics.map(item => item.path), ...entries
      .filter(entry => HTML_EXTENSIONS.has(extensionOf(entry.path))).map(entry => entry.path)];
    const homePath = candidates.find(candidate => Boolean(candidate && resolveEntryPath(candidate)));
    if (!homePath) throw new Error(`CHM_NO_TOPIC: ${t('unavailable')}`);
    await openTopic(homePath);
    if (destroyed) return { $el: root, destroy };
    root.dataset.chmReady = 'true';
    errorPanel.remove();
    errorPanel.hidden = true;
    root.dispatchEvent(new CustomEvent('file-viewer:chm-ready', {
      bubbles: true,
      composed: true,
      detail: { title: manifest.title, homePath: normalizeChmPath(homePath), topicCount: manifest.topics.length },
    }));
  } catch (error) {
    if (!destroyed) showError(error);
  }

  return { $el: root, destroy };
}
