import {
  createFileViewerZoomChangeEmitter,
  registerFileViewerZoomProvider,
  resolveFileViewerLocale,
  unregisterFileViewerZoomProvider,
} from '@file-viewer/core';
import type { FileRenderContext, FileViewerFitRequest, FileViewerZoomState } from '@file-viewer/core';
import type Viewer from 'bpmn-js/lib/Viewer.js';
import type { BpmnDiagram, BpmnView, BpmnViewerInstance, BpmnViewerOptions } from './bpmn.js';
import { BpmnInputError, decodeBpmnSource, prepareBpmnXml } from './bpmnXml.js';
import { bpmnStyles } from './bpmnStyles.js';
import { bpmnPeerVersion, bpmnVendorStyles } from './bpmnVendorStyles.js';

interface Point { x: number; y: number }
interface Bounds extends Point { width: number; height: number }
interface Viewbox extends Bounds { scale: number; inner: Bounds; outer: { width: number; height: number } }
interface Canvas {
  zoom(scale?: number, center?: Point): number;
  viewbox(box?: Bounds): Viewbox;
  resized(): void;
  scroll(delta: { dx: number; dy: number }): Point;
}
interface DiagramModel { id?: string; name?: string }

const messages = {
  en: {
    diagram: 'Diagram', source: 'Source', diagrams: 'BPMN diagram',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit', actual: 'Actual size',
    loading: 'Loading BPMN diagram...',
    missingDi: 'This BPMN file has no diagram layout (BPMN DI). The original XML is available in Source.',
    emptyDiagram: 'This BPMN diagram has no drawable elements. The original XML is available in Source.',
    invalidXml: 'The XML is malformed. The original source is available below.',
    notBpmn: 'Expected BPMN 2.0 definitions. The original source is available below.',
    doctype: 'XML with a DOCTYPE is not rendered. The original source is available below.',
    importError: 'The BPMN diagram could not be rendered. The original source is available below.',
    warnings: 'Some elements or styles could not be imported. Check the original XML in Source.',
    size: 'This BPMN file exceeds the configured size limit.',
    decode: 'The XML text encoding could not be decoded.',
    dependency: `BPMN requires bpmn-js@${bpmnPeerVersion}. Install it alongside @file-viewer/renderer-drawing.`,
  },
  zh: {
    diagram: '流程图', source: '源码', diagrams: 'BPMN 图',
    zoomIn: '放大', zoomOut: '缩小', fit: '适合窗口', actual: '原始比例',
    loading: '正在加载 BPMN 流程图...',
    missingDi: '此 BPMN 文件没有图形布局数据（BPMN DI），可在源码视图查看原始 XML。',
    emptyDiagram: '此 BPMN 图没有可显示的图形元素，可在源码视图查看原始 XML。',
    invalidXml: 'XML 格式错误，原始源码仍可查看。',
    notBpmn: '文件不是 BPMN 2.0 definitions，原始源码仍可查看。',
    doctype: '不渲染包含 DOCTYPE 的 XML，原始源码仍可查看。',
    importError: '无法渲染此 BPMN 流程图，原始源码仍可查看。',
    warnings: '部分元素或样式未能导入，请在源码视图核对原始 XML。',
    size: 'BPMN 文件超过了配置的大小限制。',
    decode: '无法按 XML 声明的编码读取文本。',
    dependency: `BPMN 需要 bpmn-js@${bpmnPeerVersion}，请与 @file-viewer/renderer-drawing 一起安装。`,
  },
};

