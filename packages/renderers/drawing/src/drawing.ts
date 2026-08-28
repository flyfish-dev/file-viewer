import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter,
  registerFileViewerZoomProvider,
  readFileViewerText,
  resolveFileViewerDrawioViewerScriptUrl,
  resolveFileViewerRuntimeAssetBaseUrl,
  unregisterFileViewerZoomProvider,
} from '@file-viewer/core';
import { isFileViewerDrawioOfficialViewerEnabled } from './optionalCapabilities.js';
import type {
  FileRenderContext,
  FileViewerDrawingOptions,
  FileViewerRenderedInstance,
  FileViewerZoomState,
} from '@file-viewer/core';
import type { DiagramController } from './diagram.js';

type DrawingStatus = 'loading' | 'ready' | 'error';
type DrawingKind = 'excalidraw' | 'drawio' | 'mermaid' | 'plantuml';
type ExcalidrawElement = Record<string, any>;
type ExcalidrawPoint = [number, number];
type DrawingTranslator = ReturnType<typeof createFileViewerTranslator>;

const SVG_NS = 'http://www.w3.org/2000/svg';
const EXCALIDRAW_OFFICIAL_TIMEOUT = 6000;
const DRAWIO_OFFICIAL_TIMEOUT = 6000;

const drawingStyle = `
.drawing-viewer{display:flex;height:100%;min-height:360px;flex-direction:column;background:#edf2f7;color:#172033}
.drawing-toolbar{position:sticky;top:0;z-index:2;display:flex;min-height:46px;align-items:center;justify-content:space-between;gap:16px;padding:8px 14px;border-bottom:1px solid rgba(148,163,184,.35);background:rgba(248,250,252,.92);backdrop-filter:blur(12px)}
.drawing-title{display:flex;min-width:0;align-items:center;gap:10px}
.drawing-title span{display:inline-flex;height:24px;align-items:center;justify-content:center;border-radius:6px;padding:0 8px;background:#0f766e;color:#fff;font-size:11px;font-weight:800;letter-spacing:0}
.drawing-title strong{overflow:hidden;color:#172033;font-size:13px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}
.drawing-actions{display:flex;flex-shrink:0;align-items:center;gap:6px}
.drawing-actions button{min-width:32px;height:28px;border:1px solid rgba(100,116,139,.28);border-radius:6px;background:#fff;color:#0f172a;cursor:pointer;font-size:12px;font-weight:800}
.drawing-actions button:hover{border-color:rgba(15,118,110,.5);color:#0f766e}
.drawing-actions span{min-width:48px;color:#64748b;font-size:12px;font-weight:800;text-align:center}
.drawing-stage{position:relative;min-height:0;flex:1;overflow:hidden}
.drawing-scroll{height:100%;overflow:auto;padding:22px}
.drawing-canvas{width:100%;min-height:420px;transition:transform .18s ease,zoom .18s ease}
.drawing-canvas .drawing-svg,.drawing-canvas svg{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:10px;background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.12)}
.drawing-canvas .drawing-mxgraph{display:block;width:100%;min-height:420px;overflow:hidden;border:0;border-radius:10px;background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.12)}
.drawing-diagram-shell{display:flex;min-height:100%;align-items:center;justify-content:center;overflow:hidden;border-radius:10px;background:linear-gradient(135deg,#f8fafc,#eef6f4);box-shadow:0 18px 42px rgba(15,23,42,.12)}
.drawing-diagram-pan{display:inline-flex;min-width:240px;min-height:180px;align-items:center;justify-content:center;padding:32px;cursor:grab;touch-action:none}
.drawing-diagram-pan:active{cursor:grabbing}
.drawing-diagram-pan .drawing-diagram-svg{margin:0;box-shadow:none}
[data-viewer-theme='dark'] .drawing-diagram-shell{background:linear-gradient(135deg,#111827,#0f172a)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .drawing-diagram-shell{background:linear-gradient(135deg,#111827,#0f172a)}}
.drawing-state{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;padding:24px;color:#64748b;font-size:14px;font-weight:700;text-align:center}
.drawing-state[hidden]{display:none!important}
.drawing-state.error{color:#b42318}
@media (max-width:720px){.drawing-toolbar{align-items:flex-start;flex-direction:column}.drawing-actions{width:100%;justify-content:space-between}.drawing-scroll{padding:12px}}
`;

const createStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style');
  style.textContent = drawingStyle;
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

const createSvgElement = <T extends SVGElement>(documentRef: Document, tagName: string) => {
  return documentRef.createElementNS(SVG_NS, tagName) as T;
};

const normalizeDrawingType = (type?: string): DrawingKind => {
  const normalized = type?.toLowerCase();
  if (normalized === 'excalidraw') {
    return 'excalidraw';
  }
  if (normalized === 'mermaid' || normalized === 'mmd') {
    return 'mermaid';
  }
  if (normalized === 'plantuml' || normalized === 'puml') {
    return 'plantuml';
  }
  return 'drawio';
};

const formatDrawingLabel = (type?: string) => {
  const normalized = (type || 'drawio').toLowerCase();
  return normalized === 'dio' ? 'DRAWIO' : normalized.toUpperCase();
};

const clampZoom = (value: number) => {
  return Math.min(3, Math.max(0.5, Number(value.toFixed(2))));
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isTransparent = (color?: string) => {
  return !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)';
};

const resolveDrawingViewerScriptUrl = (options?: FileViewerDrawingOptions, documentRef?: Document) => {
  return resolveFileViewerDrawioViewerScriptUrl(
    options,
    documentRef ? resolveFileViewerRuntimeAssetBaseUrl(documentRef) : undefined
  );
};

const resolveDirectoryUrl = (url: string) => {
  try {
    return new URL('.', url).href;
  } catch {
    const slashIndex = url.lastIndexOf('/');
    return slashIndex >= 0 ? url.slice(0, slashIndex + 1) : '';
  }
};

