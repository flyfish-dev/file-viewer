import { computed, type Ref } from 'vue'
import {
  DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION
} from '@file-viewer/core'
import { allRenderers } from '@file-viewer/preset-all'
import { designRenderer } from '@file-viewer/renderer-design'
import { dicomRenderer } from '@file-viewer/renderer-dicom'
import { signatureRenderer } from '@file-viewer/renderer-signature'
import { normalizeDemoDensity } from '@/composables/useDemoPreferences'
import { createDemoModelOptions } from '@/composables/useDemoViewerSettings'
import type { DemoLocale } from '@/composables/useDemoCopy'
import type { DemoViewerSettings } from '@/composables/useDemoViewerSettings'
import type {
  FileViewerFitMode,
  FileViewerOptions,
  FileViewerThemeMode,
  FileViewerUiDensity
} from '@file-viewer/core'

export type DemoExternalToolbar = {
  download: boolean
  print: boolean
  exportHtml: boolean
  zoom: boolean
}

export type UseDemoViewerOptionsInput = {
  runtimeOptions: Readonly<Ref<FileViewerOptions>>
  locale: Readonly<Ref<DemoLocale>>
  demoTheme: Readonly<Ref<FileViewerThemeMode>>
  demoDensity: Readonly<Ref<FileViewerUiDensity>>
  immersiveMode: Readonly<Ref<boolean>>
  settings: Readonly<Ref<DemoViewerSettings>>
  fitMode: Readonly<Ref<FileViewerFitMode | 'default'>>
  watermarkEnabled: Readonly<Ref<boolean>>
}

const pptRuntimeAssetUrl = (path: string) => (
  `${path}?file-viewer-ppt=${encodeURIComponent(DEFAULT_FILE_VIEWER_PPT_RUNTIME_VERSION)}`
)

// Renderer handlers use their concrete DOM targets internally. The public
// options surface intentionally erases that implementation detail.
const unifiedDemoRenderers = [
  allRenderers,
  designRenderer,
  dicomRenderer,
  signatureRenderer
] as unknown as NonNullable<FileViewerOptions['renderers']>

/**
 * Compose the public viewer options from three clearly ordered sources:
 *
 * 1. safe demo defaults;
 * 2. explicit integration/runtime options;
 * 3. product-demo settings (only outside immersive URL mode).
 *
 * The immersive branch is intentionally conservative. An integration opened
 * with `?url=` must keep the caller's toolbar and rendering contract instead of
 * inheriting product-shell preferences.
 */
