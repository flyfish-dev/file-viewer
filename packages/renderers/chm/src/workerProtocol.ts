import type { ChmEntry, ChmManifest, ChmParseLimits, ChmSearchHit } from './model.js';

export type ChmWorkerRequest =
  | {
      id: number;
      type: 'open';
      buffer: ArrayBuffer;
      moduleUrl: string;
      wasmUrl: string;
      limits: ChmParseLimits;
    }
  | { id: number; type: 'read'; path: string }
  | { id: number; type: 'search'; query: string; limit: number; maxTopics: number }
  | { id: number; type: 'close' };

export type ChmWorkerResponse =
  | { id: number; ok: true; type: 'open'; manifest: ChmManifest; entries: ChmEntry[] }
  | { id: number; ok: true; type: 'read'; data: Uint8Array }
  | { id: number; ok: true; type: 'search'; hits: ChmSearchHit[]; inspected: number; truncated: boolean }
  | { id: number; ok: true; type: 'close' }
  | { id: number; ok: false; type: ChmWorkerRequest['type']; error: { name: string; message: string; code?: string } }
  | { id: 0; ok: true; type: 'progress'; phase: 'wasm' | 'directory' | 'manifest' | 'search'; current: number; total?: number };

export interface ChmOpenResult {
  manifest: ChmManifest;
  entries: ChmEntry[];
}

export interface ChmSearchResult {
  hits: ChmSearchHit[];
  inspected: number;
  truncated: boolean;
}
