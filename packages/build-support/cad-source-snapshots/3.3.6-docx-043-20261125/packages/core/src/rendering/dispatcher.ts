import { DEFAULT_RENDERER_DEFINITIONS } from '../registry/formats';
import { createRendererRegistry } from '../registry/registry';
import { normalizeFileExtension } from '../source';
import type { RendererRegistry } from '../contracts/types';

export interface FileViewerRendererHandlerEntry<Handler> {
  rendererId: string;
  handler: Handler;
}

/**
 * Content-signature aware renderers can throw this shape when the filename
 * extension points at the wrong container. The orchestration layer follows the
 * redirect once, using the handler registered for the detected renderer id.
 */
export interface FileViewerRendererRedirectError extends Error {
  actualRendererId: string;
}

export const resolveFileViewerRendererRedirectId = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('actualRendererId' in error)) {
    return undefined;
  }
  const rendererId = String((error as { actualRendererId?: unknown }).actualRendererId || '').trim();
  return rendererId || undefined;
};

export interface CreateFileViewerRendererDispatcherOptions<Handler> {
  registry?: RendererRegistry;
  handlers: Iterable<FileViewerRendererHandlerEntry<Handler>>;
  fallbackHandler?: Handler;
  fallbackKey?: string;
}

export interface FileViewerRendererDispatcher<Handler> {
  handlersByRendererId: Map<string, Handler>;
  handlersByExtension: Map<string, Handler>;
  missingRendererIds: string[];
  get(extension: string): Handler | undefined;
  resolve(extension: string): Handler | undefined;
  has(extension: string): boolean;
  listExtensions(): string[];
}

export const createFileViewerRendererDispatcher = <Handler>({
  registry = createRendererRegistry(DEFAULT_RENDERER_DEFINITIONS),
  handlers,
  fallbackHandler,
  fallbackKey = 'error',
}: CreateFileViewerRendererDispatcherOptions<Handler>): FileViewerRendererDispatcher<Handler> => {
  const handlersByRendererId = Array.from(handlers).reduce((result, entry) => {
    result.set(entry.rendererId, entry.handler);
    return result;
  }, new Map<string, Handler>());

  const handlersByExtension = new Map<string, Handler>();
  const missingRendererIds: string[] = [];

  registry.list().forEach(definition => {
    const handler = handlersByRendererId.get(definition.id);
    if (!handler) {
      missingRendererIds.push(definition.id);
      return;
    }
    definition.extensions.forEach(extension => {
      handlersByExtension.set(normalizeFileExtension(extension), handler);
    });
  });

  if (fallbackHandler && fallbackKey) {
    handlersByExtension.set(normalizeFileExtension(fallbackKey), fallbackHandler);
  }

  const get = (extension: string) => {
    return handlersByExtension.get(normalizeFileExtension(extension));
  };

  return {
    handlersByRendererId,
    handlersByExtension,
    missingRendererIds,
    get,
    resolve(extension: string) {
      return get(extension) || (fallbackKey ? get(fallbackKey) : undefined);
    },
    has(extension: string) {
      return handlersByExtension.has(normalizeFileExtension(extension));
    },
    listExtensions() {
      return Array.from(handlersByExtension.keys()).sort();
    },
  };
};
