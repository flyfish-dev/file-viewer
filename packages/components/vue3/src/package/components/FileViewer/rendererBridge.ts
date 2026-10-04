import {
  collectFileViewerRendererPlugins,
  createFileRenderHandlerLoader,
  createFileRenderHandlerRendererSession,
  createFileViewerCoreRendererRegistry,
  createRendererRegistry,
  installFileViewerRendererPlugins,
  listFileViewerAutoRendererPresets,
  normalizeSource,
  renderFileViewerHandler,
  resolveFileViewerRendererPresetInputs,
  resolveFileViewerRendererDefinition,
  syncFileViewerRenderSurfaceBackground,
  type FileRenderContext,
  type FileRenderHandler,
  type FileRenderHandlerRendererSession,
  type FileViewerRenderedInstance as Rendered,
  type FileViewerRendererPluginInput,
  type FileViewerRendererPresetInput,
  type RendererRegistry,
} from '@file-viewer/core'
import { vueRendererDispatcher, vueRendererRegistry } from '../../vendors/renders'

export type FileViewerVueRenderSession = FileRenderHandlerRendererSession<Rendered | undefined>
export type FileViewerVueSearchAvailabilityListener = (available: boolean) => void

type VueRenderHandler = FileRenderHandler<Rendered, HTMLDivElement>
type VueRendererPresetInput = FileViewerRendererPresetInput<VueRenderHandler>

const resolveAutoRenderersEnabled = (options: FileRenderContext['options'] = {}) => {
  const setting = options.autoRenderers
  if (typeof setting === 'boolean') {
    return setting
  }
  if (setting?.enabled !== undefined) {
    return setting.enabled
  }
  return (options.rendererMode || 'extend') !== 'replace'
}

const createRendererRegistryForContext = async (
  context?: FileRenderContext
): Promise<RendererRegistry> => {
  const options = context?.options || {}
  const registry = options.rendererMode === 'replace'
    ? createRendererRegistry([])
    : createFileViewerCoreRendererRegistry({
        builtinRenderers: options.builtinRenderers
      }).registry
  const rendererInputs: FileViewerRendererPluginInput<VueRenderHandler>[] = []

  if (resolveAutoRenderersEnabled(options)) {
    rendererInputs.push(...listFileViewerAutoRendererPresets<VueRenderHandler>())
  }

  const presetInput = options.preset as unknown as VueRendererPresetInput | undefined
  const presetsInput = options.presets as unknown as VueRendererPresetInput | undefined
  rendererInputs.push(
    ...resolveFileViewerRendererPresetInputs<VueRenderHandler>(presetInput),
    ...resolveFileViewerRendererPresetInputs<VueRenderHandler>(presetsInput)
  )

  if (options.renderers) {
    rendererInputs.push(options.renderers as FileViewerRendererPluginInput<VueRenderHandler>)
  }

  const plugins = collectFileViewerRendererPlugins<VueRenderHandler>(rendererInputs)

  if (!plugins.length) {
    return registry
  }

  await installFileViewerRendererPlugins({
    registry,
    plugins,
    registerHandler: registration => {
      const definition = registry.getById(registration.rendererId)
      if (!definition) return

      registry.register({
        ...definition,
        load: createFileRenderHandlerLoader({
          handler: registration.handler,
          rendererId: definition.id,
          allowUrlSource: definition.sourceAccess === 'stream-preferred',
          getTarget: loadContext => loadContext.surface.container as HTMLDivElement
        })
      })
    }
  })

  return registry
}

/**
 * Bridges the Vue renderer registry into the framework-neutral core renderer session.
 *
 * The Vue component package owns only lifecycle and the DOM surface. The actual renderer
 * registry is rebuilt from the current options for every load, so presets such as
 * @file-viewer/preset-all work in the native Vue component path without falling back to
 * the static core-only registry.
 */
export async function createVueRenderSession(
  buffer: ArrayBuffer,
  type: string,
  target: HTMLDivElement,
  context?: FileRenderContext,
  onSearchAvailabilityChange?: FileViewerVueSearchAvailabilityListener
): Promise<FileViewerVueRenderSession> {
  syncFileViewerRenderSurfaceBackground(target, context?.options)
  const registry = await createRendererRegistryForContext(context)
  const renderer = resolveFileViewerRendererDefinition(registry, {
    filename: context?.filename,
    extension: type
  }) || resolveFileViewerRendererDefinition(vueRendererRegistry, {
    filename: context?.filename,
    extension: type
  })
  onSearchAvailabilityChange?.(!!renderer?.load && !!renderer.capabilities?.search)

  if (renderer?.load) {
    return await renderer.load({
      source: normalizeSource({
        buffer,
        filename: context?.filename || `preview.${type}`,
        type,
        url: context?.url
      }),
      surface: {
        container: target,
        shadowRoot: context?.surface?.shadowRoot,
        styleIsolation: context?.surface?.styleIsolation
      },
      options: context?.options || {},
      registerExportAdapter: context?.registerExportAdapter,
      renderContext: context
    }) as FileRenderHandlerRendererSession<Rendered>
  }

  const rendered = await renderFileViewerHandler<Rendered | undefined, HTMLDivElement>({
    dispatcher: vueRendererDispatcher,
    buffer,
    target,
    type,
    context
  })
  return createFileRenderHandlerRendererSession(rendered)
}
