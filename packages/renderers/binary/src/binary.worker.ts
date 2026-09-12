import { analyzeBinary } from './parser.js';
import {
  normalizeBinaryInspectorLimits,
  type BinaryInspectorWorkerRequest,
  type BinaryInspectorWorkerResponse,
} from './types.js';

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<BinaryInspectorWorkerRequest>) => void) | null;
  postMessage: (message: BinaryInspectorWorkerResponse) => void;
};

scope.onmessage = ({ data }) => {
  const response: BinaryInspectorWorkerResponse = { id: data?.id ?? 0, ok: false };
  try {
    if (!data || !(data.buffer instanceof ArrayBuffer)) {
      throw new Error('Binary inspector Worker received an invalid request.');
    }
    response.analysis = analyzeBinary(new Uint8Array(data.buffer), normalizeBinaryInspectorLimits(data.options));
    response.ok = true;
  } catch (error) {
    response.error = error instanceof Error ? error.message : String(error);
  }
  scope.postMessage(response);
};
