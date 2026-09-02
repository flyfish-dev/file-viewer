import {
  CadViewer,
  inferEntityKind,
  type CadBlock,
  type CadBounds,
  type CadDocument,
  type CadEntity,
  type CadLayer,
  type CadLoadProgress,
  type CadPoint2D,
  type CadViewer as CadViewerInstance,
  type CadViewerLoadResult,
  type CanvasViewerOptions,
  type RenderStats,
  type ViewState,
  type ViewChangeEvent,
} from '@flyfish-dev/cad-viewer';
import {
  resolveFileViewerCadAssetUrls,
  resolveFileViewerRuntimeAssetBaseUrl,
} from '@file-viewer/core/assets';
import {
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter,
  registerFileViewerViewStateProvider,
  registerFileViewerZoomProvider,
  resolveFileViewerLocale,
  unregisterFileViewerViewStateProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerApplyViewStateOptions,
  type FileRenderContext,
  type FileViewerCadColorMode,
  type FileViewerCadOptions,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerViewState,
  type FileViewerViewStateChangeAction,
  type FileViewerViewStateChangeSource,
  type FileViewerZoomState,
} from '@file-viewer/core';
import {
  applyCadViewerColorMode,
  normalizeFileViewerCadColorMode,
  resolveFileViewerCadMonochromeColor,
  resolveCadViewerSourceDocument,
  supportsCadViewerColorMode,
} from './colorMode';

type CadStatus = 'loading' | 'ready' | 'error';

type CadLayerItem = CadLayer & {
  name: string;
  sourceNames: string[];
  duplicateCount: number;
};

const CAD_WORKER_TIMEOUT = 120000;
const CAD_DEFAULT_FIT_PADDING = 0.92;
const CAD_BOUNDS_EPSILON = 1e-9;
const CAD_BEST_FIT_OUTLIER_RATIO = 8;
const CAD_NATIVE_MIN_ZOOM_RATIO = 0.05;
const CAD_NATIVE_MAX_ZOOM_RATIO = 64;

