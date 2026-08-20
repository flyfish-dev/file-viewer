export type GeometryKernelFormat = 'step' | 'iges' | 'ifc' | '3dm' | 'brep';

export type GeometryKernelFamily = 'cad-brep' | 'bim-ifc' | 'rhino-3dm';

export type GeometryKernelOutput = 'three-object' | 'mesh' | 'fragments';

export type GeometryKernelConfidence = 'none' | 'low' | 'medium' | 'high';

export type GeometryKernelLocale = 'zh-CN' | 'en-US' | 'ja-JP' | 'de-DE';

export interface GeometryKernelCapability {
  readonly renderer: string;
  readonly packageName: string;
  readonly wasm: true;
  readonly output: readonly GeometryKernelOutput[];
  readonly note: string;
  readonly url: string;
}

export interface GeometryKernelRoute {
  readonly format: GeometryKernelFormat;
  readonly aliases: readonly string[];
  readonly label: string;
  readonly family: GeometryKernelFamily;
  readonly recommended: readonly GeometryKernelCapability[];
  readonly serverConversionTargets: readonly string[];
  readonly licenseNotes: readonly string[];
}

export interface GeometryKernelInspection {
  readonly format?: GeometryKernelFormat;
  readonly route?: GeometryKernelRoute;
  readonly confidence: GeometryKernelConfidence;
  readonly byteLength: number;
  readonly signature?: string;
  readonly warnings: readonly string[];
}

export type GeometryOcctFormat = 'step' | 'iges' | 'brep';

export type GeometryOcctLinearUnit =
  | 'millimeter'
  | 'centimeter'
  | 'meter'
  | 'inch'
  | 'foot';

export interface GeometryOcctImportParams {
  linearUnit?: GeometryOcctLinearUnit;
  linearDeflectionType?: 'bounding_box_ratio' | 'absolute_value';
  linearDeflection?: number;
  angularDeflection?: number;
}

export interface GeometryKernelArrayAttribute {
  array: ArrayLike<number>;
}

export interface GeometryKernelFace {
  first: number;
  last: number;
  color?: readonly number[] | null;
}

export interface GeometryKernelMesh {
  name?: string;
  color?: readonly number[];
  brep_faces?: GeometryKernelFace[];
  attributes: {
    position: GeometryKernelArrayAttribute;
    normal?: GeometryKernelArrayAttribute;
  };
  index: GeometryKernelArrayAttribute;
}

export interface GeometryKernelNode {
  name?: string;
  meshes: number[];
  children: GeometryKernelNode[];
}

export interface GeometryKernelImportResult {
  success: boolean;
  root?: GeometryKernelNode;
  meshes: GeometryKernelMesh[];
}

export interface ImportOcctGeometryOptions {
  workerUrl?: string;
  runtimeUrl?: string;
  wasmUrl: string;
  useWorker?: boolean;
  timeoutMs?: number;
  params?: GeometryOcctImportParams;
  signal?: AbortSignal;
}

interface OcctImportModule {
  ReadStepFile(content: Uint8Array, params: GeometryOcctImportParams | null): unknown;
  ReadIgesFile(content: Uint8Array, params: GeometryOcctImportParams | null): unknown;
  ReadBrepFile(content: Uint8Array, params: GeometryOcctImportParams | null): unknown;
}

const DEFAULT_OCCT_IMPORT_TIMEOUT_MS = 120_000;
const occtRuntimePromises = new Map<string, Promise<OcctImportModule>>();
let geometryWorkerRequestId = 0;

const createGeometryAbortError = (signal?: AbortSignal) => {
  if (signal?.reason instanceof Error) {
    return signal.reason;
  }
  return new DOMException('Geometry import was aborted.', 'AbortError');
};

const toOwnedBytes = (input: ArrayBuffer | Uint8Array) => {
  return input instanceof Uint8Array
    ? input.slice()
    : new Uint8Array(input.slice(0));
};

const normalizeOcctFormat = (type: string): GeometryOcctFormat => {
  const format = normalizeGeometryKernelFormat(type);
  if (format === 'step' || format === 'iges' || format === 'brep') {
    return format;
  }
  throw new Error(`No OpenCascade import route is available for ${String(type || 'unknown').toUpperCase()}.`);
};

