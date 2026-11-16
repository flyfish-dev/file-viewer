import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createFileViewerViewStateChange,
  createFileViewerViewStateChangeEmitter,
  createFileViewerZoomChangeEmitter,
  createFileViewerTranslator,
  attachFileViewerErrorMessage,
  normalizeFileViewerErrorMessage,
  registerFileViewerZoomProvider,
  registerFileViewerViewStateProvider,
  resolveFileViewerColorScheme,
  resolveFileViewerLocale,
  resolveFileViewerModelAssetUrls,
  resolveFileViewerRuntimeAssetBaseUrl,
  unregisterFileViewerZoomProvider,
  unregisterFileViewerViewStateProvider,
  type FileRenderContext,
  type FileViewerI18nInput,
  type FileViewerFitRequest,
  type FileViewerFitResult,
  type FileViewerRenderedInstance,
  type FileViewerApplyViewStateOptions,
  type FileViewerViewState,
  type FileViewerViewStateChangeAction,
  type FileViewerViewStateChangeSource,
  type FileViewerZoomState,
} from '@file-viewer/core';
import {
  formatGeometryKernelNotice,
  importOcctGeometryFile,
  inspectGeometryKernelFile,
  isGeometryKernelFormat,
  type GeometryOcctImportParams,
} from '@file-viewer/geometry-engine';
import { buildOcctThreeObject } from './occtModel.js';
import { syncModelViewport } from './modelViewport.js';

type ModelStatus = 'loading' | 'ready' | 'error';

const modelStyle = `
.model-viewer{display:flex;height:100%;min-height:100%;flex-direction:column;background:#f8fafc;color:#162333}
.model-viewer *{box-sizing:border-box}
.model-toolbar{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:16px;padding:0 12px;border-bottom:1px solid rgba(15,23,42,.08);background:#fff}
.model-actions{display:flex;min-width:0;flex-wrap:wrap;gap:6px}
.model-actions button{min-height:30px;border:0;border-radius:8px;padding:0 10px;background:rgba(15,23,42,.06);color:#475569;cursor:pointer;font-size:12px;font-weight:700;letter-spacing:0;transition:background-color .18s ease,color .18s ease}
.model-actions button.active,.model-actions button:hover{background:rgba(33,163,102,.14);color:#16804f}
.model-meta{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;color:#64748b;font-size:12px}
.model-meta strong{color:#0f766e;font-weight:800}
.model-meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.model-stage{position:relative;flex:1;min-height:0;overflow:hidden}
.model-stage canvas{display:block;width:100%;height:100%;outline:none}
.model-state{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;background:rgba(248,250,252,.88);color:#64748b;text-align:center;line-height:1.7}
.model-state[hidden]{display:none!important}
.model-state.error{color:#b42318}
.model-state strong{color:#b42318;font-size:18px}
[data-viewer-theme='dark'] .model-viewer{background:#101820;color:#e5eef8}
[data-viewer-theme='dark'] .model-toolbar{border-color:rgba(148,163,184,.18);background:#111827}
[data-viewer-theme='dark'] .model-actions button{background:#1f2937;color:#cbd5e1}
[data-viewer-theme='dark'] .model-actions button.active,[data-viewer-theme='dark'] .model-actions button:hover{background:rgba(45,212,191,.14);color:#5eead4}
[data-viewer-theme='dark'] .model-meta{color:#94a3b8}
[data-viewer-theme='dark'] .model-meta strong{color:#5eead4}
[data-viewer-theme='dark'] .model-state{background:rgba(15,23,42,.88);color:#cbd5e1}
.model-viewer[data-model-theme='dark']{background:#101820;color:#e5eef8}
.model-viewer[data-model-theme='dark'] .model-toolbar{border-color:rgba(148,163,184,.18);background:#111827}
.model-viewer[data-model-theme='dark'] .model-actions button{background:#1f2937;color:#cbd5e1}
.model-viewer[data-model-theme='dark'] .model-actions button.active,.model-viewer[data-model-theme='dark'] .model-actions button:hover{background:rgba(45,212,191,.14);color:#5eead4}
.model-viewer[data-model-theme='dark'] .model-meta{color:#94a3b8}
.model-viewer[data-model-theme='dark'] .model-meta strong{color:#5eead4}
.model-viewer[data-model-theme='dark'] .model-state{background:rgba(15,23,42,.88);color:#cbd5e1}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .model-viewer{background:#101820;color:#e5eef8}[data-viewer-theme='system'] .model-toolbar{border-color:rgba(148,163,184,.18);background:#111827}[data-viewer-theme='system'] .model-actions button{background:#1f2937;color:#cbd5e1}[data-viewer-theme='system'] .model-actions button.active,[data-viewer-theme='system'] .model-actions button:hover{background:rgba(45,212,191,.14);color:#5eead4}[data-viewer-theme='system'] .model-meta{color:#94a3b8}[data-viewer-theme='system'] .model-meta strong{color:#5eead4}[data-viewer-theme='system'] .model-state{background:rgba(15,23,42,.88);color:#cbd5e1}}
@media (max-width:720px){.model-toolbar{min-height:64px;align-items:flex-start;flex-direction:column;gap:8px;padding:8px 10px}.model-meta{width:100%;justify-content:flex-start}}
`;