const cadStyle = `
.cad-shell{display:flex;height:100%;min-height:100%;flex-direction:column;background:#f5f7fb;color:#142335}
.cad-shell *{box-sizing:border-box}
.cad-toolbar{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:16px;padding:0 14px;border-bottom:1px solid rgba(15,23,42,.08);background:#fff}
.cad-tools,.cad-meta{display:flex;align-items:center;gap:8px}
.cad-tools button{min-width:34px;min-height:30px;border:0;border-radius:8px;background:rgba(15,23,42,.06);color:#25344c;cursor:pointer;font-weight:800;letter-spacing:0;transition:background-color .18s ease,color .18s ease}
.cad-tools button:hover{background:rgba(31,150,110,.14);color:#0f8f62}
.cad-tools button.cad-color-mode{min-width:52px;padding:0 10px;font-size:12px}
.cad-tools button.cad-color-mode[aria-pressed='true']{background:#0f172a;color:#fff}
.cad-tools button.cad-color-mode:disabled{cursor:not-allowed;opacity:.46}
.cad-zoom,.cad-meta span{color:#64748b;font-size:12px;font-weight:800;letter-spacing:0}
.cad-meta span{border-radius:999px;padding:5px 9px;background:rgba(15,23,42,.06)}
.cad-body{display:grid;min-height:0;flex:1;grid-template-columns:minmax(176px,236px) minmax(0,1fr) minmax(142px,176px);background:#eef2f7}
.cad-body.without-layers{grid-template-columns:minmax(0,1fr) minmax(142px,176px)}
.cad-layers,.cad-inspector{min-height:0;overflow:auto;border-right:1px solid rgba(15,23,42,.08);background:#fff}
.cad-layers[hidden]{display:none}
.cad-inspector{border-right:0;border-left:1px solid rgba(15,23,42,.08);padding:14px}
.cad-layers-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 12px 9px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.96);color:#1f2a3d;font-size:12px;z-index:1}
.cad-layers-head span{color:#7b8ca5;font-size:11px;font-weight:800;white-space:nowrap}
.cad-layers-list{display:flex;flex-direction:column;gap:2px;padding:7px 8px 10px}
.cad-layers button{display:grid;width:100%;min-height:30px;grid-template-columns:14px minmax(0,1fr);align-items:center;gap:7px;border:0;border-radius:6px;background:transparent;color:#25344c;cursor:pointer;font-size:12px;font-weight:700;text-align:left}
.cad-layers button:hover{background:#f1f5f9}
.cad-layers button.muted{color:#94a3b8}
.cad-layers button span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cad-layer-color{width:8px;height:8px;justify-self:center;border-radius:50%;background:#1f966e;box-shadow:0 0 0 1px rgba(15,23,42,.12),0 0 0 3px rgba(31,150,110,.1)}
.cad-canvas-wrap{position:relative;min-width:0;min-height:0;overflow:hidden;background:linear-gradient(90deg,rgba(15,23,42,.04) 1px,transparent 1px),linear-gradient(180deg,rgba(15,23,42,.04) 1px,transparent 1px),#f8fafc;background-size:28px 28px}
.cad-stage{position:relative;width:100%;height:100%;min-height:420px;overflow:hidden}
.cad-stage canvas{position:absolute;inset:0;display:block;width:100%!important;height:100%!important}
.cad-native-stage{position:absolute;inset:0;z-index:2;display:none;overflow:hidden}
.cad-native-stage:not(:empty),.cad-native-stage.is-active{display:block}
.cad-native-stage *{box-sizing:border-box}
.dwfv-root{height:100%;min-height:0;display:grid;grid-template-rows:auto 1fr;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#111827}
.dwfv-toolbar{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#fff;border-bottom:1px solid #e5e7eb}
.dwfv-toolbar button,.dwfv-toolbar select{font:inherit}
.dwfv-workspace{min-height:0;display:grid;grid-template-columns:minmax(220px,300px) 1fr}
.dwfv-tree{overflow:auto;border-right:1px solid #d6d8dd;background:#fff;font-size:12px;padding:8px}
.dwfv-tree[style*="display: none"]+.dwfv-stage{grid-column:1/-1}
.dwfv-tree-header{font-weight:700;margin-bottom:4px}
.dwfv-tree-stats{color:#6b7280;margin-bottom:8px}
.dwfv-tree details{margin-left:8px}
.dwfv-tree summary{cursor:pointer;padding:2px 0}
.dwfv-tree-meta{color:#6b7280;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;padding-left:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dwfv-stage{position:relative;overflow:hidden;background:#e5e7eb}
.dwfv-canvas{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%}
.dwfv-webgl-canvas{pointer-events:none}
.dwfv-overlay-canvas{pointer-events:auto;touch-action:none;cursor:grab}
.dwfv-overlay-canvas:active{cursor:grabbing}
.dwfv-status{margin-left:auto;font-size:12px;color:#4b5563}
.dwfv-warn{color:#92400e}
.cad-viewer-container{position:relative;overflow:hidden;min-width:0;min-height:0}
.cad-viewer-canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.cad-viewer-canvas.is-dragging{cursor:grabbing}
.cad-viewer-webgl-canvas{position:relative;z-index:0}
.cad-viewer-text-overlay{display:block;contain:strict;-webkit-user-select:none;user-select:none}
.cad-viewer-native-host{position:absolute;top:0;right:0;bottom:0;left:0;display:none;z-index:2;min-width:0;min-height:0;background:#05070d}
.cad-viewer-native-host.is-active{display:block}
.cad-viewer-native-host .dwfv-root{height:100%;min-height:0;color:#dbeafe;background:#05070d}
.cad-viewer-native-host .dwfv-toolbar{min-height:34px;padding:5px 8px;gap:6px;border-bottom:1px solid rgba(71,85,105,.65);background:#0f172af5;color:#e5e7eb}
.cad-viewer-native-host .dwfv-toolbar button,.cad-viewer-native-host .dwfv-toolbar select{height:24px;border:1px solid rgba(100,116,139,.75);border-radius:6px;background:#111827;color:#e5e7eb;font-size:12px}
.cad-viewer-native-host .dwfv-toolbar button{padding:0 8px;cursor:pointer}
.cad-viewer-native-host .dwfv-toolbar button:hover,.cad-viewer-native-host .dwfv-toolbar select:hover{border-color:#60a5fa;color:#bfdbfe}
.cad-viewer-native-host .dwfv-status{color:#93c5fd;font-size:12px}
.cad-viewer-native-host .dwfv-workspace{min-height:0;background:#05070d}
.cad-viewer-native-host .dwfv-stage{background:#05070d}
.cad-viewer-native-host .dwfv-tree{border-right:1px solid rgba(71,85,105,.7);background:#0f172a;color:#dbeafe}
.cad-viewer-native-host .dwfv-tree-stats,.cad-viewer-native-host .dwfv-tree-meta{color:#94a3b8}
.cad-viewer-native-host .dwfv-warn{color:#fbbf24}
.cad-native-stage .dwfv-root,.cad-native-stage .dwfv-workspace,.cad-native-stage .dwfv-stage{width:100%;min-width:0;min-height:0}
.cad-native-stage .dwfv-root{height:100%}
.cad-state{position:absolute;inset:50% auto auto 50%;max-width:min(520px,calc(100% - 48px));transform:translate(-50%,-50%);border-radius:12px;padding:14px 18px;background:rgba(255,255,255,.92);box-shadow:0 14px 38px rgba(15,23,42,.12);color:#53637a;font-size:13px;font-weight:800;text-align:center}
.cad-state[hidden]{display:none!important}
.cad-state.error{color:#b42318}
.cad-inspector strong{display:block;margin-bottom:12px;color:#1f2a3d;font-size:13px}
.cad-inspector dl{display:grid;gap:8px;margin:0}
.cad-inspector dl div{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:8px;padding:8px 10px;background:#f8fafc}
.cad-inspector dt,.cad-inspector dd{margin:0;font-size:12px}
.cad-inspector dt{color:#7b8ca5;font-weight:700}
.cad-inspector dd{color:#20304a;font-weight:900}
.cad-warning{margin:12px 0 0;border-radius:8px;padding:10px;background:rgba(245,158,11,.13);color:#92400e;font-size:12px;line-height:1.55}
[data-viewer-theme='dark'] .cad-shell{background:#111827;color:#e5edf6}
[data-viewer-theme='dark'] .cad-body{background:#0d1117}
[data-viewer-theme='dark'] .cad-toolbar,[data-viewer-theme='dark'] .cad-layers,[data-viewer-theme='dark'] .cad-inspector{border-color:rgba(139,148,158,.2);background:#111827;color:#e5edf6}
[data-viewer-theme='dark'] .cad-layers-head{border-color:rgba(139,148,158,.2);background:rgba(17,24,39,.96);color:#f8fafc}
[data-viewer-theme='dark'] .cad-tools button,[data-viewer-theme='dark'] .cad-meta span,[data-viewer-theme='dark'] .cad-inspector dl div{background:#1f2937;color:#cbd5e1}
[data-viewer-theme='dark'] .cad-layers button,[data-viewer-theme='dark'] .cad-inspector strong,[data-viewer-theme='dark'] .cad-inspector dd{color:#e5edf6}
[data-viewer-theme='dark'] .cad-layers button:hover{background:#1f2937}
[data-viewer-theme='dark'] .cad-zoom,[data-viewer-theme='dark'] .cad-meta span,[data-viewer-theme='dark'] .cad-inspector dt,[data-viewer-theme='dark'] .cad-layers-head span{color:#94a3b8}
[data-viewer-theme='dark'] .cad-canvas-wrap{background:linear-gradient(90deg,rgba(148,163,184,.08) 1px,transparent 1px),linear-gradient(180deg,rgba(148,163,184,.08) 1px,transparent 1px),#090d14;background-size:28px 28px}
[data-viewer-theme='dark'] .cad-state{background:rgba(15,23,42,.92);color:#cbd5e1;box-shadow:0 18px 44px rgba(0,0,0,.34)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .cad-shell{background:#111827;color:#e5edf6}[data-viewer-theme='system'] .cad-body{background:#0d1117}[data-viewer-theme='system'] .cad-toolbar,[data-viewer-theme='system'] .cad-layers,[data-viewer-theme='system'] .cad-inspector{border-color:rgba(139,148,158,.2);background:#111827;color:#e5edf6}[data-viewer-theme='system'] .cad-layers-head{border-color:rgba(139,148,158,.2);background:rgba(17,24,39,.96);color:#f8fafc}[data-viewer-theme='system'] .cad-tools button,[data-viewer-theme='system'] .cad-meta span,[data-viewer-theme='system'] .cad-inspector dl div{background:#1f2937;color:#cbd5e1}[data-viewer-theme='system'] .cad-layers button,[data-viewer-theme='system'] .cad-inspector strong,[data-viewer-theme='system'] .cad-inspector dd{color:#e5edf6}[data-viewer-theme='system'] .cad-layers button:hover{background:#1f2937}[data-viewer-theme='system'] .cad-zoom,[data-viewer-theme='system'] .cad-meta span,[data-viewer-theme='system'] .cad-inspector dt,[data-viewer-theme='system'] .cad-layers-head span{color:#94a3b8}[data-viewer-theme='system'] .cad-canvas-wrap{background:linear-gradient(90deg,rgba(148,163,184,.08) 1px,transparent 1px),linear-gradient(180deg,rgba(148,163,184,.08) 1px,transparent 1px),#090d14;background-size:28px 28px}[data-viewer-theme='system'] .cad-state{background:rgba(15,23,42,.92);color:#cbd5e1;box-shadow:0 18px 44px rgba(0,0,0,.34)}}
@media (max-width:860px){.cad-body,.cad-body.without-layers{grid-template-columns:minmax(0,1fr)}.cad-layers,.cad-inspector{display:none}}
`;

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = cadStyle;
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

const normalizeType = (type?: string) => {
  return (type || 'dxf').toLowerCase();
};

const normalizeLayerKey = (name: string) => name.trim().toLocaleLowerCase();

const getLayerNameScore = (name: string) => {
  const letters = name.replace(/[^a-z]/gi, '');
  if (!letters) {
    return 0;
  }
  const isUpper = letters === letters.toLocaleUpperCase();
  const isLower = letters === letters.toLocaleLowerCase();
  if (!isUpper && !isLower) {
    return 3;
  }
  return isUpper ? 2 : 1;
};

const shouldPreferLayerName = (candidate: string, current: string) => {
  const nextScore = getLayerNameScore(candidate);
  const currentScore = getLayerNameScore(current);
  if (nextScore !== currentScore) {
    return nextScore > currentScore;
  }
  if (candidate.length !== current.length) {
    return candidate.length > current.length;
  }
  return candidate.localeCompare(current, undefined, { sensitivity: 'base' }) < 0;
};

