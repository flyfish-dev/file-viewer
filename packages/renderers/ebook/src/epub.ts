import {
  createFileViewerTranslator,
  type FileRenderContext,
  type FileViewerRenderedInstance,
} from '@file-viewer/core';
import { bindEpubViewportMedia, type EpubMediaRendition } from './epub-viewport-media.js';
import { bindEpubReadingTheme } from './epubReadingTheme.js';

type EpubLocation = {
  atEnd?: boolean;
  atStart?: boolean;
  start?: {
    href?: string;
    percentage?: number;
  };
};

type TocItem = {
  depth: number;
  href: string;
  id: string;
  label: string;
};

type EpubMetadata = {
  creator?: unknown;
  title?: unknown;
};

type EpubNavigation = {
  toc?: unknown;
};

type EpubPackaging = {
  navPath?: unknown;
  ncxPath?: unknown;
};

type EpubSpine = {
  items?: Array<{
    href?: unknown;
  }>;
};

type EpubRendition = EpubMediaRendition & {
  destroy(): void;
  display(href?: string): Promise<unknown>;
  next(): Promise<unknown>;
  off(event: 'relocated', listener: (location: EpubLocation) => void): void;
  on(event: 'relocated', listener: (location: EpubLocation) => void): void;
  prev(): Promise<unknown>;
  themes: {
    default(theme: Record<string, Record<string, string>>): void;
  };
};

type EpubBook = {
  coverUrl?: () => Promise<string | null>;
  destroy(): void;
  loaded: {
    metadata: Promise<EpubMetadata>;
    navigation: Promise<EpubNavigation>;
  };
  locations: {
    generate(chars: number): Promise<unknown>;
  };
  package?: EpubPackaging;
  packaging?: EpubPackaging;
  ready: Promise<unknown>;
  renderTo(target: HTMLElement, options: Record<string, unknown>): EpubRendition;
  spine?: EpubSpine;
};

type EpubFactory = (buffer: ArrayBuffer, options?: {
  openAs?: string;
  replacements?: string;
}) => EpubBook;

const isEpubFactory = (value: unknown): value is EpubFactory => {
  return typeof value === 'function';
};

// epub.js can surface as `{ default: { default: ePub } }` in optimized builds.
export const resolveEpubJs = (module: unknown): EpubFactory => {
  const record = module as Record<string, unknown> | undefined;
  const defaultRecord = record?.default as Record<string, unknown> | undefined;
  const candidates = [
    defaultRecord?.default,
    record?.default,
    module,
  ];
  const ePub = candidates.find(isEpubFactory);

  if (!ePub) {
    throw new Error('epubjs module does not expose a callable factory.');
  }

  return ePub;
};

