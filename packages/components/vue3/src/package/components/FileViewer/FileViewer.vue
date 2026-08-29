<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import {
  Archive,
  AudioLines,
  Binary,
  BookOpenText,
  Box,
  BrainCircuit,
  CircuitBoard,
  ChevronDown,
  ChevronUp,
  Database,
  DraftingCompass,
  File,
  FileCode2,
  FileImage,
  FileText,
  GitBranch,
  Globe2,
  HardDrive,
  Mail,
  MapPinned,
  Moon,
  NotebookTabs,
  Palette,
  Presentation,
  RotateCcw,
  ScanLine,
  Search as SearchIcon,
  Shapes,
  ShieldCheck,
  Sun,
  Table2,
  Type,
  Video,
  X,
  ZoomIn,
  ZoomOut
} from '@lucide/vue'
import {
  createFileViewerTranslator,
  createFileViewerRequestScope,
  FILE_VIEWER_RENDER_SURFACE_BACKGROUND_PROPERTY,
  normalizeFileViewerRenderSurfaceBackground,
  reportFileViewerLifecycleHookError,
  reportFileViewerOperationError,
  resolveFileViewerColorScheme,
  syncFileViewerRenderSurfaceBackground,
  toggleFileViewerColorScheme
} from '@file-viewer/core'
import type {
  FileViewerComponentEmits as FileViewerEmits,
  FileViewerComponentProps as FileViewerProps,
  FileViewerOptions,
  FileViewerResolvedThemeMode
} from '@file-viewer/core'
import { useLoading } from './hooks/useLoading'
import { useViewerDocumentFeatures } from './hooks/useViewerDocumentFeatures'
import { useViewerExport } from './hooks/useViewerExport'
import { useViewerFit } from './hooks/useViewerFit'
import { useViewerLifecycle } from './hooks/useViewerLifecycle'
import { useViewerErrorState, useViewerPresentation } from './hooks/useViewerPresentation'
import { useViewerPreviewLifecycle } from './hooks/useViewerPreviewLifecycle'
import { useViewerPublicApi } from './hooks/useViewerPublicApi'
import { useViewerRenderSurface } from './hooks/useViewerRenderSurface'
import { useViewerSourceLoading } from './hooks/useViewerSourceLoading'
import { useViewerToolbar } from './hooks/useViewerToolbar'
import { useViewerViewState } from './hooks/useViewerViewState'
import { useViewerWatermark } from './hooks/useViewerWatermark'
import { useViewerZoom } from './hooks/useViewerZoom'
import { resolveViewerReadinessPresentation } from './hooks/viewerReadinessPresentation'
import {
  resolveFileViewerLoadingVisual,
  type FileViewerLoadingVisualFamily
} from './loadingVisual'
import type { FileViewerToolbarSlotProps } from '../../common/type'

const props = defineProps<FileViewerProps>()

const emit = defineEmits<FileViewerEmits>()

const slots = defineSlots<{
  'toolbar-start'?: (props: FileViewerToolbarSlotProps) => unknown
  'toolbar-end'?: (props: FileViewerToolbarSlotProps) => unknown
}>()

const filename = ref('')
const output = ref<HTMLDivElement | null>(null)
const currentFile = ref<File | null>(null)
const currentBuffer = ref<ArrayBuffer | null>(null)
const currentSourceUrl = ref<string | null>(null)
const manualViewerTheme = ref<FileViewerResolvedThemeMode | null>(null)
const viewerColorSchemeQuery = typeof globalThis.matchMedia === 'function'
  ? globalThis.matchMedia('(prefers-color-scheme: dark)')
  : null
const systemPrefersDark = ref(viewerColorSchemeQuery?.matches ?? false)
const handleViewerColorSchemeChange = (event: MediaQueryListEvent) => {
  systemPrefersDark.value = event.matches
}

onMounted(() => viewerColorSchemeQuery?.addEventListener?.('change', handleViewerColorSchemeChange))
onBeforeUnmount(() => viewerColorSchemeQuery?.removeEventListener?.('change', handleViewerColorSchemeChange))

const effectiveOptions = computed<FileViewerOptions | undefined>(() => {
  if (!manualViewerTheme.value) {
    return props.options
  }
  return {
    ...(props.options || {}),
    theme: manualViewerTheme.value
  }
})

watch(() => props.options?.theme, () => {
  manualViewerTheme.value = null
})

const viewerLabels = computed(() => {
  const t = createFileViewerTranslator(effectiveOptions.value)
  return {
    zoomGroup: t('toolbar.zoomGroup'),
    zoomOut: t('toolbar.zoomOut'),
    zoomIn: t('toolbar.zoomIn'),
    zoomReset: t('toolbar.zoomReset'),
    download: t('toolbar.download'),
    downloadTitle: t('toolbar.downloadTitle'),
    print: t('toolbar.print'),
    printTitle: t('toolbar.printTitle'),
    printDirect: t('toolbar.printDirect'),
    printMask: t('toolbar.printMask'),
    printMaskTitle: t('toolbar.printMaskTitle'),
    exportHtml: t('toolbar.exportHtml'),
    exportHtmlTitle: t('toolbar.exportHtmlTitle'),
    search: t('toolbar.search'),
    searchPlaceholder: t('toolbar.searchPlaceholder'),
    searchPrevious: t('toolbar.searchPrevious'),
    searchNext: t('toolbar.searchNext'),
    searchClear: t('toolbar.searchClear'),
    themeToLight: t('toolbar.themeToLight'),
    themeToDark: t('toolbar.themeToDark')
  }
})
const printMenuOpen = ref(false)
const {
  searchState,
  refreshDocumentIndex,
  clearDocumentState,
  getScrollContainer,
  searchDocument,
  clearDocumentSearch,
  nextSearchResult,
  previousSearchResult,
  getSearchState,
  collectDocumentAnchors,
  scrollToAnchor,
  scrollToLine,
  getDocumentTextChunks
} = useViewerDocumentFeatures({
  output,
  getOptions: () => effectiveOptions.value,
  emitSearchChange: state => emit('search-change', state),
  emitLocationChange: anchor => emit('location-change', anchor)
})

const {
  displayFilename,
  currentExtend,
  normalizedToolbar,
  viewerTheme,
  viewerDensity,
  formatErrorMessage
} = useViewerPresentation({
  filename,
  getFile: () => props.file,
  getUrl: () => props.url,
  getSourceFilename: () => props.filename || props.name,
  getOptions: () => effectiveOptions.value
})

const {
  watermarkStyle,
  watermarkInlineStyle
} = useViewerWatermark(() => effectiveOptions.value?.watermark)

const {
  loading,
  error,
  message,
  theme: loadingTheme,
  styleVars: loadingVars,
  startLoading,
  setLoadingMessage,
  stopLoading,
  showError,
  clearError,
  resetLoading
} = useLoading(currentExtend, () => effectiveOptions.value)