export function useDemoViewerOptions(input: UseDemoViewerOptionsInput) {
  // A runtime density is an integration override. Otherwise the browser-shell
  // preference controls both the demo chrome and component UI.
  const viewerDensity = computed<FileViewerUiDensity>(() => (
    input.runtimeOptions.value.ui?.density
      ? normalizeDemoDensity(input.runtimeOptions.value.ui.density)
      : input.demoDensity.value
  ))

  const externalToolbar = computed<DemoExternalToolbar>(() => {
    // Product mode renders these actions outside the component. Intersect the
    // settings toggles with explicit runtime toolbar restrictions so the demo
    // never exposes an operation the integration intentionally disabled.
    const settings = input.settings.value
    const toolbar = input.runtimeOptions.value.toolbar
    if (toolbar === false) {
      return { download: false, print: false, exportHtml: false, zoom: false }
    }
    if (toolbar && typeof toolbar === 'object') {
      return {
        download: settings.toolbarDownload && toolbar.download !== false,
        print: settings.toolbarPrint && toolbar.print !== false,
        exportHtml: settings.toolbarExportHtml && toolbar.exportHtml !== false,
        zoom: settings.toolbarZoom && toolbar.zoom !== false
      }
    }
    return {
      download: settings.toolbarDownload,
      print: settings.toolbarPrint,
      exportHtml: settings.toolbarExportHtml,
      zoom: settings.toolbarZoom
    }
  })

  const viewerOptions = computed((): FileViewerOptions => {
    const runtime = input.runtimeOptions.value
    const settings = input.settings.value
    const immersive = input.immersiveMode.value
    const megabyte = 1024 * 1024
    const options = { ...(runtime as Record<string, unknown>) } as FileViewerOptions

    // Renderers and locale are safe defaults. Explicit integration values win.
    // The product Demo is the unified showcase. Specialist renderers are
    // registered here while their heavy implementations remain format-lazy;
    // published presets and full packages keep their compatibility boundary.
    options.renderers = runtime.renderers ?? unifiedDemoRenderers
    if (!options.locale && !options.i18n?.locale) {
      options.locale = input.locale.value
    }

    if (!immersive) {
      // Product mode demonstrates theme and isolation controls. Immersive mode
      // treats caller options as authoritative and only supplies a theme when
      // the caller omitted one.
      options.theme = settings.theme
      options.styleIsolation = settings.styleIsolation
    } else if (!options.theme) {
      options.theme = input.demoTheme.value
    }

    if (runtime.ui || viewerDensity.value === 'compact' || !immersive) {
      options.ui = {
        ...runtime.ui,
        density: viewerDensity.value,
        ...(!immersive ? { surfaceBackground: settings.surfaceBackground } : {})
      }
    } else {
      delete options.ui
    }

    options.archive = {
      // Archive limits are expressed in MB in the settings UI but bytes in the
      // public API. Cache stays enabled as the safe demo default.
      cache: true,
      ...runtime.archive,
      ...(!immersive
        ? {
            cache: settings.archiveCache,
            maxArchiveSize: settings.archiveMaxSizeMb * megabyte,
            maxEntryPreviewSize: settings.archiveMaxEntryPreviewMb * megabyte,
            entryActions: {
              ...runtime.archive?.entryActions,
              download: settings.archiveEntryDownload
            }
          }
        : {})
    }

    options.spreadsheet = {
      // Worker and resize defaults showcase the production path; product
      // settings can refine them without mutating runtime input objects.
      worker: 'auto',
      resizableColumns: true,
      resizableRows: true,
      ...runtime.spreadsheet,
      ...(!immersive
        ? {
            resizableColumns: settings.spreadsheetResizableColumns,
            resizableRows: settings.spreadsheetResizableRows,
            textEncoding: settings.spreadsheetTextEncoding,
            workerAutoThreshold: settings.spreadsheetWorkerThresholdMb * megabyte
          }
        : {})
    }

    // Keep the ESM entry in Vite's JavaScript bundle. Static servers that map
    // `.mjs` to a generic binary MIME type would reject a native import of the
    // copied vendor entry. Worker/WASM/font assets remain external and versioned.
    options.presentation = {
      pptWorkerUrl: pptRuntimeAssetUrl('vendor/ppt/worker.mjs'),
      pptWasmUrl: pptRuntimeAssetUrl('vendor/ppt/ppt-native.wasm'),
      pptFontUrl: pptRuntimeAssetUrl('vendor/ppt/ppt-font-cjk.otf'),
      ...runtime.presentation
    }

    if (!immersive) {
      // Format-specific controls belong only to the product configurator. This
      // block is intentionally the single mapping from UI settings to renderer
      // options, which keeps format logic out of HelloWorld.vue.
      options.pdf = {
        ...runtime.pdf,
        toolbar: settings.pdfToolbar,
        navigation: settings.pdfNavigation,
        defaultNavigationVisible: settings.pdfDefaultNavigationVisible,
        thumbnails: settings.pdfThumbnails,
        rotation: settings.pdfRotation,
        streaming: settings.pdfStreaming,
        cjkFontFallback: settings.pdfCjkFontFallback,
        identityFontRepair: settings.pdfIdentityFontRepair
      }
      options.docx = {
        ...runtime.docx,
        progressive: settings.docxProgressive,
        visualPagination: settings.docxVisualPagination,
        strictWordCompatibility: settings.docxStrictWordCompatibility,
        awaitLayout: settings.docxAwaitLayout,
        hideWebHiddenContent: settings.docxHideWebHiddenContent,
        ignoreLastRenderedPageBreak: settings.docxIgnoreLastRenderedPageBreak
      }
      options.text = {
        ...runtime.text,
        toolbar: settings.textToolbar,
        lineNumbers: settings.textLineNumbers,
        virtualizeAboveBytes: settings.textVirtualizeAboveKb * 1024,
        markdownVirtualizeAboveBytes: settings.textMarkdownVirtualizeAboveKb > 0
          ? settings.textMarkdownVirtualizeAboveKb * 1024
          : undefined,
        maxRenderedLineBytes: settings.textMaxRenderedLineKb * 1024,
        virtualOverscanLines: settings.textVirtualOverscanLines
      }
      const runtimeSearch = runtime.search && typeof runtime.search === 'object'
        ? runtime.search
        : {}
      options.search = {
        ...runtimeSearch,
        enabled: settings.searchEnabled,
        caseSensitive: settings.searchCaseSensitive,
        wholeWord: settings.searchWholeWord,
        maxMatches: settings.searchMaxMatches
      }
      options.cad = {
        ...runtime.cad,
        renderer: settings.cadRenderer,
        fitMode: settings.cadFitMode,
        fitPadding: settings.cadFitPadding,
        includePaperSpace: settings.cadIncludePaperSpace,
        dwfLineWeightMode: settings.cadDwfLineWeightMode
      }
      options.geo = {
        ...runtime.geo,
        basemap: settings.geoBasemap,
        inferProjection: settings.geoInferProjection,
        preferMapEngine: settings.geoPreferMapEngine,
        fitPadding: settings.geoFitPadding
      }
      options.model = createDemoModelOptions(settings, runtime.model)
      options.drawing = {
        ...runtime.drawing,
        preferOfficial: settings.drawingPreferOfficial
      }
    } else {
      // Standalone links remain offline-safe but otherwise preserve the
      // integration's geo/drawing choices.
      options.geo = { basemap: 'offline', ...runtime.geo }
      options.drawing = { ...runtime.drawing }
    }

    if (input.fitMode.value !== 'default') {
      // Fit options are omitted for the default product state, allowing each
      // renderer's own initial-fit policy to choose the best presentation.
      options.fit = {
        mode: input.fitMode.value,
        resize: settings.fitResize,
        padding: settings.fitPadding,
        minScale: settings.fitMinScale,
        maxScale: settings.fitMaxScale
      }
    } else if (!immersive) {
      delete options.fit
    }

    // Product mode owns a unified external toolbar. Standalone mode restores
    // the component toolbar so existing customer integrations keep working.
    options.toolbar = immersive ? runtime.toolbar ?? true : false

    // A disabled product watermark must be an explicit `false`; in immersive
    // mode an untouched runtime watermark passes through unchanged.
    options.watermark = !immersive && !input.watermarkEnabled.value
      ? false
      : input.watermarkEnabled.value
        ? {
            text: settings.watermarkText || 'File Viewer',
            opacity: settings.watermarkOpacity,
            rotate: settings.watermarkRotate,
            gapX: settings.watermarkGapX,
            gapY: settings.watermarkGapY,
            fontSize: settings.watermarkFontSize,
            color: settings.watermarkColor,
            ...(typeof runtime.watermark === 'object' && runtime.watermark
              ? runtime.watermark
              : {})
          }
        : runtime.watermark

    return options
  })

  return {
    viewerDensity,
    externalToolbar,
    viewerOptions
  }
}
