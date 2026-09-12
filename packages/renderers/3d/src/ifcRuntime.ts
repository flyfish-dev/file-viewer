import {
  applyIfcSettings,
  copyIfcImporterSettings,
  copyIfcSettings,
} from "./ifcSettings.js";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import type { FileRenderContext } from "@file-viewer/core";
import type {
  IfcSelection,
  IfcViewerInstance,
  IfcViewerOptions,
} from "./ifc.js";

const css = `.fv-ifc{position:relative;display:flex;flex-direction:column;height:100%;min-height:240px;background:#f5f7fa;color:#182333;font:13px/1.5 system-ui,sans-serif}.fv-ifc *{box-sizing:border-box}.fv-ifc-toolbar{display:flex;gap:8px;align-items:center;padding:9px 12px;border-bottom:1px solid #dbe2e9;background:#fff}.fv-ifc button{font:inherit;padding:5px 10px;background:#fff;color:inherit;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer}.fv-ifc button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}.fv-ifc-toolbar span{margin-left:auto}.fv-ifc-body{display:flex;position:relative;flex:1;min-height:0}.fv-ifc-stage{position:relative;flex:1;min-width:0;min-height:200px;overflow:hidden}.fv-ifc-stage canvas{display:block;width:100%;height:100%}.fv-ifc-properties{width:260px;max-width:45%;padding:12px;overflow:auto;border-left:1px solid #dbe2e9;background:#fff;overflow-wrap:anywhere}.fv-ifc-properties[hidden]{display:none}.fv-ifc-properties h3{margin:0 0 12px}.fv-ifc-properties dt{font-weight:600;margin-top:9px}.fv-ifc-properties dd{margin:1px 0;color:#475569;white-space:pre-wrap}.fv-ifc-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;background:#f5f7fa;white-space:pre-wrap}.fv-ifc-status[hidden]{display:none}@media(max-width:560px){.fv-ifc-properties{width:180px;max-width:45%}}`;
const abortError = () =>
  new DOMException("IFC preview cancelled", "AbortError");