const LOADING_ICONS: Readonly<Record<FileViewerLoadingVisualFamily, Component>> = Object.freeze({
  word: FileText,
  sheet: Table2,
  slide: Presentation,
  pdf: FileText,
  layout: FileText,
  archive: Archive,
  email: Mail,
  eda: CircuitBoard,
  cad: DraftingCompass,
  model: Box,
  geo: MapPinned,
  drawing: Shapes,
  mindmap: BrainCircuit,
  ebook: BookOpenText,
  image: FileImage,
  medical: ScanLine,
  security: ShieldCheck,
  text: FileText,
  code: FileCode2,
  repository: GitBranch,
  notebook: NotebookTabs,
  web: Globe2,
  video: Video,
  audio: AudioLines,
  font: Type,
  design: Palette,
  data: Database,
  binary: Binary,
  generic: HardDrive
})

const loadingVisual = computed(() => resolveFileViewerLoadingVisual(currentExtend.value))
const loadingIcon = computed<Component>(() => LOADING_ICONS[loadingVisual.value.family])

const viewerRootStyle = computed(() => {
  const background = normalizeFileViewerRenderSurfaceBackground(
    effectiveOptions.value?.ui?.surfaceBackground
  )
  return {
    ...loadingVars.value,
    '--viewer-accent': loadingVisual.value.accent,
    '--viewer-accent-secondary': loadingVisual.value.accentSecondary,
    '--viewer-soft': loadingVisual.value.soft,
    '--viewer-glow': loadingVisual.value.glow,
    ...(background
      ? { [FILE_VIEWER_RENDER_SURFACE_BACKGROUND_PROPERTY]: background }
      : {})
  }
})

watch(() => effectiveOptions.value?.ui?.surfaceBackground, async () => {
  await nextTick()
  syncFileViewerRenderSurfaceBackground(output.value, effectiveOptions.value)
  Array.from(output.value?.children || []).forEach(child => {
    syncFileViewerRenderSurfaceBackground(child as HTMLElement, effectiveOptions.value)
  })
}, { immediate: true })

const errorState = useViewerErrorState({
  currentExtend,
  error,
  loadingTheme,
  getOptions: () => effectiveOptions.value
})

const {
  requestController,
  getCurrentVersion,
  isCurrentRequest
} = createFileViewerRequestScope()

const {
  markLoadStarted,
  clearLoadStarted,
  notifyLifecycle,
  notifyActiveUnloadStart,
  notifyActiveUnloadComplete,
  setActiveDocumentContext,
  clearActiveDocumentContext,
  buildLoadStartState,
  buildRenderCompleteState,
  runBeforeOperation
} = useViewerLifecycle({
  getOptions: () => effectiveOptions.value,
  getFilename: () => filename.value,
  getBufferSize: () => currentBuffer.value?.byteLength,
  getCurrentFile: () => currentFile.value,
  getCurrentVersion,
  getFallbackFile: () => props.file,
  getFallbackUrl: () => props.url,
  emitLifecycle: emit,
  emitOperationBefore: context => emit('operation-before', context),
  emitOperationCancel: context => emit('operation-cancel', context),
  formatErrorMessage,
  handleLifecycleError: (nextError, context) => {
    reportFileViewerLifecycleHookError({ error: nextError, context })
  },
  handleOperationError: (nextError, context) => {
    reportFileViewerOperationError({ error: nextError, context })
  },
  onOperationErrorMessage: showError
})

const {
  zoomState,
  refreshZoomProvider,
  startZoomObserver,
  stopZoomObserver,
  clearZoomProvider,
  zoomIn,
  zoomOut,
  resetZoom,
  getZoomState
} = useViewerZoom({
  output,
  enabled: () => true,
  runBeforeOperation
})

const {
  refreshViewStateProvider,
  startViewStateObserver,
  stopViewStateObserver,
  clearViewStateProvider,
  getViewState,
  applyViewState
} = useViewerViewState({
  output,
  emitViewStateChange: change => {
    if (
      (change.source === 'user' || change.source === 'api') &&
      change.action !== 'fit'
    ) {
      markFitUserInteraction()
    }
    emit('view-state-change', change)
  }
})

const {
  startFitObserver,
  stopFitObserver,
  markFitUserInteraction,
  applyInitialFit,
  fitToView
} = useViewerFit({
  output,
  getOptions: () => effectiveOptions.value,
  refreshZoomProvider,
  refreshViewStateProvider,
  emitFitChange: result => emit('fit-change', result)
})

const {
  activeExportAdapter,
  rendererSearchAvailable,
  renderedReady,
  progressiveReady,
  clearRenderedContent,
  destroyRenderSession,
  mountRenderedContent,
  setActiveRenderSession
} = useViewerRenderSurface({
  output,
  getOptions: () => effectiveOptions.value,
  isCurrentRequest,
  notifyActiveUnloadStart,
  notifyActiveUnloadComplete,
  clearActiveDocumentContext,
  clearDocumentState,
  refreshDocumentIndex,
  startZoomObserver,
  stopZoomObserver,
  clearZoomProvider,
  refreshZoomProvider,
  startFitObserver,
  stopFitObserver,
  applyInitialFit,
  startViewStateObserver,
  stopViewStateObserver,
  clearViewStateProvider,
  refreshViewStateProvider
})

const {
  operationAvailability,
  visibleToolbar,
  toolbarOrder,
  showToolbar: showBuiltInToolbar,
  toolbarPosition,
  toolbarDisabled,
  zoomButtonDisabled
} = useViewerToolbar({
  activeExportAdapter,
  currentBuffer,
  currentExtend,
  currentFile,
  currentSourceUrl,
  error,
  getOptions: () => effectiveOptions.value,
  getZoomState,
  loading,
  normalizedToolbar,
  rendererSearchAvailable,
  renderedReady,
  zoomState,
  emitOperationAvailabilityChange: availability => emit('operation-availability-change', availability),
  emitZoomChange: state => emit('zoom-change', state)
})

const hasToolbarSlots = computed(() => {
  return Boolean(slots['toolbar-start'] || slots['toolbar-end'])
})
const showToolbar = computed(() => showBuiltInToolbar.value || hasToolbarSlots.value)
const toolbarSearchQuery = ref('')
const searchToolbarDisabled = computed(() => toolbarDisabled.value || !renderedReady.value)
const readinessPresentation = computed(() => resolveViewerReadinessPresentation({
  loading: loading.value,
  progressiveReady: progressiveReady.value,
  renderedReady: renderedReady.value,
  hasError: Boolean(error.value)
}))

watch(() => searchState.query, query => {
  if (toolbarSearchQuery.value !== query) {
    toolbarSearchQuery.value = query
  }
})

const runToolbarSearch = async () => {
  const query = toolbarSearchQuery.value.trim()
  toolbarSearchQuery.value = query
  if (!query) {
    return clearDocumentSearch()
  }
  return searchDocument(query)
}

const clearToolbarSearch = async () => {
  toolbarSearchQuery.value = ''
  return clearDocumentSearch()
}