const validateOcctResult = (value: unknown, format: GeometryOcctFormat): GeometryKernelImportResult => {
  const result = value as Partial<GeometryKernelImportResult> | null;
  if (!result?.success) {
    throw new Error(`${format.toUpperCase()} geometry parsing failed. The file may be empty, damaged, or unsupported by this OpenCascade build.`);
  }
  if (!Array.isArray(result.meshes) || result.meshes.length === 0) {
    throw new Error(`${format.toUpperCase()} geometry parsing completed without any renderable meshes.`);
  }
  return {
    success: true,
    root: result.root,
    meshes: result.meshes,
  };
};

const getOcctRuntime = (wasmUrl: string) => {
  let promise = occtRuntimePromises.get(wasmUrl);
  if (!promise) {
    promise = import('occt-import-js')
      .then(module => module.default({
        locateFile(path) {
          return path.endsWith('.wasm') ? wasmUrl : path;
        },
      }) as Promise<OcctImportModule>);
    occtRuntimePromises.set(wasmUrl, promise);
    promise.catch(() => occtRuntimePromises.delete(wasmUrl));
  }
  return promise;
};

const readOcctGeometry = (
  occt: OcctImportModule,
  format: GeometryOcctFormat,
  bytes: Uint8Array,
  params?: GeometryOcctImportParams
) => {
  switch (format) {
    case 'step':
      return occt.ReadStepFile(bytes, params || null);
    case 'iges':
      return occt.ReadIgesFile(bytes, params || null);
    case 'brep':
      return occt.ReadBrepFile(bytes, params || null);
  }
};

const importOcctGeometryOnMainThread = async (
  bytes: Uint8Array,
  format: GeometryOcctFormat,
  options: ImportOcctGeometryOptions
) => {
  if (options.signal?.aborted) {
    throw createGeometryAbortError(options.signal);
  }
  const runtime = await getOcctRuntime(options.wasmUrl);
  if (options.signal?.aborted) {
    throw createGeometryAbortError(options.signal);
  }
  const result = readOcctGeometry(runtime, format, bytes, options.params);
  if (options.signal?.aborted) {
    throw createGeometryAbortError(options.signal);
  }
  return validateOcctResult(result, format);
};

const importOcctGeometryInWorker = (
  bytes: Uint8Array,
  format: GeometryOcctFormat,
  options: ImportOcctGeometryOptions
) => new Promise<GeometryKernelImportResult>((resolve, reject) => {
  if (!options.workerUrl || !options.runtimeUrl) {
    reject(new Error('The OCCT worker and runtime URLs are required for worker-based geometry import.'));
    return;
  }
  if (options.signal?.aborted) {
    reject(createGeometryAbortError(options.signal));
    return;
  }

  const worker = new Worker(options.workerUrl);
  const requestId = `geometry-${Date.now()}-${++geometryWorkerRequestId}`;
  const timeoutMs = Math.max(1_000, options.timeoutMs || DEFAULT_OCCT_IMPORT_TIMEOUT_MS);
  let settled = false;

  const cleanup = () => {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
    worker.removeEventListener('message', onMessage);
    worker.removeEventListener('error', onError);
    worker.terminate();
  };
  const complete = (action: () => void) => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    action();
  };
  const onAbort = () => complete(() => reject(createGeometryAbortError(options.signal)));
  const onError = (event: ErrorEvent) => complete(() => reject(
    new Error(event.message || 'The OCCT geometry worker failed to load.')
  ));
  const onMessage = (event: MessageEvent) => {
    const message = event.data || {};
    if (message.id !== requestId) {
      return;
    }
    if (!message.ok) {
      complete(() => reject(new Error(message.error || `${format.toUpperCase()} geometry parsing failed.`)));
      return;
    }
    complete(() => {
      try {
        resolve(validateOcctResult(message.result, format));
      } catch (error) {
        reject(error);
      }
    });
  };
  const timeout = setTimeout(() => complete(() => reject(
    new Error(`${format.toUpperCase()} geometry parsing timed out after ${Math.round(timeoutMs / 1_000)} seconds.`)
  )), timeoutMs);

  options.signal?.addEventListener('abort', onAbort, { once: true });
  worker.addEventListener('message', onMessage);
  worker.addEventListener('error', onError);
  const transferableBuffer = bytes.buffer as ArrayBuffer;
  worker.postMessage({
    id: requestId,
    format,
    buffer: transferableBuffer,
    params: options.params || null,
    runtimeUrl: options.runtimeUrl,
    wasmUrl: options.wasmUrl,
  }, [transferableBuffer]);
});

