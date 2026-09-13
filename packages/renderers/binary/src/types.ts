import type { FileViewerBinaryInspectorOptions } from '@file-viewer/core';

export type BinaryInspectorTemplate = 'raw' | 'png' | 'wasm' | 'elf' | 'pe' | 'macho' | 'zip' | 'java-class';

export interface BinaryInspectorNode {
  name: string;
  type: string;
  start: number;
  end: number;
  value?: string;
  children?: BinaryInspectorNode[];
}

export interface BinaryInspectorAnalysis {
  template: BinaryInspectorTemplate;
  label: string;
  byteLength: number;
  root: BinaryInspectorNode;
}

export interface BinaryInspectorLimits {
  maxFileBytes: number;
  maxParseMilliseconds: number;
  maxStructureNodes: number;
  maxStructureDepth: number;
  maxStringBytes: number;
}

export interface BinaryInspectorWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  options?: FileViewerBinaryInspectorOptions;
}

export interface BinaryInspectorWorkerResponse {
  id: number;
  ok: boolean;
  analysis?: BinaryInspectorAnalysis;
  error?: string;
}

export const DEFAULT_BINARY_INSPECTOR_LIMITS: Readonly<BinaryInspectorLimits> = Object.freeze({
  maxFileBytes: 16 * 1024 * 1024,
  maxParseMilliseconds: 5_000,
  maxStructureNodes: 512,
  maxStructureDepth: 16,
  maxStringBytes: 4 * 1024,
});

const boundedInteger = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
};

export const normalizeBinaryInspectorLimits = (
  options?: FileViewerBinaryInspectorOptions
): BinaryInspectorLimits => ({
  maxFileBytes: boundedInteger(options?.maxFileBytes, DEFAULT_BINARY_INSPECTOR_LIMITS.maxFileBytes, 1, 64 * 1024 * 1024),
  maxParseMilliseconds: boundedInteger(options?.maxParseMilliseconds, DEFAULT_BINARY_INSPECTOR_LIMITS.maxParseMilliseconds, 50, 30_000),
  maxStructureNodes: boundedInteger(options?.maxStructureNodes, DEFAULT_BINARY_INSPECTOR_LIMITS.maxStructureNodes, 1, 4_096),
  maxStructureDepth: boundedInteger(options?.maxStructureDepth, DEFAULT_BINARY_INSPECTOR_LIMITS.maxStructureDepth, 1, 64),
  maxStringBytes: boundedInteger(options?.maxStringBytes, DEFAULT_BINARY_INSPECTOR_LIMITS.maxStringBytes, 1, 64 * 1024),
});
