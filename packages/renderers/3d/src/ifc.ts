import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
import { syncModelViewport } from './modelViewport.js';
import {
  DEFAULT_FILE_VIEWER_IFC_API_PATH,
  DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES,
  DEFAULT_FILE_VIEWER_IFC_MT_WASM_PATH,
  DEFAULT_FILE_VIEWER_IFC_WASM_PATH,
  type FileViewerIfcConfigureContext,
  type FileViewerIfcElementInfo,
  type FileViewerIfcOptions,
  type FileViewerIfcProperty,
  type FileViewerIfcPropertySet,
} from './ifcTypes.js';

const IFC_MIN_ZOOM = 0.1;
const IFC_MAX_ZOOM = 20;
const IFC_ZOOM_STEP = 1.2;
const IFC_DEFAULT_MAX_PROPERTIES = 250;

const ifcStyle = `
.ifc-viewer{display:flex;height:100%;min-height:100%;flex-direction:column;background:#f8fafc;color:#162333}
.ifc-viewer *{box-sizing:border-box}
.ifc-toolbar{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:16px;padding:0 12px;border-bottom:1px solid rgba(15,23,42,.08);background:#fff}
.ifc-actions{display:flex;min-width:0;flex-wrap:wrap;gap:6px}
.ifc-actions button{min-height:30px;border:0;border-radius:8px;padding:0 10px;background:rgba(15,23,42,.06);color:#475569;cursor:pointer;font-size:12px;font-weight:700}
.ifc-actions button:hover{background:rgba(33,163,102,.14);color:#16804f}
.ifc-actions button[disabled]{cursor:default;opacity:.45}
.ifc-meta{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;color:#64748b;font-size:12px}
.ifc-meta strong{color:#0f766e;font-weight:800}
.ifc-meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ifc-stage{position:relative;flex:1;min-height:0;overflow:hidden}
.ifc-stage canvas{display:block;width:100%;height:100%;outline:none;touch-action:none}
.ifc-state{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;background:rgba(248,250,252,.9);color:#64748b;text-align:center;line-height:1.6}
.ifc-state[hidden]{display:none!important}
.ifc-panel{position:absolute;z-index:3;top:12px;right:12px;width:min(360px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;border:1px solid rgba(15,23,42,.12);border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 12px 32px rgba(15,23,42,.14);backdrop-filter:blur(10px)}
.ifc-panel[hidden]{display:none!important}
.ifc-panel-header{position:sticky;top:0;z-index:1;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.08);background:inherit}
.ifc-panel-header strong{display:block;font-size:13px;color:#0f766e}
.ifc-panel-header span{display:block;margin-top:3px;color:#64748b;font-size:11px}
.ifc-panel-body{padding:12px 14px 16px}
.ifc-empty{margin:0;color:#64748b;font-size:12px;line-height:1.6}
.ifc-field{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;padding:5px 0;font-size:12px}
.ifc-field dt{color:#64748b}
.ifc-field dd{margin:0;min-width:0;overflow-wrap:anywhere;color:#1e293b;font-weight:600}
.ifc-pset{margin-top:12px;padding-top:10px;border-top:1px solid rgba(15,23,42,.08)}
.ifc-pset h4{margin:0 0 7px;color:#334155;font-size:12px}
.ifc-property{display:grid;grid-template-columns:minmax(80px,.9fr) minmax(100px,1.1fr);gap:8px;padding:3px 0;font-size:11px;line-height:1.4}
.ifc-property span:first-child{color:#64748b;overflow-wrap:anywhere}.ifc-property span:last-child{color:#334155;overflow-wrap:anywhere}
[data-viewer-theme='dark'] .ifc-viewer{background:#101820;color:#e5eef8}
[data-viewer-theme='dark'] .ifc-toolbar{border-color:rgba(148,163,184,.18);background:#111827}
[data-viewer-theme='dark'] .ifc-actions button{background:#1f2937;color:#cbd5e1}
[data-viewer-theme='dark'] .ifc-actions button:hover{background:rgba(45,212,191,.14);color:#5eead4}
[data-viewer-theme='dark'] .ifc-meta{color:#94a3b8}[data-viewer-theme='dark'] .ifc-meta strong{color:#5eead4}
[data-viewer-theme='dark'] .ifc-state{background:rgba(15,23,42,.9);color:#cbd5e1}
[data-viewer-theme='dark'] .ifc-panel{border-color:rgba(148,163,184,.2);background:rgba(17,24,39,.96);box-shadow:0 12px 32px rgba(0,0,0,.32)}
[data-viewer-theme='dark'] .ifc-panel-header{border-color:rgba(148,163,184,.16)}
[data-viewer-theme='dark'] .ifc-panel-header strong{color:#5eead4}[data-viewer-theme='dark'] .ifc-panel-header span,[data-viewer-theme='dark'] .ifc-empty,[data-viewer-theme='dark'] .ifc-field dt,[data-viewer-theme='dark'] .ifc-property span:first-child{color:#94a3b8}
[data-viewer-theme='dark'] .ifc-field dd,[data-viewer-theme='dark'] .ifc-pset h4,[data-viewer-theme='dark'] .ifc-property span:last-child{color:#e2e8f0}
[data-viewer-theme='dark'] .ifc-pset{border-color:rgba(148,163,184,.16)}
@media (max-width:720px){.ifc-toolbar{min-height:64px;align-items:flex-start;flex-direction:column;gap:8px;padding:8px 10px}.ifc-meta{width:100%;justify-content:flex-start}.ifc-panel{top:auto;bottom:10px;right:10px;left:10px;width:auto;max-height:45%}}
`;

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = ifcStyle;
  return style;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