export function renderBpmn(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context?: FileRenderContext,
  options: BpmnViewerOptions = {},
): BpmnViewerInstance {
  if (context?.signal?.aborted) throw new DOMException('BPMN render aborted.', 'AbortError');
  const maxBytes = options.maxFileBytes ?? 20 * 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('maxFileBytes must be a positive safe integer.');
  const documentRef = target.ownerDocument;
  const windowRef = documentRef.defaultView;
  if (!windowRef) throw new Error('BPMN preview requires a browser document.');
  const t = messages[resolveFileViewerLocale(context?.options).startsWith('zh') ? 'zh' : 'en'];
  const emitter = createFileViewerZoomChangeEmitter();
  const events = new windowRef.AbortController();
  let disposed = false;
  let disposal: Promise<void> | undefined;
  let engine: Viewer | undefined;
  let canvas: Canvas | undefined;
  let original = '';
  let mode: BpmnView = options.initialView === 'source' ? 'source' : 'diagram';
  let diagramReady = false;
  let scale = 1;
  let sourceScale = 1;
  let needsFit = true;
  let followResize = true;
  let lastFit: Pick<FileViewerFitRequest, 'mode' | 'padding' | 'resize' | 'minScale' | 'maxScale'> = {
    mode: 'contain', padding: 24, resize: 'until-interaction',
  };
  let diagrams: Array<BpmnDiagram & { model: DiagramModel }> = [];
  let selectedId = '';
  let parseWarnings: unknown[] = [];
  let removedColors = 0;
  const pointers = new Map<number, Point>();

  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
    const node = documentRef.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = element('div', 'fv-bpmn');
  root.dataset.bpmnStatus = 'loading';
  root.dataset.viewerZoomProvider = 'bpmn';
  root.dataset.theme = context?.options?.theme || 'system';
  const style = element('style');
  style.textContent = `${bpmnVendorStyles}\n${bpmnStyles}`;
  const toolbar = element('div', 'fv-bpmn-toolbar');
  const modes = element('div', 'fv-bpmn-modes');
  const zoomActions = element('div', 'fv-bpmn-zoom');
  const button = (parent: HTMLElement, text: string, label: string) => {
    const node = element('button', undefined, text);
    node.type = 'button';
    node.title = label;
    node.setAttribute('aria-label', label);
    parent.append(node);
    return node;
  };
  const diagramButton = button(modes, t.diagram, t.diagram);
  const sourceButton = button(modes, t.source, t.source);
  diagramButton.dataset.bpmnAction = 'diagram';
  sourceButton.dataset.bpmnAction = 'source';
  const diagramSelect = element('select');
  diagramSelect.setAttribute('aria-label', t.diagrams);
  diagramSelect.hidden = true;
  const zoomOut = button(zoomActions, '-', t.zoomOut);
  const zoomLabel = element('output');
  zoomLabel.setAttribute('aria-live', 'polite');
  zoomActions.append(zoomLabel);
  const zoomIn = button(zoomActions, '+', t.zoomIn);
  const actual = button(zoomActions, '1:1', t.actual);
  const fit = button(zoomActions, t.fit, t.fit);
  zoomOut.dataset.bpmnAction = 'zoom-out';
  zoomIn.dataset.bpmnAction = 'zoom-in';
  actual.dataset.bpmnAction = 'actual';
  fit.dataset.bpmnAction = 'fit';
  toolbar.append(modes, diagramSelect, zoomActions);
  const notice = element('div', 'fv-bpmn-notice', t.loading);
  notice.setAttribute('role', 'status');
  const stage = element('div', 'fv-bpmn-stage');
  const diagram = element('div', 'fv-bpmn-diagram');
  diagram.setAttribute('aria-label', t.diagram);
  const source = element('pre', 'fv-bpmn-source');
  source.tabIndex = 0;
  source.setAttribute('aria-label', t.source);
  stage.append(diagram, source);
  root.append(style, toolbar, notice, stage);
  target.replaceChildren(root);

  const limits = () => mode === 'source' ? { min: 0.5, max: 3 } : { min: 0.01, max: 4 };
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const getState = (): FileViewerZoomState => {
    const value = mode === 'source' ? sourceScale : scale;
    const { min, max } = limits();
    const enabled = !disposed && (mode === 'source' || diagramReady);
    return {
      scale: value, label: `${Math.round(value * 100)}%`,
      canZoomIn: enabled && value < max, canZoomOut: enabled && value > min,
      canReset: enabled && value !== 1, minScale: min, maxScale: max,
    };
  };
  const syncZoom = () => {
    const state = getState();
    zoomLabel.textContent = state.label;
    zoomIn.disabled = !state.canZoomIn;
    zoomOut.disabled = !state.canZoomOut;
    actual.disabled = fit.disabled = disposed || (mode === 'diagram' && !diagramReady);
    emitter.emit();
  };
  const interacted = () => { if (lastFit.resize !== 'always') followResize = false; };
  const setZoom = (value: number, center?: Point) => {
    if (disposed || !Number.isFinite(value)) return getState();
    const { min, max } = limits();
    if (mode === 'source') {
      sourceScale = clamp(value, min, max);
      source.style.fontSize = `${13 * sourceScale}px`;
    } else if (diagramReady && canvas) {
      interacted();
      scale = canvas.zoom(clamp(value, min, max), center);
    }
    syncZoom();
    return getState();
  };
  const fitDiagram = () => {
    if (disposed || !canvas || !diagramReady || mode !== 'diagram') return false;
    canvas.resized();
    const box = canvas.viewbox();
    const { inner, outer } = box;
    if (!(outer.width > 0 && outer.height > 0 && inner.width > 0 && inner.height > 0)) return false;
    const padding = Math.max(0, Number.isFinite(lastFit.padding) ? lastFit.padding : 24);
    const xScale = Math.max(1, outer.width - padding * 2) / inner.width;
    const yScale = Math.max(1, outer.height - padding * 2) / inner.height;
    const fitMode = lastFit.mode;
    let value = fitMode === 'actual' ? 1 : fitMode === 'width' ? xScale : fitMode === 'height' ? yScale
      : fitMode === 'cover' ? Math.max(xScale, yScale) : Math.min(xScale, yScale);
    if (fitMode === 'auto' || fitMode === 'scale-down') value = Math.min(1, value);
    const min = Number.isFinite(lastFit.minScale) ? clamp(lastFit.minScale!, 0.01, 4) : 0.01;
    const max = Number.isFinite(lastFit.maxScale) ? clamp(lastFit.maxScale!, min, 4) : 4;
    value = clamp(value, min, max);
    canvas.viewbox({
      x: inner.x + inner.width / 2 - outer.width / value / 2,
      y: inner.y + inner.height / 2 - outer.height / value / 2,
      width: outer.width / value, height: outer.height / value,
    });
    scale = canvas.zoom();
    needsFit = false;
    syncZoom();
    return true;
  };
  const releasePointers = () => {
    for (const id of pointers.keys()) {
      if (diagram.hasPointerCapture(id)) diagram.releasePointerCapture(id);
    }
    pointers.clear();
    diagram.style.cursor = '';
  };
  const setView = (next: BpmnView) => {
    if (disposed || (next !== 'diagram' && next !== 'source')) return;
    if (next === 'diagram' && !diagramReady) return;
    releasePointers();
    mode = next;
    root.dataset.bpmnView = mode;
    diagram.hidden = mode !== 'diagram';
    source.hidden = mode !== 'source';
    diagramButton.setAttribute('aria-pressed', String(mode === 'diagram'));
    sourceButton.setAttribute('aria-pressed', String(mode === 'source'));
    if (mode === 'diagram' && canvas) {
      canvas.resized();
      if (needsFit) fitDiagram();
    }
    syncZoom();
  };
  const showNotice = (text: string) => {
    notice.textContent = text;
    notice.hidden = !text;
  };
  const fail = (text: string, status = 'error') => {
    if (disposed) return;
    diagramReady = false;
    root.dataset.bpmnStatus = status;
    diagramButton.disabled = true;
    showNotice(text);
    setView('source');
  };
  const imported = (warnings: unknown[], removedColors = 0) => {
    if (disposed) return;
    if (!diagram.querySelector('.djs-shape,.djs-connection')) {
      fail(t.emptyDiagram, 'source-only');
      return;
    }
    diagramReady = true;
    diagramButton.disabled = false;
    diagramSelect.disabled = false;
    root.dataset.bpmnStatus = 'ready';
    root.dataset.bpmnWarnings = String(warnings.length + removedColors);
    needsFit = true;
    followResize = true;
    showNotice(warnings.length || removedColors ? t.warnings : '');
    setView(mode);
    context?.onProgressiveRender?.();
  };
  const observe = typeof windowRef.ResizeObserver === 'function' ? new windowRef.ResizeObserver(() => {
    if (disposed || !canvas || mode !== 'diagram') return;
    canvas.resized();
    if (needsFit || followResize) fitDiagram();
  }) : undefined;
  observe?.observe(diagram);

  const listen = <K extends keyof HTMLElementEventMap>(
    node: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void,
    settings: AddEventListenerOptions = {},
  ) => node.addEventListener(type, listener, { ...settings, signal: events.signal });
  const interactiveTarget = (event: Event) => (event.target as Element | null)?.closest('a,button,select,input');
  listen(diagram, 'wheel', event => {
    if (disposed || !diagramReady || !canvas || mode !== 'diagram' || interactiveTarget(event)) return;
    event.preventDefault();
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? diagram.clientHeight : 1;
    if (event.ctrlKey || event.metaKey) {
      const rect = diagram.getBoundingClientRect();
      setZoom(scale * Math.exp(clamp(-event.deltaY * factor * 0.01, -1, 1)), {
        x: event.clientX - rect.left, y: event.clientY - rect.top,
      });
    } else {
      interacted();
      canvas.scroll({ dx: -factor * (event.shiftKey ? event.deltaY : event.deltaX), dy: event.shiftKey ? 0 : -factor * event.deltaY });
    }
  }, { passive: false });
  listen(diagram, 'pointerdown', event => {
    if (!diagramReady || mode !== 'diagram' || event.button !== 0 || interactiveTarget(event)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    diagram.setPointerCapture(event.pointerId);
  });
  listen(diagram, 'pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous || !canvas || disposed) return;
    const next = { x: event.clientX, y: event.clientY };
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    pointers.set(event.pointerId, next);
    interacted();
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      const rect = diagram.getBoundingClientRect();
      if (before > 0 && after > 0) setZoom(scale * after / before, {
        x: (next.x + other.x) / 2 - rect.left, y: (next.y + other.y) / 2 - rect.top,
      });
    }
    canvas.scroll({ dx: (next.x - previous.x) / (other ? 2 : 1), dy: (next.y - previous.y) / (other ? 2 : 1) });
    diagram.style.cursor = 'grabbing';
    event.preventDefault();
  });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    listen(diagram, eventName, event => {
      pointers.delete(event.pointerId);
      if (diagram.hasPointerCapture(event.pointerId)) diagram.releasePointerCapture(event.pointerId);
      if (!pointers.size) diagram.style.cursor = '';
    });
  }
  listen(diagram, 'keydown', event => {
    if (!canvas || !diagramReady || interactiveTarget(event) || event.ctrlKey || event.metaKey || event.altKey) return;
    const deltas: Record<string, [number, number]> = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
    const delta = deltas[event.key];
    if (delta) { interacted(); canvas.scroll({ dx: delta[0], dy: delta[1] }); }
    else if (event.key === '+' || event.key === '=') setZoom(scale * 1.2);
    else if (event.key === '-') setZoom(scale / 1.2);
    else if (event.key === '0') setZoom(1);
    else return;
    event.preventDefault();
  });
  listen(diagramButton, 'click', () => setView('diagram'));
  listen(sourceButton, 'click', () => setView('source'));
  listen(zoomIn, 'click', () => setZoom(getState().scale * 1.2));
  listen(zoomOut, 'click', () => setZoom(getState().scale / 1.2));
  listen(actual, 'click', () => setZoom(1));
  listen(fit, 'click', () => {
    if (mode === 'source') setZoom(1);
    else { lastFit = { mode: 'contain', padding: 24, resize: 'until-interaction' }; followResize = true; fitDiagram(); }
  });
  registerFileViewerZoomProvider(root, {
    getState, setZoom, subscribe: listener => disposed ? () => {} : emitter.subscribe(listener),
    zoomIn: () => setZoom(getState().scale * 1.2),
    zoomOut: () => setZoom(getState().scale / 1.2),
    resetZoom: () => setZoom(1),
    fit: request => {
      lastFit = request;
      followResize = request.resize !== 'initial';
      const applied = mode === 'source' ? (setZoom(1), !disposed) : fitDiagram();
      return { applied, mode: request.mode, resize: request.resize, scale: getState().scale, source: request.source, provider: 'zoom' };
    },
  });

  const describeError = (error: unknown) => error instanceof BpmnInputError ? t[error.code]
    : `${t.importError}${error instanceof Error ? `\n${error.message}` : ''}`;
  const guardImport = () => { if (disposed) throw new DOMException('BPMN render aborted.', 'AbortError'); };
  const load = async () => {
    try {
      if (buffer.byteLength > maxBytes) { fail(t.size); return; }
      try { original = decodeBpmnSource(buffer); } catch { fail(t.decode); return; }
      source.textContent = original;
      const prepared = prepareBpmnXml(original, documentRef);
      removedColors = prepared.removedColors;
      if (!prepared.hasDiagram) { fail(t.missingDi, 'source-only'); return; }
      let BpmnViewer: typeof Viewer;
      try { ({ default: BpmnViewer } = await import('bpmn-js/lib/Viewer.js')); }
      catch { fail(t.dependency); return; }
      if (disposed) return;
      engine = new BpmnViewer({ container: diagram, width: '100%', height: '100%', canvas: { deferUpdate: false } });
      canvas = engine.get<Canvas>('canvas');
      engine.on('import.parse.complete', 2000, (event: { definitions?: { diagrams?: DiagramModel[] }; warnings?: unknown[] }) => {
        guardImport();
        parseWarnings = event.warnings || [];
        diagrams = (event.definitions?.diagrams || []).map((model, index) => ({
          id: model.id || `diagram-${index + 1}`, name: model.name || model.id || `${t.diagrams} ${index + 1}`, model,
        }));
        diagramSelect.replaceChildren(...diagrams.map(item => {
          const option = element('option', undefined, item.name);
          option.value = item.id;
          return option;
        }));
        diagramSelect.hidden = diagrams.length < 2;
        selectedId = diagrams[0]?.id || '';
      });
      engine.on('import.render.start', 2000, guardImport);
      engine.on('canvas.viewbox.changed', () => {
        if (!disposed && canvas && diagramReady && mode === 'diagram') { scale = canvas.zoom(); syncZoom(); }
      });
      const result = await engine.importXML(prepared.xml);
      imported(result.warnings, prepared.removedColors);
    } catch (error) { if (!disposed) fail(describeError(error)); }
  };
  const ready = load();
  let pending = ready;
  const selectDiagram = (id: string) => {
    if (disposed) return Promise.resolve();
    const selected = diagrams.find(item => item.id === id);
    if (!selected) return Promise.reject(new RangeError(`Unknown BPMN diagram: ${id}`));
    pending = pending.then(async () => {
      if (disposed || !engine || (selectedId === id && diagramReady)) return;
      diagramSelect.disabled = true;
      diagramReady = false;
      root.dataset.bpmnStatus = 'loading';
      showNotice(t.loading);
      syncZoom();
      try {
        const result = await engine.open(selected.model);
        if (disposed) return;
        selectedId = id;
        diagramSelect.value = id;
        mode = 'diagram';
        imported([...parseWarnings, ...result.warnings], removedColors);
      } catch (error) { if (!disposed) fail(describeError(error)); }
      finally { if (!disposed) diagramSelect.disabled = false; }
    });
    return pending;
  };
  listen(diagramSelect, 'change', () => { void selectDiagram(diagramSelect.value); });
  const unmount = () => {
    if (disposal) return disposal;
    disposed = true;
    events.abort();
    observe?.disconnect();
    releasePointers();
    context?.signal?.removeEventListener('abort', onAbort);
    unregisterFileViewerZoomProvider(root);
    emitter.clear();
    root.remove();
    // importXML has no cancellation API. Keep its abort guard until pending
    // parsing settles, then destroy the engine once. Never clear a newer host.
    disposal = pending.finally(() => { engine?.destroy(); engine = undefined; canvas = undefined; });
    return disposal;
  };
  const onAbort = () => { void unmount(); };
  context?.signal?.addEventListener('abort', onAbort, { once: true });
  if (context?.signal?.aborted) void unmount();
  // Loading is asynchronous, but source inspection is immediately available.
  if (!disposed) {
    root.dataset.bpmnView = mode;
    source.hidden = mode !== 'source';
    diagram.hidden = mode !== 'diagram';
    diagramButton.disabled = !diagramReady;
    diagramButton.setAttribute('aria-pressed', String(mode === 'diagram'));
    sourceButton.setAttribute('aria-pressed', String(mode === 'source'));
    syncZoom();
  }
  return { $el: root, ready, getSource: () => original, getView: () => mode, setView,
    getDiagrams: () => diagrams.map(({ id, name }) => ({ id, name })), selectDiagram, unmount };
}
