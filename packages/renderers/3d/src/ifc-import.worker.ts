import { IfcImporter } from "@thatopen/fragments";

// Compiled into a self-hosted module Worker by the optional asset installer.
const scope = globalThis as unknown as {
  onmessage:
    | ((event: MessageEvent<{ bytes: ArrayBuffer; wasmPath: string }>) => void)
    | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};
let active = false;
scope.onmessage = async ({ data }) => {
  if (active) return;
  active = true;
  try {
    const importer = new IfcImporter();
    importer.wasm = { path: data.wasmPath, absolute: true };
    importer.webIfcSettings = { COORDINATE_TO_ORIGIN: true };
    importer.includeUniqueAttributes = true;
    importer.includeRelationNames = true;
    const result = await importer.process({
      bytes: new Uint8Array(data.bytes),
      progressCallback: (progress) =>
        scope.postMessage({ kind: "progress", progress }),
    });
    // slice owns the exact byte range even when the importer returns a view.
    const bytes = Uint8Array.from(result).buffer;
    scope.postMessage({ kind: "ready", bytes }, [bytes]);
  } catch (error) {
    scope.postMessage({
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