const epubStyle = `
.epub-viewer{width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:var(--file-viewer-render-surface-background,#eef1f4);color:#172033;box-sizing:border-box}
.epub-viewer *{box-sizing:border-box}
.epub-toolbar{flex-shrink:0;display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.92)}
.epub-title{min-width:0;display:flex;flex-direction:column;gap:3px}
.epub-title strong,.epub-title span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.epub-title strong{font-size:14px}
.epub-title span{color:#64748b;font-size:12px}
.epub-icon-button,.epub-button{height:36px;border:1px solid rgba(15,23,42,.08);background:#fff;color:#172033;font:inherit;cursor:pointer}
.epub-icon-button{width:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px}
.epub-icon-button span,.epub-icon-button span::before,.epub-icon-button span::after{width:16px;height:2px;display:block;border-radius:999px;background:currentColor}
.epub-icon-button span{position:relative}
.epub-icon-button span::before,.epub-icon-button span::after{content:'';position:absolute;left:0}
.epub-icon-button span::before{top:-5px}
.epub-icon-button span::after{top:5px}
.epub-icon-button.active{border-color:rgba(37,99,235,.24);background:rgba(37,99,235,.08);color:#1d4ed8}
.epub-actions{display:flex;align-items:center;gap:8px}
.epub-button{min-width:68px;padding:0 12px;border-radius:8px;font-size:13px;font-weight:700}
.epub-button:disabled{color:#94a3b8;cursor:not-allowed}
.epub-progress{min-width:58px;color:#64748b;font-size:12px;text-align:center}
.epub-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(180px,240px) minmax(0,1fr)}
.epub-viewer--toc-hidden .epub-body{grid-template-columns:minmax(0,1fr)}
.epub-toc{min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.8)}
.epub-toc[hidden]{display:none}
.epub-toc-head{flex-shrink:0;display:flex;justify-content:space-between;gap:8px;padding:12px;color:#172033;font-size:13px}
.epub-toc-head span{color:#64748b}
.epub-toc-list{flex:1;min-height:0;overflow:auto;padding:0 8px 10px}
.epub-toc-item{width:100%;min-height:34px;border:0;border-radius:8px;background:transparent;color:#475569;font:inherit;font-size:12px;text-align:left;cursor:pointer}
.epub-toc-item:hover,.epub-toc-item.active{background:rgba(37,99,235,.08);color:#1d4ed8}
.epub-stage-wrap{position:relative;min-width:0;min-height:0;padding:18px;overflow:hidden}
.epub-stage{width:100%;height:100%;overflow-x:hidden;overflow-y:auto;border-radius:8px;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,.12),inset 0 0 0 1px rgba(15,23,42,.06)}
/* epub.js already compensates scroll position when it prepends or resizes chapters. */
.epub-stage .epub-container{width:100%!important;max-width:100%;overflow-x:hidden!important;overflow-y:auto!important;overflow-anchor:none}
.epub-stage iframe{max-width:100%}
.epub-state{position:absolute;inset:18px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(255,255,255,.92);color:#64748b;font-size:14px}
.epub-state[hidden]{display:none!important}
.epub-state.error{color:#b42318}
.epub-viewer[data-epub-theme='dark']{background:var(--file-viewer-render-surface-background,#0f172a);color:#e5e7eb}
.epub-viewer[data-epub-theme='dark'] :is(.epub-toolbar,.epub-toc,.epub-state){background:#111827;color:#e5e7eb;border-color:#334155}
.epub-viewer[data-epub-theme='dark'] :is(.epub-title span,.epub-progress,.epub-toc-head span){color:#94a3b8}
.epub-viewer[data-epub-theme='dark'] :is(.epub-icon-button,.epub-button){background:#1e293b;color:#e5e7eb;border-color:#334155}
.epub-viewer[data-epub-theme='dark'] :is(.epub-toc-head,.epub-toc-item){color:#cbd5e1}
.epub-viewer[data-epub-theme='dark'] .epub-toc-item.active{background:#1e3a5f;color:#bfdbfe}
.epub-viewer[data-epub-reading-theme='dark'] .epub-stage{background:#111827}
@media (max-width:720px){.epub-toolbar{grid-template-columns:40px minmax(0,1fr)}.epub-actions{grid-column:1/-1;justify-content:space-between}.epub-body{position:relative;grid-template-columns:minmax(0,1fr)}.epub-toc{position:absolute;z-index:5;top:0;bottom:0;left:0;width:min(82vw,280px);box-shadow:18px 0 40px rgba(15,23,42,.16)}.epub-stage-wrap{padding:12px}}
`;

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = epubStyle;
  return style;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const normalizeLabel = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const flattenToc = (
  items: unknown,
  fallbackLabel: (index: number) => string,
  depth = 0
): TocItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.flatMap((item, index) => {
    const node = item as Record<string, unknown>;
    const href = typeof node.href === 'string' ? node.href : '';
    const label = normalizeLabel(node.label || node.title, fallbackLabel(index + 1));
    const subitems = flattenToc(node.subitems || node.children, fallbackLabel, depth + 1);
    if (!href) {
      return subitems;
    }
    return [{
      depth,
      href,
      id: `${depth}-${index}-${href}`,
      label,
    }, ...subitems];
  });
};

const pickInitialHref = (items: TocItem[]) => {
  const chapterLike = items.find(item => {
    const label = item.label.toLowerCase();
    return /(^|\s)(chapter|part|book|prologue|preface|introduction)\b/.test(label)
      || /第[一二三四五六七八九十百千0-9]+[章节回部卷篇]/.test(item.label);
  });
  if (chapterLike) {
    return chapterLike.href;
  }

  const readable = items.find(item => {
    const text = `${item.label} ${item.href}`.toLowerCase();
    return !/(cover|titlepage|title-page|copyright|license|toc|contents|nav|table-of-contents|wrap0000)/.test(text);
  });
  return readable?.href || items[0]?.href;
};