const {
  cancelPreview,
  refreshPreview
} = useViewerSourceLoading({
  getFile: () => props.file,
  getUrl: () => props.url,
  getSourceFilename: () => props.filename || props.name,
  getOptions: () => effectiveOptions.value,
  filename,
  currentFile,
  currentBuffer,
  currentSourceUrl,
  renderedReady,
  progressiveReady,
  requestController,
  clearRenderedContent,
  mountRenderedContent,
  destroyRenderSession,
  setActiveRenderSession,
  buildLoadStartState,
  buildRenderCompleteState,
  notifyLifecycle,
  setActiveDocumentContext,
  markLoadStarted,
  clearLoadStarted,
  startLoading,
  setLoadingMessage,
  stopLoading,
  showError,
  clearError,
  resetLoading,
  formatErrorMessage
})

let externalThemeRefreshSequence = 0
watch(
  [() => props.options?.theme, () => systemPrefersDark.value],
  async ([nextTheme, nextSystemDark], [previousTheme, previousSystemDark]) => {
    const nextScheme = resolveFileViewerColorScheme(nextTheme, nextSystemDark)
    const previousScheme = resolveFileViewerColorScheme(previousTheme, previousSystemDark)
    if (nextScheme === previousScheme || (!props.file && !props.url)) {
      return
    }

    // Semantic renderers such as DOCX and spreadsheets resolve authored colors
    // while rendering. Re-render them when the host changes theme, then restore
    // the user's position instead of applying a visual filter to the document.
    const sequence = externalThemeRefreshSequence += 1
    const previousViewState = getViewState()
    await nextTick()
    await refreshPreview()
    if (sequence === externalThemeRefreshSequence && previousViewState) {
      await applyViewState(previousViewState, {
        action: 'restore',
        source: 'api'
      })
    }
  },
  { flush: 'post' }
)

const {
  downloadOriginalFile,
  exportRenderedHtml,
  printRenderedHtml,
  printWithMask
} = useViewerExport({
  activeExportAdapter,
  currentBuffer,
  currentFile,
  currentSourceUrl,
  displayFilename,
  formatErrorMessage,
  getOptions: () => effectiveOptions.value,
  operationAvailability,
  output,
  runBeforeOperation,
  showError,
  watermarkInlineStyle
})

const zoomInByUser = async () => {
  markFitUserInteraction()
  return zoomIn()
}

const zoomOutByUser = async () => {
  markFitUserInteraction()
  return zoomOut()
}

const resetZoomByUser = async () => {
  markFitUserInteraction()
  return resetZoom()
}

const resolvedViewerTheme = computed(() => {
  return resolveFileViewerColorScheme(viewerTheme.value, systemPrefersDark.value)
})
const themeButtonTitle = computed(() => {
  return resolvedViewerTheme.value === 'dark'
    ? viewerLabels.value.themeToLight
    : viewerLabels.value.themeToDark
})

const toggleViewerTheme = async () => {
  const previousViewState = getViewState()
  const nextTheme = toggleFileViewerColorScheme(viewerTheme.value, systemPrefersDark.value)
  manualViewerTheme.value = nextTheme
  emit('theme-change', nextTheme)
  await nextTick()
  if (props.file || props.url) {
    await refreshPreview()
    if (previousViewState) {
      await applyViewState(previousViewState, {
        action: 'restore',
        source: 'api'
      })
    }
  }
}

const closePrintMenu = () => {
  printMenuOpen.value = false
}

const togglePrintMenu = () => {
  if (toolbarDisabled.value) {
    return
  }
  printMenuOpen.value = !printMenuOpen.value
}

const printDirect = async () => {
  closePrintMenu()
  await printRenderedHtml()
}

const printWithMaskAction = async () => {
  closePrintMenu()
  await printWithMask()
}

const destroyViewer = () => {
  cancelPreview('component-unmount')
  resetLoading()
  stopZoomObserver()
  stopFitObserver()
  stopViewStateObserver()
}

const publicApi = useViewerPublicApi({
  destroy: () => {
    destroyViewer()
  },
  downloadOriginalFile,
  printRenderedHtml,
  printWithMask,
  exportRenderedHtml,
  zoomIn: zoomInByUser,
  zoomOut: zoomOutByUser,
  resetZoom: resetZoomByUser,
  fitToView,
  getZoomState,
  getViewState,
  applyViewState: async (state, options) => {
    markFitUserInteraction()
    return applyViewState(state, options)
  },
  operationAvailability,
  getScrollContainer,
  searchDocument,
  clearDocumentSearch,
  nextSearchResult,
  previousSearchResult,
  getSearchState,
  collectDocumentAnchors,
  scrollToAnchor,
  scrollToLine,
  getDocumentTextChunks
})

defineExpose(publicApi)

useViewerPreviewLifecycle({
  getFile: () => props.file,
  getUrl: () => props.url,
  getSourceFilename: () => props.filename || props.name,
  refreshPreview,
  cancelPreview,
  clearRenderedContent,
  resetLoading,
  stopZoomObserver,
  stopFitObserver,
  stopViewStateObserver
})
</script>