const escapeHtmlAttribute = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const createDrawioSandboxNonce = (ownerWindow: Window) => {
  const bytes = new Uint8Array(18);
  ownerWindow.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

const resolveSafeDrawioViewerScript = (documentRef: Document, scriptUrl: string) => {
  const resolved = new URL(scriptUrl, documentRef.baseURI);
  const documentUrl = new URL(documentRef.baseURI);
  if (!/^https?:$/.test(resolved.protocol) || resolved.origin !== documentUrl.origin) {
    throw new Error('The diagrams.net viewer script must use a same-origin HTTP(S) URL.');
  }
  return resolved;
};

const buildDrawioSandboxDocument = (
  xml: string,
  scriptUrl: URL,
  nonce: string,
  channel: string
) => {
  const baseUrl = resolveDirectoryUrl(scriptUrl.href);
  const assetRoot = baseUrl.replace(/\/$/, '');
  const runtimeConfig = {
    PROXY_URL: `${baseUrl}proxy`,
    STYLE_PATH: `${baseUrl}styles`,
    SHAPES_PATH: `${baseUrl}shapes`,
    STENCIL_PATH: `${baseUrl}stencils`,
    DRAW_MATH_URL: `${baseUrl}math4/es5`,
    GRAPH_IMAGE_PATH: `${baseUrl}img`,
    mxImageBasePath: `${baseUrl}mxgraph/images`,
    mxBasePath: `${baseUrl}mxgraph/`,
    mxLoadStylesheets: false,
    DRAWIO_BASE_URL: assetRoot,
    DRAWIO_LIGHTBOX_URL: assetRoot,
    DRAWIO_SERVER_URL: baseUrl,
    DRAWIO_VIEWER_URL: scriptUrl.href,
    DRAWIO_LOG_URL: '',
    EXPORT_URL: `${baseUrl}export`,
    PLANT_URL: `${baseUrl}plant`,
    VSS_CONVERT_URL: `${baseUrl}VsdConverter/api/converter`,
    DRAWIO_GITLAB_URL: baseUrl,
    DRAWIO_GITHUB_URL: baseUrl,
    DRAWIO_GITHUB_API_URL: baseUrl,
    RT_WEBSOCKET_URL: `${baseUrl}rt`,
    NOTIFICATIONS_URL: `${baseUrl}notifications`,
  };
  const graphConfig = {
    xml,
    toolbar: 'zoom layers lightbox',
    nav: true,
    resize: true,
    'auto-fit': true,
    'auto-crop': true,
    'auto-origin': true,
    'allow-zoom-in': true,
    'allow-zoom-out': true,
    border: 16,
    highlight: '#0f766e',
  };
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' ${baseUrl}`,
    `style-src 'unsafe-inline' ${baseUrl}`,
    `img-src data: blob: ${baseUrl}`,
    `font-src data: ${baseUrl}`,
    "media-src data: blob:",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  const bootstrap = `
    Object.assign(window, ${JSON.stringify(runtimeConfig)});
    window.__fileViewerDrawioSentinel = 0;
    window.onDrawioViewerLoad = function () {
      try {
        GraphViewer.createViewerForElement(document.getElementById('graph'));
        parent.postMessage({ fileViewerDrawio: ${JSON.stringify(channel)}, ok: true }, '*');
      } catch (error) {
        parent.postMessage({ fileViewerDrawio: ${JSON.stringify(channel)}, ok: false, message: String(error && error.message || error) }, '*');
      }
    };
  `;
  return `<!doctype html>
<html><head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">
  <meta name="referrer" content="no-referrer">
  <style>html,body{margin:0;min-height:100%;background:#fff}#graph{max-width:100%;min-height:420px;border:1px solid transparent}</style>
  <script nonce="${nonce}">${bootstrap}</script>
</head><body>
  <div id="graph" class="mxgraph" data-mxgraph="${escapeHtmlAttribute(JSON.stringify(graphConfig))}"></div>
  <script src="${escapeHtmlAttribute(scriptUrl.href)}"></script>
</body></html>`;
};

const runWithTimeout = async <T>(task: Promise<T>, timeout: number, message: string) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeout);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const markRendered = (target: HTMLElement, mode: 'official' | 'rough') => {
  if (target.dataset.drawingRendered) {
    return false;
  }
  target.dataset.drawingRendered = mode;
  return true;
};

const appendRenderedSvg = (target: HTMLElement, svg: SVGSVGElement, mode: 'official' | 'rough') => {
  if (!markRendered(target, mode)) {
    return;
  }
  svg.classList.add('drawing-svg');
  target.appendChild(svg);
};

const importOptionalExcalidraw = async () => {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<{
    exportToSvg: (options: Record<string, unknown>) => Promise<SVGSVGElement> | SVGSVGElement;
    restore: (...args: any[]) => { appState: any; elements: any[]; files?: Record<string, unknown> };
  }>;
  return dynamicImport('@excalidraw/excalidraw');
};

const isMissingOptionalExcalidraw = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('@excalidraw/excalidraw') &&
    /(?:resolve|find|module|specifier)/i.test(message);
};

const suppressExcalidrawWorkerWarning = () => {
  const originalError = console.error;
  const patchedError = (...args: unknown[]) => {
    const message = args.map(arg => String(arg)).join(' ');
    if (
      message.includes('Failed to use workers for subsetting') ||
      message.includes('Failed to fetch font family')
    ) {
      return;
    }
    originalError(...args);
  };

  console.error = patchedError;

  return () => {
    if (console.error === patchedError) {
      console.error = originalError;
    }
  };
};