const addLayerSourceName = (layer: CadLayerItem, name: unknown) => {
  if (typeof name !== 'string' && typeof name !== 'number') {
    return;
  }
  const nextName = String(name);
  if (!nextName || layer.sourceNames.includes(nextName)) {
    return;
  }
  layer.sourceNames.push(nextName);
};

const collectLayers = (result: CadViewerLoadResult | null): CadLayerItem[] => {
  if (!result) {
    return [];
  }

  const groups = new Map<string, CadLayerItem>();
  Object.entries(result.document.layers).forEach(([key, layer]) => {
    const sourceName = typeof layer.name === 'string' && layer.name ? layer.name : key;
    const groupKey = normalizeLayerKey(sourceName || key);
    const current = groups.get(groupKey);
    if (!current) {
      groups.set(groupKey, {
        ...layer,
        name: sourceName || key,
        sourceNames: Array.from(new Set(
          [key, sourceName].filter((name): name is string => typeof name === 'string' && name.length > 0)
        )),
        duplicateCount: 1,
      });
      return;
    }

    current.duplicateCount += 1;
    addLayerSourceName(current, key);
    addLayerSourceName(current, sourceName);
    current.isVisible = current.isVisible !== false || layer.isVisible !== false;
    current.isFrozen = !!current.isFrozen && !!layer.isFrozen;
    current.isLocked = !!current.isLocked || !!layer.isLocked;
    current.color = current.color ?? layer.color;
    current.colorIndex = current.colorIndex ?? layer.colorIndex;
    current.trueColor = current.trueColor ?? layer.trueColor;
    current.lineType = current.lineType ?? layer.lineType;
    current.lineweight = current.lineweight ?? layer.lineweight;
    if (shouldPreferLayerName(sourceName, current.name)) {
      current.name = sourceName;
    }
  });

  return Array.from(groups.values())
    .sort((left, right) => left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }));
};

const formatNumber = (value: number | undefined, locale = 'zh-CN') => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat(locale).format(Math.round(value || 0));
};

const getCadDocumentBaseUrl = (target: HTMLElement) => {
  return target.ownerDocument
    ? resolveFileViewerRuntimeAssetBaseUrl(target.ownerDocument)
    : 'file:///';
};

const CAD_DWG_WORKER_FILENAME = 'file-viewer-input.dwg';

type CadFitMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

type CadRendererViewAdapter = {
  fitScale?: number;
  getBounds?: () => CadBounds;
  panByScreenDelta?: (dx: number, dy: number) => void;
  setViewState?: (view: ViewState) => void;
  zoom?: (factor: number, anchor?: CadPoint2D) => void;
};

type CadPinchSnapshot = {
  center: CadPoint2D;
  distance: number;
};

type CadPinchZoomInput = {
  center: CadPoint2D;
  deltaX: number;
  deltaY: number;
  factor: number;
};

const getCadPinchSnapshot = (points: Map<number, CadPoint2D>): CadPinchSnapshot | null => {
  const [first, second] = Array.from(points.values());
  if (!first || !second) {
    return null;
  }
  return {
    center: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    },
    distance: Math.hypot(second.x - first.x, second.y - first.y),
  };
};

/**
 * The bundled CAD engines currently treat every touch pointer as the same
 * drag. Coordinate two touch pointers before their target listeners run so a
 * pinch becomes one anchored zoom operation instead of two competing pans.
 */
const registerCadPinchZoom = (
  surface: HTMLElement,
  onStart: () => void,
  onZoom: (input: CadPinchZoomInput) => void
) => {
  const points = new Map<number, CadPoint2D>();
  let previous: CadPinchSnapshot | null = null;
  let suppressDragUntilRelease = false;

  const suppressPointerEvent = (event: PointerEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic browser harness events may not create an active pointer.
    }
    if (points.size < 2) {
      return;
    }

    suppressDragUntilRelease = true;
    previous = getCadPinchSnapshot(points);
    onStart();
    suppressPointerEvent(event);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !points.has(event.pointerId)) {
      return;
    }
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!suppressDragUntilRelease) {
      return;
    }

    if (points.size >= 2) {
      const current = getCadPinchSnapshot(points);
      if (previous && current && previous.distance > 0 && current.distance > 0) {
        onZoom({
          center: current.center,
          deltaX: current.center.x - previous.center.x,
          deltaY: current.center.y - previous.center.y,
          factor: Math.min(2, Math.max(0.5, current.distance / previous.distance)),
        });
      }
      previous = current;
    }
    suppressPointerEvent(event);
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !points.has(event.pointerId)) {
      return;
    }
    points.delete(event.pointerId);
    previous = points.size >= 2 ? getCadPinchSnapshot(points) : null;
    if (points.size === 0) {
      suppressDragUntilRelease = false;
    }
    try {
      if (surface.hasPointerCapture(event.pointerId)) {
        surface.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The underlying engine may already have released this pointer.
    }
    // Do not stop pointerup/cancel: the engine must clear the single-pointer
    // drag that began before the second finger started the pinch.
  };

  surface.addEventListener('pointerdown', handlePointerDown, { capture: true });
  surface.addEventListener('pointermove', handlePointerMove, { capture: true });
  surface.addEventListener('pointerup', handlePointerEnd, { capture: true });
  surface.addEventListener('pointercancel', handlePointerEnd, { capture: true });

  return () => {
    surface.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    surface.removeEventListener('pointermove', handlePointerMove, { capture: true });
    surface.removeEventListener('pointerup', handlePointerEnd, { capture: true });
    surface.removeEventListener('pointercancel', handlePointerEnd, { capture: true });
    points.clear();
  };
};

const createEmptyCadBounds = (): CadBounds => ({
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
});

const isCadBoundsValid = (bounds: CadBounds | null | undefined): bounds is CadBounds => {
  return !!bounds &&
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY) &&
    bounds.maxX >= bounds.minX &&
    bounds.maxY >= bounds.minY;
};

const getCadBoundsWidth = (bounds: CadBounds) => bounds.maxX - bounds.minX;
const getCadBoundsHeight = (bounds: CadBounds) => bounds.maxY - bounds.minY;

const isCadBoundsMeaningful = (bounds: CadBounds) => {
  return getCadBoundsWidth(bounds) > CAD_BOUNDS_EPSILON ||
    getCadBoundsHeight(bounds) > CAD_BOUNDS_EPSILON;
};

const isCadPoint = (value: unknown): value is CadPoint2D => {
  return !!value &&
    typeof value === 'object' &&
    Number.isFinite((value as CadPoint2D).x) &&
    Number.isFinite((value as CadPoint2D).y);
};

const addCadPointToBounds = (bounds: CadBounds, point: unknown) => {
  if (!isCadPoint(point)) {
    return;
  }
  bounds.minX = Math.min(bounds.minX, point.x);
  bounds.minY = Math.min(bounds.minY, point.y);
  bounds.maxX = Math.max(bounds.maxX, point.x);
  bounds.maxY = Math.max(bounds.maxY, point.y);
};

const addCadBounds = (target: CadBounds, source: CadBounds) => {
  if (!isCadBoundsValid(source)) {
    return;
  }
  addCadPointToBounds(target, { x: source.minX, y: source.minY });
  addCadPointToBounds(target, { x: source.maxX, y: source.maxY });
};

const unionCadBounds = (boundsList: CadBounds[]) => {
  const union = createEmptyCadBounds();
  boundsList.forEach(bounds => addCadBounds(union, bounds));
  return isCadBoundsValid(union) ? union : null;
};

const getCadBoundsArea = (bounds: CadBounds) => {
  return Math.max(getCadBoundsWidth(bounds), CAD_BOUNDS_EPSILON) *
    Math.max(getCadBoundsHeight(bounds), CAD_BOUNDS_EPSILON);
};

