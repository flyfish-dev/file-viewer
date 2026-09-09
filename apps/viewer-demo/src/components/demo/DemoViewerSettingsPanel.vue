<script setup lang='ts'>
import { computed } from 'vue'
import { Settings2, X } from '@lucide/vue'
import type { FileViewerFitMode } from '@file-viewer/core'
import type {
  DemoFormatSettingsSection,
  DemoSettingsTab,
  DemoViewerSettings
} from '@/composables/useDemoViewerSettings'

/**
 * Pure settings editor.
 *
 * This component edits a draft through v-model and emits intent only. Applying,
 * renderer refreshes and view-state restoration belong to
 * useDemoViewerSettings, keeping the visual panel free of renderer lifecycle.
 */
const props = defineProps<{
  copy: Record<string, string>
  previewType: string
  currentFormatSection: Exclude<DemoFormatSettingsSection, 'current'>
  fitModeOptions: Array<{ value: FileViewerFitMode | 'default'; label: string }>
  applying?: boolean
  error?: unknown
}>()

const emit = defineEmits<{
  close: []
  reset: []
  apply: []
}>()

const settings = defineModel<DemoViewerSettings>('settings', { required: true })
const activeTab = defineModel<DemoSettingsTab>('activeTab', { required: true })
const formatSection = defineModel<DemoFormatSettingsSection>('formatSection', { required: true })

const activeFormatSection = computed(() => {
  // “Current format” follows the active file; explicit sections let users
  // inspect every configurable renderer even when another format is open.
  return formatSection.value === 'current' ? props.currentFormatSection : formatSection.value
})
const activeTabId = computed(() => `viewer-settings-tab-${activeTab.value}`)
const settingsTabOrder: DemoSettingsTab[] = ['display', 'toolbar', 'formats']

const handleTabKeydown = (event: KeyboardEvent) => {
  // Implement the ARIA tabs keyboard pattern independently from pointer
  // navigation, including wrap-around and Home/End.
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return
  }
  const currentIndex = settingsTabOrder.indexOf(activeTab.value)
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? settingsTabOrder.length - 1
      : event.key === 'ArrowLeft'
        ? (currentIndex - 1 + settingsTabOrder.length) % settingsTabOrder.length
        : (currentIndex + 1) % settingsTabOrder.length
  const nextTab = settingsTabOrder[nextIndex]
  if (!nextTab) {
    return
  }
  event.preventDefault()
  activeTab.value = nextTab
  requestAnimationFrame(() => document.getElementById(`viewer-settings-tab-${nextTab}`)?.focus())
}
</script>

