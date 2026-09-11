import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import {
  createFileViewerTranslator,
  createFileViewerZoomChangeEmitter,
  registerFileViewerZoomProvider,
  resolveFileViewerRuntimeAssetBaseUrl,
  unregisterFileViewerZoomProvider,
  type FileRenderContext,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerZoomState,
} from '@file-viewer/core';
import {
  DEFAULT_FILE_VIEWER_IFC_FRAGMENTS_WORKER_PATH,
  DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES,
  DEFAULT_FILE_VIEWER_IFC_WASM_PATH,
  type FileViewerIfcConfigureContext,
  type FileViewerIfcElementInfo,
  type FileViewerIfcOptions,
  type FileViewerIfcProperty,
  type FileViewerIfcPropertySet,
  type FileViewerIfcThatOpenRuntimeContext,
} from '@file-viewer/renderer-3d';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const ZOOM_STEP = 1.2;
const DEFAULT_MAX_PROPERTIES = 250;

const styleText = `
.ifc-thatopen-viewer{display:flex;height:100%;min-height:100%;flex-direction:column;background:#f8fafc;color:#162333}
.ifc-thatopen-viewer *{box-sizing:border-box}.ifc-thatopen-toolbar{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:12px;padding:0 12px;border-bottom:1px solid rgba(15,23,42,.08);background:#fff}.ifc-thatopen-actions{display:flex;gap:6px}.ifc-thatopen-actions button{min-height:30px;border:0;border-radius:8px;padding:0 10px;background:rgba(15,23,42,.06);color:#475569;cursor:pointer;font-size:12px;font-weight:700}.ifc-thatopen-actions button[disabled]{opacity:.45}.ifc-thatopen-meta{min-width:0;color:#64748b;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ifc-thatopen-stage{position:relative;flex:1;min-height:0;overflow:hidden}.ifc-thatopen-stage canvas{display:block;width:100%;height:100%;outline:none;touch-action:none}.ifc-thatopen-state{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(248,250,252,.9);color:#64748b;text-align:center}.ifc-thatopen-state[hidden]{display:none!important}.ifc-thatopen-panel{position:absolute;z-index:3;top:12px;right:12px;width:min(360px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;border:1px solid rgba(15,23,42,.12);border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 12px 32px rgba(15,23,42,.14)}.ifc-thatopen-panel[hidden]{display:none!important}.ifc-thatopen-panel header{position:sticky;top:0;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.08);background:inherit}.ifc-thatopen-panel header strong{display:block;color:#0f766e;font-size:13px}.ifc-thatopen-panel header span{display:block;margin-top:3px;color:#64748b;font-size:11px}.ifc-thatopen-body{padding:12px 14px 16px}.ifc-thatopen-field,.ifc-thatopen-property{display:grid;grid-template-columns:minmax(82px,.9fr) minmax(100px,1.1fr);gap:8px;padding:4px 0;font-size:11px}.ifc-thatopen-field span:first-child,.ifc-thatopen-property span:first-child{color:#64748b}.ifc-thatopen-field span:last-child,.ifc-thatopen-property span:last-child{overflow-wrap:anywhere;color:#334155}.ifc-thatopen-pset{margin-top:10px;padding-top:8px;border-top:1px solid rgba(15,23,42,.08)}.ifc-thatopen-pset h4{margin:0 0 6px;font-size:12px}.ifc-thatopen-empty{margin:0;color:#64748b;font-size:12px;line-height:1.5}
[data-viewer-theme='dark'] .ifc-thatopen-viewer{background:#101820;color:#e5eef8}[data-viewer-theme='dark'] .ifc-thatopen-toolbar{border-color:rgba(148,163,184,.18);background:#111827}[data-viewer-theme='dark'] .ifc-thatopen-actions button{background:#1f2937;color:#cbd5e1}[data-viewer-theme='dark'] .ifc-thatopen-state{background:rgba(15,23,42,.9);color:#cbd5e1}[data-viewer-theme='dark'] .ifc-thatopen-panel{border-color:rgba(148,163,184,.2);background:rgba(17,24,39,.96)}[data-viewer-theme='dark'] .ifc-thatopen-field span:last-child,[data-viewer-theme='dark'] .ifc-thatopen-property span:last-child,[data-viewer-theme='dark'] .ifc-thatopen-pset h4{color:#e2e8f0}
@media (max-width:720px){.ifc-thatopen-toolbar{min-height:62px;align-items:flex-start;flex-direction:column;padding:8px 10px}.ifc-thatopen-panel{top:auto;bottom:10px;right:10px;left:10px;width:auto;max-height:45%}}
`;