const getElementPoints = (element: ExcalidrawElement): ExcalidrawPoint[] => {
  if (Array.isArray(element.points) && element.points.length) {
    return element.points.map((point: ExcalidrawPoint) => [
      toNumber(element.x) + toNumber(point[0]),
      toNumber(element.y) + toNumber(point[1]),
    ]);
  }

  return [
    [toNumber(element.x), toNumber(element.y)],
    [toNumber(element.x) + toNumber(element.width), toNumber(element.y) + toNumber(element.height)],
  ];
};

const getElementBounds = (element: ExcalidrawElement) => {
  const points = getElementPoints(element);
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);

  if (!Array.isArray(element.points)) {
    xs.push(toNumber(element.x) + toNumber(element.width));
    ys.push(toNumber(element.y) + toNumber(element.height));
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const getSceneBounds = (elements: ExcalidrawElement[]) => {
  const initial = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  const bounds = elements.reduce((scene, element) => {
    const elementBounds = getElementBounds(element);
    return {
      minX: Math.min(scene.minX, elementBounds.minX),
      minY: Math.min(scene.minY, elementBounds.minY),
      maxX: Math.max(scene.maxX, elementBounds.maxX),
      maxY: Math.max(scene.maxY, elementBounds.maxY),
    };
  }, initial);

  if (!Number.isFinite(bounds.minX)) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 480 };
  }

  return bounds;
};

const getRoughOptions = (element: ExcalidrawElement) => {
  const fill = isTransparent(element.backgroundColor) ? undefined : element.backgroundColor;
  return {
    stroke: element.strokeColor || '#1e1e1e',
    strokeWidth: Math.max(1, toNumber(element.strokeWidth, 1)),
    roughness: Math.max(0, toNumber(element.roughness, 1)),
    fill,
    fillStyle: element.fillStyle || 'hachure',
    seed: toNumber(element.seed, 1),
    strokeLineDash: element.strokeStyle === 'dashed'
      ? [10, 8]
      : element.strokeStyle === 'dotted'
        ? [2, 6]
        : undefined,
  };
};

const appendWithOpacity = (group: SVGGElement, element: ExcalidrawElement, node: SVGElement) => {
  const opacity = toNumber(element.opacity, 100) / 100;
  if (opacity < 1) {
    node.setAttribute('opacity', String(opacity));
  }
  group.appendChild(node);
};

const createElementGroup = (documentRef: Document, element: ExcalidrawElement) => {
  const group = createSvgElement<SVGGElement>(documentRef, 'g');
  const angle = toNumber(element.angle);
  if (angle) {
    const cx = toNumber(element.x) + toNumber(element.width) / 2;
    const cy = toNumber(element.y) + toNumber(element.height) / 2;
    group.setAttribute('transform', `rotate(${angle * 180 / Math.PI} ${cx} ${cy})`);
  }
  return group;
};

const renderTextFallback = (documentRef: Document, group: SVGGElement, element: ExcalidrawElement) => {
  const text = String(element.text || '');
  if (!text.trim()) {
    return;
  }

  const textNode = createSvgElement<SVGTextElement>(documentRef, 'text');
  const fontSize = Math.max(8, toNumber(element.fontSize, 20));
  const lineHeight = fontSize * 1.25;
  const lines = text.split(/\r?\n/);
  const familyMap: Record<number, string> = {
    1: 'Virgil, Segoe Print, Comic Sans MS, sans-serif',
    2: 'Helvetica, Arial, sans-serif',
    3: 'Cascadia Mono, Menlo, Consolas, monospace',
  };

  textNode.setAttribute('x', String(toNumber(element.x)));
  textNode.setAttribute('y', String(toNumber(element.y) + fontSize));
  textNode.setAttribute('fill', element.strokeColor || '#1e1e1e');
  textNode.setAttribute('font-size', String(fontSize));
  textNode.setAttribute('font-family', familyMap[toNumber(element.fontFamily, 1)] || familyMap[1]);
  textNode.setAttribute('font-weight', String(element.fontWeight || 400));
  textNode.setAttribute('text-anchor', element.textAlign === 'center' ? 'middle' : element.textAlign === 'right' ? 'end' : 'start');

  if (element.textAlign === 'center') {
    textNode.setAttribute('x', String(toNumber(element.x) + toNumber(element.width) / 2));
  } else if (element.textAlign === 'right') {
    textNode.setAttribute('x', String(toNumber(element.x) + toNumber(element.width)));
  }

  lines.forEach((line, index) => {
    const lineNode = createSvgElement<SVGTSpanElement>(documentRef, 'tspan');
    lineNode.setAttribute('x', textNode.getAttribute('x') || String(toNumber(element.x)));
    lineNode.setAttribute('dy', index === 0 ? '0' : String(lineHeight));
    lineNode.textContent = line;
    textNode.appendChild(lineNode);
  });

  appendWithOpacity(group, element, textNode);
};

const appendArrowHead = (
  documentRef: Document,
  group: SVGGElement,
  element: ExcalidrawElement,
  points: ExcalidrawPoint[]
) => {
  const endArrow = element.endArrowhead || element.startArrowhead;
  if (!endArrow || points.length < 2) {
    return;
  }

  const end = points[points.length - 1];
  const before = points[points.length - 2];
  const angle = Math.atan2(end[1] - before[1], end[0] - before[0]);
  const size = Math.max(10, toNumber(element.strokeWidth, 1) * 7);
  const left: ExcalidrawPoint = [
    end[0] - size * Math.cos(angle - Math.PI / 7),
    end[1] - size * Math.sin(angle - Math.PI / 7),
  ];
  const right: ExcalidrawPoint = [
    end[0] - size * Math.cos(angle + Math.PI / 7),
    end[1] - size * Math.sin(angle + Math.PI / 7),
  ];

  const arrow = createSvgElement<SVGPolygonElement>(documentRef, 'polygon');
  arrow.setAttribute('points', `${end.join(',')} ${left.join(',')} ${right.join(',')}`);
  arrow.setAttribute('fill', element.strokeColor || '#1e1e1e');
  arrow.setAttribute('stroke', element.strokeColor || '#1e1e1e');
  appendWithOpacity(group, element, arrow);
};

