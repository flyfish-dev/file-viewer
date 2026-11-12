import {
  resolveFileViewerArchiveWasmUrl,
  resolveFileViewerArchiveWorkerUrl,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets';
import {
  collectFileViewerRendererPlugins,
  createFileRenderHandlerLoader,
  createFileViewerCoreRendererRegistry,
  createFileViewerTranslator,
  createFileViewerI18nBindings,
  createFileViewerNestedI18n,
  createRendererRegistry,
  disposeFileViewerRendered,
  installFileViewerRendererPlugins,
  listFileViewerAutoRendererPresets,
  normalizeFileViewerUiDensity,
  normalizeSource,
  resolveFileViewerRendererPresetInputs,
  type FileRenderContext,
  type FileRenderHandler,
  type FileViewerArchivePasswordRequestReason,
  type FileViewerArchiveOptions,
  type FileViewerRenderedInstance,
  type FileViewerRendererPluginInput,
  type FileViewerRendererPresetInput,
  type RendererRegistry,
  type RendererSession,
} from '@file-viewer/core';
import {
  buildArchiveNestedRenderContext,
  createArchiveCacheKey,
  flattenArchiveObject,
  formatArchiveBytes,
  getArchiveEntryExtension,
  isArchiveEntryDownloadAllowed,
  type ArchiveEntryView,
} from './archiveShared.js';
import { readArchiveCache, writeArchiveCache } from './archiveCache.js';
import { resolveArchiveLimits } from './archiveLimits.js';
import {
  hasLikelyGbkZipFilenames,
  isLikelyEncryptedArchive,
  loadArchiveEntriesWithoutWorker,
} from './archiveFallback.js';
import {
  comicBookStyle,
  createComicBookController,
} from './comicBook.js';
import {
  createShapefileBundleArchive,
  getShapefileBundleEntries,
} from './shapefileBundle.js';

type WorkerConstructor = new (scriptURL: string | URL, options?: WorkerOptions) => Worker;
type FileConstructor = new (fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) => File;

interface ArchiveWorkerCandidate {
  label: string;
  workerUrl: string;
  wasmUrl?: string;
}

const DEFAULT_WORKER_TIMEOUT_MS = 30000;
const MAX_LISTED_ENTRIES = 5000;

class ArchivePasswordCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchivePasswordCancelledError';
  }
}

