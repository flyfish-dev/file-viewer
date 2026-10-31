import { modelRenderer } from '@file-viewer/renderer-3d'
import { cadRenderer } from '@file-viewer/renderer-cad'
import { imageRenderer } from '@file-viewer/renderer-image'
import { renderFileViewerVideo } from '@file-viewer/renderer-media'
import officePreset from '@file-viewer/preset-office'
import { DEFAULT_RENDERER_DEFINITIONS } from '@file-viewer/core'

const normalizeBaseUrl = value => {
  const raw = value || './'
  return raw.endsWith('/') ? raw : `${raw}/`
}

export const fileViewerAssetBaseUrl = `${normalizeBaseUrl(process.env.BASE_URL)}file-viewer/`

const videoDefinition = DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === 'video')

if (!videoDefinition) {
  throw new Error('File Viewer video renderer definition is unavailable.')
}

const videoOnlyRenderer = {
  id: 'file-viewer-video-only',
  label: 'File Viewer video renderer',
  definitions: [videoDefinition],
  handlers: [{
    rendererId: 'video',
    handler: renderFileViewerVideo
  }]
}

const supplementalRenderers = [
  cadRenderer,
  modelRenderer,
  imageRenderer,
  videoOnlyRenderer
]

export function createViewerOptions(theme) {
  return {
    preset: officePreset,
    rendererMode: 'replace',
    builtinRenderers: 'none',
    autoRenderers: false,
    renderers: supplementalRenderers,
    theme,
    toolbar: {
      position: 'auto'
    },
    pdf: {
      workerUrl: `${fileViewerAssetBaseUrl}vendor/pdf/pdf.worker.mjs`,
      cMapUrl: `${fileViewerAssetBaseUrl}vendor/pdf/cmaps/`,
      wasmUrl: `${fileViewerAssetBaseUrl}vendor/pdf/wasm/`,
      standardFontDataUrl: `${fileViewerAssetBaseUrl}vendor/pdf/standard_fonts/`,
      cjkFontFallbackPath: `${fileViewerAssetBaseUrl}vendor/pdf/fonts/`
    },
    docx: {
      workerUrl: `${fileViewerAssetBaseUrl}vendor/docx/docx.worker.js`,
      workerJsZipUrl: `${fileViewerAssetBaseUrl}vendor/docx/jszip.min.js`
    },
    presentation: {
      pptModuleUrl: `${fileViewerAssetBaseUrl}vendor/ppt/dist/pptjs.mjs`,
      pptWorkerUrl: `${fileViewerAssetBaseUrl}vendor/ppt/dist/pptjs.worker.js`,
      workerUrl: `${fileViewerAssetBaseUrl}vendor/pptx/pptx.worker.js`
    },
    spreadsheet: {
      workerUrl: `${fileViewerAssetBaseUrl}vendor/xlsx/sheet.worker.js`,
      resizableColumns: true
    },
    cad: {
      wasmPath: `${fileViewerAssetBaseUrl}wasm/cad/`,
      workerUrl: `${fileViewerAssetBaseUrl}wasm/cad/dwg-worker.js`,
      dwfWasmUrl: `${fileViewerAssetBaseUrl}wasm/cad/dwfv-render.wasm`
    },
    model: {
      workerUrl: `${fileViewerAssetBaseUrl}wasm/model/occt-worker.js`,
      runtimeUrl: `${fileViewerAssetBaseUrl}wasm/model/occt-import-js.js`,
      wasmUrl: `${fileViewerAssetBaseUrl}wasm/model/occt-import-js.wasm`
    }
  }
}