const splitEpubHref = (href: string) => {
  const separatorIndex = href.search(/[?#]/);
  if (separatorIndex === -1) {
    return { pathname: href, suffix: '' };
  }
  return {
    pathname: href.slice(0, separatorIndex),
    suffix: href.slice(separatorIndex),
  };
};

const normalizeEpubArchivePath = (pathname: string) => {
  const segments: string[] = [];
  pathname.replace(/\\/g, '/').split('/').forEach(segment => {
    if (!segment || segment === '.') {
      return;
    }
    if (segment === '..') {
      segments.pop();
      return;
    }
    segments.push(segment);
  });
  return segments.join('/');
};

const isExternalEpubHref = (href: string) => {
  return href.startsWith('/') || href.startsWith('//') || /^[a-z][a-z\\d+.-]*:/i.test(href);
};

/**
 * epub.js exposes nav/NCX links relative to the navigation document, while its
 * spine lookup is relative to the OPF. Only rewrite a link when the resolved
 * archive path is an actual spine entry, preserving already-normalized links.
 */
export const resolveEpubNavigationHref = (
  href: string,
  navigationPath: string | undefined,
  spineHrefs: readonly string[]
) => {
  const source = href.trim();
  if (!source || isExternalEpubHref(source)) {
    return source;
  }

  const { pathname, suffix } = splitEpubHref(source);
  const knownSpinePaths = new Set(
    spineHrefs
      .map(value => normalizeEpubArchivePath(splitEpubHref(value).pathname))
      .filter(Boolean)
  );
  const rawPath = normalizeEpubArchivePath(pathname);
  if (rawPath && knownSpinePaths.has(rawPath)) {
    return `${rawPath}${suffix}`;
  }

  const navigation = navigationPath?.trim();
  if (!navigation) {
    return source;
  }
  const navigationPathname = normalizeEpubArchivePath(splitEpubHref(navigation).pathname);
  const navigationDirectory = navigationPathname.split('/').slice(0, -1).join('/');
  const resolvedPath = normalizeEpubArchivePath(`${navigationDirectory}/${pathname}`);
  if (resolvedPath && knownSpinePaths.has(resolvedPath)) {
    return `${resolvedPath}${suffix}`;
  }

  return source;
};

const getEpubNavigationPath = (book: EpubBook) => {
  const packageData = book.packaging || book.package;
  return [packageData?.navPath, packageData?.ncxPath].find(
    (value): value is string => typeof value === 'string' && Boolean(value.trim())
  );
};

const normalizeEpubTocHrefs = (items: TocItem[], book: EpubBook) => {
  const navigationPath = getEpubNavigationPath(book);
  const spineHrefs = book.spine?.items
    ?.flatMap(item => typeof item.href === 'string' ? [item.href] : []) || [];
  return items.map(item => ({
    ...item,
    href: resolveEpubNavigationHref(item.href, navigationPath, spineHrefs),
  }));
};

export default async function renderEpub(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options);
  let book: EpubBook | undefined;
  let rendition: EpubRendition | undefined;
  let disposed = false;
  let tocOpen = true;
  let status: 'loading' | 'ready' | 'error' = 'loading';
  let title = t('epub.title');
  let author = '';
  let tocItems: TocItem[] = [];
  let currentHref = '';
  let progress: number | null = null;
  let atStart = true;
  let atEnd = false;
  const timers = new Set<number>();
  const cleanups: Array<() => void> = [];

  const root = createElement('div', 'epub-viewer');
  const toolbar = createElement('div', 'epub-toolbar');
  const tocButton = createElement('button', 'epub-icon-button') as HTMLButtonElement;
  tocButton.type = 'button';
  tocButton.title = t('ebook.toc');
  tocButton.append(createElement('span'));
  const titleRoot = createElement('div', 'epub-title');
  const titleText = createElement('strong', undefined, title);
  const subtitleText = createElement('span', undefined, t('ebook.reading'));
  titleRoot.append(titleText, subtitleText);
  const actions = createElement('div', 'epub-actions');
  const prevButton = createElement('button', 'epub-button', t('epub.previousPage')) as HTMLButtonElement;
  const progressText = createElement('span', 'epub-progress', t('ebook.reading'));
  const nextButton = createElement('button', 'epub-button', t('epub.nextPage')) as HTMLButtonElement;
  prevButton.type = 'button';
  nextButton.type = 'button';
  actions.append(prevButton, progressText, nextButton);
  toolbar.append(tocButton, titleRoot, actions);

  const body = createElement('div', 'epub-body');
  const toc = createElement('aside', 'epub-toc');
  const tocHead = createElement('div', 'epub-toc-head');
  const tocCount = createElement('span', undefined, t('ebook.itemCount', { count: 0 }));
  tocHead.append(createElement('strong', undefined, t('ebook.toc')), tocCount);
  const tocList = createElement('div', 'epub-toc-list');
  toc.append(tocHead, tocList);
  const stageWrap = createElement('main', 'epub-stage-wrap');
  const stage = createElement('div', 'epub-stage');
  const state = createElement('div', 'epub-state', t('epub.loading'));
  stageWrap.append(stage, state);
  body.append(toc, stageWrap);
  root.append(toolbar, body);
  target.replaceChildren(createStyle(), root);

  const listen = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void
  ) => {
    element.addEventListener(event, listener as EventListener);
    cleanups.push(() => element.removeEventListener(event, listener as EventListener));
  };

  const currentChapter = () => {
    if (!currentHref) {
      return '';
    }
    const exact = tocItems.find(item => item.href === currentHref);
    if (exact) {
      return exact.label;
    }
    return tocItems.find(item => currentHref.includes(item.href.split('#')[0]))?.label || '';
  };

  const progressLabel = () => {
    if (typeof progress === 'number') {
      return `${progress}%`;
    }
    return currentChapter() || t('ebook.reading');
  };

  const syncUi = () => {
    root.classList.toggle('epub-viewer--toc-hidden', !tocOpen);
    toc.hidden = !tocOpen;
    tocButton.classList.toggle('active', tocOpen);
    titleText.textContent = title;
    subtitleText.textContent = author || progressLabel();
    progressText.textContent = progressLabel();
    prevButton.disabled = status !== 'ready' || atStart;
    nextButton.disabled = status !== 'ready' || atEnd;
    state.hidden = status === 'ready';
    state.classList.toggle('error', status === 'error');
    tocCount.textContent = t('ebook.itemCount', { count: tocItems.length });
    Array.from(tocList.querySelectorAll<HTMLButtonElement>('.epub-toc-item')).forEach(button => {
      const itemPath = button.dataset.href?.split('#')[0];
      const currentPath = currentHref.split('#')[0];
      button.classList.toggle('active', Boolean(itemPath) && itemPath === currentPath);
    });
  };

  const showRenditionError = (error: unknown) => {
    if (disposed) {
      return;
    }
    console.error(error);
    status = 'error';
    state.textContent = error instanceof Error ? error.message : String(error);
    syncUi();
  };

  const runRenditionAction = (action: () => Promise<unknown>) => {
    try {
      void action().catch(showRenditionError);
    } catch (error) {
      showRenditionError(error);
    }
  };

  const renderToc = () => {
    tocList.replaceChildren();
    tocItems.forEach(item => {
      const button = createElement('button', 'epub-toc-item', item.label) as HTMLButtonElement;
      button.type = 'button';
      button.dataset.href = item.href;
      button.style.paddingLeft = `${12 + item.depth * 14}px`;
      listen(button, 'click', () => {
        runRenditionAction(() => rendition?.display(item.href) || Promise.resolve());
        tocOpen = false;
        syncUi();
      });
      tocList.append(button);
    });
    syncUi();
  };

  const updateLocation = (epubLocation: EpubLocation) => {
    atStart = Boolean(epubLocation?.atStart);
    atEnd = Boolean(epubLocation?.atEnd);
    currentHref = epubLocation?.start?.href || '';
    if (typeof epubLocation?.start?.percentage === 'number') {
      progress = Math.round(epubLocation.start.percentage * 100);
    }
    syncUi();
  };

  const wait = (ms: number) => new Promise(resolve => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      resolve(undefined);
    }, ms);
    timers.add(timer);
  });

  const hasReadableFrame = () => {
    try {
      const iframe = stage.querySelector('iframe') as HTMLIFrameElement | null;
      const frameBody = iframe?.contentDocument?.body;
      if (!frameBody) {
        return false;
      }
      return Boolean(frameBody.innerText.trim() || frameBody.querySelector('img, svg, canvas'));
    } catch {
      return false;
    }
  };

  const waitForReadableFrame = async () => {
    for (let index = 0; index < 20; index += 1) {
      if (disposed || hasReadableFrame()) {
        return hasReadableFrame();
      }
      await wait(100);
    }
    return hasReadableFrame();
  };

  const openBook = async () => {
    status = 'loading';
    state.textContent = t('epub.loading');
    syncUi();

    try {
      const ePub = resolveEpubJs(await import('./vendor/epubjs.js'));
      if (disposed) {
        return;
      }

      book = ePub(buffer.slice(0), {
        openAs: 'binary',
        replacements: 'blobUrl',
      });

      rendition = book.renderTo(stage, {
        allowScriptedContent: false,
        flow: 'scrolled',
        height: '100%',
        manager: 'continuous',
        resizeOnOrientationChange: true,
        spread: 'none',
        width: '100%',
      });
      cleanups.push(bindEpubViewportMedia(rendition, stage));
      cleanups.push(bindEpubReadingTheme(rendition, target, root, context?.options));

      rendition.themes.default({
        body: {
          color: '#172033',
          fontFamily: 'Georgia, "Times New Roman", serif',
          lineHeight: '1.72',
          padding: '0 8px',
        },
        img: {
          maxWidth: '100%',
        },
        html: {
          height: 'auto',
          overflow: 'auto',
        },
      });
      rendition.on('relocated', updateLocation);

      await book.ready;
      const metadata = await book.loaded.metadata.catch(() => undefined);
      title = normalizeLabel(metadata?.title, title);
      author = normalizeLabel(metadata?.creator, '');

      const navigation = await book.loaded.navigation.catch(() => undefined);
      tocItems = normalizeEpubTocHrefs(
        flattenToc(
          (navigation as { toc?: unknown } | undefined)?.toc,
          index => t('epub.chapterFallback', { index })
        ),
        book
      );
      renderToc();

      await rendition.display(pickInitialHref(tocItems));
      if (!await waitForReadableFrame()) {
        throw new Error(t('epub.renderIncomplete'));
      }
      if (disposed) {
        return;
      }
      status = 'ready';
      syncUi();
      void book.locations.generate(1200).catch(() => undefined);
    } catch (error) {
      showRenditionError(error);
    }
  };

  listen(tocButton, 'click', () => {
    tocOpen = !tocOpen;
    syncUi();
  });
  listen(prevButton, 'click', () => {
    runRenditionAction(() => rendition?.prev() || Promise.resolve());
  });
  listen(nextButton, 'click', () => {
    runRenditionAction(() => rendition?.next() || Promise.resolve());
  });

  syncUi();
  context?.registerThumbnailAdapter?.({
    captureSource: 'embedded',
    beforeCapture: async ({ signal }) => {
      while (status === 'loading' && !disposed) {
        if (signal?.aborted) {
          throw signal.reason;
        }
        await wait(16);
      }
      if (status === 'error') {
        throw new Error(state.textContent || t('epub.renderIncomplete'));
      }
    },
    capture: async () => {
      const coverUrl = await book
        ?.coverUrl?.()
        .catch(() => null);
      if (!coverUrl) {
        return null;
      }
      return fetch(coverUrl).then(response => response.ok ? response.blob() : null).catch(() => null);
    },
    getTarget: () => stage.querySelector('iframe')?.contentDocument?.body || stage,
  });
  void openBook();

  return {
    $el: root,
    unmount() {
      disposed = true;
      context?.registerThumbnailAdapter?.(null);
      timers.forEach(timer => window.clearTimeout(timer));
      timers.clear();
      cleanups.splice(0).forEach(cleanup => cleanup());
      if (rendition) {
        rendition.off('relocated', updateLocation);
        rendition.destroy();
        rendition = undefined;
      }
      book?.destroy();
      book = undefined;
      target.replaceChildren();
    },
  };
}
