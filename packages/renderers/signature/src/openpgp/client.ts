import type { SignatureWorkerRequest, SignatureWorkerResponse } from '../workerProtocol.js';
import type {
  OpenPgpInspectionResult,
  OpenPgpVerificationResult,
  SignatureParseLimits,
} from './types.js';

export const DEFAULT_SIGNATURE_PARSE_LIMITS: SignatureParseLimits = {
  maxInputBytes: 32 * 1024 * 1024,
  maxOutputBytes: 16 * 1024 * 1024,
  maxPacketCount: 4096,
  maxNestingDepth: 16,
  maxUserIds: 128,
  maxSubkeys: 128,
  maxSignatures: 256,
};

let nextRequestId = 0;

const mergeLimits = (limits?: Partial<SignatureParseLimits>): SignatureParseLimits => ({
  ...DEFAULT_SIGNATURE_PARSE_LIMITS,
  ...limits,
});

export class OpenPgpWorkerClient {
  private worker?: Worker;
  private readonly pending = new Map<string, {
    resolve(value: OpenPgpInspectionResult | OpenPgpVerificationResult): void;
    reject(reason?: unknown): void;
  }>();

  private ensureWorker() {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') {
      throw new Error('OpenPGP inspection requires Web Worker support.');
    }
    const worker = new Worker(new URL('../signature.worker.js', import.meta.url), {
      type: 'module',
      name: 'file-viewer-signature-openpgp',
    });
    worker.addEventListener('message', (event: MessageEvent<SignatureWorkerResponse>) => {
      const pending = this.pending.get(event.data.id);
      if (!pending) return;
      this.pending.delete(event.data.id);
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(Object.assign(new Error(event.data.error.message), { code: event.data.error.code }));
    });
    worker.addEventListener('error', event => {
      const error = new Error(event.message || 'Signature Worker failed.');
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
      worker.terminate();
      if (this.worker === worker) this.worker = undefined;
    });
    this.worker = worker;
    return worker;
  }

  private request<T extends OpenPgpInspectionResult | OpenPgpVerificationResult>(
    request: Record<string, unknown>,
    transfers: Transferable[]
  ): Promise<T> {
    const worker = this.ensureWorker();
    const id = `signature-${++nextRequestId}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: value => resolve(value as T), reject });
      worker.postMessage({ ...request, id } as SignatureWorkerRequest, transfers);
    });
  }

  inspect(input: ArrayBuffer, limits?: Partial<SignatureParseLimits>) {
    const transferable = input.slice(0);
    return this.request<OpenPgpInspectionResult>(
      { type: 'inspect', input: transferable, limits: mergeLimits(limits) },
      [transferable]
    );
  }

  classify(input: ArrayBuffer, limits?: Partial<SignatureParseLimits>) {
    const transferable = input.slice(0);
    return this.request<OpenPgpInspectionResult>(
      { type: 'classify', input: transferable, limits: mergeLimits(limits) },
      [transferable]
    );
  }

  verifyDetached(
    content: ArrayBuffer,
    signature: ArrayBuffer,
    publicKeys: ArrayBuffer[],
    limits?: Partial<SignatureParseLimits>
  ) {
    const contentTransfer = content.slice(0);
    const signatureTransfer = signature.slice(0);
    const keyTransfers = publicKeys.map(key => key.slice(0));
    return this.request<OpenPgpVerificationResult>(
      {
        type: 'verify-detached',
        content: contentTransfer,
        signature: signatureTransfer,
        publicKeys: keyTransfers,
        limits: mergeLimits(limits),
      },
      [contentTransfer, signatureTransfer, ...keyTransfers]
    );
  }

  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    const error = new DOMException('Signature Worker was terminated.', 'AbortError');
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