const renderRoughFallback = async (
  documentRef: Document,
  payload: any,
  elements: ExcalidrawElement[],
  target: HTMLElement
) => {
  const { default: rough } = await import('roughjs');
  const bounds = getSceneBounds(elements);
  const padding = 80;
  const width = Math.max(320, bounds.maxX - bounds.minX + padding * 2);
  const height = Math.max(220, bounds.maxY - bounds.minY + padding * 2);
  const svg = createSvgElement<SVGSVGElement>(documentRef, 'svg');
  const root = createSvgElement<SVGGElement>(documentRef, 'g');
  const rc = rough.svg(svg);

  svg.setAttribute('viewBox', `${bounds.minX - padding} ${bounds.minY - padding} ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Excalidraw rough.js preview');

  const background = createSvgElement<SVGRectElement>(documentRef, 'rect');
  background.setAttribute('x', String(bounds.minX - padding));
  background.setAttribute('y', String(bounds.minY - padding));
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', payload.appState?.viewBackgroundColor || '#ffffff');
  svg.appendChild(background);
  svg.appendChild(root);

  elements.forEach(element => {
    const group = createElementGroup(documentRef, element);
    const options = getRoughOptions(element);
    const x = toNumber(element.x);
    const y = toNumber(element.y);
    const width = toNumber(element.width);
    const height = toNumber(element.height);

    if (element.type === 'text') {
      renderTextFallback(documentRef, group, element);
    } else if (element.type === 'rectangle') {
      appendWithOpacity(group, element, rc.rectangle(x, y, width, height, options));
    } else if (element.type === 'diamond') {
      appendWithOpacity(group, element, rc.polygon([
        [x + width / 2, y],
        [x + width, y + height / 2],
        [x + width / 2, y + height],
        [x, y + height / 2],
      ], options));
    } else if (element.type === 'ellipse') {
      appendWithOpacity(group, element, rc.ellipse(x + width / 2, y + height / 2, Math.abs(width), Math.abs(height), options));
    } else if (element.type === 'line' || element.type === 'arrow' || element.type === 'freedraw') {
      const points = getElementPoints(element);
      appendWithOpacity(group, element, rc.linearPath(points, options));
      if (element.type === 'arrow') {
        appendArrowHead(documentRef, group, element, points);
      }
    }

    if (group.childNodes.length) {
      root.appendChild(group);
    }
  });

  appendRenderedSvg(target, svg, 'rough');
};

const renderOfficialExcalidraw = async (
  payload: any,
  elements: ExcalidrawElement[],
  target: HTMLElement
) => {
  // Excalidraw 在部分浏览器会把字体子集 worker 降级记为 console.error；
  // 实际会继续使用主线程导出，这里只屏蔽这条已知噪声。
  const restoreConsole = suppressExcalidrawWorkerWarning();
  const restoreTimer = setTimeout(restoreConsole, EXCALIDRAW_OFFICIAL_TIMEOUT + 1000);
  const { exportToSvg, restore } = await importOptionalExcalidraw();
  try {
    const restored = restore({
      elements: elements as any,
      appState: payload.appState || {},
      files: payload.files || {},
    }, null, null, {
      repairBindings: true,
      refreshDimensions: true,
    });
    const restoredElements = restored.elements.filter((element: any) => !element.isDeleted);
    const svg = await exportToSvg({
      elements: restoredElements as any,
      appState: {
        ...restored.appState,
        exportBackground: true,
        viewBackgroundColor: restored.appState.viewBackgroundColor || '#ffffff',
      },
      files: restored.files || {},
    });

    appendRenderedSvg(target, svg, 'official');
  } finally {
    clearTimeout(restoreTimer);
    setTimeout(restoreConsole, 3000);
  }
};

const renderExcalidraw = async (
  documentRef: Document,
  text: string,
  target: HTMLElement,
  t: DrawingTranslator
) => {
  const payload = JSON.parse(text);
  const elements = Array.isArray(payload.elements)
    ? payload.elements.filter((element: any) => !element.isDeleted)
    : [];
  if (!elements.length) {
    throw new Error(t('drawing.error.excalidrawEmpty'));
  }

  try {
    await runWithTimeout(
      renderOfficialExcalidraw(payload, elements, target),
      EXCALIDRAW_OFFICIAL_TIMEOUT,
      t('drawing.error.excalidrawTimeout')
    );
  } catch (error) {
    if (!isMissingOptionalExcalidraw(error)) {
      console.warn(error);
    }
    await renderRoughFallback(documentRef, payload, elements, target);
  }
};

const getDirectChild = (parent: Element, tagName: string) => {
  return Array.from(parent.children).find(child => child.localName === tagName) || null;
};

const parseDrawioStyle = (style: string | null) => {
  const entries = new Map<string, string>();
  for (const item of (style || '').split(';')) {
    if (!item) {
      continue;
    }
    const [key, ...rest] = item.split('=');
    entries.set(key, rest.join('=') || '1');
  }
  return entries;
};

const getDrawioStyleValue = (style: Map<string, string>, key: string, fallback: string) => {
  const value = style.get(key);
  return value && value !== 'none' ? value : fallback;
};

const parseDrawioGeometry = (cell: Element) => {
  const geometry = getDirectChild(cell, 'mxGeometry');
  if (!geometry) {
    return null;
  }
  return {
    x: toNumber(geometry.getAttribute('x')),
    y: toNumber(geometry.getAttribute('y')),
    width: Math.max(1, toNumber(geometry.getAttribute('width'), 80)),
    height: Math.max(1, toNumber(geometry.getAttribute('height'), 40)),
    points: Array.from(geometry.querySelectorAll('mxPoint')).map(point => ({
      x: toNumber(point.getAttribute('x')),
      y: toNumber(point.getAttribute('y')),
    })),
  };
};

const decodeDrawioEntities = (documentRef: Document, value: string) => {
  const Parser = documentRef.defaultView?.DOMParser || globalThis.DOMParser;
  if (!Parser) {
    return value;
  }
  // Escaping every literal '<' means document input can only become a text
  // node in this inert parser. Named and numeric HTML entities still decode
  // according to the browser's complete entity table.
  const parsed = new Parser().parseFromString(value.replace(/</g, '&lt;'), 'text/html');
  return parsed.documentElement.textContent || '';
};

const stripDrawioMarkup = (value: string) => {
  let output = '';
  let cursor = 0;
  while (cursor < value.length) {
    if (value[cursor] !== '<') {
      output += value[cursor];
      cursor += 1;
      continue;
    }

    let quote = '';
    let end = cursor + 1;
    for (; end < value.length; end += 1) {
      const character = value[end]!;
      if (quote) {
        if (character === quote) {
          quote = '';
        }
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }
      if (character === '>') {
        break;
      }
    }
    if (end >= value.length) {
      output += '<';
      cursor += 1;
      continue;
    }

    const tag = value.slice(cursor + 1, end).trim().toLowerCase();
    if (/^\/?br(?:\s|\/|$)/.test(tag)) {
      output += '\n';
    }
    cursor = end + 1;
  }
  return output;
};

export const normalizeDrawioText = (documentRef: Document, value: string | null) => {
  if (!value) {
    return '';
  }
  return stripDrawioMarkup(decodeDrawioEntities(documentRef, value))
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

const DRAWIO_FORBIDDEN_ELEMENTS = new Set([
  'script',
  'style',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'form',
  'link',
]);
const DRAWIO_RESOURCE_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'url',
  'link',
  'image',
  'icon',
  'src',
  'srcset',
]);

const isControlCharacter = (character: string) => {
  const codePoint = character.charCodeAt(0);
  return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
};

const stripControlCharacters = (value: string, replacement = '') => {
  let normalized = '';
  for (const character of value) {
    normalized += isControlCharacter(character) ? replacement : character;
  }
  return normalized;
};

const containsDrawioActiveResource = (value: string) => {
  const canonical = stripControlCharacters(value)
    .replace(/\s+/g, '')
    .toLowerCase();
  return /(?:javascript|vbscript|data|file|blob|https?):|(?:^|[=("'])\/\/|\\\\/.test(canonical);
};

const sanitizeOfficialDrawioStyle = (value: string) => {
  const safeEntries: string[] = [];
  for (const [rawKey, rawValue] of parseDrawioStyle(value)) {
    const key = rawKey.trim();
    const styleValue = rawValue.trim();
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(key)) continue;
    if (/(?:html|image|icon|link|href|url)/i.test(key)) continue;
    if (containsDrawioActiveResource(styleValue)) continue;
    if ([...styleValue].some(isControlCharacter) || /[<>"'`\\]/.test(styleValue) || /url\s*\(/i.test(styleValue)) continue;
    safeEntries.push(`${key}=${styleValue}`);
  }
  safeEntries.push('html=0');
  return `${safeEntries.join(';')};`;
};

