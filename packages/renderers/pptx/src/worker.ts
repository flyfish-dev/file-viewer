import type { PptxWorkerFactoryOptions } from './types';

const viteOptimizedWorkerPathPattern = /\/\.?vite\/deps\/worker\/pptx\.worker\.js$/;
const viteSourceWorkerModulePattern = /\/src\/worker\.[cm]?[jt]s$/;
const angularCachePath = '/.angular/cache/';
const viteOptimizedPptxSourcePattern =
  /\/\/\s+(node_modules\/(?:\.pnpm\/[^\n]+?\/node_modules\/)?@file-viewer\/pptx\/dist\/worker\.js)\b/;

const resolveBundledPptxWorkerUrl = () => {
  const moduleUrl = new URL(import.meta.url);
  // Workspace demos and source-linked consumer projects let Vite serve this
  // TypeScript module directly from /@fs/.../src/worker.ts. The built Worker
  // remains under dist/worker, so resolving ./worker from the source module
  // points at a directory that does not exist.
  if (viteSourceWorkerModulePattern.test(moduleUrl.pathname)) {
    return new URL('../dist/worker/pptx.worker.js', moduleUrl);
  }
  return new URL('./worker/pptx.worker.js', import.meta.url);
};

const canResolveAbsolutePathFrom = (url: URL) => url.protocol !== 'data:' && url.protocol !== 'blob:';

const resolveViteDevPptxWorkerUrl = (baseUrl: URL) => new URL(
  '/node_modules/@file-viewer/pptx/dist/worker/pptx.worker.js',
  canResolveAbsolutePathFrom(baseUrl)
    ? baseUrl
    : new URL(typeof location !== 'undefined' ? location.href : 'file:///')
);

const resolveAngularVitePptxWorkerUrl = (baseUrl: URL, workerPath: string) => {
  const cacheIndex = baseUrl.pathname.indexOf(angularCachePath);
  if (cacheIndex < 0) {
    return null;
  }

  const workerUrl = new URL(baseUrl.href);
  workerUrl.pathname = `${workerUrl.pathname.slice(0, cacheIndex)}/${workerPath}`;
  workerUrl.search = '';
  workerUrl.hash = '';
  return workerUrl;
};

const resolveViteOptimizedPptxWorkerUrl = (defaultPptxWorkerUrl: URL) => {
  if (typeof XMLHttpRequest === 'undefined') {
    return null;
  }

  try {
    const request = new XMLHttpRequest();
    // Vite dev-only fallback: inspect the optimized module to recover the real
    // package path when @file-viewer/pptx is only a transitive pnpm dependency.
    request.open('GET', import.meta.url, false);
    request.send(null);

    if ((request.status > 0 && request.status < 200) || request.status >= 400) {
      return null;
    }

    const match = viteOptimizedPptxSourcePattern.exec(request.responseText || '');
    if (!match) {
      return null;
    }

    const workerPath = match[1].replace(/dist\/worker\.js$/, 'dist/worker/pptx.worker.js');
    const angularWorkerUrl = resolveAngularVitePptxWorkerUrl(
      defaultPptxWorkerUrl,
      workerPath
    );
    if (angularWorkerUrl) {
      return angularWorkerUrl;
    }
    const origin = typeof location !== 'undefined' && location.origin
      ? location.origin
      : defaultPptxWorkerUrl.origin;
    return `${origin}/${workerPath}`;
  } catch {
    return null;
  }
};

const resolveDefaultPptxWorkerUrl = () => {
  const defaultPptxWorkerUrl = resolveBundledPptxWorkerUrl();
  if (!canResolveAbsolutePathFrom(defaultPptxWorkerUrl)) {
    return defaultPptxWorkerUrl;
  }
  // Vite dep optimization rewrites import.meta.url into vite/deps, away from
  // this package's worker file. Angular's application builder uses the same
  // optimizer under .angular/cache and prefixes its @fs URL with baseHref.
  if (viteOptimizedWorkerPathPattern.test(defaultPptxWorkerUrl.pathname)) {
    return resolveViteOptimizedPptxWorkerUrl(defaultPptxWorkerUrl)
      || resolveViteDevPptxWorkerUrl(defaultPptxWorkerUrl);
  }
  return defaultPptxWorkerUrl;
};

export const createPptxWorker = (options: PptxWorkerFactoryOptions = {}) => {
  if (options.workerFactory) {
    return options.workerFactory();
  }

  if (options.workerUrl) {
    return new Worker(options.workerUrl, {
      type: options.workerType ?? 'module',
    });
  }

  return new Worker(resolveDefaultPptxWorkerUrl(), {
    type: 'module',
  });
};