const addCadCircleBounds = (bounds: CadBounds, center: unknown, radius: unknown) => {
  const value = Number(radius);
  if (!isCadPoint(center) || !Number.isFinite(value)) {
    return;
  }
  const nextRadius = Math.abs(value);
  addCadPointToBounds(bounds, { x: center.x - nextRadius, y: center.y - nextRadius });
  addCadPointToBounds(bounds, { x: center.x + nextRadius, y: center.y + nextRadius });
};

const addCadPointListToBounds = (bounds: CadBounds, points: unknown) => {
  if (!Array.isArray(points)) {
    return;
  }
  points.forEach(point => addCadPointToBounds(bounds, point));
};

const addCadPathCommandsToBounds = (bounds: CadBounds, commands: unknown) => {
  if (!Array.isArray(commands)) {
    return;
  }
  commands.forEach(command => {
    const points = (command as { points?: unknown }).points;
    addCadPointListToBounds(bounds, points);
  });
};

const addCadTextBounds = (bounds: CadBounds, entity: CadEntity) => {
  const anchor = entity.insertionPoint || entity.startPoint || entity.center;
  if (!isCadPoint(anchor)) {
    return;
  }
  const text = String(entity.text ?? entity.value ?? '');
  const height = Math.abs(Number(entity.textHeight ?? entity.height ?? 1));
  const lines = text.split(/\r?\n/g);
  const width = Math.max(1, ...lines.map(line => line.length)) * Math.max(height, 1) * 0.62;
  const blockHeight = Math.max(1, lines.length) * Math.max(height, 1) * 1.22;
  addCadPointToBounds(bounds, anchor);
  addCadPointToBounds(bounds, { x: anchor.x + width, y: anchor.y - blockHeight });
};

const getCadEntityAnchor = (entity: CadEntity) => {
  for (const key of ['startPoint', 'insertionPoint', 'center', 'point', 'location'] as const) {
    const point = entity[key];
    if (isCadPoint(point)) {
      return point;
    }
  }
  const vertices = entity.vertices || entity.points;
  if (Array.isArray(vertices) && isCadPoint(vertices[0])) {
    return vertices[0];
  }
  const command = entity.commands?.find(item => item.points.length > 0);
  return command?.points[0];
};

const getCadEntityLocalBounds = (entity: CadEntity): CadBounds | null => {
  const bounds = createEmptyCadBounds();
  const type = String(entity.type ?? '').toUpperCase();
  const kind = entity.kind || inferEntityKind(type);
  if (kind === 'viewport') {
    return null;
  }
  if (kind === 'line') {
    addCadPointToBounds(bounds, entity.startPoint);
    addCadPointToBounds(bounds, entity.endPoint);
  } else if (kind === 'circle' || kind === 'arc') {
    addCadCircleBounds(bounds, entity.center, entity.radius);
  } else if (kind === 'polyline' || kind === 'solid' || kind === 'spline') {
    addCadPointListToBounds(bounds, entity.vertices);
    addCadPointListToBounds(bounds, entity.points);
    addCadPointListToBounds(bounds, entity.controlPoints);
    addCadPointListToBounds(bounds, entity.fitPoints);
  } else if (kind === 'ellipse') {
    const center = entity.center;
    const major = entity.majorAxisEndPoint;
    if (isCadPoint(center) && isCadPoint(major)) {
      const majorRadius = Math.hypot(major.x, major.y);
      const minorRadius = majorRadius * Math.abs(Number(entity.axisRatio ?? 1));
      addCadCircleBounds(bounds, center, Math.max(majorRadius, minorRadius));
    }
  } else if (kind === 'text') {
    addCadTextBounds(bounds, entity);
  } else if (kind === 'path') {
    addCadPathCommandsToBounds(bounds, entity.commands);
  } else if (kind === 'hatch') {
    entity.loops?.forEach(loop => {
      addCadPointListToBounds(bounds, loop.vertices);
      addCadPathCommandsToBounds(bounds, loop.commands);
    });
  } else if (kind === 'image') {
    const point = entity.insertionPoint;
    const width = Number(entity.width ?? 32);
    const height = Number(entity.height ?? 32);
    if (isCadPoint(point) && Number.isFinite(width) && Number.isFinite(height)) {
      addCadPointToBounds(bounds, point);
      addCadPointToBounds(bounds, { x: point.x + width, y: point.y - height });
    }
  } else {
    addCadPointToBounds(bounds, getCadEntityAnchor(entity));
  }
  return isCadBoundsValid(bounds) ? bounds : null;
};

const identityCadMatrix = (): CadFitMatrix => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
const translateCadMatrix = (x: number, y: number): CadFitMatrix => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });
const scaleCadMatrix = (x: number, y: number): CadFitMatrix => ({ a: x, b: 0, c: 0, d: y, e: 0, f: 0 });
const rotateCadMatrix = (rotation: number): CadFitMatrix => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
};

const multiplyCadMatrix = (left: CadFitMatrix, right: CadFitMatrix): CadFitMatrix => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f,
});

const transformCadPoint = (point: CadPoint2D, matrix: CadFitMatrix): CadPoint2D => ({
  x: point.x * matrix.a + point.y * matrix.c + matrix.e,
  y: point.x * matrix.b + point.y * matrix.d + matrix.f,
});

const transformCadBounds = (bounds: CadBounds, matrix: CadFitMatrix) => {
  const next = createEmptyCadBounds();
  [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
  ].forEach(point => addCadPointToBounds(next, transformCadPoint(point, matrix)));
  return isCadBoundsValid(next) ? next : null;
};

const createCadInsertMatrix = (entity: CadEntity, blockBasePoint: CadPoint2D = { x: 0, y: 0 }) => {
  const insertion = entity.insertionPoint || { x: 0, y: 0 };
  const scale = entity.scale;
  const scaleX = Number(typeof scale === 'object' && scale ? scale.x ?? 1 : entity.scaleX ?? 1);
  const scaleY = Number(typeof scale === 'object' && scale ? scale.y ?? scaleX : entity.scaleY ?? scaleX);
  const rotation = Number(entity.rotation ?? 0);
  let matrix = translateCadMatrix(isCadPoint(insertion) ? insertion.x : 0, isCadPoint(insertion) ? insertion.y : 0);
  matrix = multiplyCadMatrix(matrix, rotateCadMatrix(Number.isFinite(rotation) ? rotation : 0));
  matrix = multiplyCadMatrix(matrix, scaleCadMatrix(Number.isFinite(scaleX) ? scaleX : 1, Number.isFinite(scaleY) ? scaleY : 1));
  matrix = multiplyCadMatrix(matrix, translateCadMatrix(-blockBasePoint.x, -blockBasePoint.y));
  return matrix;
};

const findCadLayer = (document: CadDocument, name: unknown): CadLayer | undefined => {
  if (typeof name !== 'string' && typeof name !== 'number') {
    return undefined;
  }
  const key = String(name);
  return document.layers[key] ||
    document.layers[key.toLocaleLowerCase()] ||
    Object.values(document.layers).find(layer => normalizeLayerKey(layer.name) === normalizeLayerKey(key));
};

const findCadBlock = (document: CadDocument, name: unknown): CadBlock | undefined => {
  if (typeof name !== 'string' && typeof name !== 'number') {
    return undefined;
  }
  const key = String(name);
  return document.blocks[key] ||
    document.blocks[key.toLocaleLowerCase()] ||
    Object.values(document.blocks).find(block => normalizeLayerKey(block.name) === normalizeLayerKey(key));
};

