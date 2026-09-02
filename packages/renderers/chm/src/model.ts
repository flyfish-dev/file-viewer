import type { FileViewerChmOptions as CoreFileViewerChmOptions } from '@file-viewer/core';

export interface ChmTopic {
  title: string;
  path: string;
  contextId?: number;
}

export interface ChmNavigationNode {
  title: string;
  path?: string;
  children: ChmNavigationNode[];
  keyword?: string;
}

export interface ChmEntry {
  path: string;
  size: number;
  section?: number;
}

export interface ChmManifest {
  title: string;
  homePath: string;
  encoding: string;
  language?: string;
  topics: ChmTopic[];
  contents: ChmNavigationNode[];
  index: ChmNavigationNode[];
  hasBinaryToc: boolean;
  hasBinaryIndex: boolean;
  hasFullTextIndex: boolean;
}

export interface ChmSearchHit {
  title: string;
  path: string;
  snippet: string;
  titleMatch: boolean;
}

export type FileViewerChmOptions = CoreFileViewerChmOptions;

export interface ChmParseLimits {
  maxArchiveBytes: number;
  /** Rust compatibility alias retained until all published WASM runtimes use maxArchiveBytes. */
  maxFileBytes: number;
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalDecompressedBytes: number;
  /** Declared-content ceiling used before any LZX entry is read. */
  maxTotalDeclaredBytes: number;
  maxMetadataBytes: number;
  maxSitemapNodes: number;
  maxSitemapDepth: number;
}

export const DEFAULT_CHM_OPTIONS = Object.freeze({
  workerTimeoutMs: 60_000,
  maxArchiveBytes: 320 * 1024 * 1024,
  maxEntries: 50_000,
  maxEntryBytes: 32 * 1024 * 1024,
  maxTotalDecompressedBytes: 512 * 1024 * 1024,
  maxHtmlBytes: 16 * 1024 * 1024,
  maxSearchTopics: 10_000,
  maxSearchResults: 200,
} satisfies Required<Pick<
  FileViewerChmOptions,
  | 'workerTimeoutMs'
  | 'maxArchiveBytes'
  | 'maxEntries'
  | 'maxEntryBytes'
  | 'maxTotalDecompressedBytes'
  | 'maxHtmlBytes'
  | 'maxSearchTopics'
  | 'maxSearchResults'
>>);

const MIB = 1024 * 1024;

export const CHM_HARD_LIMITS = Object.freeze({
  maxArchiveBytes: 1024 * MIB,
  maxEntries: 250_000,
  maxEntryBytes: 512 * MIB,
  maxTotalDecompressedBytes: 8 * 1024 * MIB,
  maxHtmlBytes: 64 * MIB,
});

const finiteLimit = (
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (!Number.isFinite(value) || value == null) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
};

export const resolveChmOptions = (options?: FileViewerChmOptions) => ({
  workerTimeoutMs: finiteLimit(options?.workerTimeoutMs, DEFAULT_CHM_OPTIONS.workerTimeoutMs, 1_000),
  maxArchiveBytes: finiteLimit(
    options?.maxArchiveBytes,
    DEFAULT_CHM_OPTIONS.maxArchiveBytes,
    1,
    CHM_HARD_LIMITS.maxArchiveBytes
  ),
  maxEntries: finiteLimit(
    options?.maxEntries,
    DEFAULT_CHM_OPTIONS.maxEntries,
    1,
    CHM_HARD_LIMITS.maxEntries
  ),
  maxEntryBytes: finiteLimit(
    options?.maxEntryBytes,
    DEFAULT_CHM_OPTIONS.maxEntryBytes,
    1,
    CHM_HARD_LIMITS.maxEntryBytes
  ),
  maxTotalDecompressedBytes: finiteLimit(
    options?.maxTotalDecompressedBytes,
    DEFAULT_CHM_OPTIONS.maxTotalDecompressedBytes,
    1,
    CHM_HARD_LIMITS.maxTotalDecompressedBytes
  ),
  maxHtmlBytes: finiteLimit(
    options?.maxHtmlBytes,
    DEFAULT_CHM_OPTIONS.maxHtmlBytes,
    1,
    CHM_HARD_LIMITS.maxHtmlBytes
  ),
  maxSearchTopics: finiteLimit(options?.maxSearchTopics, DEFAULT_CHM_OPTIONS.maxSearchTopics, 1),
  maxSearchResults: finiteLimit(options?.maxSearchResults, DEFAULT_CHM_OPTIONS.maxSearchResults, 1),
});