export const importOcctGeometryFile = async (
  input: ArrayBuffer | Uint8Array,
  type: string,
  options: ImportOcctGeometryOptions
) => {
  const format = normalizeOcctFormat(type);
  const bytes = toOwnedBytes(input);
  const canUseWorker = options.useWorker !== false &&
    typeof Worker === 'function' &&
    Boolean(options.workerUrl && options.runtimeUrl);

  return canUseWorker
    ? importOcctGeometryInWorker(bytes, format, options)
    : importOcctGeometryOnMainThread(bytes, format, options);
};

const textDecoder = typeof TextDecoder === 'function'
  ? new TextDecoder('utf-8', { fatal: false })
  : undefined;

const normalizeToken = (value?: string) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/^model\//, '')
    .replace(/^application\//, '')
    .replace(/^x-/, '');
};

export const geometryKernelRoutes: readonly GeometryKernelRoute[] = [
  {
    format: 'step',
    aliases: ['step', 'stp', 'p21', 'iso-10303-21'],
    label: 'STEP / ISO 10303',
    family: 'cad-brep',
    recommended: [
      {
        renderer: 'OpenCascade / OCCT import',
        packageName: 'occt-import-js',
        wasm: true,
        output: ['three-object', 'mesh'],
        note: 'Imports STEP into mesh/JSON data in the browser; suitable as the first full preview path.',
        url: 'https://github.com/kovacsv/occt-import-js',
      },
      {
        renderer: 'OpenCascade.js',
        packageName: 'opencascade.js',
        wasm: true,
        output: ['three-object', 'mesh'],
        note: 'Full OpenCascade geometry kernel port for richer CAD workflows.',
        url: 'https://ocjs.org/',
      },
    ],
    serverConversionTargets: ['glb', 'gltf', 'stl', 'obj'],
    licenseNotes: ['Ship the OCCT and occt-import-js license files beside the self-hosted runtime and WASM assets.'],
  },
  {
    format: 'iges',
    aliases: ['iges', 'igs'],
    label: 'IGES',
    family: 'cad-brep',
    recommended: [
      {
        renderer: 'OpenCascade / OCCT import',
        packageName: 'occt-import-js',
        wasm: true,
        output: ['three-object', 'mesh'],
        note: 'Uses OCCT importers for IGES/BREP geometry and keeps the heavy runtime behind a dedicated package.',
        url: 'https://github.com/kovacsv/occt-import-js',
      },
    ],
    serverConversionTargets: ['glb', 'gltf', 'stl', 'obj'],
    licenseNotes: ['Treat CAD kernel licensing separately from the lightweight viewer core.'],
  },
  {
    format: 'brep',
    aliases: ['brep'],
    label: 'BREP',
    family: 'cad-brep',
    recommended: [
      {
        renderer: 'OpenCascade / OCCT import',
        packageName: 'occt-import-js',
        wasm: true,
        output: ['three-object', 'mesh'],
        note: 'BREP is closest to the native OCCT topology model and should share the STEP/IGES engine.',
        url: 'https://github.com/kovacsv/occt-import-js',
      },
    ],
    serverConversionTargets: ['glb', 'gltf', 'stl', 'obj'],
    licenseNotes: ['Keep OCCT WASM as an explicit renderer dependency.'],
  },
  {
    format: 'ifc',
    aliases: ['ifc', 'ifczip', 'ifcxml'],
    label: 'IFC / BuildingSMART',
    family: 'bim-ifc',
    recommended: [
      {
        renderer: 'That Open web-ifc',
        packageName: 'web-ifc',
        wasm: true,
        output: ['fragments', 'mesh'],
        note: 'Reads IFC at native speed in the browser and can be paired with Fragments for large BIM models.',
        url: 'https://github.com/thatopen/engine_web-ifc',
      },
    ],
    serverConversionTargets: ['glb', 'gltf', 'fragments'],
    licenseNotes: ['Large IFC models often need preprocessing, fragments, worker isolation, and property paging.'],
  },
  {
    format: '3dm',
    aliases: ['3dm', 'rhino'],
    label: 'Rhino 3DM / OpenNURBS',
    family: 'rhino-3dm',
    recommended: [
      {
        renderer: 'McNeel rhino3dm.js',
        packageName: 'rhino3dm',
        wasm: true,
        output: ['three-object', 'mesh'],
        note: 'Official OpenNURBS WASM binding; Three.js provides Rhino3dmLoader on top of it.',
        url: 'https://github.com/mcneel/rhino3dm',
      },
    ],
    serverConversionTargets: ['glb', 'gltf', 'obj'],
    licenseNotes: ['Ship rhino3dm.wasm only in the dedicated 3DM renderer path.'],
  },
];