const element = <K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, className?: string, text?: string) => {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const normalizeError = (reason: unknown) => reason instanceof Error ? reason.message : String(reason);

const positiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveAssetUrl = (value: string | URL | undefined, fallback: string, baseUrl: string) => {
  try {
    return new URL(value ? String(value) : fallback, baseUrl).href;
  } catch {
    return value ? String(value) : fallback;
  }
};

const readScalar = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (depth > 4) return '';
  if (Array.isArray(value)) return value.map(item => readScalar(item, depth + 1)).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('value' in record) return readScalar(record.value, depth + 1);
  }
  return '';
};

const readSchema = (buffer: ArrayBuffer) => {
  try {
    const sample = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 256 * 1024)));
    return sample.match(/FILE_SCHEMA\s*\(\s*\(\s*['"]([^'"]+)/i)?.[1];
  } catch {
    return undefined;
  }
};

const buildPropertySets = (item: unknown, maxProperties: number): FileViewerIfcPropertySet[] => {
  if (!item || typeof item !== 'object' || maxProperties <= 0) return [];
  const source = (item as Record<string, unknown>).data;
  const record = source && typeof source === 'object' ? source as Record<string, unknown> : item as Record<string, unknown>;
  const sets = new Map<string, FileViewerIfcProperty[]>();
  let remaining = maxProperties;

  const push = (setName: string, name: string, value: unknown) => {
    if (remaining <= 0) return;
    const text = readScalar(value);
    if (!text) return;
    const list = sets.get(setName) || [];
    list.push({ name, value: text });
    sets.set(setName, list);
    remaining -= 1;
  };

  const visit = (setName: string, prefix: string, value: unknown, depth: number) => {
    if (remaining <= 0 || value === null || value === undefined || depth > 3) return;
    const scalar = readScalar(value);
    if (scalar) {
      push(setName, prefix, value);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, remaining).forEach((entry, index) => visit(setName, `${prefix}[${index}]`, entry, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (remaining <= 0) break;
        visit(setName, prefix ? `${prefix}.${key}` : key, nested, depth + 1);
      }
    }
  };

  for (const [key, value] of Object.entries(record)) {
    if (remaining <= 0) break;
    if (['Name', 'GlobalId', '_category', 'type'].includes(key)) continue;
    const setName = value && typeof value === 'object' && !Array.isArray(value) ? key : 'Attributes';
    visit(setName, setName === 'Attributes' ? key : '', value, 0);
  }

  return [...sets.entries()].map(([name, properties]) => ({ name, properties }));
};

const modelName = (context?: FileRenderContext) => {
  const filename = context?.filename || 'model.ifc';
  return filename.replace(/[^a-z0-9_.-]+/gi, '-').replace(/\.ifc$/i, '') || 'model';
};

export default async function renderThatOpenIfc(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const options = context?.options?.ifc as FileViewerIfcOptions | undefined;
  const performance = options?.performance;
  const threshold = positiveNumber(
    performance?.largeModelThresholdBytes,
    DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES
  );
  const largeModel = buffer.byteLength >= threshold;
  const t = createFileViewerTranslator(context?.options);
  const doc = target.ownerDocument;
  const win = doc.defaultView || window;
  const assetBase = resolveFileViewerRuntimeAssetBaseUrl(doc);
  const wasmDirectory = resolveAssetUrl(undefined, DEFAULT_FILE_VIEWER_IFC_WASM_PATH, assetBase);
  const workerUrl = resolveAssetUrl(
    options?.thatOpen?.workerUrl,
    DEFAULT_FILE_VIEWER_IFC_FRAGMENTS_WORKER_PATH,
    assetBase
  );
  const maxProperties = Number.isFinite(options?.maxProperties)
    ? Math.max(0, Math.floor(Number(options?.maxProperties)))
    : DEFAULT_MAX_PROPERTIES;
  const enableSelection = options?.enableSelection !== false;
  const showProperties = options?.showProperties !== false;
  const schema = readSchema(buffer);

  const root = element(doc, 'div', 'ifc-thatopen-viewer');
  root.dataset.modelFormat = 'ifc';
  root.dataset.modelStatus = 'loading';
  root.dataset.ifcBackend = 'thatopen';
  root.dataset.ifcLargeModel = String(largeModel);
  const style = element(doc, 'style');
  style.textContent = styleText;
  const toolbar = element(doc, 'div', 'ifc-thatopen-toolbar');
  const actions = element(doc, 'div', 'ifc-thatopen-actions');
  const fitButton = element(doc, 'button', undefined, t('model.toolbar.fit'));
  const clearButton = element(doc, 'button', undefined, 'Clear selection');
  fitButton.type = 'button';
  clearButton.type = 'button';
  clearButton.disabled = true;
  clearButton.hidden = !enableSelection;
  actions.append(fitButton, clearButton);
  const meta = element(doc, 'div', 'ifc-thatopen-meta', largeModel ? 'IFC · Fragments · large model · loading…' : 'IFC · Fragments · loading…');
  toolbar.append(actions, meta);
  const stage = element(doc, 'div', 'ifc-thatopen-stage');
  const state = element(doc, 'div', 'ifc-thatopen-state', t('model.state.loading'));
  const panel = element(doc, 'aside', 'ifc-thatopen-panel');
  panel.hidden = !showProperties;
  const panelHeader = element(doc, 'header');
  const panelTitle = element(doc, 'strong', undefined, 'IFC element');
  const panelSubtitle = element(doc, 'span', undefined, 'Select an element in the model');
  panelHeader.append(panelTitle, panelSubtitle);
  const panelBody = element(doc, 'div', 'ifc-thatopen-body');
  panelBody.append(element(doc, 'p', 'ifc-thatopen-empty', 'Click or tap a BIM element to inspect its IFC data.'));
  panel.append(panelHeader, panelBody);
  stage.append(state, panel);
  root.append(style, toolbar, stage);
  target.replaceChildren(root);

  const zoomEmitter = createFileViewerZoomChangeEmitter();
  let disposed = false;
  let resizeObserver: ResizeObserver | null = null;
  let components: any = null;
  let world: any = null;
  let fragments: any = null;
  let loader: any = null;
  let importer: any = null;
  let model: any = null;
  let canvas: HTMLCanvasElement | null = null;
  let selectedLocalId: number | null = null;
  let pointerDown: { x: number; y: number } | null = null;
  let zoomBaselineDistance = 0;
  const fallbackTarget = new THREE.Vector3();

  const getCamera = () => world?.camera?.three as THREE.PerspectiveCamera | undefined;
  const getControls = () => world?.camera?.controls as any;
  const getTarget = () => {
    const controls = getControls();
    const value = fallbackTarget.clone();
    try {
      controls?.getTarget?.(value);
    } catch {
      // camera-controls API is intentionally treated as an optional raw dependency.
    }
    return value;
  };

  const getZoomScale = () => {
    const camera = getCamera();
    if (!camera || zoomBaselineDistance <= 0) return 1;
    const distance = camera.position.distanceTo(getTarget());
    return distance > 0 ? THREE.MathUtils.clamp(zoomBaselineDistance / distance, MIN_ZOOM, MAX_ZOOM) : 1;
  };

  const getZoomState = (): FileViewerZoomState => {
    const scale = getZoomScale();
    const ready = root.dataset.modelStatus === 'ready' && zoomBaselineDistance > 0;
    return {
      scale,
      label: `${Math.round(scale * 100)}%`,
      canZoomIn: ready && scale < MAX_ZOOM - 0.001,
      canZoomOut: ready && scale > MIN_ZOOM + 0.001,
      canReset: ready && Math.abs(scale - 1) > 0.005,
      minScale: MIN_ZOOM,
      maxScale: MAX_ZOOM,
    };
  };

  const setZoom = (requested: number) => {
    const camera = getCamera();
    const controls = getControls();
    if (!camera || !controls || zoomBaselineDistance <= 0) return getZoomState();
    const scale = THREE.MathUtils.clamp(requested, MIN_ZOOM, MAX_ZOOM);
    const targetPoint = getTarget();
    const direction = camera.position.clone().sub(targetPoint);
    if (direction.lengthSq() < 1e-8) direction.set(1, 0.7, 1);
    direction.normalize();
    const next = targetPoint.clone().addScaledVector(direction, zoomBaselineDistance / scale);
    void controls.setLookAt?.(next.x, next.y, next.z, targetPoint.x, targetPoint.y, targetPoint.z, false);
    zoomEmitter.emit();
    return getZoomState();
  };

  const fitToModel = () => {
    const camera = getCamera();
    const controls = getControls();
    if (!model || !camera || !controls) return;
    const box = model.box instanceof THREE.Box3 ? model.box.clone() : new THREE.Box3().setFromObject(model.object);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.5);
    const rect = stage.getBoundingClientRect();
    const aspect = Math.max(0.01, Math.max(1, rect.width) / Math.max(1, rect.height));
    const verticalFov = THREE.MathUtils.degToRad(Number(camera.fov || 45));
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const distance = Math.max(
      radius / Math.max(Math.sin(verticalFov / 2), 0.01),
      radius / Math.max(Math.sin(horizontalFov / 2), 0.01)
    ) * 1.12;
    const direction = camera.position.clone().sub(getTarget());
    if (direction.lengthSq() < 1e-8) direction.set(1, 0.7, 1);
    direction.normalize();
    const next = center.clone().addScaledVector(direction, distance);
    fallbackTarget.copy(center);
    zoomBaselineDistance = distance;
    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = Math.max(distance * 1000, 1000);
    camera.updateProjectionMatrix();
    void controls.setLookAt?.(next.x, next.y, next.z, center.x, center.y, center.z, false);
    zoomEmitter.emit();
  };

  const applyFit = (request: FileViewerFitRequest): FileViewerFitResult => {
    if (!model || !getCamera()) {
      return { applied: false, mode: request.mode, resize: request.resize, source: request.source, reason: 'not-ready', provider: 'zoom' };
    }
    fitToModel();
    return { applied: true, mode: request.mode, resize: request.resize, scale: getZoomState().scale, source: request.source, provider: 'zoom' };
  };

  const renderInfo = (info: FileViewerIfcElementInfo | null) => {
    if (!showProperties) return;
    panelBody.replaceChildren();
    if (!info) {
      panelTitle.textContent = 'IFC element';
      panelSubtitle.textContent = 'Select an element in the model';
      panelBody.append(element(doc, 'p', 'ifc-thatopen-empty', 'Click or tap a BIM element to inspect its IFC data.'));
      return;
    }
    panelTitle.textContent = info.name || info.entityType;
    panelSubtitle.textContent = `${info.entityType} · #${info.expressID}`;
    for (const [label, value] of [
      ['Entity', info.entityType],
      ['Name', info.name || '—'],
      ['GlobalId', info.globalId || '—'],
      ['Express ID', String(info.expressID)],
    ]) {
      const row = element(doc, 'div', 'ifc-thatopen-field');
      row.append(element(doc, 'span', undefined, label), element(doc, 'span', undefined, value));
      panelBody.append(row);
    }
    for (const set of info.propertySets) {
      const section = element(doc, 'section', 'ifc-thatopen-pset');
      section.append(element(doc, 'h4', undefined, set.name));
      for (const property of set.properties) {
        const row = element(doc, 'div', 'ifc-thatopen-property');
        row.append(element(doc, 'span', undefined, property.name), element(doc, 'span', undefined, property.value));
        section.append(row);
      }
      panelBody.append(section);
    }
  };

  const getElementInfo = async (expressID: number): Promise<FileViewerIfcElementInfo> => {
    if (!model) throw new Error('That Open IFC model is not ready.');
    const rows = await model.getItemsData?.([expressID]);
    const item = Array.isArray(rows) ? rows[0] : undefined;
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const data = record.data && typeof record.data === 'object' ? record.data as Record<string, unknown> : record;
    const guids = await model.getGuidsByLocalIds?.([expressID]);
    const entityType = readScalar(record.category) || readScalar(data._category) || readScalar(data.type) || 'IFCENTITY';
    return {
      expressID,
      entityType,
      name: readScalar(data.Name) || undefined,
      globalId: (Array.isArray(guids) ? guids[0] : undefined) || readScalar(data.GlobalId) || undefined,
      propertySets: buildPropertySets(item, maxProperties),
    };
  };

  const resetHighlight = async () => {
    if (model && selectedLocalId !== null) {
      try {
        await model.resetHighlight?.([selectedLocalId]);
        await fragments?.core?.update?.(true);
      } catch {
        // Best effort when a worker is already disposing.
      }
    }
    selectedLocalId = null;
    clearButton.disabled = true;
    renderInfo(null);
  };

  const clearSelection = () => { void resetHighlight(); };

  const selectElement = async (expressID: number | null): Promise<FileViewerIfcElementInfo | null> => {
    await resetHighlight();
    if (expressID === null || !model) return null;
    selectedLocalId = expressID;
    clearButton.disabled = false;
    try {
      await model.highlight?.([expressID], {
        color: new THREE.Color(0.06, 0.73, 0.51),
        renderedFaces: 1,
        opacity: 0.82,
        transparent: true,
      });
      await fragments?.core?.update?.(true);
    } catch {
      // Property inspection remains useful even if a library version changes highlight semantics.
    }
    const info = await getElementInfo(expressID);
    renderInfo(info);
    return info;
  };

  const onPointerDown = (event: PointerEvent) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = async (event: PointerEvent) => {
    if (!enableSelection || !pointerDown || !model || !canvas) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (distance > 5) return;
    try {
      const hit = await model.raycast?.({
        camera: getCamera(),
        mouse: new THREE.Vector2(event.clientX, event.clientY),
        dom: canvas,
      });
      await selectElement(Number.isInteger(hit?.localId) ? Number(hit.localId) : null);
    } catch {
      await selectElement(null);
    }
  };

  const onPointerUpEvent = (event: PointerEvent) => { void onPointerUp(event); };

  const resize = () => {
    try {
      world?.renderer?.resize?.();
      world?.camera?.updateAspect?.();
    } catch {
      // Resize is best-effort across That Open minor versions.
    }
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect();
    resizeObserver = null;
    unregisterFileViewerZoomProvider(root);
    if (canvas) {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUpEvent);
    }
    const controls = getControls();
    controls?.removeEventListener?.('update', onCameraUpdate);
    controls?.removeEventListener?.('rest', onCameraRest);
    void resetHighlight();
    try {
      const result = fragments?.dispose?.();
      if (result && typeof result.catch === 'function') void result.catch(() => undefined);
    } catch {
      // Best-effort worker cleanup.
    }
    try {
      components?.dispose?.();
    } catch {
      // Best-effort component cleanup.
    }
    components = null;
    world = null;
    fragments = null;
    loader = null;
    importer = null;
    model = null;
    canvas = null;
    target.replaceChildren();
  };

  const onCameraUpdate = () => { void fragments?.core?.update?.(); };
  const onCameraRest = () => { void fragments?.core?.update?.(true); };

  try {
    if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    components = new (OBC as any).Components();
    const worlds = components.get((OBC as any).Worlds);
    world = worlds.create();
    world.scene = new (OBC as any).SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;
    world.renderer = new (OBC as any).SimpleRenderer(components, stage);
    world.camera = new (OBC as any).SimpleCamera(components);
    components.init();
    canvas = world.renderer.three.domElement as HTMLCanvasElement;

    fragments = components.get((OBC as any).FragmentsManager);
    fragments.init(workerUrl);
    if (options?.thatOpen?.fragments) {
      Object.assign(fragments.core.settings, options.thatOpen.fragments);
    }
    getControls()?.addEventListener?.('update', onCameraUpdate);
    getControls()?.addEventListener?.('rest', onCameraRest);

    loader = components.get((OBC as any).IfcLoader);
    await loader.setup({
      autoSetWasm: false,
      wasm: { path: wasmDirectory, absolute: true },
      webIfc: { COORDINATE_TO_ORIGIN: true },
    });
    if (options?.thatOpen?.components) {
      // Intentionally forward the user's object unchanged: no Flyfish key mapping.
      await loader.setup(options.thatOpen.components);
    }

    if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    model = await loader.load(new Uint8Array(buffer), true, modelName(context), {
      ...(options?.thatOpen?.importer ? { processData: options.thatOpen.importer } : {}),
      instanceCallback: (value: unknown) => {
        importer = value;
        options?.thatOpen?.configureImporter?.({
          modules: { components: OBC, fragments: FRAGS },
          components,
          world,
          fragments,
          loader,
          webIfc: loader?.webIfc,
          importer: value,
        });
      },
    });

    if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    model.useCamera?.(world.camera.three);
    world.scene.three.add(model.object);
    await fragments.core.update(true);

    const runtime: FileViewerIfcThatOpenRuntimeContext = {
      modules: { components: OBC, fragments: FRAGS },
      components,
      world,
      fragments,
      loader,
      webIfc: loader?.webIfc,
      importer,
      model,
    };
    await options?.thatOpen?.configure?.(runtime);

    if (options?.fitToModel !== false) fitToModel();
    fitButton.addEventListener('click', fitToModel);
    clearButton.addEventListener('click', clearSelection);
    if (enableSelection && canvas) {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointerup', onPointerUpEvent);
    }
    const ResizeObserverCtor = win.ResizeObserver;
    if (ResizeObserverCtor) {
      resizeObserver = new ResizeObserverCtor(resize);
      resizeObserver.observe(stage);
    }
    resize();

    registerFileViewerZoomProvider(root, {
      zoomIn: () => setZoom(getZoomScale() * ZOOM_STEP),
      zoomOut: () => setZoom(getZoomScale() / ZOOM_STEP),
      resetZoom: () => setZoom(1),
      setZoom,
      fit: applyFit,
      getState: getZoomState,
      subscribe: zoomEmitter.subscribe,
    });

    let elementCount: number | undefined;
    if (!largeModel) {
      try {
        const ids = await model.getItemsIdsWithGeometry?.();
        if (Array.isArray(ids)) elementCount = ids.length;
      } catch {
        elementCount = undefined;
      }
    }
    root.dataset.modelStatus = 'ready';
    root.dataset.ifcSchema = schema || '';
    if (elementCount !== undefined) root.dataset.ifcElementCount = String(elementCount);
    state.hidden = true;
    meta.textContent = [
      schema,
      largeModel ? 'Fragments LOD' : 'That Open',
      elementCount !== undefined ? `${elementCount} elements` : undefined,
      `${Math.max(1, Math.round(buffer.byteLength / (1024 * 1024) * 10) / 10)} MiB source`,
    ].filter(Boolean).join(' · ');
    zoomEmitter.emit();

    const configureContext: FileViewerIfcConfigureContext = {
      fileSizeBytes: buffer.byteLength,
      largeModel,
      model,
      schema,
      thatOpen: runtime,
      getElementInfo,
      selectElement,
      clearSelection,
      fitToModel,
    };
    await options?.configure?.(configureContext);

    return { $el: root, unmount: cleanup };
  } catch (reason) {
    root.dataset.modelStatus = 'error';
    state.hidden = false;
    state.textContent = normalizeError(reason) || 'Unable to load IFC model with That Open Fragments.';
    cleanup();
    throw reason instanceof Error ? reason : new Error(normalizeError(reason));
  }
}