const archiveStyle = `
	${comicBookStyle}
	.archive-shell,.archive-viewer{position:relative;box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;display:grid;grid-template-columns:var(--archive-sidebar-track) minmax(0,1fr);grid-template-rows:minmax(0,1fr);--archive-sidebar-track:clamp(248px,30%,420px);--archive-sidebar-gap:8px;--archive-sidebar-padding:10px;--archive-head-gap:8px;--archive-eyebrow-size:10px;--archive-title-margin:2px;--archive-title-size:15px;--archive-stats-margin:4px;--archive-stats-size:11px;--archive-stats-line:1.35;--archive-toggle-size:32px;--archive-toggle-radius:9px;--archive-notice-padding:7px 9px;--archive-notice-radius:9px;--archive-notice-size:11px;--archive-search-height:36px;--archive-search-padding:0 10px;--archive-search-radius:9px;--archive-search-font-size:12px;--archive-list-gap:4px;--archive-list-padding:3px;--archive-entry-min-height:48px;--archive-entry-icon-column:34px;--archive-entry-gap:7px;--archive-entry-padding-y:5px;--archive-entry-padding-x:7px;--archive-entry-depth-step:8px;--archive-entry-depth-max:40px;--archive-entry-radius:9px;--archive-entry-ext-height:28px;--archive-entry-ext-radius:7px;--archive-entry-ext-size:9px;--archive-entry-name-size:13px;--archive-entry-name-line:1.25;--archive-entry-meta-size:11px;--archive-entry-meta-line:1.3;--archive-entry-size-width:64px;--archive-preview-toolbar-min-height:56px;--archive-preview-toolbar-gap:10px;--archive-preview-toolbar-padding:10px 12px;--archive-preview-button-height:32px;--archive-preview-button-padding:0 10px;--archive-preview-button-radius:9px;--archive-empty-padding:24px;--archive-state-gap:10px;--archive-state-padding:14px;--archive-state-radius:14px;background:#edf2f7;color:#172033;font-family:Aptos,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
	.archive-shell *,.archive-viewer *{box-sizing:border-box}
	.archive-shell[data-viewer-density='compact'],.archive-viewer[data-viewer-density='compact'],.file-viewer[data-viewer-density='compact'] .archive-shell,.file-viewer[data-viewer-density='compact'] .archive-viewer,.file-viewer-web-shell[data-viewer-density='compact'] .archive-shell,.file-viewer-web-shell[data-viewer-density='compact'] .archive-viewer{--archive-sidebar-track:clamp(224px,27%,360px);--archive-sidebar-gap:4px;--archive-sidebar-padding:6px;--archive-head-gap:5px;--archive-eyebrow-size:9px;--archive-title-margin:1px;--archive-title-size:14px;--archive-stats-margin:2px;--archive-stats-size:10px;--archive-toggle-size:28px;--archive-toggle-radius:7px;--archive-notice-padding:4px 6px;--archive-notice-radius:7px;--archive-notice-size:10px;--archive-search-height:30px;--archive-search-padding:0 7px;--archive-search-radius:7px;--archive-search-font-size:11px;--archive-list-gap:3px;--archive-list-padding:2px;--archive-entry-min-height:40px;--archive-entry-icon-column:28px;--archive-entry-gap:5px;--archive-entry-padding-y:3px;--archive-entry-padding-x:5px;--archive-entry-depth-step:6px;--archive-entry-depth-max:32px;--archive-entry-radius:7px;--archive-entry-ext-height:24px;--archive-entry-ext-radius:6px;--archive-entry-ext-size:8px;--archive-entry-name-size:12px;--archive-entry-meta-size:10px;--archive-entry-size-width:54px;--archive-preview-toolbar-min-height:38px;--archive-preview-toolbar-gap:5px;--archive-preview-toolbar-padding:4px 5px;--archive-preview-button-height:28px;--archive-preview-button-padding:0 5px;--archive-preview-button-radius:7px;--archive-empty-padding:18px;--archive-state-gap:5px;--archive-state-padding:5px;--archive-state-radius:10px}
	@media (pointer:coarse){.archive-shell[data-viewer-density='compact'],.archive-viewer[data-viewer-density='compact'],.file-viewer[data-viewer-density='compact'] .archive-shell,.file-viewer[data-viewer-density='compact'] .archive-viewer,.file-viewer-web-shell[data-viewer-density='compact'] .archive-shell,.file-viewer-web-shell[data-viewer-density='compact'] .archive-viewer{--archive-toggle-size:34px;--archive-search-height:36px;--archive-entry-min-height:50px;--archive-entry-ext-height:30px;--archive-preview-toolbar-min-height:48px;--archive-preview-button-height:34px}}
	.archive-sidebar{grid-column:1;grid-row:1;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:var(--archive-sidebar-gap);padding:var(--archive-sidebar-padding);border-right:1px solid rgba(23,32,51,.08);background:rgba(255,255,255,.72);transition:opacity .18s ease,padding .18s ease,border-color .18s ease}
.archive-shell.archive-sidebar-collapsed,.archive-viewer.archive-sidebar-collapsed{grid-template-columns:0 minmax(0,1fr)}
.archive-sidebar-collapsed .archive-sidebar{display:none;width:0;max-width:0;padding:0;border-color:transparent;opacity:0;pointer-events:none}
.archive-sidebar-collapsed .archive-sidebar>*{visibility:hidden}
	.archive-head{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:var(--archive-head-gap);align-items:start}
	.archive-head-main{min-width:0}
	.archive-head span,.archive-preview-toolbar span{color:#6c7c90;font-size:var(--archive-eyebrow-size);font-weight:800;letter-spacing:.02em}
	.archive-head strong,.archive-preview-toolbar strong{display:block;margin-top:var(--archive-title-margin);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--archive-title-size);line-height:1.25}
	.archive-head p{min-width:0;margin:var(--archive-stats-margin) 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#69798b;font-size:var(--archive-stats-size);line-height:var(--archive-stats-line);font-variant-numeric:tabular-nums}
	.archive-sidebar-toggle{width:var(--archive-toggle-size);height:var(--archive-toggle-size);flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(23,32,51,.1);border-radius:var(--archive-toggle-radius);background:#fff;color:#1f7a58;font:inherit;font-size:17px;font-weight:900;line-height:1;cursor:pointer;box-shadow:0 6px 16px rgba(23,32,51,.07)}
	.archive-sidebar-toggle:hover{border-color:rgba(31,122,88,.32);background:#f0fdf4}
	.archive-warning,.archive-info,.archive-error{border-radius:var(--archive-notice-radius);padding:var(--archive-notice-padding);background:#fff7e8;color:#8a4b00;font-size:var(--archive-notice-size);line-height:1.4}
	.archive-info{background:#ecfdf5;color:#166534}
	.archive-search{width:100%;height:var(--archive-search-height);padding:var(--archive-search-padding);border-radius:var(--archive-search-radius);border:1px solid rgba(23,32,51,.1);outline:none;background:#fff;color:#172033;font-family:inherit;font-size:var(--archive-search-font-size);line-height:1.2}
	.archive-list{flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;display:flex;flex-direction:column;gap:var(--archive-list-gap);padding-right:var(--archive-list-padding)}
	.archive-entry{width:100%;min-width:0;min-height:var(--archive-entry-min-height);display:grid;grid-template-columns:var(--archive-entry-icon-column) minmax(0,1fr) minmax(40px,auto);gap:var(--archive-entry-gap);align-items:center;padding:var(--archive-entry-padding-y) var(--archive-entry-padding-x) var(--archive-entry-padding-y) calc(var(--archive-entry-padding-x) + clamp(0px,calc(var(--entry-depth,0) * var(--archive-entry-depth-step)),var(--archive-entry-depth-max)));border:1px solid rgba(23,32,51,.07);border-radius:var(--archive-entry-radius);background:rgba(255,255,255,.86);color:inherit;text-align:left;cursor:pointer;font-family:inherit;font-size:var(--archive-entry-name-size);line-height:var(--archive-entry-name-line)}
	.archive-entry:hover,.archive-entry.active{border-color:rgba(33,129,95,.28);box-shadow:0 10px 22px rgba(23,32,51,.08)}
	.entry-ext{min-width:0;height:var(--archive-entry-ext-height);display:inline-flex;align-items:center;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 3px;border-radius:var(--archive-entry-ext-radius);background:rgba(33,129,95,.12);color:#1d7a56;font-size:var(--archive-entry-ext-size);font-weight:900;line-height:1;text-transform:uppercase}
	.entry-copy{min-width:0}
	.entry-copy strong,.entry-copy em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
	.entry-copy strong{font-size:var(--archive-entry-name-size);font-weight:650;line-height:var(--archive-entry-name-line)}
	.entry-copy em,.archive-entry small{color:#718096;font-size:var(--archive-entry-meta-size);font-style:normal;line-height:var(--archive-entry-meta-line)}
	.archive-entry small{min-width:0;max-width:var(--archive-entry-size-width);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.archive-preview{grid-column:2;grid-row:1;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column}
	.archive-preview-toolbar{min-width:0;min-height:var(--archive-preview-toolbar-min-height);display:flex;align-items:center;gap:var(--archive-preview-toolbar-gap);padding:var(--archive-preview-toolbar-padding);border-bottom:1px solid rgba(23,32,51,.08);background:rgba(255,255,255,.76)}
	.archive-preview-toolbar button{height:var(--archive-preview-button-height);border:0;border-radius:var(--archive-preview-button-radius);padding:var(--archive-preview-button-padding);background:#1f7a58;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
.archive-preview-toolbar .archive-sidebar-toggle{background:#fff;color:#1f7a58;border:1px solid rgba(23,32,51,.1);padding:0}
.archive-preview-title{min-width:0;flex:1}
.archive-preview-toolbar span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.archive-preview-toolbar .archive-download-button{flex:0 0 auto}
.archive-nested-target{position:relative;flex:1;min-height:0;overflow:auto}
.archive-nested-content{width:100%;height:100%;min-height:420px}
	.archive-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--archive-empty-padding);text-align:center;color:#64748b}
.archive-empty strong{color:#172033;font-size:18px}
.archive-state{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(241,245,249,.82);backdrop-filter:blur(8px);z-index:4}
	.archive-state>div{display:flex;align-items:center;gap:var(--archive-state-gap);width:min(92%,430px);padding:var(--archive-state-padding);border-radius:var(--archive-state-radius);background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.14)}
.archive-state p{margin:4px 0 0;color:#64748b}
.archive-spinner{width:34px;height:34px;flex-shrink:0;border-radius:999px;border:3px solid rgba(31,122,88,.16);border-top-color:#1f7a58;animation:archive-spin .9s linear infinite}
.archive-error{position:absolute;right:18px;bottom:18px;width:min(460px,calc(100% - 36px));box-shadow:0 16px 36px rgba(23,32,51,.14);z-index:5}
.archive-password-dialog{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(15,23,42,.42);backdrop-filter:blur(10px)}
.archive-password-card{width:min(420px,100%);display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:18px;background:#fff;color:#172033;box-shadow:0 24px 56px rgba(15,23,42,.24)}
.archive-password-card h3{margin:0;font-size:19px;line-height:1.25}
.archive-password-card p{margin:0;color:#64748b;font-size:13px;line-height:1.55}
.archive-password-card input{width:100%;height:44px;border-radius:12px;border:1px solid rgba(23,32,51,.12);outline:none;padding:0 12px;background:#fff;color:#172033;font:inherit}
.archive-password-card input:focus{border-color:rgba(31,122,88,.48);box-shadow:0 0 0 3px rgba(31,122,88,.12)}
.archive-password-error{min-height:18px;color:#b42318!important}
.archive-password-actions{display:flex;justify-content:flex-end;gap:10px}
.archive-password-actions button{height:38px;border:0;border-radius:10px;padding:0 14px;font:inherit;font-weight:800;cursor:pointer}
.archive-password-cancel{background:#eef2f7;color:#334155}
.archive-password-submit{background:#1f7a58;color:#fff}
.archive-hidden{display:none!important}
[data-viewer-theme='dark'] .archive-shell,[data-viewer-theme='dark'] .archive-viewer{background:#101820;color:#e6edf3}
[data-viewer-theme='dark'] .archive-sidebar,[data-viewer-theme='dark'] .archive-preview-toolbar{border-color:rgba(139,148,158,.2);background:rgba(21,27,35,.82)}
[data-viewer-theme='dark'] .archive-entry,[data-viewer-theme='dark'] .archive-search,[data-viewer-theme='dark'] .archive-state>div{background:#151b23;color:#e6edf3;border-color:rgba(139,148,158,.2)}
[data-viewer-theme='dark'] .archive-head span,[data-viewer-theme='dark'] .archive-preview-toolbar span,[data-viewer-theme='dark'] .archive-head p,[data-viewer-theme='dark'] .entry-copy em,[data-viewer-theme='dark'] .archive-entry small{color:#9cacc0}
[data-viewer-theme='dark'] .archive-password-card{background:#151b23;color:#e6edf3}
[data-viewer-theme='dark'] .archive-password-card input{background:#0d1117;color:#e6edf3;border-color:rgba(139,148,158,.24)}
[data-viewer-theme='dark'] .archive-password-cancel{background:#212a35;color:#d7dee8}
[data-viewer-theme='dark'] .archive-empty strong{color:#f8fafc}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .archive-shell,[data-viewer-theme='system'] .archive-viewer{background:#101820;color:#e6edf3}[data-viewer-theme='system'] .archive-sidebar,[data-viewer-theme='system'] .archive-preview-toolbar{border-color:rgba(139,148,158,.2);background:rgba(21,27,35,.82)}[data-viewer-theme='system'] .archive-entry,[data-viewer-theme='system'] .archive-search,[data-viewer-theme='system'] .archive-state>div{background:#151b23;color:#e6edf3;border-color:rgba(139,148,158,.2)}[data-viewer-theme='system'] .archive-head span,[data-viewer-theme='system'] .archive-preview-toolbar span,[data-viewer-theme='system'] .archive-head p,[data-viewer-theme='system'] .entry-copy em,[data-viewer-theme='system'] .archive-entry small{color:#9cacc0}[data-viewer-theme='system'] .archive-password-card{background:#151b23;color:#e6edf3}[data-viewer-theme='system'] .archive-password-card input{background:#0d1117;color:#e6edf3;border-color:rgba(139,148,158,.24)}[data-viewer-theme='system'] .archive-password-cancel{background:#212a35;color:#d7dee8}[data-viewer-theme='system'] .archive-empty strong{color:#f8fafc}}
@keyframes archive-spin{to{transform:rotate(360deg)}}
@media (max-width:860px){.archive-shell,.archive-viewer{grid-template-columns:1fr;grid-template-rows:minmax(200px,34%) minmax(0,1fr);--archive-sidebar-gap:6px;--archive-sidebar-padding:8px;--archive-title-size:14px;--archive-stats-size:10px;--archive-search-height:38px;--archive-search-font-size:16px;--archive-list-gap:3px;--archive-entry-min-height:44px;--archive-entry-icon-column:30px;--archive-entry-gap:6px;--archive-entry-padding-y:4px;--archive-entry-padding-x:6px;--archive-entry-depth-step:6px;--archive-entry-depth-max:24px;--archive-entry-ext-height:26px;--archive-entry-name-size:12px;--archive-entry-meta-size:10px;--archive-entry-size-width:52px}.archive-shell.archive-sidebar-collapsed,.archive-viewer.archive-sidebar-collapsed{grid-template-columns:1fr;grid-template-rows:0 minmax(0,1fr)}.archive-sidebar{grid-column:1;grid-row:1;border-right:0;border-bottom:1px solid rgba(23,32,51,.08)}.archive-preview{grid-column:1;grid-row:2}.archive-preview-toolbar{min-height:52px;padding:8px 10px}.archive-preview-toolbar strong{font-size:15px}.archive-entry{grid-template-columns:var(--archive-entry-icon-column) minmax(0,1fr) minmax(40px,auto)}}
`;

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = archiveStyle;
  return style;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = documentRef.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const normalizeWorkerError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message;
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason);
};