const routeByAlias = new Map<string, GeometryKernelRoute>();
geometryKernelRoutes.forEach(route => {
  route.aliases.forEach(alias => routeByAlias.set(alias, route));
});

export const normalizeGeometryKernelFormat = (type?: string): GeometryKernelFormat | undefined => {
  return routeByAlias.get(normalizeToken(type))?.format;
};

export const getGeometryKernelRoute = (type?: string): GeometryKernelRoute | undefined => {
  return routeByAlias.get(normalizeToken(type));
};

export const isGeometryKernelFormat = (type?: string) => {
  return Boolean(getGeometryKernelRoute(type));
};

const toBytes = (input: ArrayBuffer | Uint8Array) => {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
};

const decodePrefix = (bytes: Uint8Array, maxLength = 8192) => {
  const slice = bytes.slice(0, Math.min(bytes.byteLength, maxLength));
  if (textDecoder) {
    return textDecoder.decode(slice);
  }
  let text = '';
  for (let index = 0; index < slice.length; index += 1) {
    text += String.fromCharCode(slice[index]);
  }
  return text;
};

const createInspection = (
  bytes: Uint8Array,
  format: GeometryKernelFormat | undefined,
  confidence: GeometryKernelConfidence,
  signature?: string,
  warnings: string[] = []
): GeometryKernelInspection => {
  const route = format ? getGeometryKernelRoute(format) : undefined;
  return {
    format,
    route,
    confidence,
    byteLength: bytes.byteLength,
    signature,
    warnings,
  };
};