<template>
  <div
    class='file-viewer'
    part='shell'
    :data-viewer-theme='viewerTheme'
    :data-viewer-density='viewerDensity'
    :style='viewerRootStyle'
  >
    <div class='viewer-stage' part='stage'>
      <div
        v-if='showToolbar'
        class='viewer-actions'
        part='toolbar'
        :class='{ "viewer-actions--floating": toolbarPosition === "bottom-right" }'
        :data-toolbar-position='toolbarPosition'
      >
        <div
          v-if='slots["toolbar-start"]'
          class='viewer-toolbar-slot viewer-toolbar-slot--start'
          part='toolbar-slot toolbar-start'
        >
          <slot
            name='toolbar-start'
            :api='publicApi'
            :availability='operationAvailability'
            :zoom-state='zoomState'
            :search-state='searchState'
          />
        </div>
        <template v-for='toolbarItem in toolbarOrder' :key='toolbarItem'>
          <div
            v-if='toolbarItem === "search" && visibleToolbar.search'
            class='viewer-actions-group viewer-search-actions'
            part='toolbar-group search-group'
            role='search'
            :aria-label='viewerLabels.search'
          >
            <form class='viewer-search-form' @submit.prevent='runToolbarSearch'>
              <input
                v-model='toolbarSearchQuery'
                class='viewer-search-input'
                part='search-input'
                type='search'
                :disabled='searchToolbarDisabled'
                :placeholder='viewerLabels.searchPlaceholder'
                :aria-label='viewerLabels.searchPlaceholder'
                @keydown.esc.stop.prevent='clearToolbarSearch'
              >
              <button
                type='submit'
                class='viewer-icon-button'
                part='button search-submit-button'
                :disabled='searchToolbarDisabled || !toolbarSearchQuery.trim()'
                :title='viewerLabels.search'
                :aria-label='viewerLabels.search'
              >
                <SearchIcon :size='14' :stroke-width='2.4' />
              </button>
            </form>
            <span
              class='viewer-search-count'
              part='search-count'
              aria-live='polite'
            >
              {{ searchState.total > 0 ? `${searchState.currentIndex + 1}/${searchState.total}` : '0/0' }}
            </span>
            <button
              type='button'
              class='viewer-icon-button'
              part='button search-previous-button'
              :disabled='searchToolbarDisabled || searchState.total === 0'
              :title='viewerLabels.searchPrevious'
              :aria-label='viewerLabels.searchPrevious'
              @click='previousSearchResult'
            >
              <ChevronUp :size='14' :stroke-width='2.4' />
            </button>
            <button
              type='button'
              class='viewer-icon-button'
              part='button search-next-button'
              :disabled='searchToolbarDisabled || searchState.total === 0'
              :title='viewerLabels.searchNext'
              :aria-label='viewerLabels.searchNext'
              @click='nextSearchResult'
            >
              <ChevronDown :size='14' :stroke-width='2.4' />
            </button>
            <button
              v-if='toolbarSearchQuery || searchState.query'
              type='button'
              class='viewer-icon-button'
              part='button search-clear-button'
              :disabled='toolbarDisabled'
              :title='viewerLabels.searchClear'
              :aria-label='viewerLabels.searchClear'
              @click='clearToolbarSearch'
            >
              <X :size='14' :stroke-width='2.4' />
            </button>
          </div>
          <div
            v-else-if='toolbarItem === "zoom" && visibleToolbar.zoom'
            class='viewer-actions-group viewer-zoom-actions'
            part='toolbar-group zoom-group'
            :aria-label='viewerLabels.zoomGroup'
          >
            <button
              v-if='operationAvailability.zoomOut'
              type='button'
              class='viewer-icon-button'
              part='button zoom-out-button'
              :disabled='zoomButtonDisabled("canZoomOut")'
              :title='viewerLabels.zoomOut'
              :aria-label='viewerLabels.zoomOut'
              @click='zoomOutByUser'
            >
              <ZoomOut :size='15' :stroke-width='2.4' />
            </button>
            <button
              v-if='operationAvailability.zoomReset'
              type='button'
              class='viewer-zoom-meter'
              part='button zoom-meter'
              :disabled='zoomButtonDisabled("canReset")'
              :title='viewerLabels.zoomReset'
              @click='resetZoomByUser'
            >
              {{ zoomState.label }}
            </button>
            <span
              v-else
              class='viewer-zoom-meter viewer-zoom-meter--readonly'
              part='zoom-meter'
              :title='zoomState.label'
              :aria-label='zoomState.label'
            >
              {{ zoomState.label }}
            </span>
            <button
              v-if='operationAvailability.zoomIn'
              type='button'
              class='viewer-icon-button'
              part='button zoom-in-button'
              :disabled='zoomButtonDisabled("canZoomIn")'
              :title='viewerLabels.zoomIn'
              :aria-label='viewerLabels.zoomIn'
              @click='zoomInByUser'
            >
              <ZoomIn :size='15' :stroke-width='2.4' />
            </button>
            <button
              v-if='operationAvailability.zoomReset'
              type='button'
              class='viewer-icon-button'
              part='button zoom-reset-button'
              :disabled='zoomButtonDisabled("canReset")'
              :title='viewerLabels.zoomReset'
              :aria-label='viewerLabels.zoomReset'
              @click='resetZoomByUser'
            >
              <RotateCcw :size='14' :stroke-width='2.4' />
            </button>
          </div>
          <button
            v-else-if='toolbarItem === "download" && visibleToolbar.download'
            type='button'
            part='button download-button'
            :disabled='toolbarDisabled'
            :title='viewerLabels.downloadTitle'
            @click='downloadOriginalFile'
          >
            {{ viewerLabels.download }}
          </button>
          <div
            v-else-if='toolbarItem === "print" && visibleToolbar.print'
            class='viewer-print-menu'
            part='print-menu'
            :data-open='printMenuOpen ? "true" : "false"'
            @focusout='event => {
              const next = event.relatedTarget as Node | null
              if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
                closePrintMenu()
              }
            }'
          >
            <button
              type='button'
              part='button print-button'
              :disabled='toolbarDisabled'
              :title='viewerLabels.printTitle'
              :aria-label='viewerLabels.printTitle'
              :aria-haspopup='true'
              :aria-expanded='printMenuOpen'
              @click='togglePrintMenu'
            >
              {{ viewerLabels.print }}
            </button>
            <div class='viewer-print-menu-panel' part='print-menu-panel' role='menu'>
              <button
                type='button'
                role='menuitem'
                part='button print-direct-button'
                :disabled='toolbarDisabled'
                :title='viewerLabels.printTitle'
                @click='printDirect'
              >
                {{ viewerLabels.printDirect }}
              </button>
              <button
                type='button'
                role='menuitem'
                part='button print-mask-button'
                :disabled='toolbarDisabled'
                :title='viewerLabels.printMaskTitle'
                @click='printWithMaskAction'
              >
                {{ viewerLabels.printMask }}
              </button>
            </div>
          </div>
          <button
            v-else-if='toolbarItem === "exportHtml" && visibleToolbar.exportHtml'
            type='button'
            part='button export-button'
            :disabled='toolbarDisabled'
            :title='viewerLabels.exportHtmlTitle'
            @click='exportRenderedHtml'
          >
            {{ viewerLabels.exportHtml }}
          </button>
          <button
            v-else-if='toolbarItem === "theme" && visibleToolbar.theme'
            type='button'
            class='viewer-icon-button viewer-theme-button'
            part='button theme-button'
            :title='themeButtonTitle'
            :aria-label='themeButtonTitle'
            :aria-pressed='resolvedViewerTheme === "dark"'
            :disabled='toolbarDisabled'
            @click='toggleViewerTheme'
          >
            <Sun v-if='resolvedViewerTheme === "dark"' :size='15' :stroke-width='2.3' />
            <Moon v-else :size='15' :stroke-width='2.3' />
          </button>
        </template>
        <div
          v-if='slots["toolbar-end"]'
          class='viewer-toolbar-slot viewer-toolbar-slot--end'
          part='toolbar-slot toolbar-end'
        >
          <slot
            name='toolbar-end'
            :api='publicApi'
            :availability='operationAvailability'
            :zoom-state='zoomState'
            :search-state='searchState'
          />
        </div>
      </div>
      <div class='viewer-content-shell' part='content-shell'>
        <div ref='output' class='content' part='content' data-viewer-scroll-root='true' :class='{ hidden: readinessPresentation.contentHidden }' />
        <div v-if='watermarkStyle' class='viewer-watermark' part='watermark' :style='watermarkStyle' />

        <div v-if='readinessPresentation.loadingStateVisible' class='state-panel loading-panel' part='state-panel loading-state'>
          <div class='loading-card' part='state-card' :data-loading-family='loadingVisual.family'>
            <div class='loading-visual' aria-hidden='true'>
              <span class='loading-aura' />
              <span class='loading-orbit'>
                <i />
                <i />
              </span>
              <div class='loading-icon'>
                <File class='loading-icon__sheet' :stroke-width='1.25' />
                <component :is='loadingIcon' class='loading-icon__glyph' :stroke-width='1.85' />
                <span class='loading-icon__extension'>{{ loadingVisual.extensionLabel }}</span>
                <span class='loading-icon__scan' />
              </div>
            </div>
            <div class='loading-copy'>
              <span class='loading-kicker'>{{ loadingTheme.label }}</span>
              <strong>{{ message }}</strong>
              <p>{{ loadingTheme.hint }}</p>
              <span class='loading-progress' aria-hidden='true'><i /></span>
            </div>
          </div>
        </div>

        <div v-else-if='error' class='state-panel error-panel' part='state-panel error-state'>
          <div class='error-card' part='state-card'>
            <strong>{{ errorState.title }}</strong>
            <p>{{ errorState.message }}</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.file-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  --_file-viewer-toolbar-gap: var(--file-viewer-toolbar-gap, 6px);
  --_file-viewer-toolbar-min-height: var(--file-viewer-toolbar-min-height, 45px);
  --_file-viewer-toolbar-padding: var(--file-viewer-toolbar-padding, 6px 10px);
  --_file-viewer-toolbar-floating-offset: var(--file-viewer-toolbar-floating-offset, 16px);
  --_file-viewer-toolbar-floating-min-height: var(--file-viewer-toolbar-floating-min-height, 42px);
  --_file-viewer-toolbar-floating-padding: var(--file-viewer-toolbar-floating-padding, 6px);
  --_file-viewer-toolbar-group-gap: var(--file-viewer-group-gap, var(--file-viewer-toolbar-group-gap, 2px));
  --_file-viewer-toolbar-group-padding: var(--file-viewer-group-padding, var(--file-viewer-toolbar-group-padding, 2px));
  --_file-viewer-toolbar-button-min-width: var(--file-viewer-button-min-width, var(--file-viewer-toolbar-button-min-width, 42px));
  --_file-viewer-toolbar-button-height: var(--file-viewer-button-height, var(--file-viewer-toolbar-button-height, 30px));
  --_file-viewer-toolbar-button-padding: var(--file-viewer-button-padding, var(--file-viewer-toolbar-button-padding, 0 10px));
  --_file-viewer-toolbar-button-radius: var(--file-viewer-button-radius, var(--file-viewer-toolbar-button-radius, 8px));
  --_file-viewer-toolbar-icon-size: var(--file-viewer-icon-button-size, var(--file-viewer-toolbar-icon-size, 30px));
  --_file-viewer-toolbar-meter-min-width: var(--file-viewer-zoom-meter-min-width, var(--file-viewer-toolbar-meter-min-width, 48px));
  --_file-viewer-toolbar-meter-padding: var(--file-viewer-zoom-meter-padding, var(--file-viewer-toolbar-meter-padding, 0 8px));
  --_file-viewer-toolbar-floating-button-min-width: var(--file-viewer-floating-button-min-width, var(--file-viewer-toolbar-floating-button-min-width, 48px));
  --_file-viewer-toolbar-floating-button-height: var(--file-viewer-floating-button-height, var(--file-viewer-toolbar-floating-button-height, 32px));
  --_file-viewer-toolbar-floating-icon-size: var(--file-viewer-floating-icon-button-size, var(--file-viewer-toolbar-floating-icon-size, 32px));
  --_file-viewer-toolbar-floating-meter-min-width: var(--file-viewer-floating-zoom-meter-min-width, var(--file-viewer-toolbar-floating-meter-min-width, 54px));
  background: var(--file-viewer-render-surface-background, var(--file-viewer-bg, #ffffff));
  color: var(--file-viewer-text, #172033);
  font: var(--file-viewer-font, 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  letter-spacing: 0;
  color-scheme: light;
}

.file-viewer[data-viewer-density='compact'] {
  --_file-viewer-toolbar-gap: var(--file-viewer-toolbar-gap, 3px);
  --_file-viewer-toolbar-min-height: var(--file-viewer-toolbar-min-height, 34px);
  --_file-viewer-toolbar-padding: var(--file-viewer-toolbar-padding, 3px 5px);
  --_file-viewer-toolbar-floating-offset: var(--file-viewer-toolbar-floating-offset, 10px);
  --_file-viewer-toolbar-floating-min-height: var(--file-viewer-toolbar-floating-min-height, 32px);
  --_file-viewer-toolbar-floating-padding: var(--file-viewer-toolbar-floating-padding, 3px);
  --_file-viewer-toolbar-group-gap: var(--file-viewer-group-gap, var(--file-viewer-toolbar-group-gap, 2px));
  --_file-viewer-toolbar-group-padding: var(--file-viewer-group-padding, var(--file-viewer-toolbar-group-padding, 2px));
  --_file-viewer-toolbar-button-min-width: var(--file-viewer-button-min-width, var(--file-viewer-toolbar-button-min-width, 34px));
  --_file-viewer-toolbar-button-height: var(--file-viewer-button-height, var(--file-viewer-toolbar-button-height, 26px));
  --_file-viewer-toolbar-button-padding: var(--file-viewer-button-padding, var(--file-viewer-toolbar-button-padding, 0 6px));
  --_file-viewer-toolbar-button-radius: var(--file-viewer-button-radius, var(--file-viewer-toolbar-button-radius, 6px));
  --_file-viewer-toolbar-icon-size: var(--file-viewer-icon-button-size, var(--file-viewer-toolbar-icon-size, 26px));
  --_file-viewer-toolbar-meter-min-width: var(--file-viewer-zoom-meter-min-width, var(--file-viewer-toolbar-meter-min-width, 42px));
  --_file-viewer-toolbar-meter-padding: var(--file-viewer-zoom-meter-padding, var(--file-viewer-toolbar-meter-padding, 0 5px));
  --_file-viewer-toolbar-floating-button-min-width: var(--file-viewer-floating-button-min-width, var(--file-viewer-toolbar-floating-button-min-width, 38px));
  --_file-viewer-toolbar-floating-button-height: var(--file-viewer-floating-button-height, var(--file-viewer-toolbar-floating-button-height, 28px));
  --_file-viewer-toolbar-floating-icon-size: var(--file-viewer-floating-icon-button-size, var(--file-viewer-toolbar-floating-icon-size, 28px));
  --_file-viewer-toolbar-floating-meter-min-width: var(--file-viewer-floating-zoom-meter-min-width, var(--file-viewer-toolbar-floating-meter-min-width, 46px));
}

.file-viewer[data-viewer-theme='dark'] {
  background: var(--file-viewer-render-surface-background, var(--file-viewer-bg, #0f171d));
  color: var(--file-viewer-text, #e5eef8);
  color-scheme: dark;
}

.viewer-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer-actions {
  position: relative;
  z-index: var(--file-viewer-z-toolbar, 20);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--_file-viewer-toolbar-gap);
  min-height: var(--_file-viewer-toolbar-min-height);
  padding: var(--_file-viewer-toolbar-padding);
  border-bottom: 1px solid var(--file-viewer-toolbar-border, rgba(20, 35, 53, 0.06));
  background: var(--file-viewer-toolbar-bg, rgba(255, 255, 255, 0.92));
  box-shadow: var(--file-viewer-toolbar-shadow, none);
}

.viewer-actions[data-toolbar-position='top-center'] {
  justify-content: center;
}

.viewer-actions--floating {
  position: absolute;
  z-index: var(--file-viewer-z-floating-toolbar, 30);
  right: calc(var(--_file-viewer-toolbar-floating-offset) + env(safe-area-inset-right, 0px));
  bottom: calc(var(--_file-viewer-toolbar-floating-offset) + env(safe-area-inset-bottom, 0px));
  min-height: var(--_file-viewer-toolbar-floating-min-height);
  padding: var(--_file-viewer-toolbar-floating-padding);
  border: 1px solid var(--file-viewer-toolbar-border, rgba(20, 35, 53, 0.1));
  border-radius: var(--file-viewer-toolbar-radius, 999px);
  background: var(--file-viewer-toolbar-bg, rgba(255, 255, 255, 0.94));
  box-shadow: var(--file-viewer-toolbar-shadow, 0 18px 44px rgba(15, 23, 42, 0.16));
  backdrop-filter: blur(16px);
}

.viewer-actions-group {
  display: inline-flex;
  align-items: center;
  gap: var(--_file-viewer-toolbar-group-gap);
  padding: var(--_file-viewer-toolbar-group-padding);
  border: 1px solid var(--file-viewer-group-border, rgba(20, 35, 53, 0.08));
  border-radius: 999px;
  background: var(--file-viewer-group-bg, rgba(20, 35, 53, 0.035));
}

.viewer-toolbar-slot {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--_file-viewer-toolbar-gap);
}

.viewer-toolbar-slot--start {
  margin-right: auto;
}

.viewer-toolbar-slot :deep(button),
.viewer-toolbar-slot :deep(a) {
  min-height: var(--_file-viewer-toolbar-button-height);
}

.viewer-search-actions {
  min-width: 0;
}

.viewer-search-form {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.viewer-search-input {
  box-sizing: border-box;
  width: clamp(108px, 16vw, 188px);
  height: var(--_file-viewer-toolbar-button-height);
  padding: 0 9px;
  border: 1px solid var(--file-viewer-input-border, rgba(20, 35, 53, 0.14));
  border-radius: var(--_file-viewer-toolbar-button-radius);
  outline: 0;
  background: var(--file-viewer-input-bg, rgba(255, 255, 255, 0.9));
  color: var(--file-viewer-text, #172033);
  font: inherit;
  font-size: 12px;
}

.viewer-search-input:focus {
  border-color: var(--file-viewer-focus-ring, rgba(33, 163, 102, 0.52));
  box-shadow: 0 0 0 2px var(--file-viewer-focus-ring, rgba(33, 163, 102, 0.16));
}

.viewer-search-input:disabled {
  color: var(--file-viewer-button-disabled-color, #aab5c0);
  cursor: not-allowed;
}

.viewer-search-input::-webkit-search-cancel-button {
  display: none;
}

.viewer-search-count {
  min-width: 38px;
  color: var(--file-viewer-muted, #6a7d90);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
}

.viewer-actions--floating .viewer-search-input {
  width: clamp(104px, 14vw, 164px);
  height: var(--_file-viewer-toolbar-floating-button-height);
  border-radius: 999px;
}

.viewer-actions button {
  min-width: var(--_file-viewer-toolbar-button-min-width);
  height: var(--_file-viewer-toolbar-button-height);
  padding: var(--_file-viewer-toolbar-button-padding);
  border: 0;
  border-radius: var(--_file-viewer-toolbar-button-radius);
  background: transparent;
  color: var(--file-viewer-button-color, #40546a);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.viewer-actions .viewer-icon-button {
  width: var(--_file-viewer-toolbar-icon-size);
  min-width: var(--_file-viewer-toolbar-icon-size);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.viewer-actions .viewer-zoom-meter {
  min-width: var(--_file-viewer-toolbar-meter-min-width);
  height: var(--_file-viewer-toolbar-button-height);
  padding: var(--_file-viewer-toolbar-meter-padding);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: var(--file-viewer-button-color, #23465e);
}

.viewer-actions .viewer-zoom-meter--readonly {
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.viewer-print-menu {
  position: relative;
  display: inline-flex;
}

.viewer-print-menu-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 40;
  min-width: 118px;
  padding: 4px;
  border: 1px solid rgba(20, 35, 53, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  display: none;
  flex-direction: column;
  gap: 2px;
}

.viewer-print-menu[data-open='true'] .viewer-print-menu-panel {
  display: flex;
}

.viewer-print-menu-panel button {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
  text-align: left;
  border-radius: 8px;
}

.viewer-actions--floating .viewer-print-menu-panel {
  top: auto;
  bottom: calc(100% + 6px);
  z-index: 50;
}

.viewer-actions--floating button {
  min-width: var(--_file-viewer-toolbar-floating-button-min-width);
  height: var(--_file-viewer-toolbar-floating-button-height);
  border-radius: 999px;
}

.viewer-actions--floating .viewer-icon-button {
  width: var(--_file-viewer-toolbar-floating-icon-size);
  min-width: var(--_file-viewer-toolbar-floating-icon-size);
}

.viewer-actions--floating .viewer-zoom-meter {
  min-width: var(--_file-viewer-toolbar-floating-meter-min-width);
  height: var(--_file-viewer-toolbar-floating-button-height);
}

.viewer-actions button:hover:not(:disabled) {
  background: var(--file-viewer-button-hover-bg, rgba(33, 163, 102, 0.1));
  color: var(--file-viewer-button-hover-color, #16774c);
}

.viewer-actions button:disabled {
  color: var(--file-viewer-button-disabled-color, #aab5c0);
  cursor: not-allowed;
}

.viewer-actions button:focus-visible {
  outline: 2px solid var(--file-viewer-focus-ring, rgba(33, 163, 102, 0.52));
  outline-offset: 2px;
}

.viewer-content-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Custom properties cross the component ShadowRoot, so host shells can tune
 * the real scroll root without relying on ineffective outer deep selectors. */
.content,
.content :deep(.file-render),
.content :deep(.file-render-host) {
  scrollbar-width: var(--file-viewer-scrollbar-width);
  scrollbar-color: var(--file-viewer-scrollbar-colors);
}

.content {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 100%;
  overflow: auto;
  scroll-padding-block-start: var(--file-viewer-content-start-inset, 0px);
  background: var(--file-viewer-render-surface-background, var(--file-viewer-bg, #f2f2f2));
}

.content::-webkit-scrollbar,
.content :deep(.file-render)::-webkit-scrollbar,
.content :deep(.file-render-host)::-webkit-scrollbar {
  width: var(--file-viewer-scrollbar-size);
  height: var(--file-viewer-scrollbar-size);
  background: var(--file-viewer-scrollbar-track);
}

.content::-webkit-scrollbar-track,
.content::-webkit-scrollbar-corner,
.content :deep(.file-render)::-webkit-scrollbar-track,
.content :deep(.file-render)::-webkit-scrollbar-corner,
.content :deep(.file-render-host)::-webkit-scrollbar-track,
.content :deep(.file-render-host)::-webkit-scrollbar-corner {
  background: var(--file-viewer-scrollbar-track);
}

.content::-webkit-scrollbar-thumb,
.content :deep(.file-render)::-webkit-scrollbar-thumb,
.content :deep(.file-render-host)::-webkit-scrollbar-thumb {
  min-width: var(--file-viewer-scrollbar-thumb-min-size);
  min-height: var(--file-viewer-scrollbar-thumb-min-size);
  border: var(--file-viewer-scrollbar-thumb-border);
  border-radius: var(--file-viewer-scrollbar-thumb-radius);
  background-color: var(--file-viewer-scrollbar-thumb);
  background-clip: var(--file-viewer-scrollbar-thumb-clip);
}

.content::-webkit-scrollbar-thumb:hover,
.content :deep(.file-render)::-webkit-scrollbar-thumb:hover,
.content :deep(.file-render-host)::-webkit-scrollbar-thumb:hover {
  background-color: var(--file-viewer-scrollbar-thumb-hover);
}

.content :deep(.file-render),
.content :deep(.file-render-host) {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding-block-start: var(--file-viewer-content-start-inset, 0px);
}

.content.hidden {
  visibility: hidden;
}

.content :deep(.flyfish-search-match) {
  padding: 0 2px;
  border-radius: 4px;
  background: rgba(255, 214, 102, 0.72);
  color: inherit;
  box-shadow: 0 0 0 1px rgba(185, 128, 0, 0.14);
}

.content :deep(.flyfish-search-match--active) {
  background: rgba(47, 191, 122, 0.82);
  box-shadow: 0 0 0 2px rgba(30, 132, 83, 0.24);
}

.viewer-watermark {
  position: absolute;
  z-index: 20;
  inset: 0;
  pointer-events: none;
  background-repeat: repeat;
}

.state-panel {
  position: absolute;
  z-index: 40;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(
    --file-viewer-bg,
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 248, 249, 0.98))
  );
}

.loading-card,
.error-card {
  width: min(100%, 500px);
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 26px 28px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--file-viewer-border, rgba(32, 52, 72, 0.09));
  box-shadow:
    0 28px 70px rgba(15, 31, 47, 0.13),
    0 2px 8px rgba(15, 31, 47, 0.05);
  -webkit-backdrop-filter: blur(22px) saturate(1.15);
  backdrop-filter: blur(22px) saturate(1.15);
}

.loading-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.loading-card::before {
  position: absolute;
  z-index: 2;
  inset: 0 20% auto;
  height: 2px;
  border-radius: 0 0 999px 999px;
  background: linear-gradient(90deg, transparent, var(--viewer-accent), var(--viewer-accent-secondary), transparent);
  box-shadow: 0 2px 14px var(--viewer-glow);
  content: '';
}

.loading-card::after {
  position: absolute;
  z-index: -1;
  width: 180px;
  height: 180px;
  top: -92px;
  left: -76px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--viewer-glow), transparent 68%);
  filter: blur(7px);
  opacity: 0.62;
  content: '';
}

.loading-visual {
  position: relative;
  flex: 0 0 108px;
  width: 108px;
  height: 108px;
  display: grid;
  place-items: center;
}

.loading-aura {
  position: absolute;
  inset: 13px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--viewer-soft) 0 34%, transparent 70%);
  box-shadow: 0 0 28px var(--viewer-glow);
  animation: viewer-loading-aura 2.8s ease-in-out infinite;
}

.loading-orbit {
  position: absolute;
  inset: 5px;
  border: 1px dashed color-mix(in srgb, var(--viewer-accent) 32%, transparent);
  border-radius: 50%;
  animation: viewer-loading-orbit 9s linear infinite;
}

.loading-orbit i {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--viewer-accent-secondary);
  box-shadow: 0 0 10px var(--viewer-glow);
}

.loading-orbit i:first-child {
  top: 8px;
  right: 14px;
}

.loading-orbit i:last-child {
  bottom: 12px;
  left: 9px;
  width: 5px;
  height: 5px;
}

.loading-icon {
  position: relative;
  isolation: isolate;
  width: 72px;
  height: 82px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--viewer-accent);
  filter: drop-shadow(0 12px 18px var(--viewer-glow));
  animation: viewer-loading-float 2.8s ease-in-out infinite;
}

.loading-icon__sheet {
  position: absolute;
  inset: 0;
  width: 72px;
  height: 82px;
  color: color-mix(in srgb, var(--viewer-accent) 43%, transparent);
  fill: color-mix(in srgb, var(--viewer-accent) 6%, white);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.loading-icon__glyph {
  position: absolute;
  top: 19px;
  width: 30px;
  height: 30px;
  color: var(--viewer-accent);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.loading-icon__extension {
  position: absolute;
  right: 10px;
  bottom: 12px;
  left: 10px;
  overflow: hidden;
  color: var(--viewer-accent);
  font-size: 9.5px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.03em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-icon__scan {
  position: absolute;
  z-index: 3;
  right: 10px;
  left: 10px;
  top: 15px;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--viewer-accent-secondary), transparent);
  box-shadow: 0 0 8px var(--viewer-glow);
  opacity: 0;
  animation: viewer-loading-scan 2.25s ease-in-out infinite;
}

.loading-copy {
  min-width: 0;
  flex: 1;
  position: relative;
  z-index: 1;
}

.loading-kicker {
  display: block;
  color: var(--viewer-accent);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.105em;
  text-transform: uppercase;
}

.loading-copy strong,
.error-card strong {
  display: block;
  margin-top: 6px;
  color: var(--file-viewer-text, #16283b);
  font-size: 20px;
  line-height: 1.2;
}

.loading-copy p,
.error-card p {
  margin: 8px 0 0;
  color: var(--file-viewer-muted, #6a7d90);
  line-height: 1.6;
}

.loading-progress {
  position: relative;
  display: block;
  height: 3px;
  margin-top: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--viewer-soft);
}

.loading-progress i {
  position: absolute;
  inset: 0 auto 0 0;
  width: 46%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, var(--viewer-accent), var(--viewer-accent-secondary), transparent);
  box-shadow: 0 0 12px var(--viewer-glow);
  animation: viewer-loading-progress 1.85s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.error-card {
  display: block;
  text-align: center;
}

.error-card strong {
  color: #b42318;
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions--floating {
  border-color: var(--file-viewer-toolbar-border, rgba(167, 185, 198, 0.16));
  background: var(--file-viewer-toolbar-bg, rgba(14, 22, 28, 0.94));
  box-shadow: var(--file-viewer-toolbar-shadow, 0 20px 52px rgba(0, 0, 0, 0.34));
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions {
  border-bottom-color: var(--file-viewer-toolbar-border, rgba(167, 185, 198, 0.12));
  background: var(--file-viewer-toolbar-bg, rgba(14, 22, 28, 0.94));
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions button {
  color: var(--file-viewer-button-color, #b8c7d5);
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions-group {
  border-color: var(--file-viewer-group-border, rgba(167, 185, 198, 0.13));
  background: var(--file-viewer-group-bg, rgba(167, 185, 198, 0.08));
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions button:hover:not(:disabled) {
  background: var(--file-viewer-button-hover-bg, rgba(45, 212, 154, 0.14));
  color: var(--file-viewer-button-hover-color, #5ee0ae);
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions button:disabled {
  color: var(--file-viewer-button-disabled-color, #667888);
}

.file-viewer[data-viewer-theme='dark'] .content {
  background: var(--file-viewer-render-surface-background, var(--file-viewer-bg, #141c23));
}

.file-viewer[data-viewer-theme='dark'] .state-panel {
  background:
    linear-gradient(180deg, rgba(15, 23, 30, 0.92), rgba(11, 17, 22, 0.98));
}

.file-viewer[data-viewer-theme='dark'] .loading-card,
.file-viewer[data-viewer-theme='dark'] .error-card {
  background: rgba(19, 29, 37, 0.94);
  border-color: rgba(139, 161, 177, 0.16);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
}

.file-viewer[data-viewer-theme='dark'] .loading-copy strong,
.file-viewer[data-viewer-theme='dark'] .error-card strong {
  color: #eff7fb;
}

.file-viewer[data-viewer-theme='dark'] .loading-icon__sheet {
  fill: color-mix(in srgb, var(--viewer-accent) 10%, #17212a);
}

.file-viewer[data-viewer-theme='dark'] .loading-copy p,
.file-viewer[data-viewer-theme='dark'] .error-card p {
  color: #9eb0bf;
}

.file-viewer[data-viewer-theme='dark'] .error-card strong {
  color: #ff9c91;
}

@keyframes viewer-loading-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes viewer-loading-float {
  0%,
  100% {
    transform: translateY(2px) rotate(-1deg);
  }
  50% {
    transform: translateY(-4px) rotate(1deg);
  }
}

@keyframes viewer-loading-aura {
  0%,
  100% {
    opacity: 0.58;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes viewer-loading-scan {
  0% {
    opacity: 0;
    transform: translateY(0);
  }
  18% {
    opacity: 0.95;
  }
  72% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translateY(47px);
  }
}

@keyframes viewer-loading-progress {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(315%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-aura,
  .loading-orbit,
  .loading-icon,
  .loading-icon__scan,
  .loading-progress i {
    animation: none;
  }

  .loading-icon__scan {
    display: none;
  }
}

@media (max-width: 520px) {
  .state-panel {
    padding: 16px;
  }

  .loading-card {
    gap: 17px;
    padding: 20px;
    border-radius: 22px;
  }

  .loading-visual {
    flex-basis: 88px;
    width: 88px;
    height: 96px;
  }

  .loading-orbit {
    inset: 4px 0;
  }

  .loading-copy strong {
    font-size: 17px;
  }

  .loading-copy p {
    font-size: 13px;
    line-height: 1.5;
  }
}

@media (prefers-color-scheme: dark) {
  .file-viewer[data-viewer-theme='system'] {
    background: var(--file-viewer-render-surface-background, var(--file-viewer-bg, #0f171d));
    color: var(--file-viewer-text, #e5eef8);
    color-scheme: dark;
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions--floating {
    border-color: var(--file-viewer-toolbar-border, rgba(167, 185, 198, 0.16));
    background: var(--file-viewer-toolbar-bg, rgba(14, 22, 28, 0.94));
    box-shadow: var(--file-viewer-toolbar-shadow, 0 20px 52px rgba(0, 0, 0, 0.34));
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions {
    border-bottom-color: var(--file-viewer-toolbar-border, rgba(167, 185, 198, 0.12));
    background: var(--file-viewer-toolbar-bg, rgba(14, 22, 28, 0.94));
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions button {
    color: var(--file-viewer-button-color, #b8c7d5);
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions-group {
    border-color: var(--file-viewer-group-border, rgba(167, 185, 198, 0.13));
    background: var(--file-viewer-group-bg, rgba(167, 185, 198, 0.08));
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions button:hover:not(:disabled) {
    background: var(--file-viewer-button-hover-bg, rgba(45, 212, 154, 0.14));
    color: var(--file-viewer-button-hover-color, #5ee0ae);
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions button:disabled {
    color: var(--file-viewer-button-disabled-color, #667888);
  }

  .file-viewer[data-viewer-theme='system'] .content {
    background: var(--file-viewer-render-surface-background, var(--file-viewer-bg, #141c23));
  }

  .file-viewer[data-viewer-theme='system'] .state-panel {
    background:
      linear-gradient(180deg, rgba(15, 23, 30, 0.92), rgba(11, 17, 22, 0.98));
  }

  .file-viewer[data-viewer-theme='system'] .loading-card,
  .file-viewer[data-viewer-theme='system'] .error-card {
    background: rgba(19, 29, 37, 0.94);
    border-color: rgba(139, 161, 177, 0.16);
    box-shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
  }

  .file-viewer[data-viewer-theme='system'] .loading-copy strong,
  .file-viewer[data-viewer-theme='system'] .error-card strong {
    color: #eff7fb;
  }

  .file-viewer[data-viewer-theme='system'] .loading-icon__sheet {
    fill: color-mix(in srgb, var(--viewer-accent) 10%, #17212a);
  }

  .file-viewer[data-viewer-theme='system'] .loading-copy p,
  .file-viewer[data-viewer-theme='system'] .error-card p {
    color: #9eb0bf;
  }

  .file-viewer[data-viewer-theme='system'] .error-card strong {
    color: #ff9c91;
  }
}

@media (max-width: 767px) {
  .viewer-actions--floating {
    right: calc(10px + env(safe-area-inset-right, 0px));
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    max-width: calc(100% - 20px);
    gap: 4px;
    padding: 5px;
    overflow: visible;
  }

  .viewer-actions--floating .viewer-print-menu-panel {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    min-width: min(148px, calc(100vw - 32px));
  }

  .viewer-actions--floating button {
    min-width: 40px;
    height: 30px;
    padding: 0 9px;
  }
}
</style>