const isArchivePasswordError = (reason: unknown) => {
  const message = normalizeWorkerError(reason).toLowerCase();
  return /passphrase|password|encrypted|decrypt|crypto|wrong key|incorrect/i.test(message);
};

type ArchiveNestedRenderHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;
type ArchiveNestedPresetInput = FileViewerRendererPresetInput<ArchiveNestedRenderHandler>;

const resolveAutoRenderersEnabled = (options: FileRenderContext['options'] = {}) => {
  const setting = options.autoRenderers;
  if (typeof setting === 'boolean') {
    return setting;
  }
  if (setting?.enabled !== undefined) {
    return setting.enabled;
  }
  return (options.rendererMode || 'extend') !== 'replace';
};

const createNestedRendererRegistry = async (
  context?: FileRenderContext
): Promise<RendererRegistry> => {
  const options = context?.options || {};
  const registry = options.rendererMode === 'replace'
    ? createRendererRegistry([])
    : createFileViewerCoreRendererRegistry({
        builtinRenderers: options.builtinRenderers,
      }).registry;
  const rendererInputs: FileViewerRendererPluginInput<ArchiveNestedRenderHandler>[] = [];

  if (resolveAutoRenderersEnabled(options)) {
    rendererInputs.push(...listFileViewerAutoRendererPresets<ArchiveNestedRenderHandler>());
  }

  rendererInputs.push(
    ...resolveFileViewerRendererPresetInputs<ArchiveNestedRenderHandler>(
      options.preset as ArchiveNestedPresetInput | undefined
    ),
    ...resolveFileViewerRendererPresetInputs<ArchiveNestedRenderHandler>(
      options.presets as ArchiveNestedPresetInput | undefined
    )
  );

  if (options.renderers) {
    rendererInputs.push(options.renderers as FileViewerRendererPluginInput<ArchiveNestedRenderHandler>);
  }

  const plugins = collectFileViewerRendererPlugins<ArchiveNestedRenderHandler>(rendererInputs);
  if (!plugins.length) {
    return registry;
  }

  await installFileViewerRendererPlugins({
    registry,
    plugins,
    registerHandler: registration => {
      const definition = registry.getById(registration.rendererId);
      if (!definition) {
        return;
      }

      registry.register({
        ...definition,
        load: createFileRenderHandlerLoader({
          handler: registration.handler,
          getTarget: loadContext => loadContext.surface.container as HTMLDivElement,
        }),
      });
    },
  });

  return registry;
};