export const inspectGeometryKernelFile = (
  input: ArrayBuffer | Uint8Array,
  type?: string
): GeometryKernelInspection => {
  const bytes = toBytes(input);
  const explicitFormat = normalizeGeometryKernelFormat(type);
  const prefix = decodePrefix(bytes);
  const normalizedPrefix = prefix.toUpperCase();
  const warnings: string[] = [];

  if (bytes.byteLength === 0) {
    return createInspection(bytes, explicitFormat, explicitFormat ? 'low' : 'none', undefined, ['Empty file.']);
  }

  if (
    /FILE_SCHEMA\s*\(\s*\(\s*'IFC/i.test(prefix) ||
    (normalizedPrefix.includes('IFC') && normalizedPrefix.includes('FILE_SCHEMA'))
  ) {
    return createInspection(bytes, 'ifc', 'high', 'IFC-SPF', warnings);
  }

  if (/ISO-10303-21|HEADER;\s*FILE_DESCRIPTION|DATA;\s*#\d+=/i.test(prefix)) {
    return createInspection(bytes, 'step', 'high', 'ISO-10303-21', warnings);
  }

  if (/3D GEOMETRY FILE FORMAT|OPENNURBS/i.test(prefix)) {
    return createInspection(bytes, '3dm', 'high', 'OpenNURBS 3DM', warnings);
  }

  if (/DBRep_DrawableShape|CASCADE Topology V|BREP/i.test(prefix)) {
    return createInspection(bytes, 'brep', 'medium', 'OpenCascade BREP', warnings);
  }

  const hasIgesStartSection = /^.{0,72}S\s*\d+/m.test(prefix);
  const hasIgesGlobalSection = /^.{0,72}G\s*\d+/m.test(prefix);
  if (hasIgesStartSection || hasIgesGlobalSection || /S\s+1\s*\n.{0,72}G\s+1/i.test(prefix)) {
    return createInspection(bytes, 'iges', hasIgesStartSection && hasIgesGlobalSection ? 'high' : 'medium', 'IGES section marker', warnings);
  }

  if (explicitFormat) {
    warnings.push('File signature was not fully recognized; using the provided extension or MIME hint.');
    return createInspection(bytes, explicitFormat, 'low', undefined, warnings);
  }

  return createInspection(bytes, undefined, 'none', undefined, ['No supported geometry kernel signature was detected.']);
};

export const formatGeometryKernelNotice = (
  type?: string,
  locale: GeometryKernelLocale = 'zh-CN'
) => {
  const route = getGeometryKernelRoute(type);
  const formatLabel = route?.label || String(type || 'Engineering model').toUpperCase();
  const engines = route?.recommended.map(item => item.packageName).join(' / ') || 'OpenCascade / web-ifc / rhino3dm';
  const targets = route?.serverConversionTargets.join(' / ') || 'GLB / GLTF';
  const hasNativeOcctPreview = route?.format === 'step' ||
    route?.format === 'iges' ||
    route?.format === 'brep';

  if (hasNativeOcctPreview) {
    if (locale === 'en-US') {
      return `${formatLabel} is previewed locally with the dedicated OCCT Worker/WASM path. The file stays in the browser; configure options.model only when the self-hosted assets use a custom deployment path.`;
    }
    if (locale === 'ja-JP') {
      return `${formatLabel} は専用の OCCT Worker/WASM によりブラウザー内でローカルプレビューされます。ファイルはブラウザー外へ送信されません。自己ホストしたアセットを独自のパスへ配置する場合だけ options.model を設定してください。`;
    }
    if (locale === 'de-DE') {
      return `${formatLabel} wird lokal über den eigenen OCCT-Worker/WASM-Pfad angezeigt. Die Datei bleibt im Browser; konfigurieren Sie options.model nur für selbst gehostete Assets unter einem abweichenden Pfad.`;
    }
    return `${formatLabel} 已通过独立 OCCT Worker/WASM 在浏览器本地完成预览，文件无需上传；仅当离线资源部署在自定义目录时，才需要覆盖 options.model 路径。`;
  }

  if (locale === 'en-US') {
    return `${formatLabel} requires a dedicated WebAssembly geometry kernel (${engines}) for full browser preview. Flyfish Viewer keeps these heavy runtimes outside core and the default 3D renderer install path; use the dedicated geometry engine route or convert the model to ${targets} in a private pipeline.`;
  }
  if (locale === 'ja-JP') {
    return `${formatLabel} をブラウザーで完全にプレビューするには、専用の WebAssembly 幾何カーネル（${engines}）が必要です。Flyfish Viewer は重量級ランタイムを core と既定の 3D renderer から分離しています。専用の geometry engine 経路を使うか、非公開の変換パイプラインで ${targets} へ変換してください。`;
  }
  if (locale === 'de-DE') {
    return `${formatLabel} benötigt für eine vollständige Browservorschau einen eigenen WebAssembly-Geometriekern (${engines}). Flyfish Viewer hält diese großen Laufzeiten aus core und dem standardmäßigen 3D-Renderer heraus; verwenden Sie den Geometrie-Engine-Pfad oder konvertieren Sie das Modell intern nach ${targets}.`;
  }
  return `${formatLabel} 需要独立 WebAssembly 几何内核（${engines}）才能完整浏览器预览。Flyfish Viewer 不会把这类重型运行时塞进 core 或默认 3D renderer 安装路径；请通过独立几何内核路线接入，或在私有转换链路输出 ${targets} 后预览。`;
};