class ModelPreviewNotice extends Error {}

const MODEL_MIN_ZOOM = 0.1;
const MODEL_MAX_ZOOM = 20;
const MODEL_ZOOM_STEP = 1.2;
const MODEL_THEME_PALETTES = {
  light: {
    background: 0xf8fafc,
    gridCenter: 0xb9c6d4,
    gridLine: 0xdde5ed,
    hemisphereSky: 0xffffff,
    hemisphereGround: 0xd7dee8,
  },
  dark: {
    background: 0x0d141c,
    gridCenter: 0x526579,
    gridLine: 0x263544,
    hemisphereSky: 0xdbeafe,
    hemisphereGround: 0x172231,
  },
} as const;

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = modelStyle;
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

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

const isWorkerBootstrapFailure = (reason: unknown) => {
  const errorName = reason && typeof reason === 'object' && 'name' in reason
    ? String((reason as { name?: unknown }).name || '')
    : '';
  if (errorName === 'SecurityError' || errorName === 'NetworkError') {
    return true;
  }
  return /worker failed to load|worker-src|content security policy|importscripts|script error|loading (?:the )?wasm|fetching of the wasm failed/i
    .test(normalizeError(reason));
};

const canUseWorkerUrlFromDocument = (workerUrl: string, documentRef: Document) => {
  const location = documentRef.defaultView?.location;
  if (!location) {
    return true;
  }
  try {
    const resolved = new URL(workerUrl, documentRef.baseURI);
    return resolved.protocol === 'blob:' || resolved.origin === location.origin;
  } catch {
    return true;
  }
};

const getResourcePath = (sourceUrl?: string) => {
  if (!sourceUrl) {
    return '';
  }

  try {
    return new URL('.', sourceUrl).href;
  } catch {
    const clean = sourceUrl.split(/[?#]/)[0] || sourceUrl;
    const slashIndex = clean.lastIndexOf('/');
    return slashIndex >= 0 ? clean.slice(0, slashIndex + 1) : '';
  }
};

const disposeObject = (object: THREE.Object3D) => {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  const disposedSkeletons = new Set<THREE.Skeleton>();
  const disposeTexture = (value: unknown) => {
    if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  };
  const disposeMaterial = (material: THREE.Material) => {
    if (disposedMaterials.has(material)) {
      return;
    }
    disposedMaterials.add(material);
    Object.values(material).forEach(value => {
      disposeTexture(value);
      if (Array.isArray(value)) {
        value.forEach(disposeTexture);
      }
    });
    if (material instanceof THREE.ShaderMaterial) {
      Object.values(material.uniforms).forEach(uniform => {
        disposeTexture(uniform?.value);
        if (Array.isArray(uniform?.value)) {
          uniform.value.forEach(disposeTexture);
        }
      });
    }
    material.dispose();
  };
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    const points = child as THREE.Points;
    if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(disposeMaterial);
    }
    if (points.material) {
      const materials = Array.isArray(points.material) ? points.material : [points.material];
      materials.forEach(disposeMaterial);
    }
    const skinnedMesh = child as THREE.SkinnedMesh;
    if (skinnedMesh.isSkinnedMesh && !disposedSkeletons.has(skinnedMesh.skeleton)) {
      disposedSkeletons.add(skinnedMesh.skeleton);
      skinnedMesh.skeleton.dispose();
    }
  });
};

