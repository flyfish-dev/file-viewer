import { nextTick, onBeforeUnmount, ref, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import type {
  FileViewerCadDwfLineWeightMode,
  FileViewerCadOptions,
  FileViewerCadRenderer,
  FileViewerFitMode,
  FileViewerFitResize,
  FileViewerGeoBasemapPreset,
  FileViewerModelLinearUnit,
  FileViewerModelOptions,
  FileViewerPublicApi as FileViewerExpose,
  FileViewerSpreadsheetOptions,
  FileViewerStyleIsolation,
  FileViewerThemeMode,
  FileViewerUiDensity,
  FileViewerViewState
} from '@file-viewer/core'
import { extensionOf, getFileIconMeta } from './useDemoFileTypes'

export type DemoSettingsTab = 'display' | 'toolbar' | 'formats'

export type DemoFormatSettingsSection =
  | 'current'
  | 'none'
  | 'pdf'
  | 'word'
  | 'sheet'
  | 'text'
  | 'archive'
  | 'cad'
  | 'geo'
  | 'model'
  | 'drawing'

export const resolveDemoFormatSettingsSection = (
  target: string
): Exclude<DemoFormatSettingsSection, 'current'> => {
  // Icon families cover most formats; explicit extensions disambiguate geo
  // files that intentionally share a broader visual family.
  const extension = extensionOf(target)
  const family = getFileIconMeta(target).family
  if (family === 'word') return 'word'
  if (family === 'sheet') return 'sheet'
  if (family === 'pdf') return 'pdf'
  if (family === 'text' || family === 'code') return 'text'
  if (family === 'archive') return 'archive'
  if (family === 'cad') return 'cad'
  if (['geojson', 'kml', 'kmz', 'gpx', 'shp'].includes(extension)) return 'geo'
  if (family === 'model') return 'model'
  if (family === 'drawing') return 'drawing'
  return 'none'
}

type SpreadsheetTextEncoding = NonNullable<FileViewerSpreadsheetOptions['textEncoding']>
type DemoCadFitMode = NonNullable<FileViewerCadOptions['fitMode']>
type DemoModelDeflectionType = NonNullable<FileViewerModelOptions['linearDeflectionType']>
type MaybePromise<T> = T | Promise<T>

export type DemoViewerSettings = {
  theme: FileViewerThemeMode
  styleIsolation: FileViewerStyleIsolation
  density: FileViewerUiDensity
  surfaceBackground: 'transparent' | 'auto'
  fitMode: FileViewerFitMode | 'default'
  fitResize: FileViewerFitResize
  fitPadding: number
  fitMinScale: number
  fitMaxScale: number
  watermarkEnabled: boolean
  watermarkText: string
  watermarkOpacity: number
  watermarkRotate: number
  watermarkGapX: number
  watermarkGapY: number
  watermarkFontSize: number
  watermarkColor: string
  toolbarSearch: boolean
  toolbarZoom: boolean
  toolbarDownload: boolean
  toolbarPrint: boolean
  toolbarExportHtml: boolean
  searchEnabled: boolean
  searchCaseSensitive: boolean
  searchWholeWord: boolean
  searchMaxMatches: number
  archiveCache: boolean
  archiveEntryDownload: boolean
  archiveMaxSizeMb: number
  archiveMaxEntryPreviewMb: number
  textToolbar: boolean
  textLineNumbers: boolean
  textVirtualizeAboveKb: number
  textMarkdownVirtualizeAboveKb: number
  textMaxRenderedLineKb: number
  textVirtualOverscanLines: number
  spreadsheetResizableColumns: boolean
  spreadsheetResizableRows: boolean
  spreadsheetTextEncoding: SpreadsheetTextEncoding
  spreadsheetWorkerThresholdMb: number
  pdfToolbar: boolean
  pdfNavigation: boolean
  pdfDefaultNavigationVisible: boolean
  pdfThumbnails: boolean
  pdfRotation: number
  pdfStreaming: boolean | 'same-origin'
  pdfCjkFontFallback: boolean
  pdfIdentityFontRepair: boolean
  docxProgressive: boolean
  docxVisualPagination: boolean
  docxStrictWordCompatibility: boolean
  docxAwaitLayout: boolean
  docxHideWebHiddenContent: boolean
  docxIgnoreLastRenderedPageBreak: boolean
  cadRenderer: FileViewerCadRenderer
  cadFitMode: DemoCadFitMode
  cadFitPadding: number
  cadIncludePaperSpace: boolean
  cadDwfLineWeightMode: FileViewerCadDwfLineWeightMode
  geoBasemap: FileViewerGeoBasemapPreset
  geoInferProjection: boolean
  geoPreferMapEngine: boolean
  geoFitPadding: number
  modelUseWorker: boolean
  modelWorkerTimeoutSeconds: number
  modelLinearUnit: FileViewerModelLinearUnit
  modelLinearDeflectionType: DemoModelDeflectionType
  modelLinearDeflection: number
  modelAngularDeflection: number
  drawingPreferOfficial: boolean
}

export type DemoViewerFitSettings = Pick<
  DemoViewerSettings,
  'fitMode' | 'fitResize' | 'fitPadding' | 'fitMinScale' | 'fitMaxScale'
>

export type DemoViewerWatermarkSettings = Pick<
  DemoViewerSettings,
  | 'watermarkEnabled'
  | 'watermarkText'
  | 'watermarkOpacity'
  | 'watermarkRotate'
  | 'watermarkGapX'
  | 'watermarkGapY'
  | 'watermarkFontSize'
  | 'watermarkColor'
>

export type DemoViewerSettingsApplyContext = {
  previous: DemoViewerSettings
  next: DemoViewerSettings
  needsRendererRefresh: boolean
  hasActivePreview: boolean
  previousViewState: FileViewerViewState | null
  fileViewer: FileViewerExpose | null
}

export type DemoViewerSettingsApplyResult = DemoViewerSettingsApplyContext & {
  rendererRefreshed: boolean
}

export type DemoViewerSettingsApplyErrorContext = {
  error: unknown
  previous: DemoViewerSettings
  next: DemoViewerSettings
}

export type UseDemoViewerSettingsOptions = {
  initialTheme: MaybeRefOrGetter<FileViewerThemeMode>
  initialDensity: MaybeRefOrGetter<FileViewerUiDensity>
  fileViewerRef: Ref<FileViewerExpose | null>
  hasActivePreview?: MaybeRefOrGetter<boolean>
  initialSettings?: Partial<DemoViewerSettings>
  noticeDurationMs?: number
  applyTheme?: (
    theme: FileViewerThemeMode,
    context: DemoViewerSettingsApplyContext
  ) => MaybePromise<void>
  applyDensity?: (
    density: FileViewerUiDensity,
    context: DemoViewerSettingsApplyContext
  ) => MaybePromise<void>
  applyFit?: (
    fit: DemoViewerFitSettings,
    context: DemoViewerSettingsApplyContext
  ) => MaybePromise<void>
  applyWatermark?: (
    watermark: DemoViewerWatermarkSettings,
    context: DemoViewerSettingsApplyContext
  ) => MaybePromise<void>
  beforeApply?: (context: DemoViewerSettingsApplyContext) => MaybePromise<void>
  afterApply?: (result: DemoViewerSettingsApplyResult) => MaybePromise<void>
  onApplyError?: (context: DemoViewerSettingsApplyErrorContext) => MaybePromise<void>
  onViewStateRestored?: (
    restoredState: FileViewerViewState | null,
    requestedState: FileViewerViewState
  ) => MaybePromise<void>
}

export const createDefaultViewerSettings = (
  overrides: Partial<DemoViewerSettings> = {}
): DemoViewerSettings => ({
  // Defaults should make the demo useful immediately while remaining safe for
  // local/offline files and conservative on memory-heavy formats.
  theme: 'system',
  styleIsolation: 'auto',
  density: 'comfortable',
  surfaceBackground: 'transparent',
  fitMode: 'default',
  fitResize: 'until-interaction',
  fitPadding: 24,
  fitMinScale: 0.1,
  fitMaxScale: 8,
  watermarkEnabled: false,
  watermarkText: 'File Viewer',
  watermarkOpacity: 0.16,
  watermarkRotate: -24,
  watermarkGapX: 96,
  watermarkGapY: 88,
  watermarkFontSize: 16,
  watermarkColor: '#1f7a58',
  toolbarSearch: true,
  toolbarZoom: true,
  toolbarDownload: true,
  toolbarPrint: true,
  toolbarExportHtml: true,
  searchEnabled: true,
  searchCaseSensitive: false,
  searchWholeWord: false,
  searchMaxMatches: 1000,
  archiveCache: true,
  archiveEntryDownload: true,
  archiveMaxSizeMb: 512,
  archiveMaxEntryPreviewMb: 64,
  textToolbar: true,
  textLineNumbers: false,
  textVirtualizeAboveKb: 512,
  textMarkdownVirtualizeAboveKb: 0,
  textMaxRenderedLineKb: 16,
  textVirtualOverscanLines: 12,
  spreadsheetResizableColumns: true,
  spreadsheetResizableRows: true,
  spreadsheetTextEncoding: 'auto',
  spreadsheetWorkerThresholdMb: 1,
  pdfToolbar: true,
  pdfNavigation: true,
  pdfDefaultNavigationVisible: false,
  pdfThumbnails: true,
  pdfRotation: 0,
  pdfStreaming: 'same-origin',
  pdfCjkFontFallback: true,
  pdfIdentityFontRepair: true,
  docxProgressive: true,
  docxVisualPagination: false,
  docxStrictWordCompatibility: false,
  docxAwaitLayout: true,
  // DOCX uses print layout. Word often marks cached TOC page numbers as
  // webHidden, so hiding them by default also removes the TOC leader line.
  docxHideWebHiddenContent: false,
  docxIgnoreLastRenderedPageBreak: false,
  cadRenderer: 'auto',
  cadFitMode: 'best',
  cadFitPadding: 0.92,
  cadIncludePaperSpace: false,
  cadDwfLineWeightMode: 'adaptive',
  geoBasemap: 'offline',
  geoInferProjection: true,
  geoPreferMapEngine: true,
  geoFitPadding: 32,
  modelUseWorker: true,
  modelWorkerTimeoutSeconds: 120,
  modelLinearUnit: 'millimeter',
  modelLinearDeflectionType: 'bounding_box_ratio',
  modelLinearDeflection: 0.001,
  modelAngularDeflection: 0.5,
  drawingPreferOfficial: false,
  ...overrides
})

/**
 * Options in this list are read while core or a renderer is mounted. The demo
 * remounts only for these settings; presentation-only settings stay live.
 */
export const DEMO_RENDERER_REFRESH_SETTING_KEYS = [
  'styleIsolation',
  'searchEnabled',
  'searchCaseSensitive',
  'searchWholeWord',
  'searchMaxMatches',
  'archiveCache',
  'archiveEntryDownload',
  'archiveMaxSizeMb',
  'archiveMaxEntryPreviewMb',
  'textToolbar',
  'textLineNumbers',
  'textVirtualizeAboveKb',
  'textMarkdownVirtualizeAboveKb',
  'textMaxRenderedLineKb',
  'textVirtualOverscanLines',
  'spreadsheetResizableColumns',
  'spreadsheetResizableRows',
  'spreadsheetTextEncoding',
  'spreadsheetWorkerThresholdMb',
  'pdfToolbar',
  'pdfNavigation',
  'pdfDefaultNavigationVisible',
  'pdfThumbnails',
  'pdfRotation',
  'pdfStreaming',
  'pdfCjkFontFallback',
  'pdfIdentityFontRepair',
  'docxProgressive',
  'docxVisualPagination',
  'docxStrictWordCompatibility',
  'docxAwaitLayout',
  'docxHideWebHiddenContent',
  'docxIgnoreLastRenderedPageBreak',
  'cadRenderer',
  'cadFitMode',
  'cadFitPadding',
  'cadIncludePaperSpace',
  'cadDwfLineWeightMode',
  'geoBasemap',
  'geoInferProjection',
  'geoPreferMapEngine',
  'geoFitPadding',
  'modelUseWorker',
  'modelWorkerTimeoutSeconds',
  'modelLinearUnit',
  'modelLinearDeflectionType',
  'modelLinearDeflection',
  'modelAngularDeflection',
  'drawingPreferOfficial'
] as const satisfies readonly (keyof DemoViewerSettings)[]

export const rendererSettingsChanged = (
  current: DemoViewerSettings,
  next: DemoViewerSettings
) => DEMO_RENDERER_REFRESH_SETTING_KEYS.some(key => current[key] !== next[key])

export const createDemoModelOptions = (
  settings: DemoViewerSettings,
  runtime: FileViewerModelOptions | undefined
): FileViewerModelOptions => ({
  ...runtime,
  useWorker: settings.modelUseWorker,
  workerTimeoutMs: settings.modelWorkerTimeoutSeconds * 1000,
  linearUnit: settings.modelLinearUnit,
  linearDeflectionType: settings.modelLinearDeflectionType,
  linearDeflection: settings.modelLinearDeflection,
  angularDeflection: settings.modelAngularDeflection
})

const cloneSettings = (settings: DemoViewerSettings): DemoViewerSettings => ({ ...settings })

const pickFitSettings = (settings: DemoViewerSettings): DemoViewerFitSettings => ({
  fitMode: settings.fitMode,
  fitResize: settings.fitResize,
  fitPadding: settings.fitPadding,
  fitMinScale: settings.fitMinScale,
  fitMaxScale: settings.fitMaxScale
})

const pickWatermarkSettings = (settings: DemoViewerSettings): DemoViewerWatermarkSettings => ({
  watermarkEnabled: settings.watermarkEnabled,
  watermarkText: settings.watermarkText,
  watermarkOpacity: settings.watermarkOpacity,
  watermarkRotate: settings.watermarkRotate,
  watermarkGapX: settings.watermarkGapX,
  watermarkGapY: settings.watermarkGapY,
  watermarkFontSize: settings.watermarkFontSize,
  watermarkColor: settings.watermarkColor
})

export function useDemoViewerSettings(options: UseDemoViewerSettingsOptions) {
  /**
   * Settings use a draft/apply transaction:
   *
   * - opening copies current applied values into a disposable draft;
   * - cancelling never mutates the active viewer;
   * - applying updates live shell concerns immediately;
   * - renderer-owned changes remount once and restore the previous view state.
   */
  const initialSettings = createDefaultViewerSettings({
    ...options.initialSettings,
    theme: toValue(options.initialTheme),
    density: toValue(options.initialDensity)
  })

  const settingsPanelOpen = ref(false)
  const settingsActiveTab = ref<DemoSettingsTab>('display')
  const settingsFormatSection = ref<DemoFormatSettingsSection>('current')
  const appliedViewerSettings = ref<DemoViewerSettings>(cloneSettings(initialSettings))
  const settingsDraft = ref<DemoViewerSettings>(cloneSettings(initialSettings))
  const viewerRevision = ref(0)
  const pendingViewState = ref<FileViewerViewState | null>(null)
  const settingsNoticeVisible = ref(false)
  const settingsApplying = ref(false)
  const settingsApplyError = ref<unknown>(null)

  let settingsNoticeTimer: ReturnType<typeof setTimeout> | undefined

  function syncSettingsDraft(overrides: Partial<DemoViewerSettings> = {}) {
    settingsDraft.value = {
      ...cloneSettings(appliedViewerSettings.value),
      ...overrides
    }
  }

  function openSettingsPanel(overrides: Partial<DemoViewerSettings> = {}) {
    syncSettingsDraft(overrides)
    settingsApplyError.value = null
    settingsPanelOpen.value = true
  }

  function closeSettingsPanel() {
    settingsPanelOpen.value = false
  }

  function toggleSettingsPanel(overrides: Partial<DemoViewerSettings> = {}) {
    if (settingsPanelOpen.value) {
      closeSettingsPanel()
      return false
    }
    openSettingsPanel(overrides)
    return true
  }

  function resetSettingsDraft(overrides: Partial<DemoViewerSettings> = {}) {
    settingsDraft.value = {
      ...cloneSettings(initialSettings),
      ...overrides
    }
  }

  function patchAppliedSettings(
    patch: Partial<DemoViewerSettings>,
    syncDraft = !settingsPanelOpen.value
  ) {
    // Used by quick toolbar toggles outside the settings dialog. Keep the draft
    // synchronized only when the user is not actively editing it.
    appliedViewerSettings.value = {
      ...cloneSettings(appliedViewerSettings.value),
      ...patch
    }
    if (syncDraft) {
      settingsDraft.value = {
        ...cloneSettings(settingsDraft.value),
        ...patch
      }
    }
  }

  function clearPendingViewState() {
    pendingViewState.value = null
  }

  function requestRendererRefresh(viewState: FileViewerViewState | null = null) {
    // Changing the key remounts exactly one <file-viewer>. The captured state is
    // consumed by handleViewerLoadComplete after the new provider is ready.
    pendingViewState.value = viewState
    viewerRevision.value += 1
  }

  function showSettingsNotice() {
    settingsNoticeVisible.value = true
    if (settingsNoticeTimer) {
      clearTimeout(settingsNoticeTimer)
    }
    settingsNoticeTimer = setTimeout(() => {
      settingsNoticeVisible.value = false
      settingsNoticeTimer = undefined
    }, options.noticeDurationMs ?? 1800)
  }

  async function applySettings(): Promise<DemoViewerSettingsApplyResult | null> {
    // Prevent double submission because applying may await fit operations,
    // renderer teardown and consumer callbacks.
    if (settingsApplying.value) {
      return null
    }

    const previous = cloneSettings(appliedViewerSettings.value)
    const next = cloneSettings(settingsDraft.value)
    const hasActivePreview = options.hasActivePreview === undefined
      ? Boolean(options.fileViewerRef.value)
      : Boolean(toValue(options.hasActivePreview))
    const needsRendererRefresh = rendererSettingsChanged(previous, next)
    const previousViewState = needsRendererRefresh && hasActivePreview
      ? options.fileViewerRef.value?.getViewState() || null
      : null
    const context: DemoViewerSettingsApplyContext = {
      previous,
      next,
      needsRendererRefresh,
      hasActivePreview,
      previousViewState,
      fileViewer: options.fileViewerRef.value
    }

    settingsApplying.value = true
    settingsApplyError.value = null

    try {
      await options.beforeApply?.(context)
      appliedViewerSettings.value = cloneSettings(next)

      await options.applyTheme?.(next.theme, context)
      await options.applyDensity?.(next.density, context)
      await options.applyWatermark?.(pickWatermarkSettings(next), context)

      if (options.applyFit) {
        await options.applyFit(pickFitSettings(next), context)
      } else if (!needsRendererRefresh && next.fitMode !== 'default') {
        await options.fileViewerRef.value?.fitToView({
          mode: next.fitMode,
          resize: next.fitResize,
          padding: next.fitPadding,
          minScale: next.fitMinScale,
          maxScale: next.fitMaxScale
        })
      }

      closeSettingsPanel()

      const rendererRefreshed = needsRendererRefresh && hasActivePreview
      if (rendererRefreshed) {
        // Remount only when a live preview exists. Draft configuration can be
        // changed safely before the first document is opened.
        requestRendererRefresh(previousViewState)
      }

      const result: DemoViewerSettingsApplyResult = {
        ...context,
        rendererRefreshed
      }
      showSettingsNotice()
      await options.afterApply?.(result)
      return result
    } catch (error) {
      // Roll back applied state, preserve the draft for correction, and expose
      // the original error to the panel/consumer.
      appliedViewerSettings.value = cloneSettings(previous)
      settingsApplyError.value = error
      await options.onApplyError?.({ error, previous, next })
      return null
    } finally {
      settingsApplying.value = false
    }
  }

  async function handleViewerLoadComplete() {
    // View restoration is one-shot. Clearing pending state before apply avoids
    // repeated restoration if a renderer emits load-complete more than once.
    const requestedState = pendingViewState.value
    if (!requestedState) {
      return null
    }

    await nextTick()
    const fileViewer = options.fileViewerRef.value
    if (!fileViewer) {
      return null
    }

    pendingViewState.value = null
    const restoredState = await fileViewer.applyViewState(requestedState, {
      action: 'restore',
      source: 'api'
    })
    await options.onViewStateRestored?.(restoredState, requestedState)
    return restoredState
  }

  onBeforeUnmount(() => {
    if (settingsNoticeTimer) {
      clearTimeout(settingsNoticeTimer)
      settingsNoticeTimer = undefined
    }
  })

  return {
    settingsPanelOpen,
    settingsActiveTab,
    settingsFormatSection,
    appliedViewerSettings,
    settingsDraft,
    viewerRevision,
    pendingViewState,
    settingsNoticeVisible,
    settingsApplying,
    settingsApplyError,
    syncSettingsDraft,
    openSettingsPanel,
    closeSettingsPanel,
    toggleSettingsPanel,
    resetSettingsDraft,
    patchAppliedSettings,
    rendererSettingsChanged,
    requestRendererRefresh,
    clearPendingViewState,
    showSettingsNotice,
    applySettings,
    handleViewerLoadComplete
  }
}