const createNestedRenderedInstance = (
  target: HTMLDivElement,
  session: RendererSession
): FileViewerRenderedInstance => ({
  $el: target,
  destroy: () => session.destroy?.(),
});

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeout: number,
  message: string,
  targetWindow?: Window | null
) => {
  let timer = 0;
  const timerWindow = targetWindow || (typeof window !== 'undefined' ? window : undefined);

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = timerWindow?.setTimeout
          ? timerWindow.setTimeout(() => reject(new Error(message)), timeout)
          : setTimeout(() => reject(new Error(message)), timeout) as unknown as number;
      }),
    ]);
  } finally {
    if (timerWindow?.clearTimeout) {
      timerWindow.clearTimeout(timer);
    } else {
      clearTimeout(timer as unknown as ReturnType<typeof setTimeout>);
    }
  }
};

const getDocumentBaseUrl = (documentRef: Document) => {
  return documentRef.baseURI ||
    documentRef.URL ||
    'file:///';
};

const getWorkerConstructor = (documentRef: Document): WorkerConstructor => {
  const WorkerCtor = documentRef.defaultView?.Worker ||
    (typeof Worker !== 'undefined' ? Worker : undefined);
  if (!WorkerCtor) {
    throw new Error('Web Worker is not supported by this browser.');
  }
  return WorkerCtor as WorkerConstructor;
};

const getFileConstructor = (documentRef: Document): FileConstructor | undefined => {
  return (documentRef.defaultView?.File ||
    (typeof File !== 'undefined' ? File : undefined)) as FileConstructor | undefined;
};

const createArchiveFile = (documentRef: Document, buffer: ArrayBuffer, filename: string) => {
  const FileCtor = getFileConstructor(documentRef);
  if (FileCtor) {
    return new FileCtor([buffer], filename || 'archive.bin', {
      type: 'application/octet-stream',
    });
  }
  return Object.assign(new Blob([buffer], { type: 'application/octet-stream' }), {
    name: filename || 'archive.bin',
  }) as File;
};

const probeWorkerUrl = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && /javascript|ecmascript|octet-stream/i.test(contentType)) {
      return true;
    }
    if (response.status && response.status !== 405) {
      return false;
    }
  } catch {
    // Some local servers do not support HEAD; continue with a tiny GET probe.
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        Range: 'bytes=0-0',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && /javascript|ecmascript|octet-stream/i.test(contentType);
  } catch {
    return false;
  }
};