export default async function renderModel(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'glb',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const normalizedType = type.toLowerCase();
  const sourceUrl = context?.url;
  const t = createFileViewerTranslator(context?.i18n || context?.options);
  let status: ModelStatus = 'loading';
  let errorMessage = () => '';
  let objectSummary = () => t('model.state.loadingSummary');
  let autoRotate = false;
  let wireframe = false;
  let showGrid = true;
  let showAxes = true;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let controls: OrbitControls | null = null;
  let modelRoot: THREE.Object3D | null = null;
  let gridHelper: THREE.GridHelper | null = null;
  let axesHelper: THREE.AxesHelper | null = null;
  let hemisphereLight: THREE.HemisphereLight | null = null;
  let themeObserver: MutationObserver | null = null;
  let stopSystemThemeListener: (() => void) | null = null;
  let activeDarkMode: boolean | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let controlsWithEvents: OrbitControls | null = null;
  let disposed = false;
  let animationFrame = 0;
  let activeVersion = 0;
  let modelMeshCount = 0;
  let zoomBaselineDistance = 0;
  let controlsStartScale = 1;
  let mixer: THREE.AnimationMixer | null = null;
  const timer = new THREE.Timer();
  const viewStateEmitter = createFileViewerViewStateChangeEmitter();
  const zoomEmitter = createFileViewerZoomChangeEmitter();

  const root = createElement('div', 'model-viewer');
  const toolbar = createElement('div', 'model-toolbar');
  const actions = createElement('div', 'model-actions');
  const fitButton = t.text(createElement('button', undefined), 'model.toolbar.fit') as HTMLButtonElement;
  const rotateButton = t.text(createElement('button', undefined), 'model.toolbar.rotate') as HTMLButtonElement;
  const wireframeButton = t.text(createElement('button', undefined), 'model.toolbar.wireframe') as HTMLButtonElement;
  const gridButton = t.text(createElement('button', undefined), 'model.toolbar.grid') as HTMLButtonElement;
  const axesButton = t.text(createElement('button', undefined), 'model.toolbar.axes') as HTMLButtonElement;
  const meta = createElement('div', 'model-meta');
  const typeText = createElement('strong', undefined, normalizedType.toUpperCase());
  const summaryText = createElement('span');
  const stage = createElement('div', 'model-stage');
  const canvas = document.createElement('canvas');
  const state = t.text(createElement('div', 'model-state'), 'model.state.loading');
  const buttons = [fitButton, rotateButton, wireframeButton, gridButton, axesButton];

  root.dataset.modelFormat = normalizedType;
  root.dataset.modelStatus = status;
  root.dataset.modelMeshCount = '0';

  buttons.forEach(button => {
    button.type = 'button';
  });
  actions.append(fitButton, rotateButton, wireframeButton, gridButton, axesButton);
  meta.append(typeText, summaryText);
  toolbar.append(actions, meta);
  stage.append(canvas, state);
  root.append(toolbar, stage);
  target.replaceChildren(createStyle(), root);

  const readText = () => {
    if (typeof TextDecoder === 'function') {
      return new TextDecoder('utf-8').decode(buffer);
    }
    const bytes = new Uint8Array(buffer);
    let text = '';
    for (let index = 0; index < bytes.length; index += 1) {
      text += String.fromCharCode(bytes[index]);
    }
    return text;
  };
  const updateUi = () => {
    rotateButton.classList.toggle('active', autoRotate);
    wireframeButton.classList.toggle('active', wireframe);
    gridButton.classList.toggle('active', showGrid);
    axesButton.classList.toggle('active', showAxes);
    t.bind(summaryText, node => { node.textContent = objectSummary(); });
    root.dataset.modelStatus = status;
    root.dataset.modelMeshCount = String(modelMeshCount);
    state.hidden = status === 'ready';
    state.classList.toggle('error', status === 'error');
    t.bind(state, node => {
      if (status === 'error') {
        node.replaceChildren(
          createElement('strong', undefined, t('model.state.parseFailed')),
          createElement('span', undefined, errorMessage())
        );
      } else node.textContent = t('model.state.loading');
    });
  };

  const updateHelperVisibility = () => {
    if (gridHelper) {
      gridHelper.visible = showGrid;
    }
    if (axesHelper) {
      axesHelper.visible = showAxes;
    }
    updateUi();
  };

  const vectorToArray = (vector?: THREE.Vector3 | null) => {
    return vector ? [vector.x, vector.y, vector.z] : undefined;
  };

  const readVector = (value: unknown, fallback: THREE.Vector3) => {
    if (!Array.isArray(value)) {
      return fallback.clone();
    }
    const [x, y, z] = value.map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return fallback.clone();
    }
    return new THREE.Vector3(x, y, z);
  };

  const getModelScale = () => {
    if (!camera || !controls || zoomBaselineDistance <= 0) {
      return 1;
    }
    const distance = camera.position.distanceTo(controls.target);
    return distance > 0
      ? THREE.MathUtils.clamp(zoomBaselineDistance / distance, MODEL_MIN_ZOOM, MODEL_MAX_ZOOM)
      : 1;
  };

  const getModelZoomState = (): FileViewerZoomState => {
    const scale = getModelScale();
    const ready = status === 'ready' && Boolean(modelRoot && camera && controls && zoomBaselineDistance > 0);
    return {
      scale,
      label: `${Math.round(scale * 100)}%`,
      canZoomIn: ready && scale < MODEL_MAX_ZOOM - 0.001,
      canZoomOut: ready && scale > MODEL_MIN_ZOOM + 0.001,
      canReset: ready && Math.abs(scale - 1) > 0.005,
      minScale: MODEL_MIN_ZOOM,
      maxScale: MODEL_MAX_ZOOM,
    };
  };

  const setModelZoom = (
    requestedScale: number,
    source: FileViewerViewStateChangeSource = 'api',
    action: FileViewerViewStateChangeAction = 'zoom-change',
    notify = true
  ) => {
    if (!camera || !controls || zoomBaselineDistance <= 0) {
      return getModelZoomState();
    }
    const scale = THREE.MathUtils.clamp(requestedScale, MODEL_MIN_ZOOM, MODEL_MAX_ZOOM);
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-8) {
      direction.set(1, 0.62, 1);
    }
    direction.normalize();
    camera.position.copy(controls.target).addScaledVector(direction, zoomBaselineDistance / scale);
    camera.updateProjectionMatrix();
    controls.update();
    zoomEmitter.emit();
    if (notify) {
      emitViewStateChange(action, source);
    }
    return getModelZoomState();
  };

  const getModelViewState = (): FileViewerViewState => {
    const zoom = getModelZoomState();
    return {
      renderer: 'model',
      scale: zoom.scale,
      zoom,
      extra: {
        status,
        cameraPosition: vectorToArray(camera?.position),
        cameraTarget: vectorToArray(controls?.target),
        zoomBaselineDistance,
        autoRotate,
        wireframe,
        showGrid,
        showAxes,
      },
    };
  };

  const emitViewStateChange = (
    action: FileViewerViewStateChangeAction,
    source: FileViewerViewStateChangeSource = 'viewer'
  ) => {
    const state = getModelViewState();
    viewStateEmitter.emit(createFileViewerViewStateChange(state, { action, source }));
    return state;
  };

  const applyModelViewState = (
    state: FileViewerViewState,
    applyOptions: FileViewerApplyViewStateOptions = {}
  ) => {
    const source = applyOptions.source || 'api';
    const action = applyOptions.action || 'restore';
    const notify = applyOptions.notify !== false;
    const baseline = Number(state.extra?.zoomBaselineDistance);
    if (Number.isFinite(baseline) && baseline > 0) {
      zoomBaselineDistance = baseline;
    }
    const hasCameraSnapshot = Array.isArray(state.extra?.cameraPosition);
    if (camera) {
      camera.position.copy(readVector(state.extra?.cameraPosition, camera.position));
      camera.updateProjectionMatrix();
    }
    if (controls) {
      controls.target.copy(readVector(state.extra?.cameraTarget, controls.target));
      controls.update();
    }
    const requestedScale = Number(state.scale ?? state.zoom?.scale);
    if (!hasCameraSnapshot && Number.isFinite(requestedScale) && requestedScale > 0) {
      setModelZoom(requestedScale, source, action, false);
    } else {
      zoomEmitter.emit();
    }
    if (typeof state.extra?.autoRotate === 'boolean') {
      autoRotate = state.extra.autoRotate;
    }
    if (typeof state.extra?.wireframe === 'boolean') {
      wireframe = state.extra.wireframe;
      updateWireframe();
    }
    if (typeof state.extra?.showGrid === 'boolean') {
      showGrid = state.extra.showGrid;
    }
    if (typeof state.extra?.showAxes === 'boolean') {
      showAxes = state.extra.showAxes;
    }
    updateHelperVisibility();
    updateUi();
    if (notify) {
      return emitViewStateChange(action, source);
    }
    return getModelViewState();
  };

  const resize = () => {
    if (!renderer || !camera) {
      return;
    }

    syncModelViewport({
      renderer,
      camera,
      stage,
      canvas,
      devicePixelRatio: target.ownerDocument.defaultView?.devicePixelRatio || 1,
    });
  };

  const findThemeHost = () => {
    let current: Element | null = root;
    while (current) {
      if (current.hasAttribute('data-viewer-theme')) {
        return current as HTMLElement;
      }
      const parentElement: HTMLElement | null = current.parentElement as HTMLElement | null;
      if (parentElement) {
        current = parentElement;
        continue;
      }
      const nodeRoot = current.getRootNode();
      current = 'host' in nodeRoot ? (nodeRoot as ShadowRoot).host : null;
    }
    return null;
  };

  const systemThemeQuery = target.ownerDocument.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  const readDarkMode = () => {
    const themeValue = findThemeHost()?.dataset.viewerTheme || context?.options?.theme;
    const declaredTheme = themeValue === 'light' || themeValue === 'dark' || themeValue === 'system'
      ? themeValue
      : undefined;
    return resolveFileViewerColorScheme(declaredTheme, systemThemeQuery?.matches ?? false) === 'dark';
  };

  const replaceGridHelper = (darkMode: boolean) => {
    if (!scene) {
      return;
    }
    const palette = darkMode ? MODEL_THEME_PALETTES.dark : MODEL_THEME_PALETTES.light;
    const previous = gridHelper;
    const next = new THREE.GridHelper(10, 10, palette.gridCenter, palette.gridLine);
    next.visible = showGrid;
    if (previous) {
      next.scale.copy(previous.scale);
      scene.remove(previous);
      disposeObject(previous);
    }
    gridHelper = next;
    scene.add(next);
  };

  const applyModelTheme = (force = false) => {
    const darkMode = readDarkMode();
    root.dataset.modelTheme = darkMode ? 'dark' : 'light';
    if (!force && activeDarkMode === darkMode) {
      return;
    }
    activeDarkMode = darkMode;
    const palette = darkMode ? MODEL_THEME_PALETTES.dark : MODEL_THEME_PALETTES.light;
    renderer?.setClearColor(palette.background, 1);
    if (scene) {
      scene.background = new THREE.Color(palette.background);
    }
    if (hemisphereLight) {
      hemisphereLight.color.setHex(palette.hemisphereSky);
      hemisphereLight.groundColor.setHex(palette.hemisphereGround);
    }
    canvas.style.colorScheme = darkMode ? 'dark' : 'light';
    replaceGridHelper(darkMode);
  };

  const observeModelTheme = () => {
    const themeHost = findThemeHost();
    const MutationObserverCtor = target.ownerDocument.defaultView?.MutationObserver;
    if (themeHost && MutationObserverCtor) {
      themeObserver = new MutationObserverCtor(() => applyModelTheme());
      themeObserver.observe(themeHost, {
        attributes: true,
        attributeFilter: ['data-viewer-theme'],
      });
    }
    if (!systemThemeQuery) {
      return;
    }
    const onSystemThemeChange = () => applyModelTheme();
    if (typeof systemThemeQuery.addEventListener === 'function') {
      systemThemeQuery.addEventListener('change', onSystemThemeChange);
      stopSystemThemeListener = () => systemThemeQuery.removeEventListener('change', onSystemThemeChange);
    } else {
      systemThemeQuery.addListener(onSystemThemeChange);
      stopSystemThemeListener = () => systemThemeQuery.removeListener(onSystemThemeChange);
    }
  };

  const ensureScene = () => {
    const initializeTheme = !scene || !gridHelper;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        canvas,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    if (!scene) {
      scene = new THREE.Scene();

      hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xd7dee8, 2.4);
      scene.add(hemisphereLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(8, 10, 8);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
      fillLight.position.set(-7, 5, -4);
      scene.add(fillLight);

      axesHelper = new THREE.AxesHelper(3);
      scene.add(axesHelper);
    }

    if (!camera) {
      camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000);
      camera.position.set(5, 4, 6);
    }

    if (!controls && camera && renderer) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.screenSpacePanning = true;
      controls.autoRotateSpeed = 1.2;
    }

    applyModelTheme(initializeTheme);
    updateHelperVisibility();
    resize();
    if (!controls) {
      throw new Error('Failed to initialize 3D controls.');
    }
    return controls;
  };

  const clearModel = () => {
    if (modelRoot && scene) {
      mixer?.stopAllAction();
      mixer?.uncacheRoot(modelRoot);
      scene.remove(modelRoot);
      disposeObject(modelRoot);
    }
    modelRoot = null;
    modelMeshCount = 0;
    zoomBaselineDistance = 0;
    mixer = null;
    zoomEmitter.emit();
  };

  const createSurfaceMaterial = () => new THREE.MeshStandardMaterial({
    color: 0x4f8fba,
    metalness: 0.08,
    roughness: 0.78,
    side: THREE.DoubleSide,
    wireframe,
  });

  const createPointMaterial = () => new THREE.PointsMaterial({
    color: 0x1f7a8c,
    size: 0.035,
    sizeAttenuation: true,
  });

  const applyDefaultMaterials = (object: THREE.Object3D) => {
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && !mesh.material) {
        mesh.material = createSurfaceMaterial();
      }
      if (mesh.isMesh && mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => {
          if ('wireframe' in material) {
            material.wireframe = wireframe;
          }
          material.needsUpdate = true;
        });
      }
    });
  };

  const countMeshes = (object: THREE.Object3D) => {
    let meshes = 0;
    let points = 0;
    object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        meshes += 1;
      }
      if ((child as THREE.Points).isPoints) {
        points += 1;
      }
    });
    return { meshes, points };
  };

  const summarizeModel = (object: THREE.Object3D) => {
    const { meshes, points } = countMeshes(object);
    modelMeshCount = meshes;
    objectSummary = () => {
      const parts = [];
      if (meshes) parts.push(t('model.summary.meshes', { count: meshes }));
      if (points) parts.push(t('model.summary.points', { count: points }));
      return parts.length ? parts.join(' · ') : t('model.state.loaded');
    };
    updateUi();
  };

  const normalizeObject = (object: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      return {
        center: new THREE.Vector3(),
        size: new THREE.Vector3(4, 4, 4),
      };
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    object.position.sub(center);

    return {
      center: new THREE.Vector3(),
      size,
    };
  };

  const fitToView = (
    source: FileViewerViewStateChangeSource = 'viewer',
    request?: Pick<FileViewerFitRequest, 'mode' | 'padding'>
  ) => {
    if (!modelRoot || !camera || !controls) {
      return getModelZoomState();
    }

    const box = new THREE.Box3().setFromObject(modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.5);
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width || canvas.clientWidth);
    const height = Math.max(1, rect.height || canvas.clientHeight);
    const aspect = Math.max(0.01, width / height);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const verticalDistance = radius / Math.max(Math.sin(verticalFov / 2), 0.01);
    const horizontalDistance = radius / Math.max(Math.sin(horizontalFov / 2), 0.01);
    const mode = request?.mode || 'contain';
    let distance = mode === 'cover'
      ? Math.min(verticalDistance, horizontalDistance)
      : mode === 'width'
        ? horizontalDistance
        : mode === 'height'
          ? verticalDistance
          : Math.max(verticalDistance, horizontalDistance);
    const padding = Math.max(0, request?.padding ?? 28);
    const paddingRatio = THREE.MathUtils.clamp(1 - (padding * 2) / Math.min(width, height), 0.2, 1);
    distance = Math.max(distance / paddingRatio, 0.01);

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-8) {
      direction.set(1, 0.62, 1);
    }
    direction.normalize();
    zoomBaselineDistance = distance;

    camera.near = Math.max(distance / 1000, 0.01);
    camera.far = Math.max(distance * 1000, 1000);
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.minDistance = distance / MODEL_MAX_ZOOM;
    controls.maxDistance = distance / MODEL_MIN_ZOOM;
    controls.update();
    zoomEmitter.emit();
    emitViewStateChange('fit', source);
    return getModelZoomState();
  };

  const applyModelFit = (request: FileViewerFitRequest): FileViewerFitResult => {
    if (!modelRoot || !camera || !controls) {
      return {
        applied: false,
        mode: request.mode,
        resize: request.resize,
        source: request.source,
        reason: 'not-ready',
        provider: 'view-state',
      };
    }
    const zoom = fitToView(request.source, request);
    const state = getModelViewState();
    return {
      applied: true,
      mode: request.mode,
      resize: request.resize,
      scale: zoom.scale,
      source: request.source,
      provider: 'view-state',
      state,
    };
  };

  const addModelToScene = async (object: THREE.Object3D) => {
    if (!scene) {
      return;
    }

    clearModel();
    applyDefaultMaterials(object);
    const { size } = normalizeObject(object);
    modelRoot = object;
    scene.add(object);
    fitToView();
    summarizeModel(object);

    const maxSize = Math.max(size.x, size.y, size.z, 1);
    if (gridHelper) {
      gridHelper.scale.setScalar(Math.max(maxSize / 10, 1));
    }
  };

  const parseGlbOrGltf = async () => {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const resourcePath = getResourcePath(sourceUrl);
    const input = normalizedType === 'gltf' ? readText() : buffer;

    return await new Promise<THREE.Object3D>((resolve, reject) => {
      loader.parse(
        input,
        resourcePath,
        gltf => {
          if (gltf.animations?.length) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach(clip => mixer?.clipAction(clip).play());
          }
          resolve(gltf.scene);
        },
        reject
      );
    });
  };

  const parseObj = async () => {
    const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
    return new OBJLoader().parse(readText());
  };

  const parseStl = async () => {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, createSurfaceMaterial());
  };

  const parsePly = async () => {
    const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
    const geometry = new PLYLoader().parse(buffer);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, createSurfaceMaterial());
  };

  const parseFbx = async () => {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const object = new FBXLoader().parse(buffer, getResourcePath(sourceUrl));
    if (object.animations?.length) {
      mixer = new THREE.AnimationMixer(object);
      object.animations.forEach((clip: THREE.AnimationClip) => mixer?.clipAction(clip).play());
    }
    return object;
  };

  const parseDae = async () => {
    const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
    const result = new ColladaLoader().parse(readText(), getResourcePath(sourceUrl));
    if (!result?.scene) {
      throw t.error('model.error.daeEmpty');
    }
    return result.scene;
  };

  const parse3ds = async () => {
    const { TDSLoader } = await import('three/addons/loaders/TDSLoader.js');
    return new TDSLoader().parse(buffer, getResourcePath(sourceUrl));
  };

  const parse3mf = async () => {
    const { ThreeMFLoader } = await import('three/addons/loaders/3MFLoader.js');
    return new ThreeMFLoader().parse(buffer);
  };

  const parseAmf = async () => {
    const { AMFLoader } = await import('three/addons/loaders/AMFLoader.js');
    return new AMFLoader().parse(buffer);
  };

  const parseUsd = async () => {
    const { USDLoader } = await import('three/addons/loaders/USDLoader.js');
    return new USDLoader().parse(buffer);
  };

  const parseKmz = async () => {
    const { KMZLoader } = await import('three/addons/loaders/KMZLoader.js');
    return new KMZLoader().parse(buffer).scene;
  };

  const parseOcct = async (modelType: string) => {
    const modelOptions = context?.options?.model;
    const documentBaseUrl = resolveFileViewerRuntimeAssetBaseUrl(target.ownerDocument);
    const assets = resolveFileViewerModelAssetUrls(modelOptions, documentBaseUrl);
    const params = Object.fromEntries([
      ['linearUnit', modelOptions?.linearUnit],
      ['linearDeflectionType', modelOptions?.linearDeflectionType],
      ['linearDeflection', modelOptions?.linearDeflection],
      ['angularDeflection', modelOptions?.angularDeflection],
    ].filter(([, value]) => value !== undefined)) as GeometryOcctImportParams;
    const workerPreferred = modelOptions?.useWorker !== false &&
      canUseWorkerUrlFromDocument(assets.workerUrl, target.ownerDocument);
    const importOptions = {
      ...assets,
      useWorker: workerPreferred,
      timeoutMs: modelOptions?.workerTimeoutMs,
      params,
      signal: context?.signal,
    };
    root.dataset.modelImport = workerPreferred ? 'worker' : 'main-thread';
    let result;
    try {
      result = await importOcctGeometryFile(buffer, modelType, importOptions);
    } catch (workerError) {
      if (!workerPreferred || context?.signal?.aborted || !isWorkerBootstrapFailure(workerError)) {
        throw workerError;
      }
      root.dataset.modelImport = 'main-thread-fallback';
      try {
        result = await importOcctGeometryFile(buffer, modelType, {
          ...importOptions,
          useWorker: false,
        });
      } catch (fallbackError) {
        throw new Error(
          `${normalizeError(workerError)} Main-thread fallback failed: ${normalizeError(fallbackError)}`
        );
      }
    }
    return buildOcctThreeObject(result, wireframe).object;
  };

  const explainEngineeringModel = (modelType: string): never => {
    const inspection = inspectGeometryKernelFile(buffer, modelType);
    const copy = (options?: FileViewerI18nInput) => {
      const noticeT = createFileViewerTranslator(options);
      const notice = formatGeometryKernelNotice(inspection.format || modelType, resolveFileViewerLocale(options));
      const signature = inspection.signature ? noticeT('model.notice.signature', { signature: inspection.signature }) : '';
      const warnings = inspection.warnings.length ? ` ${inspection.warnings.join(' ')}` : '';
      return `${signature}${notice}${warnings}`;
    };
    throw attachFileViewerErrorMessage(new ModelPreviewNotice(copy(context?.options)), copy);
  };

  const parsePcd = async () => {
    const { PCDLoader } = await import('three/addons/loaders/PCDLoader.js');
    return (new PCDLoader() as { parse(data: ArrayBuffer, url?: string): THREE.Points }).parse(
      buffer,
      sourceUrl || 'model.pcd'
    );
  };

  const parseVrml = async () => {
    const { VRMLLoader } = await import('three/addons/loaders/VRMLLoader.js');
    return new VRMLLoader().parse(readText(), getResourcePath(sourceUrl));
  };

  const parseXyz = async () => {
    const { XYZLoader } = await import('three/addons/loaders/XYZLoader.js');
    const geometry = (new XYZLoader() as unknown as { parse(text: string): THREE.BufferGeometry }).parse(readText());
    geometry.computeBoundingSphere();
    return new THREE.Points(geometry, createPointMaterial());
  };

  const parseVtk = async () => {
    const { VTKLoader } = await import('three/addons/loaders/VTKLoader.js');
    const geometry = (new VTKLoader() as unknown as { parse(data: ArrayBuffer): THREE.BufferGeometry }).parse(buffer);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, createSurfaceMaterial());
  };

  const parseModel = (modelType: string) => {
    switch (modelType) {
      case 'glb':
      case 'gltf':
        return parseGlbOrGltf();
      case 'obj':
        return parseObj();
      case 'stl':
        return parseStl();
      case 'ply':
        return parsePly();
      case 'fbx':
        return parseFbx();
      case 'dae':
        return parseDae();
      case '3ds':
        return parse3ds();
      case '3mf':
        return parse3mf();
      case 'amf':
        return parseAmf();
      case 'usd':
      case 'usda':
      case 'usdc':
      case 'usdz':
        return parseUsd();
      case 'kmz':
        return parseKmz();
      case 'step':
      case 'stp':
      case 'iges':
      case 'igs':
      case 'brep':
        return parseOcct(modelType);
      case 'ifc':
      case '3dm':
        return explainEngineeringModel(modelType);
      case 'pcd':
        return parsePcd();
      case 'wrl':
      case 'vrml':
        return parseVrml();
      case 'xyz':
        return parseXyz();
      case 'vtk':
      case 'vtp':
        return parseVtk();
      default:
        if (isGeometryKernelFormat(modelType)) {
          return explainEngineeringModel(modelType);
        }
        throw t.error('model.error.unsupported', { type: modelType });
    }
  };

  const loadModel = async () => {
    const version = ++activeVersion;
    status = 'loading';
    errorMessage = () => '';
    modelMeshCount = 0;
    objectSummary = () => t('model.state.loadingSummary');
    updateUi();
    ensureScene();

    try {
      const object = await parseModel(normalizedType);
      if (version !== activeVersion) {
        disposeObject(object);
        return;
      }
      await addModelToScene(object);
      status = 'ready';
      updateUi();
      zoomEmitter.emit();
      emitViewStateChange('init', 'viewer');
    } catch (reason) {
      if (version !== activeVersion) {
        return;
      }
      if (context?.signal?.aborted) {
        return;
      }
      if (!(reason instanceof ModelPreviewNotice)) {
        console.error(reason);
      }
      status = 'error';
      modelMeshCount = 0;
      errorMessage = () => normalizeFileViewerErrorMessage(reason, context?.options) || t('model.error.parseFailed', { type: normalizedType.toUpperCase() });
      updateUi();
      zoomEmitter.emit();
      throw reason instanceof Error ? reason : new Error(errorMessage());
    }
  };

  const renderFrame = (timestamp?: number) => {
    if (!renderer || !scene || !camera || !controls) {
      return;
    }

    // A framework transition or a repeated File assignment can reset canvas
    // attributes without changing its CSS box. ResizeObserver will not see
    // that backing-buffer downgrade, so validate the cheap size contract on
    // each frame and resize only when the values diverge.
    resize();
    timer.update(timestamp);
    const delta = timer.getDelta();
    controls.autoRotate = autoRotate;
    controls.update(delta);
    mixer?.update(delta);
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(renderFrame);
  };

  const updateWireframe = () => {
    if (modelRoot) {
      applyDefaultMaterials(modelRoot);
    }
    updateUi();
  };

  const onControlsStart = () => {
    controlsStartScale = getModelScale();
  };

  const onControlsEnd = () => {
    const scale = getModelScale();
    if (Math.abs(scale - controlsStartScale) > 0.002) {
      zoomEmitter.emit();
      emitViewStateChange('zoom-change', 'user');
      return;
    }
    emitViewStateChange('camera-change', 'user');
  };

  fitButton.addEventListener('click', () => fitToView('user'));
  rotateButton.addEventListener('click', () => {
    autoRotate = !autoRotate;
    updateUi();
    emitViewStateChange('view-option-change', 'user');
  });
  wireframeButton.addEventListener('click', () => {
    wireframe = !wireframe;
    updateWireframe();
    emitViewStateChange('view-option-change', 'user');
  });
  gridButton.addEventListener('click', () => {
    showGrid = !showGrid;
    updateHelperVisibility();
    emitViewStateChange('view-option-change', 'user');
  });
  axesButton.addEventListener('click', () => {
    showAxes = !showAxes;
    updateHelperVisibility();
    emitViewStateChange('view-option-change', 'user');
  });

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    activeVersion += 1;
    window.cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    resizeObserver = null;
    themeObserver?.disconnect();
    themeObserver = null;
    stopSystemThemeListener?.();
    stopSystemThemeListener = null;
    clearModel();
    controlsWithEvents?.removeEventListener('start', onControlsStart);
    controlsWithEvents?.removeEventListener('end', onControlsEnd);
    controlsWithEvents = null;
    unregisterFileViewerZoomProvider(root);
    unregisterFileViewerViewStateProvider(root);
    controls?.dispose();
    controls = null;
    if (scene) {
      disposeObject(scene);
    }
    renderer?.dispose();
    renderer?.renderLists.dispose();
    renderer = null;
    timer.dispose();
    scene = null;
    camera = null;
    gridHelper = null;
    axesHelper = null;
    hemisphereLight = null;
    target.replaceChildren();
  };

  try {
    updateUi();
    controlsWithEvents = ensureScene();
    observeModelTheme();
    controlsWithEvents.addEventListener('start', onControlsStart);
    controlsWithEvents.addEventListener('end', onControlsEnd);
    registerFileViewerZoomProvider(root, {
      zoomIn: () => setModelZoom(getModelScale() * MODEL_ZOOM_STEP, 'user', 'zoom-in'),
      zoomOut: () => setModelZoom(getModelScale() / MODEL_ZOOM_STEP, 'user', 'zoom-out'),
      resetZoom: () => setModelZoom(1, 'user', 'zoom-reset'),
      setZoom: scale => setModelZoom(scale, 'api', 'zoom-change'),
      fit: applyModelFit,
      getState: getModelZoomState,
      subscribe: zoomEmitter.subscribe,
    });
    registerFileViewerViewStateProvider(root, {
      getState: getModelViewState,
      applyState: applyModelViewState,
      fit: applyModelFit,
      subscribe: viewStateEmitter.subscribe,
    });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    timer.connect(target.ownerDocument);
    renderFrame();
    await loadModel();
  } catch (error) {
    cleanup();
    throw error;
  }

  return {
    $el: root,
    unmount() {
      cleanup();
    },
  };
}
