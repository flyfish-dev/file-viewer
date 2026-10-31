import type { BinaryInput, ParseOptions, PptDocument, WorkerProgress } from './types.js';
export interface PptWorkerLike {
    postMessage(message: unknown, transfer?: Transferable[]): void;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    terminate(): void;
}
export declare class PptWorkerClient {
    private worker;
    private seq;
    private pending;
    private destroyed;
    constructor(worker: PptWorkerLike);
    static create(url?: string | URL): PptWorkerClient;
    private onMessage;
    private onError;
    private onMessageError;
    private fail;
    private dispose;
    /** Safe default: never detaches a caller-owned ArrayBuffer or a typed-array sibling. */
    parse(input: BinaryInput, options?: ParseOptions, onProgress?: (progress: WorkerProgress) => void): Promise<PptDocument>;
    /** Ownership-transfer variant: caller explicitly hands over this full buffer. */
    parseOwned(buffer: ArrayBuffer, options?: ParseOptions, onProgress?: (progress: WorkerProgress) => void): Promise<PptDocument>;
    destroy(): void;
}