const resolveAssetUrl = (value: string | URL | undefined, fallback: string, baseUrl: string) => {
  try {
    return new URL(value ? String(value) : fallback, baseUrl).href;
  } catch {
    return value ? String(value) : fallback;
  }
};

const readIfcScalar = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (depth > 3) return '';
  if (Array.isArray(value)) {
    return value.map(item => readIfcScalar(item, depth + 1)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('value' in record) return readIfcScalar(record.value, depth + 1);
    for (const key of [
      'NominalValue',
      'EnumerationValues',
      'ListValues',
      'SetPointValue',
      'UpperBoundValue',
      'LowerBoundValue',
    ]) {
      if (key in record) {
        const text = readIfcScalar(record[key], depth + 1);
        if (text) return text;
      }
    }
    for (const [key, candidate] of Object.entries(record)) {
      if (key !== 'Name' && key.endsWith('Value')) {
        const text = readIfcScalar(candidate, depth + 1);
        if (text) return text;
      }
    }
  }
  return '';
};

const buildPropertySets = (sets: unknown, maxProperties: number): FileViewerIfcPropertySet[] => {
  if (!Array.isArray(sets)) return [];
  let remaining = Math.max(0, maxProperties);
  const result: FileViewerIfcPropertySet[] = [];

  for (const rawSet of sets) {
    if (remaining <= 0 || !rawSet || typeof rawSet !== 'object') break;
    const set = rawSet as Record<string, unknown>;
    const propertyCandidates = Array.isArray(set.HasProperties)
      ? set.HasProperties
      : Array.isArray(set.Quantities)
        ? set.Quantities
        : [];
    const properties: FileViewerIfcProperty[] = [];
    for (const rawProperty of propertyCandidates) {
      if (remaining <= 0) break;
      if (!rawProperty || typeof rawProperty !== 'object') continue;
      const property = rawProperty as Record<string, unknown>;
      const name = readIfcScalar(property.Name) || `#${String(property.expressID ?? '')}`;
      const value = readIfcScalar(property);
      properties.push({ name, value: value || '—' });
      remaining -= 1;
    }
    result.push({
      name: readIfcScalar(set.Name) || `Property set ${result.length + 1}`,
      properties,
    });
  }
  return result;
};

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) item.dispose();
};