const stringValue = (value: unknown) => typeof value === 'string' ? value : '';
const numberValue = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const booleanValue = (value: unknown) => value === true;

const normalizeTopic = (value: unknown): ChmTopic | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const path = stringValue(source.path || source.local || source.url);
  if (!path) return null;
  return {
    title: stringValue(source.title || source.name) || path,
    path,
    contextId: numberValue(source.contextId ?? source.context_id),
  };
};

const normalizeNavigationNodes = (value: unknown): ChmNavigationNode[] => {
  if (!Array.isArray(value)) return [];
  const roots: ChmNavigationNode[] = [];
  const queue: Array<{ source: unknown; target: ChmNavigationNode[] }> = [];
  for (let index = value.length - 1; index >= 0; index -= 1) {
    queue.push({ source: value[index], target: roots });
  }
  while (queue.length) {
    const current = queue.pop();
    if (!current?.source || typeof current.source !== 'object') continue;
    const source = current.source as Record<string, unknown>;
    const children: ChmNavigationNode[] = [];
    const node: ChmNavigationNode = {
      title: stringValue(source.title || source.name || source.keyword) || stringValue(source.path || source.local),
      path: stringValue(source.path || source.local || source.url) || undefined,
      keyword: stringValue(source.keyword) || undefined,
      children,
    };
    current.target.push(node);
    const aliases = Array.isArray(source.locals)
      ? source.locals.filter((item): item is string => typeof item === 'string' && Boolean(item))
      : [];
    if (!node.path && aliases.length) node.path = aliases[0];
    for (let index = node.path ? 1 : 0; index < aliases.length; index += 1) {
      children.push({ title: `${node.title} · ${index + 1}`, path: aliases[index], children: [] });
    }
    const sourceChildren = Array.isArray(source.children) ? source.children : [];
    for (let index = sourceChildren.length - 1; index >= 0; index -= 1) {
      queue.push({ source: sourceChildren[index], target: children });
    }
  }
  return roots;
};

export const normalizeChmManifest = (value: unknown): ChmManifest => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const topics = Array.isArray(source.topics)
    ? source.topics.map(normalizeTopic).filter((topic): topic is ChmTopic => Boolean(topic))
    : [];
  return {
    title: stringValue(source.title),
    homePath: stringValue(source.homePath ?? source.home_path),
    encoding: stringValue(source.encoding) || 'windows-1252',
    language: stringValue(source.language) || undefined,
    topics,
    contents: normalizeNavigationNodes(source.contents ?? source.toc),
    index: normalizeNavigationNodes(source.index ?? source.keywords),
    hasBinaryToc: booleanValue(source.hasBinaryToc ?? source.has_binary_toc),
    hasBinaryIndex: booleanValue(source.hasBinaryIndex ?? source.has_binary_index),
    hasFullTextIndex: booleanValue(source.hasFullTextIndex ?? source.has_full_text_index)
      || Boolean(source.fullTextIndex && typeof source.fullTextIndex === 'object'
        && (source.fullTextIndex as Record<string, unknown>).available),
  };
};

export const normalizeChmEntries = (value: unknown): ChmEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Record<string, unknown>;
    const path = stringValue(source.path || source.name);
    if (!path) return [];
    return [{
      path,
      size: numberValue(source.size ?? source.length ?? source.byteLength ?? source.byte_length) ?? 0,
      section: numberValue(source.section),
    }];
  });
};