const patchLibarchiveWorkerSource = (source: string, wasmUrl: string) => {
  const wasmLiteral = JSON.stringify(wasmUrl);
  return source.replace(
    /new URL\((['"])libarchive\.wasm\1\s*,\s*import\.meta\.url\)\.href/g,
    wasmLiteral
  );
};

const prepareWorkerUrl = async (
  candidate: ArchiveWorkerCandidate,
  objectUrls: string[]
) => {
  if (!candidate.wasmUrl) {
    return candidate.workerUrl;
  }

  const response = await fetch(candidate.workerUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to read libarchive Worker: ${response.status}`);
  }
  const source = await response.text();
  const workerUrl = URL.createObjectURL(new Blob([
    patchLibarchiveWorkerSource(source, candidate.wasmUrl),
  ], { type: 'application/javascript' }));
  objectUrls.push(workerUrl);
  return workerUrl;
};

const resolveWorkerCandidates = async (
  documentRef: Document,
  options?: FileViewerArchiveOptions
): Promise<ArchiveWorkerCandidate[]> => {
  const candidates: ArchiveWorkerCandidate[] = [];
  const baseUrl = resolveFileViewerRuntimeAssetBaseUrl(documentRef) || getDocumentBaseUrl(documentRef);
  const wasmUrl = options?.wasmUrl
    ? resolveFileViewerArchiveWasmUrl(options, '', baseUrl)
    : undefined;

  if (options?.workerUrl) {
    candidates.push({
      label: 'custom libarchive Worker',
      workerUrl: resolveFileViewerArchiveWorkerUrl(options, baseUrl),
      wasmUrl,
    });
    return candidates;
  }

  const publicWorkerUrl = resolveFileViewerArchiveWorkerUrl(undefined, baseUrl);
  if (await probeWorkerUrl(publicWorkerUrl)) {
    candidates.push({
      label: 'static libarchive Worker',
      workerUrl: publicWorkerUrl,
      wasmUrl,
    });
  }

  return candidates;
};

const renderNestedWithCurrentOptions = async (
  buffer: ArrayBuffer,
  type: string,
  target: HTMLDivElement,
  context?: FileRenderContext
) => {
  const t = createFileViewerTranslator(context?.i18n || context?.options);
  const registry = await createNestedRendererRegistry(context);
  const renderer = registry.getByExtension(type);
  if (!renderer?.load) {
    const bindings = createFileViewerI18nBindings(context?.i18n);
    bindings.text(target, () => t('archive.error.nestedUnsupported', { type }));
    return { $el: target, unmount() { bindings.destroy(); target.replaceChildren(); } };
  }

  const session = await renderer.load({
    source: normalizeSource({
      buffer,
      filename: context?.filename || `preview.${type}`,
      type,
      url: context?.url,
    }),
    surface: { container: target },
    options: context?.options || {},
    registerExportAdapter: context?.registerExportAdapter,
    renderContext: {
      ...context,
      renderNestedBuffer: context?.renderNestedBuffer || renderNestedWithCurrentOptions,
    },
  });

  return createNestedRenderedInstance(target, session);
};

const renderNestedEntry = (
  buffer: ArrayBuffer,
  type: string,
  target: HTMLDivElement,
  context?: FileRenderContext
) => {
  const nestedRender = context?.renderNestedBuffer || renderNestedWithCurrentOptions;
  return nestedRender(buffer, type, target, {
    ...context,
    renderNestedBuffer: context?.renderNestedBuffer || renderNestedWithCurrentOptions,
  });
};

export default async function renderArchive(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument;
  const targetWindow = documentRef.defaultView || null;
  const archiveOptions = context?.options?.archive;
  const filename = context?.filename || 'archive.bin';
  const sourceExtension = (_type || getArchiveEntryExtension(filename)).toLowerCase();
  const { maxArchiveSize, maxEntryPreviewSize } = resolveArchiveLimits(archiveOptions);
  const cacheEnabled = archiveOptions?.cache !== false;
  const workerTimeoutMs = archiveOptions?.workerTimeoutMs || DEFAULT_WORKER_TIMEOUT_MS;
  const hasLegacyGbkZipFilenames = hasLikelyGbkZipFilenames(buffer, filename);
  const objectUrls: string[] = [];
  const cleanups: Array<() => void> = [];
  let archiveReader: any = null;
  let entries: ArchiveEntryView[] = [];
  let selectedEntry: ArchiveEntryView | null = null;
  let nestedRendered: FileViewerRenderedInstance | undefined;
  let loading = false;
  const t = createFileViewerTranslator(context?.i18n || context?.options);
  const bindings = createFileViewerI18nBindings(context?.i18n);
  const owned = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string | undefined, value: () => string) => {
    const node = createElement(documentRef, tag, className);
    bindings.text(node, value);
    return node;
  };
  let loadingText = () => t('archive.loading.readingDirectory');
  let loadingHint = () => t('archive.loading.readingDirectoryHint');
  let errorText = () => '';
  let archiveNotice = () => '';
  let encrypted: boolean | null = null;
  let filterText = '';
  let passwordAttempt = 0;
  let passwordResolver: ((password: string | null) => void) | null = null;
  let sidebarCollapsed = false;
  let previewSequence = 0;
  let destroyPromise: Promise<void> | undefined;
  const pendingNestedCleanups = new Set<Promise<void>>();

  const style = createStyle(documentRef);
  const root = createElement(documentRef, 'section', 'archive-shell archive-viewer');
  root.dataset.viewerDensity = normalizeFileViewerUiDensity(context?.options?.ui?.density);
  const sidebar = createElement(documentRef, 'aside', 'archive-sidebar');
  const head = createElement(documentRef, 'div', 'archive-head');
  const headMain = createElement(documentRef, 'div', 'archive-head-main');
  const badge = createElement(documentRef, 'span', undefined, 'ARCHIVE');
  const title = createElement(documentRef, 'strong', undefined, filename);
  title.title = filename;
  const stats = createElement(documentRef, 'p');
  stats.setAttribute('role', 'status');
  stats.setAttribute('aria-live', 'polite');
  const sidebarHideButton = createElement(documentRef, 'button', 'archive-sidebar-toggle') as HTMLButtonElement;
  sidebarHideButton.type = 'button';
  headMain.append(badge, title, stats);
  head.append(headMain, sidebarHideButton);

  const warning = createElement(documentRef, 'div', 'archive-warning');
  const info = createElement(documentRef, 'div', 'archive-info');
  const search = createElement(documentRef, 'input', 'archive-search') as HTMLInputElement;
  search.type = 'search';
  bindings.attr(search, 'placeholder', () => t('archive.search.placeholder'));
  const list = createElement(documentRef, 'div', 'archive-list');
  list.setAttribute('role', 'list');
  sidebar.append(head, warning, info, search, list);

  const preview = createElement(documentRef, 'main', 'archive-preview');
  const toolbar = createElement(documentRef, 'div', 'archive-preview-toolbar');
  const sidebarShowButton = createElement(documentRef, 'button', 'archive-sidebar-toggle') as HTMLButtonElement;
  sidebarShowButton.type = 'button';
  const toolbarTitle = createElement(documentRef, 'div', 'archive-preview-title');
  toolbarTitle.append(
    owned('span', undefined, () => t('archive.preview.title')),
    owned('strong', undefined, () => t('archive.preview.chooseFile'))
  );
  const downloadButton = owned('button', 'archive-download-button', () => t('archive.preview.downloadFile')) as HTMLButtonElement;
  downloadButton.type = 'button';
  const nestedTarget = createElement(documentRef, 'div', 'archive-nested-target') as HTMLDivElement;
  const comicBook = createComicBookController({
    document: documentRef,
    extension: sourceExtension,
    root,
    stage: nestedTarget,
    previousLabel: t('epub.previousPage'),
    nextLabel: t('epub.nextPage'),
    getEntries: () => entries,
    openEntry: entry => void previewEntry(entry),
  });
  for (const [node, key] of [[comicBook.toolbarElements[0], 'epub.previousPage'], [comicBook.toolbarElements[2], 'epub.nextPage']] as const) {
    bindings.attr(node, 'title', () => t(key));
    bindings.attr(node, 'aria-label', () => t(key));
  }
  badge.textContent = comicBook.badge;
  toolbar.append(sidebarShowButton, toolbarTitle, ...comicBook.toolbarElements, downloadButton);
  preview.append(toolbar, nestedTarget);
  root.append(sidebar, preview);

  const state = createElement(documentRef, 'div', 'archive-state');
  const stateContent = createElement(documentRef, 'div');
  const spinner = createElement(documentRef, 'span', 'archive-spinner');
  const stateCopy = createElement(documentRef, 'div');
  const stateTitle = owned('strong', undefined, () => loadingText());
  const stateHint = owned('p', undefined, () => loadingHint());
  stateCopy.append(stateTitle, stateHint);
  stateContent.append(spinner, stateCopy);
  state.append(stateContent);
  root.append(state);

  const error = createElement(documentRef, 'div', 'archive-error');
  const errorTitle = owned('strong', undefined, () => t('archive.error.title'));
  const errorMessage = createElement(documentRef, 'p');
  error.append(errorTitle, errorMessage);
  root.append(error);

  const passwordDialog = createElement(documentRef, 'div', 'archive-password-dialog archive-hidden');
  passwordDialog.setAttribute('role', 'dialog');
  passwordDialog.setAttribute('aria-modal', 'true');
  const passwordCard = createElement(documentRef, 'form', 'archive-password-card') as HTMLFormElement;
  const passwordTitle = owned('h3', undefined, () => t('archive.password.title'));
  const passwordDescription = owned('p', undefined, () => t('archive.password.description'));
  const passwordInput = createElement(documentRef, 'input') as HTMLInputElement;
  passwordInput.type = 'password';
  passwordInput.autocomplete = 'current-password';
  bindings.attr(passwordInput, 'placeholder', () => t('archive.password.placeholder'));
  const passwordError = createElement(documentRef, 'p', 'archive-password-error');
  const passwordActions = createElement(documentRef, 'div', 'archive-password-actions');
  const passwordCancelButton = owned('button', 'archive-password-cancel', () => t('archive.password.cancel')) as HTMLButtonElement;
  passwordCancelButton.type = 'button';
  const passwordSubmitButton = owned('button', 'archive-password-submit', () => t('archive.password.confirm')) as HTMLButtonElement;
  passwordSubmitButton.type = 'submit';
  passwordActions.append(passwordCancelButton, passwordSubmitButton);
  passwordCard.append(passwordTitle, passwordDescription, passwordInput, passwordError, passwordActions);
  passwordDialog.append(passwordCard);
  root.append(passwordDialog);
  target.replaceChildren(style, root);

  const listen = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void
  ) => {
    element.addEventListener(event, listener as EventListener);
    cleanups.push(() => element.removeEventListener(event, listener as EventListener));
  };

  const closePasswordDialog = (password: string | null) => {
    passwordDialog.classList.add('archive-hidden');
    const resolve = passwordResolver;
    passwordResolver = null;
    resolve?.(password);
  };

  const requestPasswordWithDialog = async (
    reason: FileViewerArchivePasswordRequestReason,
    previousError?: unknown
  ) => {
    const wasLoading = loading;
    if (wasLoading) {
      loading = false;
      syncState();
      renderEmptyState();
    }
    // Dedicated labels are bound once; opening never resets locale ownership.
    const invalid = Boolean(previousError || reason === 'invalid-password');
    bindings.text(passwordError, () => invalid ? t('archive.password.invalid') : '');
    passwordInput.value = '';
    passwordDialog.classList.remove('archive-hidden');
    targetWindow?.setTimeout(() => passwordInput.focus(), 0);

    return new Promise<string | null>((resolve) => {
      passwordResolver = password => {
        if (wasLoading && password !== null) {
          loading = true;
          syncState();
          renderEmptyState();
        }
        resolve(password);
      };
    });
  };

  const requestArchivePassword = async (
    reason: FileViewerArchivePasswordRequestReason,
    entry?: ArchiveEntryView,
    previousError?: unknown
  ) => {
    passwordAttempt += 1;
    const contextPayload = {
      filename,
      entryName: entry?.name,
      attempt: passwordAttempt,
      reason,
      error: previousError,
    };

    if (archiveOptions?.password && passwordAttempt === 1 && !previousError) {
      return archiveOptions.password;
    }

    if (archiveOptions?.requestPassword) {
      const customPassword = await archiveOptions.requestPassword(contextPayload);
      return customPassword ?? null;
    }

    return requestPasswordWithDialog(reason, previousError);
  };

  const applyArchivePassword = async (password: string) => {
    await archiveReader?.usePassword?.(password);
  };

  const requestAndApplyPassword = async (
    reason: FileViewerArchivePasswordRequestReason,
    entry?: ArchiveEntryView,
    previousError?: unknown
  ) => {
    const password = await requestArchivePassword(reason, entry, previousError);
    if (password === null) {
      throw new ArchivePasswordCancelledError(t('archive.error.passwordRequired'));
    }
    await applyArchivePassword(password);
  };

  listen(passwordCard, 'submit', (event) => {
    event.preventDefault();
    const password = passwordInput.value;
    if (!password) {
      bindings.text(passwordError, () => t('archive.password.required'));
      passwordInput.focus();
      return;
    }
    closePasswordDialog(password);
  });
  listen(passwordCancelButton, 'click', () => {
    closePasswordDialog(null);
  });
  listen(passwordDialog, 'keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePasswordDialog(null);
    }
  });
  listen(sidebarHideButton, 'click', () => {
    sidebarCollapsed = true;
    syncState();
  });
  listen(sidebarShowButton, 'click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    syncState();
  });

  const getArchiveStats = () => {
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const previewableCount = entries.filter(entry => entry.previewable).length;
    return {
      count: entries.length,
      totalSize,
      previewableCount,
    };
  };

  const getFilteredEntries = () => {
    const keyword = filterText.trim().toLowerCase();
    const visibleEntries = comicBook.getVisibleEntries(entries);
    const source = keyword
      ? visibleEntries.filter(entry => entry.path.toLowerCase().includes(keyword))
      : visibleEntries;
    return source.slice(0, MAX_LISTED_ENTRIES);
  };

  const disposeNestedPreview = (rendered: FileViewerRenderedInstance | undefined) => {
    if (!rendered) return Promise.resolve();
    // Register ownership before invoking user cleanup, including synchronous/reentrant cleanup.
    const pending = Promise.resolve().then(() => disposeFileViewerRendered(rendered));
    pendingNestedCleanups.add(pending);
    void pending.then(
      () => { pendingNestedCleanups.delete(pending); },
      () => { pendingNestedCleanups.delete(pending); }
    );
    return pending;
  };

  const clearNestedPreview = async () => {
    const sequence = previewSequence;
    const retired = nestedRendered;
    nestedRendered = undefined;
    try {
      await disposeNestedPreview(retired);
    } catch (error) {
      // A newer preview no longer owns this failure UI. Terminal teardown awaits known cleanups.
      if (sequence !== previewSequence && !destroyPromise) console.error(error);
      throw error;
    }
    if (sequence !== previewSequence) return;
    bindings.release(nestedTarget);
    nestedTarget.replaceChildren();
  };

  const closeArchive = async () => {
    await archiveReader?.close?.();
    archiveReader = null;
  };

  const syncSidebarToggleState = () => {
    root.classList.toggle('archive-sidebar-collapsed', sidebarCollapsed);
    sidebarHideButton.textContent = '‹';
    sidebarShowButton.textContent = sidebarCollapsed ? '☰' : '‹';
    bindings.attr(sidebarHideButton, 'title', () => t('archive.sidebar.hide'));
    bindings.attr(sidebarShowButton, 'title', () => t(sidebarCollapsed ? 'archive.sidebar.show' : 'archive.sidebar.hide'));
    bindings.attr(sidebarHideButton, 'aria-label', () => t('archive.sidebar.hide'));
    bindings.attr(sidebarShowButton, 'aria-label', () => t(sidebarCollapsed ? 'archive.sidebar.show' : 'archive.sidebar.hide'));
    sidebarHideButton.setAttribute('aria-expanded', String(!sidebarCollapsed));
    sidebarShowButton.setAttribute('aria-expanded', String(!sidebarCollapsed));
  };

  const syncState = () => {
    const archiveStats = getArchiveStats();
    const label = () => t('archive.stats.summary', { count: archiveStats.count, size: formatArchiveBytes(archiveStats.totalSize), previewable: archiveStats.previewableCount });
    bindings.text(stats, label);
    bindings.attr(stats, 'title', label);
    bindings.attr(stats, 'aria-label', label);
    bindings.text(warning, () => t('archive.warning.encrypted'));
    warning.classList.toggle('archive-hidden', !encrypted);
    bindings.text(info, () => archiveNotice());
    info.classList.toggle('archive-hidden', !archiveNotice());
    state.classList.toggle('archive-hidden', !loading);
    bindings.text(stateTitle, () => loadingText());
    bindings.text(stateHint, () => loadingHint());
    error.classList.toggle('archive-hidden', !errorText());
    bindings.text(errorMessage, () => errorText());
    const downloadAllowed = selectedEntry
      ? isArchiveEntryDownloadAllowed(selectedEntry, archiveOptions)
      : false;
    downloadButton.hidden = !downloadAllowed;
    downloadButton.disabled = !downloadAllowed;
    const activeTitle = toolbarTitle.querySelector('strong');
    if (activeTitle) {
      bindings.text(activeTitle, () => selectedEntry?.name || t('archive.preview.chooseFile'));
      activeTitle.setAttribute('title', selectedEntry?.path || selectedEntry?.name || '');
    }
    comicBook.sync();
    syncSidebarToggleState();
  };

  const renderEmptyState = () => {
    if (selectedEntry || loading || nestedTarget.childElementCount) {
      return;
    }
    const empty = createElement(documentRef, 'div', 'archive-empty');
    empty.append(
      owned('strong', undefined, () => t('archive.empty.title')),
      owned('p', undefined, () => t('archive.empty.message'))
    );
    nestedTarget.replaceChildren(empty);
  };

  const renderEntryList = () => {
    list.replaceChildren();
    getFilteredEntries().forEach(entry => {
      const button = createElement(documentRef, 'button', 'archive-entry') as HTMLButtonElement;
      button.type = 'button';
      button.style.setProperty('--entry-depth', String(entry.depth));
      button.classList.toggle('active', selectedEntry?.id === entry.id);
      const icon = createElement(documentRef, 'span', 'entry-ext', entry.extension || 'file');
      icon.title = entry.extension || 'file';
      const copy = createElement(documentRef, 'span', 'entry-copy');
      const nameNode = createElement(documentRef, 'strong', undefined, entry.name);
      const pathNode = createElement(documentRef, 'em', undefined, entry.path);
      const sizeText = formatArchiveBytes(entry.size);
      const sizeNode = createElement(documentRef, 'small', undefined, sizeText);
      nameNode.title = entry.name;
      pathNode.title = entry.path;
      sizeNode.title = sizeText;
      button.title = entry.path;
      copy.append(nameNode, pathNode);
      button.append(icon, copy, sizeNode);
      button.addEventListener('click', () => {
        void previewEntry(entry);
      });
      list.append(button);
    });
  };

  const setLoading = (next: boolean, text?: () => string, hint?: () => string) => {
    loading = next;
    if (text) {
      loadingText = text;
    }
    if (hint) {
      loadingHint = hint;
    }
    syncState();
    renderEmptyState();
  };

  const setError = (message: string | (() => string)) => {
    errorText = typeof message === 'function' ? message : () => message;
    syncState();
  };

  const terminateWorkers = (workers: Worker[]) => {
    workers.forEach(worker => worker.terminate());
    workers.length = 0;
  };

  const readArchiveDirectoryWithPassword = async (
    archive: any,
    candidate: ArchiveWorkerCandidate
  ) => {
    for (;;) {
      try {
        return await withTimeout<Record<string, unknown>>(
          archive.getFilesObject(),
          workerTimeoutMs,
          t('archive.error.candidateReadTimeout', { label: candidate.label }),
          targetWindow
        );
      } catch (reason) {
        if (!encrypted && !isArchivePasswordError(reason)) {
          throw reason;
        }
        await requestAndApplyPassword(
          encrypted ? 'invalid-password' : 'read-failed',
          undefined,
          reason
        );
      }
    }
  };

  const tryOpenArchiveWithWorker = async (Archive: any, candidate: ArchiveWorkerCandidate) => {
    const createdWorkers: Worker[] = [];
    const workerUrl = await prepareWorkerUrl(candidate, objectUrls);
    const WorkerCtor = getWorkerConstructor(documentRef);

    try {
      Archive.init({
        getWorker: () => {
          const worker = new WorkerCtor(workerUrl, { type: 'module' });
          createdWorkers.push(worker);
          return worker;
        },
      });

      setLoading(true, () => t('archive.loading.initializingCandidate', { label: candidate.label }), () => t('archive.loading.initializingCandidateHint'));
      const archiveFile = createArchiveFile(documentRef, buffer, filename);
      const archive = await withTimeout<any>(
        Archive.open(archiveFile),
        workerTimeoutMs,
        t('archive.error.candidateInitTimeout', { label: candidate.label }),
        targetWindow
      );
      archiveReader = archive;
      if (hasLegacyGbkZipFilenames && typeof archive.setLocale === 'function') {
        await archive.setLocale('zh_CN.GBK').catch(() => undefined);
      }
      encrypted = await withTimeout<boolean | null>(
        archive.hasEncryptedData(),
        workerTimeoutMs,
        t('archive.error.encryptedCheckTimeout', { label: candidate.label }),
        targetWindow
      ).catch(() => null);
      if (encrypted) {
        await requestAndApplyPassword('encrypted');
      }

      setLoading(true, () => t('archive.loading.readingDirectory'), () => t('archive.loading.directoryReadyHint'));
      const fileTree = await readArchiveDirectoryWithPassword(archive, candidate);

      entries = comicBook.sortEntries(flattenArchiveObject(fileTree));
      syncState();
      renderEntryList();
      renderEmptyState();
      comicBook.onEntriesReady();
      return true;
    } catch (reason) {
      if (!archiveReader) {
        terminateWorkers(createdWorkers);
      }
      throw reason;
    }
  };

  const tryOpenArchiveWithFallback = async (
    options: {
      showWorkerFallbackNotice?: boolean;
    } = {}
  ) => {
    const showWorkerFallbackNotice = options.showWorkerFallbackNotice !== false;
    setLoading(
      true,
      () => showWorkerFallbackNotice
        ? t('archive.loading.workerFallback')
        : t('archive.loading.readingDirectory'),
      () => showWorkerFallbackNotice
        ? t('archive.loading.workerFallbackHint')
        : t('archive.loading.directoryReadyHint')
    );
    const fallbackEntries = await loadArchiveEntriesWithoutWorker(buffer, filename, {
      maxArchiveSize,
      maxEntryPreviewSize,
    });

    if (!fallbackEntries) {
      return false;
    }

    entries = comicBook.sortEntries(fallbackEntries);
    encrypted = null;
    archiveNotice = () => showWorkerFallbackNotice ? t('archive.notice.workerFallback') : '';
    syncState();
    renderEntryList();
    renderEmptyState();
    comicBook.onEntriesReady();
    return true;
  };

  const openArchive = async () => {
    if (buffer.byteLength > maxArchiveSize) {
      setError(() => t('archive.error.tooLarge', {
        size: formatArchiveBytes(buffer.byteLength),
        limit: formatArchiveBytes(maxArchiveSize),
      }));
      return;
    }

    setLoading(true, () => t('archive.loading.initializingWorker'), () => t('archive.loading.initializingWorkerHint'));
    setError('');
    archiveNotice = () => '';

    try {
      if (hasLegacyGbkZipFilenames && !isLikelyEncryptedArchive(buffer, filename)) {
        if (await tryOpenArchiveWithFallback({ showWorkerFallbackNotice: false })) {
          return;
        }
      }

      const [{ Archive }, candidates] = await Promise.all([
        import('libarchive.js'),
        resolveWorkerCandidates(documentRef, archiveOptions),
      ]);
      const errors: string[] = [];

      for (const candidate of candidates) {
        try {
          await closeArchive();
          await tryOpenArchiveWithWorker(Archive, candidate);
          return;
        } catch (reason) {
          if (reason instanceof ArchivePasswordCancelledError) {
            throw reason;
          }
          errors.push(`${candidate.label}: ${normalizeWorkerError(reason)}`);
        }
      }

      await closeArchive();
      if (isLikelyEncryptedArchive(buffer, filename)) {
        encrypted = true;
        syncState();
        throw new Error(t('archive.error.encryptedRequiresWorker'));
      }
      if (await tryOpenArchiveWithFallback()) {
        return;
      }

      throw new Error(errors.join('; ') || t('archive.error.workerInitFailed'));
    } catch (nextError) {
      console.error(nextError);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  };

  const renderEntryBuffer = async (
    entry: ArchiveEntryView,
    entryBuffer: ArrayBuffer,
    requestId: number
  ) => {
    await clearNestedPreview();
    if (requestId !== previewSequence) {
      return;
    }
    const child = createElement(documentRef, 'div', 'archive-nested-content') as HTMLDivElement;
    nestedTarget.append(child);
    const nestedContext = buildArchiveNestedRenderContext(context, entry, archiveOptions);
    const childI18n = createFileViewerNestedI18n(nestedContext, context?.i18n, documentRef);
    let rendered: FileViewerRenderedInstance | undefined;
    try {
      const result = await renderNestedEntry(entryBuffer, entry.extension, child, { ...nestedContext, i18n: childI18n });
      rendered = { $el: result?.$el || child, async unmount() { childI18n.destroy(); await disposeFileViewerRendered(result); } };
    } catch (error) { childI18n.destroy(); throw error; }
    if (requestId !== previewSequence) {
      try {
        await disposeNestedPreview(rendered);
      } catch (error) {
        // Late delegates are not awaited by terminal teardown. Report cleanup failures once,
        // without reviving a stale preview or leaving an unhandled rejection.
        console.error(error);
      } finally {
        child.remove();
      }
      return;
    }
    nestedRendered = rendered;
  };

  const extractEntryBuffer = async (entry: ArchiveEntryView) => {
    const cacheKey = createArchiveCacheKey(filename, buffer.byteLength, entry);
    if (cacheEnabled) {
      const cached = await readArchiveCache(cacheKey);
      if (cached) {
        return cached.buffer;
      }
    }

    let file: File;
    for (;;) {
      try {
        file = await entry.compressedFile.extract();
        break;
      } catch (reason) {
        if (!archiveReader || !isArchivePasswordError(reason)) {
          throw reason;
        }
        encrypted = true;
        syncState();
        await requestAndApplyPassword('extract-failed', entry, reason);
      }
    }
    const entryBuffer = await file.arrayBuffer();

    if (cacheEnabled) {
      await writeArchiveCache({
        key: cacheKey,
        filename: entry.name,
        size: entryBuffer.byteLength,
        updatedAt: Date.now(),
        buffer: entryBuffer,
      });
    }

    return entryBuffer;
  };

  async function previewEntry(entry: ArchiveEntryView) {
    const requestId = ++previewSequence;
    selectedEntry = entry;
    comicBook.onEntrySelected(entry);
    renderEntryList();
    syncState();
    const shapefileEntries = getShapefileBundleEntries(entries, entry);
    const previewSize = shapefileEntries.length
      ? shapefileEntries.reduce((sum, component) => sum + component.size, 0)
      : entry.size;
    if (previewSize > maxEntryPreviewSize) {
      setError(() => t('archive.error.entryTooLarge', {
        name: entry.name,
        size: formatArchiveBytes(previewSize),
        limit: formatArchiveBytes(maxEntryPreviewSize),
      }));
      return;
    }

    setLoading(true, () => t('archive.loading.extracting', { name: entry.name }));
    setError('');

    try {
      const entryBuffer = shapefileEntries.length
        ? await createShapefileBundleArchive(shapefileEntries, extractEntryBuffer)
        : await extractEntryBuffer(entry);
      if (requestId !== previewSequence) {
        return;
      }
      setLoading(true, () => t('archive.loading.rendering', { name: entry.name }));
      await renderEntryBuffer(entry, entryBuffer, requestId);
    } catch (nextError) {
      if (requestId === previewSequence) {
        console.error(nextError);
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    } finally {
      if (requestId === previewSequence) {
        setLoading(false);
      }
    }
  }

  const downloadEntry = async (entry: ArchiveEntryView) => {
    setLoading(true, () => t('archive.loading.exporting', { name: entry.name }));
    try {
      const entryBuffer = await extractEntryBuffer(entry);
      const url = URL.createObjectURL(new Blob([entryBuffer]));
      objectUrls.push(url);
      const link = documentRef.createElement('a');
      link.href = url;
      link.download = entry.name;
      documentRef.body.append(link);
      link.click();
      link.remove();
    } finally {
      setLoading(false);
    }
  };

  listen(search, 'input', () => {
    filterText = search.value;
    renderEntryList();
  });
  listen(downloadButton, 'click', () => {
    if (selectedEntry && isArchiveEntryDownloadAllowed(selectedEntry, archiveOptions)) {
      void downloadEntry(selectedEntry);
    }
  });

  syncState();
  renderEmptyState();
  void openArchive();

  return {
    $el: root,
    unmount() {
      if (destroyPromise) return destroyPromise;
      // Invalidate late children before yielding. Repeated teardown shares one operation.
      previewSequence += 1;
      bindings.destroy();
      // Wait for instances already claimed for cleanup, not delegates that have yet to return.
      const knownCleanups = [...pendingNestedCleanups];
      destroyPromise = Promise.resolve().then(async () => {
        const failures: unknown[] = [];
        const attempt = async (action: () => unknown) => {
          try { await action(); } catch (error) { failures.push(error); }
        };
        await attempt(() => closePasswordDialog(null));
        await attempt(() => comicBook.dispose());
        for (const cleanup of cleanups.splice(0)) await attempt(cleanup);
        const results = await Promise.allSettled([...knownCleanups, clearNestedPreview()]);
        for (const result of results) if (result.status === 'rejected') failures.push(result.reason);
        await attempt(closeArchive);
        for (const url of objectUrls) await attempt(() => URL.revokeObjectURL(url));
        await attempt(() => target.replaceChildren());
        if (failures.length) {
          for (const failure of failures.slice(1)) console.error(failure);
          throw failures[0];
        }
      });
      return destroyPromise;
    },
  };
}