const isCadEntityVisible = (document: CadDocument, entity: CadEntity) => {
  if (entity.isVisible === false) {
    return false;
  }
  const layer = findCadLayer(document, entity.layer);
  return layer ? layer.isVisible !== false && !layer.isFrozen : true;
};

const collectCadVisibleEntityBounds = (
  document: CadDocument,
  maxInsertDepth: number
): CadBounds[] => {
  const boundsList: CadBounds[] = [];
  const visit = (entity: CadEntity, depth: number, matrix: CadFitMatrix) => {
    if (!isCadEntityVisible(document, entity)) {
      return;
    }
    const type = String(entity.type ?? '').toUpperCase();
    const kind = entity.kind || inferEntityKind(type);
    if (kind === 'insert') {
      const block = findCadBlock(document, entity.blockName ?? entity.name);
      if (block && depth < maxInsertDepth) {
        const nextMatrix = multiplyCadMatrix(
          matrix,
          createCadInsertMatrix(entity, block.basePoint || { x: 0, y: 0 })
        );
        block.entities.forEach(child => visit(child, depth + 1, nextMatrix));
        return;
      }
    }

    const localBounds = getCadEntityLocalBounds(entity);
    if (!localBounds) {
      return;
    }
    const nextBounds = transformCadBounds(localBounds, matrix);
    if (nextBounds) {
      boundsList.push(nextBounds);
    }
  };

  document.entities.forEach(entity => visit(entity, 0, identityCadMatrix()));
  return boundsList;
};

const inflateCadDegenerateBounds = (bounds: CadBounds) => {
  const width = getCadBoundsWidth(bounds);
  const height = getCadBoundsHeight(bounds);
  if (width > CAD_BOUNDS_EPSILON && height > CAD_BOUNDS_EPSILON) {
    return bounds;
  }
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const pad = Math.max(width, height, 1) * 0.5;
  return {
    minX: centerX - (width > CAD_BOUNDS_EPSILON ? width / 2 : pad),
    maxX: centerX + (width > CAD_BOUNDS_EPSILON ? width / 2 : pad),
    minY: centerY - (height > CAD_BOUNDS_EPSILON ? height / 2 : pad),
    maxY: centerY + (height > CAD_BOUNDS_EPSILON ? height / 2 : pad),
  };
};

const selectCadBestFitBounds = (boundsList: CadBounds[]) => {
  let candidates = boundsList.filter(isCadBoundsValid);
  const meaningful = candidates.filter(isCadBoundsMeaningful);
  if (meaningful.length > 0) {
    candidates = meaningful;
  }
  const globalBounds = unionCadBounds(candidates);
  if (!globalBounds || candidates.length < 8) {
    return globalBounds ? inflateCadDegenerateBounds(globalBounds) : null;
  }

  const centers = candidates.map(bounds => ({
    bounds,
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }));
  const trim = Math.max(1, Math.floor(centers.length * 0.05));
  const sortedX = [...centers].sort((left, right) => left.x - right.x);
  const sortedY = [...centers].sort((left, right) => left.y - right.y);
  const minX = sortedX[Math.min(trim, sortedX.length - 1)].x;
  const maxX = sortedX[Math.max(sortedX.length - 1 - trim, 0)].x;
  const minY = sortedY[Math.min(trim, sortedY.length - 1)].y;
  const maxY = sortedY[Math.max(sortedY.length - 1 - trim, 0)].y;
  const trimmed = centers
    .filter(item => item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY)
    .map(item => item.bounds);
  const minKeep = Math.max(4, Math.floor(candidates.length * 0.55));
  const trimmedBounds = trimmed.length >= minKeep ? unionCadBounds(trimmed) : null;
  if (!trimmedBounds) {
    return inflateCadDegenerateBounds(globalBounds);
  }

  const globalSpan = Math.max(getCadBoundsWidth(globalBounds), getCadBoundsHeight(globalBounds), CAD_BOUNDS_EPSILON);
  const trimmedSpan = Math.max(getCadBoundsWidth(trimmedBounds), getCadBoundsHeight(trimmedBounds), CAD_BOUNDS_EPSILON);
  const areaRatio = getCadBoundsArea(globalBounds) / getCadBoundsArea(trimmedBounds);
  if (globalSpan / trimmedSpan >= CAD_BEST_FIT_OUTLIER_RATIO || areaRatio >= CAD_BEST_FIT_OUTLIER_RATIO ** 2) {
    return inflateCadDegenerateBounds(trimmedBounds);
  }
  return inflateCadDegenerateBounds(globalBounds);
};

const resolveCadFitPadding = (options: FileViewerCadOptions) => {
  const padding = Number(options.fitPadding);
  if (!Number.isFinite(padding) || padding <= 0) {
    return CAD_DEFAULT_FIT_PADDING;
  }
  return Math.min(1, Math.max(0.2, padding));
};

const resolveCadFitBounds = (
  document: CadDocument | undefined,
  rendererBounds: CadBounds | undefined,
  options: FileViewerCadOptions
) => {
  if (!document || options.fitMode === 'native') {
    return rendererBounds && isCadBoundsValid(rendererBounds)
      ? inflateCadDegenerateBounds(rendererBounds)
      : null;
  }
  const configuredDepth = Number(options.maxInsertDepth ?? 16);
  const maxInsertDepth = Number.isFinite(configuredDepth) ? Math.max(0, configuredDepth) : 16;
  const entityBounds = collectCadVisibleEntityBounds(document, maxInsertDepth);
  return selectCadBestFitBounds(entityBounds) ||
    (rendererBounds && isCadBoundsValid(rendererBounds) ? inflateCadDegenerateBounds(rendererBounds) : null);
};

const resolveLayerSourceNames = (document: CadDocument, layer: CadLayerItem) => {
  const normalized = normalizeLayerKey(layer.name);
  const names = new Set(layer.sourceNames);
  Object.entries(document.layers).forEach(([key, source]) => {
    if (normalizeLayerKey(key) === normalized || normalizeLayerKey(source.name) === normalized) {
      names.add(key);
      names.add(source.name);
    }
  });
  return Array.from(names);
};

