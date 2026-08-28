import type { BinaryInput, CssStyleObject, MsDocWarning } from '../types.js';

const globalBuffer = (globalThis as { Buffer?: { from(input: Uint8Array): { toString(encoding: string): string } } }).Buffer;

let uniqueIdCounter = 0;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function escapeHtml(text: unknown): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function uniqueId(prefix = 'id'): string {
  uniqueIdCounter += 1;
  return `${prefix}-${uniqueIdCounter}`;
}

export function alignEven(value: number): number {
  return value % 2 === 0 ? value : value + 1;
}

function asUint8Array(input: BinaryInput): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

export function bytesToHex(bytes: BinaryInput, max = 32): string {
  const slice = asUint8Array(bytes).subarray(0, max);
  return Array.from(slice, (b) => b.toString(16).padStart(2, '0')).join(' ');
}

export function bytesToBase64(bytes: BinaryInput): string {
  const view = bytes instanceof Uint8Array ? bytes : bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (globalBuffer) {
    return globalBuffer.from(view).toString('base64');
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, Math.min(i + chunk, view.length)));
  }
  return btoa(binary);
}

export function dataUrlFromBytes(bytes: BinaryInput, mime = 'application/octet-stream'): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export function slugify(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '') || 'item';
}

export function shallowEqual<T extends Record<string, unknown>>(a: T | null | undefined, b: T | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function mergeObjects<T extends Record<string, unknown>>(...parts: Array<Partial<T> | null | undefined>): Partial<T> {
  const out: Partial<T> = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined) continue;
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export function mapObject<TInput, TOutput>(
  obj: Record<string, TInput> | null | undefined,
  mapper: (value: TInput, key: string) => TOutput,
): Record<string, TOutput> {
  const out: Record<string, TOutput> = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    out[key] = mapper(value, key);
  }
  return out;
}

export function pushWarning<TExtra extends Record<string, unknown> | undefined>(
  target: MsDocWarning[],
  message: string,
  extra?: TExtra,
): MsDocWarning {
  const warning: MsDocWarning = extra ? { message, ...extra } : { message };
  target.push(warning);
  return warning;
}

export function twipsToPx(twips: number | null | undefined, pxPerInch = 96): number | undefined {
  if (twips == null || Number.isNaN(twips)) return undefined;
  return (twips / 1440) * pxPerInch;
}

export function pointsToPx(points: number | null | undefined, pxPerInch = 96): number | undefined {
  if (points == null || Number.isNaN(points)) return undefined;
  return (points / 72) * pxPerInch;
}

export function cleanTextControlChars(text: unknown): string {
  return String(text ?? '')
    .replace(/\u000b/g, '\n')
    .replace(/\u000c/g, '\n');
}

export function groupConsecutive<T>(items: Iterable<T>, belongsTogether: (left: T, right: T) => boolean): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    if (current.length === 0) {
      current.push(item);
      continue;
    }
    if (belongsTogether(current[current.length - 1] as T, item)) {
      current.push(item);
      continue;
    }
    groups.push(current);
    current = [item];
  }
  if (current.length) groups.push(current);
  return groups;
}

export function textDecoder(label = 'utf-8'): TextDecoder {
  return new TextDecoder(label, { fatal: false });
}

export type { CssStyleObject };