const attribute = (data: FRAGS.ItemData, ...names: string[]) => {
  for (const name of names) {
    const value = data[name];
    if (
      value &&
      !Array.isArray(value) &&
      "value" in value &&
      value.value != null
    )
      return String(value.value);
  }
  return "";
};
export async function renderIfc(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  context: FileRenderContext | undefined,
  options: IfcViewerOptions,
): Promise<IfcViewerInstance> {
  if (context?.signal?.aborted) throw abortError();
  const maxBytes = options.maxFileBytes ?? 512 * 1024 * 1024;
  const timeoutMs = options.loadTimeoutMs ?? 120_000;
  if (
    !Number.isFinite(maxBytes) ||
    maxBytes <= 0 ||
    buffer.byteLength > maxBytes
  )
    throw new Error("IFC input exceeds the configured size limit");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1)
    throw new Error("Invalid IFC load timeout");
  const importerSettings = copyIfcImporterSettings(options.thatOpen?.importer);
  const fragmentsSettings = copyIfcSettings(
    options.thatOpen?.fragments?.settings,
    "IFC Fragments settings",
  );
  const header = new TextDecoder().decode(buffer.slice(0, 65536));
  if (
    !/^\s*ISO-10303-21\s*;/i.test(header.replace(/^\uFEFF/, "")) ||
    !/FILE_SCHEMA\s*\(\s*\(\s*['"]IFC/i.test(header)
  )
    throw new Error("The file is not an IFC STEP document");
  if (typeof Worker === "undefined")
    throw new Error("IFC preview requires Web Workers");
  const assetBase = new URL(
    String(options.assetBaseUrl ?? "/file-viewer/vendor/ifc/"),
    target.ownerDocument.baseURI,
  );
  if (!/^https?:$/.test(assetBase.protocol))
    throw new Error("IFC assets must use a local HTTP(S) asset directory");
  if (!assetBase.pathname.endsWith("/")) assetBase.pathname += "/";
  const cn = String(context?.options?.locale || "").startsWith("zh");
  const jp = String(context?.options?.locale || "").startsWith("ja");
  const words = cn
    ? [
        "适合窗口",
        "清除选择",
        "属性",
        "正在解析 IFC…",
        "点击构件查看属性",
        "构件",
      ]
    : jp
      ? [
          "全体表示",
          "選択解除",
          "プロパティ",
          "IFC を読み込み中…",
          "要素を選択してプロパティを表示",
          "要素",
        ]
      : [
          "Fit model",
          "Clear selection",
          "Properties",
          "Loading IFC…",
          "Select an element to inspect its properties",
          "elements",
        ];
  const doc = target.ownerDocument;
  const root = doc.createElement("div");
  root.className = "fv-ifc";
  root.dataset.ifcStatus = "loading";
  const style = doc.createElement("style");
  style.textContent = css;
  const toolbar = doc.createElement("div");
  toolbar.className = "fv-ifc-toolbar";
  const button = (text: string) => {
    const value = doc.createElement("button");
    value.type = "button";
    value.textContent = text;
    return value;
  };
  const fitButton = button(words[0]);
  const clearButton = button(words[1]);
  const propertiesButton = button(words[2]);
  const summary = doc.createElement("span");
  summary.setAttribute("aria-live", "polite");
  toolbar.append(fitButton, clearButton, propertiesButton, summary);
  const body = doc.createElement("div");
  body.className = "fv-ifc-body";
  const stage = doc.createElement("div");
  stage.className = "fv-ifc-stage";
  const status = doc.createElement("div");
  status.className = "fv-ifc-status";
  status.setAttribute("role", "status");
  status.textContent = words[3];
  const properties = doc.createElement("aside");
  properties.className = "fv-ifc-properties";
  properties.hidden = options.showProperties === false;
  properties.textContent = words[4];
  propertiesButton.setAttribute("aria-expanded", String(!properties.hidden));
  stage.append(status);
  body.append(stage, properties);
  root.append(toolbar, body);
  target.replaceChildren(style, root);

  const controller = new AbortController();
  let disposed = false;
  let importWorker: Worker | undefined;
  let components: OBC.Components | undefined;
  let fragments: FRAGS.FragmentsModels | undefined;
  let world:
    | OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>
    | undefined;
  let model: FRAGS.FragmentsModel | undefined;
  const extensionCleanups: Array<() => void> = [];
  let ready = false;
  let selectionId = 0;
  let selectionQueue: Promise<unknown> = Promise.resolve();
  let updatePending = false;
  // Model identifiers are not security tokens; do not require a secure context.
  const id = `ifc-${THREE.MathUtils.generateUUID()}`;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let removeCanvasEvents = () => {};
  let removeControlEvents = () => {};
  let disposePromise: Promise<void> | undefined;
  const ensureLive = () => {
    if (disposed || controller.signal.aborted)
      throw controller.signal.reason ?? abortError();
  };
  const showError = (error: unknown) => {
    if (disposed) return;
    root.dataset.ifcStatus = "error";
    status.hidden = false;
    status.textContent = error instanceof Error ? error.message : String(error);
  };
  const update = async () => {
    if (disposed || !fragments || updatePending) return;
    updatePending = true;
    try {
      await fragments.update();
    } catch (error) {
      showError(error);
    } finally {
      updatePending = false;
    }
  };
  const unmount = (): Promise<void> => {
    if (disposePromise) return disposePromise;
    // Assign before abort/cleanup callbacks can reenter unmount(). Every caller
    // must await the same complete resource teardown, not an early promise.
    let finish!: () => void;
    let fail!: (error: unknown) => void;
    disposePromise = new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
    void (async () => {
      disposed = true;
      ready = false;
      selectionId++;
      if (!controller.signal.aborted) controller.abort(abortError());
      clearTimeout(timeout);
      importWorker?.terminate();
      importWorker = undefined;
      context?.signal?.removeEventListener("abort", onAbort);
      removeCanvasEvents();
      removeControlEvents();
      const currentComponents = components;
      components = undefined;
      const currentFragments = fragments;
      fragments = undefined;
      const cleanups = extensionCleanups.splice(0).reverse();
      root.remove();
      style.remove();

      try {
        const errors: unknown[] = [];
        for (const cleanup of cleanups) {
          try {
            cleanup();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length)
          throw new AggregateError(errors, "IFC extension cleanup failed");
      } finally {
        // Stop the frame loop before releasing worker-owned model geometry.
        if (currentComponents) currentComponents.enabled = false;
        try {
          if (currentFragments) {
            // abort() routes through the upstream connection and creates a Worker
            // for an unknown model ID. Before load(), there is nothing to abort.
            if (currentFragments.models.list.has(id))
              currentFragments.abort(id);
            await currentFragments.dispose();
          }
        } finally {
          currentComponents?.dispose();
        }
      }
    })().then(finish, fail);
    return disposePromise;
  };
  const onAbort = () => {
    void unmount().catch(() => {});
  };
  context?.signal?.addEventListener("abort", onAbort, { once: true });
  const withCancellation = <T>(promise: Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const abort = () => reject(controller.signal.reason ?? abortError());
      if (controller.signal.aborted) {
        abort();
        return;
      }
      controller.signal.addEventListener("abort", abort, { once: true });
      promise
        .then(resolve, reject)
        .finally(() => controller.signal.removeEventListener("abort", abort));
    });
  const fitToModel = async () => {
    ensureLive();
    if (!world || !model) return;
    const box = model.box.clone();
    if (box.isEmpty())
      throw new Error("IFC model contains no renderable geometry");
    const center = box.getCenter(new THREE.Vector3());
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 1);
    world.camera.three.near = Math.max(0.01, size / 10000);
    world.camera.three.far = Math.max(1000, size * 100);
    world.camera.three.updateProjectionMatrix();
    await world.camera.controls.setLookAt(
      center.x + size,
      center.y + size * 0.8,
      center.z + size,
      center.x,
      center.y,
      center.z,
      false,
    );
    await world.camera.controls.fitToBox(box, false);
    await fragments?.update(true);
  };
  const renderProperties = (selection: IfcSelection | null) => {
    properties.replaceChildren();
    if (!selection) {
      properties.textContent = words[4];
      return;
    }
    const title = doc.createElement("h3");
    title.textContent =
      selection.name || selection.entityType || String(selection.localId);
    properties.append(title);
    const list = doc.createElement("dl");
    let count = 0;
    const append = (label: string, value: unknown) => {
      if (++count > 300) return;
      const key = doc.createElement("dt");
      key.textContent = label.slice(0, 200);
      const item = doc.createElement("dd");
      item.textContent = String(value ?? "").slice(0, 2048);
      list.append(key, item);
    };
    append("IFC type", selection.entityType);
    append("GlobalId", selection.globalId);
    append("Local ID", selection.localId);
    const visit = (data: FRAGS.ItemData, prefix = "", depth = 0) => {
      if (depth > 3 || count >= 300) return;
      for (const [key, value] of Object.entries(data)) {
        if (count >= 300) break;
        if (Array.isArray(value)) {
          for (const child of value.slice(0, 30))
            visit(child, `${prefix}${key} / `, depth + 1);
        } else if (value && "value" in value) append(prefix + key, value.value);
      }
    };
    visit(selection.attributes);
    properties.append(list);
  };
  const select = (localId: number | null): Promise<IfcSelection | null> => {
    const request = ++selectionId;
    const next = selectionQueue
      .catch(() => {})
      .then(async () => {
        ensureLive();
        if (!model || !ready || request !== selectionId) return null;
        if (localId !== null && (!Number.isSafeInteger(localId) || localId < 0))
          throw new Error("Invalid IFC local ID");
        let selection: IfcSelection | null = null;
        if (localId !== null) {
          const [data] = await model.getItemsData([localId], {
            attributesDefault: true,
            relations: {
              IsDefinedBy: { attributes: true, relations: true },
              DefinesOccurrence: { attributes: false, relations: false },
            },
          });
          ensureLive();
          if (request !== selectionId) return null;
          if (!data) throw new Error("IFC item not found");
          selection = {
            localId,
            name: attribute(data, "Name"),
            globalId: attribute(data, "GlobalId", "_guid"),
            entityType: attribute(data, "_category", "type"),
            attributes: data,
          };
        }
        await model.resetHighlight();
        if (selection)
          await model.highlight([selection.localId], {
            color: new THREE.Color("#3b82f6"),
            renderedFaces: FRAGS.RenderedFaces.TWO,
            opacity: 1,
            transparent: false,
          });
        ensureLive();
        if (request !== selectionId) return null;
        root.dataset.ifcSelected = selection ? String(selection.localId) : "";
        renderProperties(selection);
        await fragments?.update(true);
        options.onSelectionChange?.(selection);
        return selection;
      });
    selectionQueue = next;
    return next;
  };
  const configureExtension = async (
    hook: () => void | (() => void) | Promise<void | (() => void)>,
  ) => {
    ensureLive();
    const pending = Promise.resolve()
      .then(() => {
        ensureLive();
        return hook();
      })
      .then((cleanup) => {
        if (cleanup !== undefined && typeof cleanup !== "function")
          throw new TypeError(
            "IFC extension hook must return a cleanup function or undefined",
          );
        if (disposed) cleanup?.();
        else if (cleanup) extensionCleanups.push(cleanup);
      });
    await withCancellation(pending);
    ensureLive();
  };
  fitButton.addEventListener("click", () => {
    void fitToModel().catch(showError);
  });
  clearButton.addEventListener("click", () => {
    void select(null).catch(showError);
  });
  propertiesButton.addEventListener("click", () => {
    properties.hidden = !properties.hidden;
    propertiesButton.setAttribute("aria-expanded", String(!properties.hidden));
  });
  fitButton.disabled = clearButton.disabled = true;
  try {
    const importResult = new Promise<Uint8Array>((resolve, reject) => {
      importWorker = new Worker(new URL("ifc-import.worker.js", assetBase), {
        type: "module",
        name: "file-viewer-ifc-import",
      });
      importWorker.onmessage = ({ data }) => {
        if (data?.kind === "progress")
          summary.textContent = `${Math.round(Math.max(0, Math.min(1, Number(data.progress) || 0)) * 100)}%`;
        else if (data?.kind === "ready" && data.bytes instanceof ArrayBuffer)
          resolve(new Uint8Array(data.bytes));
        else if (data?.kind === "error")
          reject(new Error(`IFC import failed: ${String(data.message)}`));
      };
      importWorker.onerror = (event) =>
        reject(
          new Error(
            `IFC worker failed. Install the self-hosted assets at ${assetBase.href}: ${event.message}`,
          ),
        );
      importWorker.onmessageerror = () =>
        reject(new Error("Invalid IFC worker response"));
      const copy = buffer.slice(0);
      importWorker.postMessage(
        { bytes: copy, wasmPath: assetBase.href, importerSettings },
        [copy],
      );
    });
    timeout = setTimeout(() => {
      controller.abort(new Error("IFC loading timed out"));
      onAbort();
    }, timeoutMs);
    const bytes = await withCancellation(importResult);
    ensureLive();
    importWorker?.terminate();
    importWorker = undefined;
    components = new OBC.Components();
    world = components
      .get(OBC.Worlds)
      .create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, stage, {
      antialias: true,
      alpha: false,
    });
    world.renderer.showLogo = false;
    world.renderer.three.setPixelRatio(
      Math.min(target.ownerDocument.defaultView?.devicePixelRatio || 1, 2),
    );
    world.camera = new OBC.SimpleCamera(components);
    world.scene.setup({ backgroundColor: new THREE.Color("#f5f7fa") });
    components.init();
    fragments = new FRAGS.FragmentsModels(
      new URL("fragments.worker.mjs", assetBase).href,
      { maxWorkers: 2 },
    );
    applyIfcSettings(fragments.settings, fragmentsSettings);
    if (options.configureRuntime) {
      await configureExtension(() =>
        options.configureRuntime!({
          components: components!,
          fragments: fragments!,
          world: world!,
          signal: controller.signal,
        }),
      );
    }
    model = await withCancellation(fragments.load(bytes, { modelId: id }));
    ensureLive();
    model.useCamera(world.camera.three);
    world.scene.three.add(model.object);
    world.camera.controls.addEventListener("update", update);
    removeControlEvents = () =>
      world?.camera.controls.removeEventListener("update", update);
    const ids = await withCancellation(model.getItemsIdsWithGeometry());
    ensureLive();
    if (!ids.length)
      throw new Error("IFC model contains no renderable geometry");
    root.dataset.ifcElementCount = String(ids.length);
    root.dataset.ifcFirstElement = String(ids[0]);
    summary.textContent = `${ids.length} ${words[5]}`;
    if (options.fitToModel !== false) await withCancellation(fitToModel());
    ready = true;
    const canvas = world.renderer.three.domElement;
    let start: { x: number; y: number } | undefined;
    const down = (event: PointerEvent) => {
      if (event.button === 0) start = { x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      const original = start;
      start = undefined;
      if (
        !original ||
        options.enableSelection === false ||
        Math.hypot(event.clientX - original.x, event.clientY - original.y) >
          5 ||
        !model ||
        !world
      )
        return;
      // Fragment raycasting takes client-pixel coordinates, not normalized NDC.
      void model
        .raycast({
          camera: world.camera.three,
          mouse: new THREE.Vector2(event.clientX, event.clientY),
          dom: canvas,
        })
        .then((hit) => {
          if (!disposed) return select(hit?.localId ?? null);
        })
        .catch(showError);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    removeCanvasEvents = () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
    };
    if (options.configure) {
      await configureExtension(() =>
        options.configure!({
          components: components!,
          fragments: fragments!,
          world: world!,
          model: model!,
          signal: controller.signal,
          select,
        }),
      );
    }
    clearTimeout(timeout);
    root.dataset.ifcStatus = "ready";
    status.hidden = true;
    fitButton.disabled = false;
    clearButton.disabled = options.enableSelection === false;
    context?.onProgressiveRender?.();
    return { $el: root, unmount, fitToModel, select };
  } catch (error) {
    const cancelled = context?.signal?.aborted || !target.contains(root);
    const message = error instanceof Error ? error.message : String(error);
    await unmount().catch(() => {});
    if (!cancelled) {
      root.dataset.ifcStatus = "error";
      status.textContent = message;
      status.hidden = false;
      // Retain a helpful error surface without retaining any workers or WebGL resources.
      stage.replaceChildren(status);
      target.replaceChildren(style, root);
    }
    throw error;
  }
}
