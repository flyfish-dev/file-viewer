import type { PptxWorkerFactoryOptions } from './types';
import { isResolvedPptxWorkerLocation } from './worker-location';

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

const resolvePptxWorkerUrl = (allowDependencyRelativeUrl: boolean): string | undefined => {
  try {
    const moduleUrl = new URL(import.meta.url);
    const workerUrl = resolveBundledPptxWorkerUrl();
    if (isResolvedPptxWorkerLocation(moduleUrl, workerUrl)) return workerUrl.href;
    if (viteOptimizedWorkerPathPattern.test(workerUrl.pathname)) {
      const optimizedUrl = resolveViteOptimizedPptxWorkerUrl(workerUrl);
      return optimizedUrl ? String(optimizedUrl) : undefined;
    }
    // An untouched dependency-relative URL points below the application bundle,
    // not this package. Renderers with copied-asset discovery must not select it.
    return allowDependencyRelativeUrl ? workerUrl.href : undefined;
  } catch {
    // An inlined module without a resolvable package base can still use the
    // host's standard copied assets or an explicitly configured Worker URL.
  }
  return undefined;
};

/** Returns only a Worker URL that the active bundler has emitted or serves directly. */
export const resolvePptxPackageWorkerUrl = (): string | undefined => {
  return resolvePptxWorkerUrl(false);
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

  // Direct PptxViewer users have no renderer-level copied-asset discovery.
  const workerUrl = resolvePptxWorkerUrl(true)
  if (!workerUrl) {
    throw new Error(
      'PPTX Worker URL is unavailable. Run file-viewer-copy-assets or provide workerUrl.'
    )
  }
  return new Worker(workerUrl, { type: 'module' })
};
