// Browser renderer strategy registry.
//
// Each entry lazy-loads a concrete renderer only after its format is selected.
// Keep renderer-specific dependencies inside the leaf renderer files so the
// core shell and framework wrappers stay fast on first load.
import { DEFAULT_RENDERER_DEFINITIONS } from '../registry/formats';
import { createFileRenderHandlerRegistry } from '../rendering/handler';
import { createFileViewerRendererDispatcher } from '../rendering/dispatcher';
import { createFileViewerUnsupportedState } from '../viewer/state';
import type {
  FileViewerBuiltinRendererPreset,
  FileRenderContext,
  FileRenderHandler,
  FileViewerRenderedInstance,
} from '../contracts/types';

type CoreBrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

interface CoreBrowserRendererHandlerEntry {
  rendererId: string;
  handler: CoreBrowserRendererHandler;
}

const createWrapper = (el: HTMLDivElement): FileViewerRenderedInstance => ({
  $el: el,
  unmount() {
    // DOM renderers clean themselves up through their own returned instance.
  },
});

export const coreBrowserRendererHandlers: readonly CoreBrowserRendererHandlerEntry[] = [
  {
    rendererId: 'image',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderImage } = await import('./image');
      return renderImage(buffer, target, type, context);
    },
  },
];

export const CORE_LITE_RENDERER_IDS = [
  'image',
] as const;

export const coreLiteBrowserRendererHandlers = coreBrowserRendererHandlers.filter(handler =>
  CORE_LITE_RENDERER_IDS.includes(handler.rendererId as typeof CORE_LITE_RENDERER_IDS[number])
);

export const coreLiteRendererDefinitions = DEFAULT_RENDERER_DEFINITIONS.filter(definition =>
  CORE_LITE_RENDERER_IDS.includes(definition.id as typeof CORE_LITE_RENDERER_IDS[number])
);

export interface CreateFileViewerCoreRendererRegistryOptions {
  builtinRenderers?: FileViewerBuiltinRendererPreset;
}

const resolveCoreRendererDefinitions = (preset: FileViewerBuiltinRendererPreset) => {
  if (preset === 'none') {
    return [];
  }
  if (preset === 'lite') {
    return coreLiteRendererDefinitions;
  }
  return DEFAULT_RENDERER_DEFINITIONS;
};

const resolveCoreRendererHandlers = (preset: FileViewerBuiltinRendererPreset) => {
  if (preset === 'none') {
    return [];
  }
  if (preset === 'lite') {
    return coreLiteBrowserRendererHandlers;
  }
  return coreBrowserRendererHandlers;
};

const renderUnsupported: CoreBrowserRendererHandler = async (_buffer, target, type, context) => {
  const state = createFileViewerUnsupportedState(type, undefined, context?.options);
  const wrapper = document.createElement('div');
  wrapper.style.textAlign = 'center';
  wrapper.style.marginTop = '80px';

  const message = document.createElement('div');
  message.textContent = state.message;
  wrapper.appendChild(message);

  if (state.description) {
    const description = document.createElement('div');
    description.textContent = state.description;
    wrapper.appendChild(description);
  }

  target.replaceChildren(wrapper);
  return createWrapper(target);
};

export const createFileViewerCoreRendererRegistry = (
  options: CreateFileViewerCoreRendererRegistryOptions = {}
) => {
  const preset = options.builtinRenderers || 'all';
  const bridge = createFileRenderHandlerRegistry({
    definitions: resolveCoreRendererDefinitions(preset),
    handlers: resolveCoreRendererHandlers(preset),
  });

  return {
    ...bridge,
    dispatcher: createFileViewerRendererDispatcher({
      registry: bridge.registry,
      handlers: coreBrowserRendererHandlers,
      fallbackHandler: renderUnsupported,
    }),
  };
};

export const fileViewerCoreRendererRegistryBridge = createFileViewerCoreRendererRegistry();
export const fileViewerCoreRendererRegistry = fileViewerCoreRendererRegistryBridge.registry;
export const fileViewerCoreRendererDispatcher = fileViewerCoreRendererRegistryBridge.dispatcher;
export const missingFileViewerCoreRendererHandlers = fileViewerCoreRendererRegistryBridge.missingRendererIds;