const sanitizeOfficialDrawioText = (documentRef: Document, value: string) => {
  return normalizeDrawioText(documentRef, value)
    .replace(/[<>&"'`]/g, ' ')
    .split('')
    .map(character => isControlCharacter(character) ? ' ' : character)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * diagrams.net is a large third-party runtime. Its same-document renderer may
 * interpret cell labels and style resource keys as HTML or URLs, so sanitize
 * the direct mxGraphModel before it reaches that runtime. Compressed/opaque
 * models fail closed here and use the inert fallback instead.
 */
export const sanitizeOfficialDrawioXml = (
  documentRef: Document,
  value: string,
  invalidMessage = 'This Draw.io file has no safely renderable mxGraphModel.'
) => {
  if (/<!\s*(?:doctype|entity)\b/i.test(value)) throw new Error(invalidMessage);
  const Parser = documentRef.defaultView?.DOMParser || globalThis.DOMParser;
  const Serializer = documentRef.defaultView?.XMLSerializer || globalThis.XMLSerializer;
  if (!Parser || !Serializer) throw new Error(invalidMessage);
  const parsed = new Parser().parseFromString(value, 'application/xml');
  if (parsed.querySelector('parsererror') || !parsed.querySelector('mxGraphModel')) {
    throw new Error(invalidMessage);
  }

  for (const element of Array.from(parsed.querySelectorAll('*'))) {
    const localName = element.localName.toLowerCase();
    if (DRAWIO_FORBIDDEN_ELEMENTS.has(localName)) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || DRAWIO_RESOURCE_ATTRIBUTES.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === 'style') {
        element.setAttribute(attribute.name, sanitizeOfficialDrawioStyle(attribute.value));
        continue;
      }
      if (name === 'value' || name === 'label' || name === 'tooltip' || name === 'title') {
        element.setAttribute(attribute.name, sanitizeOfficialDrawioText(documentRef, attribute.value));
        continue;
      }
      if (containsDrawioActiveResource(attribute.value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      const normalized = stripControlCharacters(attribute.value)
        .replace(/[<>&"'`]/g, '')
        .trim();
      element.setAttribute(attribute.name, normalized);
    }
  }
  return new Serializer().serializeToString(parsed);
};

const appendDrawioWrappedText = (
  documentRef: Document,
  svg: SVGSVGElement,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fill: string
) => {
  if (!text) {
    return;
  }

  const textNode = createSvgElement<SVGTextElement>(documentRef, 'text');
  const maxChars = Math.max(4, Math.floor(width / Math.max(7, fontSize * 0.55)));
  const words = text.includes(' ') ? text.split(/\s+/) : text.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [text];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }

  const lineHeight = fontSize * 1.24;
  const totalHeight = lineHeight * lines.length;
  textNode.setAttribute('x', String(x + width / 2));
  textNode.setAttribute('y', String(y + height / 2 - totalHeight / 2 + fontSize));
  textNode.setAttribute('fill', fill);
  textNode.setAttribute('font-size', String(fontSize));
  textNode.setAttribute('font-family', 'Inter, Segoe UI, Arial, sans-serif');
  textNode.setAttribute('font-weight', '600');
  textNode.setAttribute('text-anchor', 'middle');
  textNode.setAttribute('pointer-events', 'none');

  lines.slice(0, 5).forEach((line, index) => {
    const lineNode = createSvgElement<SVGTSpanElement>(documentRef, 'tspan');
    lineNode.setAttribute('x', String(x + width / 2));
    lineNode.setAttribute('dy', index === 0 ? '0' : String(lineHeight));
    lineNode.textContent = line;
    textNode.appendChild(lineNode);
  });
  svg.appendChild(textNode);
};

const renderDrawioFallback = (
  documentRef: Document,
  text: string,
  target: HTMLElement,
  t: DrawingTranslator
) => {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(text, 'text/xml');
  const parseError = parsed.querySelector('parsererror');
  if (parseError) {
    throw new Error(t('drawing.error.drawioParseFailed', { message: parseError.textContent || 'invalid xml' }));
  }

  const firstDiagram = parsed.querySelector('diagram');
  const graphModel = firstDiagram?.querySelector('mxGraphModel') || parsed.querySelector('mxGraphModel');
  if (!graphModel) {
    throw new Error(t('drawing.error.drawioNoModel'));
  }

  const cells = Array.from(graphModel.querySelectorAll('mxCell'));
  const vertices = cells
    .filter(cell => cell.getAttribute('vertex') === '1' && cell.getAttribute('connectable') !== '0')
    .map(cell => ({
      cell,
      id: cell.getAttribute('id') || '',
      geometry: parseDrawioGeometry(cell),
      style: parseDrawioStyle(cell.getAttribute('style')),
      text: normalizeDrawioText(documentRef, cell.getAttribute('value')),
    }))
    .filter(item => item.id && item.geometry);
  if (!vertices.length) {
    throw new Error(t('drawing.error.drawioNoElements'));
  }

  const vertexById = new Map(vertices.map(vertex => [vertex.id, vertex]));
  const allX = vertices.flatMap(vertex => [vertex.geometry!.x, vertex.geometry!.x + vertex.geometry!.width]);
  const allY = vertices.flatMap(vertex => [vertex.geometry!.y, vertex.geometry!.y + vertex.geometry!.height]);
  const edgePoints: Array<{ x: number; y: number }> = [];
  const edges = cells.filter(cell => cell.getAttribute('edge') === '1');
  for (const edge of edges) {
    const source = vertexById.get(edge.getAttribute('source') || '');
    const targetVertex = vertexById.get(edge.getAttribute('target') || '');
    const geometry = parseDrawioGeometry(edge);
    if (source?.geometry) {
      edgePoints.push({
        x: source.geometry.x + source.geometry.width / 2,
        y: source.geometry.y + source.geometry.height / 2,
      });
    }
    geometry?.points.forEach(point => edgePoints.push(point));
    if (targetVertex?.geometry) {
      edgePoints.push({
        x: targetVertex.geometry.x + targetVertex.geometry.width / 2,
        y: targetVertex.geometry.y + targetVertex.geometry.height / 2,
      });
    }
  }
  allX.push(...edgePoints.map(point => point.x));
  allY.push(...edgePoints.map(point => point.y));

  const padding = 96;
  const minX = Math.min(...allX) - padding;
  const minY = Math.min(...allY) - padding;
  const width = Math.max(480, Math.max(...allX) - Math.min(...allX) + padding * 2);
  const height = Math.max(320, Math.max(...allY) - Math.min(...allY) + padding * 2);
  const svg = createSvgElement<SVGSVGElement>(documentRef, 'svg');
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  svg.setAttribute('width', String(Math.ceil(width)));
  svg.setAttribute('height', String(Math.ceil(height)));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', firstDiagram?.getAttribute('name') || 'Draw.io local SVG preview');

  const defs = createSvgElement<SVGDefsElement>(documentRef, 'defs');
  const marker = createSvgElement<SVGMarkerElement>(documentRef, 'marker');
  marker.setAttribute('id', 'drawio-arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '7');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('orient', 'auto-start-reverse');
  const arrow = createSvgElement<SVGPathElement>(documentRef, 'path');
  arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  arrow.setAttribute('fill', '#64748b');
  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const background = createSvgElement<SVGRectElement>(documentRef, 'rect');
  background.setAttribute('x', String(minX));
  background.setAttribute('y', String(minY));
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', '#ffffff');
  svg.appendChild(background);

  for (const edge of edges) {
    const source = vertexById.get(edge.getAttribute('source') || '');
    const targetVertex = vertexById.get(edge.getAttribute('target') || '');
    if (!source?.geometry || !targetVertex?.geometry) {
      continue;
    }
    const style = parseDrawioStyle(edge.getAttribute('style'));
    const stroke = getDrawioStyleValue(style, 'strokeColor', '#64748b');
    const points = [
      {
        x: source.geometry.x + source.geometry.width / 2,
        y: source.geometry.y + source.geometry.height / 2,
      },
      ...(parseDrawioGeometry(edge)?.points || []),
      {
        x: targetVertex.geometry.x + targetVertex.geometry.width / 2,
        y: targetVertex.geometry.y + targetVertex.geometry.height / 2,
      },
    ];
    const polyline = createSvgElement<SVGPolylineElement>(documentRef, 'polyline');
    polyline.setAttribute('points', points.map(point => `${point.x},${point.y}`).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', stroke);
    polyline.setAttribute('stroke-width', '2');
    if (style.get('dashed') === '1') {
      polyline.setAttribute('stroke-dasharray', '8 7');
    }
    if (style.get('endArrow') !== 'none') {
      polyline.setAttribute('marker-end', 'url(#drawio-arrow)');
    }
    svg.appendChild(polyline);
  }

  for (const vertex of vertices) {
    const geometry = vertex.geometry!;
    const fill = getDrawioStyleValue(vertex.style, 'fillColor', '#f8fafc');
    const stroke = getDrawioStyleValue(vertex.style, 'strokeColor', '#64748b');
    const fontSize = Math.max(10, toNumber(vertex.style.get('fontSize'), 14));
    const shape = vertex.style.has('ellipse')
      ? 'ellipse'
      : vertex.style.get('shape') === 'rhombus'
        ? 'diamond'
        : 'rect';

    if (shape === 'ellipse') {
      const ellipse = createSvgElement<SVGEllipseElement>(documentRef, 'ellipse');
      ellipse.setAttribute('cx', String(geometry.x + geometry.width / 2));
      ellipse.setAttribute('cy', String(geometry.y + geometry.height / 2));
      ellipse.setAttribute('rx', String(geometry.width / 2));
      ellipse.setAttribute('ry', String(geometry.height / 2));
      ellipse.setAttribute('fill', fill);
      ellipse.setAttribute('stroke', stroke);
      ellipse.setAttribute('stroke-width', '2');
      svg.appendChild(ellipse);
    } else if (shape === 'diamond') {
      const diamond = createSvgElement<SVGPolygonElement>(documentRef, 'polygon');
      diamond.setAttribute('points', [
        `${geometry.x + geometry.width / 2},${geometry.y}`,
        `${geometry.x + geometry.width},${geometry.y + geometry.height / 2}`,
        `${geometry.x + geometry.width / 2},${geometry.y + geometry.height}`,
        `${geometry.x},${geometry.y + geometry.height / 2}`,
      ].join(' '));
      diamond.setAttribute('fill', fill);
      diamond.setAttribute('stroke', stroke);
      diamond.setAttribute('stroke-width', '2');
      svg.appendChild(diamond);
    } else {
      const rect = createSvgElement<SVGRectElement>(documentRef, 'rect');
      rect.setAttribute('x', String(geometry.x));
      rect.setAttribute('y', String(geometry.y));
      rect.setAttribute('width', String(geometry.width));
      rect.setAttribute('height', String(geometry.height));
      rect.setAttribute('rx', vertex.style.get('rounded') === '1' ? '10' : '2');
      rect.setAttribute('fill', fill);
      rect.setAttribute('stroke', stroke);
      rect.setAttribute('stroke-width', '2');
      svg.appendChild(rect);
    }

    appendDrawioWrappedText(
      documentRef,
      svg,
      vertex.text,
      geometry.x,
      geometry.y,
      geometry.width,
      geometry.height,
      fontSize,
      getDrawioStyleValue(vertex.style, 'fontColor', '#172033')
    );
  }

  appendRenderedSvg(target, svg, 'rough');
};

const renderOfficialDrawio = async (
  documentRef: Document,
  text: string,
  target: HTMLElement,
  scriptUrl: string,
  t: DrawingTranslator
) => {
  const ownerWindow = documentRef.defaultView || (typeof window !== 'undefined' ? window : undefined);
  if (!ownerWindow) {
    throw new Error(t('drawing.error.viewerInitFailed'));
  }
  const resolvedScriptUrl = resolveSafeDrawioViewerScript(documentRef, scriptUrl);
  const sanitizedText = sanitizeOfficialDrawioXml(documentRef, text, t('drawing.error.drawioNoModel'));
  const nonce = createDrawioSandboxNonce(ownerWindow);
  const channel = `file-viewer-drawio-${nonce}`;
  const frame = createElement(documentRef, 'iframe', 'drawing-mxgraph');
  frame.title = 'diagrams.net preview';
  frame.referrerPolicy = 'no-referrer';
  frame.sandbox.add('allow-scripts');
  frame.srcdoc = buildDrawioSandboxDocument(sanitizedText, resolvedScriptUrl, nonce, channel);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => fail(t('drawing.error.drawioTimeout')), DRAWIO_OFFICIAL_TIMEOUT);
    const cleanup = () => {
      ownerWindow.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.data?.fileViewerDrawio !== channel) return;
      if (event.data?.ok === true) {
        cleanup();
        resolve();
      } else {
        fail(event.data?.message || t('drawing.error.viewerInitFailed'));
      }
    };
    ownerWindow.addEventListener('message', onMessage);
    frame.addEventListener('error', () => fail(t('drawing.error.viewerLoadFailed')), { once: true });
    target.appendChild(frame);
  });
  markRendered(target, 'official');
};

const renderDrawio = async (
  documentRef: Document,
  text: string,
  target: HTMLElement,
  options: FileViewerDrawingOptions | undefined,
  t: DrawingTranslator
) => {
  const preferOfficial = options?.preferOfficial ?? isFileViewerDrawioOfficialViewerEnabled();
  if (!preferOfficial) {
    renderDrawioFallback(documentRef, text, target, t);
    return;
  }
  const scriptUrl = resolveDrawingViewerScriptUrl(options, documentRef);

  try {
    await renderOfficialDrawio(documentRef, text, target, scriptUrl, t);
  } catch (error) {
    console.warn(error);
    delete target.dataset.drawingRendered;
    target.replaceChildren();
    renderDrawioFallback(documentRef, text, target, t);
  }
};

export default async function renderDrawing(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'drawio',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const documentRef = target.ownerDocument || document;
  const kind = normalizeDrawingType(type);
  const t = createFileViewerTranslator(context?.options);
  const zoomEmitter = createFileViewerZoomChangeEmitter();
  let status: DrawingStatus = 'loading';
  let errorMessage = '';
  let zoom = 1;
  let disposed = false;
  let diagramController: DiagramController | null = null;

  const root = createElement(documentRef, 'div', 'drawing-viewer');
  root.dataset.viewerZoomProvider = 'drawing';

  const toolbar = createElement(documentRef, 'div', 'drawing-toolbar');
  const title = createElement(documentRef, 'div', 'drawing-title');
  title.append(
    createElement(documentRef, 'span', undefined, formatDrawingLabel(type)),
    createElement(documentRef, 'strong', undefined, kind === 'excalidraw'
      ? t('drawing.title.excalidraw')
      : kind === 'mermaid'
        ? t('drawing.title.mermaid')
        : kind === 'plantuml'
          ? t('drawing.title.plantuml')
          : t('drawing.title.drawio'))
  );
  const actions = createElement(documentRef, 'div', 'drawing-actions');
  const zoomOutButton = createElement(documentRef, 'button', undefined, '-') as HTMLButtonElement;
  const zoomLabel = createElement(documentRef, 'span');
  const zoomInButton = createElement(documentRef, 'button', undefined, '+') as HTMLButtonElement;
  const resetButton = createElement(documentRef, 'button', undefined, t('drawing.toolbar.fit')) as HTMLButtonElement;
  [zoomOutButton, zoomInButton, resetButton].forEach(button => {
    button.type = 'button';
  });
  zoomOutButton.title = t('drawing.toolbar.zoomOut');
  zoomInButton.title = t('drawing.toolbar.zoomIn');
  resetButton.title = t('drawing.toolbar.fitWidth');
  actions.append(zoomOutButton, zoomLabel, zoomInButton, resetButton);
  toolbar.append(title, actions);

  const stageWrapper = createElement(documentRef, 'div', 'drawing-stage');
  const state = createElement(documentRef, 'div', 'drawing-state');
  const scroll = createElement(documentRef, 'div', 'drawing-scroll');
  const canvas = createElement(documentRef, 'div', 'drawing-canvas');
  scroll.append(canvas);
  stageWrapper.append(state, scroll);
  root.append(toolbar, stageWrapper);
  target.replaceChildren(createStyle(documentRef), root);

  const clearStage = () => {
    diagramController?.destroy();
    diagramController = null;
    delete canvas.dataset.drawingRendered;
    canvas.replaceChildren();
  };

  const getDrawingZoomState = (): FileViewerZoomState => ({
    scale: zoom,
    label: `${Math.round(zoom * 100)}%`,
    canZoomIn: zoom < 3,
    canZoomOut: zoom > 0.5,
    canReset: zoom !== 1,
    minScale: 0.5,
    maxScale: 3,
  });

  const applyZoom = () => {
    if (diagramController) {
      diagramController.setZoom(zoom);
      zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
      return;
    }
    if (kind === 'excalidraw') {
      canvas.style.transform = `scale(${zoom})`;
      canvas.style.transformOrigin = 'top center';
      (canvas.style as CSSStyleDeclaration & { zoom?: string }).zoom = '';
    } else {
      canvas.style.transform = '';
      canvas.style.transformOrigin = '';
      (canvas.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(zoom);
    }
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  };

  const setZoom = (scale: number) => {
    zoom = clampZoom(scale);
    applyZoom();
    zoomEmitter.emit();
    return getDrawingZoomState();
  };

  const syncUi = () => {
    state.hidden = status === 'ready';
    state.classList.toggle('error', status === 'error');
    state.textContent = status === 'error'
      ? errorMessage
      : t('drawing.state.loading');
    applyZoom();
  };

  const loadDrawing = async () => {
    status = 'loading';
    errorMessage = '';
    zoom = 1;
    clearStage();
    syncUi();

    try {
      const text = await readFileViewerText(buffer);
      if (disposed) {
        return;
      }
      if (kind === 'excalidraw') {
        await renderExcalidraw(documentRef, text, canvas, t);
      } else if (kind === 'mermaid' || kind === 'plantuml') {
        const { renderDiagram } = await import('./diagram.js');
        diagramController = await renderDiagram({
          documentRef,
          text,
          target: canvas,
          kind,
          options: context?.options?.drawing,
          theme: context?.options?.theme,
          viewerOptions: context?.options,
        });
      } else {
        await renderDrawio(documentRef, text, canvas, context?.options?.drawing, t);
      }
      if (disposed) {
        return;
      }
      status = 'ready';
      syncUi();
    } catch (error) {
      if (disposed) {
        return;
      }
      console.error(error);
      errorMessage = error instanceof Error ? error.message : String(error);
      status = 'error';
      syncUi();
    }
  };

  registerFileViewerZoomProvider(root, {
    zoomIn: () => setZoom(zoom + 0.15),
    zoomOut: () => setZoom(zoom - 0.15),
    resetZoom: () => setZoom(1),
    setZoom,
    getState: getDrawingZoomState,
    subscribe: zoomEmitter.subscribe,
  });

  zoomOutButton.addEventListener('click', () => setZoom(zoom - 0.15));
  zoomInButton.addEventListener('click', () => setZoom(zoom + 0.15));
  resetButton.addEventListener('click', () => setZoom(1));
  syncUi();
  void loadDrawing();

  return {
    $el: root,
    unmount() {
      disposed = true;
      diagramController?.destroy();
      unregisterFileViewerZoomProvider(root);
      target.replaceChildren();
    },
  };
}