<template>
  <section class='settings-panel' role='dialog' :aria-label='copy.settingsTitle'>
    <header class='settings-panel-header'>
      <span class='settings-panel-title'>
        <span class='settings-panel-icon'>
          <Settings2 :size='19' :stroke-width='2.2' />
        </span>
        <span>
          <strong>{{ copy.settingsTitle }}</strong>
          <small>{{ copy.settingsDescription }}</small>
        </span>
      </span>
      <button type='button' :aria-label='copy.closeSettings' @click='emit("close")'>
        <X :size='17' :stroke-width='2.4' />
      </button>
    </header>

    <nav class='settings-tabs' role='tablist' :aria-label='copy.settingsTitle' @keydown='handleTabKeydown'>
      <button id='viewer-settings-tab-display' type='button' role='tab' aria-controls='viewer-settings-panel-body' :aria-selected='activeTab === "display"' :tabindex='activeTab === "display" ? 0 : -1' :class='{ active: activeTab === "display" }' @click='activeTab = "display"'>
        {{ copy.settingsDisplayTab }}
      </button>
      <button id='viewer-settings-tab-toolbar' type='button' role='tab' aria-controls='viewer-settings-panel-body' :aria-selected='activeTab === "toolbar"' :tabindex='activeTab === "toolbar" ? 0 : -1' :class='{ active: activeTab === "toolbar" }' @click='activeTab = "toolbar"'>
        {{ copy.settingsToolbarTab }}
      </button>
      <button id='viewer-settings-tab-formats' type='button' role='tab' aria-controls='viewer-settings-panel-body' :aria-selected='activeTab === "formats"' :tabindex='activeTab === "formats" ? 0 : -1' :class='{ active: activeTab === "formats" }' @click='activeTab = "formats"'>
        {{ copy.settingsFormatsTab }}
      </button>
    </nav>

    <div id='viewer-settings-panel-body' class='settings-panel-body' role='tabpanel' :aria-labelledby='activeTabId'>
      <template v-if='activeTab === "display"'>
        <section class='settings-section'>
          <header><strong>{{ copy.displaySettings }}</strong></header>

          <div class='settings-control-row settings-control-row--stacked'>
            <span>{{ copy.themeMode }}</span>
            <div class='settings-segmented settings-segmented--three'>
              <button type='button' :class='{ active: settings.theme === "system" }' @click='settings.theme = "system"'>
                {{ copy.systemTheme }}
              </button>
              <button type='button' :class='{ active: settings.theme === "light" }' @click='settings.theme = "light"'>
                {{ copy.lightTheme }}
              </button>
              <button type='button' :class='{ active: settings.theme === "dark" }' @click='settings.theme = "dark"'>
                {{ copy.darkTheme }}
              </button>
            </div>
          </div>

          <label class='settings-control-row'>
            <span>{{ copy.styleIsolation }}</span>
            <select v-model='settings.styleIsolation'>
              <option value='auto'>AUTO</option>
              <option value='shadow'>Shadow DOM</option>
              <option value='scoped'>Scoped</option>
              <option value='none'>None</option>
            </select>
          </label>

          <div class='settings-control-row settings-control-row--stacked'>
            <span>{{ copy.density }}</span>
            <div class='settings-segmented'>
              <button type='button' :class='{ active: settings.density === "comfortable" }' @click='settings.density = "comfortable"'>
                {{ copy.comfortable }}
              </button>
              <button type='button' :class='{ active: settings.density === "compact" }' @click='settings.density = "compact"'>
                {{ copy.compact }}
              </button>
            </div>
          </div>

          <div class='settings-control-row settings-control-row--stacked'>
            <span>{{ copy.surfaceBackground }}</span>
            <div class='settings-segmented'>
              <button type='button' :class='{ active: settings.surfaceBackground === "transparent" }' @click='settings.surfaceBackground = "transparent"'>
                {{ copy.surfaceTransparent }}
              </button>
              <button type='button' :class='{ active: settings.surfaceBackground === "auto" }' @click='settings.surfaceBackground = "auto"'>
                {{ copy.surfaceDefault }}
              </button>
            </div>
          </div>

          <label class='settings-control-row'>
            <span>{{ copy.fitMode }}</span>
            <select v-model='settings.fitMode' data-viewer-setting='fit-mode'>
              <option v-for='option in fitModeOptions' :key='option.value' :value='option.value'>{{ option.label }}</option>
            </select>
          </label>

          <label class='settings-control-row'>
            <span>{{ copy.fitResize }}</span>
            <select v-model='settings.fitResize'>
              <option value='until-interaction'>{{ copy.fitUntilInteraction }}</option>
              <option value='always'>{{ copy.fitAlways }}</option>
              <option value='initial'>{{ copy.fitInitial }}</option>
            </select>
          </label>

          <label class='settings-control-row settings-control-row--range'>
            <span>{{ copy.fitPadding }}</span>
            <input v-model.number='settings.fitPadding' type='range' min='0' max='64' step='4' />
            <output>{{ settings.fitPadding }}px</output>
          </label>

          <div class='settings-control-row settings-control-row--numbers'>
            <span>{{ copy.fitScaleRange }}</span>
            <span class='settings-number-pair'>
              <input v-model.number='settings.fitMinScale' type='number' min='0.05' max='1' step='0.05' />
              <i>–</i>
              <input v-model.number='settings.fitMaxScale' type='number' min='1' max='20' step='0.5' />
            </span>
          </div>
        </section>

        <section class='settings-section'>
          <header><strong>{{ copy.watermarkSettings }}</strong></header>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.watermarkEnabled' @click='settings.watermarkEnabled = !settings.watermarkEnabled'>
            <span>{{ copy.watermarkTitle }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings.watermarkEnabled }' aria-hidden='true'><i /></span>
          </button>
          <template v-if='settings.watermarkEnabled'>
            <label class='settings-control-row'>
              <span>{{ copy.watermarkText }}</span>
              <input v-model.trim='settings.watermarkText' type='text' maxlength='48' />
            </label>
            <label class='settings-control-row settings-control-row--range'>
              <span>{{ copy.watermarkOpacity }}</span>
              <input v-model.number='settings.watermarkOpacity' type='range' min='0.06' max='0.42' step='0.02' />
              <output>{{ Math.round(settings.watermarkOpacity * 100) }}%</output>
            </label>
            <label class='settings-control-row settings-control-row--range'>
              <span>{{ copy.watermarkRotation }}</span>
              <input v-model.number='settings.watermarkRotate' type='range' min='-90' max='90' step='3' />
              <output>{{ settings.watermarkRotate }}°</output>
            </label>
            <div class='settings-control-row settings-control-row--numbers'>
              <span>{{ copy.watermarkSpacing }}</span>
              <span class='settings-number-pair'>
                <input v-model.number='settings.watermarkGapX' type='number' min='24' max='320' step='8' />
                <i>/</i>
                <input v-model.number='settings.watermarkGapY' type='number' min='24' max='320' step='8' />
              </span>
            </div>
            <label class='settings-control-row'>
              <span>{{ copy.watermarkFontSize }}</span>
              <input v-model.number='settings.watermarkFontSize' type='number' min='10' max='48' step='1' />
            </label>
            <label class='settings-control-row'>
              <span>{{ copy.watermarkColor }}</span>
              <input v-model='settings.watermarkColor' class='settings-color-input' type='color' />
            </label>
          </template>
        </section>
      </template>

      <template v-else-if='activeTab === "toolbar"'>
        <section class='settings-section'>
          <header><strong>{{ copy.externalToolbarSettings }}</strong></header>
          <p class='settings-section-hint'>{{ copy.externalToolbarHint }}</p>
          <button v-for='item in [
            ["toolbarSearch", copy.showSearch],
            ["toolbarZoom", copy.showZoom],
            ["toolbarDownload", copy.showDownload],
            ["toolbarPrint", copy.showPrint],
            ["toolbarExportHtml", copy.showExportHtml]
          ]' :key='item[0]' type='button' class='settings-toggle-row' :aria-pressed='settings[item[0] as keyof DemoViewerSettings] as boolean' @click='(settings[item[0] as keyof DemoViewerSettings] as boolean) = !(settings[item[0] as keyof DemoViewerSettings] as boolean)'>
            <span>{{ item[1] }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings[item[0] as keyof DemoViewerSettings] }' aria-hidden='true'><i /></span>
          </button>
        </section>

        <section class='settings-section'>
          <header><strong>{{ copy.searchSettings }}</strong></header>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.searchEnabled' @click='settings.searchEnabled = !settings.searchEnabled'>
            <span>{{ copy.enableSearch }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings.searchEnabled }' aria-hidden='true'><i /></span>
          </button>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.searchCaseSensitive' @click='settings.searchCaseSensitive = !settings.searchCaseSensitive'>
            <span>{{ copy.caseSensitive }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings.searchCaseSensitive }' aria-hidden='true'><i /></span>
          </button>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.searchWholeWord' @click='settings.searchWholeWord = !settings.searchWholeWord'>
            <span>{{ copy.wholeWord }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings.searchWholeWord }' aria-hidden='true'><i /></span>
          </button>
          <label class='settings-control-row'>
            <span>{{ copy.maxMatches }}</span>
            <input v-model.number='settings.searchMaxMatches' type='number' min='10' max='10000' step='10' />
          </label>
        </section>
      </template>

      <template v-else>
        <section class='settings-section settings-section--format-selector'>
          <header class='settings-format-header'>
            <strong>{{ copy.formatSelector }}</strong>
            <span>{{ previewType }}</span>
          </header>
          <label class='settings-control-row'>
            <span>{{ copy.formatSettings }}</span>
            <select v-model='formatSection'>
              <option value='current'>{{ copy.currentFormat }}</option>
              <option value='pdf'>{{ copy.pdfFormat }}</option>
              <option value='word'>{{ copy.wordFormat }}</option>
              <option value='sheet'>{{ copy.sheetFormat }}</option>
              <option value='text'>{{ copy.textFormat }}</option>
              <option value='archive'>{{ copy.archiveFormat }}</option>
              <option value='cad'>{{ copy.cadFormat }}</option>
              <option value='geo'>{{ copy.geoFormat }}</option>
              <option value='model'>{{ copy.modelFormat }}</option>
              <option value='drawing'>{{ copy.drawingFormat }}</option>
            </select>
          </label>
        </section>

        <section v-if='activeFormatSection === "pdf"' class='settings-section'>
          <header><strong>{{ copy.pdfFormat }}</strong></header>
          <button v-for='item in [
            ["pdfToolbar", copy.pdfToolbar],
            ["pdfNavigation", copy.pdfNavigation],
            ["pdfDefaultNavigationVisible", copy.defaultNavigationVisible],
            ["pdfThumbnails", copy.pdfThumbnails],
            ["pdfCjkFontFallback", copy.cjkFontFallback],
            ["pdfIdentityFontRepair", copy.identityFontRepair]
          ]' :key='item[0]' type='button' class='settings-toggle-row' :aria-pressed='settings[item[0] as keyof DemoViewerSettings] as boolean' @click='(settings[item[0] as keyof DemoViewerSettings] as boolean) = !(settings[item[0] as keyof DemoViewerSettings] as boolean)'>
            <span>{{ item[1] }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings[item[0] as keyof DemoViewerSettings] }' aria-hidden='true'><i /></span>
          </button>
          <label class='settings-control-row'>
            <span>{{ copy.pdfRotation }}</span>
            <select v-model.number='settings.pdfRotation'>
              <option :value='0'>0°</option><option :value='90'>90°</option><option :value='180'>180°</option><option :value='270'>270°</option>
            </select>
          </label>
          <label class='settings-control-row'>
            <span>{{ copy.pdfStreaming }}</span>
            <select v-model='settings.pdfStreaming'>
              <option :value='false'>OFF</option><option :value='true'>ON</option><option value='same-origin'>SAME ORIGIN</option>
            </select>
          </label>
        </section>

        <section v-else-if='activeFormatSection === "word"' class='settings-section'>
          <header><strong>{{ copy.wordFormat }}</strong></header>
          <label class='settings-control-row'>
            <span>{{ copy.reviewMode }}</span>
            <select v-model='settings.docxReviewMode' data-testid='docx-review-mode'>
              <option value='all'>{{ copy.reviewAll }}</option>
              <option value='final'>{{ copy.reviewFinal }}</option>
              <option value='original'>{{ copy.reviewOriginal }}</option>
            </select>
          </label>
          <button v-for='item in [
            ["docxProgressive", copy.progressiveRendering],
            ["docxVisualPagination", copy.visualPagination],
            ["docxStrictWordCompatibility", copy.strictWordCompatibility],
            ["docxAwaitLayout", copy.awaitLayout],
            ["docxHideWebHiddenContent", copy.hideWebHiddenContent],
            ["docxIgnoreLastRenderedPageBreak", copy.ignoreLastPageBreak]
          ]' :key='item[0]' type='button' class='settings-toggle-row' :aria-pressed='settings[item[0] as keyof DemoViewerSettings] as boolean' @click='(settings[item[0] as keyof DemoViewerSettings] as boolean) = !(settings[item[0] as keyof DemoViewerSettings] as boolean)'>
            <span>{{ item[1] }}</span>
            <span class='settings-toggle-indicator' :class='{ active: settings[item[0] as keyof DemoViewerSettings] }' aria-hidden='true'><i /></span>
          </button>
        </section>

        <section v-else-if='activeFormatSection === "sheet"' class='settings-section'>
          <header><strong>{{ copy.sheetFormat }}</strong></header>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.spreadsheetResizableColumns' @click='settings.spreadsheetResizableColumns = !settings.spreadsheetResizableColumns'>
            <span>{{ copy.resizableColumns }}</span><span class='settings-toggle-indicator' :class='{ active: settings.spreadsheetResizableColumns }' aria-hidden='true'><i /></span>
          </button>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.spreadsheetResizableRows' @click='settings.spreadsheetResizableRows = !settings.spreadsheetResizableRows'>
            <span>{{ copy.resizableRows }}</span><span class='settings-toggle-indicator' :class='{ active: settings.spreadsheetResizableRows }' aria-hidden='true'><i /></span>
          </button>
          <label class='settings-control-row'><span>{{ copy.textEncoding }}</span><select v-model='settings.spreadsheetTextEncoding'><option value='auto'>AUTO</option><option value='utf-8'>UTF-8</option><option value='gbk'>GBK</option><option value='gb18030'>GB18030</option></select></label>
          <label class='settings-control-row'><span>{{ copy.workerThreshold }}</span><span class='settings-unit-input'><input v-model.number='settings.spreadsheetWorkerThresholdMb' type='number' min='0.25' max='64' step='0.25' /><i>MB</i></span></label>
        </section>

        <section v-else-if='activeFormatSection === "text"' class='settings-section'>
          <header><strong>{{ copy.textFormat }}</strong></header>
          <label class='settings-control-row'>
            <span>{{ copy.htmlInitialView }}</span>
            <select v-model='settings.textHtmlView' data-testid='html-initial-view'>
              <option value='preview'>{{ copy.htmlPreview }}</option>
              <option value='source'>{{ copy.htmlSource }}</option>
            </select>
          </label>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.textToolbar' @click='settings.textToolbar = !settings.textToolbar'><span>{{ copy.textToolbar }}</span><span class='settings-toggle-indicator' :class='{ active: settings.textToolbar }' aria-hidden='true'><i /></span></button>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.textLineNumbers' @click='settings.textLineNumbers = !settings.textLineNumbers'><span>{{ copy.lineNumbers }}</span><span class='settings-toggle-indicator' :class='{ active: settings.textLineNumbers }' aria-hidden='true'><i /></span></button>
          <label class='settings-control-row'><span>{{ copy.virtualizeThreshold }}</span><span class='settings-unit-input'><input v-model.number='settings.textVirtualizeAboveKb' type='number' min='64' max='8192' step='64' /><i>KB</i></span></label>
          <label class='settings-control-row'><span>{{ copy.markdownVirtualizeThreshold }}</span><span class='settings-unit-input'><input v-model.number='settings.textMarkdownVirtualizeAboveKb' type='number' min='0' max='65536' step='256' /><i>KB</i></span></label>
          <label class='settings-control-row'><span>{{ copy.maxRenderedLine }}</span><span class='settings-unit-input'><input v-model.number='settings.textMaxRenderedLineKb' type='number' min='1' max='256' step='1' /><i>KB</i></span></label>
          <label class='settings-control-row'><span>{{ copy.overscanLines }}</span><input v-model.number='settings.textVirtualOverscanLines' type='number' min='2' max='80' step='1' /></label>
        </section>

        <section v-else-if='activeFormatSection === "archive"' class='settings-section'>
          <header><strong>{{ copy.archiveFormat }}</strong></header>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.archiveCache' @click='settings.archiveCache = !settings.archiveCache'><span>{{ copy.archiveCache }}</span><span class='settings-toggle-indicator' :class='{ active: settings.archiveCache }' aria-hidden='true'><i /></span></button>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.archiveEntryDownload' @click='settings.archiveEntryDownload = !settings.archiveEntryDownload'><span>{{ copy.archiveEntryDownload }}</span><span class='settings-toggle-indicator' :class='{ active: settings.archiveEntryDownload }' aria-hidden='true'><i /></span></button>
          <label class='settings-control-row'><span>{{ copy.maxArchiveSize }}</span><span class='settings-unit-input'><input v-model.number='settings.archiveMaxSizeMb' type='number' min='16' max='4096' step='16' /><i>MB</i></span></label>
          <label class='settings-control-row'><span>{{ copy.maxEntryPreview }}</span><span class='settings-unit-input'><input v-model.number='settings.archiveMaxEntryPreviewMb' type='number' min='1' max='1024' step='1' /><i>MB</i></span></label>
        </section>

        <section v-else-if='activeFormatSection === "cad"' class='settings-section'>
          <header><strong>{{ copy.cadFormat }}</strong></header>
          <label class='settings-control-row'><span>{{ copy.cadRenderer }}</span><select v-model='settings.cadRenderer'><option value='auto'>AUTO</option><option value='webgl'>WebGL</option><option value='canvas2d'>Canvas 2D</option></select></label>
          <label class='settings-control-row'><span>{{ copy.cadFitMode }}</span><select v-model='settings.cadFitMode'><option value='best'>{{ copy.bestFit }}</option><option value='native'>{{ copy.nativeBounds }}</option></select></label>
          <label class='settings-control-row settings-control-row--range'><span>{{ copy.cadFitPadding }}</span><input v-model.number='settings.cadFitPadding' type='range' min='0.5' max='1' step='0.01' /><output>{{ Math.round(settings.cadFitPadding * 100) }}%</output></label>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.cadIncludePaperSpace' @click='settings.cadIncludePaperSpace = !settings.cadIncludePaperSpace'><span>{{ copy.includePaperSpace }}</span><span class='settings-toggle-indicator' :class='{ active: settings.cadIncludePaperSpace }' aria-hidden='true'><i /></span></button>
          <label class='settings-control-row'><span>{{ copy.lineWeightMode }}</span><select v-model='settings.cadDwfLineWeightMode'><option value='adaptive'>Adaptive</option><option value='physical'>Physical</option><option value='hairline'>Hairline</option></select></label>
        </section>

        <section v-else-if='activeFormatSection === "geo"' class='settings-section'>
          <header><strong>{{ copy.geoFormat }}</strong></header>
          <label class='settings-control-row'><span>{{ copy.geoBasemap }}</span><select v-model='settings.geoBasemap'><option value='none'>None</option><option value='offline'>Offline</option><option value='openfreemap-liberty'>Liberty (online)</option><option value='openfreemap-dark'>Dark (online)</option><option value='osm-raster'>OSM raster (online)</option></select></label>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.geoInferProjection' @click='settings.geoInferProjection = !settings.geoInferProjection'><span>{{ copy.inferProjection }}</span><span class='settings-toggle-indicator' :class='{ active: settings.geoInferProjection }' aria-hidden='true'><i /></span></button>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.geoPreferMapEngine' @click='settings.geoPreferMapEngine = !settings.geoPreferMapEngine'><span>{{ copy.preferMapEngine }}</span><span class='settings-toggle-indicator' :class='{ active: settings.geoPreferMapEngine }' aria-hidden='true'><i /></span></button>
          <label class='settings-control-row settings-control-row--range'><span>{{ copy.geoFitPadding }}</span><input v-model.number='settings.geoFitPadding' type='range' min='0' max='96' step='4' /><output>{{ settings.geoFitPadding }}px</output></label>
        </section>

        <section v-else-if='activeFormatSection === "model"' class='settings-section'>
          <header><strong>{{ copy.modelFormat }}</strong></header>
          <p class='settings-section-hint'>{{ copy.modelSettingsHint }}</p>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.modelUseWorker' @click='settings.modelUseWorker = !settings.modelUseWorker'><span>{{ copy.modelUseWorker }}</span><span class='settings-toggle-indicator' :class='{ active: settings.modelUseWorker }' aria-hidden='true'><i /></span></button>
          <label class='settings-control-row'><span>{{ copy.modelWorkerTimeout }}</span><span class='settings-unit-input'><input v-model.number='settings.modelWorkerTimeoutSeconds' type='number' min='10' max='600' step='10' /><i>s</i></span></label>
          <label class='settings-control-row'>
            <span>{{ copy.modelLinearUnit }}</span>
            <select v-model='settings.modelLinearUnit'>
              <option value='millimeter'>{{ copy.modelUnitMillimeter }}</option>
              <option value='centimeter'>{{ copy.modelUnitCentimeter }}</option>
              <option value='meter'>{{ copy.modelUnitMeter }}</option>
              <option value='inch'>{{ copy.modelUnitInch }}</option>
              <option value='foot'>{{ copy.modelUnitFoot }}</option>
            </select>
          </label>
          <label class='settings-control-row'>
            <span>{{ copy.modelDeflectionType }}</span>
            <select v-model='settings.modelLinearDeflectionType'>
              <option value='bounding_box_ratio'>{{ copy.modelDeflectionRatio }}</option>
              <option value='absolute_value'>{{ copy.modelDeflectionAbsolute }}</option>
            </select>
          </label>
          <label class='settings-control-row'><span>{{ copy.modelLinearDeflection }}</span><input v-model.number='settings.modelLinearDeflection' type='number' min='0.000001' max='1000' step='0.0001' /></label>
          <label class='settings-control-row'><span>{{ copy.modelAngularDeflection }}</span><input v-model.number='settings.modelAngularDeflection' type='number' min='0.01' max='3.14' step='0.01' /></label>
        </section>

        <section v-else-if='activeFormatSection === "drawing"' class='settings-section'>
          <header><strong>{{ copy.drawingFormat }}</strong></header>
          <button type='button' class='settings-toggle-row' :aria-pressed='settings.drawingPreferOfficial' @click='settings.drawingPreferOfficial = !settings.drawingPreferOfficial'><span>{{ copy.preferOfficialDrawing }}</span><span class='settings-toggle-indicator' :class='{ active: settings.drawingPreferOfficial }' aria-hidden='true'><i /></span></button>
        </section>

        <p v-else class='settings-empty settings-empty--standalone'>{{ copy.noFormatSettings }}</p>
        <small class='settings-reload-hint'>{{ copy.reloadHint }}</small>
      </template>
    </div>

    <p v-if='error' class='settings-error' role='alert'>{{ copy.settingsApplyFailed }}</p>

    <footer class='settings-panel-footer'>
      <button type='button' class='settings-reset' :disabled='applying' @click='emit("reset")'>{{ copy.resetDefaults }}</button>
      <span />
      <button type='button' class='settings-cancel' :disabled='applying' @click='emit("close")'>{{ copy.cancel }}</button>
      <button type='button' class='settings-apply' :disabled='applying' @click='emit("apply")'>{{ copy.applySettings }}</button>
    </footer>
  </section>
</template>