const disposeObject = (object: THREE.Object3D) => {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse(child => {
    const renderable = child as THREE.Mesh;
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) {
      const list = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
      list.forEach(material => materials.add(material));
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
};

const createGeometry = (api: any, modelID: number, placedGeometry: any) => {
  const sourceGeometry = api.GetGeometry(modelID, placedGeometry.geometryExpressID);
  try {
    const vertices = api.GetVertexArray(
      sourceGeometry.GetVertexData(),
      sourceGeometry.GetVertexDataSize()
    ) as Float32Array;
    const indices = api.GetIndexArray(
      sourceGeometry.GetIndexData(),
      sourceGeometry.GetIndexDataSize()
    ) as Uint32Array;
    const vertexCount = Math.floor(vertices.length / 6);
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    for (let index = 0; index < vertexCount; index += 1) {
      const sourceOffset = index * 6;
      const targetOffset = index * 3;
      positions[targetOffset] = vertices[sourceOffset];
      positions[targetOffset + 1] = vertices[sourceOffset + 1];
      positions[targetOffset + 2] = vertices[sourceOffset + 2];
      normals[targetOffset] = vertices[sourceOffset + 3];
      normals[targetOffset + 1] = vertices[sourceOffset + 4];
      normals[targetOffset + 2] = vertices[sourceOffset + 5];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  } finally {
    sourceGeometry?.delete?.();
  }
};

const materialKey = (color: any) => [color?.x, color?.y, color?.z, color?.w].join(':');

const createIfcMaterial = (color: any) => {
  const alpha = Number.isFinite(color?.w) ? Number(color.w) : 1;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(
      Number.isFinite(color?.x) ? Number(color.x) : 0.65,
      Number.isFinite(color?.y) ? Number(color.y) : 0.68,
      Number.isFinite(color?.z) ? Number(color.z) : 0.72
    ),
    side: THREE.DoubleSide,
    roughness: 0.78,
    metalness: 0.04,
    transparent: alpha < 0.999,
    opacity: Math.max(0, Math.min(1, alpha)),
    depthWrite: alpha >= 0.999,
  });
};

export default async function renderIfc(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  _type?: string,
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const t = createFileViewerTranslator(context?.options);
  const options = context?.options?.ifc as FileViewerIfcOptions | undefined;
  const largeModelThresholdBytes = Number.isFinite(options?.performance?.largeModelThresholdBytes)
    ? Math.max(1, Math.floor(Number(options?.performance?.largeModelThresholdBytes)))
    : DEFAULT_FILE_VIEWER_IFC_LARGE_MODEL_THRESHOLD_BYTES;
  const largeModel = buffer.byteLength >= largeModelThresholdBytes;
  const enableSelection = options?.enableSelection !== false;
  const showProperties = options?.showProperties !== false;
  const maxProperties = Number.isFinite(options?.maxProperties)
    ? Math.max(0, Math.floor(Number(options?.maxProperties)))
    : IFC_DEFAULT_MAX_PROPERTIES;
  const documentRef = target.ownerDocument;
  const windowRef = documentRef.defaultView || window;
  const assetBaseUrl = resolveFileViewerRuntimeAssetBaseUrl(documentRef);
  const apiUrl = resolveAssetUrl(options?.apiUrl, DEFAULT_FILE_VIEWER_IFC_API_PATH, assetBaseUrl);
  const wasmUrl = resolveAssetUrl(options?.wasmUrl, DEFAULT_FILE_VIEWER_IFC_WASM_PATH, assetBaseUrl);
  const wasmMtUrl = resolveAssetUrl(options?.wasmMtUrl, DEFAULT_FILE_VIEWER_IFC_MT_WASM_PATH, assetBaseUrl);

  const root = createElement('div', 'ifc-viewer');
  root.dataset.modelFormat = 'ifc';
  root.dataset.modelStatus = 'loading';
  root.dataset.ifcBackend = 'web-ifc';
  root.dataset.ifcLargeModel = String(largeModel);
  const toolbar = createElement('div', 'ifc-toolbar');
  const actions = createElement('div', 'ifc-actions');
  const fitButton = createElement('button', undefined, t('model.toolbar.fit'));
  const clearButton = createElement('button', undefined, 'Clear selection');
  fitButton.type = 'button';
  clearButton.type = 'button';
  clearButton.disabled = true;
  clearButton.hidden = !enableSelection;
  actions.append(fitButton, clearButton);
  const meta = createElement('div', 'ifc-meta');
  const typeLabel = createElement('strong', undefined, 'IFC');
  const summary = createElement('span', undefined, t('model.state.loading'));
  meta.append(typeLabel, summary);
  toolbar.append(actions, meta);

  const stage = createElement('div', 'ifc-stage');
  const canvas = documentRef.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Interactive IFC model');
  const state = createElement('div', 'ifc-state', t('model.state.loading'));
  stage.append(canvas, state);

  const inspector = createElement('aside', 'ifc-panel');
  inspector.hidden = !showProperties;
  inspector.setAttribute('aria-label', 'IFC element properties');
  const inspectorHeader = createElement('div', 'ifc-panel-header');
  const inspectorTitle = createElement('strong', undefined, 'IFC element');
  const inspectorSubtitle = createElement('span', undefined, 'Select an element in the model');
  inspectorHeader.append(inspectorTitle, inspectorSubtitle);
  const inspectorBody = createElement('div', 'ifc-panel-body');
  inspectorBody.append(createElement('p', 'ifc-empty', 'Click or tap a BIM element to inspect its IFC data.'));
  inspector.append(inspectorHeader, inspectorBody);
  if (showProperties) stage.append(inspector);

  root.append(toolbar, stage);
  target.replaceChildren(createStyle(), root);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let controls: OrbitControls | null = null;
  let modelRoot: THREE.Group | null = null;
  let selectionHelper: THREE.BoxHelper | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let animationFrame = 0;
  let disposed = false;
  let modelID: number | null = null;
  let ifcApi: any = null;
  let schema: string | undefined;
  let zoomBaselineDistance = 0;
  let selectionVersion = 0;
  let pointerDown: { x: number; y: number } | null = null;
  const elementObjects = new Map<number, THREE.Group>();
  const zoomEmitter = createFileViewerZoomChangeEmitter();

  const resize = () => {
    if (!renderer || !camera) return;
    syncModelViewport({
      renderer,
      camera,
      stage,
      canvas,
      devicePixelRatio: windowRef.devicePixelRatio || 1,
    });
  };

  const getZoomScale = () => {
    if (!camera || !controls || zoomBaselineDistance <= 0) return 1;
    const distance = camera.position.distanceTo(controls.target);
    return distance > 0
      ? THREE.MathUtils.clamp(zoomBaselineDistance / distance, IFC_MIN_ZOOM, IFC_MAX_ZOOM)
      : 1;
  };

  const getZoomState = (): FileViewerZoomState => {
    const scale = getZoomScale();
    const ready = root.dataset.modelStatus === 'ready' && zoomBaselineDistance > 0;
    return {
      scale,
      label: `${Math.round(scale * 100)}%`,
      canZoomIn: ready && scale < IFC_MAX_ZOOM - 0.001,
      canZoomOut: ready && scale > IFC_MIN_ZOOM + 0.001,
      canReset: ready && Math.abs(scale - 1) > 0.005,
      minScale: IFC_MIN_ZOOM,
      maxScale: IFC_MAX_ZOOM,
    };
  };

  const setZoom = (requested: number) => {
    if (!camera || !controls || zoomBaselineDistance <= 0) return getZoomState();
    const scale = THREE.MathUtils.clamp(requested, IFC_MIN_ZOOM, IFC_MAX_ZOOM);
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-8) direction.set(1, 0.7, 1);
    direction.normalize();
    camera.position.copy(controls.target).addScaledVector(direction, zoomBaselineDistance / scale);
    camera.updateProjectionMatrix();
    controls.update();
    zoomEmitter.emit();
    return getZoomState();
  };

  const fitToModel = () => {
    if (!modelRoot || !camera || !controls) return;
    modelRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelRoot);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.5);
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width || canvas.clientWidth || 1);
    const height = Math.max(1, rect.height || canvas.clientHeight || 1);
    const aspect = Math.max(0.01, width / height);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const distance = Math.max(
      radius / Math.max(Math.sin(verticalFov / 2), 0.01),
      radius / Math.max(Math.sin(horizontalFov / 2), 0.01)
    ) * 1.12;
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-8) direction.set(1, 0.7, 1);
    direction.normalize();
    zoomBaselineDistance = distance;
    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = Math.max(distance * 1000, 1000);
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.minDistance = distance / IFC_MAX_ZOOM;
    controls.maxDistance = distance / IFC_MIN_ZOOM;
    controls.update();
    zoomEmitter.emit();
  };

  const applyIfcFit = (request: FileViewerFitRequest): FileViewerFitResult => {
    if (!modelRoot || !camera || !controls) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'not-ready',
        provider: 'zoom',
      };
    }
    fitToModel();
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: getZoomState().scale,
      source: request.source,
      provider: 'zoom',
    };
  };

  const renderInspector = (info: FileViewerIfcElementInfo | null) => {
    if (!showProperties) return;
    inspectorBody.replaceChildren();
    if (!info) {
      inspectorTitle.textContent = 'IFC element';
      inspectorSubtitle.textContent = 'Select an element in the model';
      inspectorBody.append(createElement('p', 'ifc-empty', 'Click or tap a BIM element to inspect its IFC data.'));
      return;
    }
    inspectorTitle.textContent = info.name || info.entityType;
    inspectorSubtitle.textContent = `${info.entityType} · #${info.expressID}`;
    const fields = createElement('dl');
    for (const [label, value] of [
      ['Entity', info.entityType],
      ['Name', info.name || '—'],
      ['GlobalId', info.globalId || '—'],
      ['Express ID', String(info.expressID)],
    ]) {
      const row = createElement('div', 'ifc-field');
      row.append(createElement('dt', undefined, label), createElement('dd', undefined, value));
      fields.append(row);
    }
    inspectorBody.append(fields);
    for (const set of info.propertySets) {
      const section = createElement('section', 'ifc-pset');
      section.append(createElement('h4', undefined, set.name));
      for (const property of set.properties) {
        const row = createElement('div', 'ifc-property');
        row.append(createElement('span', undefined, property.name), createElement('span', undefined, property.value));
        section.append(row);
      }
      inspectorBody.append(section);
    }
    if (!info.propertySets.length) {
      inspectorBody.append(createElement('p', 'ifc-empty', 'No property sets are available for this element.'));
    }
  };

  const getElementInfo = async (expressID: number): Promise<FileViewerIfcElementInfo> => {
    if (!ifcApi || modelID === null) throw new Error('IFC model is not ready.');
    const item = await ifcApi.properties.getItemProperties(modelID, expressID, false, false);
    const entityType = item?.type !== undefined
      ? String(ifcApi.GetNameFromTypeCode(item.type) || 'IFCENTITY')
      : 'IFCENTITY';
    let propertySets: FileViewerIfcPropertySet[] = [];
    try {
      const rawSets = await ifcApi.properties.getPropertySets(modelID, expressID, true, false);
      propertySets = buildPropertySets(rawSets, maxProperties);
    } catch {
      propertySets = [];
    }
    return {
      expressID,
      entityType,
      name: readIfcScalar(item?.Name) || undefined,
      globalId: readIfcScalar(item?.GlobalId) || undefined,
      propertySets,
    };
  };

  const clearSelection = () => {
    selectionVersion += 1;
    if (selectionHelper && scene) {
      scene.remove(selectionHelper);
      selectionHelper.geometry.dispose();
      disposeMaterial(selectionHelper.material);
    }
    selectionHelper = null;
    clearButton.disabled = true;
    renderInspector(null);
  };

  const selectElement = async (expressID: number | null): Promise<FileViewerIfcElementInfo | null> => {
    if (expressID === null) {
      clearSelection();
      return null;
    }
    const object = elementObjects.get(expressID);
    if (!object || !scene) return null;
    clearSelection();
    const version = ++selectionVersion;
    selectionHelper = new THREE.BoxHelper(object, 0x10b981);
    selectionHelper.renderOrder = 10;
    scene.add(selectionHelper);
    clearButton.disabled = false;
    inspectorTitle.textContent = `IFC element #${expressID}`;
    inspectorSubtitle.textContent = 'Loading properties…';
    if (showProperties) {
      inspectorBody.replaceChildren(createElement('p', 'ifc-empty', 'Loading IFC properties…'));
    }
    try {
      const info = await getElementInfo(expressID);
      if (disposed || version !== selectionVersion) return null;
      renderInspector(info);
      return info;
    } catch (reason) {
      if (!disposed && version === selectionVersion && showProperties) {
        inspectorSubtitle.textContent = `#${expressID}`;
        inspectorBody.replaceChildren(
          createElement('p', 'ifc-empty', `Unable to read IFC properties: ${normalizeError(reason)}`)
        );
      }
      return null;
    }
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickFromPointer = (event: PointerEvent) => {
    if (!enableSelection || !camera || !modelRoot) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(modelRoot, true)[0];
    if (!hit) {
      void selectElement(null);
      return;
    }
    let current: THREE.Object3D | null = hit.object;
    let expressID: number | undefined;
    while (current && current !== modelRoot) {
      if (Number.isInteger(current.userData.ifcExpressID)) {
        expressID = Number(current.userData.ifcExpressID);
        break;
      }
      current = current.parent;
    }
    void selectElement(expressID ?? null);
  };

  const onPointerDown = (event: PointerEvent) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!pointerDown) return;
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (distance <= 5) pickFromPointer(event);
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    selectionVersion += 1;
    windowRef.cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    resizeObserver = null;
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
    unregisterFileViewerZoomProvider(root);
    clearSelection();
    controls?.dispose();
    controls = null;
    if (modelRoot && scene) scene.remove(modelRoot);
    if (modelRoot) disposeObject(modelRoot);
    modelRoot = null;
    elementObjects.clear();
    if (modelID !== null && modelID >= 0 && ifcApi) {
      try {
        ifcApi.CloseModel(modelID);
      } catch {
        // Best-effort cleanup for partially opened models.
      }
    }
    modelID = null;
    try {
      ifcApi?.Dispose?.();
    } catch {
      // Best-effort release of the WebAssembly heap.
    }
    ifcApi = null;
    if (scene) disposeObject(scene);
    renderer?.dispose();
    renderer?.renderLists.dispose();
    renderer = null;
    scene = null;
    camera = null;
    target.replaceChildren();
  };

  try {
    if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8895a7, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(8, 12, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-7, 5, -6);
    scene.add(fillLight);
    const grid = new THREE.GridHelper(10, 10, 0x94a3b8, 0xcbd5e1);
    scene.add(grid);

    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000);
    camera.position.set(7, 5, 8);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    resize();
    const ResizeObserverCtor = windowRef.ResizeObserver;
    if (ResizeObserverCtor) {
      resizeObserver = new ResizeObserverCtor(resize);
      resizeObserver.observe(stage);
    }

    const renderFrame = () => {
      if (disposed || !renderer || !scene || !camera || !controls) return;
      resize();
      controls.update();
      renderer.render(scene, camera);
      animationFrame = windowRef.requestAnimationFrame(renderFrame);
    };
    renderFrame();

    fitButton.addEventListener('click', fitToModel);
    clearButton.addEventListener('click', clearSelection);
    if (enableSelection) {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointerup', onPointerUp);
    }

    registerFileViewerZoomProvider(root, {
      zoomIn: () => setZoom(getZoomScale() * IFC_ZOOM_STEP),
      zoomOut: () => setZoom(getZoomScale() / IFC_ZOOM_STEP),
      resetZoom: () => setZoom(1),
      setZoom,
      fit: applyIfcFit,
      getState: getZoomState,
      subscribe: zoomEmitter.subscribe,
    });

    // Loading by absolute self-hosted URL keeps web-ifc out of non-IFC bundles entirely.
    const WebIFC = await import(/* @vite-ignore */ apiUrl) as { IfcAPI?: new () => any };
    if (typeof WebIFC.IfcAPI !== 'function') {
      throw new Error(`The self-hosted web-ifc module at ${apiUrl} does not export IfcAPI.`);
    }
    if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    ifcApi = new WebIFC.IfcAPI();
    const locateFile = (path: string, prefix: string) => {
      if (path.endsWith('web-ifc-mt.wasm')) return wasmMtUrl;
      if (path.endsWith('web-ifc.wasm')) return wasmUrl;
      try {
        return new URL(path, prefix || assetBaseUrl).href;
      } catch {
        return `${prefix || ''}${path}`;
      }
    };
    await ifcApi.Init(locateFile, options?.forceSingleThread === true);
    if (context?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const loaderSettings: Record<string, number | boolean> = { COORDINATE_TO_ORIGIN: true };
    if (Number.isFinite(options?.circleSegments)) {
      loaderSettings.CIRCLE_SEGMENTS = Math.max(3, Math.floor(Number(options?.circleSegments)));
    }
    if (Number.isFinite(options?.memoryLimitBytes)) {
      loaderSettings.MEMORY_LIMIT = Math.max(64 * 1024 * 1024, Math.floor(Number(options?.memoryLimitBytes)));
    }
    const openedModelID = Number(ifcApi.OpenModel(new Uint8Array(buffer), loaderSettings));
    if (!Number.isInteger(openedModelID) || openedModelID < 0) {
      throw new Error('web-ifc could not open this IFC model or the schema is unsupported.');
    }
    modelID = openedModelID;
    schema = String(ifcApi.GetModelSchema?.(openedModelID) || '') || undefined;

    const rootObject = new THREE.Group();
    rootObject.name = 'IFC model';
    const materialCache = new Map<string, THREE.Material>();
    let meshCount = 0;
    ifcApi.StreamAllMeshes(openedModelID, (flatMesh: any) => {
      const expressID = Number(flatMesh.expressID);
      const element = new THREE.Group();
      element.name = `IFC #${expressID}`;
      element.userData.ifcExpressID = expressID;
      const geometries = flatMesh.geometries;
      for (let index = 0; index < geometries.size(); index += 1) {
        const placed = geometries.get(index);
        const geometry = createGeometry(ifcApi, openedModelID, placed);
        const key = materialKey(placed.color);
        let material = materialCache.get(key);
        if (!material) {
          material = createIfcMaterial(placed.color);
          materialCache.set(key, material);
        }
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrix.fromArray(placed.flatTransformation);
        mesh.matrixAutoUpdate = false;
        mesh.userData.ifcExpressID = expressID;
        element.add(mesh);
        meshCount += 1;
      }
      if (element.children.length) {
        elementObjects.set(expressID, element);
        rootObject.add(element);
      }
      flatMesh.delete?.();
    });

    if (context?.signal?.aborted) {
      disposeObject(rootObject);
      throw new DOMException('Aborted', 'AbortError');
    }
    if (!rootObject.children.length) {
      disposeObject(rootObject);
      throw new Error('web-ifc parsed the file but returned no renderable geometry.');
    }

    rootObject.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rootObject);
    if (!box.isEmpty()) {
      rootObject.position.sub(box.getCenter(new THREE.Vector3()));
      rootObject.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(rootObject).getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, 1);
      grid.scale.setScalar(Math.max(maxSize / 10, 1));
    }
    modelRoot = rootObject;
    scene.add(rootObject);
    if (options?.fitToModel !== false) fitToModel();

    root.dataset.modelStatus = 'ready';
    root.dataset.ifcSchema = schema || '';
    root.dataset.ifcElementCount = String(elementObjects.size);
    root.dataset.modelMeshCount = String(meshCount);
    state.hidden = true;
    summary.textContent = [
      schema,
      `${elementObjects.size} elements`,
      `${meshCount} meshes`,
    ].filter(Boolean).join(' · ');
    zoomEmitter.emit();

    const configureContext: FileViewerIfcConfigureContext = {
      backend: 'web-ifc',
      fileSizeBytes: buffer.byteLength,
      largeModel,
      api: ifcApi,
      modelID: openedModelID,
      model: rootObject,
      schema,
      getElementInfo,
      selectElement,
      clearSelection,
      fitToModel,
    };
    await options?.configure?.(configureContext);

    return {
      $el: root,
      unmount: cleanup,
    };
  } catch (reason) {
    root.dataset.modelStatus = 'error';
    state.hidden = false;
    state.textContent = normalizeError(reason) || 'Unable to load IFC model.';
    cleanup();
    throw reason instanceof Error ? reason : new Error(normalizeError(reason));
  }
}