export default async function renderCad(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'dxf',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const normalizedType = normalizeType(type);
  const options: FileViewerCadOptions = context?.options?.cad || {};
  const t = createFileViewerTranslator(context?.options);
  const locale = resolveFileViewerLocale(context?.options);
  const monochromeColor = resolveFileViewerCadMonochromeColor(options.monochromeColor);
  let colorMode = normalizeFileViewerCadColorMode(options.colorMode);
  let status: CadStatus = 'loading';
  let progressMessage = t('cad.state.loadingViewer');
  let errorMessage = '';
  let loadResult: CadViewerLoadResult | null = null;
  let renderStats: RenderStats | null = null;
  let viewState: ViewChangeEvent | null = null;
  let layers: CadLayerItem[] = [];
  let viewer: CadViewerInstance | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let abortController: AbortController | null = null;
  let disposeCadPinch: (() => void) | null = null;
  let disposeNativeInteractions: (() => void) | null = null;
  let fitViewActive = true;
  let nativeZoomRatio = 1;
  let disposed = false;

  const style = createStyle();
  const shell = createElement('div', 'cad-shell');
  shell.dataset.viewerZoomProvider = 'cad';

  const toolbar = createElement('div', 'cad-toolbar');
  const tools = createElement('div', 'cad-tools');
  const fitButton = createElement('button', undefined, t('cad.toolbar.fit')) as HTMLButtonElement;
  const zoomOutButton = createElement('button', undefined, '-') as HTMLButtonElement;
  const zoomText = createElement('span', 'cad-zoom', '100%');
  const zoomInButton = createElement('button', undefined, '+') as HTMLButtonElement;
  const colorModeButton = createElement('button', 'cad-color-mode') as HTMLButtonElement;
  colorModeButton.hidden = options.showColorModeToggle === false;
  const meta = createElement('div', 'cad-meta');
  const typeMeta = createElement('span', undefined, normalizedType.toUpperCase());
  const backendMeta = createElement('span', undefined, 'AUTO');
  [fitButton, zoomOutButton, zoomInButton, colorModeButton].forEach(button => {
    button.type = 'button';
  });
  fitButton.title = t('cad.toolbar.fit');
  zoomOutButton.title = t('cad.toolbar.zoomOut');
  zoomInButton.title = t('cad.toolbar.zoomIn');
  tools.append(fitButton, zoomOutButton, zoomText, zoomInButton, colorModeButton);
  meta.append(typeMeta, backendMeta);
  toolbar.append(tools, meta);

  const body = createElement('div', 'cad-body without-layers');
  const layersPanel = createElement('aside', 'cad-layers');
  layersPanel.hidden = true;
  const layersHead = createElement('div', 'cad-layers-head');
  const layersCount = createElement('span', undefined, t('cad.layers.count', { count: 0 }));
  layersHead.append(createElement('strong', undefined, t('cad.layers.title')), layersCount);
  const layersList = createElement('div', 'cad-layers-list');
  layersPanel.append(layersHead, layersList);

  const canvasWrap = createElement('div', 'cad-canvas-wrap');
  const stage = createElement('div', 'cad-stage');
  const nativeHost = createElement('div', 'cad-native-stage');
  stage.append(nativeHost);
  const state = createElement('div', 'cad-state', progressMessage);
  canvasWrap.append(stage, state);

  const inspector = createElement('aside', 'cad-inspector');
  const inspectorTitle = createElement('strong', undefined, t('cad.inspector.title'));
  const inspectorList = createElement('dl');
  const warningText = createElement('p', 'cad-warning');
  warningText.hidden = true;
  inspector.append(inspectorTitle, inspectorList, warningText);

  body.append(layersPanel, canvasWrap, inspector);
  shell.append(toolbar, body);
  target.replaceChildren(style, shell);

  const buildFileName = () => {
    return context?.filename || `drawing.${normalizedType}`;
  };

  const buildWorkerFileName = () => {
    return normalizedType === 'dwg' ? CAD_DWG_WORKER_FILENAME : buildFileName();
  };

  const restoreLoadResultSourceName = (result: CadViewerLoadResult) => {
    result.document.sourceName = buildFileName();
    return result;
  };

  const getWarnings = () => loadResult?.warnings || loadResult?.document.warnings || [];

  const getZoomPercent = () => {
    if (viewer?.isNativeRendererActive?.()) {
      return Math.round(nativeZoomRatio * 100);
    }
    const zoom = viewState?.zoomPercent ?? viewer?.getZoomPercent?.() ?? 100;
    return Number.isFinite(zoom) ? Math.round(zoom) : 100;
  };

  const getCadZoomState = (): FileViewerZoomState => {
    const ready = status === 'ready' && !!viewer;
    const zoomPercent = getZoomPercent();
    return {
      scale: zoomPercent / 100,
      label: `${zoomPercent}%`,
      canZoomIn: ready,
      canZoomOut: ready,
      canReset: ready,
      minScale: 0.05,
      maxScale: 16,
    };
  };

  const cadZoomEmitter = createFileViewerZoomChangeEmitter();
  const cadViewStateEmitter = createFileViewerViewStateChangeEmitter();

  const getCadViewState = (): FileViewerViewState => ({
    renderer: 'cad',
    scale: getCadZoomState().scale,
    zoom: getCadZoomState(),
    extra: {
      status,
      view: viewState ? { ...viewState } : null,
      backend: renderStats?.backend,
      colorMode,
      monochromeColor: colorMode === 'monochrome' ? monochromeColor : undefined,
      layerCount: layers.length,
      visibleLayers: layers
        .filter(layer => layer.isVisible !== false && !layer.isFrozen)
        .map(layer => layer.name),
    },
  });

  const emitCadViewStateChange = (
    action: FileViewerViewStateChangeAction,
    source: FileViewerViewStateChangeSource = 'viewer'
  ) => {
    const state = getCadViewState();
    if (!disposed) {
      cadViewStateEmitter.emit(createFileViewerViewStateChange(state, { action, source }));
    }
    return state;
  };

  const clampNativeZoomRatio = (ratio: number) => {
    return Math.min(CAD_NATIVE_MAX_ZOOM_RATIO, Math.max(CAD_NATIVE_MIN_ZOOM_RATIO, ratio));
  };

  const notifyNativeZoomChange = (action: FileViewerViewStateChangeAction) => {
    cadZoomEmitter.emit();
    syncState();
    emitCadViewStateChange(action, 'user');
  };

  const bindNativeCadInteractions = () => {
    disposeNativeInteractions?.();
    disposeNativeInteractions = null;
    const surface = nativeHost.querySelector<HTMLCanvasElement>('.dwfv-overlay-canvas');
    if (!surface) {
      return;
    }

    let notificationQueued = false;
    const queueNativeZoomChange = (action: FileViewerViewStateChangeAction) => {
      if (notificationQueued) {
        return;
      }
      notificationQueued = true;
      queueMicrotask(() => {
        notificationQueued = false;
        if (!disposed && viewer?.isNativeRendererActive?.()) {
          notifyNativeZoomChange(action);
        }
      });
    };
    const applyNativeZoomFactor = (factor: number, action: FileViewerViewStateChangeAction) => {
      if (!Number.isFinite(factor) || factor <= 0) {
        return;
      }
      nativeZoomRatio = clampNativeZoomRatio(nativeZoomRatio * factor);
      queueNativeZoomChange(action);
    };

    const handleNativeClick = (event: Event) => {
      const eventTarget = event.target;
      const button = eventTarget instanceof Element ? eventTarget.closest('button') : null;
      if (!button || !nativeHost.contains(button)) {
        return;
      }
      const label = (button.textContent || '').trim();
      if (label === '+') {
        applyNativeZoomFactor(1.25, 'zoom-in');
      } else if (label === '-' || label === '−') {
        applyNativeZoomFactor(0.8, 'zoom-out');
      } else if (/适应|fit|reset/i.test(label)) {
        nativeZoomRatio = 1;
        queueNativeZoomChange('zoom-reset');
      }
    };
    const handleNativeWheel = (event: WheelEvent) => {
      const rect = surface.getBoundingClientRect();
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * Math.max(1, rect.height)
          : event.deltaY;
      applyNativeZoomFactor(Math.exp(-delta * 0.0015), 'cad-view-change');
    };
    const handleNativePageChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement && nativeHost.contains(event.target)) {
        nativeZoomRatio = 1;
        queueNativeZoomChange('zoom-reset');
      }
    };
    const disposePinch = registerCadPinchZoom(surface, () => {
      fitViewActive = false;
    }, ({ center, factor }) => {
      const deltaY = -Math.log(factor) / 0.0015;
      surface.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: center.x,
        clientY: center.y,
        deltaMode: WheelEvent.DOM_DELTA_PIXEL,
        deltaY,
      }));
    });

    nativeHost.addEventListener('click', handleNativeClick);
    nativeHost.addEventListener('change', handleNativePageChange);
    surface.addEventListener('wheel', handleNativeWheel);
    disposeNativeInteractions = () => {
      disposePinch();
      nativeHost.removeEventListener('click', handleNativeClick);
      nativeHost.removeEventListener('change', handleNativePageChange);
      surface.removeEventListener('wheel', handleNativeWheel);
    };
  };

  const syncInspector = () => {
    const summary = loadResult?.summary;
    const rows: Array<[string, string]> = [
      [t('cad.inspector.entities'), formatNumber(summary?.entityCount, locale)],
      [t('cad.inspector.blocks'), formatNumber(summary?.blockCount, locale)],
      [t('cad.inspector.pages'), formatNumber(summary?.pageCount, locale)],
      [t('cad.inspector.drawn'), formatNumber(renderStats?.drawn, locale)],
    ];
    inspectorList.replaceChildren(...rows.map(([label, value]) => {
      const row = createElement('div');
      row.append(createElement('dt', undefined, label), createElement('dd', undefined, value));
      return row;
    }));

    const warning = getWarnings()[0];
    warningText.textContent = warning || '';
    warningText.hidden = !warning;
  };

  const syncLayers = () => {
    layersCount.textContent = t('cad.layers.count', { count: layers.length });
    layersPanel.hidden = layers.length === 0;
    body.classList.toggle('without-layers', layers.length === 0);
    layersList.replaceChildren(...layers.map(layer => {
      const button = createElement('button') as HTMLButtonElement;
      button.type = 'button';
      const layerVisible = layer.isVisible !== false && !layer.isFrozen;
      button.classList.toggle('muted', !layerVisible);
      button.title = layer.duplicateCount > 1
        ? t('cad.layers.merged', { name: layer.name, count: layer.duplicateCount })
        : layer.name;
      button.setAttribute('aria-pressed', String(layerVisible));
      const color = createElement('span', 'cad-layer-color');
      if (colorMode === 'monochrome') {
        color.style.background = monochromeColor;
      } else if (typeof layer.color === 'string') {
        color.style.background = layer.color;
      }
      button.append(color, createElement('span', undefined, layer.name));
      button.addEventListener('click', () => {
        const document = resolveCadViewerSourceDocument(viewer) as CadDocument | undefined;
        if (!document) {
          return;
        }

        const nextVisible = !layerVisible;
        resolveLayerSourceNames(document, layer).forEach(sourceName => {
          const current = document.layers[sourceName] || findCadLayer(document, sourceName);
          if (current) {
            current.isVisible = nextVisible;
          }
        });
        loadResult = viewer?.setDocument(document, buildFileName()) || null;
        layers = collectLayers(loadResult);
        syncUi();
        queueMicrotask(() => {
          fitViewActive = true;
          applyCadFit();
          cadZoomEmitter.emit();
          emitCadViewStateChange('layer-toggle', 'user');
        });
      });
      return button;
    }));
  };

  const syncState = () => {
    zoomText.textContent = `${getZoomPercent()}%`;
    backendMeta.textContent = (renderStats?.backend || 'auto').toUpperCase();
    const colorModeSupported = supportsCadViewerColorMode(viewer);
    colorModeButton.disabled = status !== 'ready' || !colorModeSupported;
    colorModeButton.setAttribute('aria-pressed', String(colorMode === 'monochrome'));
    colorModeButton.textContent = t(colorMode === 'monochrome'
      ? 'cad.toolbar.monochrome'
      : 'cad.toolbar.colorSource');
    colorModeButton.title = t(colorMode === 'monochrome'
      ? 'cad.toolbar.colorSource'
      : 'cad.toolbar.monochrome');
    state.hidden = status === 'ready';
    state.classList.toggle('error', status === 'error');
    if (status === 'loading') {
      state.textContent = progressMessage;
    } else if (status === 'error') {
      state.textContent = errorMessage;
    }
  };

  const syncUi = () => {
    syncState();
    syncLayers();
    syncInspector();
  };

  const updateProgress = (progress: CadLoadProgress) => {
    const prefix = progress.format ? `${progress.format.toUpperCase()} ` : '';
    const percent = Number.isFinite(progress.percent) ? ` ${Math.round(progress.percent || 0)}%` : '';
    progressMessage = `${prefix}${progress.message}${percent}`;
    syncState();
  };

  const applyCadFit = () => {
    if (!viewer) {
      return false;
    }
    if (viewer.isNativeRendererActive?.()) {
      nativeZoomRatio = 1;
      viewer.fit();
      return true;
    }

    const renderer = viewer.renderer as unknown as CadRendererViewAdapter;
    const rendererBounds = renderer.getBounds?.();
    const fitBounds = resolveCadFitBounds(viewer.getDocument(), rendererBounds, options);
    if (!fitBounds || !renderer.setViewState) {
      viewer.fit();
      return true;
    }

    const width = Math.max(1, stage.clientWidth || viewer.canvas.clientWidth || target.clientWidth);
    const height = Math.max(1, stage.clientHeight || viewer.canvas.clientHeight || target.clientHeight);
    const boundsWidth = Math.max(getCadBoundsWidth(fitBounds), CAD_BOUNDS_EPSILON);
    const boundsHeight = Math.max(getCadBoundsHeight(fitBounds), CAD_BOUNDS_EPSILON);
    const canvasOptions = options.canvasOptions || {};
    const minScale = Number(canvasOptions.minScale ?? CAD_BOUNDS_EPSILON);
    const maxScale = Number(canvasOptions.maxScale ?? 1e9);
    const unclampedScale = Math.min(width / boundsWidth, height / boundsHeight) * resolveCadFitPadding(options);
    const nextScale = Math.min(
      Number.isFinite(maxScale) ? maxScale : 1e9,
      Math.max(Number.isFinite(minScale) ? minScale : CAD_BOUNDS_EPSILON, unclampedScale)
    );
    const nextView = {
      centerX: (fitBounds.minX + fitBounds.maxX) / 2,
      centerY: (fitBounds.minY + fitBounds.maxY) / 2,
      scale: nextScale,
    };
    // Keep cad-viewer's zoom label at 100% for File Viewer's best-fit bounds.
    renderer.fitScale = nextScale;
    renderer.setViewState(nextView);
    return true;
  };

  const fitToView = (
    source: FileViewerViewStateChangeSource = 'user',
    action: FileViewerViewStateChangeAction = 'zoom-reset'
  ) => {
    fitViewActive = true;
    applyCadFit();
    cadZoomEmitter.emit();
    syncState();
    emitCadViewStateChange(action, source);
  };

  const applyCadFitRequest = (request: FileViewerFitRequest): FileViewerFitResult => {
    fitViewActive = true;
    const applied = applyCadFit();
    if (!applied) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'not-ready',
        provider: 'view-state',
      };
    }
    cadZoomEmitter.emit();
    syncState();
    const state = emitCadViewStateChange('fit', request.source);
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: state.scale,
      source: request.source,
      provider: 'view-state',
      state,
    };
  };

  const zoomIn = () => {
    fitViewActive = false;
    viewer?.zoomIn();
    cadZoomEmitter.emit();
    syncState();
    emitCadViewStateChange('zoom-in', 'user');
  };

  const zoomOut = () => {
    fitViewActive = false;
    viewer?.zoomOut();
    cadZoomEmitter.emit();
    syncState();
    emitCadViewStateChange('zoom-out', 'user');
  };

  registerFileViewerZoomProvider(shell, {
    zoomIn: () => {
      zoomIn();
      return getCadZoomState();
    },
    zoomOut: () => {
      zoomOut();
      return getCadZoomState();
    },
    resetZoom: () => {
      fitToView();
      return getCadZoomState();
    },
    fit: applyCadFitRequest,
    getState: getCadZoomState,
    subscribe: cadZoomEmitter.subscribe,
  });
  registerFileViewerViewStateProvider(shell, {
    getState: getCadViewState,
    async applyState(
      _state: FileViewerViewState,
      applyOptions: FileViewerApplyViewStateOptions = {}
    ) {
      const source = applyOptions.source || 'api';
      const action = applyOptions.action || 'restore';
      const notify = applyOptions.notify !== false;
      if (notify) {
        return emitCadViewStateChange(action, source);
      }
      return getCadViewState();
    },
    fit: applyCadFitRequest,
    subscribe: cadViewStateEmitter.subscribe,
  });

  fitButton.addEventListener('click', () => fitToView());
  zoomInButton.addEventListener('click', zoomIn);
  zoomOutButton.addEventListener('click', zoomOut);
  colorModeButton.addEventListener('click', () => {
    const previousMode = colorMode;
    colorMode = colorMode === 'monochrome' ? 'source' : 'monochrome';
    if (!applyCadViewerColorMode(viewer, colorMode, monochromeColor)) {
      colorMode = previousMode;
      syncState();
      return;
    }
    syncUi();
    emitCadViewStateChange('cad-view-change', 'user');
  });

  const createViewer = () => {
    const { wasmPath, workerUrl, dwfWasmUrl } = resolveFileViewerCadAssetUrls(
      options,
      getCadDocumentBaseUrl(target)
    );
    const canvasOptions = {
      background: '#f8fafc',
      foreground: '#0f172a',
      contrastMode: 'adaptive',
      minColorContrast: 2.4,
      showPageBounds: true,
      showUnsupportedMarkers: true,
      enableSpatialIndex: true,
      maxVisibleTextLabels: 2400,
      ...(options.canvasOptions || {}),
    } as CanvasViewerOptions;

    const nextViewer = new CadViewer({
      container: stage,
      nativeHost,
      renderer: options.renderer || 'auto',
      wasmPath,
      workerUrl,
      dwfWasmUrl,
      dxfEncoding: options.dxfEncoding,
      useWorker: options.useWorker ?? true,
      workerTimeoutMs: options.workerTimeoutMs ?? CAD_WORKER_TIMEOUT,
      preferDwgWasm: options.preferDwgWasm ?? true,
      includePaperSpace: options.includePaperSpace ?? true,
      maxInsertDepth: options.maxInsertDepth,
      keepRaw: options.keepRaw ?? false,
      dwfPreferWebgl: options.dwfPreferWebgl ?? true,
      dwfPreferWasm: options.dwfPreferWasm ?? true,
      dwfBackground: options.dwfBackground || '#f8fafc',
      dwfMaxDevicePixelRatio: options.dwfMaxDevicePixelRatio,
      dwfMaxCanvasPixels: options.dwfMaxCanvasPixels,
      dwfMaxGpuCacheBytes: options.dwfMaxGpuCacheBytes,
      dwfMaxCachedScenes: options.dwfMaxCachedScenes,
      dwfLineWeightMode: options.dwfLineWeightMode,
      dwfMinStrokeCssPx: options.dwfMinStrokeCssPx,
      dwfMaxOverviewStrokeCssPx: options.dwfMaxOverviewStrokeCssPx,
      dwfMinTextCssPx: options.dwfMinTextCssPx,
      dwfMinFilledAreaCssPx: options.dwfMinFilledAreaCssPx,
      ...({ colorMode, monochromeColor } as Record<string, unknown>),
      autoFit: true,
      canvasOptions,
      onLoadProgress: updateProgress,
      onRenderStats: stats => {
        renderStats = stats;
        syncState();
        syncInspector();
      },
      onViewChange: event => {
        viewState = event;
        cadZoomEmitter.emit();
        emitCadViewStateChange('cad-view-change', 'user');
        syncState();
      },
      onLoad: result => {
        loadResult = restoreLoadResultSourceName(result);
        layers = collectLayers(result);
        syncUi();
      },
      onError: error => {
        errorMessage = error.message || t('cad.error.parseFailed');
        syncState();
      },
    });

    disposeCadPinch?.();
    const renderer = nextViewer.renderer as unknown as CadRendererViewAdapter;
    disposeCadPinch = registerCadPinchZoom(nextViewer.canvas, () => {
      fitViewActive = false;
    }, ({ center, deltaX, deltaY, factor }) => {
      const rect = nextViewer.canvas.getBoundingClientRect();
      renderer.panByScreenDelta?.(deltaX, deltaY);
      renderer.zoom?.(factor, {
        x: center.x - rect.left,
        y: center.y - rect.top,
      });
    });

    if (options.preloadDwg !== false && normalizedType === 'dwg') {
      void nextViewer.preloadDwg({ wasmPath, workerUrl }).catch(() => {
        // 预热失败不阻断真实加载，loadBuffer 会返回完整错误上下文。
      });
    }

    return nextViewer;
  };

  const loadCad = async () => {
    status = 'loading';
    progressMessage = t('cad.state.parsing');
    errorMessage = '';
    loadResult = null;
    renderStats = null;
    viewState = null;
    layers = [];
    fitViewActive = true;
    nativeZoomRatio = 1;
    disposeNativeInteractions?.();
    disposeNativeInteractions = null;
    syncUi();

    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    try {
      viewer?.destroy();
      viewer = createViewer();
      const cadAssets = resolveFileViewerCadAssetUrls(options, getCadDocumentBaseUrl(target));
      const result = await viewer.loadBuffer(buffer.slice(0), buildWorkerFileName(), {
        signal: controller.signal,
        transferInputBuffer: false,
        dxfEncoding: options.dxfEncoding,
        wasmPath: cadAssets.wasmPath,
        workerUrl: cadAssets.workerUrl,
        dwfWasmUrl: cadAssets.dwfWasmUrl,
      });
      if (disposed || controller.signal.aborted) {
        return;
      }
      loadResult = restoreLoadResultSourceName(result);
      layers = collectLayers(result);
      status = 'ready';
      if (viewer.isNativeRendererActive?.()) {
        bindNativeCadInteractions();
      }
      syncUi();
      queueMicrotask(() => {
        applyCadFit();
        cadZoomEmitter.emit();
        emitCadViewStateChange('init', 'viewer');
        syncState();
      });
    } catch (reason) {
      if (disposed || controller.signal.aborted) {
        return;
      }
      console.error(reason);
      status = 'error';
      errorMessage = reason instanceof Error ? reason.message : t('cad.error.parseFailed');
      syncUi();
    }
  };

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      viewer?.resize();
      if (fitViewActive) {
        requestAnimationFrame(() => {
          if (!disposed && fitViewActive) {
            applyCadFit();
            cadZoomEmitter.emit();
            syncState();
          }
        });
      }
    });
    resizeObserver.observe(stage);
  }

  syncUi();
  void loadCad();

  return {
    $el: shell,
    unmount() {
      disposed = true;
      unregisterFileViewerViewStateProvider(shell);
      unregisterFileViewerZoomProvider(shell);
      abortController?.abort();
      abortController = null;
      disposeCadPinch?.();
      disposeCadPinch = null;
      disposeNativeInteractions?.();
      disposeNativeInteractions = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      viewer?.destroy();
      viewer = null;
      target.replaceChildren();
    },
  };
}
